/**
 * @file useSentOffers.ts
 * @description Hook za upravljanje poslanih ponudb
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { getPrimaryContact } from '../utils/contactHelpers';
import { OfferItem } from '../types';

interface SentOffer {
  id: string;
  company_id: string;
  contact_id: string | null;
  recipient_email: string;
  subject: string;
  offer_type: 'rental' | 'purchase' | 'both';
  frequency: string;
  status: string;
  sent_at: string;
  created_by: string;
  items: any[];
}

interface UseSentOffersProps {
  selectedCompanyId: string | null;
  selectedCompany: CompanyWithContacts | null;
  userId: string | undefined;
  offerType: 'najem' | 'nakup' | 'primerjava' | 'dodatna';
  offerFrequency: string;
  offerItemsNakup: OfferItem[];
  offerItemsNajem: OfferItem[];
}

export function useSentOffers({
  selectedCompanyId,
  selectedCompany,
  userId,
  offerType,
  offerFrequency,
  offerItemsNakup,
  offerItemsNajem,
}: UseSentOffersProps) {
  const { toast } = useToast();
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([]);
  const [loadingSentOffers, setLoadingSentOffers] = useState(false);

  /**
   * Pridobi vse poslane ponudbe za podjetje
   */
  const fetchSentOffers = useCallback(async (companyId: string) => {
    setLoadingSentOffers(true);
    try {
      const { data: emails, error } = await supabase
        .schema('mat_tracker')
        .from('sent_emails')
        .select('*')
        .eq('company_id', companyId)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const offersWithItems = await Promise.all(
        (emails || []).map(async (email) => {
          const { data: items } = await supabase
            .schema('mat_tracker')
            .from('offer_items')
            .select('*')
            .eq('sent_email_id', email.id);
          return { ...email, items: items || [] };
        })
      );

      setSentOffers(offersWithItems);
    } catch {
      setSentOffers([]);
    } finally {
      setLoadingSentOffers(false);
    }
  }, []);

  /**
   * Shrani ponudbo v bazo
   */
  const saveOfferToDatabase = useCallback(async (subject: string, email: string): Promise<boolean> => {
    if (!selectedCompany || !userId) {
      toast({ description: 'Napaka: Ni izbrane stranke ali uporabnika', variant: 'destructive' });
      return false;
    }

    const primaryContact = getPrimaryContact(selectedCompany);

    // Determine offer type for database
    let dbOfferType: 'rental' | 'purchase' | 'both' = 'rental';
    if (offerType === 'nakup') dbOfferType = 'purchase';
    else if (offerType === 'primerjava') dbOfferType = 'both';
    else if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
      if (hasNajemItems && hasNakupItems) dbOfferType = 'both';
      else if (hasNakupItems) dbOfferType = 'purchase';
      else dbOfferType = 'rental';
    }

    try {
      const { data: sentEmail, error: emailError } = await supabase
        .schema('mat_tracker')
        .from('sent_emails')
        .insert({
          company_id: selectedCompany.id,
          contact_id: primaryContact?.id || null,
          recipient_email: email || 'ni-emaila@unknown.com',
          subject: subject,
          offer_type: dbOfferType,
          frequency: offerFrequency,
          status: 'sent',
          created_by: userId,
        })
        .select()
        .single();

      if (emailError) throw emailError;

      const items = offerType === 'nakup' || offerType === 'primerjava'
        ? [...offerItemsNakup, ...offerItemsNajem]
        : offerItemsNajem;

      const offerItemsToInsert = items.filter(item => item.code || item.itemType === 'custom').map(item => ({
        sent_email_id: sentEmail.id,
        mat_type_id: null,
        is_design: item.itemType === 'design' || item.itemType === 'custom',
        width_cm: Math.round(item.m2 ? Math.sqrt(item.m2) * 100 : 85),
        height_cm: Math.round(item.m2 ? Math.sqrt(item.m2) * 100 : 60),
        price_rental: item.purpose !== 'nakup' ? item.pricePerUnit : null,
        price_purchase: item.purpose === 'nakup' ? item.pricePerUnit : null,
        price_penalty: item.replacementCost || null,
        quantity: item.quantity,
        notes: `${item.code || item.name} - ${item.size || 'po meri'}`,
        seasonal: item.seasonal || false,
        seasonal_from_week: item.seasonalFromWeek || null,
        seasonal_to_week: item.seasonalToWeek || null,
        normal_from_week: item.normalFromWeek || null,
        normal_to_week: item.normalToWeek || null,
        frequency: item.purpose !== 'nakup' ? (item.normalFrequency || offerFrequency) : null,
        normal_frequency: item.normalFrequency || offerFrequency,
        seasonal_frequency: item.seasonalFrequency || '1',
        normal_price: item.normalPrice || item.pricePerUnit,
        seasonal_price: item.seasonalPrice || null,
      }));


      if (offerItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .schema('mat_tracker')
          .from('offer_items')
          .insert(offerItemsToInsert);

        if (itemsError) {
          // Error handled
          throw itemsError;
        }
      }

      fetchSentOffers(selectedCompany.id);
      return true;
    } catch (error: any) {
      // Error handled by toast
      toast({
        description: `Napaka pri shranjevanju: ${error?.message || 'Neznana napaka'}`,
        variant: 'destructive'
      });
      return false;
    }
  }, [selectedCompany, userId, offerType, offerFrequency, offerItemsNakup, offerItemsNajem, fetchSentOffers, toast]);

  /**
   * Izbriši poslano ponudbo
   */
  const deleteSentOffer = useCallback(async (offerId: string) => {
    if (!confirm('Ali res želiš izbrisati to ponudbo?')) return;

    try {
      await supabase
        .schema('mat_tracker')
        .from('offer_items')
        .delete()
        .eq('sent_email_id', offerId);

      const { error } = await supabase
        .schema('mat_tracker')
        .from('sent_emails')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast({ description: '✅ Ponudba izbrisana' });
      setSentOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (error) {
      // Error handled by toast
      toast({ description: 'Napaka pri brisanju ponudbe', variant: 'destructive' });
    }
  }, [toast]);

  // Fetch sent offers when company is selected
  useEffect(() => {
    if (selectedCompanyId) {
      fetchSentOffers(selectedCompanyId);
    } else {
      setSentOffers([]);
    }
  }, [selectedCompanyId, fetchSentOffers]);

  return {
    sentOffers,
    loadingSentOffers,
    fetchSentOffers,
    saveOfferToDatabase,
    deleteSentOffer,
  };
}

export default useSentOffers;

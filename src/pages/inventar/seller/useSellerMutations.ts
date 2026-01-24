/**
 * @file useSellerMutations.ts
 * @description Mutations za SellerPage - dostava, prevzem, QR kode
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateUniqueQRCodes } from '@/lib/utils';
import type { DirtyMat, SellerProfile } from '../components/types';
import { generatePickupDocument } from './generatePickupDocument';

interface UseSellerMutationsProps {
  sellerId: string | undefined;
  seller: SellerProfile | undefined;
  setSelectedDirtyMats: (value: Set<string>) => void;
  setConfirmSelfDelivery: (value: string[] | null) => void;
  setConfirmCreatePickup: (value: DirtyMat[] | null) => void;
  setConfirmCompletePickup: (value: string[] | null) => void;
  setConfirmDeleteCode: (value: string | null) => void;
}

export function useSellerMutations({
  sellerId,
  seller,
  setSelectedDirtyMats,
  setConfirmSelfDelivery,
  setConfirmCreatePickup,
  setConfirmCompletePickup,
  setConfirmDeleteCode,
}: UseSellerMutationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Self-delivery mutation
  const selfDeliveryMutation = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      const { data: cycles, error: fetchError } = await supabase
        .from('cycles')
        .select('id, qr_code_id')
        .in('id', cycleIds);

      if (fetchError) throw fetchError;

      const qrCodeIds = cycles?.map(c => c.qr_code_id) || [];

      const { error: cycleError } = await supabase
        .from('cycles')
        .update({
          status: 'completed',
          driver_pickup_at: new Date().toISOString(),
          notes: 'Lastna dostava',
        })
        .in('id', cycleIds);

      if (cycleError) throw cycleError;

      if (qrCodeIds.length > 0) {
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'available',
            last_reset_at: new Date().toISOString(),
          })
          .in('id', qrCodeIds);

        if (qrError) throw qrError;
      }

      return cycleIds.length;
    },
    onSuccess: (count) => {
      toast({
        title: 'Lastna dostava potrjena',
        description: `${count} predpražnik(ov) označenih kot lastna dostava. QR kode so spet proste.`,
      });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['seller_dirty_mats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedDirtyMats(new Set());
      setConfirmSelfDelivery(null);
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Create pickup mutation
  const createPickupMutation = useMutation({
    mutationFn: async (mats: DirtyMat[]) => {
      const cycleIds = mats.map(m => m.cycleId);

      const { data: pickup, error: pickupError } = await supabase
        .from('driver_pickups')
        .insert({
          status: 'pending',
          notes: `Prevzem za ${seller?.first_name} ${seller?.last_name}`,
        })
        .select()
        .single();

      if (pickupError) throw pickupError;

      const items = cycleIds.map(cycleId => ({
        pickup_id: pickup.id,
        cycle_id: cycleId,
        picked_up: false,
      }));

      const { error: itemsError } = await supabase
        .from('driver_pickup_items')
        .insert(items);

      if (itemsError) throw itemsError;

      const { error: updateError } = await supabase
        .from('cycles')
        .update({
          status: 'waiting_driver',
          pickup_requested_at: new Date().toISOString(),
        })
        .in('id', cycleIds);

      if (updateError) throw updateError;

      return { pickup, mats };
    },
    onSuccess: ({ mats }) => {
      const pickupType = mats.some(m => m.status === 'on_test') ? 'customer' : 'warehouse';

      toast({
        title: 'Prevzem ustvarjen',
        description: pickupType === 'customer'
          ? 'Nalog za prevzem od strank ustvarjen. Odpira se dokument...'
          : 'Nalog za prevzem iz skladišča ustvarjen. Odpira se dokument...',
      });
      queryClient.invalidateQueries({ queryKey: ['seller_dirty_mats'] });
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedDirtyMats(new Set());
      setConfirmCreatePickup(null);

      generatePickupDocument(mats, pickupType, seller);
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Complete pickup mutation
  const completePickupMutation = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      const { data: cycles, error: fetchError } = await supabase
        .from('cycles')
        .select('id, qr_code_id')
        .in('id', cycleIds);

      if (fetchError) throw fetchError;

      const qrCodeIds = cycles?.map(c => c.qr_code_id) || [];

      const { error: cycleError } = await supabase
        .from('cycles')
        .update({
          status: 'completed',
          driver_pickup_at: new Date().toISOString(),
        })
        .in('id', cycleIds);

      if (cycleError) throw cycleError;

      if (qrCodeIds.length > 0) {
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'available',
            last_reset_at: new Date().toISOString(),
          })
          .in('id', qrCodeIds);

        if (qrError) throw qrError;
      }

      return cycleIds.length;
    },
    onSuccess: (count) => {
      toast({
        title: 'Prevzem zaključen',
        description: `${count} predpražnik(ov) pobrano. QR kode so spet proste.`,
      });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['seller_dirty_mats'] });
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedDirtyMats(new Set());
      setConfirmCompletePickup(null);
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Send email warning mutation
  const sendEmailWarningMutation = useMutation({
    mutationFn: async (mats: DirtyMat[]) => {
      if (!seller?.email) {
        throw new Error('Prodajalec nima nastavljenega emaila');
      }

      if (mats.length === 0) {
        throw new Error('Ni predpražnikov za opozorilo');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Niste prijavljeni');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-warning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sellerEmail: seller.email,
            sellerName: `${seller.first_name} ${seller.last_name}`,
            mats: mats.map(mat => ({
              qrCode: mat.qrCode,
              companyName: mat.companyName,
              companyAddress: mat.companyAddress,
              matTypeName: mat.matTypeName,
              daysOnTest: mat.daysOnTest,
            })),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Napaka pri pošiljanju emaila');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Email poslan',
        description: `Opozorilo za ${data.count} predpražnik(ov) poslano na ${seller?.email}`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Create new QR codes mutation
  const createCodesMutation = useMutation({
    mutationFn: async ({ prefix, count, ownerId }: { prefix: string; count: number; ownerId: string }) => {
      const { data: existingCodes } = await supabase
        .from('qr_codes')
        .select('code')
        .like('code', `${prefix}-%`);

      const existingSet = new Set((existingCodes || []).map(c => c.code));
      const newCodeStrings = generateUniqueQRCodes(prefix, count, existingSet);

      if (newCodeStrings.length < count) {
        throw new Error(`Uspelo je generirati samo ${newCodeStrings.length} od ${count} kod`);
      }

      const newCodes = newCodeStrings.map(code => ({
        code,
        owner_id: ownerId,
        status: 'available' as const,
      }));

      const { data, error } = await supabase.from('qr_codes').insert(newCodes).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Uspeh', description: `Ustvarjenih ${data.length} novih QR kod` });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Delete QR code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase.from('qr_codes').delete().eq('id', codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Uspeh', description: 'QR koda izbrisana' });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      setConfirmDeleteCode(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Handler for adding codes
  const handleAddCodes = (count: number) => {
    if (!sellerId || !seller?.code_prefix) {
      toast({
        title: 'Napaka',
        description: 'Prodajalec nima nastavljene predpone',
        variant: 'destructive',
      });
      return;
    }

    createCodesMutation.mutate({
      prefix: seller.code_prefix,
      count,
      ownerId: sellerId,
    });
  };

  return {
    selfDeliveryMutation,
    createPickupMutation,
    completePickupMutation,
    sendEmailWarningMutation,
    createCodesMutation,
    deleteCodeMutation,
    handleAddCodes,
  };
}

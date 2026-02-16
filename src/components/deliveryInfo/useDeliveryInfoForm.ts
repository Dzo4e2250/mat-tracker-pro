/**
 * @file useDeliveryInfoForm.ts
 * @description Hook za upravljanje stanja forme za informacije o dostavnem mestu
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCityByPostalCode } from '@/utils/postalCodes';
import { useAuth } from '@/contexts/AuthContext';
import type { Company, Contact } from '@/integrations/supabase/types';
import type { DeliveryInfoFormData } from './types';
import { INITIAL_FORM_DATA } from './types';

interface UseDeliveryInfoFormProps {
  isOpen: boolean;
  company: Company | null;
  contacts?: Contact[];
}

export function useDeliveryInfoForm({
  isOpen,
  company,
  contacts = [],
}: UseDeliveryInfoFormProps) {
  const { profile } = useAuth();
  const isFormInitializedRef = useRef(false);

  const [formData, setFormData] = useState<DeliveryInfoFormData>(INITIAL_FORM_DATA);

  // Get sorted contacts - primary first
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      if (a.is_billing_contact && !b.is_billing_contact) return -1;
      if (!a.is_billing_contact && b.is_billing_contact) return 1;
      return 0;
    });
  }, [contacts]);

  // Initialize form when modal opens (only once per open)
  useEffect(() => {
    if (isOpen && company && !isFormInitializedRef.current) {
      const primaryContact = contacts.find(c => c.is_primary);
      const billingContact = contacts.find(c => c.is_billing_contact && !c.is_primary);

      // Use full_name if available, otherwise combine first_name + last_name
      const salesRepName = profile?.full_name ||
        (profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : '');

      setFormData({
        salesRep: salesRepName,
        salesRepPhone: profile?.phone || '',
        customerNumber: '',
        companyName: company.display_name || company.name || '',
        address: company.address_street || '',
        postal: company.address_postal || '',
        city: company.address_city || '',
        contactId: primaryContact?.id,
        contactName: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : '',
        contactPhone: primaryContact?.phone || primaryContact?.work_phone || '',
        contactEmail: primaryContact?.email || '',
        secondaryContactId: billingContact?.id,
        secondaryContactName: billingContact ? `${billingContact.first_name} ${billingContact.last_name}` : '',
        secondaryContactPhone: billingContact?.phone || billingContact?.work_phone || '',
        secondaryContactEmail: billingContact?.email || '',
        discount: company.discount?.toString() || '',
        hasPhase: false,
        expansionNotes: '',
        locationDescription: '',
        driverNotes: '',
        images: [],
      });
      isFormInitializedRef.current = true;
    } else if (!isOpen) {
      isFormInitializedRef.current = false;
    }
  }, [isOpen, company, contacts, profile]);

  // Update single field
  const updateField = useCallback(<K extends keyof DeliveryInfoFormData>(
    field: K,
    value: DeliveryInfoFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle postal code change - auto-fill city
  const handlePostalChange = useCallback((value: string) => {
    setFormData(prev => {
      const city = getCityByPostalCode(value);
      return {
        ...prev,
        postal: value,
        city: city || prev.city,
      };
    });
  }, []);

  // Handle contact selection
  const handleContactChange = useCallback((contactId: string, isPrimary: boolean) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    if (isPrimary) {
      setFormData(prev => ({
        ...prev,
        contactId,
        contactName: `${contact.first_name} ${contact.last_name}`,
        contactPhone: contact.phone || contact.work_phone || '',
        contactEmail: contact.email || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        secondaryContactId: contactId,
        secondaryContactName: `${contact.first_name} ${contact.last_name}`,
        secondaryContactPhone: contact.phone || contact.work_phone || '',
        secondaryContactEmail: contact.email || '',
      }));
    }
  }, [contacts]);

  // Clear secondary contact
  const clearSecondaryContact = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      secondaryContactId: undefined,
      secondaryContactName: '',
      secondaryContactPhone: '',
      secondaryContactEmail: '',
    }));
  }, []);

  // Add image from clipboard paste
  const addImage = useCallback((dataUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, dataUrl],
    }));
  }, []);

  // Remove image by index
  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  // Calculate form completeness
  const filledFields = useMemo(() => {
    const requiredFields: (keyof DeliveryInfoFormData)[] = [
      'salesRep',
      'companyName',
      'address',
      'contactName',
      'contactPhone',
    ];
    return requiredFields.filter(f => {
      const val = formData[f];
      return val && (typeof val === 'string' ? val.trim() !== '' : true);
    }).length;
  }, [formData]);

  const totalRequiredFields = 5;

  // Get input class based on whether field is filled
  const getInputClass = useCallback((field: keyof DeliveryInfoFormData) => {
    const value = formData[field];
    const isFilled = value && (typeof value === 'string' ? value.trim() !== '' : true);
    return isFilled
      ? 'border-green-300 bg-green-50'
      : 'border-gray-300';
  }, [formData]);

  return {
    formData,
    sortedContacts,
    updateField,
    handlePostalChange,
    handleContactChange,
    clearSecondaryContact,
    addImage,
    removeImage,
    getInputClass,
    filledCount: filledFields,
    totalCount: totalRequiredFields,
  };
}

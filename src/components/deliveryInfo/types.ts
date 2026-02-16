/**
 * @file types.ts
 * @description Tipi za Delivery Info modal in PDF generator
 */

import type { Company, Contact } from '@/integrations/supabase/types';

// Form data za PDF generiranje
export interface DeliveryInfoFormData {
  // Prodajni zastopnik
  salesRep: string;
  salesRepPhone: string;

  // Dostavno mesto
  customerNumber: string;
  companyName: string;
  address: string;
  postal: string;
  city: string;

  // Kontaktna oseba za lokacijo
  contactId?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;

  // Kontakt za račune/plačila (opcijsko)
  secondaryContactId?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  secondaryContactEmail?: string;

  // Predpražniki
  discount: string;
  hasPhase: boolean;
  expansionNotes: string;

  // Lokacija
  locationDescription: string;

  // Opombe za voznika
  driverNotes: string;

  // Slike lokacije
  images: string[];
}

// Props za DeliveryInfoModal
export interface DeliveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  contacts?: Contact[];
}

// Company z kontakti
export type CompanyWithContacts = Company & {
  contacts?: Contact[];
};

// Koraki v modalu
export type ModalStep = 'edit' | 'preview';

// Začetne vrednosti za form
export const INITIAL_FORM_DATA: DeliveryInfoFormData = {
  salesRep: '',
  salesRepPhone: '',
  customerNumber: '',
  companyName: '',
  address: '',
  postal: '',
  city: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  secondaryContactName: '',
  secondaryContactPhone: '',
  secondaryContactEmail: '',
  discount: '',
  hasPhase: false,
  expansionNotes: '',
  locationDescription: '',
  driverNotes: '',
  images: [],
};

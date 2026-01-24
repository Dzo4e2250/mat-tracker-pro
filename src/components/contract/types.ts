/**
 * @file types.ts
 * @description Tipi za ContractModal komponento
 */

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_billing_contact?: boolean;
  is_service_contact?: boolean;
  companyLabel?: string;
}

export interface Company {
  id: string;
  name: string;
  display_name?: string;
  tax_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  delivery_address?: string | null;
  delivery_postal?: string | null;
  delivery_city?: string | null;
  billing_address?: string | null;
  billing_postal?: string | null;
  billing_city?: string | null;
  working_hours?: string | null;
  delivery_instructions?: string | null;
  customer_number?: string | null;
  contacts: Contact[];
}

export interface OfferItem {
  notes: string;
  quantity: number;
  price_rental: number | null;
  price_penalty: number | null;
  width_cm: number;
  height_cm: number;
  seasonal?: boolean;
  seasonalFromWeek?: number;
  seasonalToWeek?: number;
  normalFromWeek?: number;
  normalToWeek?: number;
  frequency?: string;
  normalFrequency?: string;
  seasonalFrequency?: string;
  normalPrice?: number;
  seasonalPrice?: number;
}

export interface Offer {
  id: string;
  offer_type: string;
  frequency: string | null;
  items: OfferItem[];
}

export interface ContractItem {
  code: string;
  name: string;
  size: string;
  customized: boolean;
  quantity: number;
  frequency: string;
  seasonal: string;
  pricePerWeek: number;
  replacementCost: number;
}

export interface ContractFormData {
  companyName: string;
  customerNumber: string;
  taxNumber: string;
  deliveryAddress: string;
  deliveryPostal: string;
  deliveryCity: string;
  deliveryAddressSource: 'current' | 'parent';
  billingAddress: string;
  billingPostal: string;
  billingCity: string;
  billingAddressSource: 'current' | 'parent';
  useSameAsBilling: boolean;
  billingContactId: string;
  billingContactName: string;
  billingContactPhone: string;
  billingContactEmail: string;
  serviceContactId: string;
  serviceContactName: string;
  serviceContactPhone: string;
  serviceContactEmail: string;
  useSameAsService: boolean;
  contractType: 'new' | 'renewal';
  items: ContractItem[];
  serviceStartDate: string;
  deliveryInstructions: string;
  workingHours: string;
  doorCode: string;
  hasKey: 'yes' | 'no' | '';
  additionalInfo: string;
  paperInvoice: boolean;
  bankTransfer: string;
  eInvoice: string;
  emailInvoice: string;
  referenceNumber: string;
}

export interface ParentCompanyData {
  id: string;
  name: string;
  tax_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  contacts: Contact[];
}

export interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  offer: Offer;
  onContractSaved?: (contract: { offer_id: string; generated_at: string }) => void;
  parentCompany?: ParentCompanyData;
  childCompanies?: { id: string; name: string; contacts: Contact[] }[];
}

export type ModalStep = 'edit' | 'confirm-send';

export const DEFAULT_FORM_DATA: ContractFormData = {
  companyName: '',
  customerNumber: '',
  taxNumber: '',
  deliveryAddress: '',
  deliveryPostal: '',
  deliveryCity: '',
  deliveryAddressSource: 'current',
  billingAddress: '',
  billingPostal: '',
  billingCity: '',
  billingAddressSource: 'parent',
  useSameAsBilling: true,
  billingContactId: '',
  billingContactName: '',
  billingContactPhone: '',
  billingContactEmail: '',
  serviceContactId: '',
  serviceContactName: '',
  serviceContactPhone: '',
  serviceContactEmail: '',
  useSameAsService: true,
  contractType: 'new',
  items: [],
  serviceStartDate: new Date().toISOString().split('T')[0],
  deliveryInstructions: '',
  workingHours: '',
  doorCode: '',
  hasKey: '',
  additionalInfo: '',
  paperInvoice: false,
  bankTransfer: '',
  eInvoice: '',
  emailInvoice: '',
  referenceNumber: '',
};

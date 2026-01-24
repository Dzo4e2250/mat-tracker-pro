/**
 * @file ContractModalContainer.tsx
 * @description Container za ContractModal ki pripravlja podatke iz company/offer objektov
 */

import { lazy, Suspense } from 'react';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

const ContractModal = lazy(() => import('@/components/ContractModal'));

interface ContractModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCompany: CompanyWithContacts;
  selectedOffer: any;
  companies?: CompanyWithContacts[];
  onContractSaved?: (contract: any) => void;
}

/** Pripravi kontaktne podatke v format za ContractModal */
function mapContacts(contacts: any[]) {
  return contacts.map(c => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    role: c.role,
    is_billing_contact: c.is_billing_contact,
    is_service_contact: c.is_service_contact,
  }));
}

/** Pripravi ponudbo v format za ContractModal */
function mapOffer(offer: any) {
  return {
    id: offer.id,
    offer_type: offer.offer_type,
    frequency: offer.frequency,
    items: offer.items
      ?.filter((item: any) => item.price_rental !== null) // Samo najem items
      .map((item: any) => ({
        notes: item.notes,
        quantity: item.quantity,
        price_rental: item.price_rental,
        price_penalty: item.price_penalty,
        width_cm: item.width_cm,
        height_cm: item.height_cm,
        seasonal: item.seasonal,
        seasonalFromWeek: item.seasonal_from_week,
        seasonalToWeek: item.seasonal_to_week,
        normalFromWeek: item.normal_from_week,
        normalToWeek: item.normal_to_week,
        frequency: item.frequency,
        normalFrequency: item.normal_frequency,
        seasonalFrequency: item.seasonal_frequency,
        normalPrice: item.normal_price,
        seasonalPrice: item.seasonal_price,
      })) || [],
  };
}

/** Pripravi podjetje v format za ContractModal */
function mapCompany(company: CompanyWithContacts) {
  return {
    id: company.id,
    name: company.name,
    tax_number: company.tax_number,
    address_street: company.address_street,
    address_postal: company.address_postal,
    address_city: company.address_city,
    delivery_address: (company as any).delivery_address,
    delivery_postal: (company as any).delivery_postal,
    delivery_city: (company as any).delivery_city,
    billing_address: (company as any).billing_address,
    billing_postal: (company as any).billing_postal,
    billing_city: (company as any).billing_city,
    working_hours: (company as any).working_hours,
    delivery_instructions: (company as any).delivery_instructions,
    customer_number: (company as any).customer_number,
    contacts: mapContacts(company.contacts),
  };
}

export function ContractModalContainer({
  isOpen,
  onClose,
  selectedCompany,
  selectedOffer,
  companies,
  onContractSaved,
}: ContractModalContainerProps) {
  // Poišči matično podjetje
  const parentId = (selectedCompany as any).parent_company_id;
  const parentCompanyData = parentId
    ? companies?.find(c => c.id === parentId)
    : undefined;

  const parentCompany = parentCompanyData
    ? {
        id: parentCompanyData.id,
        name: parentCompanyData.name,
        tax_number: parentCompanyData.tax_number,
        address_street: parentCompanyData.address_street,
        address_postal: parentCompanyData.address_postal,
        address_city: parentCompanyData.address_city,
        contacts: mapContacts(parentCompanyData.contacts),
      }
    : undefined;

  // Poišči podrejena podjetja
  const childCompanies = companies
    ?.filter(c => c.parent_company_id === selectedCompany.id)
    .map(child => ({
      id: child.id,
      name: child.display_name || child.name,
      contacts: mapContacts(child.contacts),
    })) || [];

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      }
    >
      <ContractModal
        isOpen={isOpen}
        onClose={onClose}
        company={mapCompany(selectedCompany)}
        offer={mapOffer(selectedOffer)}
        onContractSaved={onContractSaved}
        parentCompany={parentCompany}
        childCompanies={childCompanies}
      />
    </Suspense>
  );
}

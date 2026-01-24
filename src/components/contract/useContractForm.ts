/**
 * @file useContractForm.ts
 * @description Hook za upravljanje stanja forme pogodbe
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { getCityByPostalCode } from '@/utils/postalCodes';
import type {
  ContractFormData,
  Company,
  Offer,
  Contact,
  ParentCompanyData,
  ContractItem,
  DEFAULT_FORM_DATA,
} from './types';

interface UseContractFormProps {
  isOpen: boolean;
  company: Company;
  offer: Offer;
  parentCompany?: ParentCompanyData;
  childCompanies?: { id: string; name: string; contacts: Contact[] }[];
}

export function useContractForm({
  isOpen,
  company,
  offer,
  parentCompany,
  childCompanies,
}: UseContractFormProps) {
  const isFormInitializedRef = useRef(false);

  const [formData, setFormData] = useState<ContractFormData>({
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
  });

  // Merge all contacts from hierarchy
  const allContacts = useMemo(() => {
    const contacts: (Contact & { companyLabel?: string })[] = [];

    if (parentCompany?.contacts) {
      parentCompany.contacts.forEach(c => {
        contacts.push({ ...c, companyLabel: `${parentCompany.name} (matično)` });
      });
    }

    if (company?.contacts) {
      company.contacts.forEach(c => {
        contacts.push({ ...c, companyLabel: company.name });
      });
    }

    childCompanies?.forEach(child => {
      if (child?.contacts) {
        child.contacts.forEach(c => {
          contacts.push({ ...c, companyLabel: `${child.name} (podružnica)` });
        });
      }
    });

    return contacts;
  }, [parentCompany, company, childCompanies]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      isFormInitializedRef.current = false;
    }
  }, [isOpen]);

  // Initialize form data
  useEffect(() => {
    if (!isOpen || !company || !offer || isFormInitializedRef.current) return;
    isFormInitializedRef.current = true;

    const billingSourceContacts = parentCompany?.contacts?.length
      ? parentCompany.contacts
      : (company?.contacts || []);
    const billingContact = billingSourceContacts.find(c => c.is_billing_contact) || billingSourceContacts[0];

    const companyContacts = company?.contacts || [];
    const serviceContact = companyContacts.find(c => c.is_service_contact) || companyContacts[0];

    const contractItems: ContractItem[] = [];

    offer.items?.forEach(item => {
      const noteParts = (item.notes || '').split(' - ');
      const codePart = noteParts[0] || '';
      const sizePart = noteParts[1] || `${item.width_cm}x${item.height_cm}`;

      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        const normalFrom = item.normalFromWeek || 13;
        const normalTo = item.normalToWeek || (item.seasonalFromWeek <= 1 ? 52 : item.seasonalFromWeek - 1);

        contractItems.push({
          code: codePart,
          name: 'Predpražnik',
          size: sizePart || `${item.width_cm}x${item.height_cm}`,
          customized: false,
          quantity: item.quantity || 1,
          frequency: item.normalFrequency || offer.frequency || '2',
          seasonal: `T${normalFrom}-${normalTo}`,
          pricePerWeek: item.normalPrice || item.price_rental || 0,
          replacementCost: item.price_penalty || 0,
        });

        contractItems.push({
          code: codePart,
          name: 'Predpražnik',
          size: sizePart || `${item.width_cm}x${item.height_cm}`,
          customized: false,
          quantity: item.quantity || 1,
          frequency: item.seasonalFrequency || '1',
          seasonal: `T${item.seasonalFromWeek}-${item.seasonalToWeek}`,
          pricePerWeek: item.seasonalPrice || 0,
          replacementCost: item.price_penalty || 0,
        });
      } else {
        contractItems.push({
          code: codePart,
          name: 'Predpražnik',
          size: sizePart || `${item.width_cm}x${item.height_cm}`,
          customized: false,
          quantity: item.quantity || 1,
          frequency: item.frequency || offer.frequency || '2',
          seasonal: '',
          pricePerWeek: item.price_rental || 0,
          replacementCost: item.price_penalty || 0,
        });
      }
    });

    const billingCompany = parentCompany || company;

    setFormData({
      companyName: billingCompany.name || '',
      customerNumber: company.customer_number || '',
      taxNumber: billingCompany.tax_number || '',
      deliveryAddress: company.delivery_address || company.address_street || '',
      deliveryPostal: company.delivery_postal || company.address_postal || '',
      deliveryCity: company.delivery_city || company.address_city || '',
      deliveryAddressSource: 'current',
      billingAddress: billingCompany.address_street || company.billing_address || '',
      billingPostal: billingCompany.address_postal || company.billing_postal || '',
      billingCity: billingCompany.address_city || company.billing_city || '',
      billingAddressSource: parentCompany ? 'parent' : 'current',
      useSameAsBilling: !parentCompany && !company.billing_address,
      billingContactId: billingContact?.id || '',
      billingContactName: billingContact ? `${billingContact.first_name} ${billingContact.last_name}` : '',
      billingContactPhone: billingContact?.phone || '',
      billingContactEmail: billingContact?.email || '',
      serviceContactId: serviceContact?.id || '',
      serviceContactName: serviceContact ? `${serviceContact.first_name} ${serviceContact.last_name}` : '',
      serviceContactPhone: serviceContact?.phone || '',
      serviceContactEmail: serviceContact?.email || '',
      useSameAsService: billingContact?.id === serviceContact?.id,
      contractType: 'new',
      items: contractItems,
      serviceStartDate: new Date().toISOString().split('T')[0],
      deliveryInstructions: company.delivery_instructions || '',
      workingHours: company.working_hours || '',
      doorCode: '',
      hasKey: '',
      additionalInfo: '',
      paperInvoice: false,
      bankTransfer: '',
      eInvoice: '',
      emailInvoice: '',
      referenceNumber: '',
    });
  }, [isOpen, company, offer, parentCompany]);

  // Field update handler
  const updateField = (field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Postal code handler with auto-fill city
  const handlePostalChange = (
    postalField: 'deliveryPostal' | 'billingPostal',
    cityField: 'deliveryCity' | 'billingCity',
    value: string
  ) => {
    setFormData(prev => {
      const newData = { ...prev, [postalField]: value };
      if (value.length === 4) {
        const city = getCityByPostalCode(value);
        if (city) {
          newData[cityField] = city;
        }
      }
      return newData;
    });
  };

  // Item update handler
  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  // Add item handler
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        code: '',
        name: 'Predpražnik',
        size: '',
        customized: false,
        quantity: 1,
        frequency: '2',
        seasonal: '',
        pricePerWeek: 0,
        replacementCost: 0,
      }]
    }));
  };

  // Remove item handler
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Contact change handler
  const handleContactChange = (type: 'billing' | 'service', contactId: string) => {
    const contact = allContacts.find(c => c.id === contactId);
    if (type === 'billing') {
      updateField('billingContactId', contactId);
      updateField('billingContactName', contact ? `${contact.first_name} ${contact.last_name}` : '');
      updateField('billingContactPhone', contact?.phone || '');
      updateField('billingContactEmail', contact?.email || '');
    } else {
      updateField('serviceContactId', contactId);
      updateField('serviceContactName', contact ? `${contact.first_name} ${contact.last_name}` : '');
      updateField('serviceContactPhone', contact?.phone || '');
      updateField('serviceContactEmail', contact?.email || '');
    }
  };

  // Address source change handler
  const handleAddressSourceChange = (type: 'delivery' | 'billing', source: 'current' | 'parent') => {
    const sourceCompany = source === 'parent' && parentCompany ? parentCompany : company;

    if (type === 'delivery') {
      setFormData(prev => ({
        ...prev,
        deliveryAddressSource: source,
        deliveryAddress: sourceCompany?.delivery_address || sourceCompany?.address_street || '',
        deliveryPostal: sourceCompany?.delivery_postal || sourceCompany?.address_postal || '',
        deliveryCity: sourceCompany?.delivery_city || sourceCompany?.address_city || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        billingAddressSource: source,
        billingAddress: sourceCompany?.address_street || '',
        billingPostal: sourceCompany?.address_postal || '',
        billingCity: sourceCompany?.address_city || '',
        companyName: sourceCompany?.name || '',
        taxNumber: sourceCompany?.tax_number || '',
      }));
    }
  };

  // Validation helpers
  const importantFields = [
    formData.companyName,
    formData.taxNumber,
    formData.deliveryAddress,
    formData.deliveryPostal,
    formData.deliveryCity,
    formData.billingContactName,
    formData.billingContactEmail,
  ];
  const filledCount = importantFields.filter(f => f && String(f).trim()).length;
  const totalCount = importantFields.length;

  const getInputClass = (value: string | number | undefined | null) => {
    const base = "w-full px-3 py-2 border rounded-lg text-sm transition-colors";
    if (value && String(value).trim()) {
      return `${base} border-green-400 bg-green-50`;
    }
    return `${base} border-orange-300 bg-orange-50`;
  };

  return {
    formData,
    setFormData,
    allContacts,
    updateField,
    handlePostalChange,
    updateItem,
    addItem,
    removeItem,
    handleContactChange,
    handleAddressSourceChange,
    getInputClass,
    filledCount,
    totalCount,
  };
}

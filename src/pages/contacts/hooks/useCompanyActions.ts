/**
 * @file useCompanyActions.ts
 * @description Hook za CRUD operacije s podjetji in kontakti
 */

import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useCreateCompany, useAddContact, useUpdateCompany, useUpdateContact, useDeleteContact, useDeleteCompany, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useCreateReminder, useCompleteReminder, useUpdatePipelineStatus } from '@/hooks/useReminders';
import { lookupCompanyInternalFirst, lookupCompanyByTaxNumber, lookupCompanyInRegister, isValidTaxNumberFormat, searchCompaniesByName, lookupOpeningHours } from '@/utils/companyLookup';
import type { RegisterCompanyData } from '@/utils/companyLookup';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseCompanyActionsProps {
  userId: string | undefined;
  companies: CompanyWithContacts[] | undefined;
  selectedCompany: CompanyWithContacts | null;
  formData: any;
  setFormData: (data: any) => void;
  editAddressData: any;
  setEditAddressData: (data: any) => void;
  setShowEditAddressModal: (show: boolean) => void;
  existingCompany: CompanyWithContacts | null;
  pendingContactData: any;
  setShowExistingCompanyModal: (show: boolean) => void;
  setExistingCompany: (company: CompanyWithContacts | null) => void;
  setPendingContactData: (data: any) => void;
  setShowAddModal: (show: boolean) => void;
  setShowAddContactModal: (show: boolean) => void;
  setSelectedCompany: (company: CompanyWithContacts | null) => void;
  setTaxLookupLoading: (loading: boolean) => void;
  // Reminder props
  reminderCompanyId: string | null;
  reminderDate: string;
  reminderTime: string;
  reminderNote: string;
  reminderCreateTask: boolean;
  setShowReminderModal: (show: boolean) => void;
  setReminderCompanyId: (id: string | null) => void;
  setReminderDate: (date: string) => void;
  setReminderTime: (time: string) => void;
  setReminderNote: (note: string) => void;
  // Notes mutation
  addNoteMutation: any;
}

export function useCompanyActions({
  userId,
  companies,
  selectedCompany,
  formData,
  setFormData,
  editAddressData,
  setEditAddressData,
  setShowEditAddressModal,
  existingCompany,
  pendingContactData,
  setShowExistingCompanyModal,
  setExistingCompany,
  setPendingContactData,
  setShowAddModal,
  setShowAddContactModal,
  setSelectedCompany,
  setTaxLookupLoading,
  reminderCompanyId,
  reminderDate,
  reminderTime,
  reminderNote,
  reminderCreateTask,
  setShowReminderModal,
  setReminderCompanyId,
  setReminderDate,
  setReminderTime,
  setReminderNote,
  addNoteMutation,
}: UseCompanyActionsProps) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Mutations
  const createCompany = useCreateCompany();
  const addContact = useAddContact();
  const updateCompany = useUpdateCompany();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const deleteCompanyMutation = useDeleteCompany();
  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const updatePipelineStatus = useUpdatePipelineStatus();

  // Select existing contact from found company - auto-fill form and select company
  const handleSelectExistingContact = async (contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }) => {
    if (!existingCompany || !userId) return;

    // Izpolni formo s podatki o podjetju in kontaktu
    setFormData({
      companyName: existingCompany.name,
      displayName: existingCompany.display_name || '',
      taxNumber: existingCompany.tax_number || '',
      addressStreet: existingCompany.address_street || '',
      addressCity: existingCompany.address_city || '',
      addressPostal: existingCompany.address_postal || '',
      parentCompanyId: existingCompany.parent_company_id || '',
      contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      contactPhone: contact.phone || '',
      contactEmail: contact.email || '',
      contactRole: contact.role || '',
      // Flag da podjetje že obstaja - ne ustvarjaj novega
      existingCompanyId: existingCompany.id,
      existingContactId: contact.id,
    });

    toast({
      description: `✅ Podjetje in kontakt izbrana: ${existingCompany.display_name || existingCompany.name} - ${contact.first_name} ${contact.last_name}`,
    });
    setShowExistingCompanyModal(false);
    setExistingCompany(null);
    setPendingContactData(null);
    // Ne zapri AddModal - uporabnik lahko doda podjetje v svoj seznam
  };

  // Add new contact to existing company (opens add contact form)
  const handleAddNewContactToExisting = () => {
    if (!existingCompany) return;

    // Izpolni formo samo s podatki o podjetju, kontakt ostane prazen
    setFormData({
      companyName: existingCompany.name,
      displayName: existingCompany.display_name || '',
      taxNumber: existingCompany.tax_number || '',
      addressStreet: existingCompany.address_street || '',
      addressCity: existingCompany.address_city || '',
      addressPostal: existingCompany.address_postal || '',
      parentCompanyId: existingCompany.parent_company_id || '',
      // Flag da podjetje že obstaja
      existingCompanyId: existingCompany.id,
    });

    toast({
      description: `📝 Podatki o podjetju izpolnjeni - dodaj nov kontakt`,
    });
    setShowExistingCompanyModal(false);
    setExistingCompany(null);
    setPendingContactData(null);
  };

  // Legacy handlers for backwards compatibility
  const handleAddToExistingCompany = async () => {
    // Če ima obstoječe kontakte, uporabi prvega
    if (existingCompany?.contacts?.[0]) {
      await handleSelectExistingContact(existingCompany.contacts[0]);
    } else {
      handleAddNewContactToExisting();
    }
  };

  const handleCreateNewAnyway = () => {
    handleAddNewContactToExisting();
  };

  // Create reminder
  const handleCreateReminder = async () => {
    if (!reminderCompanyId || !reminderDate || !userId) return;

    const reminderAt = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();

    try {
      await createReminder.mutateAsync({
        company_id: reminderCompanyId,
        user_id: userId,
        reminder_at: reminderAt,
        note: reminderNote || null,
        createTask: reminderCreateTask, // Ustvari tudi Kanban nalogo
      });

      const taskMsg = reminderCreateTask ? ' in Kanban naloga' : '';
      toast({ description: `✅ Opomnik${taskMsg} dodan` });
      setShowReminderModal(false);
      setReminderCompanyId(null);
      setReminderDate('');
      setReminderTime('09:00');
      setReminderNote('');
    } catch (error: any) {
      toast({
        description: `Napaka pri dodajanju opomnika: ${error?.message || 'Neznana napaka'}`,
        variant: 'destructive'
      });
    }
  };

  // Contract sent - create note and 3 reminders
  const handleContractSent = async () => {
    if (!selectedCompany || !userId) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const companyName = selectedCompany.display_name || selectedCompany.name;

    try {
      // 1. Add note
      await addNoteMutation.mutateAsync({
        companyId: selectedCompany.id,
        noteDate: today,
        content: '📄 Pogodba/aneks poslan, čakam na vrnitev podpisane pogodbe',
      });

      // 2. Create 3 reminders
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const in3Days = new Date(now);
      in3Days.setDate(in3Days.getDate() + 3);

      const reminders = [
        { date: now, note: `📞 Pokliči ${companyName} - pogodba poslana` },
        { date: tomorrow, note: `📞 Followup ${companyName} - pogodba?` },
        { date: in3Days, note: `📞 Followup ${companyName} - urgentno!` },
      ];

      for (const r of reminders) {
        await createReminder.mutateAsync({
          company_id: selectedCompany.id,
          user_id: userId,
          reminder_at: r.date.toISOString(),
          note: r.note,
        });
      }

      // Update pipeline status
      await updatePipelineStatus.mutateAsync({
        companyId: selectedCompany.id,
        status: 'contract_sent',
      });

      toast({ description: '✅ Pogodba poslana - opomniki ustvarjeni' });
    } catch (error: any) {
      toast({
        description: `Napaka: ${error?.message || 'Neznana napaka'}`,
        variant: 'destructive'
      });
    }
  };

  // Complete reminder
  const handleCompleteReminder = async (reminderId: string) => {
    try {
      await completeReminder.mutateAsync(reminderId);
      toast({ description: '✅ Opomnik označen kot opravljen' });
    } catch (error) {
      toast({ description: 'Napaka pri označevanju opomnika', variant: 'destructive' });
    }
  };

  // Add new company
  const handleAddCompany = async () => {
    const hasCompanyName = !!formData.companyName?.trim();
    const hasDisplayName = !!formData.displayName?.trim();
    const hasContact = !!formData.contactName?.trim();
    const hasPhone = !!formData.contactPhone?.trim();

    if (!userId) {
      toast({ description: 'Napaka: uporabnik ni prijavljen', variant: 'destructive' });
      return;
    }

    if (!hasCompanyName && !hasDisplayName && !hasContact && !hasPhone) {
      toast({ description: 'Vnesi vsaj ime podjetja, ime lokacije, ali kontaktno osebo', variant: 'destructive' });
      return;
    }

    // Check for duplicate company by tax number (most reliable)
    if (formData.taxNumber?.trim() && companies) {
      const taxToCheck = formData.taxNumber.trim().replace(/\s/g, '');
      const duplicateByTax = companies.find(c =>
        c.tax_number && c.tax_number.replace(/\s/g, '') === taxToCheck
      );

      if (duplicateByTax) {
        const duplicateName = duplicateByTax.display_name || duplicateByTax.name;
        toast({
          description: `⚠️ Podjetje z davčno ${taxToCheck} že obstaja: "${duplicateName}"`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Check for duplicate company by name (exact or close substring, min 4 chars to avoid false positives)
    const nameToCheck = formData.companyName?.trim() || formData.displayName?.trim();
    if (nameToCheck && companies) {
      const normalizedName = nameToCheck.toLowerCase().replace(/\s+/g, ' ');
      const duplicate = companies.find(c => {
        const existingName = (c.name || '').toLowerCase().replace(/\s+/g, ' ');
        const existingDisplayName = (c.display_name || '').toLowerCase().replace(/\s+/g, ' ');
        // Exact match
        if (existingName === normalizedName || existingDisplayName === normalizedName) return true;
        // Substring match - only if both strings are meaningful (>= 4 chars)
        if (existingName.length >= 4 && normalizedName.length >= 4) {
          if (existingName.includes(normalizedName) || normalizedName.includes(existingName)) return true;
        }
        if (existingDisplayName.length >= 4 && normalizedName.length >= 4) {
          if (existingDisplayName.includes(normalizedName) || normalizedName.includes(existingDisplayName)) return true;
        }
        return false;
      });

      if (duplicate) {
        const duplicateName = duplicate.display_name || duplicate.name;
        const confirmed = await confirm({
          title: 'Podvojeno podjetje?',
          description: `Podobno podjetje "${duplicateName}" že obstaja!\n\nAli si prepričan, da želiš ustvariti novo podjetje z imenom "${nameToCheck}"?`,
          confirmLabel: 'Ustvari vseeno',
        });
        if (!confirmed) {
          return;
        }
      }
    }

    const isOsnutek = !hasCompanyName;
    let companyName = formData.companyName?.trim();

    if (!companyName) {
      if (hasDisplayName) {
        companyName = `Osnutek: ${formData.displayName?.trim()}`;
      } else if (hasContact) {
        companyName = `Osnutek: ${formData.contactName?.trim()}`;
      } else if (hasPhone) {
        companyName = `Osnutek: ${formData.contactPhone?.trim()}`;
      }
    }

    try {
      await createCompany.mutateAsync({
        company: {
          name: companyName!,
          display_name: formData.displayName,
          tax_number: formData.taxNumber,
          address_street: formData.addressStreet,
          address_postal: formData.addressPostal,
          address_city: formData.addressCity,
          delivery_address: formData.deliveryAddress,
          delivery_postal: formData.deliveryPostal,
          delivery_city: formData.deliveryCity,
          billing_address: formData.billingAddress,
          billing_postal: formData.billingPostal,
          billing_city: formData.billingCity,
          working_hours: formData.workingHours,
          delivery_instructions: formData.deliveryInstructions,
          customer_number: formData.customerNumber,
          notes: formData.notes,
          pipeline_status: isOsnutek ? 'osnutek' : undefined,
          parent_company_id: formData.parentCompanyId || undefined,
          is_vat_payer: formData.isVatPayer ?? undefined,
        },
        contact: formData.contactName ? {
          first_name: formData.contactName.split(' ')[0],
          last_name: formData.contactName.split(' ').slice(1).join(' '),
          phone: formData.contactPhone,
          email: formData.contactEmail,
          role: formData.contactRole,
          is_billing_contact: formData.isBillingContact,
          is_service_contact: formData.isServiceContact,
        } : undefined,
        userId,
      });

      toast({ description: isOsnutek ? '📋 Osnutek shranjen - dopolni kasneje' : '✅ Stranka dodana' });
      setShowAddModal(false);
      setFormData({});
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju', variant: 'destructive' });
    }
  };

  // Tax lookup for add company form
  const handleTaxLookup = async () => {
    const taxNumber = formData.taxNumber;
    if (!taxNumber || !isValidTaxNumberFormat(taxNumber)) {
      return;
    }

    setTaxLookupLoading(true);
    try {
      const result = await lookupCompanyInternalFirst(taxNumber);

      if (!result) {
        toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
        return;
      }

      if (result.source === 'internal' && result.internalCompany) {
        // Podjetje že obstaja v bazi - prikaži obstoječe podjetje
        const existingData = result.internalCompany;

        // Ustvari CompanyWithContacts objekt za modal
        const companyForModal: CompanyWithContacts = {
          id: existingData.id,
          name: existingData.name,
          display_name: existingData.display_name || null,
          tax_number: existingData.tax_number || null,
          address_street: existingData.address_street || null,
          address_city: existingData.address_city || null,
          address_postal: existingData.address_postal || null,
          parent_company_id: existingData.parent_company_id || null,
          // Dodaj parent_company podatke za prikaz v modalu
          parent_company: existingData.parent_company ? {
            id: existingData.parent_company.id,
            name: existingData.parent_company.name,
            display_name: existingData.parent_company.display_name || null,
            tax_number: existingData.parent_company.tax_number || null,
          } : undefined,
          contacts: existingData.contacts.map(c => ({
            id: c.id,
            company_id: existingData.id,
            first_name: c.first_name || null,
            last_name: c.last_name || null,
            email: c.email || null,
            phone: c.phone || null,
            role: c.role || null,
            is_decision_maker: c.is_decision_maker || false,
            created_at: '',
            updated_at: '',
            location_address: null,
            location_lat: null,
            location_lng: null,
            contact_since: null,
            created_by: null,
          })),
          cycles: [],
          cycleStats: { onTest: 0, signed: 0, total: 0, offerSent: false },
          // Other required fields with defaults
          created_at: '',
          updated_at: '',
          address_country: null,
          website: null,
          notes: null,
          status: 'active',
          pipeline_status: null,
          source: null,
          industry: null,
          employee_count: null,
          annual_revenue: null,
          location_lat: null,
          location_lng: null,
          location_address: null,
          contract_signed: false,
          contract_frequency: null,
          contract_signed_at: null,
          contract_sent_at: null,
          contract_called_at: null,
          offer_sent_at: null,
          offer_called_at: null,
          pickup_requested_at: null,
          driver_pickup_at: null,
          created_by: null,
        };

        // Shrani pending podatke - niso več potrebni z novim flowom
        setPendingContactData({});

        setExistingCompany(companyForModal);
        setShowExistingCompanyModal(true);

        const contactCount = existingData.contacts?.length || 0;
        const parentInfo = existingData.parent_company
          ? ` (matično: ${existingData.parent_company.display_name || existingData.parent_company.name})`
          : '';
        toast({
          description: `📋 Podjetje najdeno v bazi (${contactCount} kontakt${contactCount !== 1 ? 'ov' : ''})${parentInfo}`,
        });
      } else if (result.source === 'register' && result.registerCompany) {
        // Podjetje najdeno v registru slovenian_companies
        const regData = result.registerCompany;
        setFormData((prev: any) => ({
          ...prev,
          companyName: regData.name || prev.companyName,
          addressStreet: regData.address_street || prev.addressStreet,
          addressCity: regData.address_city || prev.addressCity,
          addressPostal: regData.address_postal || prev.addressPostal,
          isVatPayer: regData.is_vat_payer,
        }));

        const vatLabel = regData.is_vat_payer ? ' (DDV zavezanec)' : ' (ni DDV zavezanec)';
        toast({ description: `Podjetje najdeno v registru: ${regData.name}${vatLabel}` });

        // Poskusi najti odpiralni čas iz OpenStreetMap (v ozadju)
        lookupOpeningHours(regData.name, regData.address_city).then(hours => {
          if (hours) {
            setFormData((prev: any) => ({ ...prev, workingHours: hours }));
            toast({ description: `Odpiralni čas najden: ${hours}` });
          }
        });
      } else if (result.source === 'external' && result.externalData) {
        // Podjetje ni v bazi - izpolni iz VIES API
        const companyData = result.externalData;
        if (!companyData.isValid) {
          toast({ description: 'Davčna številka ni veljavna ali podjetje ni DDV zavezanec', variant: 'destructive' });
          return;
        }

        // VIES vrne veljavno DDV → je DDV zavezanec
        // Poskusi dobiti polno ime iz registra (VIES včasih izpusti s.p., d.o.o. itd.)
        const registerData = await lookupCompanyInRegister(formData.taxNumber?.replace(/^SI/i, '').replace(/\s/g, ''));
        const fullName = registerData?.name || companyData.name;

        setFormData((prev: any) => ({
          ...prev,
          companyName: fullName || prev.companyName,
          addressStreet: companyData.street || prev.addressStreet,
          addressCity: companyData.city || prev.addressCity,
          addressPostal: companyData.postalCode || prev.addressPostal,
          isVatPayer: true, // VIES potrjen = DDV zavezanec
        }));

        toast({ description: `Podjetje najdeno: ${fullName} (DDV zavezanec)` });

        // Poskusi najti odpiralni čas iz OpenStreetMap (v ozadju)
        lookupOpeningHours(fullName, companyData.city).then(hours => {
          if (hours) {
            setFormData((prev: any) => ({ ...prev, workingHours: hours }));
            toast({ description: `Odpiralni čas najden: ${hours}` });
          }
        });
      }
    } catch (error) {
      toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
    } finally {
      setTaxLookupLoading(false);
    }
  };

  // Name lookup - search register by company name
  const handleNameLookup = async (): Promise<RegisterCompanyData[]> => {
    const name = formData.companyName;
    if (!name || name.trim().length < 2) return [];

    setTaxLookupLoading(true);
    try {
      const results = await searchCompaniesByName(name.trim(), 10);
      if (results.length === 0) {
        toast({ description: 'Ni zadetkov v registru' });
      }
      return results;
    } catch {
      toast({ description: 'Napaka pri iskanju', variant: 'destructive' });
      return [];
    } finally {
      setTaxLookupLoading(false);
    }
  };

  // Select company from name search results
  const handleSelectNameResult = (company: RegisterCompanyData) => {
    setFormData((prev: any) => ({
      ...prev,
      companyName: company.name || prev.companyName,
      taxNumber: company.tax_number || prev.taxNumber,
      addressStreet: company.address_street || prev.addressStreet,
      addressCity: company.address_city || prev.addressCity,
      addressPostal: company.address_postal || prev.addressPostal,
    }));
    toast({ description: `Izpolnjeno: ${company.name}` });
  };

  // Tax lookup for edit address modal
  const handleEditAddressTaxLookup = async () => {
    const taxNumber = editAddressData.taxNumber;
    if (!taxNumber || !isValidTaxNumberFormat(taxNumber)) {
      return;
    }

    setTaxLookupLoading(true);
    try {
      const companyData = await lookupCompanyByTaxNumber(taxNumber);

      if (!companyData) {
        toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
        return;
      }

      if (!companyData.isValid) {
        toast({ description: 'Davčna številka ni veljavna ali podjetje ni DDV zavezanec', variant: 'destructive' });
        return;
      }

      setEditAddressData((prev: any) => ({
        ...prev,
        companyName: companyData.name || prev.companyName,
        addressStreet: companyData.street || prev.addressStreet,
        addressCity: companyData.city || prev.addressCity,
        addressPostal: companyData.postalCode || prev.addressPostal,
      }));

      toast({ description: `Podjetje najdeno: ${companyData.name}` });
    } catch (error) {
      toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
    } finally {
      setTaxLookupLoading(false);
    }
  };

  // Add contact
  const handleAddContact = async () => {
    if (!formData.newContactName || !selectedCompany || !userId) {
      toast({ description: 'Ime kontakta je obvezno', variant: 'destructive' });
      return;
    }

    try {
      await addContact.mutateAsync({
        companyId: selectedCompany.id,
        contact: {
          first_name: formData.newContactName.split(' ')[0],
          last_name: formData.newContactName.split(' ').slice(1).join(' '),
          phone: formData.newContactPhone,
          work_phone: formData.newContactWorkPhone,
          email: formData.newContactEmail,
          role: formData.newContactRole,
          contact_since: formData.newContactSince || null,
          location_address: formData.hasDifferentLocation ? formData.newContactLocation : null,
        },
        userId,
      });

      toast({ description: '✅ Kontakt dodan' });
      setShowAddContactModal(false);
      setFormData({});
      const updated = companies?.find(c => c.id === selectedCompany.id);
      if (updated) setSelectedCompany(updated);
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju kontakta', variant: 'destructive' });
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId: string) => {
    if (!await confirm({ title: 'Izbriši kontakt?', description: 'Ali res želiš zbrisati ta kontakt?', destructive: true, confirmLabel: 'Izbriši' })) return;

    try {
      await deleteContact.mutateAsync(contactId);
      toast({ description: '✅ Kontakt izbrisan' });
      if (selectedCompany) {
        const updated = companies?.find(c => c.id === selectedCompany.id);
        if (updated) setSelectedCompany(updated);
      }
    } catch (error) {
      toast({ description: 'Napaka pri brisanju kontakta', variant: 'destructive' });
    }
  };

  // Save address/company data
  const queryClient = useQueryClient();
  const handleSaveAddress = async () => {
    if (!selectedCompany) return;

    try {
      // Posodobi ime podjetja, če je bilo spremenjeno (in ni prazno)
      const nameUpdate = editAddressData.companyName?.trim()
        ? { name: editAddressData.companyName.trim() }
        : {};

      // Če je bilo osnutek in ima zdaj pravo ime, odstrani pipeline_status osnutek
      const isNoLongerOsnutek = selectedCompany.name?.startsWith('Osnutek:') &&
        editAddressData.companyName?.trim() &&
        !editAddressData.companyName.startsWith('Osnutek:');

      const { error } = await supabase
        .from('companies')
        .update({
          ...nameUpdate,
          display_name: editAddressData.displayName || null,
          tax_number: editAddressData.taxNumber || null,
          address_street: editAddressData.addressStreet || null,
          address_postal: editAddressData.addressPostal || null,
          address_city: editAddressData.addressCity || null,
          delivery_address: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryAddress : null,
          delivery_postal: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryPostal : null,
          delivery_city: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryCity : null,
          parent_company_id: editAddressData.parentCompanyId || null,
          ...(isNoLongerOsnutek ? { pipeline_status: null } : {}),
        })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      const updated = {
        ...selectedCompany,
        ...(editAddressData.companyName?.trim() ? { name: editAddressData.companyName.trim() } : {}),
        display_name: editAddressData.displayName || null,
        tax_number: editAddressData.taxNumber || null,
        address_street: editAddressData.addressStreet || null,
        address_postal: editAddressData.addressPostal || null,
        address_city: editAddressData.addressCity || null,
        delivery_address: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryAddress : null,
        delivery_postal: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryPostal : null,
        delivery_city: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryCity : null,
        parent_company_id: editAddressData.parentCompanyId || null,
      };
      setSelectedCompany(updated as any);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });

      toast({ description: isNoLongerOsnutek ? 'Podjetje posodobljeno iz osnutka' : 'Podatki posodobljeni' });
      setShowEditAddressModal(false);
    } catch (error: any) {
      // Error handled by toast
      toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
    }
  };

  return {
    // Mutations for external use
    createCompany,
    addContact,
    updateCompany,
    updateContact,
    deleteContact,
    deleteCompany: deleteCompanyMutation,
    updatePipelineStatus,

    // Handlers
    handleAddToExistingCompany,
    handleCreateNewAnyway,
    handleSelectExistingContact,
    handleAddNewContactToExisting,
    handleCreateReminder,
    handleContractSent,
    handleCompleteReminder,
    handleAddCompany,
    handleTaxLookup,
    handleNameLookup,
    handleSelectNameResult,
    handleEditAddressTaxLookup,
    handleAddContact,
    handleDeleteContact,
    handleSaveAddress,
    ConfirmDialog,
  };
}

export default useCompanyActions;

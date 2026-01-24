/**
 * @file useCompanyActions.ts
 * @description Hook za CRUD operacije s podjetji in kontakti
 */

import { useToast } from '@/hooks/use-toast';
import { useCreateCompany, useAddContact, useUpdateCompany, useUpdateContact, useDeleteContact, useDeleteCompany, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useCreateReminder, useCompleteReminder, useUpdatePipelineStatus } from '@/hooks/useReminders';
import { lookupCompanyByTaxNumber, isValidTaxNumberFormat } from '@/utils/companyLookup';
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
  setShowReminderModal,
  setReminderCompanyId,
  setReminderDate,
  setReminderTime,
  setReminderNote,
  addNoteMutation,
}: UseCompanyActionsProps) {
  const { toast } = useToast();

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

  // Add contact to existing company (from QR scan)
  const handleAddToExistingCompany = async () => {
    if (!existingCompany || !pendingContactData || !userId) return;

    try {
      await addContact.mutateAsync({
        companyId: existingCompany.id,
        contact: {
          first_name: pendingContactData.contactName?.split(' ')[0] || 'Kontakt',
          last_name: pendingContactData.contactName?.split(' ').slice(1).join(' ') || '',
          phone: pendingContactData.contactPhone,
          email: pendingContactData.contactEmail,
          role: pendingContactData.contactRole,
        },
        userId,
      });

      toast({ description: '✅ Kontakt dodan k obstoječemu podjetju' });
      setShowExistingCompanyModal(false);
      setExistingCompany(null);
      setPendingContactData(null);
      setShowAddModal(false);
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju kontakta', variant: 'destructive' });
    }
  };

  // Create new company anyway (ignore existing)
  const handleCreateNewAnyway = () => {
    if (pendingContactData) {
      setFormData({ ...formData, ...pendingContactData });
    }
    setShowExistingCompanyModal(false);
    setExistingCompany(null);
    setPendingContactData(null);
    toast({ description: 'Podatki uvoženi - ustvarite novo podjetje' });
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
      });

      toast({ description: '✅ Opomnik dodan' });
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
      const companyData = await lookupCompanyByTaxNumber(taxNumber);

      if (!companyData) {
        toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
        return;
      }

      if (!companyData.isValid) {
        toast({ description: 'Davčna številka ni veljavna ali podjetje ni DDV zavezanec', variant: 'destructive' });
        return;
      }

      setFormData((prev: any) => ({
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
    if (!window.confirm('Ali res želiš zbrisati ta kontakt?')) return;

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
      console.error('Error updating company:', error);
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
    handleCreateReminder,
    handleContractSent,
    handleCompleteReminder,
    handleAddCompany,
    handleTaxLookup,
    handleEditAddressTaxLookup,
    handleAddContact,
    handleDeleteContact,
    handleSaveAddress,
  };
}

export default useCompanyActions;

/**
 * @file useCycleActions.ts
 * @description Hook za CRUD operacije s cikli predpražnikov
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  useCycles,
  useCreateCycle,
  useUpdateCycleStatus,
  usePutOnTest,
  useSignContract,
  useExtendTest,
  CycleWithRelations
} from '@/hooks/useCycles';
import { useCreateCompanyWithContact, useCreateContact } from '@/hooks/useCompanies';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface UseCycleActionsProps {
  userId: string | undefined;
  companies: CompanyWithContacts[] | undefined;
  selectedCycle: CycleWithRelations | null;
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  setShowModal: (show: boolean) => void;
  setModalType: (type: string) => void;
  setSelectedCycle: (cycle: CycleWithRelations | null) => void;
}

// Helper function to get current GPS position
const getCurrentPosition = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
};

export function useCycleActions({
  userId,
  companies,
  selectedCycle,
  formData,
  setFormData,
  setShowModal,
  setModalType,
  setSelectedCycle,
}: UseCycleActionsProps) {
  const { toast } = useToast();

  // Mutations
  const createCycle = useCreateCycle();
  const updateStatus = useUpdateCycleStatus();
  const putOnTest = usePutOnTest();
  const signContract = useSignContract();
  const extendTest = useExtendTest();
  const createCompanyWithContact = useCreateCompanyWithContact();
  const createContact = useCreateContact();

  const showToast = useCallback((message: string, variant: 'default' | 'destructive' = 'default') => {
    toast({ description: message, variant });
  }, [toast]);

  const handleAddMat = useCallback(async (qrId: string, matTypeId: string) => {
    if (!userId) return;

    try {
      await createCycle.mutateAsync({
        qr_code_id: qrId,
        salesperson_id: userId,
        mat_type_id: matTypeId,
        status: 'clean',
      });
      showToast('✅ Predpražnik dodan');
      setShowModal(false);
      setFormData(() => ({}));
    } catch (error) {
      showToast('Napaka pri dodajanju', 'destructive');
    }
  }, [userId, createCycle, showToast, setShowModal, setFormData]);

  const handlePutOnTest = useCallback(async () => {
    if (!selectedCycle || !userId) return;

    try {
      // Get GPS coordinates
      const location = await getCurrentPosition();

      // Create company if new
      let companyId = formData.companyId;
      let companyName = formData.clientName;
      let contactId: string | undefined;

      if (!companyId && formData.clientName) {
        // New company - create with contact
        const newCompany = await createCompanyWithContact.mutateAsync({
          company: {
            name: formData.clientName,
            display_name: formData.displayName || null,
            tax_number: formData.taxNumber || null,
            address_street: formData.addressStreet || null,
            address_postal: formData.addressPostal || null,
            address_city: formData.addressCity || null,
            created_by: userId,
          },
          contact: formData.contactPerson ? {
            first_name: formData.contactPerson.split(' ')[0] || formData.contactPerson,
            last_name: formData.contactPerson.split(' ').slice(1).join(' ') || '',
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.contactRole || null,
            is_decision_maker: formData.isDecisionMaker || false,
            created_by: userId,
          } : undefined,
        });
        companyId = newCompany.id;
      } else if (companyId) {
        // Existing company
        const selectedCompany = companies?.find(c => c.id === companyId);
        companyName = selectedCompany?.display_name || selectedCompany?.name || '';

        // Check if using existing contact or creating new one
        if (formData.useExistingContact && formData.contactId && formData.contactId !== 'new') {
          contactId = formData.contactId;
        } else if (formData.contactId === 'new' && formData.contactPerson) {
          // Create new contact for existing company
          const newContact = await createContact.mutateAsync({
            company_id: companyId,
            first_name: formData.contactPerson.split(' ')[0] || formData.contactPerson,
            last_name: formData.contactPerson.split(' ').slice(1).join(' ') || '',
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.contactRole || null,
            is_decision_maker: formData.isDecisionMaker || false,
            created_by: userId,
          });
          contactId = newContact.id;
        }
      }

      await putOnTest.mutateAsync({
        cycleId: selectedCycle.id,
        companyId,
        contactId,
        userId,
        notes: formData.comment,
        locationLat: location?.lat,
        locationLng: location?.lng,
      });

      showToast('✅ Dan na test - ' + companyName);

      // Save company info and location for "add another" option
      setFormData((prev: any) => ({
        ...prev,
        lastCompanyId: companyId,
        lastCompanyName: companyName,
        lastContactId: contactId,
        lastLocationLat: location?.lat,
        lastLocationLng: location?.lng,
      }));
      setModalType('putOnTestSuccess');
    } catch (error) {
      showToast('Napaka pri shranjevanju', 'destructive');
    }
  }, [selectedCycle, userId, formData, companies, createCompanyWithContact, createContact, putOnTest, showToast, setFormData, setModalType]);

  const handleMarkAsDirty = useCallback(async () => {
    if (!selectedCycle || !userId) return;

    try {
      await updateStatus.mutateAsync({
        cycleId: selectedCycle.id,
        newStatus: 'dirty',
        userId,
      });
      showToast('✅ Označen kot umazan');
      setShowModal(false);
      setSelectedCycle(null);
    } catch (error) {
      showToast('Napaka pri posodabljanju', 'destructive');
    }
  }, [selectedCycle, userId, updateStatus, showToast, setShowModal, setSelectedCycle]);

  const handleRequestDriverPickup = useCallback(async () => {
    if (!selectedCycle || !userId) return;

    try {
      await updateStatus.mutateAsync({
        cycleId: selectedCycle.id,
        newStatus: 'waiting_driver',
        userId,
      });
      showToast('✅ Naročeno za šoferja');
      setShowModal(false);
      setSelectedCycle(null);
    } catch (error) {
      showToast('Napaka pri posodabljanju', 'destructive');
    }
  }, [selectedCycle, userId, updateStatus, showToast, setShowModal, setSelectedCycle]);

  const handleSignContract = useCallback(async () => {
    if (!selectedCycle || !userId || !formData.frequency) return;

    try {
      await signContract.mutateAsync({
        cycleId: selectedCycle.id,
        frequency: formData.frequency,
        userId,
      });
      showToast('✅ Ponudba poslana');
      setShowModal(false);
      setSelectedCycle(null);
      setFormData(() => ({}));
    } catch (error) {
      showToast('Napaka pri shranjevanju', 'destructive');
    }
  }, [selectedCycle, userId, formData.frequency, signContract, showToast, setShowModal, setSelectedCycle, setFormData]);

  const handleExtendTest = useCallback(async () => {
    if (!selectedCycle || !userId) return;

    try {
      await extendTest.mutateAsync({
        cycleId: selectedCycle.id,
        userId,
      });
      showToast('✅ Test podaljšan za 7 dni');
      setShowModal(false);
      setSelectedCycle(null);
    } catch (error) {
      showToast('Napaka pri podaljševanju', 'destructive');
    }
  }, [selectedCycle, userId, extendTest, showToast, setShowModal, setSelectedCycle]);

  return {
    // Mutations for external use
    createCycle,
    updateStatus,
    putOnTest,
    signContract,
    extendTest,
    createCompanyWithContact,
    createContact,

    // Handlers
    handleAddMat,
    handlePutOnTest,
    handleMarkAsDirty,
    handleRequestDriverPickup,
    handleSignContract,
    handleExtendTest,
    showToast,
  };
}

export default useCycleActions;

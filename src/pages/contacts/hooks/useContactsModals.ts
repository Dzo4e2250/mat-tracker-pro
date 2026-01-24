/**
 * @file useContactsModals.ts
 * @description Hook za upravljanje vseh modal stanj v Contacts strani
 */

import { useState, useCallback } from 'react';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface ModalState {
  // Company selection
  selectedCompanyId: string | null;
  selectedCompany: CompanyWithContacts | null;

  // Form modals
  showAddModal: boolean;
  showAddContactModal: boolean;
  showEditAddressModal: boolean;
  showMeetingModal: boolean;

  // Utility modals
  showReminderModal: boolean;
  showRoutePlannerModal: boolean;
  showExistingCompanyModal: boolean;
  showQRScanner: boolean;

  // Contract modals
  showContractConfirm: boolean;
  showContractModal: boolean;
  showOfferModal: boolean;

  // Edit states
  editingContact: any | null;
}

interface ReminderModalState {
  companyId: string | null;
  date: string;
  time: string;
  note: string;
}

interface MeetingModalState {
  type: 'sestanek' | 'ponudba' | 'izris';
  date: string;
  time: string;
}

interface ExistingCompanyState {
  company: CompanyWithContacts | null;
  pendingContactData: any | null;
}

export function useContactsModals() {
  // Main modal states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContacts | null>(null);

  // Form modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Utility modals
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showRoutePlannerModal, setShowRoutePlannerModal] = useState(false);
  const [showExistingCompanyModal, setShowExistingCompanyModal] = useState(false);

  // Contract modals
  const [showContractConfirm, setShowContractConfirm] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  // Edit states
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editContactData, setEditContactData] = useState<any>({});

  // Form data
  const [formData, setFormData] = useState<any>({});
  const [editAddressData, setEditAddressData] = useState<any>({});

  // Reminder modal state
  const [reminderState, setReminderState] = useState<ReminderModalState>({
    companyId: null,
    date: '',
    time: '09:00',
    note: '',
  });

  // Meeting modal state
  const [meetingState, setMeetingState] = useState<MeetingModalState>({
    type: 'sestanek',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
  });

  // Existing company state
  const [existingCompanyState, setExistingCompanyState] = useState<ExistingCompanyState>({
    company: null,
    pendingContactData: null,
  });

  // Selected offer for contract
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  // Notes state
  const [newNoteDate, setNewNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Tax lookup loading
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);

  // Saved contracts
  const [savedContracts, setSavedContracts] = useState<any[]>([]);

  // Helper functions
  const openReminderModal = useCallback((companyId: string) => {
    setReminderState({
      companyId,
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      note: '',
    });
    setShowReminderModal(true);
  }, []);

  const closeReminderModal = useCallback(() => {
    setShowReminderModal(false);
    setReminderState({
      companyId: null,
      date: '',
      time: '09:00',
      note: '',
    });
  }, []);

  const openMeetingModal = useCallback((type: 'sestanek' | 'ponudba' | 'izris') => {
    setMeetingState({
      type,
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
    });
    setShowMeetingModal(true);
  }, []);

  const closeMeetingModal = useCallback(() => {
    setShowMeetingModal(false);
  }, []);

  const selectCompany = useCallback((company: CompanyWithContacts) => {
    setSelectedCompany(company);
    setSelectedCompanyId(company.id);
  }, []);

  const clearSelectedCompany = useCallback(() => {
    setSelectedCompany(null);
    setSelectedCompanyId(null);
  }, []);

  const openExistingCompanyModal = useCallback((company: CompanyWithContacts, contactData: any) => {
    setExistingCompanyState({ company, pendingContactData: contactData });
    setShowExistingCompanyModal(true);
  }, []);

  const closeExistingCompanyModal = useCallback(() => {
    setShowExistingCompanyModal(false);
    setExistingCompanyState({ company: null, pendingContactData: null });
  }, []);

  return {
    // Company selection
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    setSelectedCompany,
    selectCompany,
    clearSelectedCompany,

    // Form modals
    showAddModal,
    setShowAddModal,
    showAddContactModal,
    setShowAddContactModal,
    showEditAddressModal,
    setShowEditAddressModal,
    showMeetingModal,
    setShowMeetingModal,

    // Utility modals
    showReminderModal,
    setShowReminderModal,
    showRoutePlannerModal,
    setShowRoutePlannerModal,
    showExistingCompanyModal,
    setShowExistingCompanyModal,

    // Contract modals
    showContractConfirm,
    setShowContractConfirm,
    showContractModal,
    setShowContractModal,

    // Edit states
    editingContact,
    setEditingContact,
    editContactData,
    setEditContactData,

    // Form data
    formData,
    setFormData,
    editAddressData,
    setEditAddressData,

    // Reminder modal
    reminderState,
    setReminderState,
    openReminderModal,
    closeReminderModal,

    // Meeting modal
    meetingState,
    setMeetingState,
    openMeetingModal,
    closeMeetingModal,

    // Existing company
    existingCompanyState,
    setExistingCompanyState,
    openExistingCompanyModal,
    closeExistingCompanyModal,

    // Selected offer
    selectedOffer,
    setSelectedOffer,

    // Notes
    newNoteDate,
    setNewNoteDate,
    newNoteContent,
    setNewNoteContent,

    // Tax lookup
    taxLookupLoading,
    setTaxLookupLoading,

    // Saved contracts
    savedContracts,
    setSavedContracts,
  };
}

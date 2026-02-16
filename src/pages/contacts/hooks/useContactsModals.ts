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
  createTask: boolean;
}

interface MeetingModalState {
  type: 'sestanek' | 'ponudba';
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

  // Izris modal
  const [showIzrisModal, setShowIzrisModal] = useState(false);

  // Delivery info modal
  const [showDeliveryInfoModal, setShowDeliveryInfoModal] = useState(false);

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
    createTask: true, // Default: true - ustvari Kanban nalogo
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

  // Helper to get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // "HH:MM"
  };

  const getEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + 30);
    return endDate.toTimeString().slice(0, 5);
  };

  // D365 Activity fields - use current time
  const [d365Category, setD365Category] = useState<string>('');
  const [d365Subcategory, setD365Subcategory] = useState<string>('');
  const [d365AppointmentType, setD365AppointmentType] = useState<string>('face_to_face');
  const [d365StartTime, setD365StartTime] = useState<string>(() => getCurrentTime());
  const [d365EndTime, setD365EndTime] = useState<string>(() => getEndTime(getCurrentTime()));

  const resetD365Fields = useCallback(() => {
    const now = getCurrentTime();
    setD365Category('');
    setD365Subcategory('');
    setD365AppointmentType('face_to_face');
    setD365StartTime(now);
    setD365EndTime(getEndTime(now));
  }, []);

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
      createTask: true,
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
      createTask: true,
    });
  }, []);

  const openMeetingModal = useCallback((type: 'sestanek' | 'ponudba') => {
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

    // Izris modal
    showIzrisModal,
    setShowIzrisModal,

    // Delivery info modal
    showDeliveryInfoModal,
    setShowDeliveryInfoModal,

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

    // D365 Activity fields
    d365Category,
    setD365Category,
    d365Subcategory,
    setD365Subcategory,
    d365AppointmentType,
    setD365AppointmentType,
    d365StartTime,
    setD365StartTime,
    d365EndTime,
    setD365EndTime,
    resetD365Fields,

    // Tax lookup
    taxLookupLoading,
    setTaxLookupLoading,

    // Saved contracts
    savedContracts,
    setSavedContracts,
  };
}

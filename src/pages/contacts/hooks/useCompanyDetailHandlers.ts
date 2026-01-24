/**
 * @file useCompanyDetailHandlers.ts
 * @description Hook za pripravo callback funkcij za CompanyDetailModal
 * Konsolidira inline handlere v memoizirane funkcije
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import { generateICSFile } from '@/pages/contacts/utils';

interface UseCompanyDetailHandlersProps {
  selectedCompany: CompanyWithContacts | null;
  companies: CompanyWithContacts[] | undefined;
  setSelectedCompany: (company: CompanyWithContacts | null) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setEditAddressData: (data: any) => void;
  setShowEditAddressModal: (show: boolean) => void;
  setShowAddContactModal: (show: boolean) => void;
  setMeetingType: (type: 'sestanek' | 'ponudba' | 'izris') => void;
  setMeetingDate: (date: string) => void;
  setMeetingTime: (time: string) => void;
  setShowMeetingModal: (show: boolean) => void;
  setEditingContact: (contact: any) => void;
  setEditContactData: (data: any) => void;
  setSelectedOffer: (offer: any) => void;
  setShowContractConfirm: (show: boolean) => void;
  addNoteMutation: { mutate: (data: any) => void };
  editNoteMutation: { mutate: (data: any) => void };
  deleteNoteMutation: { mutate: (id: string) => void };
  deleteCompany: { mutate: (id: string, options?: any) => void };
  newNoteContent: string;
  newNoteDate: string;
  // Meeting state
  meetingType: 'sestanek' | 'ponudba' | 'izris';
  meetingDate: string;
  meetingTime: string;
}

export function useCompanyDetailHandlers({
  selectedCompany,
  companies,
  setSelectedCompany,
  setSelectedCompanyId,
  setEditAddressData,
  setShowEditAddressModal,
  setShowAddContactModal,
  setMeetingType,
  setMeetingDate,
  setMeetingTime,
  setShowMeetingModal,
  setEditingContact,
  setEditContactData,
  setSelectedOffer,
  setShowContractConfirm,
  addNoteMutation,
  editNoteMutation,
  deleteNoteMutation,
  deleteCompany,
  newNoteContent,
  newNoteDate,
  meetingType,
  meetingDate,
  meetingTime,
}: UseCompanyDetailHandlersProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleClose = useCallback(() => {
    setSelectedCompany(null);
    setSelectedCompanyId(null);
  }, [setSelectedCompany, setSelectedCompanyId]);

  const handleEditAddress = useCallback(() => {
    if (!selectedCompany) return;
    setEditAddressData({
      companyName: selectedCompany.name || '',
      displayName: selectedCompany.display_name || '',
      taxNumber: selectedCompany.tax_number || '',
      addressStreet: selectedCompany.address_street || '',
      addressPostal: selectedCompany.address_postal || '',
      addressCity: selectedCompany.address_city || '',
      deliveryAddress: (selectedCompany as any).delivery_address || '',
      deliveryPostal: (selectedCompany as any).delivery_postal || '',
      deliveryCity: (selectedCompany as any).delivery_city || '',
      hasDifferentDeliveryAddress: !!(selectedCompany as any).delivery_address,
      parentCompanyId: (selectedCompany as any).parent_company_id || null,
    });
    setShowEditAddressModal(true);
  }, [selectedCompany, setEditAddressData, setShowEditAddressModal]);

  const handleQuickNote = useCallback((content: string) => {
    if (!selectedCompany) return;
    addNoteMutation.mutate({
      companyId: selectedCompany.id,
      noteDate: new Date().toISOString().split('T')[0],
      content,
    });
  }, [selectedCompany, addNoteMutation]);

  const handleAddNote = useCallback(() => {
    if (!selectedCompany || !newNoteContent.trim()) return;
    addNoteMutation.mutate({
      companyId: selectedCompany.id,
      noteDate: newNoteDate,
      content: newNoteContent.trim(),
    });
  }, [selectedCompany, newNoteContent, newNoteDate, addNoteMutation]);

  const handleEditNote = useCallback((noteId: string, content: string, noteDate: string) => {
    editNoteMutation.mutate({ noteId, content, noteDate });
  }, [editNoteMutation]);

  const handleDeleteNote = useCallback((noteId: string) => {
    deleteNoteMutation.mutate(noteId);
  }, [deleteNoteMutation]);

  const handleShowAddContact = useCallback(() => {
    setShowAddContactModal(true);
  }, [setShowAddContactModal]);

  const handleShowMeeting = useCallback((type: 'sestanek' | 'ponudba' | 'izris') => {
    setMeetingType(type);
    if (type === 'ponudba') {
      setMeetingDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setMeetingTime('09:00');
    } else {
      setMeetingDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setMeetingTime('10:00');
    }
    setShowMeetingModal(true);
  }, [setMeetingType, setMeetingDate, setMeetingTime, setShowMeetingModal]);

  const handleEditContact = useCallback((contact: any) => {
    setEditingContact(contact);
    setEditContactData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      role: contact.role || '',
      is_primary: contact.is_primary || false,
      location_address: (contact as any).location_address || '',
      contact_since: (contact as any).contact_since || '',
    });
  }, [setEditingContact, setEditContactData]);

  const handleViewOffer = useCallback((offer: any) => {
    setSelectedOffer(offer);
    setShowContractConfirm(true);
  }, [setSelectedOffer, setShowContractConfirm]);

  const handleNavigateToSeller = useCallback(() => {
    setSelectedCompany(null);
    setSelectedCompanyId(null);
    navigate('/prodajalec');
  }, [setSelectedCompany, setSelectedCompanyId, navigate]);

  const handleDeleteCompany = useCallback(() => {
    if (!selectedCompany) return;
    if (window.confirm(`Ali ste prepričani, da želite izbrisati stranko "${selectedCompany.display_name || selectedCompany.name}"?\n\nTo bo izbrisalo tudi vse kontakte, opombe in opomnike.`)) {
      deleteCompany.mutate(selectedCompany.id, {
        onSuccess: () => {
          toast({ description: 'Stranka izbrisana' });
          setSelectedCompany(null);
          setSelectedCompanyId(null);
        },
        onError: (error: any) => {
          toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
        }
      });
    }
  }, [selectedCompany, deleteCompany, toast, setSelectedCompany, setSelectedCompanyId]);

  const handleSelectCompany = useCallback((companyId: string) => {
    const newCompany = companies?.find(c => c.id === companyId);
    if (newCompany) {
      setSelectedCompany(newCompany);
      setSelectedCompanyId(companyId);
    }
  }, [companies, setSelectedCompany, setSelectedCompanyId]);

  // Meeting handlers
  const handleMeetingSaveWithICS = useCallback(() => {
    if (!selectedCompany) return;
    const formattedDate = new Date(meetingDate).toLocaleDateString('sl-SI');
    const content = meetingType === 'sestanek'
      ? `Dogovorjen sestanek za ${formattedDate} ob ${meetingTime}`
      : meetingType === 'ponudba'
      ? `Pošlji ponudbo do ${formattedDate}`
      : `Pošlji izris do ${formattedDate}`;

    addNoteMutation.mutate({
      companyId: selectedCompany.id,
      noteDate: new Date().toISOString().split('T')[0],
      content,
    });

    generateICSFile(selectedCompany, meetingDate, meetingType === 'sestanek' ? meetingTime : '09:00', meetingType);
    setShowMeetingModal(false);
  }, [selectedCompany, meetingDate, meetingTime, meetingType, addNoteMutation, setShowMeetingModal]);

  const handleMeetingSaveOnly = useCallback(() => {
    if (!selectedCompany) return;
    const formattedDate = new Date(meetingDate).toLocaleDateString('sl-SI');
    const content = meetingType === 'sestanek'
      ? `Dogovorjen sestanek za ${formattedDate} ob ${meetingTime}`
      : meetingType === 'ponudba'
      ? `Pošlji ponudbo do ${formattedDate}`
      : `Pošlji izris do ${formattedDate}`;

    addNoteMutation.mutate({
      companyId: selectedCompany.id,
      noteDate: new Date().toISOString().split('T')[0],
      content,
    });

    setShowMeetingModal(false);
  }, [selectedCompany, meetingDate, meetingTime, meetingType, addNoteMutation, setShowMeetingModal]);

  const handleMeetingClose = useCallback(() => {
    setShowMeetingModal(false);
  }, [setShowMeetingModal]);

  return {
    handleClose,
    handleEditAddress,
    handleQuickNote,
    handleAddNote,
    handleEditNote,
    handleDeleteNote,
    handleShowAddContact,
    handleShowMeeting,
    handleEditContact,
    handleViewOffer,
    handleNavigateToSeller,
    handleDeleteCompany,
    handleSelectCompany,
    handleMeetingSaveWithICS,
    handleMeetingSaveOnly,
    handleMeetingClose,
  };
}

export default useCompanyDetailHandlers;

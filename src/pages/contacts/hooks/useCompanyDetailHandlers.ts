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
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseCompanyDetailHandlersProps {
  selectedCompany: CompanyWithContacts | null;
  companies: CompanyWithContacts[] | undefined;
  companyNotes: any[] | undefined; // For auto-detecting first/second visit
  setSelectedCompany: (company: CompanyWithContacts | null) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setEditAddressData: (data: any) => void;
  setShowEditAddressModal: (show: boolean) => void;
  setShowAddContactModal: (show: boolean) => void;
  setMeetingType: (type: 'sestanek' | 'ponudba') => void;
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
  setNewNoteContent: (content: string) => void;
  // Meeting state
  meetingType: 'sestanek' | 'ponudba';
  meetingDate: string;
  meetingTime: string;
  // D365 fields
  d365Category: string;
  d365Subcategory: string;
  d365AppointmentType: string;
  d365StartTime: string;
  d365EndTime: string;
  resetD365Fields: () => void;
}

/**
 * Auto-detect D365 fields based on note content and existing notes count
 * @param content - The note content
 * @param existingNotesCount - Number of existing notes for this company
 * @param isInD365 - Whether company is marked as in D365
 * @returns D365 fields to apply
 */
function getAutoD365Fields(content: string, existingNotesCount: number, isInD365: boolean): {
  activityCategory: string | null;
  activitySubcategory: string | null;
  appointmentType: string | null;
} {
  // If company is not in D365, don't set any fields
  if (!isInD365) {
    return { activityCategory: null, activitySubcategory: null, appointmentType: null };
  }

  const lowerContent = content.toLowerCase();

  // Determine appointment type based on content
  let appointmentType: string = 'face_to_face'; // Default

  // "Klical - ni dvignil" or content with "klic" or "poslal sem" → Virtual Meeting
  if (lowerContent.includes('klical') ||
      lowerContent.includes('klic') ||
      lowerContent.includes('telefon') ||
      lowerContent.includes('poslal sem') ||
      lowerContent.includes('mail')) {
    appointmentType = 'virtual';
  }

  // "Ni interesa" - default is face_to_face, unless it contains klic/poslal sem
  // (already handled above)

  // Determine category based on note count
  let activityCategory: string | null = null;
  let activitySubcategory: string | null = null;

  if (existingNotesCount === 0) {
    // First note → First Visit + Needs Analysis
    activityCategory = 'first_visit';
    activitySubcategory = 'needs_analysis';
  } else if (existingNotesCount === 1) {
    // Second note → Second Visit
    activityCategory = 'second_visit';
    activitySubcategory = 'needs_analysis';
  }
  // For 3rd+ notes, don't auto-set category (user should choose)

  return { activityCategory, activitySubcategory, appointmentType };
}

export function useCompanyDetailHandlers({
  selectedCompany,
  companies,
  companyNotes,
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
  setNewNoteContent,
  meetingType,
  meetingDate,
  meetingTime,
  d365Category,
  d365Subcategory,
  d365AppointmentType,
  d365StartTime,
  d365EndTime,
  resetD365Fields,
}: UseCompanyDetailHandlersProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Helper to get current time
  const getCurrentTimeStrings = () => {
    const now = new Date();
    const startTime = now.toTimeString().slice(0, 5);
    const endDate = new Date(now.getTime() + 30 * 60000); // +30 min
    const endTime = endDate.toTimeString().slice(0, 5);
    return { startTime, endTime };
  };

  const handleQuickNote = useCallback(async (content: string) => {
    if (!selectedCompany) return;

    // Transform short phrases into full sentences
    const getFullSentence = (shortPhrase: string): string => {
      switch (shortPhrase) {
        case 'Klical - ni dvignil':
          return 'Klical sem kontaktno osebo, vendar ni dvignila telefona.';
        case 'Ni interesa':
          return 'Stranka trenutno nima interesa za naše storitve.';
        case 'Podpisana pogodba':
          return 'Stranka je podpisala pogodbo.';
        default:
          return shortPhrase;
      }
    };

    const fullContent = getFullSentence(content);

    // Auto-detect D365 fields based on content and note count
    const isInD365 = (selectedCompany as any).is_in_d365 || false;
    const existingNotesCount = companyNotes?.length || 0;
    const autoFields = getAutoD365Fields(content, existingNotesCount, isInD365);
    const { startTime, endTime } = getCurrentTimeStrings();

    addNoteMutation.mutate({
      companyId: selectedCompany.id,
      noteDate: new Date().toISOString().split('T')[0],
      content: fullContent,
      // Include auto-detected D365 fields
      activityCategory: autoFields.activityCategory,
      activitySubcategory: autoFields.activitySubcategory,
      appointmentType: autoFields.appointmentType,
      startTime: isInD365 ? startTime : null,
      endTime: isInD365 ? endTime : null,
    });

    // Create Kanban task for "Pripravi izris"
    if (content === 'Pripravi izris') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const companyName = selectedCompany.display_name || selectedCompany.name;
          await supabase.from('tasks').insert({
            title: `Pripravi izris - ${companyName}`,
            description: `Pripraviti izris za ${companyName}`,
            status: 'todo',
            salesperson_id: user.id,
            company_id: selectedCompany.id,
            task_type: 'izris',
            position: 0,
          });
          toast({ description: '📋 Dodano v Kanban naloge' });
        }
      } catch (error) {
        console.error('Error creating task:', error);
      }
    }

    // Create two Kanban tasks for "Podpisana pogodba"
    if (content === 'Podpisana pogodba') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const companyName = selectedCompany.display_name || selectedCompany.name;
          const deliveryAddress = (selectedCompany as any).delivery_address || selectedCompany.address_street || '';
          const deliveryCity = (selectedCompany as any).delivery_city || selectedCompany.address_city || '';
          const deliveryPostal = (selectedCompany as any).delivery_postal || selectedCompany.address_postal || '';
          const fullAddress = [deliveryAddress, deliveryPostal, deliveryCity].filter(Boolean).join(', ');

          // Task 1: Zaključi v CRM
          await supabase.from('tasks').insert({
            title: `Zaključi v CRM - ${companyName}`,
            description: `Zaključiti stranko ${companyName} v D365 CRM sistemu`,
            status: 'todo',
            salesperson_id: user.id,
            company_id: selectedCompany.id,
            task_type: 'crm_close',
            position: 0,
          });

          // Fetch user profile for salesRep info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, first_name, last_name, phone')
            .eq('id', user.id)
            .single();

          // Use full_name or combine first_name + last_name as fallback
          const salesRepName = profile?.full_name ||
            (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : '');

          // Task 2: Pripravi info o dostavnem mestu
          await supabase.from('tasks').insert({
            title: `Pripravi info o dostavi - ${companyName}`,
            description: `Pripraviti informacije o dostavnem mestu za šoferja`,
            status: 'todo',
            salesperson_id: user.id,
            company_id: selectedCompany.id,
            task_type: 'delivery_info',
            position: 0,
            checklist_items: {
              companyAddress: fullAddress,
              companyName: companyName,
              reportGenerated: false,
              // Auto-fill from logged in user
              salesRep: salesRepName,
              salesRepPhone: profile?.phone || '',
            },
          });

          toast({ description: '📋 Ustvarjeni 2 Kanban nalogi (CRM + Dostava)' });
        }
      } catch (error) {
        console.error('Error creating tasks:', error);
      }
    }
  }, [selectedCompany, companyNotes, addNoteMutation, toast]);

  const handleAddNote = useCallback(() => {
    if (!selectedCompany || !newNoteContent.trim()) return;

    // Auto-detect D365 fields if not manually set
    const isInD365 = (selectedCompany as any).is_in_d365 || false;
    const existingNotesCount = companyNotes?.length || 0;
    const autoFields = getAutoD365Fields(newNoteContent, existingNotesCount, isInD365);
    const { startTime: currentStart, endTime: currentEnd } = getCurrentTimeStrings();

    addNoteMutation.mutate({
      companyId: selectedCompany.id,
      noteDate: newNoteDate,
      content: newNoteContent.trim(),
      // Use manually set D365 fields, or fall back to auto-detected
      activityCategory: d365Category || autoFields.activityCategory,
      activitySubcategory: d365Subcategory || autoFields.activitySubcategory,
      appointmentType: d365AppointmentType || autoFields.appointmentType,
      startTime: d365StartTime || (isInD365 ? currentStart : null),
      endTime: d365EndTime || (isInD365 ? currentEnd : null),
    });
    // Reset note content and D365 fields after adding note
    setNewNoteContent('');
    resetD365Fields();
  }, [selectedCompany, companyNotes, newNoteContent, newNoteDate, addNoteMutation, setNewNoteContent, d365Category, d365Subcategory, d365AppointmentType, d365StartTime, d365EndTime, resetD365Fields]);

  const handleEditNote = useCallback((noteId: string, content: string, noteDate: string, d365Fields?: {
    activityCategory: string | null;
    activitySubcategory: string | null;
    appointmentType: string | null;
    startTime: string | null;
    endTime: string | null;
  }) => {
    editNoteMutation.mutate({
      noteId,
      content,
      noteDate,
      ...(d365Fields && {
        activityCategory: d365Fields.activityCategory,
        activitySubcategory: d365Fields.activitySubcategory,
        appointmentType: d365Fields.appointmentType,
        startTime: d365Fields.startTime,
        endTime: d365Fields.endTime,
      }),
    });
  }, [editNoteMutation]);

  const handleDeleteNote = useCallback((noteId: string) => {
    deleteNoteMutation.mutate(noteId);
  }, [deleteNoteMutation]);

  const handleShowAddContact = useCallback(() => {
    setShowAddContactModal(true);
  }, [setShowAddContactModal]);

  const handleShowMeeting = useCallback((type: 'sestanek' | 'ponudba') => {
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
      work_phone: contact.work_phone || '',
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
      ? `Dogovorjen sestanek za ${formattedDate} ob ${meetingTime}.`
      : `Ponudbo moram poslati do ${formattedDate}.`;

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
      ? `Dogovorjen sestanek za ${formattedDate} ob ${meetingTime}.`
      : `Ponudbo moram poslati do ${formattedDate}.`;

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

  // Toggle D365 CRM status
  const handleToggleD365 = useCallback(async (isInD365: boolean) => {
    if (!selectedCompany) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_in_d365: isInD365 })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      // Update local state
      setSelectedCompany({
        ...selectedCompany,
        is_in_d365: isInD365,
      } as any);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });

      toast({
        description: isInD365 ? '✓ Označeno kot vnešeno v D365' : 'Odstranjena oznaka D365',
      });
    } catch (error: any) {
      toast({
        description: `Napaka: ${error.message}`,
        variant: 'destructive',
      });
    }
  }, [selectedCompany, setSelectedCompany, queryClient, toast]);

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
    handleToggleD365,
  };
}

export type UseCompanyDetailHandlersReturn = ReturnType<typeof useCompanyDetailHandlers>;

export default useCompanyDetailHandlers;

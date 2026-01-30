/**
 * @file Contacts.tsx
 * @description Glavna CRM stran za upravljanje strank in kontaktov
 * @version 4.0 - Fully modular
 */

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import {
  useDueReminders, useReminders, useCreateReminder, usePostponeReminder,
  useContractPendingCompanies, useMarkContractCalled, useMarkContractReceived, usePostponeContractFollowup,
  useOfferPendingCompanies, useCreateOfferFollowup, useOfferResponseContract, useOfferResponseNeedsTime,
  useOfferResponseNoInterest, useOfferNoResponse, useMarkOfferCalled, useOfferCallNotReachable,
  PIPELINE_STATUSES
} from '@/hooks/useReminders';
import { useCompanyContacts, useCompanyDetails } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Components
import {
  TodaySection,
  SelectionModeBar,
  UrgentReminders,
  StickySearchBar,
  AlphabetSidebar,
  BottomNavigation,
  ContactsHeader,
  CompanyList,
  ContactsModals,
} from '@/pages/contacts/components';

// Hooks
import {
  useContactsFilters,
  useOfferState,
  useCompanyNotes,
  useQRScanner,
  useCompanyActions,
  useOfferEmail,
  useContactSelection,
  useSentOffers,
  useCompanyDetailHandlers,
  useContactsModals,
  useRouteHelpers,
  useCompanyHierarchy,
} from '@/pages/contacts/hooks';

import { getCompanyAddress } from '@/pages/contacts/utils';

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: companies, isLoading } = useCompanyContacts(user?.id);

  // Modal state management
  const modals = useContactsModals();

  // Reminders
  const { data: dueReminders } = useDueReminders(user?.id);
  const { data: allReminders } = useReminders(user?.id);
  const createReminder = useCreateReminder();
  const postponeReminder = usePostponeReminder();
  const companiesWithReminders = useMemo(() => new Set(allReminders?.map(r => r.company_id).filter(Boolean) || []), [allReminders]);
  const { data: contractPendingCompanies } = useContractPendingCompanies(user?.id, 3);

  // Contract workflow hooks
  const markContractCalled = useMarkContractCalled();
  const markContractReceived = useMarkContractReceived();
  const postponeContractFollowup = usePostponeContractFollowup();

  // Offer workflow hooks
  const { data: offerPendingCompanies } = useOfferPendingCompanies(user?.id, 2);
  const createOfferFollowup = useCreateOfferFollowup();
  const offerResponseContract = useOfferResponseContract();
  const offerResponseNeedsTime = useOfferResponseNeedsTime();
  const offerResponseNoInterest = useOfferResponseNoInterest();
  const offerNoResponse = useOfferNoResponse();
  const markOfferCalled = useMarkOfferCalled();
  const offerCallNotReachable = useOfferCallNotReachable();

  // "Ni interesa" companies
  const { data: noInterestCompanyIds } = useQuery({
    queryKey: ['no-interest-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from('company_notes')
        .select('company_id')
        .eq('created_by', user.id)
        .ilike('content', '%Ni interesa%');
      if (error) throw error;
      return new Set((data || []).map(n => n.company_id));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Filters
  const filters = useContactsFilters({ companies, noInterestCompanyIds });

  // Company hierarchy
  const companyHierarchy = useCompanyHierarchy(companies);

  // Route helpers
  const { openRoutePlannerModal, openRouteWithCompanies } = useRouteHelpers({
    filteredCompanies: filters.filteredCompanies,
    setShowRoutePlannerModal: modals.setShowRoutePlannerModal,
  });

  // Offer state
  const offerState = useOfferState();

  // Notes
  const notesHook = useCompanyNotes({ selectedCompanyId: modals.selectedCompanyId, userId: user?.id });

  // QR Scanner
  const qrScanner = useQRScanner({
    companies,
    onContactParsed: (data) => {
      modals.setFormData((prev: Record<string, unknown>) => ({ ...prev, ...data }));
      modals.setShowAddModal(true);
    },
    onExistingCompanyFound: (company, contactData) => modals.openExistingCompanyModal(company, contactData),
  });

  // Company details
  const { data: companyDetails, isLoading: isLoadingDetails } = useCompanyDetails(modals.selectedCompanyId || undefined, user?.id);

  // Company actions
  const actions = useCompanyActions({
    userId: user?.id,
    companies,
    selectedCompany: modals.selectedCompany,
    formData: modals.formData,
    setFormData: modals.setFormData,
    editAddressData: modals.editAddressData,
    setEditAddressData: modals.setEditAddressData,
    setShowEditAddressModal: modals.setShowEditAddressModal,
    existingCompany: modals.existingCompanyState.company,
    pendingContactData: modals.existingCompanyState.pendingContactData,
    setShowExistingCompanyModal: modals.setShowExistingCompanyModal,
    setExistingCompany: (c) => modals.setExistingCompanyState(prev => ({ ...prev, company: c })),
    setPendingContactData: (d) => modals.setExistingCompanyState(prev => ({ ...prev, pendingContactData: d })),
    setShowAddModal: modals.setShowAddModal,
    setShowAddContactModal: modals.setShowAddContactModal,
    setSelectedCompany: modals.setSelectedCompany,
    setTaxLookupLoading: modals.setTaxLookupLoading,
    reminderCompanyId: modals.reminderState.companyId,
    reminderDate: modals.reminderState.date,
    reminderTime: modals.reminderState.time,
    reminderNote: modals.reminderState.note,
    setShowReminderModal: modals.setShowReminderModal,
    setReminderCompanyId: (id) => modals.setReminderState(prev => ({ ...prev, companyId: id })),
    setReminderDate: (date) => modals.setReminderState(prev => ({ ...prev, date })),
    setReminderTime: (time) => modals.setReminderState(prev => ({ ...prev, time })),
    setReminderNote: (note) => modals.setReminderState(prev => ({ ...prev, note })),
    addNoteMutation: notesHook.addNoteMutation,
  });

  // Selection
  const selection = useContactSelection({ companies, deleteContact: actions.deleteContact });

  // Sent offers
  const sentOffers = useSentOffers({
    selectedCompanyId: modals.selectedCompanyId,
    selectedCompany: modals.selectedCompany,
    userId: user?.id,
    offerType: offerState.offerType,
    offerFrequency: offerState.offerFrequency,
    offerItemsNakup: offerState.offerItemsNakup,
    offerItemsNajem: offerState.offerItemsNajem,
  });

  // Detail handlers
  const detailHandlers = useCompanyDetailHandlers({
    selectedCompany: modals.selectedCompany,
    companies,
    companyNotes: notesHook.companyNotes,
    setSelectedCompany: modals.setSelectedCompany,
    setSelectedCompanyId: modals.setSelectedCompanyId,
    setEditAddressData: modals.setEditAddressData,
    setShowEditAddressModal: modals.setShowEditAddressModal,
    setShowAddContactModal: modals.setShowAddContactModal,
    setMeetingType: (type) => modals.setMeetingState(prev => ({ ...prev, type })),
    setMeetingDate: (date) => modals.setMeetingState(prev => ({ ...prev, date })),
    setMeetingTime: (time) => modals.setMeetingState(prev => ({ ...prev, time })),
    setShowMeetingModal: modals.setShowMeetingModal,
    setEditingContact: modals.setEditingContact,
    setEditContactData: modals.setEditContactData,
    setSelectedOffer: modals.setSelectedOffer,
    setShowContractConfirm: modals.setShowContractConfirm,
    addNoteMutation: notesHook.addNoteMutation,
    editNoteMutation: notesHook.editNoteMutation,
    deleteNoteMutation: notesHook.deleteNoteMutation,
    deleteCompany: actions.deleteCompany,
    newNoteContent: modals.newNoteContent,
    newNoteDate: modals.newNoteDate,
    meetingType: modals.meetingState.type,
    meetingDate: modals.meetingState.date,
    meetingTime: modals.meetingState.time,
    // D365 fields
    d365Category: modals.d365Category,
    d365Subcategory: modals.d365Subcategory,
    d365AppointmentType: modals.d365AppointmentType,
    d365StartTime: modals.d365StartTime,
    d365EndTime: modals.d365EndTime,
    resetD365Fields: modals.resetD365Fields,
  });

  // Email
  const emailHook = useOfferEmail({
    offerType: offerState.offerType,
    offerFrequency: offerState.offerFrequency,
    offerItemsNakup: offerState.offerItemsNakup,
    offerItemsNajem: offerState.offerItemsNajem,
    calculateOfferTotals: offerState.calculateOfferTotals,
    selectedCompany: modals.selectedCompany,
    saveOfferToDatabase: sentOffers.saveOfferToDatabase,
  });

  // URL parameter handling
  useEffect(() => {
    const companyId = searchParams.get('company');
    if (companyId && companies) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        modals.selectCompany(company);
        searchParams.delete('company');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, companies, modals, setSearchParams]);

  // Sync selectedCompany with companies data when it changes (e.g., after contact update)
  useEffect(() => {
    if (modals.selectedCompanyId && companies) {
      const updatedCompany = companies.find(c => c.id === modals.selectedCompanyId);
      if (updatedCompany) {
        modals.setSelectedCompany(updatedCompany);
      }
    }
  }, [companies, modals.selectedCompanyId, modals.setSelectedCompany]);

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <ContactsHeader
        companyCount={filters.filteredCompanies.length}
        onExportAll={selection.exportAllContacts}
        onStartSelection={() => {
          selection.setSelectionMode(true);
          selection.setSelectedContacts(new Set());
        }}
        onStartDeletion={() => {
          selection.setSelectionMode(true);
          selection.setSelectedContacts(new Set());
        }}
      />

      <div className="p-4 space-y-4">
        <StickySearchBar
          searchQuery={filters.searchQuery}
          onSearchChange={filters.setSearchQuery}
          sortBy={filters.sortBy}
          onSortChange={filters.setSortBy}
          periodFilter={filters.periodFilter}
          onPeriodChange={filters.setPeriodFilter}
          statusFilter={filters.statusFilter}
          onStatusChange={filters.setStatusFilter}
          pipelineStatuses={PIPELINE_STATUSES}
          filter={filters.filter}
          onFilterChange={filters.setFilter}
          hideNoInterest={filters.hideNoInterest}
          onHideNoInterestChange={filters.setHideNoInterest}
          noInterestCount={noInterestCompanyIds?.size || 0}
          routeCompaniesCount={filters.filteredCompanies.filter(c => getCompanyAddress(c)).length}
          onOpenRoute={openRoutePlannerModal}
          onAddCompany={() => modals.setShowAddModal(true)}
        />

        <UrgentReminders
          dueReminders={dueReminders}
          contractPendingCompanies={contractPendingCompanies}
          offerPendingCompanies={offerPendingCompanies}
          onOpenCompany={(companyId) => {
            modals.setSelectedCompanyId(companyId);
            const company = companies?.find(c => c.id === companyId);
            if (company) modals.setSelectedCompany(company);
          }}
          onCompleteReminder={actions.handleCompleteReminder}
          onAddReminder={modals.openReminderModal}
          onPostponeReminder={async (reminderId, newDate) => {
            try {
              await postponeReminder.mutateAsync({ reminderId, newDate });
              toast({ description: `Opomnik prestavljen na ${newDate.toLocaleDateString('sl-SI')}` });
            } catch {
              toast({ description: 'Napaka pri prestavitvi opomnika', variant: 'destructive' });
            }
          }}
          // Contract workflow handlers
          onMarkContractCalled={async (companyId) => {
            try {
              await markContractCalled.mutateAsync({ companyId, userId: user?.id || '' });
              toast({ description: 'Klic zabeležen - opomnik za jutri ustvarjen' });
            } catch {
              toast({ description: 'Napaka pri beleženju klica', variant: 'destructive' });
            }
          }}
          onMarkContractReceived={async (companyId, reminderId) => {
            try {
              await markContractReceived.mutateAsync({ companyId, reminderId });
              toast({ description: 'Pogodba označena kot prejeta!' });
            } catch {
              toast({ description: 'Napaka pri označevanju pogodbe', variant: 'destructive' });
            }
          }}
          onPostponeContractFollowup={async (reminderId) => {
            try {
              await postponeContractFollowup.mutateAsync(reminderId);
              toast({ description: 'Opomnik prestavljen na jutri ob 9:00' });
            } catch {
              toast({ description: 'Napaka pri prestavitvi opomnika', variant: 'destructive' });
            }
          }}
          // Offer workflow handlers
          onCreateOfferFollowup={async (companyId) => {
            try {
              await createOfferFollowup.mutateAsync({ companyId, userId: user?.id || '' });
              toast({ description: 'Opomnik za ponudbo ustvarjen' });
            } catch {
              toast({ description: 'Napaka pri ustvarjanju opomnika', variant: 'destructive' });
            }
          }}
          onOfferResponseContract={async (companyId, reminderId) => {
            try {
              await offerResponseContract.mutateAsync({ companyId, reminderId });
              toast({ description: 'Stranka želi pogodbo - status posodobljen!' });
            } catch {
              toast({ description: 'Napaka pri posodabljanju statusa', variant: 'destructive' });
            }
          }}
          onOfferResponseNeedsTime={async (companyId, reminderId) => {
            try {
              await offerResponseNeedsTime.mutateAsync({ companyId, userId: user?.id || '', reminderId });
              toast({ description: 'Opomnik ustvarjen za čez 5 dni' });
            } catch {
              toast({ description: 'Napaka pri ustvarjanju opomnika', variant: 'destructive' });
            }
          }}
          onOfferResponseNoInterest={async (companyId, reminderId) => {
            try {
              await offerResponseNoInterest.mutateAsync({ companyId, userId: user?.id || '', reminderId });
              toast({ description: 'Stranka nima interesa - zabeleženo' });
            } catch {
              toast({ description: 'Napaka pri beleženju', variant: 'destructive' });
            }
          }}
          onOfferNoResponse={async (companyId, reminderId, reminderType) => {
            try {
              await offerNoResponse.mutateAsync({ companyId, userId: user?.id || '', reminderId, reminderType });
              if (reminderType === 'offer_followup_1') {
                toast({ description: 'Ni odgovora - opomnik za čez 2 dni' });
              } else {
                toast({ description: 'Ni odgovora - opomnik za klic ustvarjen' });
              }
            } catch {
              toast({ description: 'Napaka pri ustvarjanju opomnika', variant: 'destructive' });
            }
          }}
          onMarkOfferCalled={async (companyId, reminderId) => {
            try {
              await markOfferCalled.mutateAsync({ companyId, userId: user?.id || '', reminderId });
              toast({ description: 'Klic zabeležen - opomnik za jutri' });
            } catch {
              toast({ description: 'Napaka pri beleženju klica', variant: 'destructive' });
            }
          }}
          onOfferCallNotReachable={async (companyId, reminderId) => {
            try {
              await offerCallNotReachable.mutateAsync({ companyId, userId: user?.id || '', reminderId });
              toast({ description: 'Ni dosegljiv - opomnik za jutri' });
            } catch {
              toast({ description: 'Napaka pri ustvarjanju opomnika', variant: 'destructive' });
            }
          }}
          onSendFollowupEmail={async (companyId, reminderId, templateType, reminderType) => {
            try {
              // Get company and contact info
              const company = companies?.find(c => c.id === companyId);
              if (!company) {
                toast({ description: 'Podjetje ni najdeno', variant: 'destructive' });
                return;
              }

              const contact = company.contacts?.[0];
              const contactName = contact
                ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Spoštovani'
                : 'Spoštovani';
              const email = contact?.email || '';

              // Get offer date
              const offerDate = company.offer_sent_at
                ? new Date(company.offer_sent_at).toLocaleDateString('sl-SI', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : 'prejšnji teden';

              const offerDayOfWeek = company.offer_sent_at
                ? new Date(company.offer_sent_at).toLocaleDateString('sl-SI', { weekday: 'long' })
                : 'prejšnji teden';

              // Generate email content based on template
              let emailContent: string;
              let subject: string;

              if (templateType === 'short') {
                subject = `Opomnik - ponudba za predpražnike`;
                emailContent = `Pozdravljeni${contactName !== 'Spoštovani' ? `, ${contactName}` : ''},

pošiljam le kratek opomnik glede ponudbe, ki sem vam jo poslal/a dne ${offerDate}.

Ali imate morda kakšna vprašanja za odločitev, ali bi vam bolj prav prišel kratek 5-minutni klic, da greva skupaj čez ključne točke?

Hvala in lep pozdrav,
[Vaše ime]`;
              } else {
                subject = `Ponudba za predpražnike - preverjanje`;
                emailContent = `Pozdravljeni${contactName !== 'Spoštovani' ? `, ${contactName}` : ''},

pišem vam, da preverim, ali ste uspeli pregledati ponudbo, ki sem vam jo poslal/a v ${offerDayOfWeek}.

Verjamem, da imate te dni polne roke dela. Ker ne bi želel/a, da zadeva potone v vašem nabiralniku, vas samo prijazno spomnim nanjo.

Imate morda kakšno vprašanje glede ponudbe ali rokov?

Z veseljem sem na voljo za kratek klic, da razjasniva morebitne dileme.

Lep pozdrav,
[Vaše ime]`;
              }

              // Copy to clipboard
              await navigator.clipboard.writeText(emailContent);

              // Open mailto
              if (email) {
                window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
              }

              toast({ description: '📧 Email kopiran - prilepi v Outlook (Ctrl+V)' });

              // Continue with the workflow (wait for response)
              await offerNoResponse.mutateAsync({ companyId, userId: user?.id || '', reminderId, reminderType });

            } catch {
              toast({ description: 'Napaka pri pošiljanju emaila', variant: 'destructive' });
            }
          }}
        />

        {!filters.searchQuery && (
          <TodaySection
            todayTasks={notesHook.todayTasks}
            onCompanyClick={(companyId) => {
              const company = companies?.find(c => c.id === companyId);
              if (company) {
                modals.selectCompany(company);
                filters.addToRecent(company.id);
              }
            }}
            onMarkDone={(noteId, content) => notesHook.markDeadlineDone.mutate({ noteId, content })}
            onPostpone={(noteId, content, newDate) => notesHook.updateNoteDeadline.mutate({ noteId, content, newDate })}
          />
        )}

        {selection.selectionMode && (
          <SelectionModeBar
            selectedCount={selection.selectedContacts.size}
            totalCount={selection.getAllContactsCount()}
            onSelectAll={selection.selectAllContacts}
            onDeselectAll={selection.deselectAllContacts}
            onExport={selection.exportSelectedContacts}
            onDelete={selection.deleteSelectedContacts}
            onCancel={() => {
              selection.setSelectionMode(false);
              selection.setSelectedContacts(new Set());
            }}
          />
        )}

        <CompanyList
          companies={filters.filteredCompanies}
          isLoading={isLoading}
          searchQuery={filters.searchQuery}
          recentCompanyIds={filters.recentCompanyIds}
          selectionMode={selection.selectionMode}
          selectedContacts={selection.selectedContacts}
          companiesWithReminders={companiesWithReminders}
          companyHierarchy={companyHierarchy}
          getCompanyFirstLetter={filters.getCompanyFirstLetter}
          firstCompanyForLetter={filters.firstCompanyForLetter}
          onCompanyClick={(company) => {
            modals.selectCompany(company);
            filters.addToRecent(company.id);
          }}
          onContactToggle={selection.toggleContactSelection}
          onAddReminder={modals.openReminderModal}
        />
      </div>

      {!isLoading && filters.filteredCompanies.length > 10 && filters.sortBy === 'name' && (
        <AlphabetSidebar availableLetters={filters.availableLetters} onLetterSelect={filters.scrollToLetter} />
      )}

      <ContactsModals
        modals={modals}
        companies={companies}
        companyDetails={companyDetails}
        isLoadingDetails={isLoadingDetails}
        companyHierarchy={companyHierarchy}
        filteredCompanies={filters.filteredCompanies}
        createReminderPending={createReminder.isPending}
        notesHook={notesHook}
        offerState={offerState}
        actions={actions}
        detailHandlers={detailHandlers}
        sentOffers={sentOffers}
        emailHook={emailHook}
        qrScanner={qrScanner}
        openRouteWithCompanies={openRouteWithCompanies}
      />

      <BottomNavigation activeTab="contacts" />
    </div>
  );
}

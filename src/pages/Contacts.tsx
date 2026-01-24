/**
 * @file Contacts.tsx
 * @description Glavna CRM stran za upravljanje strank in kontaktov
 * @author Mat Tracker Pro Team
 * @version 3.0 - Refactored
 * @since 2025-01
 */

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useDueReminders, useReminders, useCreateReminder, usePostponeReminder, useContractPendingCompanies, PIPELINE_STATUSES } from '@/hooks/useReminders';
import { useCompanyContacts, useCompanyDetails } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Ekstrahirane komponente
import {
  TodaySection,
  SelectionModeBar,
  UrgentReminders,
  StickySearchBar,
  CompanyCard,
  ReminderModal,
  ExistingCompanyModal,
  AddCompanyModal,
  AddContactModal,
  MeetingModal,
  EditAddressModal,
  EditContactModal,
  CompanyDetailModal,
  QRScannerModal,
  ContractConfirmDialog,
  AlphabetSidebar,
  OfferModalWrapper,
  RoutePlannerModal,
  ContractModalContainer,
  BottomNavigation,
  ContactsHeader,
} from '@/pages/contacts/components';

// Tipi in hooks iz contacts modula
import { useContactsFilters, useOfferState, useCompanyNotes, useQRScanner, useCompanyActions, useOfferEmail, useContactSelection, useSentOffers, useCompanyDetailHandlers, useContactsModals } from '@/pages/contacts/hooks';
import { getGoogleMapsUrl, getCompanyAddress } from '@/pages/contacts/utils';

/** Contacts - Glavna CRM stran za prodajalce */
export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: companies, isLoading } = useCompanyContacts(user?.id);

  // Modali in state management
  const modals = useContactsModals();

  // Opomniki - nujne naloge za prodajalca
  const { data: dueReminders } = useDueReminders(user?.id);
  const { data: allReminders } = useReminders(user?.id);
  const createReminder = useCreateReminder();
  const postponeReminder = usePostponeReminder();

  // Companies with active reminders
  const companiesWithReminders = useMemo(() => {
    return new Set(allReminders?.map(r => r.company_id).filter(Boolean) || []);
  }, [allReminders]);

  const { data: contractPendingCompanies } = useContractPendingCompanies(user?.id, 3);

  // Podjetja z opombo "Ni interesa"
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

  // Filtri
  const filters = useContactsFilters({ companies, noInterestCompanyIds });

  // Offer state
  const offerState = useOfferState();

  // Notes hook
  const notesHook = useCompanyNotes({
    selectedCompanyId: modals.selectedCompanyId,
    userId: user?.id,
  });

  // QR Scanner hook
  const qrScanner = useQRScanner({
    companies,
    onContactParsed: (data) => {
      modals.setFormData((prev: any) => ({ ...prev, ...data }));
      modals.setShowAddModal(true);
    },
    onExistingCompanyFound: (company, contactData) => {
      modals.openExistingCompanyModal(company, contactData);
    },
  });

  // Company details
  const { data: companyDetails, isLoading: isLoadingDetails } = useCompanyDetails(
    modals.selectedCompanyId || undefined,
    user?.id
  );

  // Company actions hook
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

  // Contact selection hook
  const selection = useContactSelection({ companies, deleteContact: actions.deleteContact });

  // Sent offers hook
  const sentOffers = useSentOffers({
    selectedCompanyId: modals.selectedCompanyId,
    selectedCompany: modals.selectedCompany,
    userId: user?.id,
    offerType: offerState.offerType,
    offerFrequency: offerState.offerFrequency,
    offerItemsNakup: offerState.offerItemsNakup,
    offerItemsNajem: offerState.offerItemsNajem,
  });

  // Company detail handlers
  const detailHandlers = useCompanyDetailHandlers({
    selectedCompany: modals.selectedCompany,
    companies,
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
  });

  // Email generation hook
  const emailHook = useOfferEmail({
    offerType: offerState.offerType,
    offerFrequency: offerState.offerFrequency,
    offerItemsNakup: offerState.offerItemsNakup,
    offerItemsNajem: offerState.offerItemsNajem,
    calculateOfferTotals: offerState.calculateOfferTotals,
    selectedCompany: modals.selectedCompany,
    saveOfferToDatabase: sentOffers.saveOfferToDatabase,
  });

  // Handle company query parameter from URL
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
  }, [searchParams, companies]);

  // Company hierarchy
  const companyHierarchy = useMemo(() => {
    if (!companies) return new Map<string, { parentCompany?: { id: string; name: string; display_name?: string }; childrenCount: number }>();

    const childrenCountMap = new Map<string, number>();
    companies.forEach(company => {
      if (company.parent_company_id) {
        const count = childrenCountMap.get(company.parent_company_id) || 0;
        childrenCountMap.set(company.parent_company_id, count + 1);
      }
    });

    const hierarchyMap = new Map<string, { parentCompany?: { id: string; name: string; display_name?: string }; childrenCount: number }>();
    companies.forEach(company => {
      const parentCompany = company.parent_company_id
        ? companies.find(c => c.id === company.parent_company_id)
        : undefined;

      hierarchyMap.set(company.id, {
        parentCompany: parentCompany ? {
          id: parentCompany.id,
          name: parentCompany.name,
          display_name: parentCompany.display_name || undefined,
        } : undefined,
        childrenCount: childrenCountMap.get(company.id) || 0,
      });
    });

    return hierarchyMap;
  }, [companies]);

  // Route planner helpers
  const openRoutePlannerModal = () => {
    const companiesWithAddresses = filters.filteredCompanies.filter(c => getCompanyAddress(c));
    if (companiesWithAddresses.length === 0) {
      toast({ description: 'Ni strank z naslovi', variant: 'destructive' });
      return;
    }
    modals.setShowRoutePlannerModal(true);
  };

  const openRouteWithCompanies = (selectedCompanies: typeof companies) => {
    if (!selectedCompanies || selectedCompanies.length === 0) {
      toast({ description: 'Ni izbranih strank', variant: 'destructive' });
      return;
    }

    if (selectedCompanies.length === 1) {
      window.open(getGoogleMapsUrl(selectedCompanies[0])!, '_blank');
      return;
    }

    const origin = encodeURIComponent(getCompanyAddress(selectedCompanies[0])!);
    const destination = encodeURIComponent(getCompanyAddress(selectedCompanies[selectedCompanies.length - 1])!);
    const waypoints = selectedCompanies
      .slice(1, -1)
      .map(c => encodeURIComponent(getCompanyAddress(c)!))
      .join('|');

    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    window.open(url, '_blank');
    toast({ description: `Odpiranje poti za ${selectedCompanies.length} strank` });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
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
        {/* Search Bar with Filters */}
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

        {/* Urgent Reminders */}
        <UrgentReminders
          dueReminders={dueReminders}
          contractPendingCompanies={contractPendingCompanies}
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
        />

        {/* Today Section */}
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

        {/* Selection Mode Bar */}
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

        {/* Company List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Nalagam...</div>
        ) : filters.filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filters.searchQuery ? 'Ni rezultatov iskanja' : 'Ni strank'}
          </div>
        ) : (
          <div className="space-y-3 pr-6">
            {filters.filteredCompanies.map(company => {
              const letter = filters.getCompanyFirstLetter(company);
              const isFirstForLetter = filters.firstCompanyForLetter.get(letter) === company.id;
              return (
                <div key={company.id} data-first-letter={isFirstForLetter ? letter : undefined}>
                  <CompanyCard
                    company={company}
                    isRecent={filters.recentCompanyIds.includes(company.id)}
                    showRecentBadge={!filters.searchQuery}
                    selectionMode={selection.selectionMode}
                    selectedContacts={selection.selectedContacts}
                    hasReminder={companiesWithReminders.has(company.id)}
                    hierarchyInfo={companyHierarchy.get(company.id)}
                    onCompanyClick={() => {
                      modals.selectCompany(company);
                      filters.addToRecent(company.id);
                    }}
                    onContactToggle={selection.toggleContactSelection}
                    onAddReminder={() => modals.openReminderModal(company.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alphabet Sidebar */}
      {!isLoading && filters.filteredCompanies.length > 10 && filters.sortBy === 'name' && (
        <AlphabetSidebar availableLetters={filters.availableLetters} onLetterSelect={filters.scrollToLetter} />
      )}

      {/* Modals */}
      {modals.showReminderModal && (
        <ReminderModal
          date={modals.reminderState.date}
          time={modals.reminderState.time}
          note={modals.reminderState.note}
          companyName={companies?.find(c => c.id === modals.reminderState.companyId)?.display_name || companies?.find(c => c.id === modals.reminderState.companyId)?.name}
          isLoading={createReminder.isPending}
          onDateChange={(date) => modals.setReminderState(prev => ({ ...prev, date }))}
          onTimeChange={(time) => modals.setReminderState(prev => ({ ...prev, time }))}
          onNoteChange={(note) => modals.setReminderState(prev => ({ ...prev, note }))}
          onSave={actions.handleCreateReminder}
          onClose={modals.closeReminderModal}
        />
      )}

      {modals.showRoutePlannerModal && (
        <RoutePlannerModal
          companies={filters.filteredCompanies}
          onClose={() => modals.setShowRoutePlannerModal(false)}
          onOpenRoute={openRouteWithCompanies}
        />
      )}

      {modals.showExistingCompanyModal && modals.existingCompanyState.company && modals.existingCompanyState.pendingContactData && (
        <ExistingCompanyModal
          company={modals.existingCompanyState.company}
          pendingContact={modals.existingCompanyState.pendingContactData}
          isLoading={actions.addContact.isPending}
          onAddToExisting={actions.handleAddToExistingCompany}
          onCreateNewAnyway={actions.handleCreateNewAnyway}
          onClose={modals.closeExistingCompanyModal}
        />
      )}

      {qrScanner.showQRScanner && (
        <QRScannerModal
          zoomSupported={qrScanner.zoomSupported}
          maxZoom={qrScanner.maxZoom}
          zoomLevel={qrScanner.zoomLevel}
          scannerError={qrScanner.scannerError}
          onZoomChange={qrScanner.applyZoom}
          onClose={qrScanner.closeScanner}
        />
      )}

      {modals.showAddModal && (
        <AddCompanyModal
          formData={modals.formData}
          onFormDataChange={modals.setFormData}
          taxLookupLoading={modals.taxLookupLoading}
          onTaxLookup={actions.handleTaxLookup}
          isLoading={actions.createCompany.isPending}
          onSubmit={actions.handleAddCompany}
          onOpenQRScanner={qrScanner.openScanner}
          onClose={() => modals.setShowAddModal(false)}
          availableParentCompanies={companies?.map(c => ({ id: c.id, name: c.name, display_name: c.display_name || undefined })) || []}
        />
      )}

      {modals.selectedCompany && (
        <CompanyDetailModal
          company={modals.selectedCompany}
          companyNotes={notesHook.companyNotes}
          isLoadingNotes={notesHook.isLoadingNotes}
          companyDetails={companyDetails}
          isLoadingDetails={isLoadingDetails}
          sentOffers={sentOffers.sentOffers}
          loadingSentOffers={sentOffers.loadingSentOffers}
          savedContracts={modals.savedContracts}
          newNoteDate={modals.newNoteDate}
          newNoteContent={modals.newNoteContent}
          isAddingNote={notesHook.addNoteMutation.isPending}
          googleMapsUrl={getGoogleMapsUrl(modals.selectedCompany)}
          parentCompany={companyHierarchy.get(modals.selectedCompany.id)?.parentCompany}
          childCompanies={companies?.filter(c => c.parent_company_id === modals.selectedCompany?.id).map(c => ({ id: c.id, name: c.name, display_name: c.display_name || undefined }))}
          onNewNoteDateChange={modals.setNewNoteDate}
          onNewNoteContentChange={modals.setNewNoteContent}
          onClose={detailHandlers.handleClose}
          onEditAddress={detailHandlers.handleEditAddress}
          onQuickNote={detailHandlers.handleQuickNote}
          onAddNote={detailHandlers.handleAddNote}
          onEditNote={detailHandlers.handleEditNote}
          onDeleteNote={detailHandlers.handleDeleteNote}
          onShowAddContact={detailHandlers.handleShowAddContact}
          onShowMeeting={detailHandlers.handleShowMeeting}
          onEditContact={detailHandlers.handleEditContact}
          onDeleteContact={actions.handleDeleteContact}
          onOpenOffer={offerState.openOfferModal}
          onViewOffer={detailHandlers.handleViewOffer}
          onDeleteSentOffer={sentOffers.deleteSentOffer}
          onNavigateToSeller={detailHandlers.handleNavigateToSeller}
          onDeleteCompany={detailHandlers.handleDeleteCompany}
          onContractSent={actions.handleContractSent}
          onSelectCompany={detailHandlers.handleSelectCompany}
        />
      )}

      {modals.showAddContactModal && modals.selectedCompany && (
        <AddContactModal
          formData={modals.formData}
          onFormDataChange={modals.setFormData}
          isLoading={actions.addContact.isPending}
          onSubmit={actions.handleAddContact}
          onClose={() => modals.setShowAddContactModal(false)}
        />
      )}

      {modals.showMeetingModal && modals.selectedCompany && (
        <MeetingModal
          type={modals.meetingState.type}
          date={modals.meetingState.date}
          time={modals.meetingState.time}
          onDateChange={(date) => modals.setMeetingState(prev => ({ ...prev, date }))}
          onTimeChange={(time) => modals.setMeetingState(prev => ({ ...prev, time }))}
          onSaveWithICS={detailHandlers.handleMeetingSaveWithICS}
          onSaveOnly={detailHandlers.handleMeetingSaveOnly}
          onClose={detailHandlers.handleMeetingClose}
        />
      )}

      {modals.showEditAddressModal && modals.selectedCompany && (
        <EditAddressModal
          formData={modals.editAddressData}
          onFormDataChange={modals.setEditAddressData}
          taxLookupLoading={modals.taxLookupLoading}
          onTaxLookup={actions.handleEditAddressTaxLookup}
          availableParentCompanies={companies?.map(c => ({ id: c.id, name: c.name, display_name: c.display_name || undefined })) || []}
          currentCompanyId={modals.selectedCompany.id}
          onSave={actions.handleSaveAddress}
          onClose={() => modals.setShowEditAddressModal(false)}
        />
      )}

      {modals.editingContact && (
        <EditContactModal
          formData={modals.editContactData}
          onFormDataChange={modals.setEditContactData}
          isLoading={actions.updateContact.isPending}
          onSave={async () => {
            if (!modals.editContactData.first_name?.trim()) {
              toast({ description: 'Ime je obvezno', variant: 'destructive' });
              return;
            }
            try {
              await actions.updateContact.mutateAsync({
                contactId: modals.editingContact.id,
                data: {
                  first_name: modals.editContactData.first_name.trim(),
                  last_name: modals.editContactData.last_name?.trim() || '',
                  phone: modals.editContactData.phone?.trim() || null,
                  email: modals.editContactData.email?.trim() || null,
                  role: modals.editContactData.role?.trim() || null,
                  is_primary: modals.editContactData.is_primary || false,
                  location_address: modals.editContactData.location_address?.trim() || null,
                  contact_since: modals.editContactData.contact_since || null,
                },
              });
              toast({ description: 'Kontakt posodobljen' });
              modals.setEditingContact(null);
            } catch {
              toast({ description: 'Napaka pri posodabljanju', variant: 'destructive' });
            }
          }}
          onClose={() => modals.setEditingContact(null)}
        />
      )}

      {offerState.showOfferModal && modals.selectedCompany && (
        <OfferModalWrapper
          selectedCompany={modals.selectedCompany}
          onClose={() => offerState.setShowOfferModal(false)}
          offerType={offerState.offerType}
          setOfferType={offerState.setOfferType}
          offerFrequency={offerState.offerFrequency}
          offerStep={offerState.offerStep}
          setOfferStep={offerState.setOfferStep}
          hasNajem={offerState.hasNajem}
          hasNakup={offerState.hasNakup}
          offerItemsNakup={offerState.offerItemsNakup}
          offerItemsNajem={offerState.offerItemsNajem}
          updateNajemPricesForFrequency={offerState.updateNajemPricesForFrequency}
          addCustomOfferItem={offerState.addCustomOfferItem}
          removeOfferItem={offerState.removeOfferItem}
          updateOfferItem={offerState.updateOfferItem}
          handleItemTypeChange={offerState.handleItemTypeChange}
          handleDesignSizeSelect={offerState.handleDesignSizeSelect}
          handleCustomDimensionsChange={offerState.handleCustomDimensionsChange}
          handlePriceChange={offerState.handlePriceChange}
          handleDiscountChange={offerState.handleDiscountChange}
          handleSeasonalToggle={offerState.handleSeasonalToggle}
          handleSeasonalFrequencyChange={offerState.handleSeasonalFrequencyChange}
          handleSeasonalPriceChange={offerState.handleSeasonalPriceChange}
          handleSeasonalDiscountChange={offerState.handleSeasonalDiscountChange}
          handleNormalFrequencyChange={offerState.handleNormalFrequencyChange}
          handleNormalPriceChange={offerState.handleNormalPriceChange}
          handleNormalDiscountChange={offerState.handleNormalDiscountChange}
          calculateOfferTotals={offerState.calculateOfferTotals}
          generateEmailHTML={emailHook.generateEmailHTML}
          copyHTMLToClipboard={emailHook.copyHTMLToClipboard}
          saveOfferToDatabase={sentOffers.saveOfferToDatabase}
        />
      )}

      {modals.showContractConfirm && modals.selectedOffer && (
        <ContractConfirmDialog
          onConfirm={() => {
            modals.setShowContractConfirm(false);
            modals.setShowContractModal(true);
          }}
          onCancel={() => modals.setShowContractConfirm(false)}
        />
      )}

      {modals.selectedOffer && modals.selectedCompany && modals.showContractModal && (
        <ContractModalContainer
          isOpen={modals.showContractModal}
          onClose={() => modals.setShowContractModal(false)}
          selectedCompany={modals.selectedCompany}
          selectedOffer={modals.selectedOffer}
          companies={companies}
          onContractSaved={(contract) => {
            modals.setSavedContracts(prev => [...prev, contract]);
          }}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="contacts" />
    </div>
  );
}

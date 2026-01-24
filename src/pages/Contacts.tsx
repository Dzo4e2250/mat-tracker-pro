/**
 * @file Contacts.tsx
 * @description Glavna CRM stran za upravljanje strank in kontaktov
 * @author Mat Tracker Pro Team
 * @version 2.0
 * @since 2025-01
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Phone, MessageSquare, Mail, MapPin, Plus, ChevronRight, Home, Camera, Users, Building2, User, X, Trash2, Package, Calendar, CheckCircle, Clock, FileText, Euro, ChevronDown, MoreVertical, Download, Check, Square, CheckSquare, FileSignature, StickyNote, QrCode, Bell, AlertTriangle, Filter, Pencil } from 'lucide-react';
import { useDueReminders, useReminders, useCreateReminder, usePostponeReminder, useContractPendingCompanies, PIPELINE_STATUSES, type ReminderWithCompany } from '@/hooks/useReminders';
import { useCompanyContacts, useCompanyDetails, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getCityByPostalCode } from '@/utils/postalCodes';
// Lazy loaded komponente - naložijo se šele ko se uporabijo
const ContractModal = lazy(() => import('@/components/ContractModal'));
// Ekstrahirane komponente
import { TodaySection, SelectionModeBar, UrgentReminders, StickySearchBar, CompanyCard, ReminderModal, ExistingCompanyModal, AddCompanyModal, AddContactModal, MeetingModal, EditAddressModal, EditContactModal, CompanyDetailModal, QRScannerModal, ContractConfirmDialog, AlphabetSidebar, OfferModalWrapper, RoutePlannerModal } from '@/pages/contacts/components';

// Tipi in hooks iz contacts modula
import { type OfferItem, type FilterType, isTestOverdue, getDaysOverdue } from '@/pages/contacts/types';
import { useContactsFilters, useOfferState, useCompanyNotes, useQRScanner, useCompanyActions, useOfferEmail, useContactSelection, useSentOffers, useCompanyDetailHandlers } from '@/pages/contacts/hooks';
import { getPrimaryContact, formatAddress, getGoogleMapsUrl, getCompanyAddress } from '@/pages/contacts/utils';

/** Contacts - Glavna CRM stran za prodajalce */
export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: companies, isLoading } = useCompanyContacts(user?.id);

  // Opomniki - nujne naloge za prodajalca
  const { data: dueReminders } = useDueReminders(user?.id);
  const { data: allReminders } = useReminders(user?.id);
  const createReminder = useCreateReminder();
  const postponeReminder = usePostponeReminder();

  // Set company IDs that have active reminders
  const companiesWithReminders = useMemo(() => {
    return new Set(allReminders?.map(r => r.company_id).filter(Boolean) || []);
  }, [allReminders]);
  const { data: contractPendingCompanies } = useContractPendingCompanies(user?.id, 3);

  // Podjetja z opombo "Ni interesa" - za filtriranje
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
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // --------------------------------------------------------------------------
  // FILTRI - Uporaba useContactsFilters hook
  // --------------------------------------------------------------------------
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    periodFilter,
    setPeriodFilter,
    statusFilter,
    setStatusFilter,
    filter,
    setFilter,
    hideNoInterest,
    setHideNoInterest,
    recentCompanyIds,
    addToRecent,
    filteredCompanies,
    availableLetters,
    scrollToLetter,
    getCompanyFirstLetter,
    firstCompanyForLetter,
  } = useContactsFilters({ companies, noInterestCompanyIds });

  // Offer state iz hook-a
  const {
    showOfferModal,
    setShowOfferModal,
    offerType,
    setOfferType,
    offerFrequency,
    offerStep,
    setOfferStep,
    hasNajem,
    hasNakup,
    offerItemsNakup,
    offerItemsNajem,
    openOfferModal,
    updateNajemPricesForFrequency,
    addCustomOfferItem,
    removeOfferItem,
    updateOfferItem,
    handleItemTypeChange,
    handleDesignSizeSelect,
    handleCustomDimensionsChange,
    handlePriceChange,
    handleDiscountChange,
    handleSeasonalToggle,
    handleSeasonalFrequencyChange,
    handleSeasonalPriceChange,
    handleSeasonalDiscountChange,
    handleNormalFrequencyChange,
    handleNormalPriceChange,
    handleNormalDiscountChange,
    calculateOfferTotals,
  } = useOfferState();

  // --------------------------------------------------------------------------
  // STATE - Stanje komponent (modali, forme, itd.)
  // --------------------------------------------------------------------------

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // State za QR Scanner callbacks (mora biti pred useQRScanner)
  const [formData, setFormData] = useState<any>({});
  const [showExistingCompanyModal, setShowExistingCompanyModal] = useState(false);
  const [existingCompany, setExistingCompany] = useState<CompanyWithContacts | null>(null);
  const [pendingContactData, setPendingContactData] = useState<any>(null);

  // Notes hook (requires selectedCompanyId)
  const {
    companyNotes,
    isLoadingNotes,
    todayTasks,
    addNoteMutation,
    deleteNoteMutation,
    editNoteMutation,
    updateNoteDeadline,
    markDeadlineDone,
  } = useCompanyNotes({ selectedCompanyId, userId: user?.id });

  // QR Scanner hook
  const {
    showQRScanner,
    openScanner,
    closeScanner,
    scannerError,
    zoomLevel,
    maxZoom,
    zoomSupported,
    applyZoom,
  } = useQRScanner({
    companies,
    onContactParsed: (data) => {
      setFormData((prev: any) => ({ ...prev, ...data }));
      setShowAddModal(true); // Open add modal with scanned data
    },
    onExistingCompanyFound: (company, contactData) => {
      setExistingCompany(company);
      setPendingContactData(contactData);
      setShowExistingCompanyModal(true);
    },
  });

  // Opomnik modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderCompanyId, setReminderCompanyId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderNote, setReminderNote] = useState('');

  // Route planner modal
  const [showRoutePlannerModal, setShowRoutePlannerModal] = useState(false);

  // Handle company query parameter from URL (e.g., from Dashboard redirect)
  useEffect(() => {
    const companyId = searchParams.get('company');
    if (companyId && companies) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setSelectedCompanyId(companyId);
        setSelectedCompany(company);
        // Clear the URL parameter
        searchParams.delete('company');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, companies]);

  // Fetch company details with cycles history when a company is selected
  const { data: companyDetails, isLoading: isLoadingDetails } = useCompanyDetails(
    selectedCompanyId || undefined,
    user?.id
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContacts | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);

  // Contact selection hook (will be initialized after useCompanyActions)

  // Sent offers state (remaining UI state - data will be from hook)
  const [showContractConfirm, setShowContractConfirm] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [savedContracts, setSavedContracts] = useState<any[]>([]);

  // Company notes state
  const [newNoteDate, setNewNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const queryClient = useQueryClient();

  // Quick note with meeting/deadline
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState<string>('10:00');
  const [meetingType, setMeetingType] = useState<'sestanek' | 'ponudba' | 'izris'>('sestanek');

  // Edit contact state
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editContactData, setEditContactData] = useState<any>({});

  // Urejanje naslova podjetja
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editAddressData, setEditAddressData] = useState<any>({});

  // Company actions hook
  const {
    createCompany,
    addContact,
    updateCompany,
    updateContact,
    deleteContact,
    deleteCompany,
    updatePipelineStatus,
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
  } = useCompanyActions({
    userId: user?.id,
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
  });

  // Contact selection hook
  const {
    selectionMode,
    setSelectionMode,
    selectedContacts,
    setSelectedContacts,
    toggleContactSelection,
    selectAllContacts,
    deselectAllContacts,
    getAllContactsCount,
    exportSelectedContacts,
    exportAllContacts,
    deleteSelectedContacts,
  } = useContactSelection({ companies, deleteContact });

  // Sent offers hook
  const {
    sentOffers,
    loadingSentOffers,
    fetchSentOffers,
    saveOfferToDatabase,
    deleteSentOffer,
  } = useSentOffers({
    selectedCompanyId,
    selectedCompany,
    userId: user?.id,
    offerType,
    offerFrequency,
    offerItemsNakup,
    offerItemsNajem,
  });

  // Company detail handlers
  const {
    handleClose: handleDetailClose,
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
  } = useCompanyDetailHandlers({
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
  });

  // Open reminder modal for a company
  const openReminderModal = (companyId: string) => {
    setReminderCompanyId(companyId);
    // Set default date to today
    setReminderDate(new Date().toISOString().split('T')[0]);
    setShowReminderModal(true);
  };

  // Hierarhija podjetij - parent/children relacije
  const companyHierarchy = useMemo(() => {
    if (!companies) return new Map<string, { parentCompany?: { id: string; name: string; display_name?: string }; childrenCount: number }>();

    // Najprej preštej children za vsako podjetje
    const childrenCountMap = new Map<string, number>();
    companies.forEach(company => {
      if (company.parent_company_id) {
        const count = childrenCountMap.get(company.parent_company_id) || 0;
        childrenCountMap.set(company.parent_company_id, count + 1);
      }
    });

    // Ustvari mapo z vsemi podatki o hierarhiji
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

  // Open route planner modal
  const openRoutePlannerModal = () => {
    const companiesWithAddresses = filteredCompanies.filter(c => getCompanyAddress(c));
    if (companiesWithAddresses.length === 0) {
      toast({ description: 'Ni strank z naslovi', variant: 'destructive' });
      return;
    }
    setShowRoutePlannerModal(true);
  };

  // Open route in Google Maps with selected companies
  const openRouteWithCompanies = (selectedCompanies: CompanyWithContacts[]) => {
    if (selectedCompanies.length === 0) {
      toast({ description: 'Ni izbranih strank', variant: 'destructive' });
      return;
    }

    if (selectedCompanies.length === 1) {
      // Single destination
      window.open(getGoogleMapsUrl(selectedCompanies[0])!, '_blank');
      return;
    }

    // Multiple waypoints - Google Maps Directions URL format
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

  // Email generation hook
  const {
    generateEmailHTML,
    copyHTMLToClipboard,
    sendOfferEmail,
  } = useOfferEmail({
    offerType,
    offerFrequency,
    offerItemsNakup,
    offerItemsNajem,
    calculateOfferTotals,
    selectedCompany,
    saveOfferToDatabase,
  });

  // ==========================================================================
  // RENDER - JSX za prikaz uporabniškega vmesnika
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Stranke</h1>
            <div className="text-sm opacity-80">{filteredCompanies.length} strank</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:bg-blue-500 rounded-lg">
              <MoreVertical size={22} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={exportAllContacts}>
                <Download className="mr-2" size={16} />
                Izvozi vse kontakte (vCard)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectionMode(true);
                setSelectedContacts(new Set());
              }}>
                <CheckSquare className="mr-2" size={16} />
                Izberi kontakte za izvoz
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setSelectionMode(true);
                setSelectedContacts(new Set());
              }} className="text-red-600">
                <Trash2 className="mr-2" size={16} />
                Izberi kontakte za brisanje
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Sticky Search Bar z zložljivimi filtri */}
        <StickySearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pipelineStatuses={PIPELINE_STATUSES}
          filter={filter}
          onFilterChange={setFilter}
          hideNoInterest={hideNoInterest}
          onHideNoInterestChange={setHideNoInterest}
          noInterestCount={noInterestCompanyIds?.size || 0}
          routeCompaniesCount={filteredCompanies.filter(c => getCompanyAddress(c)).length}
          onOpenRoute={openRoutePlannerModal}
          onAddCompany={() => setShowAddModal(true)}
        />

        {/* Urgent Reminders - Red Cards */}
        <UrgentReminders
          dueReminders={dueReminders}
          contractPendingCompanies={contractPendingCompanies}
          onOpenCompany={(companyId) => {
            setSelectedCompanyId(companyId);
            const company = companies?.find(c => c.id === companyId);
            if (company) setSelectedCompany(company);
          }}
          onCompleteReminder={handleCompleteReminder}
          onAddReminder={openReminderModal}
          onPostponeReminder={async (reminderId, newDate) => {
            try {
              await postponeReminder.mutateAsync({ reminderId, newDate });
              toast({ description: `Opomnik prestavljen na ${newDate.toLocaleDateString('sl-SI')}` });
            } catch (error) {
              toast({ description: 'Napaka pri prestavitvi opomnika', variant: 'destructive' });
            }
          }}
        />

        {/* TODAY Section - Meetings and Deadlines */}
        {!searchQuery && (
          <TodaySection
            todayTasks={todayTasks}
            onCompanyClick={(companyId) => {
              const company = companies?.find(c => c.id === companyId);
              if (company) {
                setSelectedCompany(company);
                setSelectedCompanyId(company.id);
                addToRecent(company.id);
              }
            }}
            onMarkDone={(noteId, content) => {
              markDeadlineDone.mutate({ noteId, content });
            }}
            onPostpone={(noteId, content, newDate) => {
              updateNoteDeadline.mutate({ noteId, content, newDate });
            }}
          />
        )}

        {/* Selection Mode Bar */}
        {selectionMode && (
          <SelectionModeBar
            selectedCount={selectedContacts.size}
            totalCount={getAllContactsCount()}
            onSelectAll={selectAllContacts}
            onDeselectAll={deselectAllContacts}
            onExport={exportSelectedContacts}
            onDelete={deleteSelectedContacts}
            onCancel={() => {
              setSelectionMode(false);
              setSelectedContacts(new Set());
            }}
          />
        )}

        {/* Company List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Nalagam...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'Ni rezultatov iskanja' : 'Ni strank'}
          </div>
        ) : (
          <div className="space-y-3 pr-6"> {/* pr-6 za prostor za abecedo */}
            {filteredCompanies.map(company => {
              const letter = getCompanyFirstLetter(company);
              const isFirstForLetter = firstCompanyForLetter.get(letter) === company.id;
              return (
                <div
                  key={company.id}
                  data-first-letter={isFirstForLetter ? letter : undefined}
                >
                  <CompanyCard
                    company={company}
                    isRecent={recentCompanyIds.includes(company.id)}
                    showRecentBadge={!searchQuery}
                    selectionMode={selectionMode}
                    selectedContacts={selectedContacts}
                    hasReminder={companiesWithReminders.has(company.id)}
                    hierarchyInfo={companyHierarchy.get(company.id)}
                    onCompanyClick={() => {
                      setSelectedCompany(company);
                      setSelectedCompanyId(company.id);
                      addToRecent(company.id);
                    }}
                    onContactToggle={toggleContactSelection}
                    onAddReminder={() => openReminderModal(company.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Abecedna navigacija */}
      {!isLoading && filteredCompanies.length > 10 && sortBy === 'name' && (
        <AlphabetSidebar
          availableLetters={availableLetters}
          onLetterSelect={scrollToLetter}
        />
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <ReminderModal
          date={reminderDate}
          time={reminderTime}
          note={reminderNote}
          companyName={companies?.find(c => c.id === reminderCompanyId)?.display_name || companies?.find(c => c.id === reminderCompanyId)?.name}
          isLoading={createReminder.isPending}
          onDateChange={setReminderDate}
          onTimeChange={setReminderTime}
          onNoteChange={setReminderNote}
          onSave={handleCreateReminder}
          onClose={() => {
            setShowReminderModal(false);
            setReminderCompanyId(null);
            setReminderDate('');
            setReminderTime('09:00');
            setReminderNote('');
          }}
        />
      )}

      {/* Route Planner Modal */}
      {showRoutePlannerModal && (
        <RoutePlannerModal
          companies={filteredCompanies}
          onClose={() => setShowRoutePlannerModal(false)}
          onOpenRoute={openRouteWithCompanies}
        />
      )}

      {/* Existing Company Modal */}
      {showExistingCompanyModal && existingCompany && pendingContactData && (
        <ExistingCompanyModal
          company={existingCompany}
          pendingContact={pendingContactData}
          isLoading={addContact.isPending}
          onAddToExisting={handleAddToExistingCompany}
          onCreateNewAnyway={handleCreateNewAnyway}
          onClose={() => {
            setShowExistingCompanyModal(false);
            setExistingCompany(null);
            setPendingContactData(null);
          }}
        />
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          zoomSupported={zoomSupported}
          maxZoom={maxZoom}
          zoomLevel={zoomLevel}
          scannerError={scannerError}
          onZoomChange={applyZoom}
          onClose={closeScanner}
        />
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <AddCompanyModal
          formData={formData}
          onFormDataChange={setFormData}
          taxLookupLoading={taxLookupLoading}
          onTaxLookup={handleTaxLookup}
          isLoading={createCompany.isPending}
          onSubmit={handleAddCompany}
          onOpenQRScanner={openScanner}
          onClose={() => setShowAddModal(false)}
          availableParentCompanies={companies?.map(c => ({ id: c.id, name: c.name, display_name: c.display_name || undefined })) || []}
        />
      )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          companyNotes={companyNotes}
          isLoadingNotes={isLoadingNotes}
          companyDetails={companyDetails}
          isLoadingDetails={isLoadingDetails}
          sentOffers={sentOffers}
          loadingSentOffers={loadingSentOffers}
          savedContracts={savedContracts}
          newNoteDate={newNoteDate}
          newNoteContent={newNoteContent}
          isAddingNote={addNoteMutation.isPending}
          googleMapsUrl={getGoogleMapsUrl(selectedCompany)}
          parentCompany={companyHierarchy.get(selectedCompany.id)?.parentCompany}
          childCompanies={companies?.filter(c => c.parent_company_id === selectedCompany.id).map(c => ({ id: c.id, name: c.name, display_name: c.display_name || undefined }))}
          onNewNoteDateChange={setNewNoteDate}
          onNewNoteContentChange={setNewNoteContent}
          onClose={handleDetailClose}
          onEditAddress={handleEditAddress}
          onQuickNote={handleQuickNote}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
          onShowAddContact={handleShowAddContact}
          onShowMeeting={handleShowMeeting}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
          onOpenOffer={openOfferModal}
          onViewOffer={handleViewOffer}
          onDeleteSentOffer={deleteSentOffer}
          onNavigateToSeller={handleNavigateToSeller}
          onDeleteCompany={handleDeleteCompany}
          onContractSent={handleContractSent}
          onSelectCompany={handleSelectCompany}
        />
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && selectedCompany && (
        <AddContactModal
          formData={formData}
          onFormDataChange={setFormData}
          isLoading={addContact.isPending}
          onSubmit={handleAddContact}
          onClose={() => setShowAddContactModal(false)}
        />
      )}

      {/* Meeting/Deadline Modal */}
      {showMeetingModal && selectedCompany && (
        <MeetingModal
          type={meetingType}
          date={meetingDate}
          time={meetingTime}
          onDateChange={setMeetingDate}
          onTimeChange={setMeetingTime}
          onSaveWithICS={handleMeetingSaveWithICS}
          onSaveOnly={handleMeetingSaveOnly}
          onClose={handleMeetingClose}
        />
      )}

      {/* Edit Address Modal */}
      {showEditAddressModal && selectedCompany && (
        <EditAddressModal
          formData={editAddressData}
          onFormDataChange={setEditAddressData}
          taxLookupLoading={taxLookupLoading}
          onTaxLookup={handleEditAddressTaxLookup}
          availableParentCompanies={companies?.map(c => ({ id: c.id, name: c.name, display_name: c.display_name || undefined })) || []}
          currentCompanyId={selectedCompany.id}
          onSave={handleSaveAddress}
          onClose={() => setShowEditAddressModal(false)}
        />
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <EditContactModal
          formData={editContactData}
          onFormDataChange={setEditContactData}
          isLoading={updateContact.isPending}
          onSave={async () => {
            if (!editContactData.first_name?.trim()) {
              toast({ description: 'Ime je obvezno', variant: 'destructive' });
              return;
            }
            try {
              await updateContact.mutateAsync({
                contactId: editingContact.id,
                data: {
                  first_name: editContactData.first_name.trim(),
                  last_name: editContactData.last_name?.trim() || '',
                  phone: editContactData.phone?.trim() || null,
                  email: editContactData.email?.trim() || null,
                  role: editContactData.role?.trim() || null,
                  is_primary: editContactData.is_primary || false,
                  location_address: editContactData.location_address?.trim() || null,
                  contact_since: editContactData.contact_since || null,
                },
              });
              toast({ description: 'Kontakt posodobljen' });
              setEditingContact(null);
            } catch (error) {
              toast({ description: 'Napaka pri posodabljanju', variant: 'destructive' });
            }
          }}
          onClose={() => setEditingContact(null)}
        />
      )}

      {/* Offer Modal */}
      {showOfferModal && selectedCompany && (
        <OfferModalWrapper
          selectedCompany={selectedCompany}
          onClose={() => setShowOfferModal(false)}
          offerType={offerType}
          setOfferType={setOfferType}
          offerFrequency={offerFrequency}
          offerStep={offerStep}
          setOfferStep={setOfferStep}
          hasNajem={hasNajem}
          hasNakup={hasNakup}
          offerItemsNakup={offerItemsNakup}
          offerItemsNajem={offerItemsNajem}
          updateNajemPricesForFrequency={updateNajemPricesForFrequency}
          addCustomOfferItem={addCustomOfferItem}
          removeOfferItem={removeOfferItem}
          updateOfferItem={updateOfferItem}
          handleItemTypeChange={handleItemTypeChange}
          handleDesignSizeSelect={handleDesignSizeSelect}
          handleCustomDimensionsChange={handleCustomDimensionsChange}
          handlePriceChange={handlePriceChange}
          handleDiscountChange={handleDiscountChange}
          handleSeasonalToggle={handleSeasonalToggle}
          handleSeasonalFrequencyChange={handleSeasonalFrequencyChange}
          handleSeasonalPriceChange={handleSeasonalPriceChange}
          handleSeasonalDiscountChange={handleSeasonalDiscountChange}
          handleNormalFrequencyChange={handleNormalFrequencyChange}
          handleNormalPriceChange={handleNormalPriceChange}
          handleNormalDiscountChange={handleNormalDiscountChange}
          calculateOfferTotals={calculateOfferTotals}
          generateEmailHTML={generateEmailHTML}
          copyHTMLToClipboard={copyHTMLToClipboard}
          saveOfferToDatabase={saveOfferToDatabase}
        />
      )}

      {/* Contract Confirmation Dialog */}
      {showContractConfirm && selectedOffer && (
        <ContractConfirmDialog
          onConfirm={() => {
            setShowContractConfirm(false);
            setShowContractModal(true);
          }}
          onCancel={() => setShowContractConfirm(false)}
        />
      )}

      {/* Contract Modal */}
      {selectedOffer && selectedCompany && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
        <ContractModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          company={{
            id: selectedCompany.id,
            name: selectedCompany.name,
            tax_number: selectedCompany.tax_number,
            address_street: selectedCompany.address_street,
            address_postal: selectedCompany.address_postal,
            address_city: selectedCompany.address_city,
            delivery_address: (selectedCompany as any).delivery_address,
            delivery_postal: (selectedCompany as any).delivery_postal,
            delivery_city: (selectedCompany as any).delivery_city,
            billing_address: (selectedCompany as any).billing_address,
            billing_postal: (selectedCompany as any).billing_postal,
            billing_city: (selectedCompany as any).billing_city,
            working_hours: (selectedCompany as any).working_hours,
            delivery_instructions: (selectedCompany as any).delivery_instructions,
            customer_number: (selectedCompany as any).customer_number,
            contacts: selectedCompany.contacts.map(c => ({
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone: c.phone,
              role: c.role,
              is_billing_contact: (c as any).is_billing_contact,
              is_service_contact: (c as any).is_service_contact,
            })),
          }}
          offer={{
            id: selectedOffer.id,
            offer_type: selectedOffer.offer_type,
            frequency: selectedOffer.frequency,
            items: selectedOffer.items
              ?.filter((item: any) => item.price_rental !== null) // Only najem items for contract
              .map((item: any) => ({
                notes: item.notes,
                quantity: item.quantity,
                price_rental: item.price_rental,
                price_penalty: item.price_penalty,
                width_cm: item.width_cm,
                height_cm: item.height_cm,
                seasonal: item.seasonal,
                seasonalFromWeek: item.seasonal_from_week,
                seasonalToWeek: item.seasonal_to_week,
                normalFromWeek: item.normal_from_week,
                normalToWeek: item.normal_to_week,
                frequency: item.frequency,
                normalFrequency: item.normal_frequency,
                seasonalFrequency: item.seasonal_frequency,
                normalPrice: item.normal_price,
                seasonalPrice: item.seasonal_price,
              })) || [],
          }}
          onContractSaved={(contract) => {
            // Add the contract to saved contracts list
            setSavedContracts(prev => [...prev, contract]);
          }}
          parentCompany={(() => {
            // Poišči matično podjetje če obstaja
            const parentId = (selectedCompany as any).parent_company_id;
            if (!parentId) return undefined;
            const parent = companies?.find(c => c.id === parentId);
            if (!parent) return undefined;
            return {
              id: parent.id,
              name: parent.name,
              tax_number: parent.tax_number,
              address_street: parent.address_street,
              address_postal: parent.address_postal,
              address_city: parent.address_city,
              contacts: parent.contacts.map(c => ({
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                email: c.email,
                phone: c.phone,
                role: c.role,
                is_billing_contact: (c as any).is_billing_contact,
                is_service_contact: (c as any).is_service_contact,
              })),
            };
          })()}
          childCompanies={companies
            ?.filter(c => c.parent_company_id === selectedCompany.id)
            .map(child => ({
              id: child.id,
              name: child.display_name || child.name,
              contacts: child.contacts.map(c => ({
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                email: c.email,
                phone: c.phone,
                role: c.role,
                is_billing_contact: (c as any).is_billing_contact,
                is_service_contact: (c as any).is_service_contact,
              })),
            })) || []}
        />
        </Suspense>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => navigate('/prodajalec')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Home size={22} />
            <span className="text-xs mt-1">Domov</span>
          </button>
          <button
            onClick={() => navigate('/prodajalec?view=scan')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Camera size={22} />
            <span className="text-xs mt-1">Skeniraj</span>
          </button>
          <button className="flex-1 py-3 flex flex-col items-center text-blue-600">
            <Users size={22} />
            <span className="text-xs mt-1">Stranke</span>
          </button>
        </div>
      </div>
    </div>
  );
}

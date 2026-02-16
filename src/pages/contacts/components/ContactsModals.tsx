/**
 * @file ContactsModals.tsx
 * @description Vsi modali za Contacts stran
 */

import { useToast } from '@/hooks/use-toast';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import type { UseCompanyNotesReturn } from '@/pages/contacts/hooks/useCompanyNotes';
import type { UseOfferStateReturn } from '@/pages/contacts/hooks/useOfferState';
import type { UseCompanyActionsReturn } from '@/pages/contacts/hooks/useCompanyActions';
import type { UseCompanyDetailHandlersReturn } from '@/pages/contacts/hooks/useCompanyDetailHandlers';
import type { UseSentOffersReturn } from '@/pages/contacts/hooks/useSentOffers';
import type { UseOfferEmailReturn } from '@/pages/contacts/hooks/useOfferEmail';
import type { UseQRScannerReturn } from '@/pages/contacts/hooks/useQRScanner';
import { getGoogleMapsUrl } from '@/pages/contacts/utils';
import { supabase } from '@/integrations/supabase/client';
import { SUPPLIERS, getSupplier } from '@/data/supplierColors';

import {
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
  OfferModalWrapper,
  RoutePlannerModal,
  ContractModalContainer,
  IzrisModal,
  type IzrisData,
} from './index';
import DeliveryInfoModal from '@/components/DeliveryInfoModal';

interface ContactsModalsProps {
  // Modal states
  modals: {
    showReminderModal: boolean;
    reminderState: { companyId: string | null; date: string; time: string; note: string; createTask: boolean };
    setReminderState: React.Dispatch<React.SetStateAction<{ companyId: string | null; date: string; time: string; note: string; createTask: boolean }>>;
    closeReminderModal: () => void;
    showRoutePlannerModal: boolean;
    setShowRoutePlannerModal: (show: boolean) => void;
    showExistingCompanyModal: boolean;
    existingCompanyState: { company: CompanyWithContacts | null; pendingContactData: any };
    closeExistingCompanyModal: () => void;
    showAddModal: boolean;
    setShowAddModal: (show: boolean) => void;
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    taxLookupLoading: boolean;
    selectedCompany: CompanyWithContacts | null;
    selectedCompanyId: string | null;
    showAddContactModal: boolean;
    setShowAddContactModal: (show: boolean) => void;
    showMeetingModal: boolean;
    meetingState: { type: 'visit' | 'online'; date: string; time: string };
    setMeetingState: React.Dispatch<React.SetStateAction<{ type: 'visit' | 'online'; date: string; time: string }>>;
    showEditAddressModal: boolean;
    setShowEditAddressModal: (show: boolean) => void;
    editAddressData: any;
    setEditAddressData: React.Dispatch<React.SetStateAction<any>>;
    editingContact: any;
    setEditingContact: (contact: any) => void;
    editContactData: any;
    setEditContactData: React.Dispatch<React.SetStateAction<any>>;
    showContractConfirm: boolean;
    setShowContractConfirm: (show: boolean) => void;
    showContractModal: boolean;
    setShowContractModal: (show: boolean) => void;
    selectedOffer: any;
    savedContracts: any[];
    setSavedContracts: React.Dispatch<React.SetStateAction<any[]>>;
    newNoteDate: string | null;
    setNewNoteDate: (date: string | null) => void;
    newNoteContent: string;
    setNewNoteContent: (content: string) => void;
    // D365 fields
    d365Category: string;
    setD365Category: (value: string) => void;
    d365Subcategory: string;
    setD365Subcategory: (value: string) => void;
    d365AppointmentType: string;
    setD365AppointmentType: (value: string) => void;
    d365StartTime: string;
    setD365StartTime: (value: string) => void;
    d365EndTime: string;
    setD365EndTime: (value: string) => void;
    // Izris modal
    showIzrisModal: boolean;
    setShowIzrisModal: (show: boolean) => void;
    // Delivery info modal
    showDeliveryInfoModal: boolean;
    setShowDeliveryInfoModal: (show: boolean) => void;
  };

  // Data
  companies: CompanyWithContacts[] | undefined;
  companyDetails: any;
  isLoadingDetails: boolean;
  companyHierarchy: Map<string, { parentCompany?: { id: string; name: string; display_name?: string }; childrenCount: number }>;
  filteredCompanies: CompanyWithContacts[];
  createReminderPending: boolean;

  // Hooks
  notesHook: UseCompanyNotesReturn;
  offerState: UseOfferStateReturn;
  actions: UseCompanyActionsReturn;
  detailHandlers: UseCompanyDetailHandlersReturn;
  sentOffers: UseSentOffersReturn;
  emailHook: UseOfferEmailReturn;
  qrScanner: UseQRScannerReturn;

  // Route helpers
  openRouteWithCompanies: (companies: CompanyWithContacts[]) => void;
}

export function ContactsModals({
  modals,
  companies,
  companyDetails,
  isLoadingDetails,
  companyHierarchy,
  filteredCompanies,
  createReminderPending,
  notesHook,
  offerState,
  actions,
  detailHandlers,
  sentOffers,
  emailHook,
  qrScanner,
  openRouteWithCompanies,
}: ContactsModalsProps) {
  const { toast } = useToast();

  return (
    <>
      {modals.showReminderModal && (
        <ReminderModal
          date={modals.reminderState.date}
          time={modals.reminderState.time}
          note={modals.reminderState.note}
          companyName={companies?.find(c => c.id === modals.reminderState.companyId)?.display_name || companies?.find(c => c.id === modals.reminderState.companyId)?.name}
          isLoading={createReminderPending}
          createTask={modals.reminderState.createTask}
          onDateChange={(date) => modals.setReminderState(prev => ({ ...prev, date }))}
          onTimeChange={(time) => modals.setReminderState(prev => ({ ...prev, time }))}
          onNoteChange={(note) => modals.setReminderState(prev => ({ ...prev, note }))}
          onCreateTaskChange={(createTask) => modals.setReminderState(prev => ({ ...prev, createTask }))}
          onSave={actions.handleCreateReminder}
          onClose={modals.closeReminderModal}
        />
      )}

      {modals.showRoutePlannerModal && (
        <RoutePlannerModal
          companies={filteredCompanies}
          onClose={() => modals.setShowRoutePlannerModal(false)}
          onOpenRoute={openRouteWithCompanies}
        />
      )}

      {modals.showExistingCompanyModal && modals.existingCompanyState.company && (
        <ExistingCompanyModal
          company={modals.existingCompanyState.company}
          isLoading={actions.addContact.isPending}
          onSelectExistingContact={actions.handleSelectExistingContact}
          onAddNewContact={actions.handleAddNewContactToExisting}
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
          onToggleD365={detailHandlers.handleToggleD365}
          d365Category={modals.d365Category}
          d365Subcategory={modals.d365Subcategory}
          d365AppointmentType={modals.d365AppointmentType}
          d365StartTime={modals.d365StartTime}
          d365EndTime={modals.d365EndTime}
          onD365CategoryChange={modals.setD365Category}
          onD365SubcategoryChange={modals.setD365Subcategory}
          onD365AppointmentTypeChange={modals.setD365AppointmentType}
          onD365StartTimeChange={modals.setD365StartTime}
          onD365EndTimeChange={modals.setD365EndTime}
          onOpenIzris={() => modals.setShowIzrisModal(true)}
          onOpenDeliveryInfo={() => modals.setShowDeliveryInfoModal(true)}
        />
      )}

      {modals.showIzrisModal && modals.selectedCompany && (
        <IzrisModal
          companyName={modals.selectedCompany.display_name || modals.selectedCompany.name}
          companyId={modals.selectedCompany.id}
          isOpen={modals.showIzrisModal}
          onClose={() => modals.setShowIzrisModal(false)}
          onSubmit={async (data: IzrisData) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                toast({ description: 'Napaka: uporabnik ni prijavljen', variant: 'destructive' });
                return;
              }

              const supplierConfig = getSupplier(data.supplier);
              const supplierName = supplierConfig?.name || data.supplier;
              const dimensions = `${String(data.width).padStart(3, '0')}x${String(data.height).padStart(3, '0')}`;
              const title = `${data.titlePrefix}-${data.companyName}-${dimensions}`;

              // Build note content
              const noteLines = [
                `Pripravi izris - ${title}`,
                `Dobavitelj: ${supplierName}`,
                `Vrsta: ${data.orderType === 'najem' ? 'Najem (DESIGN)' : 'Nakup (PROMO)'}`,
                `Barva ozadja: ${data.backgroundColorCode} - ${data.backgroundColorName}`,
                data.isDesignerChoice
                  ? 'Barva logotipa: Designer choice'
                  : `Barva logotipa: ${data.logoColorCode} - ${data.logoColorName}`,
                `Dimenzije: ${data.width}x${data.height} cm ${data.mbwCode ? `(${data.mbwCode})` : '(po meri)'}`,
                `Orientacija: ${data.orientation === 'portret' ? 'Portret' : 'Landscape'}`,
                data.selectedTemplate ? `Pozicija: ${data.selectedTemplate.label}` : '',
              ].filter(Boolean).join('\n');

              // Create note
              notesHook.addNoteMutation.mutate({
                companyId: data.companyId,
                noteDate: new Date().toISOString().split('T')[0],
                content: noteLines,
              });

              // Create Kanban task with template image
              const taskDescription = [
                `Dimenzije: ${data.width}x${data.height} cm`,
                `Orientacija: ${data.orientation}`,
                `Dobavitelj: ${supplierName}`,
                `Barva ozadja: ${data.backgroundColorCode}`,
                data.isDesignerChoice ? 'Logo: Designer choice' : `Logo: ${data.logoColorCode}`,
              ].join('\n');

              await supabase.from('tasks').insert({
                title,
                description: taskDescription,
                status: 'todo',
                salesperson_id: user.id,
                company_id: data.companyId,
                task_type: 'izris',
                position: 0,
                checklist_items: {
                  izrisData: {
                    supplier: data.supplier,
                    orderType: data.orderType,
                    backgroundColorCode: data.backgroundColorCode,
                    backgroundColorName: data.backgroundColorName,
                    logoColorCode: data.logoColorCode,
                    logoColorName: data.logoColorName,
                    isDesignerChoice: data.isDesignerChoice,
                    matType: data.matType,
                    mbwCode: data.mbwCode,
                    width: data.width,
                    height: data.height,
                    orientation: data.orientation,
                    templatePath: data.selectedTemplate?.path,
                    templateLabel: data.selectedTemplate?.label,
                    title,
                  },
                },
              });

              toast({ description: '✓ Izris dodan v opombe in Kanban' });
              modals.setShowIzrisModal(false);
            } catch (error: any) {
              console.error('Error creating izris task:', error);
              toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
            }
          }}
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
                  work_phone: modals.editContactData.work_phone?.trim() || null,
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
          designPurchasePricePerM2={offerState.designPurchasePricePerM2}
          specialShapeMultiplier={offerState.specialShapeMultiplier}
          updateNajemPricesForFrequency={offerState.updateNajemPricesForFrequency}
          addCustomOfferItem={offerState.addCustomOfferItem}
          removeOfferItem={offerState.removeOfferItem}
          updateOfferItem={offerState.updateOfferItem}
          handleItemTypeChange={offerState.handleItemTypeChange}
          handleDesignSizeSelect={offerState.handleDesignSizeSelect}
          handleCustomDimensionsChange={offerState.handleCustomDimensionsChange}
          handleSpecialShapeChange={offerState.handleSpecialShapeChange}
          handlePriceChange={offerState.handlePriceChange}
          handleDiscountChange={offerState.handleDiscountChange}
          handleSeasonalToggle={offerState.handleSeasonalToggle}
          handleSeasonalFrequencyChange={offerState.handleSeasonalFrequencyChange}
          handleSeasonalPriceChange={offerState.handleSeasonalPriceChange}
          handleSeasonalDiscountChange={offerState.handleSeasonalDiscountChange}
          handleNormalFrequencyChange={offerState.handleNormalFrequencyChange}
          handleNormalPriceChange={offerState.handleNormalPriceChange}
          handleNormalDiscountChange={offerState.handleNormalDiscountChange}
          handleFrequencyOverride={offerState.handleFrequencyOverride}
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

      {/* Delivery Info Modal */}
      {modals.showDeliveryInfoModal && modals.selectedCompany && (
        <DeliveryInfoModal
          isOpen={modals.showDeliveryInfoModal}
          onClose={() => modals.setShowDeliveryInfoModal(false)}
          company={modals.selectedCompany}
          contacts={modals.selectedCompany.contacts || []}
        />
      )}
    </>
  );
}

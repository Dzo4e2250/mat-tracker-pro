/**
 * @file ProdajalecMainModal.tsx
 * @description Glavni modal container za Prodajalec dashboard
 */

import { X } from 'lucide-react';
import type { CycleWithRelations } from '@/hooks/useCycles';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import type { MatType } from '@/integrations/supabase/types';

import {
  MatDetailsModal,
  PutOnTestModal,
  SelectAvailableMatModal,
  SelectTypeModal,
  SignContractModal,
  PutOnTestSuccessModal,
} from './index';

interface ProdajalecMainModalProps {
  showModal: boolean;
  modalType: string;
  selectedCycle: CycleWithRelations | null;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  matTypes: MatType[] | undefined;
  companies: CompanyWithContacts[] | undefined;
  cycles: CycleWithRelations[] | undefined;
  companyHistoryData: any;
  taxLookupLoading: boolean;
  userId: string;

  // Mutations
  createCyclePending: boolean;
  putOnTestPending: boolean;
  signContractPending: boolean;
  extendTestPending: boolean;
  updateStatusPending: boolean;
  updateLocationPending: boolean;
  updateStartDatePending: boolean;
  markContractPending: boolean;

  // Handlers
  onClose: () => void;
  setModalType: (type: string) => void;
  setSelectedCycle: (cycle: CycleWithRelations | null) => void;
  onAddMat: (qrId: string, typeId: string) => void;
  onPutOnTest: () => void;
  onSignContract: () => void;
  onExtendTest: () => void;
  onRequestDriverPickup: () => void;
  onMarkAsDirty: () => void;
  onTaxLookup: () => void;
  onOpenCompanySelect: () => void;
  onUpdateLocation: (cycleId: string, lat: number, lng: number) => Promise<void>;
  onUpdateStartDate: (cycleId: string, date: string) => Promise<void>;
  onMarkContractSigned: () => Promise<void>;
  onNavigateToCompany: (companyId: string) => void;
  onSetView: (view: 'home' | 'scan') => void;
  showToast: (message: string, variant?: 'default' | 'destructive') => void;
}

export function ProdajalecMainModal({
  showModal,
  modalType,
  selectedCycle,
  formData,
  setFormData,
  matTypes,
  companies,
  cycles,
  companyHistoryData,
  taxLookupLoading,
  userId,
  createCyclePending,
  putOnTestPending,
  signContractPending,
  extendTestPending,
  updateStatusPending,
  updateLocationPending,
  updateStartDatePending,
  markContractPending,
  onClose,
  setModalType,
  setSelectedCycle,
  onAddMat,
  onPutOnTest,
  onSignContract,
  onExtendTest,
  onRequestDriverPickup,
  onMarkAsDirty,
  onTaxLookup,
  onOpenCompanySelect,
  onUpdateLocation,
  onUpdateStartDate,
  onMarkContractSigned,
  onNavigateToCompany,
  onSetView,
  showToast,
}: ProdajalecMainModalProps) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-end p-2 border-b">
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Zapri">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-56px)]">
          {modalType === 'selectType' && (
            <SelectTypeModal
              qrCode={formData.qrCode}
              matTypes={matTypes}
              isPending={createCyclePending}
              onSelect={(_, typeId) => onAddMat(formData.qrId, typeId)}
              onCancel={onClose}
            />
          )}

          {modalType === 'matDetails' && selectedCycle && (
            <MatDetailsModal
              cycle={selectedCycle}
              onUpdateLocation={onUpdateLocation}
              onUpdateStartDate={onUpdateStartDate}
              onExtendTest={onExtendTest}
              onRequestDriverPickup={onRequestDriverPickup}
              onMarkAsDirty={onMarkAsDirty}
              onMarkContractSigned={onMarkContractSigned}
              isUpdatingLocation={updateLocationPending}
              isUpdatingStartDate={updateStartDatePending}
              isExtending={extendTestPending}
              isUpdatingStatus={updateStatusPending}
              isMarkingContract={markContractPending}
              onGoToPutOnTest={() => setModalType('putOnTest')}
              onAddMatToCompany={() => {
                setFormData({
                  ...formData,
                  lastCompanyId: selectedCycle.company_id,
                  lastCompanyName: selectedCycle.company?.display_name || selectedCycle.company?.name,
                  lastContactId: selectedCycle.contact_id,
                });
                setModalType('selectAvailableMat');
              }}
              onViewCompany={() => {
                onClose();
                onNavigateToCompany(selectedCycle?.company_id || '');
              }}
              onScanAnother={() => {
                onClose();
                setSelectedCycle(null);
                onSetView('scan');
              }}
              onClose={onClose}
              showToast={showToast}
              onUpdateCycle={setSelectedCycle}
            />
          )}

          {modalType === 'putOnTest' && (
            <PutOnTestModal
              formData={formData}
              setFormData={setFormData}
              companies={companies}
              companyHistoryData={companyHistoryData}
              taxLookupLoading={taxLookupLoading}
              isPending={putOnTestPending}
              onTaxLookup={onTaxLookup}
              onPutOnTest={onPutOnTest}
              onOpenCompanySelect={onOpenCompanySelect}
              onClearCompany={() => {
                setFormData({ ...formData, companyId: '', clientName: '', contactId: '', useExistingContact: false });
              }}
              onBack={() => setModalType('matDetails')}
            />
          )}

          {modalType === 'signContract' && (
            <SignContractModal
              frequency={formData.frequency || ''}
              isPending={signContractPending}
              onFrequencyChange={(freq) => setFormData({ ...formData, frequency: freq })}
              onSign={onSignContract}
              onBack={() => setModalType('matDetails')}
            />
          )}

          {modalType === 'putOnTestSuccess' && (
            <PutOnTestSuccessModal
              cycle={selectedCycle}
              companyName={formData.lastCompanyName}
              onAddAnother={() => setModalType('selectAvailableMat')}
              onGoHome={() => {
                onClose();
                setSelectedCycle(null);
                setFormData({});
                onSetView('home');
              }}
            />
          )}

          {modalType === 'selectAvailableMat' && (
            <SelectAvailableMatModal
              formData={formData}
              setFormData={setFormData}
              cycles={cycles}
              userId={userId}
              isPending={putOnTestPending}
              onAddMat={async (cycleId) => {
                // This will be handled by parent
              }}
              showToast={showToast}
              onClose={() => {
                onClose();
                setSelectedCycle(null);
                setFormData({});
                onSetView('home');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @file CompanyMatsModal.tsx
 * @description Modal for managing multiple mats at a company - batch operations
 */

import { useState, useMemo } from 'react';
import { X, Check, Building2, MapPin, Clock, AlertTriangle, FileSignature, Package, CalendarPlus } from 'lucide-react';
import type { CycleWithRelations } from '@/hooks/useCycles';

type ActionType = 'select' | 'sign_contract' | 'confirm_remaining';

interface CompanyMatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyAddress?: string;
  cycles: CycleWithRelations[];
  onSignContracts: (
    signedCycleIds: string[],
    remainingAction: 'keep_on_test' | 'pickup_self',
    remainingCycleIds: string[]
  ) => Promise<void>;
  onPickupAll: (cycleIds: string[]) => Promise<void>;
  onExtendAll: (cycleIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

function getDaysOnTest(testStartDate: string | null): number {
  if (!testStartDate) return 0;
  const start = new Date(testStartDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysRemaining(testStartDate: string | null): { days: number; isOverdue: boolean } {
  if (!testStartDate) return { days: 0, isOverdue: false };
  const start = new Date(testStartDate);
  const endDate = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { days, isOverdue: days < 0 };
}

export default function CompanyMatsModal({
  isOpen,
  onClose,
  companyName,
  companyAddress,
  cycles,
  onSignContracts,
  onPickupAll,
  onExtendAll,
  isLoading = false,
}: CompanyMatsModalProps) {
  const [selectedCycles, setSelectedCycles] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<ActionType>('select');
  const [remainingAction, setRemainingAction] = useState<'keep_on_test' | 'pickup_self'>('keep_on_test');

  const onTestCycles = useMemo(() =>
    cycles.filter(c => c.status === 'on_test'),
    [cycles]
  );

  const allSelected = selectedCycles.size === onTestCycles.length;
  const noneSelected = selectedCycles.size === 0;
  const partialSelected = !allSelected && !noneSelected;

  const remainingCycles = useMemo(() =>
    onTestCycles.filter(c => !selectedCycles.has(c.id)),
    [onTestCycles, selectedCycles]
  );

  const toggleCycle = (cycleId: string) => {
    setSelectedCycles(prev => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCycles(new Set(onTestCycles.map(c => c.id)));
  };

  const selectNone = () => {
    setSelectedCycles(new Set());
  };

  const handleSignClick = () => {
    if (noneSelected) return;
    if (partialSelected) {
      setStep('confirm_remaining');
    } else {
      handleConfirmSign();
    }
  };

  const handleConfirmSign = async () => {
    await onSignContracts(
      Array.from(selectedCycles),
      remainingAction,
      remainingCycles.map(c => c.id)
    );
    resetAndClose();
  };

  const handlePickupAll = async () => {
    await onPickupAll(onTestCycles.map(c => c.id));
    resetAndClose();
  };

  const handleExtendAll = async () => {
    await onExtendAll(onTestCycles.map(c => c.id));
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedCycles(new Set());
    setStep('select');
    setRemainingAction('keep_on_test');
    onClose();
  };

  const handleBack = () => {
    if (step === 'confirm_remaining') {
      setStep('sign_contract');
    } else {
      setStep('select');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-start justify-between bg-gray-50">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <h2 className="font-bold text-lg">{companyName}</h2>
            </div>
            {companyAddress && (
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={14} />
                {companyAddress}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              {onTestCycles.length} predpražnik{onTestCycles.length > 1 ? 'ov' : ''} na testu
            </div>
          </div>
          <button onClick={resetAndClose} className="p-1 hover:bg-gray-200 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select action */}
          {step === 'select' && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 mb-4">Kaj želiš narediti?</h3>

              <button
                onClick={() => {
                  selectAll();
                  setStep('sign_contract');
                }}
                disabled={isLoading}
                className="w-full p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <FileSignature size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-green-800">Podpisana pogodba</div>
                    <div className="text-sm text-green-600">Stranka je podpisala pogodbo</div>
                  </div>
                </div>
              </button>

              <button
                onClick={handlePickupAll}
                disabled={isLoading}
                className="w-full p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-orange-800">Vse sem pobral</div>
                    <div className="text-sm text-orange-600">Predpražnike sem vzel nazaj</div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleExtendAll}
                disabled={isLoading}
                className="w-full p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <CalendarPlus size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-blue-800">Podaljšaj test +7 dni</div>
                    <div className="text-sm text-blue-600">Stranka potrebuje več časa</div>
                  </div>
                </div>
              </button>

              {isLoading && (
                <div className="text-center text-gray-500 py-2">
                  Shranjujem...
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select which mats for contract */}
          {step === 'sign_contract' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">
                  Kateri predpražniki imajo pogodbo?
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Vse
                  </button>
                  <button
                    onClick={selectNone}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    Nic
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {onTestCycles.map(cycle => {
                  const isSelected = selectedCycles.has(cycle.id);
                  const { days, isOverdue } = getDaysRemaining(cycle.test_start_date);
                  const daysOnTest = getDaysOnTest(cycle.test_start_date);

                  return (
                    <button
                      key={cycle.id}
                      onClick={() => toggleCycle(cycle.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={16} />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {cycle.mat_type?.code || cycle.mat_type?.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {cycle.qr_code?.code}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium flex items-center gap-1 ${
                            isOverdue ? 'text-red-600' : days <= 3 ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            {isOverdue && <AlertTriangle size={14} />}
                            <Clock size={14} />
                            {isOverdue ? `${Math.abs(days)} dni zamude` : `${days} dni`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {daysOnTest} dni na testu
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 3: What to do with remaining mats */}
          {step === 'confirm_remaining' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-medium text-amber-800">
                      Pogodba za {selectedCycles.size} od {onTestCycles.length}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Kaj z ostalimi {remainingCycles.length}?
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setRemainingAction('keep_on_test')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    remainingAction === 'keep_on_test'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      remainingAction === 'keep_on_test'
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {remainingAction === 'keep_on_test' && <Check size={12} />}
                    </div>
                    <div>
                      <div className="font-medium">Pusti na testu</div>
                      <div className="text-sm text-gray-500">Ostanejo pri stranki</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRemainingAction('pickup_self')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    remainingAction === 'pickup_self'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      remainingAction === 'pickup_self'
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {remainingAction === 'pickup_self' && <Check size={12} />}
                    </div>
                    <div>
                      <div className="font-medium">Poberem sam</div>
                      <div className="text-sm text-gray-500">Premakni v "Umazan"</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">Ostali:</div>
                <div className="flex flex-wrap gap-2">
                  {remainingCycles.map(cycle => (
                    <span key={cycle.id} className="text-xs bg-white px-2 py-1 rounded border">
                      {cycle.mat_type?.code || cycle.qr_code?.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          {step === 'select' && (
            <button
              onClick={resetAndClose}
              className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Prekliči
            </button>
          )}

          {step === 'sign_contract' && (
            <div className="space-y-2">
              <button
                onClick={handleSignClick}
                disabled={noneSelected || isLoading}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  noneSelected
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]'
                }`}
              >
                {isLoading ? 'Shranjujem...' : `Potrdi (${selectedCycles.size})`}
              </button>
              <button
                onClick={handleBack}
                className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Nazaj
              </button>
            </div>
          )}

          {step === 'confirm_remaining' && (
            <div className="flex gap-2">
              <button
                onClick={handleBack}
                className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-100"
              >
                Nazaj
              </button>
              <button
                onClick={handleConfirmSign}
                disabled={isLoading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Shranjujem...' : 'Potrdi'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

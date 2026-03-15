/**
 * @file WaitingDriverModal.tsx
 * @description Modal za prikaz predpražnikov ki čakajo šoferja, grupiranih po podjetjih.
 * Prodajalec lahko potrdi prevzem za vsak predpražnik posebej.
 */

import { useMemo, useState } from 'react';
import { X, Truck, CheckCircle, Loader2 } from 'lucide-react';
import type { CycleWithRelations } from '@/hooks/useCycles';

interface WaitingDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycles: CycleWithRelations[] | undefined;
  onConfirmPickup: (cycleId: string) => void;
  isConfirming: boolean;
}

interface CompanyGroup {
  companyId: string;
  companyName: string;
  companyAddress: string;
  cycles: CycleWithRelations[];
}

export default function WaitingDriverModal({
  isOpen,
  onClose,
  cycles,
  onConfirmPickup,
  isConfirming,
}: WaitingDriverModalProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { groups, total } = useMemo(() => {
    if (!cycles) return { groups: [] as CompanyGroup[], total: 0 };

    const waitingCycles = cycles.filter(c => c.status === 'waiting_driver');
    const byCompany = new Map<string, CycleWithRelations[]>();

    waitingCycles.forEach(c => {
      const key = c.company_id || 'no-company';
      if (!byCompany.has(key)) {
        byCompany.set(key, []);
      }
      byCompany.get(key)!.push(c);
    });

    const sorted = Array.from(byCompany.entries())
      .map(([companyId, companyCycles]) => ({
        companyId,
        companyName: companyCycles[0]?.company?.display_name || companyCycles[0]?.company?.name || 'Brez podjetja',
        companyAddress: [
          companyCycles[0]?.company?.address_street,
          companyCycles[0]?.company?.address_city,
        ].filter(Boolean).join(', '),
        cycles: companyCycles,
      }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));

    return { groups: sorted, total: waitingCycles.length };
  }, [cycles]);

  const handleConfirm = (cycleId: string) => {
    setConfirmingId(cycleId);
    onConfirmPickup(cycleId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <h2 className="text-lg font-bold">Čaka šoferja ({total})</h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-72px)]">
          {total === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Truck className="h-12 w-12 mb-3 text-gray-300" />
              <p>Noben predpražnik ne čaka šoferja</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {groups.map(group => (
                <div key={group.companyId}>
                  {/* Company header */}
                  <div className="px-4 py-3 bg-purple-50 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-purple-900">{group.companyName}</div>
                        {group.companyAddress && (
                          <div className="text-xs text-purple-600">{group.companyAddress}</div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-purple-700 bg-purple-200 px-2 py-0.5 rounded-full">
                        {group.cycles.length} kos
                      </span>
                    </div>
                  </div>

                  {/* Mats list */}
                  <div className="divide-y divide-gray-50">
                    {group.cycles.map(cycle => {
                      const isThisConfirming = isConfirming && confirmingId === cycle.id;
                      return (
                        <div key={cycle.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm">
                              {cycle.mat_type?.code || cycle.mat_type?.name}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">{cycle.qr_code?.code}</div>
                          </div>
                          <button
                            onClick={() => handleConfirm(cycle.id)}
                            disabled={isConfirming}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 active:scale-[0.97] transition-all whitespace-nowrap"
                          >
                            {isThisConfirming ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            Pobrano
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

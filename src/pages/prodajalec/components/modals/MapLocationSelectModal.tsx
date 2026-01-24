/**
 * @file MapLocationSelectModal.tsx
 * @description Modal za izbiro predpražnika pri kliku na zemljevid (za nastavitev lokacije)
 */

import { X } from 'lucide-react';
import { CycleWithRelations } from '@/hooks/useCycles';

interface MapLocationSelectModalProps {
  isOpen: boolean;
  clickedLocation: { lat: number; lng: number };
  cycles: CycleWithRelations[] | undefined;
  isPending: boolean;
  onUpdateLocation: (cycleId: string) => Promise<void>;
  onClose: () => void;
}

export default function MapLocationSelectModal({
  isOpen,
  clickedLocation,
  cycles,
  isPending,
  onUpdateLocation,
  onClose,
}: MapLocationSelectModalProps) {
  if (!isOpen) return null;

  const onTestCycles = cycles?.filter(c => c.status === 'on_test') || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-bold">Izberi predpražnik</h3>
            <p className="text-xs text-gray-500">
              Lokacija: {clickedLocation.lat.toFixed(5)}, {clickedLocation.lng.toFixed(5)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-gray-600 mb-3">Predpražniki na testu:</p>
          {onTestCycles.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Ni predpražnikov na testu</p>
          ) : (
            <div className="space-y-2">
              {onTestCycles.map(cycle => (
                <button
                  key={cycle.id}
                  onClick={() => onUpdateLocation(cycle.id)}
                  disabled={isPending}
                  className="w-full p-3 border rounded-lg text-left hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm font-bold">{cycle.qr_code?.code}</div>
                      <div className="text-sm text-gray-600">{cycle.company?.name || 'Brez podjetja'}</div>
                      {cycle.mat_type && (
                        <div className="text-xs text-gray-500">{cycle.mat_type.code || cycle.mat_type.name}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {(cycle as any).location_lat ? '📍' : '❓'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

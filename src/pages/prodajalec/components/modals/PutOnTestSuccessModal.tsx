/**
 * @file PutOnTestSuccessModal.tsx
 * @description Modal za uspešen začetek testa
 */

import type { CycleWithRelations } from '@/hooks/useCycles';

interface PutOnTestSuccessModalProps {
  cycle: CycleWithRelations | null;
  companyName: string;
  onAddAnother: () => void;
  onGoHome: () => void;
}

export default function PutOnTestSuccessModal({
  cycle,
  companyName,
  onAddAnother,
  onGoHome,
}: PutOnTestSuccessModalProps) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">✅</div>
      <h3 className="text-xl font-bold mb-2">Predpražnik na testu</h3>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
        <div className="text-sm text-gray-600">
          <div className="font-bold text-lg text-black">
            {cycle?.mat_type?.code || cycle?.mat_type?.name}
          </div>
          <div className="text-gray-500 font-mono mb-2">{cycle?.qr_code?.code}</div>
          <div className="flex items-center gap-2 mb-1">
            <span>🏢</span>
            <span>{companyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span>Test poteče čez 7 dni</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onAddAnother}
          className="w-full bg-blue-500 text-white py-2 rounded"
        >
          ➕ Dodaj še en predpražnik sem
        </button>

        <button
          onClick={onGoHome}
          className="w-full py-2 border rounded"
        >
          🏠 Nazaj na domov
        </button>
      </div>
    </div>
  );
}

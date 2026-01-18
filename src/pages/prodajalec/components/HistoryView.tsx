/**
 * @file HistoryView.tsx
 * @description Prikaz zgodovine ciklov
 */

import type { CycleWithRelations } from '@/hooks/useCycles';
import { STATUSES, type StatusKey } from '../utils/constants';

interface HistoryViewProps {
  cycleHistory: CycleWithRelations[] | undefined;
}

export default function HistoryView({ cycleHistory }: HistoryViewProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">📜 Zgodovina</h2>
      {!cycleHistory || cycleHistory.length === 0 ? (
        <div className="bg-white p-4 rounded shadow text-center text-gray-500">
          Ni zgodovine
        </div>
      ) : (
        cycleHistory.map(cycle => {
          const status = STATUSES[cycle.status as StatusKey];
          return (
            <div key={cycle.id} className="bg-white p-3 mb-2 rounded shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                  <div className="text-sm text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                  {cycle.company && <div className="text-sm text-gray-600">{cycle.company.name}</div>}
                </div>
                <div
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: status?.color + '20',
                    color: status?.color
                  }}
                >
                  {status?.label}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(cycle.created_at).toLocaleString('sl-SI')}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

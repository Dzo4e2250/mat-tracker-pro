/**
 * @file HomeView.tsx
 * @description Domača stran prodajalca - prikaz ciklov
 */

import type { CycleWithRelations } from '@/hooks/useCycles';
import { STATUSES, type StatusKey } from '../utils/constants';
import { getTimeRemaining, formatCountdown } from '../utils/timeHelpers';

interface HomeViewProps {
  cycles: CycleWithRelations[] | undefined;
  currentTime: Date;
  statusFilter: string;
  expandedCompanies: Set<string>;
  onStatusFilterChange: (filter: string) => void;
  onToggleCompany: (companyId: string) => void;
  onCycleClick: (cycle: CycleWithRelations) => void;
}

export default function HomeView({
  cycles,
  currentTime,
  statusFilter,
  expandedCompanies,
  onStatusFilterChange,
  onToggleCompany,
  onCycleClick
}: HomeViewProps) {
  return (
    <div>
      {/* Opozorila za teste ki se iztečejo */}
      {cycles?.filter(c => c.status === 'on_test').map(cycle => {
        const timeRemaining = getTimeRemaining(cycle.test_start_date, currentTime);
        if (!timeRemaining || timeRemaining.expired || timeRemaining.days > 3) return null;

        return (
          <div key={cycle.id} className="bg-red-50 border-2 border-red-400 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</span>
                <span className="text-sm text-gray-500 ml-2 font-mono">{cycle.qr_code?.code}</span>
                <span className="text-sm text-gray-600 ml-2">{cycle.company?.display_name || cycle.company?.name}</span>
              </div>
              <span className="font-bold text-red-600">
                {formatCountdown(timeRemaining)?.text}
              </span>
            </div>
          </div>
        );
      })}

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-bold mb-4">Moji predpražniki</h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold">{cycles?.length || 0}</div>
            <div className="text-sm">💼 Skupaj</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'clean').length || 0}</div>
            <div className="text-sm">💚 Čisti</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'on_test').length || 0}</div>
            <div className="text-sm">🔵 Na testu</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'dirty').length || 0}</div>
            <div className="text-sm">🟠 Umazani</div>
          </div>
          <div className="bg-purple-50 p-3 rounded col-span-2">
            <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'waiting_driver').length || 0}</div>
            <div className="text-sm">📋 Čaka šoferja</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Vsi', count: cycles?.length || 0 },
            { key: 'clean', label: '💚 Čisti', count: cycles?.filter(c => c.status === 'clean').length || 0 },
            { key: 'on_test', label: '🔵 Na testu', count: cycles?.filter(c => c.status === 'on_test').length || 0 },
            { key: 'dirty', label: '🟠 Umazani', count: cycles?.filter(c => c.status === 'dirty').length || 0 },
            { key: 'waiting_driver', label: '📋 Šofer', count: cycles?.filter(c => c.status === 'waiting_driver').length || 0 },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* List */}
        {!cycles || cycles.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Ni predpražnikov</p>
        ) : (() => {
          // Filter cycles
          const filteredCycles = statusFilter === 'all'
            ? cycles
            : cycles.filter(c => c.status === statusFilter);

          if (filteredCycles.length === 0) {
            return <p className="text-gray-500 text-center py-4">Ni predpražnikov s tem statusom</p>;
          }

          // Group on_test cycles by company
          const onTestByCompany = new Map<string, CycleWithRelations[]>();
          const otherCycles: CycleWithRelations[] = [];

          filteredCycles.forEach(cycle => {
            if (cycle.status === 'on_test' && cycle.company_id) {
              const key = cycle.company_id;
              if (!onTestByCompany.has(key)) {
                onTestByCompany.set(key, []);
              }
              onTestByCompany.get(key)!.push(cycle);
            } else {
              otherCycles.push(cycle);
            }
          });

          return (
            <div className="space-y-2">
              {/* Grouped on_test cycles by company */}
              {Array.from(onTestByCompany.entries()).map(([companyId, companyCycles]) => {
                const isExpanded = expandedCompanies.has(companyId);
                const companyName = companyCycles[0]?.company?.display_name || companyCycles[0]?.company?.name || 'Neznano podjetje';

                // Find the most urgent countdown
                const urgentCycle = companyCycles.reduce((most, curr) => {
                  const mostTime = getTimeRemaining(most.test_start_date, currentTime);
                  const currTime = getTimeRemaining(curr.test_start_date, currentTime);
                  if (!mostTime) return curr;
                  if (!currTime) return most;
                  return currTime.totalHours < mostTime.totalHours ? curr : most;
                }, companyCycles[0]);
                const urgentCountdown = formatCountdown(getTimeRemaining(urgentCycle.test_start_date, currentTime));

                return (
                  <div key={companyId} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => onToggleCompany(companyId)}
                      className="w-full p-3 bg-blue-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏢</span>
                        <div className="text-left">
                          <div className="font-medium">{companyName}</div>
                          <div className="text-xs text-gray-500">{companyCycles.length} predpražnik{companyCycles.length > 1 ? 'ov' : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {urgentCountdown && (
                          <span className="text-xs font-bold" style={{
                            color: urgentCountdown.color === 'red' ? '#DC2626' :
                                   urgentCountdown.color === 'orange' ? '#EA580C' : '#16A34A'
                          }}>
                            {urgentCountdown.text}
                          </span>
                        )}
                        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="divide-y">
                        {companyCycles.map(cycle => {
                          const countdown = formatCountdown(getTimeRemaining(cycle.test_start_date, currentTime));
                          return (
                            <div
                              key={cycle.id}
                              className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                              onClick={() => onCycleClick(cycle)}
                            >
                              <div>
                                <div className="font-medium">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                              </div>
                              {countdown && (
                                <span className="text-sm font-bold" style={{
                                  color: countdown.color === 'red' ? '#DC2626' :
                                         countdown.color === 'orange' ? '#EA580C' : '#16A34A'
                                }}>
                                  {countdown.text}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Other cycles (clean, dirty, waiting_driver, or on_test without company) */}
              {otherCycles.map(cycle => {
                const timeRemaining = getTimeRemaining(cycle.test_start_date, currentTime);
                const countdown = formatCountdown(timeRemaining);
                const status = STATUSES[cycle.status as StatusKey];

                return (
                  <div
                    key={cycle.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => onCycleClick(cycle)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                      </div>
                      <div
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: status.color + '20',
                          color: status.color
                        }}
                      >
                        {status.icon}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

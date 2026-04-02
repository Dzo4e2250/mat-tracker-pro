/**
 * @file HomeView.tsx
 * @description Domača stran prodajalca - prikaz ciklov z opozorili in batch akcijami
 */

import { useState, useMemo } from 'react';
import { X, Download, Filter, Search } from 'lucide-react';
import type { CycleWithRelations } from '@/hooks/useCycles';
import { STATUSES, type StatusKey } from '../utils/constants';
import { getTimeRemaining, formatCountdown } from '../utils/timeHelpers';
import * as XLSX from 'xlsx';
import AllMatsModal from './modals/AllMatsModal';
import WaitingDriverModal from './modals/WaitingDriverModal';

interface CompanyMatsData {
  companyId: string;
  companyName: string;
  companyAddress?: string;
  contactPhone?: string;
  contactName?: string;
  cycles: CycleWithRelations[];
}

interface HomeViewProps {
  cycles: CycleWithRelations[] | undefined;
  currentTime: Date;
  statusFilter: string;
  expandedCompanies: Set<string>;
  dismissedAlerts: Set<string>;
  onStatusFilterChange: (filter: string) => void;
  onToggleCompany: (companyId: string) => void;
  onCycleClick: (cycle: CycleWithRelations) => void;
  onDismissAlert: (cycleId: string) => void;
  onShowCompanyMats: (data: CompanyMatsData) => void;
  onConfirmPickup?: (cycleId: string) => void;
  isConfirmingPickup?: boolean;
}

// Alert kartica za teste ki se iztečejo
function AlertCard({
  cycle,
  timeRemaining,
  onDismiss,
}: {
  cycle: CycleWithRelations;
  timeRemaining: ReturnType<typeof getTimeRemaining>;
  onDismiss: () => void;
}) {
  const isUrgent = timeRemaining?.days === 0;
  const countdown = formatCountdown(timeRemaining);

  return (
    <div className={`border-2 border-red-400 rounded-lg p-3 mb-4 ${isUrgent ? 'animate-pulse-red' : 'bg-red-50'}`}>
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <span className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</span>
          <span className="text-sm text-gray-500 ml-2 font-mono">{cycle.qr_code?.code}</span>
          <span className="text-sm text-gray-600 ml-2">{cycle.company?.display_name || cycle.company?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-red-600">{countdown?.text}</span>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Statistična kartica
function StatCard({
  count,
  label,
  bgColor,
  colSpan = 1,
  onClick,
}: {
  count: number;
  label: string;
  bgColor: string;
  colSpan?: number;
  onClick?: () => void;
}) {
  return (
    <div
      className={`${bgColor} p-3 rounded ${colSpan > 1 ? 'col-span-2' : ''} ${onClick ? 'cursor-pointer active:scale-[0.97] transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

// Podjetje skupina z cikli
function CompanyGroup({
  companyId,
  companyCycles,
  isExpanded,
  currentTime,
  onToggle,
  onCycleClick,
  onShowMats,
}: {
  companyId: string;
  companyCycles: CycleWithRelations[];
  isExpanded: boolean;
  currentTime: Date;
  onToggle: () => void;
  onCycleClick: (cycle: CycleWithRelations) => void;
  onShowMats: () => void;
}) {
  const companyName = companyCycles[0]?.company?.display_name || companyCycles[0]?.company?.name || 'Neznano podjetje';
  const companyAddress = companyCycles[0]?.company?.address_city || '';

  // Najnujnejši cikel
  const urgentCycle = companyCycles.reduce((most, curr) => {
    const mostTime = getTimeRemaining(most.test_start_date, currentTime);
    const currTime = getTimeRemaining(curr.test_start_date, currentTime);
    if (!mostTime) return curr;
    if (!currTime) return most;
    return currTime.totalHours < mostTime.totalHours ? curr : most;
  }, companyCycles[0]);

  const urgentTime = getTimeRemaining(urgentCycle.test_start_date, currentTime);
  const urgentCountdown = formatCountdown(urgentTime);
  const isUrgent = urgentTime && (urgentTime.expired || urgentTime.days === 0);

  return (
    <div className={`border rounded-lg overflow-hidden ${isUrgent ? 'border-red-400 border-2 animate-pulse-red' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center justify-between ${isUrgent ? '' : 'bg-blue-50'}`}
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
          {/* Batch akcija */}
          <div className="p-3 bg-gray-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowMats();
              }}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              ⚡ Ukrep za vse ({companyCycles.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Waiting driver skupina po podjetju
function WaitingDriverGroup({
  companyCycles,
  onCycleClick,
  onConfirmPickup,
  isConfirming,
}: {
  companyCycles: CycleWithRelations[];
  onCycleClick: (cycle: CycleWithRelations) => void;
  onConfirmPickup: (cycleId: string) => void;
  isConfirming: boolean;
}) {
  const companyName = companyCycles[0]?.company?.display_name || companyCycles[0]?.company?.name || 'Brez podjetja';
  const companyAddress = companyCycles[0]?.company?.address_city || '';

  return (
    <div className="border rounded-lg overflow-hidden border-purple-200">
      <div className="p-3 bg-purple-50 flex items-center gap-2">
        <span className="text-lg">🏢</span>
        <div className="flex-1">
          <div className="font-medium">{companyName}</div>
          {companyAddress && <div className="text-xs text-gray-500">{companyAddress}</div>}
        </div>
        <span className="text-xs text-purple-600 font-medium">
          {companyCycles.length} kos{companyCycles.length > 1 ? 'ov' : ''}
        </span>
      </div>
      <div className="divide-y">
        {companyCycles.map(cycle => (
          <div key={cycle.id} className="p-3 flex items-center justify-between gap-2">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onCycleClick(cycle)}
            >
              <div className="font-medium">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
              <div className="text-xs text-gray-500 font-mono">{cycle.qr_code?.code}</div>
            </div>
            <button
              onClick={() => onConfirmPickup(cycle.id)}
              disabled={isConfirming}
              className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 active:scale-[0.97] transition-transform whitespace-nowrap"
            >
              {isConfirming ? '...' : '✅ Pobrano'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Posamezen cikel kartica
function CycleCard({
  cycle,
  onClick,
}: {
  cycle: CycleWithRelations;
  onClick: () => void;
}) {
  const status = STATUSES[cycle.status as StatusKey];

  return (
    <div
      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
      onClick={onClick}
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
}

export default function HomeView({
  cycles,
  currentTime,
  statusFilter,
  expandedCompanies,
  dismissedAlerts,
  onStatusFilterChange,
  onToggleCompany,
  onCycleClick,
  onDismissAlert,
  onShowCompanyMats,
  onConfirmPickup,
  isConfirmingPickup,
}: HomeViewProps) {
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');
  const [showAllMatsModal, setShowAllMatsModal] = useState(false);
  const [showWaitingDriverModal, setShowWaitingDriverModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Izračunaj statistiko
  const stats = {
    total: cycles?.length || 0,
    clean: cycles?.filter(c => c.status === 'clean').length || 0,
    onTest: cycles?.filter(c => c.status === 'on_test' && !c.contract_signed).length || 0,
    dirty: cycles?.filter(c => c.status === 'dirty').length || 0,
    waitingDriver: cycles?.filter(c => c.status === 'waiting_driver').length || 0,
  };

  // Get mat type counts for current status filter
  const matTypeCounts = useMemo(() => {
    if (!cycles) return [];
    const relevantCycles = cycles.filter(c => {
      if (statusFilter === 'dirty') return c.status === 'dirty';
      if (statusFilter === 'waiting_driver') return c.status === 'waiting_driver';
      return false;
    });
    const counts = new Map<string, number>();
    relevantCycles.forEach(c => {
      const type = c.mat_type?.code || 'Neznano';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cycles, statusFilter]);

  // Export to Excel - summary + detailed by company
  const exportToExcel = () => {
    if (!cycles) return;

    let cyclesToExport = cycles.filter(c => c.status === statusFilter);
    if (matTypeFilter !== 'all') {
      cyclesToExport = cyclesToExport.filter(c => (c.mat_type?.code || 'Neznano') === matTypeFilter);
    }

    if (cyclesToExport.length === 0) return;

    const statusLabel = statusFilter === 'dirty' ? 'Umazani' : 'Čaka šoferja';

    // ===== TABELA 1: Povzetek po tipu =====
    const typeCounts = new Map<string, number>();
    cyclesToExport.forEach(c => {
      const type = c.mat_type?.code || 'Neznano';
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const summaryData = Array.from(typeCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([type, count]) => ({
        'Tip': type,
        'Število': count,
      }));

    // ===== TABELA 2: Podrobnosti po podjetjih =====
    // Group cycles by company
    const byCompany = new Map<string, typeof cyclesToExport>();
    cyclesToExport.forEach(c => {
      const companyId = c.company?.id || 'unknown';
      if (!byCompany.has(companyId)) {
        byCompany.set(companyId, []);
      }
      byCompany.get(companyId)!.push(c);
    });

    // Build detailed rows
    const detailRows: Record<string, string | number>[] = [];

    // Sort companies by name
    const sortedCompanies = Array.from(byCompany.entries()).sort((a, b) => {
      const nameA = a[1][0]?.company?.display_name || a[1][0]?.company?.name || '';
      const nameB = b[1][0]?.company?.display_name || b[1][0]?.company?.name || '';
      return nameA.localeCompare(nameB);
    });

    for (const [, companyCycles] of sortedCompanies) {
      const firstCycle = companyCycles[0];
      const company = firstCycle?.company;
      const count = companyCycles.length;

      // Format address
      const addressParts = [
        company?.address_street,
        company?.address_city,
        company?.address_postal_code,
      ].filter(Boolean);
      const address = addressParts.join(', ');

      // Format coordinates
      const coords = company?.latitude && company?.longitude
        ? `${company.latitude}, ${company.longitude}`
        : '';

      // First row has all company info
      companyCycles.forEach((cycle, index) => {
        if (index === 0) {
          detailRows.push({
            'QR Koda': cycle.qr_code?.code || '',
            'Tip': cycle.mat_type?.code || cycle.mat_type?.name || '',
            'Št.': count,
            'Koordinate': coords,
            'Naslov': address,
            'Podjetje': company?.display_name || company?.name || '',
          });
        } else {
          // Additional rows only have QR code and type
          detailRows.push({
            'QR Koda': cycle.qr_code?.code || '',
            'Tip': cycle.mat_type?.code || cycle.mat_type?.name || '',
            'Št.': '',
            'Koordinate': '',
            'Naslov': '',
            'Podjetje': '',
          });
        }
      });
    }

    // Create workbook with both tables
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Povzetek');

    // Sheet 2: Details
    const wsDetails = XLSX.utils.json_to_sheet(detailRows);
    wsDetails['!cols'] = [
      { wch: 15 }, // QR Koda
      { wch: 10 }, // Tip
      { wch: 5 },  // Št.
      { wch: 22 }, // Koordinate
      { wch: 35 }, // Naslov
      { wch: 30 }, // Podjetje
    ];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Podrobnosti');

    const dateStr = new Date().toISOString().split('T')[0];
    const typeStr = matTypeFilter !== 'all' ? `_${matTypeFilter}` : '';
    const fileName = statusFilter === 'dirty' ? 'Umazani' : 'Caka_soferja';
    XLSX.writeFile(wb, `${fileName}${typeStr}_${dateStr}.xlsx`);
  };

  // Reset mat type filter when status filter changes
  const handleStatusFilterChange = (filter: string) => {
    setMatTypeFilter('all');
    onStatusFilterChange(filter);
  };

  // Filtriraj cikle - pri "on_test" izključi podpisane pogodbe
  const getFilteredCycles = () => {
    if (!cycles) return [];
    let result = cycles;

    if (statusFilter === 'all') {
      // No status filter
    } else if (statusFilter === 'on_test') {
      result = cycles.filter(c => c.status === 'on_test' && !c.contract_signed);
    } else {
      result = cycles.filter(c => c.status === statusFilter);
    }

    // Apply mat type filter for dirty/waiting_driver
    if ((statusFilter === 'dirty' || statusFilter === 'waiting_driver') && matTypeFilter !== 'all') {
      result = result.filter(c => (c.mat_type?.code || 'Neznano') === matTypeFilter);
    }

    return result;
  };

  const filteredCyclesPreSearch = getFilteredCycles();

  // Apply search filter
  const filteredCycles = useMemo(() => {
    if (!searchQuery.trim()) return filteredCyclesPreSearch;
    const q = searchQuery.toLowerCase().trim();
    return filteredCyclesPreSearch.filter(c => {
      const companyName = (c.company?.display_name || c.company?.name || '').toLowerCase();
      const qrCode = (c.qr_code?.code || '').toLowerCase();
      const matCode = (c.mat_type?.code || c.mat_type?.name || '').toLowerCase();
      return companyName.includes(q) || qrCode.includes(q) || matCode.includes(q);
    });
  }, [filteredCyclesPreSearch, searchQuery]);

  // Grupiraj on_test cikle po podjetjih
  const onTestByCompany = new Map<string, CycleWithRelations[]>();
  const waitingByCompany = new Map<string, CycleWithRelations[]>();
  const otherCycles: CycleWithRelations[] = [];

  filteredCycles.forEach(cycle => {
    if (cycle.status === 'on_test' && cycle.company_id && !cycle.contract_signed) {
      const key = cycle.company_id;
      if (!onTestByCompany.has(key)) {
        onTestByCompany.set(key, []);
      }
      onTestByCompany.get(key)!.push(cycle);
    } else if (cycle.status === 'waiting_driver' && statusFilter === 'waiting_driver') {
      const key = cycle.company_id || 'no-company';
      if (!waitingByCompany.has(key)) {
        waitingByCompany.set(key, []);
      }
      waitingByCompany.get(key)!.push(cycle);
    } else {
      otherCycles.push(cycle);
    }
  });

  // Sortiraj waiting_driver podjetja po imenu
  const sortedWaitingCompanies = Array.from(waitingByCompany.entries()).sort((a, b) => {
    const nameA = a[1][0]?.company?.display_name || a[1][0]?.company?.name || 'zzz';
    const nameB = b[1][0]?.company?.display_name || b[1][0]?.company?.name || 'zzz';
    return nameA.localeCompare(nameB);
  });

  // Sortiraj podjetja po nujnosti
  const sortedCompanies = Array.from(onTestByCompany.entries()).sort((a, b) => {
    const getUrgentTime = (cycles: CycleWithRelations[]) => {
      const urgent = cycles.reduce((most, curr) => {
        const mostTime = getTimeRemaining(most.test_start_date, currentTime);
        const currTime = getTimeRemaining(curr.test_start_date, currentTime);
        if (!mostTime) return curr;
        if (!currTime) return most;
        return currTime.totalHours < mostTime.totalHours ? curr : most;
      }, cycles[0]);
      return getTimeRemaining(urgent.test_start_date, currentTime);
    };
    const aTime = getUrgentTime(a[1]);
    const bTime = getUrgentTime(b[1]);
    return (aTime?.totalHours || 0) - (bTime?.totalHours || 0);
  });

  // Opozorila - sortirano, izključi podpisane pogodbe
  const alertCycles = cycles
    ?.filter(c => c.status === 'on_test' && !c.contract_signed)
    .sort((a, b) => {
      const aTime = a.test_start_date ? new Date(a.test_start_date).getTime() : 0;
      const bTime = b.test_start_date ? new Date(b.test_start_date).getTime() : 0;
      return aTime - bTime;
    })
    .filter(cycle => {
      const timeRemaining = getTimeRemaining(cycle.test_start_date, currentTime);
      return timeRemaining && !timeRemaining.expired && timeRemaining.days <= 3 && !dismissedAlerts.has(cycle.id);
    }) || [];

  return (
    <div>
      {/* Opozorila */}
      {alertCycles.map(cycle => (
        <AlertCard
          key={cycle.id}
          cycle={cycle}
          timeRemaining={getTimeRemaining(cycle.test_start_date, currentTime)}
          onDismiss={() => onDismissAlert(cycle.id)}
        />
      ))}

      {/* Statistika */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-bold mb-4">Moji predpražniki</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard count={stats.total} label="💼 Skupaj" bgColor="bg-gray-50" onClick={() => setShowAllMatsModal(true)} />
          <StatCard count={stats.clean} label="💚 Čisti" bgColor="bg-green-50" />
          <StatCard count={stats.onTest} label="🔵 Na testu" bgColor="bg-blue-50" />
          <StatCard count={stats.dirty} label="🟠 Umazani" bgColor="bg-orange-50" />
          <StatCard count={stats.waitingDriver} label="📋 Čaka šoferja" bgColor="bg-purple-50" colSpan={2} onClick={() => setShowWaitingDriverModal(true)} />
        </div>
      </div>

      {/* Filter in seznam */}
      <div className="bg-white rounded-lg shadow p-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Išči podjetje, QR kodo, tip..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Vsi', count: stats.total },
            { key: 'clean', label: '💚 Čisti', count: stats.clean },
            { key: 'on_test', label: '🔵 Na testu', count: stats.onTest },
            { key: 'dirty', label: '🟠 Umazani', count: stats.dirty },
            { key: 'waiting_driver', label: '📋 Šofer', count: stats.waitingDriver },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleStatusFilterChange(tab.key)}
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

        {/* Mat type filter and Excel export for dirty/waiting_driver */}
        {(statusFilter === 'dirty' || statusFilter === 'waiting_driver') && matTypeCounts.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={matTypeFilter}
              onChange={(e) => setMatTypeFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1.5 bg-white flex-1"
            >
              <option value="all">
                Vsi tipi ({statusFilter === 'dirty' ? stats.dirty : stats.waitingDriver})
              </option>
              {matTypeCounts.map(([type, count]) => (
                <option key={type} value={type}>
                  {type} ({count})
                </option>
              ))}
            </select>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
          </div>
        )}

        {/* Seznam */}
        {!cycles || cycles.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Ni predpražnikov</p>
        ) : filteredCycles.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Ni predpražnikov s tem statusom</p>
        ) : (
          <div className="space-y-2">
            {/* Grupirani waiting_driver cikli po podjetjih */}
            {onConfirmPickup && sortedWaitingCompanies.map(([companyId, companyCycles]) => (
              <WaitingDriverGroup
                key={companyId}
                companyCycles={companyCycles}
                onCycleClick={onCycleClick}
                onConfirmPickup={onConfirmPickup}
                isConfirming={isConfirmingPickup || false}
              />
            ))}

            {/* Grupirani on_test cikli po podjetjih */}
            {sortedCompanies.map(([companyId, companyCycles]) => (
              <CompanyGroup
                key={companyId}
                companyId={companyId}
                companyCycles={companyCycles}
                isExpanded={expandedCompanies.has(companyId)}
                currentTime={currentTime}
                onToggle={() => onToggleCompany(companyId)}
                onCycleClick={onCycleClick}
                onShowMats={() => {
                  const contact = companyCycles[0]?.contact;
                  onShowCompanyMats({
                    companyId,
                    companyName: companyCycles[0]?.company?.display_name || companyCycles[0]?.company?.name || 'Neznano podjetje',
                    companyAddress: companyCycles[0]?.company?.address_city,
                    contactPhone: contact?.phone || undefined,
                    contactName: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : undefined,
                    cycles: companyCycles,
                  });
                }}
              />
            ))}

            {/* Ostali cikli */}
            {otherCycles.map(cycle => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                onClick={() => onCycleClick(cycle)}
              />
            ))}
          </div>
        )}
      </div>

      <AllMatsModal
        isOpen={showAllMatsModal}
        onClose={() => setShowAllMatsModal(false)}
        cycles={cycles}
      />

      {onConfirmPickup && (
        <WaitingDriverModal
          isOpen={showWaitingDriverModal}
          onClose={() => setShowWaitingDriverModal(false)}
          cycles={cycles}
          onConfirmPickup={onConfirmPickup}
          isConfirming={isConfirmingPickup || false}
        />
      )}
    </div>
  );
}

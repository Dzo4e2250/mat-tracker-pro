/**
 * @file FiltersBar.tsx
 * @description Iskalno polje in filtri za seznam strank
 */

import { Search, X, MapPin, Plus, EyeOff, Eye } from 'lucide-react';

type FilterType = 'all' | 'active' | 'signed' | 'inactive' | 'overdue';
type SortType = 'name' | 'date' | 'status';
type PeriodType = 'all' | 'today' | 'week' | 'month' | 'lastMonth';

interface PipelineStatus {
  value: string;
  label: string;
}

interface FiltersBarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Sort
  sortBy: SortType;
  onSortChange: (sort: SortType) => void;
  // Period filter
  periodFilter: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  // Status filter
  statusFilter: string;
  onStatusChange: (status: string) => void;
  pipelineStatuses: PipelineStatus[];
  // Quick filter
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  // "Ni interesa" filter
  hideNoInterest: boolean;
  onHideNoInterestChange: (hide: boolean) => void;
  noInterestCount: number;
  // Route planning
  routeCompaniesCount: number;
  onOpenRoute: () => void;
  // Add company
  onAddCompany: () => void;
}

/**
 * Vrstica z iskanjem in filtri
 * - Iskalno polje z X gumbom za brisanje
 * - Sortiranje (ime, datum, status)
 * - Filter po obdobju (teden, mesec)
 * - Filter po pipeline statusu
 * - Hitri filtri (vse, aktivne, zamude, pogodbe)
 * - Gumb za načrtovanje poti
 * - Gumb za dodajanje stranke
 */
export default function FiltersBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  periodFilter,
  onPeriodChange,
  statusFilter,
  onStatusChange,
  pipelineStatuses,
  filter,
  onFilterChange,
  hideNoInterest,
  onHideNoInterestChange,
  noInterestCount,
  routeCompaniesCount,
  onOpenRoute,
  onAddCompany,
}: FiltersBarProps) {
  const quickFilters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Vse' },
    { key: 'active', label: '🔵 Aktivne' },
    { key: 'overdue', label: '🔴 Zamude' },
    { key: 'signed', label: '✅ Pogodbe' },
  ];

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Išči po imenu, kontaktu, telefonu..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filters - Dropdowns */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortType)}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="name">A-Ž po imenu</option>
          <option value="date">Po datumu</option>
          <option value="status">Po statusu</option>
        </select>

        {/* Period filter */}
        <select
          value={periodFilter}
          onChange={(e) => onPeriodChange(e.target.value as PeriodType)}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="all">Vsa obdobja</option>
          <option value="today">Danes</option>
          <option value="week">Ta teden</option>
          <option value="month">Ta mesec</option>
          <option value="lastMonth">Prejšnji mesec</option>
        </select>

        {/* Pipeline status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="all">Vsi statusi</option>
          {pipelineStatuses.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>

        {/* Quick filters */}
        <div className="flex gap-1">
          {quickFilters.map(tab => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* "Ni interesa" filter toggle */}
        {noInterestCount > 0 && (
          <button
            onClick={() => onHideNoInterestChange(!hideNoInterest)}
            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap flex items-center gap-1 ${
              hideNoInterest
                ? 'bg-gray-200 text-gray-600 border border-gray-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
            title={hideNoInterest ? 'Prikaži tudi "Ni interesa"' : 'Skrij "Ni interesa"'}
          >
            {hideNoInterest ? <EyeOff size={12} /> : <Eye size={12} />}
            Ni interesa ({noInterestCount})
          </button>
        )}

        {/* Route planning button */}
        {routeCompaniesCount > 1 && (
          <button
            onClick={onOpenRoute}
            className="px-3 py-2 rounded-lg text-sm whitespace-nowrap bg-orange-500 text-white flex items-center gap-1"
            title={`Odpri pot za ${Math.min(routeCompaniesCount, 10)} strank`}
          >
            <MapPin size={16} /> Pot ({Math.min(routeCompaniesCount, 10)})
          </button>
        )}

        <button
          onClick={onAddCompany}
          className="ml-auto px-3 py-2 rounded-lg text-sm whitespace-nowrap bg-green-500 text-white flex items-center gap-1"
        >
          <Plus size={16} /> Dodaj
        </button>
      </div>
    </>
  );
}

/**
 * @file FiltersBar.tsx
 * @description Iskalno polje in zložljivi filtri za seznam strank
 */

import { useRef, useState } from 'react';
import { Search, X, MapPin, Plus, EyeOff, Eye, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

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
 * Sticky iskalno polje z zložljivimi filtri
 */
export function StickySearchBar({
  searchQuery,
  onSearchChange,
  // Filter props
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Preveri če je kakšen filter aktiven (ni default)
  const hasActiveFilters = sortBy !== 'name' || periodFilter !== 'all' || statusFilter !== 'all' || filter !== 'all' || hideNoInterest;

  const quickFilters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Vse' },
    { key: 'active', label: '🔵 Aktivne' },
    { key: 'overdue', label: '🔴 Zamude' },
    { key: 'signed', label: '✅ Pogodbe' },
  ];

  return (
    <div className="sticky top-0 z-20 bg-gray-100 -mx-4 px-4 pt-2 pb-2 space-y-2">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Išči..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClick={() => inputRef.current?.focus()}
            className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 rounded-xl border-2 shadow-sm flex items-center gap-1.5 transition-all ${
            showFilters
              ? 'bg-blue-500 text-white border-blue-500'
              : hasActiveFilters
                ? 'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <SlidersHorizontal size={18} />
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Add button - vedno viden */}
        <button
          onClick={onAddCompany}
          className="px-3 py-2 rounded-xl bg-green-500 text-white shadow-sm flex items-center"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Collapsible filters */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3 shadow-sm">
          {/* Quick filters row */}
          <div className="flex flex-wrap gap-1.5">
            {quickFilters.map(tab => (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* "Ni interesa" filter toggle */}
            {noInterestCount > 0 && (
              <button
                onClick={() => onHideNoInterestChange(!hideNoInterest)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                  hideNoInterest
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {hideNoInterest ? <EyeOff size={12} /> : <Eye size={12} />}
                Ni interesa ({noInterestCount})
              </button>
            )}
          </div>

          {/* Dropdowns row */}
          <div className="flex flex-wrap gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortType)}
              className="px-3 py-2 rounded-lg border bg-gray-50 text-sm flex-1 min-w-[120px]"
            >
              <option value="name">A-Ž po imenu</option>
              <option value="date">Po datumu</option>
              <option value="status">Po statusu</option>
            </select>

            <select
              value={periodFilter}
              onChange={(e) => onPeriodChange(e.target.value as PeriodType)}
              className="px-3 py-2 rounded-lg border bg-gray-50 text-sm flex-1 min-w-[120px]"
            >
              <option value="all">Vsa obdobja</option>
              <option value="today">Danes</option>
              <option value="week">Ta teden</option>
              <option value="month">Ta mesec</option>
              <option value="lastMonth">Prejšnji mesec</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-gray-50 text-sm flex-1 min-w-[120px]"
            >
              <option value="all">Vsi statusi</option>
              {pipelineStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Route button */}
          {routeCompaniesCount > 1 && (
            <button
              onClick={onOpenRoute}
              className="w-full py-2 rounded-lg text-sm bg-orange-500 text-white flex items-center justify-center gap-2"
            >
              <MapPin size={16} />
              Načrtuj pot ({Math.min(routeCompaniesCount, 10)} strank)
            </button>
          )}
        </div>
      </div>

      {/* Active filters indicator (when collapsed) */}
      {!showFilters && hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <span>Aktivni filtri:</span>
          {filter !== 'all' && (
            <span className="bg-blue-100 px-2 py-0.5 rounded-full">
              {quickFilters.find(f => f.key === filter)?.label}
            </span>
          )}
          {periodFilter !== 'all' && (
            <span className="bg-blue-100 px-2 py-0.5 rounded-full">
              {periodFilter === 'today' ? 'Danes' : periodFilter === 'week' ? 'Teden' : periodFilter === 'month' ? 'Mesec' : 'Prejšnji mesec'}
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="bg-blue-100 px-2 py-0.5 rounded-full">
              {pipelineStatuses.find(s => s.value === statusFilter)?.label}
            </span>
          )}
          {hideNoInterest && (
            <span className="bg-gray-200 px-2 py-0.5 rounded-full">Skrito: Ni interesa</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Filtri brez iskanja (sortiranje, obdobje, statusi, gumbi) - legacy
 */
export function FiltersOnly({
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
}: Omit<FiltersBarProps, 'searchQuery' | 'onSearchChange'>) {
  const quickFilters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Vse' },
    { key: 'active', label: '🔵 Aktivne' },
    { key: 'overdue', label: '🔴 Zamude' },
    { key: 'signed', label: '✅ Pogodbe' },
  ];

  return (
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
  );
}

/**
 * Vrstica z iskanjem in filtri (legacy - za nazaj kompatibilnost)
 */
export default function FiltersBar(props: FiltersBarProps) {
  return (
    <>
      <StickySearchBar {...props} />
    </>
  );
}

/**
 * @file CompanySelectModal.tsx
 * @description Modal za hitro izbiro obstoječega podjetja
 * - Iskanje po imenu, davčni, mestu, kontaktu
 * - Filtri po statusu in obdobju
 * - Prikaz podjetij s ključnimi podatki
 */

import { useState, useMemo } from 'react';
import { Search, X, Building2, MapPin, Phone, User, CheckCircle, Clock, FileText } from 'lucide-react';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

type FilterType = 'all' | 'active' | 'signed' | 'inactive';
type PeriodType = 'all' | 'today' | 'week' | 'month';

interface CompanySelectModalProps {
  companies: CompanyWithContacts[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (company: CompanyWithContacts) => void;
}

export default function CompanySelectModal({
  companies,
  isOpen,
  onClose,
  onSelect,
}: CompanySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('all');

  // Smart search across all fields
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];

    let result = [...companies];

    // Search filter - searches across multiple fields
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(company => {
        // Company name
        if ((company.name || '').toLowerCase().includes(query)) return true;
        if ((company.display_name || '').toLowerCase().includes(query)) return true;

        // Tax number
        if ((company.tax_number || '').includes(query)) return true;

        // City
        if ((company.address_city || '').toLowerCase().includes(query)) return true;

        // Contact names and phones
        const contacts = company.contacts || [];
        for (const contact of contacts) {
          const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
          if (fullName.includes(query)) return true;
          if ((contact.phone || '').includes(query)) return true;
          if ((contact.email || '').toLowerCase().includes(query)) return true;
        }

        return false;
      });
    }

    // Quick filter
    if (filter !== 'all') {
      result = result.filter(company => {
        const stats = company.cycleStats || { onTest: 0, signed: 0, total: 0 };
        switch (filter) {
          case 'active':
            return stats.onTest > 0;
          case 'signed':
            return stats.signed > 0;
          case 'inactive':
            return stats.total === 0;
          default:
            return true;
        }
      });
    }

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (periodFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter(company => {
        const lastActivity = company.lastActivity ? new Date(company.lastActivity) : null;
        const createdAt = new Date(company.created_at);
        const relevantDate = lastActivity || createdAt;
        return relevantDate >= startDate;
      });
    }

    // Sort: most relevant first (search match quality), then by last activity
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result.sort((a, b) => {
        // Exact name match first
        const aExact = (a.display_name || a.name || '').toLowerCase() === query;
        const bExact = (b.display_name || b.name || '').toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        // Name starts with query
        const aStarts = (a.display_name || a.name || '').toLowerCase().startsWith(query);
        const bStarts = (b.display_name || b.name || '').toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // Then by last activity
        const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bDate - aDate;
      });
    } else {
      // Without search, sort by last activity
      result.sort((a, b) => {
        const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bDate - aDate;
      });
    }

    return result;
  }, [companies, searchQuery, filter, periodFilter]);

  const quickFilters: { key: FilterType; label: string; icon?: string }[] = [
    { key: 'all', label: 'Vse' },
    { key: 'active', label: '🔵 Na testu' },
    { key: 'signed', label: '✅ Pogodbe' },
    { key: 'inactive', label: '⚪ Brez ciklov' },
  ];

  if (!isOpen) return null;

  const handleSelect = (company: CompanyWithContacts) => {
    onSelect(company);
    setSearchQuery('');
    setFilter('all');
    setPeriodFilter('all');
  };

  const getPrimaryContact = (company: CompanyWithContacts) => {
    const contacts = company.contacts || [];
    return contacts.find(c => c.is_primary) || contacts[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[80] p-2 pt-8 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-blue-50 rounded-t-2xl">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            <Building2 size={20} />
            Izberi podjetje
          </h3>
          <button onClick={onClose} className="p-1 text-blue-800 hover:text-blue-600">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Išči po imenu, davčni, mestu, kontaktu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-lg border bg-white text-base"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex gap-2 flex-wrap">
            {/* Quick filters */}
            <div className="flex gap-1 flex-wrap">
              {quickFilters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                    filter === f.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Period filter */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodType)}
              className="px-2 py-1 rounded-lg border bg-white text-xs"
            >
              <option value="all">Vse obdobja</option>
              <option value="today">Danes</option>
              <option value="week">Ta teden</option>
              <option value="month">Ta mesec</option>
            </select>
          </div>

          {/* Results count */}
          <div className="text-xs text-gray-500">
            Najdeno: {filteredCompanies.length} podjetij
          </div>
        </div>

        {/* Company list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredCompanies.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Building2 size={48} className="mx-auto mb-2 opacity-50" />
              <p>Ni najdenih podjetij</p>
              {searchQuery && (
                <p className="text-sm mt-1">Poskusi z drugim iskalnim nizom</p>
              )}
            </div>
          ) : (
            filteredCompanies.slice(0, 50).map(company => {
              const primaryContact = getPrimaryContact(company);
              const stats = company.cycleStats || { onTest: 0, signed: 0, total: 0 };

              return (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company)}
                  className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Company name */}
                      <div className="font-medium text-gray-900 truncate">
                        {company.display_name || company.name}
                      </div>

                      {/* City and tax */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {company.address_city && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={12} />
                            {company.address_city}
                          </span>
                        )}
                        {company.tax_number && (
                          <span className="text-gray-400">
                            {company.tax_number}
                          </span>
                        )}
                      </div>

                      {/* Primary contact */}
                      {primaryContact && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <User size={12} />
                          <span>{primaryContact.first_name} {primaryContact.last_name}</span>
                          {primaryContact.phone && (
                            <span className="flex items-center gap-0.5 text-gray-400">
                              <Phone size={10} />
                              {primaryContact.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-col items-end gap-1">
                      {stats.onTest > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          <Clock size={10} />
                          {stats.onTest} test
                        </span>
                      )}
                      {stats.signed > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          <CheckCircle size={10} />
                          {stats.signed} pogodb
                        </span>
                      )}
                      {(company.contacts?.length || 0) > 0 && (
                        <span className="text-xs text-gray-400">
                          {company.contacts?.length} kontakt{(company.contacts?.length || 0) > 1 ? 'ov' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {filteredCompanies.length > 50 && (
            <div className="text-center text-xs text-gray-400 py-2">
              Prikazanih prvih 50 rezultatov. Uporabi iskanje za natančnejše rezultate.
            </div>
          )}
        </div>

        {/* Footer - new company option */}
        <div className="p-3 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => {
              onSelect(null as any); // null means "create new"
              onClose();
            }}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors text-sm font-medium"
          >
            + Ustvari novo podjetje
          </button>
        </div>
      </div>
    </div>
  );
}

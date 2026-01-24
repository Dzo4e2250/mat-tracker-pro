/**
 * @file RoutePlannerModal.tsx
 * @description Modal za izbiro podjetij pri načrtovanju poti
 */

import { useState, useMemo } from 'react';
import { X, MapPin, Check, Square, CheckSquare, Navigation, Building2 } from 'lucide-react';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { getCompanyAddress } from '../utils';

interface RoutePlannerModalProps {
  companies: CompanyWithContacts[];
  onClose: () => void;
  onOpenRoute: (selectedCompanies: CompanyWithContacts[]) => void;
}

export function RoutePlannerModal({
  companies,
  onClose,
  onOpenRoute,
}: RoutePlannerModalProps) {
  // Filter only companies with addresses
  const companiesWithAddresses = useMemo(() =>
    companies.filter(c => getCompanyAddress(c)),
    [companies]
  );

  // Selected company IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // By default, select first 10 companies
    const initialSelected = new Set<string>();
    companiesWithAddresses.slice(0, 10).forEach(c => initialSelected.add(c.id));
    return initialSelected;
  });

  const toggleCompany = (companyId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        // Max 10 waypoints for Google Maps
        if (newSet.size < 10) {
          newSet.add(companyId);
        }
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const newSet = new Set<string>();
    companiesWithAddresses.slice(0, 10).forEach(c => newSet.add(c.id));
    setSelectedIds(newSet);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleOpenRoute = () => {
    const selectedCompanies = companiesWithAddresses.filter(c => selectedIds.has(c.id));
    if (selectedCompanies.length > 0) {
      onOpenRoute(selectedCompanies);
      onClose();
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:w-[480px] sm:max-h-[80vh] max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-orange-50">
          <div className="flex items-center gap-2">
            <Navigation className="text-orange-600" size={24} />
            <div>
              <h2 className="font-semibold text-lg">Načrtuj pot</h2>
              <p className="text-sm text-gray-500">Izberi podjetja za vključitev v pot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Izberi vse
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Počisti
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <span className={selectedCount >= 10 ? 'text-orange-600 font-medium' : ''}>
              {selectedCount}/10
            </span> izbranih
            {selectedCount >= 10 && (
              <span className="text-orange-600 ml-1">(max)</span>
            )}
          </div>
        </div>

        {/* Company list */}
        <div className="flex-1 overflow-y-auto p-2">
          {companiesWithAddresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="mx-auto mb-2 text-gray-300" size={40} />
              <p>Ni podjetij z naslovi</p>
            </div>
          ) : (
            <div className="space-y-1">
              {companiesWithAddresses.map((company, index) => {
                const isSelected = selectedIds.has(company.id);
                const address = getCompanyAddress(company);
                const canSelect = isSelected || selectedIds.size < 10;

                return (
                  <button
                    key={company.id}
                    onClick={() => canSelect && toggleCompany(company.id)}
                    disabled={!canSelect}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-orange-50 border-2 border-orange-300'
                        : canSelect
                          ? 'bg-white border-2 border-transparent hover:bg-gray-50'
                          : 'bg-gray-50 border-2 border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`mt-0.5 ${isSelected ? 'text-orange-600' : 'text-gray-400'}`}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>

                    {/* Order number when selected */}
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {Array.from(selectedIds).indexOf(company.id) + 1}
                      </div>
                    )}

                    {/* Company info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {company.display_name || company.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate flex items-center gap-1">
                        <MapPin size={12} className="flex-shrink-0" />
                        {address}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleOpenRoute}
            disabled={selectedCount < 1}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              selectedCount >= 1
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Navigation size={20} />
            {selectedCount >= 1
              ? `Odpri v Google Maps (${selectedCount} ${selectedCount === 1 ? 'lokacija' : selectedCount < 5 ? 'lokacije' : 'lokacij'})`
              : 'Izberi vsaj 1 podjetje'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoutePlannerModal;

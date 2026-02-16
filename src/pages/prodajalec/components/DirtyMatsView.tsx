/**
 * @file DirtyMatsView.tsx
 * @description Pogled za umazane predpražnike - prodajalec lahko vidi in prenese dokument za odvoz
 */

import { useState, useMemo } from 'react';
import { Truck, FileText, Phone, MapPin, Building2, Loader2, CheckCircle, Filter } from 'lucide-react';
import { useSellerDirtyMats } from '@/pages/inventar/seller/useSellerQueries';
import { generateDirtyTransportDocument } from '@/pages/inventar/seller/generateDirtyTransportDocument';
import type { SellerProfile } from '@/pages/inventar/components/types';

interface DirtyMatsViewProps {
  userId?: string;
  seller?: SellerProfile;
}

export function DirtyMatsView({ userId, seller }: DirtyMatsViewProps) {
  const { data: dirtyMats = [], isLoading } = useSellerDirtyMats(userId);
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');

  // Filter only dirty status (not on_test or waiting_driver)
  const dirtyMatsOnly = useMemo(() => {
    return dirtyMats.filter(mat => mat.status === 'dirty');
  }, [dirtyMats]);

  // Get unique mat types with counts
  const matTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    dirtyMatsOnly.forEach(mat => {
      const type = mat.matTypeCode || 'Neznano';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dirtyMatsOnly]);

  // Filter mats by selected type
  const filteredMats = useMemo(() => {
    if (matTypeFilter === 'all') return dirtyMatsOnly;
    return dirtyMatsOnly.filter(mat => (mat.matTypeCode || 'Neznano') === matTypeFilter);
  }, [dirtyMatsOnly, matTypeFilter]);

  const handleGenerateDocument = () => {
    if (filteredMats.length === 0) return;
    generateDirtyTransportDocument(filteredMats, seller);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-red-500" />
          Umazani predpražniki
        </h2>
        {dirtyMatsOnly.length > 0 && (
          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
            {dirtyMatsOnly.length} za odvoz
          </span>
        )}
      </div>

      {dirtyMatsOnly.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Ni umazanih predpražnikov</h3>
          <p className="text-gray-500">Vsi predpražniki so čisti ali že v procesu prevzema.</p>
        </div>
      ) : (
        <>
          {/* Actions & Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={matTypeFilter}
                  onChange={(e) => setMatTypeFilter(e.target.value)}
                  className="text-sm border rounded px-3 py-2 bg-white"
                >
                  <option value="all">Vsi tipi ({dirtyMatsOnly.length})</option>
                  {matTypeCounts.map(([type, count]) => (
                    <option key={type} value={type}>
                      {type} ({count})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateDocument}
                disabled={filteredMats.length === 0}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span>Prenesi odvozni nalog ({filteredMats.length})</span>
              </button>
            </div>
          </div>

          {/* Mats List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y">
              {filteredMats.map((mat) => (
                <div key={mat.cycleId} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-lg bg-gray-100 px-2 py-1 rounded">
                          {mat.qrCode}
                        </span>
                        <span className="text-sm text-gray-500">
                          {mat.matTypeCode || mat.matTypeName}
                        </span>
                      </div>

                      {mat.companyName && (
                        <div className="flex items-center gap-2 text-gray-700 mb-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{mat.companyName}</span>
                        </div>
                      )}

                      {mat.companyAddress && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{mat.companyAddress}</span>
                        </div>
                      )}

                      {mat.contactPhone && (
                        <a
                          href={`tel:${mat.contactPhone}`}
                          className="flex items-center gap-2 text-sm text-blue-600"
                        >
                          <Phone className="h-4 w-4" />
                          <span>{mat.contactPhone}</span>
                        </a>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="inline-block bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-medium">
                        Umazana
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Povzetek po tipih:</h3>
            <div className="flex flex-wrap gap-3">
              {matTypeCounts.map(([type, count]) => (
                <span key={type} className="bg-white px-3 py-1 rounded shadow-sm text-sm">
                  <strong>{type}:</strong> {count}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DirtyMatsView;

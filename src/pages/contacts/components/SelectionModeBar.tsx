/**
 * @file SelectionModeBar.tsx
 * @description Vrstica za izbiro kontaktov - izvoz in brisanje
 */

import { Download, Trash2, X } from 'lucide-react';

interface SelectionModeBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExport: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

/**
 * Prikazuje vrstico z možnostmi ko je aktiven način izbire
 * - Število izbranih / skupno
 * - Gumbi za izberi vse / počisti
 * - Gumbi za izvoz / brisanje / prekliči
 */
export default function SelectionModeBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onExport,
  onDelete,
  onCancel,
}: SelectionModeBarProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedCount} izbranih od {totalCount}
          </span>
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-600 hover:underline"
          >
            Izberi vse
          </button>
          {selectedCount > 0 && (
            <button
              onClick={onDeselectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Počisti
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Download size={14} /> Izvozi
          </button>
          <button
            onClick={onDelete}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Trash2 size={14} /> Izbriši
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg flex items-center gap-1"
          >
            <X size={14} /> Prekliči
          </button>
        </div>
      </div>
    </div>
  );
}

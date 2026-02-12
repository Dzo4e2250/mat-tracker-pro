/**
 * @file AllMatsModal.tsx
 * @description Modal za pregled vseh predpražnikov - tabela po tipu in datumu (kot Lindstrom zaloga)
 */

import { useMemo } from 'react';
import { X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { CycleWithRelations } from '@/hooks/useCycles';

interface AllMatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycles: CycleWithRelations[] | undefined;
}

interface BatchRow {
  code: string;
  product: string;
  quantity: number;
  startDate: string; // YYYY-MM-DD
}

function formatDateSl(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('sl-SI');
}

export default function AllMatsModal({ isOpen, onClose, cycles }: AllMatsModalProps) {
  const { rows, total } = useMemo(() => {
    if (!cycles || cycles.length === 0) return { rows: [] as BatchRow[], total: 0 };

    // Group by mat_type code + created_at date
    const batchMap = new Map<string, BatchRow>();

    cycles.forEach(c => {
      const code = c.mat_type?.code || 'Neznano';
      const product = c.mat_type?.name || '';
      const dateKey = c.created_at ? c.created_at.split('T')[0] : 'unknown';
      // Group by code + year-month (not exact date)
      const monthKey = dateKey.substring(0, 7); // YYYY-MM
      const key = `${code}|${monthKey}`;

      if (!batchMap.has(key)) {
        batchMap.set(key, { code, product, quantity: 0, startDate: dateKey });
      }
      const batch = batchMap.get(key)!;
      batch.quantity++;
      // Keep the earliest date in the month
      if (dateKey < batch.startDate) {
        batch.startDate = dateKey;
      }
    });

    // Sort by code, then by date
    const sorted = Array.from(batchMap.values()).sort((a, b) => {
      const codeCompare = a.code.localeCompare(b.code);
      if (codeCompare !== 0) return codeCompare;
      return a.startDate.localeCompare(b.startDate);
    });

    return { rows: sorted, total: cycles.length };
  }, [cycles]);

  const exportToExcel = () => {
    if (rows.length === 0) return;

    const excelRows: Record<string, string | number>[] = [];
    let prevCode = '';

    rows.forEach(r => {
      const isFirst = r.code !== prevCode;
      excelRows.push({
        'Code': isFirst ? r.code : '',
        'Product': isFirst ? r.product : '',
        'Kolicina': r.quantity,
        'Start date': formatDateSl(r.startDate),
      });
      prevCode = r.code;
    });

    // SKUPAJ row
    excelRows.push({
      'Code': '',
      'Product': 'SKUPAJ',
      'Kolicina': total,
      'Start date': '',
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);
    ws['!cols'] = [
      { wch: 10 }, // Code
      { wch: 30 }, // Product
      { wch: 10 }, // Kolicina
      { wch: 12 }, // Start date
    ];

    // Merge Code and Product cells for same-code groups
    const merges: XLSX.Range[] = [];
    let groupStart = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i === rows.length || rows[i].code !== rows[groupStart].code) {
        if (i - groupStart > 1) {
          // +1 offset for header row
          merges.push({ s: { r: groupStart + 1, c: 0 }, e: { r: i, c: 0 } }); // Code
          merges.push({ s: { r: groupStart + 1, c: 1 }, e: { r: i, c: 1 } }); // Product
        }
        groupStart = i;
      }
    }
    if (merges.length > 0) {
      ws['!merges'] = merges;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Zaloga');

    const dateStr = new Date().toLocaleDateString('sl-SI').replace(/\. /g, '.').replace(/\./g, '.');
    XLSX.writeFile(wb, `Zaloga_${dateStr}.xlsx`);
  };

  // Group rows by code to detect same-code blocks for visual grouping
  const rowsWithGroupInfo = useMemo(() => {
    return rows.map((row, i) => {
      const isFirstOfCode = i === 0 || rows[i - 1].code !== row.code;
      const codeCount = rows.filter(r => r.code === row.code).length;
      return { ...row, isFirstOfCode, codeCount };
    });
  }, [rows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h2 className="text-lg font-bold">Zaloga ({total})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 backdrop-blur transition-colors"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button onClick={onClose} className="p-1 text-white/70 hover:text-white transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-[calc(90vh-72px)]">
          {rows.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Ni predpražnikov</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-center px-4 py-3 font-semibold">Kol.</th>
                  <th className="text-right px-4 py-3 font-semibold">Start date</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithGroupInfo.map((row, i) => (
                  <tr
                    key={`${row.code}-${row.startDate}-${i}`}
                    className={`
                      border-b border-gray-100 hover:bg-blue-50/50 transition-colors
                      ${row.isFirstOfCode && i > 0 ? 'border-t-2 border-t-gray-300' : ''}
                      ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    `}
                  >
                    <td className={`px-4 py-2.5 font-mono font-semibold ${row.isFirstOfCode ? 'text-blue-700' : 'text-transparent select-none'}`}>
                      {row.isFirstOfCode ? row.code : ''}
                    </td>
                    <td className={`px-4 py-2.5 truncate max-w-[180px] ${row.isFirstOfCode ? 'text-gray-600' : 'text-transparent select-none'}`}>
                      {row.isFirstOfCode ? row.product : ''}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-block min-w-[28px] px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full text-xs">
                        {row.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{formatDateSl(row.startDate)}</td>
                  </tr>
                ))}
                {/* SKUPAJ */}
                <tr className="bg-gray-800 text-white sticky bottom-0">
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 font-bold uppercase tracking-wide text-sm">Skupaj</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block min-w-[32px] px-2.5 py-0.5 bg-white text-gray-800 font-bold rounded-full text-sm">
                      {total}
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

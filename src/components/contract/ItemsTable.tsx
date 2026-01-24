/**
 * @file ItemsTable.tsx
 * @description Tabela artiklov za najem v pogodbi
 */

import { Plus, Trash2 } from 'lucide-react';
import type { ContractItem } from './types';

interface ItemsTableProps {
  items: ContractItem[];
  onUpdateItem: (index: number, field: string, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export default function ItemsTable({
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: ItemsTableProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-purple-700">Artikli za najem</h4>
        <button
          onClick={onAddItem}
          className="text-sm text-purple-600 flex items-center gap-1 hover:underline"
        >
          <Plus size={16} /> Dodaj artikel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-purple-100 text-left">
              <th className="px-2 py-1">Koda</th>
              <th className="px-2 py-1">Naziv</th>
              <th className="px-2 py-1">Velikost</th>
              <th className="px-2 py-1">Prilag.</th>
              <th className="px-2 py-1">Kol.</th>
              <th className="px-2 py-1">Frekv.</th>
              <th className="px-2 py-1">Sezonsko</th>
              <th className="px-2 py-1">EUR/teden</th>
              <th className="px-2 py-1">Povracilo</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => onUpdateItem(index, 'code', e.target.value)}
                    className="w-16 px-1 py-1 border rounded text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    value={item.name}
                    onChange={(e) => onUpdateItem(index, 'name', e.target.value)}
                    className="w-28 px-1 py-1 border rounded text-xs"
                  >
                    <option value="Predpražnik">Predpražnik</option>
                    <option value="Predpražnik po meri">Predpražnik po meri</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.size}
                    onChange={(e) => onUpdateItem(index, 'size', e.target.value)}
                    className="w-16 px-1 py-1 border rounded text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    value={item.customized ? 'da' : 'ne'}
                    onChange={(e) => onUpdateItem(index, 'customized', e.target.value === 'da')}
                    className="w-12 px-1 py-1 border rounded text-xs"
                  >
                    <option value="ne">ne</option>
                    <option value="da">da</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-12 px-1 py-1 border rounded text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    value={item.frequency}
                    onChange={(e) => onUpdateItem(index, 'frequency', e.target.value)}
                    className="w-14 px-1 py-1 border rounded text-xs"
                  >
                    <option value="1">1 ted</option>
                    <option value="2">2 ted</option>
                    <option value="3">3 ted</option>
                    <option value="4">4 ted</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.seasonal}
                    onChange={(e) => onUpdateItem(index, 'seasonal', e.target.value)}
                    placeholder="npr. T13-44"
                    className="w-20 px-1 py-1 border rounded text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={item.pricePerWeek}
                    onChange={(e) => onUpdateItem(index, 'pricePerWeek', parseFloat(e.target.value) || 0)}
                    className="w-16 px-1 py-1 border rounded text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={item.replacementCost}
                    onChange={(e) => onUpdateItem(index, 'replacementCost', parseFloat(e.target.value) || 0)}
                    className="w-16 px-1 py-1 border rounded text-xs"
                  />
                </td>
                <td className="px-1 py-1">
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

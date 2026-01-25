/**
 * @file OptibrushTable.tsx
 * @description Tabela za Optibrush cene
 */

import type { OptibrushPriceDB } from '@/hooks/usePrices';
import type { PendingOptibrushChange } from './usePriceChanges';
import { getOptibrushLabel } from './priceHelpers';

interface OptibrushTableProps {
  prices: OptibrushPriceDB[] | undefined;
  pendingChanges: Map<string, PendingOptibrushChange>;
  onChange: (id: string, oldValue: number, newValue: number) => void;
}

export function OptibrushTable({
  prices,
  pendingChanges,
  onChange,
}: OptibrushTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Konfiguracija</th>
            <th className="px-3 py-2 text-right">€/m²</th>
          </tr>
        </thead>
        <tbody>
          {prices?.map((price) => {
            const pending = pendingChanges.get(price.id);
            const currentValue = pending?.newValue ?? price.price_per_m2;
            const isChanged = pending !== undefined;

            return (
              <tr
                key={price.id}
                className={`border-t hover:bg-gray-50 ${isChanged ? 'bg-yellow-50' : ''}`}
              >
                <td className="px-3 py-2">{getOptibrushLabel(price)}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={currentValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        onChange(price.id, price.price_per_m2, val);
                      }
                    }}
                    className={`w-24 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

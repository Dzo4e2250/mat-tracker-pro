import type { MatPrice } from '@/hooks/usePrices';
import type { PendingMatChange } from './usePriceChanges';
import { MAT_PRICE_FIELDS, CATEGORY_COLORS } from './priceHelpers';

interface MatPriceRowProps {
  price: MatPrice;
  pendingChanges: Map<string, PendingMatChange>;
  onChange: (
    id: string,
    field: string,
    oldValue: number,
    newValue: number
  ) => void;
}

export function MatPriceRow({
  price,
  pendingChanges,
  onChange,
}: MatPriceRowProps) {
  const getValue = (field: string) => {
    const key = `${price.id}-${field}`;
    const pending = pendingChanges.get(key);
    return pending?.newValue ?? (price[field as keyof MatPrice] as number);
  };

  const isFieldChanged = (field: string) => {
    const key = `${price.id}-${field}`;
    return pendingChanges.has(key);
  };

  const hasAnyChange = MAT_PRICE_FIELDS.some((f) => isFieldChanged(f));

  return (
    <tr
      className={`border-t hover:bg-gray-50 ${hasAnyChange ? 'bg-yellow-50' : ''}`}
    >
      <td className="px-3 py-2 font-medium">{price.code}</td>
      <td className="px-3 py-2 text-gray-500">{price.dimensions}</td>
      {MAT_PRICE_FIELDS.map((field) => {
        const isChanged = isFieldChanged(field);
        const originalValue = price[field as keyof MatPrice] as number;

        return (
          <td key={field} className="px-3 py-2">
            <input
              type="number"
              step="0.01"
              value={getValue(field)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange(price.id, field, originalValue, val);
                }
              }}
              className={`w-20 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
          </td>
        );
      })}
    </tr>
  );
}

interface AllPricesRowProps {
  price: MatPrice;
  categoryLabel: string;
  pendingChanges: Map<string, PendingMatChange>;
  onChange: (
    id: string,
    field: string,
    oldValue: number,
    newValue: number
  ) => void;
}

export function AllPricesRow({
  price,
  categoryLabel,
  pendingChanges,
  onChange,
}: AllPricesRowProps) {
  const getValue = (field: string) => {
    const key = `${price.id}-${field}`;
    const pending = pendingChanges.get(key);
    return pending?.newValue ?? (price[field as keyof MatPrice] as number);
  };

  const isFieldChanged = (field: string) => {
    const key = `${price.id}-${field}`;
    return pendingChanges.has(key);
  };

  const hasAnyChange = MAT_PRICE_FIELDS.some((f) => isFieldChanged(f));

  return (
    <tr
      className={`border-t hover:bg-gray-50 ${hasAnyChange ? 'bg-yellow-50' : ''}`}
    >
      <td className="px-3 py-2">
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[categoryLabel] || 'bg-gray-100 text-gray-800'}`}
        >
          {categoryLabel}
        </span>
      </td>
      <td className="px-3 py-2 font-medium font-mono">{price.code}</td>
      <td className="px-3 py-2 text-gray-500">{price.dimensions}</td>
      {MAT_PRICE_FIELDS.map((field) => {
        const isChanged = isFieldChanged(field);
        const originalValue = price[field as keyof MatPrice] as number;

        return (
          <td key={field} className="px-3 py-2">
            <input
              type="number"
              step="0.01"
              value={getValue(field)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange(price.id, field, originalValue, val);
                }
              }}
              className={`w-20 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
          </td>
        );
      })}
    </tr>
  );
}

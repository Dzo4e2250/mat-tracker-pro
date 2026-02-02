/**
 * @file NakupTab.tsx
 * @description Zavihek NAKUP - Design cena/m2 + Optibrush cene
 */

import type { OptibrushPriceDB } from '@/hooks/usePrices';
import type { PendingOptibrushChange, PendingSettingChange } from './usePriceChanges';

interface OptibrushTableNakupProps {
  prices: OptibrushPriceDB[] | undefined;
  pendingChanges: Map<string, PendingOptibrushChange>;
  onChange: (id: string, oldValue: number, newValue: number) => void;
}

function OptibrushTableNakup({ prices, pendingChanges, onChange }: OptibrushTableNakupProps) {
  // Group prices by configuration
  const groupPrices = () => {
    if (!prices) return {};

    const groups: Record<string, OptibrushPriceDB[]> = {};

    prices.forEach(p => {
      const edgeKey = p.has_edge ? 'Z robom' : 'Brez roba';
      const colorKey = p.color_count === '1' ? '1 barva' : '2-3 barve';
      const key = `${edgeKey}, ${colorKey}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    return groups;
  };

  const groups = groupPrices();

  const getLabel = (p: OptibrushPriceDB) => {
    const parts: string[] = [];
    if (p.has_drainage) parts.push('z drenažnimi');
    if (p.is_standard) parts.push('standard');
    else parts.push(p.is_large ? 'nad 7.5 m²' : 'do 7.5 m²');
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, groupPrices]) => (
        <div key={groupName} className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-orange-100 font-medium text-orange-800">
            {groupName}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Konfiguracija</th>
                <th className="px-3 py-2 text-right font-medium">€/m²</th>
              </tr>
            </thead>
            <tbody>
              {groupPrices.map((price) => {
                const pending = pendingChanges.get(price.id);
                const currentValue = pending?.newValue ?? price.price_per_m2;
                const isChanged = pending !== undefined;

                return (
                  <tr
                    key={price.id}
                    className={`border-t hover:bg-gray-50 ${isChanged ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-3 py-2">{getLabel(price)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={currentValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onChange(price.id, price.price_per_m2, val);
                        }}
                        className={`w-24 p-1 border rounded text-right text-sm ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

interface NakupTabProps {
  optibrushPrices: OptibrushPriceDB[] | undefined;
  settings: {
    design_purchase_price_per_m2?: number;
    optibrush_special_shape_multiplier?: number;
  } | undefined;
  pendingOptibrushChanges: Map<string, PendingOptibrushChange>;
  pendingSettingChanges: Map<string, PendingSettingChange>;
  onOptibrushPriceChange: (id: string, oldValue: number, newValue: number) => void;
  onSettingChange: (key: string, oldValue: number, newValue: number) => void;
}

export function NakupTab({
  optibrushPrices,
  settings,
  pendingOptibrushChanges,
  pendingSettingChanges,
  onOptibrushPriceChange,
  onSettingChange,
}: NakupTabProps) {
  // Design price per m2
  const designPriceValue = settings?.design_purchase_price_per_m2 || 165;
  const pendingDesignPrice = pendingSettingChanges.get('design_purchase_price_per_m2');
  const displayDesignPrice = pendingDesignPrice?.newValue ?? designPriceValue;

  // Optibrush special shape
  const optibrushShapeValue = settings?.optibrush_special_shape_multiplier || 1.3;
  const pendingOptibrushShape = pendingSettingChanges.get('optibrush_special_shape_multiplier');
  const displayOptibrushShape = pendingOptibrushShape
    ? (pendingOptibrushShape.newValue - 1) * 100
    : (optibrushShapeValue - 1) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-3 rounded-lg">
        <h2 className="text-lg font-bold">NAKUP</h2>
      </div>

      {/* Design section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-pink-100 font-semibold text-pink-800">
          PRODAJA DESIGN, Kleentex in Mountville
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Odstopanje dimenzij: +/-3%
          </p>
          <div className={`flex items-center justify-between gap-4 p-3 rounded ${pendingDesignPrice ? 'bg-yellow-50' : 'bg-gray-50'}`}>
            <label className="text-gray-700 font-medium">Cena</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={displayDesignPrice}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onSettingChange('design_purchase_price_per_m2', designPriceValue, val);
                  }
                }}
                className={`w-28 p-2 border rounded text-right text-lg font-bold ${pendingDesignPrice ? 'border-yellow-400 bg-yellow-50' : ''}`}
              />
              <span className="text-gray-700 font-medium">€/m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Optibrush section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-orange-100 font-semibold text-orange-800">
          OPTIBRUSH
        </div>
        <div className="p-4">
          <OptibrushTableNakup
            prices={optibrushPrices}
            pendingChanges={pendingOptibrushChanges}
            onChange={onOptibrushPriceChange}
          />
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="font-semibold text-gray-800 mb-3">Nastavitve</div>
        <div className={`flex items-center justify-between gap-2 p-3 rounded ${pendingOptibrushShape ? 'bg-yellow-50' : 'bg-gray-50'}`}>
          <label className="text-gray-700">Posebne oblike Optibrush</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              value={displayOptibrushShape}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  const multiplier = 1 + val / 100;
                  onSettingChange('optibrush_special_shape_multiplier', optibrushShapeValue, multiplier);
                }
              }}
              className={`w-20 p-2 border rounded text-right text-sm ${pendingOptibrushShape ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
            <span className="text-gray-500">+%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

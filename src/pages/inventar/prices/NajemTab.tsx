/**
 * @file NajemTab.tsx
 * @description Zavihek NAJEM - vse kategorije predpražnikov za najem
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Percent, RefreshCw } from 'lucide-react';
import type { MatPrice, CustomM2Price } from '@/hooks/usePrices';
import type { PendingMatChange, PendingCustomM2Change, PendingSettingChange } from './usePriceChanges';

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-100 flex items-center justify-between hover:bg-gray-200 transition-colors"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && <div className="p-0">{children}</div>}
    </div>
  );
}

// Najem price fields (brez price_purchase - ta gre v Odkup stolpec)
const NAJEM_FIELDS = ['price_week_1', 'price_week_2', 'price_week_3', 'price_week_4'] as const;
const ODKUP_FIELD = 'price_purchase';

interface MatTableProps {
  prices: MatPrice[];
  pendingChanges: Map<string, PendingMatChange>;
  onChange: (id: string, field: string, oldValue: number, newValue: number) => void;
}

function MatTable({ prices, pendingChanges, onChange }: MatTableProps) {
  const getValue = (price: MatPrice, field: string) => {
    const key = `${price.id}-${field}`;
    const pending = pendingChanges.get(key);
    return pending?.newValue ?? (price[field as keyof MatPrice] as number);
  };

  const isFieldChanged = (priceId: string, field: string) => {
    const key = `${priceId}-${field}`;
    return pendingChanges.has(key);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Produkt</th>
            <th className="px-3 py-2 text-right font-medium">1 teden</th>
            <th className="px-3 py-2 text-right font-medium">2 tedna</th>
            <th className="px-3 py-2 text-right font-medium">3 tedne</th>
            <th className="px-3 py-2 text-right font-medium">4 tedne</th>
            <th className="px-3 py-2 text-right font-medium">Odkup</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((price) => {
            const hasAnyChange = [...NAJEM_FIELDS, ODKUP_FIELD].some(f => isFieldChanged(price.id, f));
            return (
              <tr
                key={price.id}
                className={`border-t hover:bg-gray-50 ${hasAnyChange ? 'bg-yellow-50' : ''}`}
              >
                <td className="px-3 py-2 font-medium">{price.code}</td>
                {NAJEM_FIELDS.map((field) => {
                  const isChanged = isFieldChanged(price.id, field);
                  const originalValue = price[field as keyof MatPrice] as number;
                  return (
                    <td key={field} className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={getValue(price, field)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onChange(price.id, field, originalValue, val);
                        }}
                        className={`w-20 p-1 border rounded text-right text-sm ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
                      />
                    </td>
                  );
                })}
                {/* Odkup stolpec */}
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={getValue(price, ODKUP_FIELD)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) onChange(price.id, ODKUP_FIELD, price.price_purchase, val);
                    }}
                    className={`w-20 p-1 border rounded text-right text-sm ${isFieldChanged(price.id, ODKUP_FIELD) ? 'border-yellow-400 bg-yellow-50' : ''}`}
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

interface CustomM2TableInlineProps {
  prices: CustomM2Price[] | undefined;
  pendingChanges: Map<string, PendingCustomM2Change>;
  onChange: (id: string, oldValue: number, newValue: number) => void;
}

function CustomM2TableInline({ prices, pendingChanges, onChange }: CustomM2TableInlineProps) {
  // Group by size_category, then by frequency
  const smallPrices = prices?.filter(p => p.size_category === 'small').sort((a, b) => parseInt(a.frequency) - parseInt(b.frequency)) || [];
  const largePrices = prices?.filter(p => p.size_category === 'large').sort((a, b) => parseInt(a.frequency) - parseInt(b.frequency)) || [];

  const renderRow = (label: string, pricesList: CustomM2Price[]) => (
    <tr className="border-t">
      <td className="px-3 py-2 font-medium">{label}</td>
      {[1, 2, 3, 4].map(freq => {
        const price = pricesList.find(p => p.frequency === String(freq));
        if (!price) return <td key={freq} className="px-3 py-2">-</td>;

        const pending = pendingChanges.get(price.id);
        const currentValue = pending?.newValue ?? price.price_per_m2;
        const isChanged = pending !== undefined;

        return (
          <td key={freq} className="px-3 py-2">
            <input
              type="number"
              step="0.001"
              value={currentValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onChange(price.id, price.price_per_m2, val);
              }}
              className={`w-20 p-1 border rounded text-right text-sm ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Kategorija (€/m²)</th>
            <th className="px-3 py-2 text-right font-medium">1 teden</th>
            <th className="px-3 py-2 text-right font-medium">2 tedna</th>
            <th className="px-3 py-2 text-right font-medium">3 tedne</th>
            <th className="px-3 py-2 text-right font-medium">4 tedne</th>
          </tr>
        </thead>
        <tbody>
          {renderRow('Special 1m² - 2m²', smallPrices)}
          {renderRow('Special >2m²', largePrices)}
        </tbody>
      </table>
    </div>
  );
}

interface NajemTabProps {
  matPrices: MatPrice[] | undefined;
  customM2Prices: CustomM2Price[] | undefined;
  settings: { special_shape_multiplier?: number } | undefined;
  pendingMatChanges: Map<string, PendingMatChange>;
  pendingCustomM2Changes: Map<string, PendingCustomM2Change>;
  pendingSettingChanges: Map<string, PendingSettingChange>;
  onMatPriceChange: (id: string, field: string, oldValue: number, newValue: number) => void;
  onCustomM2PriceChange: (id: string, oldValue: number, newValue: number) => void;
  onSettingChange: (key: string, oldValue: number, newValue: number) => void;
  onBulkIncrease: (percentage: number) => Promise<void>;
  isBulkLoading: boolean;
}

export function NajemTab({
  matPrices,
  customM2Prices,
  settings,
  pendingMatChanges,
  pendingCustomM2Changes,
  pendingSettingChanges,
  onMatPriceChange,
  onCustomM2PriceChange,
  onSettingChange,
  onBulkIncrease,
  isBulkLoading,
}: NajemTabProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    poslovni: true,
    ergonomski: false,
    zunanji: false,
    design: false,
  });
  const [bulkPercentage, setBulkPercentage] = useState('');

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const poslovniPrices = matPrices?.filter(p => p.category === 'poslovni') || [];
  const ergonomskiPrices = matPrices?.filter(p => p.category === 'ergonomski') || [];
  const zunanjiPrices = matPrices?.filter(p => p.category === 'zunanji') || [];
  const designPrices = matPrices?.filter(p => p.category === 'design') || [];

  const handleBulkApply = async () => {
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct === 0) return;
    await onBulkIncrease(pct);
    setBulkPercentage('');
  };

  // Settings
  const specialShapeValue = settings?.special_shape_multiplier || 1.5;
  const pendingSetting = pendingSettingChanges.get('special_shape_multiplier');
  const displaySpecialShape = pendingSetting
    ? (pendingSetting.newValue - 1) * 100
    : (specialShapeValue - 1) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg">
        <h2 className="text-lg font-bold">NAJEM PREDPRAŽNIKOV</h2>
      </div>

      {/* Bulk increase */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Percent size={18} className="text-blue-500" />
          <span className="font-medium">SPREMEMBA CENIKA (VSE)</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            value={bulkPercentage}
            onChange={(e) => setBulkPercentage(e.target.value)}
            className="w-24 p-2 border rounded text-sm"
            placeholder="5"
          />
          <span className="text-gray-500">%</span>
          <button
            onClick={handleBulkApply}
            disabled={isBulkLoading || !bulkPercentage}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 flex items-center gap-2"
          >
            {isBulkLoading ? <RefreshCw size={16} className="animate-spin" /> : null}
            UPORABI
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pozitivna vrednost poviša cene, negativna zniža (npr. -5 za 5% znižanje)
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <CollapsibleSection
          title="POSLOVNI PREDPRAŽNIKI"
          isOpen={openSections.poslovni}
          onToggle={() => toggleSection('poslovni')}
        >
          <MatTable prices={poslovniPrices} pendingChanges={pendingMatChanges} onChange={onMatPriceChange} />
        </CollapsibleSection>

        <CollapsibleSection
          title="ERGONOMSKI PREDPRAŽNIKI"
          isOpen={openSections.ergonomski}
          onToggle={() => toggleSection('ergonomski')}
        >
          <MatTable prices={ergonomskiPrices} pendingChanges={pendingMatChanges} onChange={onMatPriceChange} />
        </CollapsibleSection>

        <CollapsibleSection
          title="ZUNANJI PREDPRAŽNIKI"
          isOpen={openSections.zunanji}
          onToggle={() => toggleSection('zunanji')}
        >
          <MatTable prices={zunanjiPrices} pendingChanges={pendingMatChanges} onChange={onMatPriceChange} />
        </CollapsibleSection>

        <CollapsibleSection
          title="DESIGN PREDPRAŽNIKI"
          isOpen={openSections.design}
          onToggle={() => toggleSection('design')}
        >
          <MatTable prices={designPrices} pendingChanges={pendingMatChanges} onChange={onMatPriceChange} />
        </CollapsibleSection>
      </div>

      {/* Custom M2 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 font-semibold text-gray-800">
          CUSTOM M2
        </div>
        <CustomM2TableInline
          prices={customM2Prices}
          pendingChanges={pendingCustomM2Changes}
          onChange={onCustomM2PriceChange}
        />
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="font-semibold text-gray-800 mb-3">Splošne nastavitve</div>
        <div className={`flex items-center justify-between gap-2 p-3 rounded ${pendingSetting ? 'bg-yellow-50' : 'bg-gray-50'}`}>
          <label className="text-gray-700">Posebne oblike najem</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              value={displaySpecialShape}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  const multiplier = 1 + val / 100;
                  onSettingChange('special_shape_multiplier', specialShapeValue, multiplier);
                }
              }}
              className={`w-20 p-2 border rounded text-right text-sm ${pendingSetting ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
            <span className="text-gray-500">+%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

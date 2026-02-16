/**
 * @file OfferItemsNajemStep.tsx
 * @description Korak 2b: Konfiguracija artiklov za najem
 * - Standardni, Design ali Custom tip
 * - Sezonske menjave z dvema obdobjema
 * - Podpora za primerjava/dodatna (najem + nakup artikli)
 */

import { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { OfferItem, OfferType, ItemType, OfferTotals } from './types';
import {
  OPTIBRUSH_STANDARD_SIZES,
  calculateOptibrushPrice,
  getPriceCategoryLabel,
  OptibrushConfig,
} from '@/hooks/useOptibrushPrices';
import {
  useOptibrushPricesFromDB,
  usePriceSettings,
  calculateOptibrushPriceFromDB,
} from '@/hooks/usePrices';

interface WeekOption {
  value: number;
  label: string;
}

interface StandardType {
  code: string;
  label: string;
}

interface DesignSize {
  code: string;
  label: string;
  dimensions: string;
}

interface OfferItemsNajemStepProps {
  items: OfferItem[];
  offerType: OfferType;
  offerFrequency: string;
  standardTypes: StandardType[];
  designSizes: DesignSize[];
  weeks: WeekOption[];
  // Callbacks for item management
  onItemTypeChange: (itemId: string, type: ItemType) => void;
  onStandardSelect: (itemId: string, code: string) => void;
  onDesignSelect: (itemId: string, code: string) => void;
  onCustomDimensionsChange: (itemId: string, dimensions: string) => void;
  onSpecialShapeChange: (itemId: string, specialShape: boolean) => void;
  onPurposeChange: (itemId: string, purpose: 'najem' | 'nakup') => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onPriceChange: (itemId: string, price: number) => void;
  onDiscountChange: (itemId: string, discount: number) => void;
  onReplacementCostChange: (itemId: string, cost: number) => void;
  onCustomizedChange: (itemId: string, customized: boolean) => void;
  onFrequencyOverride: (itemId: string, frequency: string | undefined) => void;
  onSeasonalToggle: (itemId: string, seasonal: boolean) => void;
  onOptibrushChange: (itemId: string, updates: Partial<OfferItem>) => void;
  // Seasonal callbacks
  onNormalFrequencyChange: (itemId: string, frequency: string) => void;
  onNormalPriceChange: (itemId: string, price: number) => void;
  onNormalDiscountChange: (itemId: string, discount: number) => void;
  onNormalFromWeekChange: (itemId: string, week: number) => void;
  onNormalToWeekChange: (itemId: string, week: number) => void;
  onSeasonalFrequencyChange: (itemId: string, frequency: string) => void;
  onSeasonalPriceChange: (itemId: string, price: number) => void;
  onSeasonalDiscountChange: (itemId: string, discount: number) => void;
  onSeasonalFromWeekChange: (itemId: string, week: number) => void;
  onSeasonalToWeekChange: (itemId: string, week: number) => void;
  // Navigation
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onBack: () => void;
  onNext: () => void;
  // Totals
  calculateTotals: () => OfferTotals;
}

export default function OfferItemsNajemStep({
  items,
  offerType,
  offerFrequency,
  standardTypes,
  designSizes,
  weeks,
  onItemTypeChange,
  onStandardSelect,
  onDesignSelect,
  onCustomDimensionsChange,
  onSpecialShapeChange,
  onPurposeChange,
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onReplacementCostChange,
  onCustomizedChange,
  onFrequencyOverride,
  onSeasonalToggle,
  onOptibrushChange,
  onNormalFrequencyChange,
  onNormalPriceChange,
  onNormalDiscountChange,
  onNormalFromWeekChange,
  onNormalToWeekChange,
  onSeasonalFrequencyChange,
  onSeasonalPriceChange,
  onSeasonalDiscountChange,
  onSeasonalFromWeekChange,
  onSeasonalToWeekChange,
  onAddItem,
  onRemoveItem,
  onBack,
  onNext,
  calculateTotals,
}: OfferItemsNajemStepProps) {
  // Fetch optibrush prices from DB
  const { data: optibrushPricesDB } = useOptibrushPricesFromDB();
  const { data: priceSettings } = usePriceSettings();

  // Validation - different for optibrush items
  const isValid = !items.some(i => {
    if (i.itemType === 'optibrush') {
      return !i.optibrushWidthCm || !i.optibrushHeightCm || i.pricePerUnit <= 0;
    }
    return !i.code || i.pricePerUnit <= 0;
  });
  const isPrimerjajaOrDodatna = offerType === 'primerjava' || offerType === 'dodatna';

  const najemItems = items.filter(i => i.purpose !== 'nakup');
  const nakupItems = items.filter(i => i.purpose === 'nakup');
  const totals = calculateTotals();

  // Optibrush helper functions
  const getOptibrushConfig = (item: OfferItem): OptibrushConfig => ({
    hasEdge: item.optibrushHasEdge ?? true,
    colorCount: item.optibrushColorCount ?? '1',
    hasDrainage: item.optibrushHasDrainage ?? false,
    specialShape: item.optibrushSpecialShape ?? false,
    widthCm: item.optibrushWidthCm || 0,
    heightCm: item.optibrushHeightCm || 0,
  });

  // Izračunaj optibrush ceno - uporabi DB cene če so na voljo
  const calculateOptibrush = (item: OfferItem) => {
    if (item.itemType !== 'optibrush') return null;
    if (!item.optibrushWidthCm || !item.optibrushHeightCm) return null;

    const config = getOptibrushConfig(item);
    const m2 = (config.widthCm * config.heightCm) / 10000;
    const isStandard = config.hasEdge && OPTIBRUSH_STANDARD_SIZES.some(
      s => (s.width === config.widthCm && s.height === config.heightCm) ||
           (s.width === config.heightCm && s.height === config.widthCm)
    );
    const isLarge = m2 > 7.5;

    // Try DB calculation first
    if (optibrushPricesDB && priceSettings) {
      const dbResult = calculateOptibrushPriceFromDB(
        optibrushPricesDB,
        {
          hasEdge: config.hasEdge,
          hasDrainage: config.hasDrainage,
          isStandard,
          isLarge,
          colorCount: config.colorCount,
          m2,
          specialShape: config.specialShape,
        },
        priceSettings
      );
      if (dbResult) {
        return { ...dbResult, m2: Math.round(m2 * 100) / 100 };
      }
    }

    // Fallback to local calculation
    return calculateOptibrushPrice(config);
  };

  // Ref za sledenje prejšnjim vrednostim da preprečimo nepotrebne update-e
  const prevItemsRef = useRef<string>('');

  // Avtomatsko izračunaj in nastavi ceno za Optibrush artikle
  useEffect(() => {
    // Ustvari hash trenutnih optibrush konfiguracij
    const currentHash = items
      .filter(i => i.itemType === 'optibrush')
      .map(i => `${i.id}-${i.optibrushHasEdge}-${i.optibrushColorCount}-${i.optibrushHasDrainage}-${i.optibrushSpecialShape}-${i.optibrushWidthCm}-${i.optibrushHeightCm}`)
      .join('|');

    // Če se ni nič spremenilo, ne naredi nič
    if (currentHash === prevItemsRef.current) return;
    prevItemsRef.current = currentHash;

    // Za vsak optibrush artikel izračunaj in nastavi ceno
    items.forEach(item => {
      if (item.itemType !== 'optibrush') return;
      if (!item.optibrushWidthCm || !item.optibrushHeightCm) return;

      const calc = calculateOptibrush(item);

      if (calc && calc.totalPrice !== item.pricePerUnit) {
        const sizeStr = `${item.optibrushWidthCm}x${item.optibrushHeightCm}`;
        onOptibrushChange(item.id, {
          pricePerUnit: calc.totalPrice,
          optibrushPricePerM2: calc.pricePerM2,
          code: `OPTIBRUSH-${sizeStr}`,
          name: `Optibrush ${sizeStr} cm`,
          size: sizeStr,
          m2: calc.m2,
        });
      }
    });
  }, [items, onOptibrushChange, optibrushPricesDB, priceSettings]);

  const getHeaderText = () => {
    if (offerType === 'primerjava') return 'Artikli (najem + nakup)';
    if (offerType === 'dodatna') return 'Artikli';
    return 'Najem';
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-2 rounded text-sm text-center font-medium">
        🔄 {getHeaderText()} - menjava na {offerFrequency} {offerFrequency === '1' ? 'teden' : 'tedne'}
        {items.some(i => i.frequencyOverride && i.purpose !== 'nakup') && (
          <span className="text-amber-600 ml-1">(+ individualne)</span>
        )}
      </div>

      <div className="space-y-3 max-h-[40vh] overflow-y-auto">
        {items.map((item, index) => (
          <div key={item.id} className={`border rounded-lg p-3 space-y-2 ${item.purpose === 'nakup' ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                Artikel {index + 1}
                {item.purpose === 'nakup' && <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">NAKUP</span>}
              </span>
              {items.length > 1 && (
                <button onClick={() => onRemoveItem(item.id)} className="text-red-500 p-1"><Trash2 size={18} /></button>
              )}
            </div>

            {/* Item type selector */}
            <div className="grid grid-cols-3 gap-1">
              {item.purpose !== 'nakup' && (
                <button
                  onClick={() => onItemTypeChange(item.id, 'standard')}
                  className={`py-1 px-2 text-xs rounded ${item.itemType === 'standard' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  Standardni
                </button>
              )}
              <button
                onClick={() => onItemTypeChange(item.id, 'design')}
                className={`py-1 px-2 text-xs rounded ${item.itemType === 'design' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                Design
              </button>
              <button
                onClick={() => onItemTypeChange(item.id, 'custom')}
                className={`py-1 px-2 text-xs rounded ${item.itemType === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                Custom
              </button>
              {item.purpose === 'nakup' && (
                <button
                  onClick={() => onItemTypeChange(item.id, 'optibrush')}
                  className={`py-1 px-2 text-xs rounded ${item.itemType === 'optibrush' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
                >
                  Optibrush
                </button>
              )}
            </div>

            {/* Standard type selector */}
            {item.itemType === 'standard' && (
              <select
                value={item.code}
                onChange={(e) => onStandardSelect(item.id, e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">Izberi tip...</option>
                {standardTypes.map(t => (<option key={t.code} value={t.code}>{t.label}</option>))}
              </select>
            )}

            {/* Design size selector */}
            {item.itemType === 'design' && (
              <select
                value={item.code}
                onChange={(e) => onDesignSelect(item.id, e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">Izberi velikost...</option>
                {designSizes.map(d => (<option key={d.code} value={d.code}>{d.label}</option>))}
              </select>
            )}

            {/* Custom dimensions input */}
            {item.itemType === 'custom' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500">Dimenzije (cm)</label>
                  <input
                    type="text"
                    value={item.size}
                    onChange={(e) => onCustomDimensionsChange(item.id, e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="npr. 120*180"
                  />
                  {item.m2 && item.m2 > 0 && (
                    <div className={`text-xs mt-1 ${item.specialShape ? 'text-purple-600' : 'text-gray-500'}`}>
                      📐 {item.m2.toFixed(2)} m² {item.specialShape && `× ${priceSettings?.special_shape_multiplier || 1.5}`} {item.purpose === 'nakup' ? `× ${priceSettings?.design_purchase_price_per_m2 || 165}€ = ${item.pricePerUnit.toFixed(2)}€` : `→ ${item.m2 <= 2 ? '≤2m² tarifa' : '>2m² tarifa'}`}
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm bg-purple-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={item.specialShape ?? false}
                    onChange={(e) => onSpecialShapeChange(item.id, e.target.checked)}
                  />
                  <span>Posebna oblika <span className="text-purple-600 font-medium">(+50%)</span></span>
                </label>
              </div>
            )}

            {/* Purpose selector - only for primerjava and dodatna */}
            {isPrimerjajaOrDodatna && (
              <select
                value={item.purpose || 'najem'}
                onChange={(e) => onPurposeChange(item.id, e.target.value as 'najem' | 'nakup')}
                className={`w-full p-2 border rounded text-sm font-medium ${item.purpose === 'nakup' ? 'bg-yellow-100 border-yellow-400' : 'bg-blue-50 border-blue-300'}`}
              >
                <option value="najem">🔄 NAJEM (menjava)</option>
                <option value="nakup">💰 NAKUP (enkratno)</option>
              </select>
            )}

            {/* NAJEM fields */}
            {item.purpose !== 'nakup' && (
              <>
                {/* Per-item frequency override */}
                {!item.seasonal && (
                  <div>
                    <label className="block text-xs text-gray-500">Frekvenca menjave</label>
                    <select
                      value={item.frequencyOverride || ''}
                      onChange={(e) => onFrequencyOverride(item.id, e.target.value || undefined)}
                      className={`w-full p-2 border rounded text-sm ${item.frequencyOverride ? 'border-amber-400 bg-amber-50 font-medium' : ''}`}
                    >
                      <option value="">Globalna ({offerFrequency} {offerFrequency === '1' ? 't.' : 't.'})</option>
                      <option value="1">1 teden</option>
                      <option value="2">2 tedna</option>
                      <option value="3">3 tedne</option>
                      <option value="4">4 tedne</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500">Količina</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          onQuantityChange(item.id, 0);
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) onQuantityChange(item.id, num);
                        }
                      }}
                      onBlur={() => {
                        if (!item.quantity || item.quantity < 1) {
                          onQuantityChange(item.id, 1);
                        }
                      }}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Cena/teden €</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.pricePerUnit || ''}
                      onChange={(e) => onPriceChange(item.id, parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Popust %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount || ''}
                      onChange={(e) => onDiscountChange(item.id, e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                {item.discount && item.discount > 0 && item.originalPrice && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    💰 Izhodiščna: {item.originalPrice.toFixed(2)} €/teden → <span className="font-bold">-{item.discount}%</span> = {item.pricePerUnit.toFixed(2)} €/teden
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500">Povračilo (izguba) €</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.replacementCost || ''}
                    onChange={(e) => onReplacementCostChange(item.id, parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.customized}
                      onChange={(e) => onCustomizedChange(item.id, e.target.checked)}
                    />
                    Prilagojen
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.seasonal || false}
                      onChange={(e) => onSeasonalToggle(item.id, e.target.checked)}
                    />
                    Sezonske menjave
                  </label>
                </div>

                {/* Seasonal section - DVE OBDOBJI */}
                {item.seasonal && (
                  <div className="space-y-2">
                    {/* NORMALNO OBDOBJE */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
                      <div className="text-sm text-blue-800 font-medium">☀️ OBDOBJE 1</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-blue-700 mb-1">Frekvenca menjave</label>
                          <select
                            value={item.normalFrequency || '4'}
                            onChange={(e) => onNormalFrequencyChange(item.id, e.target.value)}
                            className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                          >
                            <option value="1">1 teden</option>
                            <option value="2">2 tedna</option>
                            <option value="4">4 tedne</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-blue-700 mb-1">Cena/teden €</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.normalPrice || ''}
                            onChange={(e) => onNormalPriceChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">Obdobje (od tedna → do tedna)</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={item.normalFromWeek || 13}
                            onChange={(e) => onNormalFromWeekChange(item.id, parseInt(e.target.value))}
                            className="flex-1 p-2 border border-blue-300 rounded text-sm bg-white"
                          >
                            {weeks.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                          </select>
                          <span className="text-blue-500 font-bold">→</span>
                          <select
                            value={item.normalToWeek || 44}
                            onChange={(e) => onNormalToWeekChange(item.id, parseInt(e.target.value))}
                            className="flex-1 p-2 border border-blue-300 rounded text-sm bg-white"
                          >
                            {weeks.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">Popust %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.normalDiscount || ''}
                          onChange={(e) => onNormalDiscountChange(item.id, e.target.value === '' ? 0 : parseInt(e.target.value))}
                          className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                          placeholder="0"
                        />
                      </div>
                      {item.normalDiscount && item.normalDiscount > 0 && item.normalOriginalPrice && (
                        <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                          💰 Izhodiščna: {item.normalOriginalPrice.toFixed(2)} € → <span className="font-bold">-{item.normalDiscount}%</span> = {item.normalPrice?.toFixed(2)} €
                        </div>
                      )}
                    </div>

                    {/* SEZONSKO OBDOBJE */}
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 space-y-3">
                      <div className="text-sm text-orange-800 font-medium">❄️ OBDOBJE 2</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-orange-700 mb-1">Frekvenca menjave</label>
                          <select
                            value={item.seasonalFrequency || '1'}
                            onChange={(e) => onSeasonalFrequencyChange(item.id, e.target.value)}
                            className="w-full p-2 border border-orange-300 rounded text-sm bg-white"
                          >
                            <option value="1">1 teden</option>
                            <option value="2">2 tedna</option>
                            <option value="4">4 tedne</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-orange-700 mb-1">Cena/teden €</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.seasonalPrice || ''}
                            onChange={(e) => onSeasonalPriceChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-orange-300 rounded text-sm bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-orange-700 mb-1">Obdobje (od tedna → do tedna)</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={item.seasonalFromWeek || 45}
                            onChange={(e) => onSeasonalFromWeekChange(item.id, parseInt(e.target.value))}
                            className="flex-1 p-2 border border-orange-300 rounded text-sm bg-white"
                          >
                            {weeks.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                          </select>
                          <span className="text-orange-500 font-bold">→</span>
                          <select
                            value={item.seasonalToWeek || 12}
                            onChange={(e) => onSeasonalToWeekChange(item.id, parseInt(e.target.value))}
                            className="flex-1 p-2 border border-orange-300 rounded text-sm bg-white"
                          >
                            {weeks.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-orange-700 mb-1">Popust %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.seasonalDiscount || ''}
                          onChange={(e) => onSeasonalDiscountChange(item.id, e.target.value === '' ? 0 : parseInt(e.target.value))}
                          className="w-full p-2 border border-orange-300 rounded text-sm bg-white"
                          placeholder="0"
                        />
                      </div>
                      {item.seasonalDiscount && item.seasonalDiscount > 0 && item.seasonalOriginalPrice && (
                        <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                          💰 Izhodiščna: {item.seasonalOriginalPrice.toFixed(2)} € → <span className="font-bold">-{item.seasonalDiscount}%</span> = {item.seasonalPrice?.toFixed(2)} €
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* NAKUP fields - simplified */}
            {item.purpose === 'nakup' && (
              <>
                {/* Optibrush configuration for nakup */}
                {item.itemType === 'optibrush' && (
                  <div className="space-y-2 bg-orange-50 p-2 rounded">
                    {/* Z robom / brez roba */}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => onOptibrushChange(item.id, { optibrushHasEdge: true })}
                        className={`py-1 px-2 text-xs rounded ${item.optibrushHasEdge !== false ? 'bg-orange-500 text-white' : 'bg-white border'}`}
                      >
                        Z robom
                      </button>
                      <button
                        onClick={() => onOptibrushChange(item.id, { optibrushHasEdge: false })}
                        className={`py-1 px-2 text-xs rounded ${item.optibrushHasEdge === false ? 'bg-orange-500 text-white' : 'bg-white border'}`}
                      >
                        Brez roba
                      </button>
                    </div>

                    {/* Število barv */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Število barv</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => onOptibrushChange(item.id, { optibrushColorCount: '1' })}
                          className={`py-1 px-2 text-xs rounded ${(item.optibrushColorCount ?? '1') === '1' ? 'bg-orange-500 text-white' : 'bg-white border'}`}
                        >
                          1 barva
                        </button>
                        <button
                          onClick={() => onOptibrushChange(item.id, { optibrushColorCount: '2-3' })}
                          className={`py-1 px-2 text-xs rounded ${item.optibrushColorCount === '2-3' ? 'bg-orange-500 text-white' : 'bg-white border'}`}
                        >
                          2-3 barve
                        </button>
                      </div>
                    </div>

                    {/* Dimenzije - izbira ali ročni vnos */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Dimenzije</label>
                      {item.optibrushHasEdge !== false ? (
                        <>
                          {(() => {
                            const isStandardSize = OPTIBRUSH_STANDARD_SIZES.some(
                              s => s.width === item.optibrushWidthCm && s.height === item.optibrushHeightCm
                            );
                            const selectValue = isStandardSize
                              ? `${item.optibrushWidthCm}x${item.optibrushHeightCm}`
                              : 'custom';

                            return (
                              <>
                                <select
                                  value={selectValue}
                                  onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                      onOptibrushChange(item.id, { optibrushWidthCm: 0, optibrushHeightCm: 0 });
                                    } else {
                                      const [w, h] = e.target.value.split('x').map(Number);
                                      onOptibrushChange(item.id, { optibrushWidthCm: w, optibrushHeightCm: h });
                                    }
                                  }}
                                  className="w-full p-2 border rounded text-sm bg-white"
                                >
                                  <option value="custom">Po meri...</option>
                                  {OPTIBRUSH_STANDARD_SIZES.map(s => (
                                    <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>
                                      {s.label} ({s.m2.toFixed(2)} m²)
                                    </option>
                                  ))}
                                </select>
                                {/* Ročni vnos če je izbrano "Po meri" */}
                                {!isStandardSize && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                      <label className="block text-xs text-gray-500">Širina (cm)</label>
                                      <input
                                        type="number"
                                        value={item.optibrushWidthCm || ''}
                                        onChange={(e) => onOptibrushChange(item.id, { optibrushWidthCm: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                                        className="w-full p-2 border rounded text-sm"
                                        placeholder="cm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500">Višina (cm)</label>
                                      <input
                                        type="number"
                                        value={item.optibrushHeightCm || ''}
                                        onChange={(e) => onOptibrushChange(item.id, { optibrushHeightCm: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                                        className="w-full p-2 border rounded text-sm"
                                        placeholder="cm"
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        /* Brez roba - samo ročni vnos */
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Širina (cm)</label>
                            <input
                              type="number"
                              value={item.optibrushWidthCm || ''}
                              onChange={(e) => onOptibrushChange(item.id, { optibrushWidthCm: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                              className="w-full p-2 border rounded text-sm"
                              placeholder="cm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Višina (cm)</label>
                            <input
                              type="number"
                              value={item.optibrushHeightCm || ''}
                              onChange={(e) => onOptibrushChange(item.id, { optibrushHeightCm: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                              className="w-full p-2 border rounded text-sm"
                              placeholder="cm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dodatne opcije */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={item.optibrushHasDrainage ?? false}
                          onChange={(e) => onOptibrushChange(item.id, { optibrushHasDrainage: e.target.checked })}
                        />
                        Drenažne luknjice
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={item.optibrushSpecialShape ?? false}
                          onChange={(e) => onOptibrushChange(item.id, { optibrushSpecialShape: e.target.checked })}
                        />
                        Posebna oblika (+30%)
                      </label>
                    </div>

                    {/* Prikaz izračunane cene */}
                    {(() => {
                      const calc = calculateOptibrush(item);
                      if (calc) {
                        const config = getOptibrushConfig(item);
                        const categoryLabel = getPriceCategoryLabel(config, calc.m2);
                        return (
                          <div className="bg-white p-2 rounded text-xs space-y-1 border border-orange-200">
                            <div className="text-gray-500">{categoryLabel}</div>
                            <div className="flex justify-between">
                              <span>Površina:</span>
                              <span className="font-medium">{calc.m2} m²</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cena/m²:</span>
                              <span className="font-medium">{calc.pricePerM2.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-orange-700 font-bold pt-1 border-t">
                              <span>Cena/kos:</span>
                              <span>{calc.totalPrice.toFixed(2)} €</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Količina, cena za nakup */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500">Količina</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          onQuantityChange(item.id, 0);
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) onQuantityChange(item.id, num);
                        }
                      }}
                      onBlur={() => {
                        if (!item.quantity || item.quantity < 1) {
                          onQuantityChange(item.id, 1);
                        }
                      }}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Cena/kos €</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.pricePerUnit || ''}
                      onChange={(e) => onPriceChange(item.id, parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border rounded text-sm bg-yellow-50"
                    />
                  </div>
                </div>
                {item.itemType !== 'optibrush' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.customized}
                      onChange={(e) => onCustomizedChange(item.id, e.target.checked)}
                    />
                    Prilagojen
                  </label>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onAddItem}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 flex items-center justify-center gap-2"
      >
        <Plus size={18} /> Dodaj artikel
      </button>

      {/* Summary - different layout for primerjava/dodatna */}
      {isPrimerjajaOrDodatna ? (
        <div className="space-y-2">
          {/* NAJEM summary */}
          {najemItems.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-600 font-medium mb-1">🔄 NAJEM</div>
              <div className="flex justify-between text-sm">
                <span>Artiklov za najem:</span>
                <span className="font-bold">{najemItems.reduce((sum, i) => sum + i.quantity, 0)} KOS</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Frekvenca:</span>
                <span className="font-bold">{offerFrequency} {offerFrequency === '1' ? 'TEDEN' : 'TEDNE'}</span>
              </div>
              <div className="flex justify-between text-base mt-2 pt-2 border-t border-blue-200">
                <span>4-tedenski obračun:</span>
                <span className="font-bold">
                  {(najemItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0) * 4).toFixed(2)} €
                </span>
              </div>
            </div>
          )}
          {/* NAKUP summary */}
          {nakupItems.length > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-xs text-yellow-700 font-medium mb-1">💰 NAKUP</div>
              <div className="flex justify-between text-sm">
                <span>Artiklov za nakup:</span>
                <span className="font-bold">{nakupItems.reduce((sum, i) => sum + i.quantity, 0)} KOS</span>
              </div>
              <div className="flex justify-between text-base mt-2 pt-2 border-t border-yellow-300">
                <span>Skupaj nakup:</span>
                <span className="font-bold">
                  {(nakupItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0)).toFixed(2)} €
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Število artiklov:</span>
            <span className="font-bold">{totals.totalItems} KOS</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>Frekvenca:</span>
            <span className="font-bold">{offerFrequency} {offerFrequency === '1' ? 'TEDEN' : 'TEDNE'}</span>
          </div>
          <div className="flex justify-between text-lg mt-2 pt-2 border-t border-blue-200">
            <span>4-tedenski obračun:</span>
            <span className="font-bold">{totals.fourWeekTotal?.toFixed(2)} €</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 border rounded">← Nazaj</button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
        >
          Predogled →
        </button>
      </div>
    </div>
  );
}

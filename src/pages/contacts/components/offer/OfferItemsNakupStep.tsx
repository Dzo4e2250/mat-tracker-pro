/**
 * @file OfferItemsNakupStep.tsx
 * @description Korak 2a: Konfiguracija artiklov za nakup
 */

import { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { OfferItem, ItemType, OfferTotals } from './types';
import { DESIGN_SIZES } from '@/utils/priceList';
import {
  OPTIBRUSH_STANDARD_SIZES,
  calculateOptibrushPrice,
  getPriceCategoryLabel,
  OptibrushConfig,
} from '@/hooks/useOptibrushPrices';

interface OfferItemsNakupStepProps {
  items: OfferItem[];
  hasNajem: boolean;
  totals: OfferTotals;
  onItemTypeChange: (itemId: string, type: ItemType) => void;
  onDesignSizeSelect: (itemId: string, code: string) => void;
  onCustomDimensionsChange: (itemId: string, dimensions: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onPriceChange: (itemId: string, price: number) => void;
  onDiscountChange: (itemId: string, discount: number) => void;
  onCustomizedChange: (itemId: string, customized: boolean) => void;
  onOptibrushChange: (itemId: string, updates: Partial<OfferItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Korak za konfiguracijo nakup artiklov
 * - Design, Custom ali Optibrush tip
 * - Količina, cena, popust
 * - Skupna vrednost
 */
export default function OfferItemsNakupStep({
  items,
  hasNajem,
  totals,
  onItemTypeChange,
  onDesignSizeSelect,
  onCustomDimensionsChange,
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onCustomizedChange,
  onOptibrushChange,
  onAddItem,
  onRemoveItem,
  onBack,
  onNext,
}: OfferItemsNakupStepProps) {
  const isValid = !items.some(i => {
    if (i.itemType === 'optibrush') {
      return !i.optibrushWidthCm || !i.optibrushHeightCm || i.pricePerUnit <= 0;
    }
    return !i.code || i.pricePerUnit <= 0;
  });

  // Pripravi konfiguracijo za izračun
  const getOptibrushConfig = (item: OfferItem): OptibrushConfig => ({
    hasEdge: item.optibrushHasEdge ?? true,
    colorCount: item.optibrushColorCount ?? '1',
    hasDrainage: item.optibrushHasDrainage ?? false,
    specialShape: item.optibrushSpecialShape ?? false,
    widthCm: item.optibrushWidthCm || 0,
    heightCm: item.optibrushHeightCm || 0,
  });

  // Izračunaj optibrush ceno
  const calculateOptibrush = (item: OfferItem) => {
    if (item.itemType !== 'optibrush') return null;
    if (!item.optibrushWidthCm || !item.optibrushHeightCm) return null;
    return calculateOptibrushPrice(getOptibrushConfig(item));
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

      const calc = calculateOptibrushPrice(getOptibrushConfig(item));

      if (calc && calc.totalPrice !== item.pricePerUnit) {
        const sizeStr = `${item.optibrushWidthCm}x${item.optibrushHeightCm}`;
        // Združi vse update-e v en klic da preprečimo race condition
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
  }, [items, onOptibrushChange]);

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 p-2 rounded text-sm text-center font-medium">
        💰 Nakup - enkratni nakup
      </div>

      <div className="space-y-3 max-h-[40vh] overflow-y-auto">
        {items.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Artikel {index + 1}</span>
              {items.length > 1 && (
                <button onClick={() => onRemoveItem(item.id)} className="text-red-500 p-1">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Tip artikla - 3 opcije */}
            <div className="grid grid-cols-3 gap-1">
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
              <button
                onClick={() => onItemTypeChange(item.id, 'optibrush')}
                className={`py-1 px-2 text-xs rounded ${item.itemType === 'optibrush' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
              >
                Optibrush
              </button>
            </div>

            {/* Design opcije */}
            {item.itemType === 'design' && (
              <select
                value={item.code}
                onChange={(e) => onDesignSizeSelect(item.id, e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">Izberi velikost...</option>
                {DESIGN_SIZES.map(d => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
              </select>
            )}

            {/* Custom opcije */}
            {item.itemType === 'custom' && (
              <div>
                <label className="block text-xs text-gray-500">Dimenzije (cm)</label>
                <input
                  type="text"
                  value={item.size}
                  onChange={(e) => onCustomDimensionsChange(item.id, e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="npr. 120*180"
                />
                {item.m2 ? <div className="text-xs text-gray-500 mt-1">{item.m2.toFixed(2)} m²</div> : null}
              </div>
            )}

            {/* Optibrush opcije */}
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
                                    onChange={(e) => onOptibrushChange(item.id, { optibrushWidthCm: parseInt(e.target.value) || 0 })}
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="cm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500">Višina (cm)</label>
                                  <input
                                    type="number"
                                    value={item.optibrushHeightCm || ''}
                                    onChange={(e) => onOptibrushChange(item.id, { optibrushHeightCm: parseInt(e.target.value) || 0 })}
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
                          onChange={(e) => onOptibrushChange(item.id, { optibrushWidthCm: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 border rounded text-sm"
                          placeholder="cm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Višina (cm)</label>
                        <input
                          type="number"
                          value={item.optibrushHeightCm || ''}
                          onChange={(e) => onOptibrushChange(item.id, { optibrushHeightCm: parseInt(e.target.value) || 0 })}
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

                {/* Prikaz izračunane cene - avtomatsko se nastavi */}
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

            {/* Količina, cena, popust - za vse tipe */}
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
                <label className="block text-xs text-gray-500">Cena/kos €</label>
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
                  onChange={(e) => onDiscountChange(item.id, parseInt(e.target.value) || 0)}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {item.discount && item.discount > 0 && item.originalPrice && (
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                💰 Izhodiščna: {item.originalPrice.toFixed(2)} € → <span className="font-bold">-{item.discount}%</span> = {item.pricePerUnit.toFixed(2)} €
              </div>
            )}

            {item.itemType !== 'optibrush' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.customized}
                  onChange={(e) => onCustomizedChange(item.id, e.target.checked)}
                />
                Kupcu prilagojen izdelek
              </label>
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

      <div className="bg-yellow-50 p-3 rounded-lg">
        <div className="flex justify-between text-sm">
          <span>Število artiklov:</span>
          <span className="font-bold">{totals.totalItems} KOS</span>
        </div>
        <div className="flex justify-between text-lg mt-2 pt-2 border-t border-yellow-200">
          <span>Skupaj:</span>
          <span className="font-bold">{totals.totalPrice?.toFixed(2)} €</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 border rounded">
          ← Nazaj
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
        >
          {hasNajem ? 'Najem →' : 'Predogled →'}
        </button>
      </div>
    </div>
  );
}

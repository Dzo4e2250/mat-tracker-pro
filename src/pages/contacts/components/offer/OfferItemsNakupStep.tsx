/**
 * @file OfferItemsNakupStep.tsx
 * @description Korak 2a: Konfiguracija artiklov za nakup
 */

import { Plus, Trash2 } from 'lucide-react';
import { OfferItem, ItemType, OfferTotals } from './types';
import { DESIGN_SIZES } from '@/utils/priceList';

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
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Korak za konfiguracijo nakup artiklov
 * - Design ali Custom tip
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
  onAddItem,
  onRemoveItem,
  onBack,
  onNext,
}: OfferItemsNakupStepProps) {
  const isValid = !items.some(i => !i.code || i.pricePerUnit <= 0);

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

            <div className="grid grid-cols-2 gap-1">
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
            </div>

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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">Količina</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value) || 1)}
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

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.customized}
                onChange={(e) => onCustomizedChange(item.id, e.target.checked)}
              />
              Kupcu prilagojen izdelek
            </label>
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

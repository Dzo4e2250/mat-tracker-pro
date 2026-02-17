/**
 * @file useOptibrushAutoPrice.ts
 * @description Shared hook for Optibrush price calculation and auto-update.
 * Extracted from duplicated logic in OfferItemsNakupStep and OfferItemsNajemStep.
 */

import { useEffect, useRef } from 'react';
import { OfferItem } from '../components/offer/types';
import {
  OPTIBRUSH_STANDARD_SIZES,
  calculateOptibrushPrice,
  OptibrushConfig,
} from '@/hooks/useOptibrushPrices';
import {
  useOptibrushPricesFromDB,
  usePriceSettings,
  calculateOptibrushPriceFromDB,
} from '@/hooks/usePrices';

/** Build OptibrushConfig from an OfferItem */
export function getOptibrushConfig(item: OfferItem): OptibrushConfig {
  return {
    hasEdge: item.optibrushHasEdge ?? true,
    colorCount: item.optibrushColorCount ?? '1',
    hasDrainage: item.optibrushHasDrainage ?? false,
    specialShape: item.optibrushSpecialShape ?? false,
    widthCm: item.optibrushWidthCm || 0,
    heightCm: item.optibrushHeightCm || 0,
  };
}

/** Result type for calculateOptibrush */
export type OptibrushCalcResult = { pricePerM2: number; totalPrice: number; m2: number } | null;

/**
 * Hook that provides Optibrush price calculation and auto-updates items when
 * their Optibrush configuration changes.
 *
 * @param items - The offer items to monitor
 * @param onOptibrushChange - Callback to update an item with calculated prices
 */
export function useOptibrushAutoPrice(
  items: OfferItem[],
  onOptibrushChange: (itemId: string, updates: Partial<OfferItem>) => void,
) {
  // Fetch optibrush prices from DB
  const { data: optibrushPricesDB } = useOptibrushPricesFromDB();
  const { data: priceSettings } = usePriceSettings();

  // Izračunaj optibrush ceno - uporabi DB cene če so na voljo
  const calculateOptibrush = (item: OfferItem): OptibrushCalcResult => {
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
  }, [items, onOptibrushChange, optibrushPricesDB, priceSettings]);

  return { calculateOptibrush };
}

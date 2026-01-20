/**
 * @file usePrices.ts
 * @description Hook za pridobivanje vseh cen iz baze
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface MatPrice {
  id: string;
  code: string;
  name: string;
  category: 'poslovni' | 'ergonomski' | 'zunanji' | 'design';
  m2: number;
  dimensions: string;
  price_week_1: number;
  price_week_2: number;
  price_week_3: number;
  price_week_4: number;
  price_purchase: number;
  is_active: boolean;
}

export interface OptibrushPrice {
  id: string;
  has_edge: boolean;
  has_drainage: boolean;
  is_standard: boolean;
  is_large: boolean;
  color_count: '1' | '2-3';
  price_per_m2: number;
}

export interface CustomM2Price {
  id: string;
  size_category: 'small' | 'large';
  frequency: '1' | '2' | '3' | '4';
  price_per_m2: number;
}

export interface PriceSetting {
  id: string;
  key: string;
  value: number;
  description: string | null;
}

export type FrequencyKey = '1' | '2' | '3' | '4';

// =====================================================
// HOOKS - Fetch prices
// =====================================================

/**
 * Hook za pridobivanje vseh mat cen (MBW, ERM, Design)
 */
export function useMatPrices() {
  return useQuery({
    queryKey: ['mat-prices'],
    queryFn: async (): Promise<MatPrice[]> => {
      const { data, error } = await supabase
        .from('mat_prices')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('m2');

      if (error) throw error;
      return (data || []) as MatPrice[];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}

/**
 * Hook za pridobivanje Optibrush cen
 */
export function useOptibrushPricesFromDB() {
  return useQuery({
    queryKey: ['optibrush-prices-db'],
    queryFn: async (): Promise<OptibrushPrice[]> => {
      const { data, error } = await supabase
        .from('optibrush_prices')
        .select('*');

      if (error) throw error;
      return (data || []) as OptibrushPrice[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook za pridobivanje custom m² cen
 */
export function useCustomM2Prices() {
  return useQuery({
    queryKey: ['custom-m2-prices'],
    queryFn: async (): Promise<CustomM2Price[]> => {
      const { data, error } = await supabase
        .from('custom_m2_prices')
        .select('*');

      if (error) throw error;
      return (data || []) as CustomM2Price[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook za pridobivanje nastavitev cenika
 */
export function usePriceSettings() {
  return useQuery({
    queryKey: ['price-settings'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('price_settings')
        .select('*');

      if (error) throw error;

      const settings: Record<string, number> = {};
      (data || []).forEach((s: PriceSetting) => {
        settings[s.key] = s.value;
      });
      return settings;
    },
    staleTime: 1000 * 60 * 30,
  });
}

// =====================================================
// HOOKS - Update prices
// =====================================================

/**
 * Hook za posodabljanje mat cen
 */
export function useUpdateMatPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MatPrice> }) => {
      const { error } = await supabase
        .from('mat_prices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mat-prices'] });
    },
  });
}

/**
 * Hook za posodabljanje Optibrush cen
 */
export function useUpdateOptibrushPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, price_per_m2 }: { id: string; price_per_m2: number }) => {
      const { error } = await supabase
        .from('optibrush_prices')
        .update({ price_per_m2, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optibrush-prices-db'] });
    },
  });
}

/**
 * Hook za posodabljanje custom m² cen
 */
export function useUpdateCustomM2Price() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, price_per_m2 }: { id: string; price_per_m2: number }) => {
      const { error } = await supabase
        .from('custom_m2_prices')
        .update({ price_per_m2, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-m2-prices'] });
    },
  });
}

/**
 * Hook za posodabljanje nastavitev
 */
export function useUpdatePriceSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { error } = await supabase
        .from('price_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-settings'] });
    },
  });
}

// =====================================================
// BULK UPDATE - Hitro povišanje %
// =====================================================

/**
 * Hook za bulk povišanje cen po kategoriji
 */
export function useBulkPriceIncrease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      percentage,
      priceType
    }: {
      category: 'poslovni' | 'ergonomski' | 'zunanji' | 'design' | 'optibrush' | 'custom_m2';
      percentage: number;
      priceType?: 'rental' | 'purchase' | 'all';
    }) => {
      const multiplier = 1 + (percentage / 100);

      if (category === 'optibrush') {
        // Povišaj vse Optibrush cene
        const { data: prices } = await supabase
          .from('optibrush_prices')
          .select('id, price_per_m2');

        if (prices) {
          for (const p of prices) {
            await supabase
              .from('optibrush_prices')
              .update({
                price_per_m2: Math.round(p.price_per_m2 * multiplier * 100) / 100,
                updated_at: new Date().toISOString()
              })
              .eq('id', p.id);
          }
        }
      } else if (category === 'custom_m2') {
        // Povišaj vse custom m² cene
        const { data: prices } = await supabase
          .from('custom_m2_prices')
          .select('id, price_per_m2');

        if (prices) {
          for (const p of prices) {
            await supabase
              .from('custom_m2_prices')
              .update({
                price_per_m2: Math.round(p.price_per_m2 * multiplier * 100) / 100,
                updated_at: new Date().toISOString()
              })
              .eq('id', p.id);
          }
        }
      } else {
        // Povišaj mat cene po kategoriji
        const { data: prices } = await supabase
          .from('mat_prices')
          .select('id, price_week_1, price_week_2, price_week_3, price_week_4, price_purchase')
          .eq('category', category);

        if (prices) {
          for (const p of prices) {
            const updates: Record<string, number | string> = {
              updated_at: new Date().toISOString()
            };

            if (priceType === 'rental' || priceType === 'all' || !priceType) {
              updates.price_week_1 = Math.round(p.price_week_1 * multiplier * 100) / 100;
              updates.price_week_2 = Math.round(p.price_week_2 * multiplier * 100) / 100;
              updates.price_week_3 = Math.round(p.price_week_3 * multiplier * 100) / 100;
              updates.price_week_4 = Math.round(p.price_week_4 * multiplier * 100) / 100;
            }

            if (priceType === 'purchase' || priceType === 'all' || !priceType) {
              updates.price_purchase = Math.round(p.price_purchase * multiplier * 100) / 100;
            }

            await supabase
              .from('mat_prices')
              .update(updates)
              .eq('id', p.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mat-prices'] });
      queryClient.invalidateQueries({ queryKey: ['optibrush-prices-db'] });
      queryClient.invalidateQueries({ queryKey: ['custom-m2-prices'] });
    },
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Pridobi ceno po kodi
 */
export function getMatPriceByCode(prices: MatPrice[], code: string): MatPrice | undefined {
  return prices.find(p => p.code.toUpperCase() === code.toUpperCase());
}

/**
 * Pridobi rental ceno
 */
export function getRentalPrice(prices: MatPrice[], code: string, frequency: FrequencyKey): number {
  const price = getMatPriceByCode(prices, code);
  if (!price) return 0;

  switch (frequency) {
    case '1': return price.price_week_1;
    case '2': return price.price_week_2;
    case '3': return price.price_week_3;
    case '4': return price.price_week_4;
    default: return 0;
  }
}

/**
 * Pridobi nakup ceno
 */
export function getPurchasePrice(prices: MatPrice[], code: string): number {
  const price = getMatPriceByCode(prices, code);
  return price?.price_purchase || 0;
}

/**
 * Izračunaj custom ceno po m²
 */
export function calculateCustomRentalPrice(
  customPrices: CustomM2Price[],
  m2: number,
  frequency: FrequencyKey
): number {
  if (m2 <= 0) return 0;

  const sizeCategory = m2 <= 2 ? 'small' : 'large';
  const priceEntry = customPrices.find(
    p => p.size_category === sizeCategory && p.frequency === frequency
  );

  if (!priceEntry) return 0;
  return Math.round(m2 * priceEntry.price_per_m2 * 100) / 100;
}

/**
 * Izračunaj Optibrush ceno
 */
export function calculateOptibrushPriceFromDB(
  prices: OptibrushPrice[],
  config: {
    hasEdge: boolean;
    hasDrainage: boolean;
    isStandard: boolean;
    isLarge: boolean;
    colorCount: '1' | '2-3';
    m2: number;
    specialShape: boolean;
  },
  settings: Record<string, number>
): { pricePerM2: number; totalPrice: number } | null {
  const priceEntry = prices.find(
    p =>
      p.has_edge === config.hasEdge &&
      p.has_drainage === config.hasDrainage &&
      p.is_standard === config.isStandard &&
      p.is_large === config.isLarge &&
      p.color_count === config.colorCount
  );

  if (!priceEntry) return null;

  let pricePerM2 = priceEntry.price_per_m2;

  // Posebne oblike
  if (config.specialShape) {
    const multiplier = settings['optibrush_special_shape_multiplier'] || 1.3;
    pricePerM2 = pricePerM2 * multiplier;
  }

  const totalPrice = pricePerM2 * config.m2;

  return {
    pricePerM2: Math.round(pricePerM2 * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
  };
}

/**
 * @file types.ts
 * @description Tipi za OfferModal komponente
 */

/**
 * Tip artikla v ponudbi
 * - standard: Preddefinirane velikosti iz cenika
 * - design: Design predpražniki (s potiskom)
 * - custom: Po meri (poljubne dimenzije)
 */
export type ItemType = 'standard' | 'design' | 'custom';

/**
 * Namen artikla v ponudbi (za tip "dodatna")
 * - najem: Artikel za najem z menjavami
 * - nakup: Artikel za nakup brez menjav
 */
export type ItemPurpose = 'najem' | 'nakup';

/**
 * Tip ponudbe
 * - najem: Samo najem predpražnikov
 * - nakup: Samo nakup predpražnikov
 * - primerjava: Isti artikli za najem IN nakup
 * - dodatna: Različni artikli za najem in nakup
 */
export type OfferType = 'najem' | 'nakup' | 'primerjava' | 'dodatna';

/**
 * Korak v čarovniku za ponudbo
 */
export type OfferStep = 'type' | 'items-nakup' | 'items-najem' | 'preview';

/**
 * Frekvenca menjave
 */
export type FrequencyType = '1' | '2' | '3' | '4';

/**
 * Struktura posameznega artikla v ponudbi
 */
export interface OfferItem {
  id: string;
  itemType: ItemType;
  purpose?: ItemPurpose;
  code: string;
  name: string;
  size: string;
  m2?: number;
  customized: boolean;
  quantity: number;
  pricePerUnit: number;
  originalPrice?: number;
  discount?: number;
  // For najem only
  seasonal?: boolean;
  normalFromWeek?: number;
  normalToWeek?: number;
  normalPrice?: number;
  seasonFromWeek?: number;
  seasonToWeek?: number;
  seasonPrice?: number;
  replacementCost?: number;
}

/**
 * Rezultat izračuna skupne vrednosti
 */
export interface OfferTotals {
  totalItems: number;
  totalPrice?: number;
  fourWeekTotal?: number;
}

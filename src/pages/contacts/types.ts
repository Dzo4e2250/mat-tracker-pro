/**
 * @file types.ts
 * @description Skupni tipi in konstante za Contacts modul
 */

// Re-export offer types za lažji dostop
export type { OfferItem, ItemType, ItemPurpose, OfferType, OfferStep, FrequencyType, OfferTotals } from './components/offer/types';

/**
 * Filter za prikaz strank glede na status cikla
 */
export type FilterType = 'all' | 'active' | 'signed' | 'inactive' | 'overdue';

/**
 * Opcije za sortiranje
 */
export type SortByType = 'name' | 'date' | 'status';

/**
 * Opcije za filtriranje po obdobju
 */
export type PeriodFilterType = 'all' | 'today' | 'week' | 'month' | 'lastMonth';

/**
 * Vrne mesec za dani teden (1-52)
 */
export const getMonthForWeek = (week: number): string => {
  const months = [
    'Jan', 'Jan', 'Jan', 'Jan', 'Feb', 'Feb', 'Feb', 'Feb', 'Mar', 'Mar', 'Mar', 'Mar', 'Mar',
    'Apr', 'Apr', 'Apr', 'Apr', 'Maj', 'Maj', 'Maj', 'Maj', 'Jun', 'Jun', 'Jun', 'Jun',
    'Jul', 'Jul', 'Jul', 'Jul', 'Jul', 'Avg', 'Avg', 'Avg', 'Avg', 'Sep', 'Sep', 'Sep', 'Sep',
    'Okt', 'Okt', 'Okt', 'Okt', 'Nov', 'Nov', 'Nov', 'Nov', 'Nov', 'Dec', 'Dec', 'Dec', 'Dec', 'Dec'
  ];
  return months[week - 1] || '';
};

/**
 * Seznam tednov 1-52 z mesecem v oklepaju
 */
export const WEEKS = Array.from({ length: 52 }, (_, i) => ({
  value: i + 1,
  label: `Teden ${i + 1} (${getMonthForWeek(i + 1)})`
}));

/**
 * Preveri ali je cikel predpražnika v zamudi
 * Test je v zamudi če traja več kot 14 dni
 */
export const isTestOverdue = (cycle: any): boolean => {
  if (cycle.status !== 'on_test' || !cycle.test_start_date) return false;
  const testStart = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - testStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 14;
};

/**
 * Izračuna število dni zamude za test
 * @returns Število dni čez 14-dnevni limit (0 če ni zamude)
 */
export const getDaysOverdue = (cycle: any): number => {
  if (cycle.status !== 'on_test' || !cycle.test_start_date) return 0;
  const testStart = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - testStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff - 14);
};

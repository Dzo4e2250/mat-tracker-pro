// Cenik Lindström - veljaven od 1.5.2025

export type MatCategory = 'poslovni' | 'ergonomski' | 'zunanji' | 'design';
export type FrequencyKey = '1' | '2' | '3' | '4';

export interface MatPrice {
  code: string;
  name: string;
  category: MatCategory;
  m2: number;
  dimensions: string;
  prices: {
    '1': number;  // 1 teden
    '2': number;  // 2 tedna
    '3': number;  // 3 tedne
    '4': number;  // 4 tedne
  };
  odkup: number;  // Nakup cena
  replacementCost?: number; // Povračilo = odkup
}

// Cene na m² za posebne dimenzije (Design/Custom)
export const CUSTOM_M2_PRICES = {
  // Do 2m²
  small: {
    '1': 9.23,
    '2': 5.69,
    '3': 4.33,
    '4': 4.07,
  },
  // Nad 2m²
  large: {
    '1': 6.66,
    '2': 4.17,
    '3': 3.59,
    '4': 3.17,
  },
};

// Posebne oblike: +50% dodatek
export const SPECIAL_SHAPE_MULTIPLIER = 1.5;

// Odkup design cena na m²
export const DESIGN_PURCHASE_PRICE_PER_M2 = 165.00;

export const PRICE_LIST: MatPrice[] = [
  // POSLOVNI PREDPRAŽNIKI
  { code: 'MBW0', name: 'Poslovni predpražnik', category: 'poslovni', m2: 0.64, dimensions: '85*75', prices: { '1': 4.98, '2': 2.87, '3': 2.00, '4': 1.72 }, odkup: 39.09 },
  { code: 'MBW1', name: 'Poslovni predpražnik', category: 'poslovni', m2: 1.28, dimensions: '85*150', prices: { '1': 6.80, '2': 4.03, '3': 2.85, '4': 2.48 }, odkup: 75.33 },
  { code: 'MBW2', name: 'Poslovni predpražnik', category: 'poslovni', m2: 2.30, dimensions: '115*200', prices: { '1': 10.95, '2': 6.30, '3': 4.54, '4': 3.68 }, odkup: 133.61 },
  { code: 'MBW3', name: 'Poslovni predpražnik', category: 'poslovni', m2: 2.76, dimensions: '115*240', prices: { '1': 15.11, '2': 8.69, '3': 6.27, '4': 5.08 }, odkup: 159.00 },
  { code: 'MBW4', name: 'Poslovni predpražnik', category: 'poslovni', m2: 4.50, dimensions: '150*300', prices: { '1': 19.38, '2': 10.75, '3': 7.82, '4': 6.51 }, odkup: 258.69 },

  // ERGONOMSKI PREDPRAŽNIKI
  { code: 'ERM10R', name: 'Ergonomski predpražnik', category: 'ergonomski', m2: 0.46, dimensions: '86*54', prices: { '1': 6.01, '2': 3.21, '3': 2.86, '4': 1.96 }, odkup: 44.15 },
  { code: 'ERM11R', name: 'Ergonomski predpražnik', category: 'ergonomski', m2: 1.22, dimensions: '86*142', prices: { '1': 7.68, '2': 4.68, '3': 3.58, '4': 3.08 }, odkup: 110.77 },

  // ZUNANJI PREDPRAŽNIKI
  { code: 'ERM49R', name: 'Zunanji predpražnik', category: 'zunanji', m2: 1.28, dimensions: '85*150', prices: { '1': 7.73, '2': 4.37, '3': 3.12, '4': 2.72 }, odkup: 92.91 },
  { code: 'ERM51R', name: 'Zunanji predpražnik', category: 'zunanji', m2: 2.01, dimensions: '115*175', prices: { '1': 10.14, '2': 5.80, '3': 4.00, '4': 3.54 }, odkup: 145.07 },

  // DESIGN PREDPRAŽNIKI
  { code: 'DESIGN-60x85', name: 'Design predpražnik', category: 'design', m2: 0.48, dimensions: '60*85', prices: { '1': 6.73, '2': 4.10, '3': 3.07, '4': 2.84 }, odkup: 46.05 },
  { code: 'DESIGN-75x85', name: 'Design predpražnik', category: 'design', m2: 0.64, dimensions: '75*85', prices: { '1': 7.22, '2': 4.50, '3': 3.33, '4': 3.10 }, odkup: 57.57 },
  { code: 'DESIGN-85x115', name: 'Design predpražnik', category: 'design', m2: 0.98, dimensions: '85*115', prices: { '1': 8.53, '2': 5.31, '3': 4.03, '4': 3.79 }, odkup: 88.27 },
  { code: 'DESIGN-85x120', name: 'Design predpražnik', category: 'design', m2: 1.02, dimensions: '85*120', prices: { '1': 8.77, '2': 5.42, '3': 4.13, '4': 3.87 }, odkup: 92.11 },
  { code: 'DESIGN-85x150', name: 'Design predpražnik', category: 'design', m2: 1.28, dimensions: '85*150', prices: { '1': 10.00, '2': 6.08, '3': 4.65, '4': 4.39 }, odkup: 115.13 },
  { code: 'DESIGN-85x250', name: 'Design predpražnik', category: 'design', m2: 2.13, dimensions: '85*250', prices: { '1': 14.45, '2': 9.09, '3': 7.25, '4': 6.53 }, odkup: 191.89 },
  { code: 'DESIGN-85x300', name: 'Design predpražnik', category: 'design', m2: 2.55, dimensions: '85*300', prices: { '1': 15.95, '2': 10.18, '3': 8.10, '4': 7.39 }, odkup: 230.27 },
  { code: 'DESIGN-115x180', name: 'Design predpražnik', category: 'design', m2: 2.07, dimensions: '115*180', prices: { '1': 14.24, '2': 8.94, '3': 7.10, '4': 6.42 }, odkup: 186.92 },
  { code: 'DESIGN-115x200', name: 'Design predpražnik', category: 'design', m2: 2.30, dimensions: '115*200', prices: { '1': 15.65, '2': 9.54, '3': 7.55, '4': 6.89 }, odkup: 207.69 },
  { code: 'DESIGN-115x240', name: 'Design predpražnik', category: 'design', m2: 2.76, dimensions: '115*240', prices: { '1': 17.72, '2': 11.21, '3': 8.75, '4': 8.08 }, odkup: 249.23 },
  { code: 'DESIGN-115x250', name: 'Design predpražnik', category: 'design', m2: 2.88, dimensions: '115*250', prices: { '1': 18.00, '2': 11.51, '3': 8.99, '4': 8.31 }, odkup: 259.61 },
  { code: 'DESIGN-115x300', name: 'Design predpražnik', category: 'design', m2: 3.45, dimensions: '115*300', prices: { '1': 21.60, '2': 13.00, '3': 10.50, '4': 9.47 }, odkup: 311.54 },
  { code: 'DESIGN-150x200', name: 'Design predpražnik', category: 'design', m2: 3.00, dimensions: '150*200', prices: { '1': 18.65, '2': 11.83, '3': 9.30, '4': 8.56 }, odkup: 270.90 },
  { code: 'DESIGN-150x240', name: 'Design predpražnik', category: 'design', m2: 3.60, dimensions: '150*240', prices: { '1': 21.85, '2': 13.39, '3': 10.60, '4': 9.78 }, odkup: 325.08 },
  { code: 'DESIGN-150x250', name: 'Design predpražnik', category: 'design', m2: 3.75, dimensions: '150*250', prices: { '1': 22.75, '2': 14.20, '3': 11.62, '4': 10.49 }, odkup: 338.63 },
  { code: 'DESIGN-150x300', name: 'Design predpražnik', category: 'design', m2: 4.50, dimensions: '150*300', prices: { '1': 25.87, '2': 16.49, '3': 13.48, '4': 12.01 }, odkup: 406.35 },
  { code: 'DESIGN-200x200', name: 'Design predpražnik', category: 'design', m2: 4.00, dimensions: '200*200', prices: { '1': 26.26, '2': 18.12, '3': 12.60, '4': 11.00 }, odkup: 361.20 },
  { code: 'DESIGN-200x300', name: 'Design predpražnik', category: 'design', m2: 6.00, dimensions: '200*300', prices: { '1': 34.61, '2': 27.01, '3': 17.08, '4': 15.04 }, odkup: 541.80 },
  { code: 'DESIGN-100x100', name: 'Design predpražnik', category: 'design', m2: 1.00, dimensions: '100*100', prices: { '1': 9.37, '2': 5.65, '3': 4.41, '4': 3.83 }, odkup: 90.30 },
];

// Lookup functions
export function getPriceByCode(code: string): MatPrice | undefined {
  // First try exact match
  const exactMatch = PRICE_LIST.find(p => p.code.toUpperCase() === code.toUpperCase());
  if (exactMatch) return exactMatch;

  // Try partial match (e.g., "MBW1" matches "MBW1")
  const partialMatch = PRICE_LIST.find(p =>
    p.code.toUpperCase().startsWith(code.toUpperCase()) ||
    code.toUpperCase().startsWith(p.code.toUpperCase())
  );
  return partialMatch;
}

export function getRentalPrice(code: string, frequency: FrequencyKey): number {
  const price = getPriceByCode(code);
  if (!price) return 0;
  return price.prices[frequency] || 0;
}

export function getPurchasePrice(code: string): number {
  const price = getPriceByCode(code);
  if (!price) return 0;
  return price.odkup;
}

export function getReplacementCost(code: string): number {
  // Replacement cost is same as purchase price
  return getPurchasePrice(code);
}

export function getDimensions(code: string): string {
  const price = getPriceByCode(code);
  if (!price) return '';
  return price.dimensions;
}

// Get all prices for display
export function getAllPricesForCode(code: string): { rental: Record<string, number>; purchase: number; dimensions: string } | null {
  const price = getPriceByCode(code);
  if (!price) return null;

  return {
    rental: price.prices,
    purchase: price.odkup,
    dimensions: price.dimensions,
  };
}

// Standard mat types for dropdown
export const STANDARD_TYPES = [
  { code: 'MBW0', label: 'MBW0 (85×75)', category: 'poslovni' },
  { code: 'MBW1', label: 'MBW1 (85×150)', category: 'poslovni' },
  { code: 'MBW2', label: 'MBW2 (115×200)', category: 'poslovni' },
  { code: 'MBW3', label: 'MBW3 (115×240)', category: 'poslovni' },
  { code: 'MBW4', label: 'MBW4 (150×300)', category: 'poslovni' },
  { code: 'ERM10R', label: 'ERM10R (86×54)', category: 'ergonomski' },
  { code: 'ERM11R', label: 'ERM11R (86×142)', category: 'ergonomski' },
  { code: 'ERM49R', label: 'ERM49R (85×150)', category: 'zunanji' },
  { code: 'ERM51R', label: 'ERM51R (115×175)', category: 'zunanji' },
];

// Design sizes for dropdown
export const DESIGN_SIZES = [
  { code: 'DESIGN-60x85', label: '60×85 (0.48m²)', dimensions: '60*85' },
  { code: 'DESIGN-75x85', label: '75×85 (0.64m²)', dimensions: '75*85' },
  { code: 'DESIGN-85x115', label: '85×115 (0.98m²)', dimensions: '85*115' },
  { code: 'DESIGN-85x120', label: '85×120 (1.02m²)', dimensions: '85*120' },
  { code: 'DESIGN-85x150', label: '85×150 (1.28m²)', dimensions: '85*150' },
  { code: 'DESIGN-85x250', label: '85×250 (2.13m²)', dimensions: '85*250' },
  { code: 'DESIGN-85x300', label: '85×300 (2.55m²)', dimensions: '85*300' },
  { code: 'DESIGN-115x180', label: '115×180 (2.07m²)', dimensions: '115*180' },
  { code: 'DESIGN-115x200', label: '115×200 (2.30m²)', dimensions: '115*200' },
  { code: 'DESIGN-115x240', label: '115×240 (2.76m²)', dimensions: '115*240' },
  { code: 'DESIGN-115x250', label: '115×250 (2.88m²)', dimensions: '115*250' },
  { code: 'DESIGN-115x300', label: '115×300 (3.45m²)', dimensions: '115*300' },
  { code: 'DESIGN-150x200', label: '150×200 (3.00m²)', dimensions: '150*200' },
  { code: 'DESIGN-150x240', label: '150×240 (3.60m²)', dimensions: '150*240' },
  { code: 'DESIGN-150x250', label: '150×250 (3.75m²)', dimensions: '150*250' },
  { code: 'DESIGN-150x300', label: '150×300 (4.50m²)', dimensions: '150*300' },
  { code: 'DESIGN-200x200', label: '200×200 (4.00m²)', dimensions: '200*200' },
  { code: 'DESIGN-200x300', label: '200×300 (6.00m²)', dimensions: '200*300' },
  { code: 'DESIGN-100x100', label: '100×100 (1.00m²)', dimensions: '100*100' },
];

// Calculate m² from dimensions string (e.g., "85*150" -> 1.275)
export function calculateM2FromDimensions(dimensions: string): number {
  const match = dimensions.match(/(\d+)\s*[*x×]\s*(\d+)/i);
  if (!match) return 0;

  const width = parseInt(match[1]);
  const height = parseInt(match[2]);

  // Convert cm to m and multiply
  return (width / 100) * (height / 100);
}

// Calculate custom price based on m² and frequency
export function calculateCustomPrice(m2: number, frequency: FrequencyKey): number {
  if (m2 <= 0) return 0;

  const pricePerM2 = m2 <= 2
    ? CUSTOM_M2_PRICES.small[frequency]
    : CUSTOM_M2_PRICES.large[frequency];

  return Math.round(m2 * pricePerM2 * 100) / 100;
}

// Calculate custom purchase price
export function calculateCustomPurchasePrice(m2: number): number {
  if (m2 <= 0) return 0;
  return Math.round(m2 * DESIGN_PURCHASE_PRICE_PER_M2 * 100) / 100;
}

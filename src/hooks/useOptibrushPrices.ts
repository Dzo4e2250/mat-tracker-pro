export interface OptibrushConfig {
  hasEdge: boolean;
  colorCount: '1' | '2-3';
  hasDrainage: boolean;
  specialShape: boolean;
  widthCm: number;
  heightCm: number;
}

// Standardne dimenzije (samo z robom)
const STANDARD_SIZES = [
  { width: 60, height: 85 },
  { width: 75, height: 85 },
  { width: 80, height: 120 },
  { width: 85, height: 150 },
  { width: 85, height: 300 },
  { width: 120, height: 180 },
  { width: 120, height: 200 },
  { width: 120, height: 240 },
  { width: 150, height: 200 },
  { width: 150, height: 250 },
  { width: 150, height: 300 },
];

export const OPTIBRUSH_STANDARD_SIZES = STANDARD_SIZES.map(s => ({
  label: `${s.width} x ${s.height} cm`,
  width: s.width,
  height: s.height,
  m2: (s.width * s.height) / 10000,
}));

/**
 * Cenik Optibrush predpražnikov
 *
 * Struktura cen (€/m²):
 *
 * Z ROBOM, BREZ DRENAŽNIH:
 * - Standard, 1 barva: 172,36
 * - Standard, 2-3 barve: 235,73
 * - Nestandard ≤7,5m², 1 barva: 202,93
 * - Nestandard ≤7,5m², 2-3 barve: 282,12
 * - Nestandard >7,5m², 1 barva: 233,50
 * - Nestandard >7,5m², 2-3 barve: 328,51
 *
 * BREZ ROBA, BREZ DRENAŽNIH (= nestandard z robom):
 * - ≤7,5m², 1 barva: 202,93
 * - ≤7,5m², 2-3 barve: 282,12
 * - >7,5m², 1 barva: 233,50
 * - >7,5m², 2-3 barve: 328,51
 *
 * Z DRENAŽNIMI (z ali brez roba):
 * - Standard (samo z robom), 1 barva: 186,15
 * - Standard (samo z robom), 2-3 barve: 254,59
 * - Nestandard ≤7,5m², 1 barva: 219,16
 * - Nestandard ≤7,5m², 2-3 barve: 304,69
 * - Nestandard >7,5m², 1 barva: 252,18
 * - Nestandard >7,5m², 2-3 barve: 354,79
 *
 * POSEBNE OBLIKE: +30%
 */

// Prag za velike nestandardne dimenzije
const M2_THRESHOLD = 7.5;

/**
 * Preveri ali so dimenzije standardne
 */
function isStandardSize(widthCm: number, heightCm: number): boolean {
  return STANDARD_SIZES.some(
    s => (s.width === widthCm && s.height === heightCm) ||
         (s.width === heightCm && s.height === widthCm)
  );
}

/**
 * Pridobi ceno na m² glede na konfiguracijo
 */
function getPricePerM2(config: OptibrushConfig, m2: number): number | null {
  const { hasEdge, colorCount, hasDrainage, widthCm, heightCm } = config;
  const isStandard = hasEdge && isStandardSize(widthCm, heightCm);
  const isLarge = m2 > M2_THRESHOLD;

  // Z drenažnimi luknjicami
  if (hasDrainage) {
    if (isStandard) {
      // Standard z drenažnimi (samo z robom)
      return colorCount === '1' ? 186.15 : 254.59;
    } else {
      // Nestandard z drenažnimi (z ali brez roba - enake cene)
      if (isLarge) {
        return colorCount === '1' ? 252.18 : 354.79;
      } else {
        return colorCount === '1' ? 219.16 : 304.69;
      }
    }
  }

  // Brez drenažnih luknjic
  if (hasEdge && isStandard) {
    // Standard z robom, brez drenažnih
    return colorCount === '1' ? 172.36 : 235.73;
  } else {
    // Nestandard (ali brez roba = avtomatsko nestandard)
    if (isLarge) {
      return colorCount === '1' ? 233.50 : 328.51;
    } else {
      return colorCount === '1' ? 202.93 : 282.12;
    }
  }
}

/**
 * Izračunaj ceno Optibrush predpražnika
 */
export function calculateOptibrushPrice(
  config: OptibrushConfig
): { pricePerM2: number; totalPrice: number; m2: number } | null {
  const { specialShape, widthCm, heightCm } = config;

  // Preveri veljavnost dimenzij
  if (!widthCm || !heightCm || widthCm <= 0 || heightCm <= 0) {
    return null;
  }

  // Izračunaj m²
  const m2 = (widthCm * heightCm) / 10000;

  // Pridobi osnovno ceno
  let pricePerM2 = getPricePerM2(config, m2);

  if (pricePerM2 === null) {
    return null;
  }

  // Posebne oblike - multiplier se nastavi v admin panelu (privzeto +30%)
  // Ta funkcija je za lokalni izračun brez dostopa do DB
  // Za DB-driven cene uporabi calculateOptibrushPriceFromDB iz usePrices.ts
  if (specialShape) {
    pricePerM2 = pricePerM2 * 1.3; // Fallback za offline izračun
  }

  const totalPrice = pricePerM2 * m2;

  return {
    pricePerM2: Math.round(pricePerM2 * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    m2: Math.round(m2 * 100) / 100,
  };
}

/**
 * Pridobi opis cenovne kategorije
 */
export function getPriceCategoryLabel(config: OptibrushConfig, m2: number): string {
  const { hasEdge, hasDrainage, widthCm, heightCm } = config;
  const isStandard = hasEdge && isStandardSize(widthCm, heightCm);
  const isLarge = m2 > M2_THRESHOLD;

  const parts: string[] = [];

  // Rob
  parts.push(hasEdge ? 'Z robom' : 'Brez roba');

  // Drenažne luknjice
  if (hasDrainage) {
    parts.push('z drenažnimi luknjicami');
  }

  // Dimenzije
  if (isStandard) {
    parts.push('standardna dimenzija');
  } else if (isLarge) {
    parts.push(`nestandardna (>7,5 m²)`);
  } else {
    parts.push(`nestandardna (≤7,5 m²)`);
  }

  return parts.join(', ');
}

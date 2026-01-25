/**
 * @file priceList.test.ts
 * @description Tests for price list utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getPriceByCode,
  getRentalPrice,
  getPurchasePrice,
  getReplacementCost,
  getDimensions,
  getAllPricesForCode,
  calculateM2FromDimensions,
  calculateCustomPrice,
  calculateCustomPurchasePrice,
  PRICE_LIST,
  STANDARD_TYPES,
  DESIGN_SIZES,
  CUSTOM_M2_PRICES,
  DESIGN_PURCHASE_PRICE_PER_M2,
} from './priceList';

describe('priceList', () => {
  describe('getPriceByCode', () => {
    it('should find MBW1 exactly', () => {
      const price = getPriceByCode('MBW1');
      expect(price).toBeDefined();
      expect(price?.code).toBe('MBW1');
      expect(price?.category).toBe('poslovni');
    });

    it('should find ERM10R exactly', () => {
      const price = getPriceByCode('ERM10R');
      expect(price).toBeDefined();
      expect(price?.code).toBe('ERM10R');
      expect(price?.category).toBe('ergonomski');
    });

    it('should be case insensitive', () => {
      expect(getPriceByCode('mbw1')?.code).toBe('MBW1');
      expect(getPriceByCode('Mbw1')?.code).toBe('MBW1');
    });

    it('should return undefined for non-existent code', () => {
      expect(getPriceByCode('NONEXISTENT')).toBeUndefined();
    });

    it('should find design codes', () => {
      const price = getPriceByCode('DESIGN-85x150');
      expect(price).toBeDefined();
      expect(price?.category).toBe('design');
    });
  });

  describe('getRentalPrice', () => {
    it('should return correct weekly rental prices for MBW1', () => {
      expect(getRentalPrice('MBW1', '1')).toBe(6.80);
      expect(getRentalPrice('MBW1', '2')).toBe(4.03);
      expect(getRentalPrice('MBW1', '3')).toBe(2.85);
      expect(getRentalPrice('MBW1', '4')).toBe(2.48);
    });

    it('should return 0 for non-existent code', () => {
      expect(getRentalPrice('NONEXISTENT', '1')).toBe(0);
    });
  });

  describe('getPurchasePrice', () => {
    it('should return correct purchase price for MBW1', () => {
      expect(getPurchasePrice('MBW1')).toBe(75.33);
    });

    it('should return correct purchase price for MBW4', () => {
      expect(getPurchasePrice('MBW4')).toBe(258.69);
    });

    it('should return 0 for non-existent code', () => {
      expect(getPurchasePrice('NONEXISTENT')).toBe(0);
    });
  });

  describe('getReplacementCost', () => {
    it('should return same as purchase price', () => {
      expect(getReplacementCost('MBW1')).toBe(getPurchasePrice('MBW1'));
      expect(getReplacementCost('MBW4')).toBe(getPurchasePrice('MBW4'));
    });
  });

  describe('getDimensions', () => {
    it('should return correct dimensions for MBW1', () => {
      expect(getDimensions('MBW1')).toBe('85*150');
    });

    it('should return correct dimensions for MBW4', () => {
      expect(getDimensions('MBW4')).toBe('150*300');
    });

    it('should return empty string for non-existent code', () => {
      expect(getDimensions('NONEXISTENT')).toBe('');
    });
  });

  describe('getAllPricesForCode', () => {
    it('should return all price info for MBW1', () => {
      const prices = getAllPricesForCode('MBW1');
      expect(prices).not.toBeNull();
      expect(prices?.rental['1']).toBe(6.80);
      expect(prices?.purchase).toBe(75.33);
      expect(prices?.dimensions).toBe('85*150');
    });

    it('should return null for non-existent code', () => {
      expect(getAllPricesForCode('NONEXISTENT')).toBeNull();
    });
  });

  describe('calculateM2FromDimensions', () => {
    it('should calculate m2 from dimension string with asterisk', () => {
      expect(calculateM2FromDimensions('85*150')).toBeCloseTo(1.275, 2);
      expect(calculateM2FromDimensions('100*100')).toBeCloseTo(1.0, 2);
      expect(calculateM2FromDimensions('150*300')).toBeCloseTo(4.5, 2);
    });

    it('should handle x separator', () => {
      expect(calculateM2FromDimensions('85x150')).toBeCloseTo(1.275, 2);
    });

    it('should handle spaces', () => {
      expect(calculateM2FromDimensions('85 * 150')).toBeCloseTo(1.275, 2);
    });

    it('should return 0 for invalid format', () => {
      expect(calculateM2FromDimensions('')).toBe(0);
      expect(calculateM2FromDimensions('invalid')).toBe(0);
    });
  });

  describe('calculateCustomPrice', () => {
    it('should use small prices for m2 <= 2', () => {
      // 1m2 at frequency 1 should use small price
      const price = calculateCustomPrice(1, '1');
      expect(price).toBeCloseTo(1 * CUSTOM_M2_PRICES.small['1'], 2);
    });

    it('should use large prices for m2 > 2', () => {
      // 3m2 at frequency 1 should use large price
      const price = calculateCustomPrice(3, '1');
      expect(price).toBeCloseTo(3 * CUSTOM_M2_PRICES.large['1'], 2);
    });

    it('should return 0 for zero or negative m2', () => {
      expect(calculateCustomPrice(0, '1')).toBe(0);
      expect(calculateCustomPrice(-1, '1')).toBe(0);
    });

    it('should calculate correctly for different frequencies', () => {
      const m2 = 1.5;
      expect(calculateCustomPrice(m2, '1')).toBeCloseTo(m2 * CUSTOM_M2_PRICES.small['1'], 2);
      expect(calculateCustomPrice(m2, '4')).toBeCloseTo(m2 * CUSTOM_M2_PRICES.small['4'], 2);
    });
  });

  describe('calculateCustomPurchasePrice', () => {
    it('should calculate purchase price based on m2', () => {
      expect(calculateCustomPurchasePrice(1)).toBeCloseTo(DESIGN_PURCHASE_PRICE_PER_M2, 2);
      expect(calculateCustomPurchasePrice(2)).toBeCloseTo(2 * DESIGN_PURCHASE_PRICE_PER_M2, 2);
    });

    it('should return 0 for zero or negative m2', () => {
      expect(calculateCustomPurchasePrice(0)).toBe(0);
      expect(calculateCustomPurchasePrice(-1)).toBe(0);
    });
  });

  describe('PRICE_LIST', () => {
    it('should have entries for all categories', () => {
      const categories = new Set(PRICE_LIST.map(p => p.category));
      expect(categories.has('poslovni')).toBe(true);
      expect(categories.has('ergonomski')).toBe(true);
      expect(categories.has('zunanji')).toBe(true);
      expect(categories.has('design')).toBe(true);
    });

    it('should have MBW0-MBW4 codes', () => {
      expect(PRICE_LIST.find(p => p.code === 'MBW0')).toBeDefined();
      expect(PRICE_LIST.find(p => p.code === 'MBW1')).toBeDefined();
      expect(PRICE_LIST.find(p => p.code === 'MBW2')).toBeDefined();
      expect(PRICE_LIST.find(p => p.code === 'MBW3')).toBeDefined();
      expect(PRICE_LIST.find(p => p.code === 'MBW4')).toBeDefined();
    });
  });

  describe('STANDARD_TYPES', () => {
    it('should have 9 standard types', () => {
      expect(STANDARD_TYPES.length).toBe(9);
    });

    it('should have all MBW types', () => {
      expect(STANDARD_TYPES.filter(t => t.code.startsWith('MBW')).length).toBe(5);
    });
  });

  describe('DESIGN_SIZES', () => {
    it('should have multiple design sizes', () => {
      expect(DESIGN_SIZES.length).toBeGreaterThan(10);
    });

    it('should have 100x100 design size', () => {
      expect(DESIGN_SIZES.find(d => d.code === 'DESIGN-100x100')).toBeDefined();
    });
  });
});

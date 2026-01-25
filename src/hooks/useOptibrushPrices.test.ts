/**
 * @file useOptibrushPrices.test.ts
 * @description Tests for Optibrush price calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOptibrushPrice,
  getPriceCategoryLabel,
  OPTIBRUSH_STANDARD_SIZES,
  type OptibrushConfig,
} from './useOptibrushPrices';

describe('useOptibrushPrices', () => {
  describe('OPTIBRUSH_STANDARD_SIZES', () => {
    it('should have 11 standard sizes', () => {
      expect(OPTIBRUSH_STANDARD_SIZES.length).toBe(11);
    });

    it('should have correct m2 calculations', () => {
      const first = OPTIBRUSH_STANDARD_SIZES[0];
      expect(first.m2).toBeCloseTo((first.width * first.height) / 10000, 4);
    });

    it('should include 60x85 size', () => {
      const size = OPTIBRUSH_STANDARD_SIZES.find(s => s.width === 60 && s.height === 85);
      expect(size).toBeDefined();
    });

    it('should include 150x300 size', () => {
      const size = OPTIBRUSH_STANDARD_SIZES.find(s => s.width === 150 && s.height === 300);
      expect(size).toBeDefined();
    });
  });

  describe('calculateOptibrushPrice', () => {
    it('should return null for invalid dimensions', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 0,
        heightCm: 0,
      };
      expect(calculateOptibrushPrice(config)).toBeNull();
    });

    it('should return null for negative dimensions', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: -100,
        heightCm: 100,
      };
      expect(calculateOptibrushPrice(config)).toBeNull();
    });

    it('should calculate price for standard size with edge, 1 color', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(172.36);
      expect(result!.m2).toBeCloseTo(0.51, 2);
    });

    it('should calculate price for standard size with edge, 2-3 colors', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '2-3',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(235.73);
    });

    it('should calculate price for non-standard size small, 1 color', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 100,
        heightCm: 100, // 1 m2, non-standard
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(202.93);
    });

    it('should calculate price for non-standard size large, 1 color', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 300,
        heightCm: 300, // 9 m2, large non-standard
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(233.50);
    });

    it('should calculate price for without edge (non-standard)', () => {
      const config: OptibrushConfig = {
        hasEdge: false,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(202.93); // Non-standard price
    });

    it('should calculate price with drainage, standard', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: true,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(186.15);
    });

    it('should calculate price with drainage, 2-3 colors', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '2-3',
        hasDrainage: true,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const result = calculateOptibrushPrice(config);
      expect(result).not.toBeNull();
      expect(result!.pricePerM2).toBe(254.59);
    });

    it('should apply 30% special shape markup', () => {
      const baseConfig: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const specialConfig: OptibrushConfig = {
        ...baseConfig,
        specialShape: true,
      };
      const baseResult = calculateOptibrushPrice(baseConfig);
      const specialResult = calculateOptibrushPrice(specialConfig);

      expect(specialResult!.pricePerM2).toBeCloseTo(baseResult!.pricePerM2 * 1.3, 2);
    });

    it('should calculate total price correctly', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 100,
        heightCm: 100, // 1 m2
      };
      const result = calculateOptibrushPrice(config);
      expect(result!.totalPrice).toBeCloseTo(result!.pricePerM2 * result!.m2, 2);
    });

    it('should recognize standard sizes in any orientation', () => {
      const config1: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const config2: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 85,
        heightCm: 60,
      };
      expect(calculateOptibrushPrice(config1)!.pricePerM2).toBe(calculateOptibrushPrice(config2)!.pricePerM2);
    });
  });

  describe('getPriceCategoryLabel', () => {
    it('should describe standard with edge', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const label = getPriceCategoryLabel(config, 0.51);
      expect(label).toContain('Z robom');
      expect(label).toContain('standardna dimenzija');
    });

    it('should describe without edge', () => {
      const config: OptibrushConfig = {
        hasEdge: false,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const label = getPriceCategoryLabel(config, 0.51);
      expect(label).toContain('Brez roba');
    });

    it('should describe with drainage', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: true,
        specialShape: false,
        widthCm: 60,
        heightCm: 85,
      };
      const label = getPriceCategoryLabel(config, 0.51);
      expect(label).toContain('drenažnimi luknjicami');
    });

    it('should describe non-standard small', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 100,
        heightCm: 100,
      };
      const label = getPriceCategoryLabel(config, 1);
      expect(label).toContain('nestandardna');
      expect(label).toContain('≤7,5');
    });

    it('should describe non-standard large', () => {
      const config: OptibrushConfig = {
        hasEdge: true,
        colorCount: '1',
        hasDrainage: false,
        specialShape: false,
        widthCm: 300,
        heightCm: 300,
      };
      const label = getPriceCategoryLabel(config, 9);
      expect(label).toContain('nestandardna');
      expect(label).toContain('>7,5');
    });
  });
});

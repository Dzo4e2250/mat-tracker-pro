/**
 * @file utils.test.ts
 * @description Tests for lib/utils QR code generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRandomCodeSuffix, generateQRCode, generateUniqueQRCodes } from './utils';

describe('lib/utils', () => {
  describe('generateRandomCodeSuffix', () => {
    it('should generate 4 characters by default', () => {
      const suffix = generateRandomCodeSuffix();
      expect(suffix.length).toBe(4);
    });

    it('should generate specified length', () => {
      expect(generateRandomCodeSuffix(2).length).toBe(2);
      expect(generateRandomCodeSuffix(6).length).toBe(6);
      expect(generateRandomCodeSuffix(8).length).toBe(8);
    });

    it('should only contain valid characters', () => {
      const validChars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
      for (let i = 0; i < 100; i++) {
        const suffix = generateRandomCodeSuffix();
        for (const char of suffix) {
          expect(validChars).toContain(char);
        }
      }
    });

    it('should not contain confusing characters (0, O, 1, I, L)', () => {
      const confusingChars = '01OIL';
      for (let i = 0; i < 100; i++) {
        const suffix = generateRandomCodeSuffix();
        for (const char of suffix) {
          expect(confusingChars).not.toContain(char);
        }
      }
    });

    it('should generate different values (randomness check)', () => {
      const suffixes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        suffixes.add(generateRandomCodeSuffix());
      }
      // Should have high variance (at least 90 unique out of 100)
      expect(suffixes.size).toBeGreaterThan(90);
    });
  });

  describe('generateQRCode', () => {
    it('should generate code with prefix', () => {
      const code = generateQRCode('GEO');
      expect(code.startsWith('GEO-')).toBe(true);
      expect(code.length).toBe(8); // 3 + 1 + 4
    });

    it('should work with different prefixes', () => {
      expect(generateQRCode('STAN').startsWith('STAN-')).toBe(true);
      expect(generateQRCode('AB').startsWith('AB-')).toBe(true);
      expect(generateQRCode('TEST123').startsWith('TEST123-')).toBe(true);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(generateQRCode('TEST'));
      }
      expect(codes.size).toBeGreaterThan(45);
    });
  });

  describe('generateUniqueQRCodes', () => {
    it('should generate requested number of codes', () => {
      const codes = generateUniqueQRCodes('TEST', 5, new Set());
      expect(codes.length).toBe(5);
    });

    it('should not include existing codes', () => {
      const existingCodes = new Set(['TEST-AAAA', 'TEST-BBBB']);
      const newCodes = generateUniqueQRCodes('TEST', 10, existingCodes);

      for (const code of newCodes) {
        expect(existingCodes.has(code)).toBe(false);
      }
    });

    it('should generate all unique codes', () => {
      const codes = generateUniqueQRCodes('PREFIX', 20, new Set());
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should handle empty existing codes set', () => {
      const codes = generateUniqueQRCodes('TEST', 3, new Set());
      expect(codes.length).toBe(3);
    });

    it('should work with large count', () => {
      const codes = generateUniqueQRCodes('BIG', 100, new Set());
      expect(codes.length).toBe(100);
      expect(new Set(codes).size).toBe(100);
    });

    it('should have correct prefix for all generated codes', () => {
      const codes = generateUniqueQRCodes('ABC', 10, new Set());
      for (const code of codes) {
        expect(code.startsWith('ABC-')).toBe(true);
      }
    });
  });
});

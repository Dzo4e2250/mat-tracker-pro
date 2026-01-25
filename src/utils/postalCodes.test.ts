/**
 * @file postalCodes.test.ts
 * @description Tests for postal code utilities
 */

import { describe, it, expect } from 'vitest';
import { getCityByPostalCode, isValidPostalCode, POSTAL_CODES } from './postalCodes';

describe('postalCodes', () => {
  describe('getCityByPostalCode', () => {
    it('should return Ljubljana for 1000', () => {
      expect(getCityByPostalCode('1000')).toBe('Ljubljana');
    });

    it('should return Maribor for 2000', () => {
      expect(getCityByPostalCode('2000')).toBe('Maribor');
    });

    it('should return Celje for 3000', () => {
      expect(getCityByPostalCode('3000')).toBe('Celje');
    });

    it('should return Kranj for 4000', () => {
      expect(getCityByPostalCode('4000')).toBe('Kranj');
    });

    it('should return Nova Gorica for 5000', () => {
      expect(getCityByPostalCode('5000')).toBe('Nova Gorica');
    });

    it('should return Koper for 6000', () => {
      expect(getCityByPostalCode('6000')).toBe('Koper');
    });

    it('should return Novo mesto for 8000', () => {
      expect(getCityByPostalCode('8000')).toBe('Novo mesto');
    });

    it('should return Murska Sobota for 9000', () => {
      expect(getCityByPostalCode('9000')).toBe('Murska Sobota');
    });

    it('should return empty string for invalid postal code', () => {
      expect(getCityByPostalCode('9999')).toBe('');
      expect(getCityByPostalCode('0000')).toBe('');
      expect(getCityByPostalCode('abc')).toBe('');
    });

    it('should handle whitespace in postal code', () => {
      expect(getCityByPostalCode(' 1000 ')).toBe('Ljubljana');
      expect(getCityByPostalCode('  2000')).toBe('Maribor');
    });

    it('should return correct city for suburban postal codes', () => {
      expect(getCityByPostalCode('1210')).toBe('Ljubljana - Šentvid');
      expect(getCityByPostalCode('1231')).toBe('Ljubljana - Črnuče');
    });
  });

  describe('isValidPostalCode', () => {
    it('should return true for valid postal codes', () => {
      expect(isValidPostalCode('1000')).toBe(true);
      expect(isValidPostalCode('2000')).toBe(true);
      expect(isValidPostalCode('9000')).toBe(true);
    });

    it('should return false for invalid postal codes', () => {
      expect(isValidPostalCode('9999')).toBe(false);
      expect(isValidPostalCode('0000')).toBe(false);
      expect(isValidPostalCode('abc')).toBe(false);
      expect(isValidPostalCode('')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidPostalCode(' 1000 ')).toBe(true);
    });
  });

  describe('POSTAL_CODES', () => {
    it('should have entries for all major cities', () => {
      expect(POSTAL_CODES['1000']).toBeDefined();
      expect(POSTAL_CODES['2000']).toBeDefined();
      expect(POSTAL_CODES['3000']).toBeDefined();
      expect(POSTAL_CODES['4000']).toBeDefined();
      expect(POSTAL_CODES['5000']).toBeDefined();
      expect(POSTAL_CODES['6000']).toBeDefined();
      expect(POSTAL_CODES['8000']).toBeDefined();
      expect(POSTAL_CODES['9000']).toBeDefined();
    });

    it('should have more than 400 entries', () => {
      expect(Object.keys(POSTAL_CODES).length).toBeGreaterThan(400);
    });
  });
});

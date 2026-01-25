/**
 * @file validate.test.ts
 * @description Tests for Zod validation utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  safeValidate,
  validateWithResult,
  validateArray,
  strictValidate,
  validateSupabaseResponse,
  createQueryValidator,
} from './validate';

// Test schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().positive(),
});

const SimpleSchema = z.object({
  value: z.number(),
});

describe('validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeValidate', () => {
    it('should return data for valid input', () => {
      const data = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      const result = safeValidate(UserSchema, data);
      expect(result).toEqual(data);
    });

    it('should return null for invalid input', () => {
      const data = { id: '1', name: 'John', email: 'invalid-email', age: 30 };
      const result = safeValidate(UserSchema, data);
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const data = { id: '1', name: 'John' };
      const result = safeValidate(UserSchema, data);
      expect(result).toBeNull();
    });

    it('should return null for wrong types', () => {
      const data = { id: '1', name: 'John', email: 'john@example.com', age: 'thirty' };
      const result = safeValidate(UserSchema, data);
      expect(result).toBeNull();
    });

    it('should handle null input', () => {
      const result = safeValidate(UserSchema, null);
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = safeValidate(UserSchema, undefined);
      expect(result).toBeNull();
    });
  });

  describe('validateWithResult', () => {
    it('should return success result for valid input', () => {
      const data = { value: 42 };
      const result = validateWithResult(SimpleSchema, data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it('should return error result for invalid input', () => {
      const data = { value: 'not a number' };
      const result = validateWithResult(SimpleSchema, data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.data).toBeNull();
      }
    });

    it('should provide ZodError in error result', () => {
      const data = { value: 'invalid' };
      const result = validateWithResult(SimpleSchema, data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('validateArray', () => {
    it('should return all valid items', () => {
      const data = [{ value: 1 }, { value: 2 }, { value: 3 }];
      const result = validateArray(SimpleSchema, data);
      expect(result).toHaveLength(3);
      expect(result).toEqual(data);
    });

    it('should filter out invalid items', () => {
      const data = [{ value: 1 }, { value: 'invalid' }, { value: 3 }];
      const result = validateArray(SimpleSchema, data);
      expect(result).toHaveLength(2);
      expect(result).toEqual([{ value: 1 }, { value: 3 }]);
    });

    it('should return empty array when all items are invalid', () => {
      const data = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];
      const result = validateArray(SimpleSchema, data);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const result = validateArray(SimpleSchema, []);
      expect(result).toHaveLength(0);
    });

    it('should handle mixed valid and invalid complex objects', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'invalid', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];
      const result = validateArray(UserSchema, data);
      expect(result).toHaveLength(2);
    });
  });

  describe('strictValidate', () => {
    it('should return data for valid input', () => {
      const data = { value: 42 };
      const result = strictValidate(SimpleSchema, data);
      expect(result).toEqual(data);
    });

    it('should throw error for invalid input', () => {
      const data = { value: 'invalid' };
      expect(() => strictValidate(SimpleSchema, data)).toThrow();
    });

    it('should include custom error message', () => {
      const data = { value: 'invalid' };
      expect(() => strictValidate(SimpleSchema, data, 'Custom error')).toThrow('Custom error');
    });

    it('should throw with default message when no custom message provided', () => {
      const data = { value: 'invalid' };
      expect(() => strictValidate(SimpleSchema, data)).toThrow('Validation failed');
    });
  });

  describe('validateSupabaseResponse', () => {
    it('should return data for valid response', () => {
      const response = { data: { value: 42 }, error: null };
      const result = validateSupabaseResponse(SimpleSchema, response);
      expect(result).toEqual({ value: 42 });
    });

    it('should return null for response with error', () => {
      const response = { data: { value: 42 }, error: new Error('Database error') };
      const result = validateSupabaseResponse(SimpleSchema, response);
      expect(result).toBeNull();
    });

    it('should return null for null data', () => {
      const response = { data: null, error: null };
      const result = validateSupabaseResponse(SimpleSchema, response);
      expect(result).toBeNull();
    });

    it('should return null for invalid data structure', () => {
      const response = { data: { value: 'invalid' }, error: null };
      const result = validateSupabaseResponse(SimpleSchema, response);
      expect(result).toBeNull();
    });
  });

  describe('createQueryValidator', () => {
    it('should create a validator function', () => {
      const validator = createQueryValidator(SimpleSchema);
      expect(typeof validator).toBe('function');
    });

    it('should validate correctly when called', () => {
      const validator = createQueryValidator(SimpleSchema);
      expect(validator({ value: 42 })).toEqual({ value: 42 });
      expect(validator({ value: 'invalid' })).toBeNull();
    });

    it('should work with complex schemas', () => {
      const validator = createQueryValidator(UserSchema);
      const validData = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      expect(validator(validData)).toEqual(validData);
    });
  });
});

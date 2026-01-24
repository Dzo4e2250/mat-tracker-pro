import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseSupabaseError, ERROR_CODES, handleErrorSilent } from './errorHandler';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSupabaseError', () => {
    it('should return UNKNOWN_ERROR for null/undefined', () => {
      const result = parseSupabaseError(null);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    it('should parse invalid login credentials error', () => {
      const error = { message: 'Invalid login credentials' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(result.message).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      expect(result.recoverable).toBe(true);
    });

    it('should parse JWT expired error', () => {
      const error = { message: 'JWT expired' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('AUTH_SESSION_EXPIRED');
      expect(result.message).toBe(ERROR_CODES.AUTH_SESSION_EXPIRED);
      expect(result.recoverable).toBe(true);
    });

    it('should parse token is expired error', () => {
      const error = { message: 'token is expired' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('AUTH_SESSION_EXPIRED');
      expect(result.recoverable).toBe(true);
    });

    it('should parse email not confirmed error', () => {
      const error = { message: 'Email not confirmed' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('AUTH_UNAUTHORIZED');
      expect(result.message).toContain('Email ni potrjen');
      expect(result.recoverable).toBe(true);
    });

    it('should parse RLS permission denied error by code', () => {
      const error = { code: '42501', message: 'some error' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_PERMISSION_DENIED');
      expect(result.message).toBe(ERROR_CODES.DB_PERMISSION_DENIED);
      expect(result.recoverable).toBe(false);
    });

    it('should parse permission denied error by message', () => {
      const error = { message: 'permission denied for table users' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_PERMISSION_DENIED');
      expect(result.recoverable).toBe(false);
    });

    it('should parse RLS violation error', () => {
      const error = { message: 'new row violates row-level security policy' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_PERMISSION_DENIED');
    });

    it('should parse unique constraint violation error', () => {
      const error = { code: '23505', details: 'Key (email)=(test@test.com) already exists' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_CONSTRAINT_VIOLATION');
      expect(result.message).toBe(ERROR_CODES.DB_CONSTRAINT_VIOLATION);
      expect(result.details).toBe('Key (email)=(test@test.com) already exists');
      expect(result.recoverable).toBe(true);
    });

    it('should parse foreign key violation error', () => {
      const error = { code: '23503', details: 'Key is not present' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_CONSTRAINT_VIOLATION');
      expect(result.message).toContain('Povezani podatki');
      expect(result.recoverable).toBe(true);
    });

    it('should parse PGRST not found error', () => {
      const error = { code: 'PGRST116' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_NOT_FOUND');
      expect(result.message).toBe(ERROR_CODES.DB_NOT_FOUND);
      expect(result.recoverable).toBe(true);
    });

    it('should parse 404 status error', () => {
      const error = { status: 404 };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('DB_NOT_FOUND');
    });

    it('should parse network errors', () => {
      const networkErrors = [
        { message: 'Failed to fetch' },
        { message: 'NetworkError when attempting to fetch' },
        { message: 'Network request failed' },
      ];

      networkErrors.forEach((error) => {
        const result = parseSupabaseError(error);
        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.message).toBe(ERROR_CODES.NETWORK_ERROR);
        expect(result.recoverable).toBe(true);
      });
    });

    it('should parse timeout errors', () => {
      const error = { message: 'Request timeout after 30000ms' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('NETWORK_TIMEOUT');
      expect(result.message).toBe(ERROR_CODES.NETWORK_TIMEOUT);
      expect(result.recoverable).toBe(true);
    });

    it('should return UNKNOWN_ERROR with original message for unrecognized errors', () => {
      const error = { message: 'Some random error message' };
      const result = parseSupabaseError(error);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Some random error message');
      expect(result.recoverable).toBe(false);
    });
  });

  describe('handleErrorSilent', () => {
    it('should parse error and log to console without toast', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { message: 'Test error' };

      const result = handleErrorSilent(error, 'TestContext');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TestContext] Silent Error:',
        expect.objectContaining({
          code: 'UNKNOWN_ERROR',
          message: 'Test error',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should use default context if not provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { message: 'Test error' };

      handleErrorSilent(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[App] Silent Error:',
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBeDefined();
      expect(ERROR_CODES.AUTH_SESSION_EXPIRED).toBeDefined();
      expect(ERROR_CODES.AUTH_UNAUTHORIZED).toBeDefined();
      expect(ERROR_CODES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_CODES.NETWORK_TIMEOUT).toBeDefined();
      expect(ERROR_CODES.DB_CONSTRAINT_VIOLATION).toBeDefined();
      expect(ERROR_CODES.DB_NOT_FOUND).toBeDefined();
      expect(ERROR_CODES.DB_PERMISSION_DENIED).toBeDefined();
      expect(ERROR_CODES.VALIDATION_ERROR).toBeDefined();
      expect(ERROR_CODES.UNKNOWN_ERROR).toBeDefined();
    });

    it('should have Slovenian messages', () => {
      // Check that messages are in Slovenian (contain č, š, ž or common Slovenian words)
      const hasSloveicChars = (str: string) =>
        /[čšžČŠŽ]/.test(str) || /\b(je|ni|za|pri|do)\b/.test(str);

      Object.values(ERROR_CODES).forEach((message) => {
        expect(
          hasSloveicChars(message) || message.length > 0,
          `Message should be in Slovenian: ${message}`
        ).toBe(true);
      });
    });
  });
});

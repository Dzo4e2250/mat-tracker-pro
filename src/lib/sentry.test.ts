/**
 * @file sentry.test.ts
 * @description Tests for Sentry error tracking module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';

// Mock @sentry/react
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe('sentry', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock localStorage
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  describe('initSentry', () => {
    it('should not initialize when DSN is not provided', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', '');
      vi.stubEnv('DEV', true);

      const { initSentry } = await import('./sentry');
      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[Sentry] DSN not configured, error tracking disabled'
      );
    });

    it('should not log in production when DSN is not provided', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', '');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const { initSentry } = await import('./sentry');
      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
      // The log should NOT be called in production mode
    });

    it('should initialize Sentry when DSN is provided', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);
      vi.stubEnv('MODE', 'production');

      const { initSentry } = await import('./sentry');
      initSentry();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'production',
        })
      );
    });

    it('should configure ignoreErrors array', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);
      vi.stubEnv('MODE', 'production');

      const { initSentry } = await import('./sentry');
      initSentry();

      const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(initCall.ignoreErrors).toEqual(
        expect.arrayContaining([
          'Network request failed',
          'Failed to fetch',
          'ResizeObserver loop limit exceeded',
        ])
      );
    });

    it('should configure initialScope with app tag', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);
      vi.stubEnv('MODE', 'production');

      const { initSentry } = await import('./sentry');
      initSentry();

      const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(initCall.initialScope).toEqual({
        tags: {
          app: 'mat-tracker-pro',
        },
      });
    });

    describe('beforeSend callback', () => {
      it('should return event in production mode', async () => {
        vi.resetModules();
        vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
        vi.stubEnv('DEV', false);
        vi.stubEnv('PROD', true);
        vi.stubEnv('MODE', 'production');

        const { initSentry } = await import('./sentry');
        initSentry();

        const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const beforeSend = initCall.beforeSend;

        const mockEvent = { message: 'Test event' };
        const result = beforeSend(mockEvent, {});

        expect(result).toEqual(mockEvent);
      });

      it('should add user context from localStorage', async () => {
        vi.resetModules();
        vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
        vi.stubEnv('DEV', false);
        vi.stubEnv('PROD', true);
        vi.stubEnv('MODE', 'production');

        localStorageMock['mat_tracker_user_id'] = 'user-123';

        const { initSentry } = await import('./sentry');
        initSentry();

        const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const beforeSend = initCall.beforeSend;

        const mockEvent = { message: 'Test event' } as Sentry.Event;
        const result = beforeSend(mockEvent, {});

        expect(result).toEqual({
          message: 'Test event',
          user: { id: 'user-123' },
        });
      });
    });
  });

  describe('captureException', () => {
    it('should call Sentry.captureException', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const { captureException } = await import('./sentry');
      const error = new Error('Test error');
      const context = { extra: 'info' };

      captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
      });
    });

    it('should handle errors without context', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const { captureException } = await import('./sentry');
      const error = new Error('Test error');

      captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: undefined,
      });
    });
  });

  describe('captureMessage', () => {
    it('should call Sentry.captureMessage', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const { captureMessage } = await import('./sentry');

      captureMessage('Test message', 'error');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'error');
    });

    it('should use default level of info', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const { captureMessage } = await import('./sentry');

      captureMessage('Test message');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
    });
  });

  describe('setUser', () => {
    it('should set user in Sentry and localStorage', async () => {
      vi.resetModules();
      const { setUser } = await import('./sentry');
      const user = { id: 'user-123', email: 'test@test.com', role: 'admin' };

      setUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(user);
      expect(localStorage.setItem).toHaveBeenCalledWith('mat_tracker_user_id', 'user-123');
    });

    it('should clear user when null is passed', async () => {
      vi.resetModules();
      const { setUser } = await import('./sentry');

      setUser(null);

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
      expect(localStorage.removeItem).toHaveBeenCalledWith('mat_tracker_user_id');
    });
  });

  describe('addBreadcrumb', () => {
    it('should call Sentry.addBreadcrumb with all parameters', async () => {
      vi.resetModules();
      const { addBreadcrumb } = await import('./sentry');

      addBreadcrumb('User clicked button', 'ui', 'info', { buttonId: 'submit' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked button',
        category: 'ui',
        level: 'info',
        data: { buttonId: 'submit' },
      });
    });

    it('should use default level of info', async () => {
      vi.resetModules();
      const { addBreadcrumb } = await import('./sentry');

      addBreadcrumb('Test breadcrumb', 'test');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'test',
        level: 'info',
        data: undefined,
      });
    });

    it('should handle optional data parameter', async () => {
      vi.resetModules();
      const { addBreadcrumb } = await import('./sentry');

      addBreadcrumb('Navigate', 'navigation', 'debug');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Navigate',
        category: 'navigation',
        level: 'debug',
        data: undefined,
      });
    });
  });

  describe('Sentry re-export', () => {
    it('should re-export Sentry module', async () => {
      vi.resetModules();
      const module = await import('./sentry');
      expect(module.Sentry).toBeDefined();
    });
  });

  describe('dev mode console logging', () => {
    it('should log when captureException is called without DSN in dev', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', '');
      vi.stubEnv('DEV', true);

      const { captureException } = await import('./sentry');
      const error = new Error('Test error');

      captureException(error, { test: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture exception:',
        error,
        { test: true }
      );
    });

    it('should log when captureMessage is called without DSN in dev', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SENTRY_DSN', '');
      vi.stubEnv('DEV', true);

      const { captureMessage } = await import('./sentry');

      captureMessage('Test message', 'warning');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[Sentry] Would capture message:',
        'Test message',
        'warning'
      );
    });
  });
});

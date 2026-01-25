/**
 * @file sentry.ts
 * @description Sentry error tracking configuration
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] DSN not configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay for debugging (only in production, 10% of sessions)
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'AbortError',
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Common benign errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // User-triggered navigation
      'Navigation cancelled',
    ],

    // Add app context
    initialScope: {
      tags: {
        app: 'mat-tracker-pro',
      },
    },

    // Before sending, add extra context
    beforeSend(event, hint) {
      // Don't send in development unless explicitly enabled
      if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEBUG) {
        console.info('[Sentry] Would send event:', event);
        return null;
      }

      // Add user context if available
      const userId = localStorage.getItem('mat_tracker_user_id');
      if (userId) {
        event.user = { id: userId };
      }

      return event;
    },
  });

  if (import.meta.env.DEV) {
    console.info('[Sentry] Initialized in', import.meta.env.MODE, 'mode');
  }
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN && import.meta.env.DEV) {
    console.error('[Sentry] Would capture exception:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!SENTRY_DSN && import.meta.env.DEV) {
    console.info('[Sentry] Would capture message:', message, level);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; role?: string } | null) {
  if (user) {
    Sentry.setUser(user);
    localStorage.setItem('mat_tracker_user_id', user.id);
  } else {
    Sentry.setUser(null);
    localStorage.removeItem('mat_tracker_user_id');
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

// Re-export Sentry's ErrorBoundary for convenience
export { Sentry };

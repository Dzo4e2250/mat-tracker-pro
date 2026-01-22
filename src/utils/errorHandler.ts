import { toast } from 'sonner';

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  recoverable?: boolean;
}

// Known error codes with Slovenian messages
export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'Napacen email ali geslo',
  AUTH_SESSION_EXPIRED: 'Seja je potekla, prosimo prijavite se znova',
  AUTH_UNAUTHORIZED: 'Nimate dovoljenja za to akcijo',

  // Network
  NETWORK_ERROR: 'Napaka pri povezavi s streznikom',
  NETWORK_TIMEOUT: 'Zahteva je trajala predolgo',

  // Database
  DB_CONSTRAINT_VIOLATION: 'Podatek ze obstaja',
  DB_NOT_FOUND: 'Podatek ni bil najden',
  DB_PERMISSION_DENIED: 'Nimate dovoljenja za dostop do tega podatka',

  // Validation
  VALIDATION_ERROR: 'Napacni podatki',
  REQUIRED_FIELD: 'To polje je obvezno',

  // Business logic
  CYCLE_ALREADY_ACTIVE: 'Ta QR koda je ze aktivna',
  CYCLE_NOT_ON_TEST: 'Cikel ni v statusu na testu',
  INVALID_STATUS_TRANSITION: 'Neveljavna sprememba statusa',

  // Generic
  UNKNOWN_ERROR: 'Prislo je do napake',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// Parse Supabase error to AppError
export function parseSupabaseError(error: unknown): AppError {
  if (!error) {
    return { code: 'UNKNOWN_ERROR', message: ERROR_CODES.UNKNOWN_ERROR };
  }

  const supabaseError = error as {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  };

  // Auth errors
  if (supabaseError.message?.includes('Invalid login credentials')) {
    return {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      recoverable: true,
    };
  }

  if (supabaseError.message?.includes('JWT expired') ||
      supabaseError.message?.includes('token is expired')) {
    return {
      code: 'AUTH_SESSION_EXPIRED',
      message: ERROR_CODES.AUTH_SESSION_EXPIRED,
      recoverable: true,
    };
  }

  if (supabaseError.message?.includes('Email not confirmed')) {
    return {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Email ni potrjen. Preverite vaso elektronsko posto.',
      recoverable: true,
    };
  }

  // RLS / Permission errors
  if (supabaseError.code === '42501' ||
      supabaseError.message?.includes('permission denied') ||
      supabaseError.message?.includes('new row violates row-level security')) {
    return {
      code: 'DB_PERMISSION_DENIED',
      message: ERROR_CODES.DB_PERMISSION_DENIED,
      recoverable: false,
    };
  }

  // Unique constraint violation
  if (supabaseError.code === '23505') {
    return {
      code: 'DB_CONSTRAINT_VIOLATION',
      message: ERROR_CODES.DB_CONSTRAINT_VIOLATION,
      details: supabaseError.details,
      recoverable: true,
    };
  }

  // Foreign key violation
  if (supabaseError.code === '23503') {
    return {
      code: 'DB_CONSTRAINT_VIOLATION',
      message: 'Povezani podatki se obstajajo ali manjkajo',
      details: supabaseError.details,
      recoverable: true,
    };
  }

  // Not found
  if (supabaseError.code === 'PGRST116' || supabaseError.status === 404) {
    return {
      code: 'DB_NOT_FOUND',
      message: ERROR_CODES.DB_NOT_FOUND,
      recoverable: true,
    };
  }

  // Network errors
  if (supabaseError.message?.includes('Failed to fetch') ||
      supabaseError.message?.includes('NetworkError') ||
      supabaseError.message?.includes('Network request failed')) {
    return {
      code: 'NETWORK_ERROR',
      message: ERROR_CODES.NETWORK_ERROR,
      recoverable: true,
    };
  }

  // Timeout
  if (supabaseError.message?.includes('timeout') ||
      supabaseError.message?.includes('Timeout')) {
    return {
      code: 'NETWORK_TIMEOUT',
      message: ERROR_CODES.NETWORK_TIMEOUT,
      recoverable: true,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: supabaseError.message || ERROR_CODES.UNKNOWN_ERROR,
    details: error,
    recoverable: false,
  };
}

// Main error handler - logs and shows toast
export function handleError(error: unknown, context?: string): AppError {
  const appError = parseSupabaseError(error);

  // Log to console
  console.error(`[${context || 'App'}] Error:`, {
    code: appError.code,
    message: appError.message,
    details: appError.details,
    originalError: error,
  });

  // Show toast notification
  toast.error(appError.message, {
    description: appError.recoverable
      ? 'Poskusite znova'
      : 'Kontaktirajte podporo ce se napaka ponavlja',
    duration: 5000,
  });

  return appError;
}

// For use in React Query
export function createQueryErrorHandler(context: string) {
  return (error: unknown) => {
    handleError(error, context);
  };
}

// Async action wrapper with error handling
export async function asyncAction<T>(
  action: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null; success: boolean }> {
  try {
    const data = await action();
    return { data, error: null, success: true };
  } catch (error) {
    const appError = handleError(error, context);
    return { data: null, error: appError, success: false };
  }
}

// Silent error handler (logs but doesn't show toast)
export function handleErrorSilent(error: unknown, context?: string): AppError {
  const appError = parseSupabaseError(error);

  console.error(`[${context || 'App'}] Silent Error:`, {
    code: appError.code,
    message: appError.message,
    details: appError.details,
  });

  return appError;
}

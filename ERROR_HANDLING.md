# Mat Tracker Pro - Error Handling Strategy

## Pregled

Cilj: Implementirati robustno ravnanje z napakami po celotni aplikaciji.

---

## Trenutno stanje

- Osnovni try-catch bloki v nekaterih funkcijah
- Toast notifikacije za uporabniške napake (sonner)
- Ni globalnega error boundary
- Ni centralizeranega logiranja napak

---

## Načrt implementacije

### 1. React Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to external service (Sentry, LogRocket, etc.)
    logError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Nekaj je šlo narobe
            </h1>
            <p className="text-gray-600 mb-6">
              Prišlo je do nepričakovane napake. Prosimo, poskusite znova ali
              se vrnite na domačo stran.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 bg-red-50 rounded text-left">
                <p className="text-sm font-mono text-red-700 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Poskusi znova
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Domov
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper function for logging
function logError(error: Error, errorInfo: ErrorInfo) {
  // V produkciji pošlji na Sentry ali podobno storitev
  console.error('Error caught by boundary:', error);
  console.error('Component stack:', errorInfo.componentStack);

  // TODO: Pošlji na backend za beleženje
  // fetch('/api/log-error', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     message: error.message,
  //     stack: error.stack,
  //     componentStack: errorInfo.componentStack,
  //     url: window.location.href,
  //     timestamp: new Date().toISOString(),
  //   }),
  // });
}
```

### 2. Error Boundary uporaba v App.tsx

```typescript
// src/App.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingSpinner />}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

### 3. Page-level Error Boundaries

```typescript
// src/pages/Contacts.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap posamezne sekcije z error boundary
function Contacts() {
  return (
    <div>
      <ErrorBoundary fallback={<CompanyListError />}>
        <CompanyList />
      </ErrorBoundary>

      <ErrorBoundary fallback={<MapError />}>
        <ContactsMap />
      </ErrorBoundary>
    </div>
  );
}

function CompanyListError() {
  return (
    <div className="p-4 bg-red-50 rounded-lg text-center">
      <p className="text-red-600">Napaka pri nalaganju strank</p>
      <button onClick={() => window.location.reload()}>
        Osveži stran
      </button>
    </div>
  );
}
```

---

### 4. Centraliziran Error Handler

```typescript
// src/utils/errorHandler.ts
import { toast } from 'sonner';

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  recoverable?: boolean;
}

// Znani tipi napak
export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'Napačen email ali geslo',
  AUTH_SESSION_EXPIRED: 'Seja je potekla, prosimo prijavite se znova',
  AUTH_UNAUTHORIZED: 'Nimate dovoljenja za to akcijo',

  // Network
  NETWORK_ERROR: 'Napaka pri povezavi s strežnikom',
  NETWORK_TIMEOUT: 'Zahteva je trajala predolgo',

  // Database
  DB_CONSTRAINT_VIOLATION: 'Podatek že obstaja',
  DB_NOT_FOUND: 'Podatek ni bil najden',
  DB_PERMISSION_DENIED: 'Nimate dovoljenja za dostop do tega podatka',

  // Validation
  VALIDATION_ERROR: 'Napačni podatki',
  REQUIRED_FIELD: 'To polje je obvezno',

  // Business logic
  CYCLE_ALREADY_ACTIVE: 'Ta QR koda je že aktivna',
  CYCLE_NOT_ON_TEST: 'Cikel ni v statusu na testu',
  INVALID_STATUS_TRANSITION: 'Neveljavna sprememba statusa',

  // Generic
  UNKNOWN_ERROR: 'Prišlo je do napake',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// Parse Supabase napake
export function parseSupabaseError(error: unknown): AppError {
  if (!error) {
    return { code: 'UNKNOWN_ERROR', message: ERROR_CODES.UNKNOWN_ERROR };
  }

  const supabaseError = error as { code?: string; message?: string; details?: string };

  // Auth napake
  if (supabaseError.message?.includes('Invalid login credentials')) {
    return {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      recoverable: true,
    };
  }

  if (supabaseError.message?.includes('JWT expired')) {
    return {
      code: 'AUTH_SESSION_EXPIRED',
      message: ERROR_CODES.AUTH_SESSION_EXPIRED,
      recoverable: true,
    };
  }

  // RLS napake
  if (supabaseError.code === '42501' || supabaseError.message?.includes('permission denied')) {
    return {
      code: 'DB_PERMISSION_DENIED',
      message: ERROR_CODES.DB_PERMISSION_DENIED,
      recoverable: false,
    };
  }

  // Unique constraint
  if (supabaseError.code === '23505') {
    return {
      code: 'DB_CONSTRAINT_VIOLATION',
      message: ERROR_CODES.DB_CONSTRAINT_VIOLATION,
      details: supabaseError.details,
      recoverable: true,
    };
  }

  // Not found
  if (supabaseError.code === 'PGRST116') {
    return {
      code: 'DB_NOT_FOUND',
      message: ERROR_CODES.DB_NOT_FOUND,
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

// Glavni error handler
export function handleError(error: unknown, context?: string): AppError {
  const appError = parseSupabaseError(error);

  // Log
  console.error(`[${context || 'App'}] Error:`, appError);

  // Prikaži toast
  toast.error(appError.message, {
    description: appError.recoverable
      ? 'Poskusite znova'
      : 'Kontaktirajte podporo če se napaka ponavlja',
  });

  return appError;
}

// Za uporabo v React Query
export function createQueryErrorHandler(context: string) {
  return (error: unknown) => {
    handleError(error, context);
  };
}
```

---

### 5. React Query Error Handling

```typescript
// src/lib/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { handleError } from '@/utils/errorHandler';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Prikaži napako samo če ni silent query
      if (query.meta?.silent !== true) {
        handleError(error, `Query: ${query.queryKey.join('/')}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      handleError(error, `Mutation: ${mutation.options.mutationKey?.join('/') || 'unknown'}`);
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Ne ponavljaj auth napak
        const appError = parseSupabaseError(error);
        if (appError.code.startsWith('AUTH_')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
```

---

### 6. Hook za error handling v formah

```typescript
// src/hooks/useFormError.ts
import { useState, useCallback } from 'react';
import { AppError, handleError } from '@/utils/errorHandler';

interface UseFormErrorReturn {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  handleFormError: (error: unknown) => void;
  clearError: () => void;
}

export function useFormError(): UseFormErrorReturn {
  const [error, setError] = useState<AppError | null>(null);

  const handleFormError = useCallback((err: unknown) => {
    const appError = handleError(err, 'Form');
    setError(appError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, setError, handleFormError, clearError };
}

// Uporaba v komponenti
function AddCompanyForm() {
  const { error, handleFormError, clearError } = useFormError();
  const createCompany = useCreateCompany();

  const handleSubmit = async (data: CompanyFormData) => {
    clearError();
    try {
      await createCompany.mutateAsync(data);
    } catch (err) {
      handleFormError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {/* ... form fields */}
    </form>
  );
}
```

---

### 7. Async Action Wrapper

```typescript
// src/utils/asyncAction.ts
import { handleError } from './errorHandler';

interface AsyncActionResult<T> {
  data: T | null;
  error: AppError | null;
  success: boolean;
}

export async function asyncAction<T>(
  action: () => Promise<T>,
  context?: string
): Promise<AsyncActionResult<T>> {
  try {
    const data = await action();
    return { data, error: null, success: true };
  } catch (error) {
    const appError = handleError(error, context);
    return { data: null, error: appError, success: false };
  }
}

// Uporaba
const { data, error, success } = await asyncAction(
  () => supabase.from('companies').insert(newCompany),
  'CreateCompany'
);

if (success) {
  toast.success('Podjetje uspešno dodano');
}
```

---

### 8. Loading in Error States v komponentah

```typescript
// src/components/DataLoader.tsx
import { ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataLoaderProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  children: ReactNode;
  loadingText?: string;
}

export function DataLoader({
  isLoading,
  isError,
  error,
  onRetry,
  children,
  loadingText = 'Nalagam...',
}: DataLoaderProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-gray-600">{loadingText}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="mt-2 text-gray-900 font-medium">Napaka pri nalaganju</p>
        <p className="text-sm text-gray-500 mt-1">
          {(error as Error)?.message || 'Neznana napaka'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Poskusi znova
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// Uporaba
function CompanyList() {
  const { data, isLoading, isError, error, refetch } = useCompanies();

  return (
    <DataLoader
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      loadingText="Nalagam stranke..."
    >
      {data?.map((company) => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </DataLoader>
  );
}
```

---

### 9. Network Error Detection

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Povezava vzpostavljena');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Ni internetne povezave', {
        duration: Infinity,
        id: 'offline-toast',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Uporaba v App.tsx
function App() {
  const isOnline = useNetworkStatus();

  return (
    <div>
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 fixed top-0 left-0 right-0 z-50">
          Ni internetne povezave
        </div>
      )}
      {/* rest of app */}
    </div>
  );
}
```

---

### 10. Supabase Session Error Handler

```typescript
// src/contexts/AuthContext.tsx
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }

      if (event === 'SIGNED_OUT') {
        // Očisti cache
        queryClient.clear();
      }

      if (event === 'USER_UPDATED' && !session) {
        toast.error('Seja je potekla', {
          description: 'Prosimo, prijavite se znova',
          action: {
            label: 'Prijava',
            onClick: () => (window.location.href = '/login'),
          },
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
}
```

---

## Povzetek implementacije

| Komponenta | Datoteka | Namen |
|------------|----------|-------|
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | Ulovi React napake |
| errorHandler | `src/utils/errorHandler.ts` | Centraliziran handler |
| queryClient | `src/lib/queryClient.ts` | React Query error handling |
| useFormError | `src/hooks/useFormError.ts` | Form error state |
| DataLoader | `src/components/DataLoader.tsx` | Loading/Error UI |
| useNetworkStatus | `src/hooks/useNetworkStatus.ts` | Network detection |

---

## Prioritete implementacije

1. **ErrorBoundary** - Prepreči bel ekran pri crashu
2. **errorHandler** - Enotno parsiranje napak
3. **queryClient config** - Globalno ravnanje za API klice
4. **DataLoader** - Konsistenten UI za loading/error stanja
5. **useNetworkStatus** - Obvestilo pri izgubi povezave
6. **Logging** - Pošiljanje napak na backend (opcijsko)

---

*Posodobljeno: 2026-01-18*

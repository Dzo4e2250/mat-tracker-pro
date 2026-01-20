# Mat Tracker Pro - Testing Strategy

## Pregled

Trenutno stanje: **0 testov**

Cilj: Dodati smiselno pokritost s testi za kritične poti aplikacije.

---

## Tech Stack za testiranje

| Orodje | Namen | Zakaj |
|--------|-------|-------|
| **Vitest** | Unit & Integration testi | Hitro, Vite integracija, Jest-compatible API |
| **React Testing Library** | Testiranje komponent | Testiranje iz perspektive uporabnika |
| **MSW** | Mock Service Worker | Mockanje API klicev |
| **Playwright** | E2E testi | Cross-browser, zanesljivo |

---

## Setup

### 1. Namestitev odvisnosti

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
npm install -D @playwright/test
```

### 2. Vitest konfiguracija

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/components/ui/', // shadcn komponente
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// MSW setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

### 4. MSW Handlers

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://api-matpro.ristov.xyz';

export const handlers = [
  // Mock: Get cycles
  http.get(`${SUPABASE_URL}/rest/v1/cycles`, () => {
    return HttpResponse.json([
      {
        id: '1',
        qr_code_id: 'qr-1',
        status: 'on_test',
        test_start_date: new Date().toISOString(),
        company: { name: 'Test Company' },
        qr_code: { code: 'GEO-001' },
        mat_type: { name: 'GEO 60x90' },
      },
    ]);
  }),

  // Mock: Get companies
  http.get(`${SUPABASE_URL}/rest/v1/companies`, () => {
    return HttpResponse.json([
      { id: '1', name: 'ABC d.o.o.', display_name: 'ABC' },
      { id: '2', name: 'XYZ d.o.o.', display_name: 'XYZ' },
    ]);
  }),

  // Mock: Auth
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 5. Test Utilities

```typescript
// src/test/utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

---

## Prioritete testiranja

### Prioriteta 1: Utility funkcije (Unit testi)

Te funkcije so najpomembnejše in najlažje za testiranje.

```typescript
// src/utils/__tests__/priceList.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMonthlyPrice, calculateSeasonalPrice, MAT_PRICES } from '../priceList';

describe('priceList', () => {
  describe('calculateMonthlyPrice', () => {
    it('should calculate monthly price for GEO 60x90', () => {
      const price = calculateMonthlyPrice('GEO 60x90', 4); // 4x mesečno
      expect(price).toBe(180); // 45 * 4
    });

    it('should return 0 for unknown mat type', () => {
      const price = calculateMonthlyPrice('UNKNOWN', 4);
      expect(price).toBe(0);
    });
  });

  describe('calculateSeasonalPrice', () => {
    it('should calculate seasonal price for 2 seasons', () => {
      const price = calculateSeasonalPrice('GEO 60x90', 2, 4);
      expect(price).toBe(304); // 38 * 4 * 2
    });
  });
});
```

```typescript
// src/utils/__tests__/postalCodes.test.ts
import { describe, it, expect } from 'vitest';
import { getPlaceByPostalCode, isValidPostalCode } from '../postalCodes';

describe('postalCodes', () => {
  it('should return Ljubljana for 1000', () => {
    expect(getPlaceByPostalCode('1000')).toBe('Ljubljana');
  });

  it('should return Maribor for 2000', () => {
    expect(getPlaceByPostalCode('2000')).toBe('Maribor');
  });

  it('should return undefined for invalid postal code', () => {
    expect(getPlaceByPostalCode('9999')).toBeUndefined();
  });

  it('should validate postal codes', () => {
    expect(isValidPostalCode('1000')).toBe(true);
    expect(isValidPostalCode('123')).toBe(false);
    expect(isValidPostalCode('abcd')).toBe(false);
  });
});
```

```typescript
// src/pages/prodajalec/utils/__tests__/timeHelpers.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getTimeRemaining, formatCountdown } from '../timeHelpers';

describe('timeHelpers', () => {
  describe('getTimeRemaining', () => {
    it('should calculate days remaining', () => {
      const testStartDate = new Date();
      testStartDate.setDate(testStartDate.getDate() - 10); // 10 dni nazaj
      const currentTime = new Date();

      const result = getTimeRemaining(testStartDate.toISOString(), currentTime);

      expect(result).toBeDefined();
      expect(result?.days).toBe(4); // 14 - 10 = 4 dni
      expect(result?.expired).toBe(false);
    });

    it('should return expired for old tests', () => {
      const testStartDate = new Date();
      testStartDate.setDate(testStartDate.getDate() - 20); // 20 dni nazaj
      const currentTime = new Date();

      const result = getTimeRemaining(testStartDate.toISOString(), currentTime);

      expect(result?.expired).toBe(true);
    });

    it('should return null for missing date', () => {
      const result = getTimeRemaining(null, new Date());
      expect(result).toBeNull();
    });
  });

  describe('formatCountdown', () => {
    it('should format remaining time', () => {
      const timeRemaining = {
        days: 2,
        hours: 5,
        totalHours: 53,
        expired: false,
      };

      const result = formatCountdown(timeRemaining);

      expect(result?.text).toBe('2d 5h');
      expect(result?.color).toBe('orange'); // < 3 dni
    });

    it('should show red for expired', () => {
      const timeRemaining = {
        days: -1,
        hours: 0,
        totalHours: -24,
        expired: true,
      };

      const result = formatCountdown(timeRemaining);

      expect(result?.color).toBe('red');
    });
  });
});
```

### Prioriteta 2: Custom Hooks (Integration testi)

```typescript
// src/hooks/__tests__/useCycles.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCycles } from '../useCycles';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCycles', () => {
  it('should fetch cycles', async () => {
    const { result } = renderHook(() => useCycles('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].qr_code?.code).toBe('GEO-001');
  });

  it('should return empty array when no user', async () => {
    const { result } = renderHook(() => useCycles(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
```

```typescript
// src/hooks/__tests__/useCompanyContacts.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompanyContacts } from '../useCompanyContacts';
import { wrapper } from '../../test/utils';

describe('useCompanyContacts', () => {
  it('should fetch companies with contacts', async () => {
    const { result } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('should use cache for subsequent calls', async () => {
    const { result: result1 } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    const { result: result2 } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    // Druga zahteva bi morala uporabiti cache
    expect(result2.current.data).toEqual(result1.current.data);
  });
});
```

### Prioriteta 3: Komponente (Integration testi)

```typescript
// src/pages/prodajalec/components/__tests__/HomeView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import HomeView from '../HomeView';

const mockCycles = [
  {
    id: '1',
    status: 'on_test',
    test_start_date: new Date().toISOString(),
    company: { name: 'ABC d.o.o.', display_name: 'ABC' },
    company_id: 'company-1',
    qr_code: { code: 'GEO-001' },
    mat_type: { code: 'GEO', name: 'GEO 60x90' },
  },
  {
    id: '2',
    status: 'clean',
    company: { name: 'XYZ d.o.o.', display_name: 'XYZ' },
    company_id: 'company-2',
    qr_code: { code: 'GEO-002' },
    mat_type: { code: 'GEO', name: 'GEO 90x150' },
  },
];

describe('HomeView', () => {
  it('should render cycle statistics', () => {
    render(
      <HomeView
        cycles={mockCycles}
        currentTime={new Date()}
        statusFilter="all"
        expandedCompanies={new Set()}
        onStatusFilterChange={() => {}}
        onToggleCompany={() => {}}
        onCycleClick={() => {}}
      />
    );

    expect(screen.getByText('Moji predpražniki')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Skupaj
  });

  it('should filter cycles by status', () => {
    render(
      <HomeView
        cycles={mockCycles}
        currentTime={new Date()}
        statusFilter="on_test"
        expandedCompanies={new Set()}
        onStatusFilterChange={() => {}}
        onToggleCompany={() => {}}
        onCycleClick={() => {}}
      />
    );

    expect(screen.getByText('GEO-001')).toBeInTheDocument();
    expect(screen.queryByText('GEO-002')).not.toBeInTheDocument();
  });

  it('should call onCycleClick when cycle is clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <HomeView
        cycles={mockCycles}
        currentTime={new Date()}
        statusFilter="clean"
        expandedCompanies={new Set()}
        onStatusFilterChange={() => {}}
        onToggleCompany={() => {}}
        onCycleClick={handleClick}
      />
    );

    await user.click(screen.getByText('GEO-002'));

    expect(handleClick).toHaveBeenCalledWith(mockCycles[1]);
  });
});
```

```typescript
// src/pages/prodajalec/components/__tests__/ScanView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import ScanView from '../ScanView';

describe('ScanView', () => {
  const defaultProps = {
    cameraActive: false,
    cameraLoading: false,
    cameraError: null,
    zoomSupported: false,
    zoomLevel: 1,
    maxZoom: 4,
    scanInput: '',
    availableQRCodes: [
      { id: '1', code: 'GEO-001' },
      { id: '2', code: 'GEO-002' },
    ],
    onStartCamera: vi.fn(),
    onStopCamera: vi.fn(),
    onZoomChange: vi.fn(),
    onScanInputChange: vi.fn(),
    onScan: vi.fn(),
  };

  it('should render camera button when inactive', () => {
    render(<ScanView {...defaultProps} />);

    expect(screen.getByText('Pritisni za skeniranje')).toBeInTheDocument();
  });

  it('should call onStartCamera when camera button is clicked', async () => {
    const user = userEvent.setup();
    render(<ScanView {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /skeniranje/i }));

    expect(defaultProps.onStartCamera).toHaveBeenCalled();
  });

  it('should render available QR codes', () => {
    render(<ScanView {...defaultProps} />);

    expect(screen.getByText('GEO-001')).toBeInTheDocument();
    expect(screen.getByText('GEO-002')).toBeInTheDocument();
  });

  it('should call onScan when QR code button is clicked', async () => {
    const user = userEvent.setup();
    render(<ScanView {...defaultProps} />);

    await user.click(screen.getByText('GEO-001'));

    expect(defaultProps.onScan).toHaveBeenCalledWith('GEO-001');
  });

  it('should handle manual input', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      scanInput: 'GEO-',
    };
    render(<ScanView {...props} />);

    const input = screen.getByPlaceholderText('GEO-001');
    await user.type(input, '005');

    expect(defaultProps.onScanInputChange).toHaveBeenCalled();
  });
});
```

### Prioriteta 4: E2E testi (Playwright)

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/');

    // Preusmeri na login
    await expect(page).toHaveURL(/.*login/);

    // Vnesi credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Preveri preusmeritev na dashboard
    await expect(page).toHaveURL(/.*prodajalec/);
    await expect(page.getByText('Moji predpražniki')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/napaka|error/i)).toBeVisible();
  });
});
```

```typescript
// tests/e2e/prodajalec.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Prodajalec Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'prodajalec@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*prodajalec/);
  });

  test('should display cycles', async ({ page }) => {
    await expect(page.getByText('Moji predpražniki')).toBeVisible();
  });

  test('should navigate to scan view', async ({ page }) => {
    await page.click('text=Skeniraj');

    await expect(page.getByText('Pritisni za skeniranje')).toBeVisible();
  });

  test('should filter cycles by status', async ({ page }) => {
    // Klikni na filter tab
    await page.click('text=Na testu');

    // Preveri da so prikazani samo on_test cikli
    const cycles = page.locator('[data-testid="cycle-card"]');
    for (const cycle of await cycles.all()) {
      await expect(cycle).toHaveAttribute('data-status', 'on_test');
    }
  });

  test('should open cycle details modal', async ({ page }) => {
    // Klikni na cikel
    await page.click('[data-testid="cycle-card"]');

    // Preveri da se modal odpre
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
```

```typescript
// tests/e2e/contacts.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Contacts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'prodajalec@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*prodajalec/);

    // Navigate to contacts
    await page.click('text=Stranke');
    await page.waitForURL(/.*contacts/);
  });

  test('should display companies list', async ({ page }) => {
    await expect(page.getByText('Moje stranke')).toBeVisible();
  });

  test('should search companies', async ({ page }) => {
    await page.fill('input[placeholder*="Išči"]', 'ABC');

    // Počakaj na rezultate
    await page.waitForTimeout(500);

    const companies = page.locator('[data-testid="company-card"]');
    const count = await companies.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should add new company', async ({ page }) => {
    await page.click('button:has-text("Nova stranka")');

    // Izpolni formo
    await page.fill('input[name="name"]', 'Test Company');
    await page.fill('input[name="tax_number"]', '12345678');
    await page.fill('input[name="address_street"]', 'Testna ulica 1');
    await page.fill('input[name="address_postal"]', '1000');

    await page.click('button:has-text("Shrani")');

    // Preveri da je podjetje dodano
    await expect(page.getByText('Test Company')).toBeVisible();
  });
});
```

---

## Playwright konfiguracija

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## NPM Scripts

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## Ciljna pokritost

| Kategorija | Cilj | Prioriteta |
|------------|------|------------|
| Utility funkcije | 90%+ | VISOKA |
| Custom Hooks | 70%+ | VISOKA |
| View komponente | 60%+ | SREDNJA |
| E2E kritične poti | 100% | VISOKA |

### Kritične E2E poti

1. **Prijava/Odjava** - Auth flow
2. **Skeniranje QR kode** - Aktivacija cikla
3. **Dajanje na test** - Izbira podjetja, kontakta
4. **Podpis pogodbe** - Frekvenca, potrditev
5. **Dodajanje stranke** - CRM flow
6. **Generiranje ponudbe** - PDF izvoz

---

## Datotečna struktura testov

```
src/
├── test/
│   ├── setup.ts                 # Vitest setup
│   ├── utils.tsx                # Test utilities
│   └── mocks/
│       ├── handlers.ts          # MSW handlers
│       └── server.ts            # MSW server
├── utils/__tests__/
│   ├── priceList.test.ts
│   └── postalCodes.test.ts
├── hooks/__tests__/
│   ├── useCycles.test.tsx
│   └── useCompanyContacts.test.tsx
└── pages/
    └── prodajalec/
        └── components/__tests__/
            ├── HomeView.test.tsx
            └── ScanView.test.tsx

tests/
└── e2e/
    ├── auth.spec.ts
    ├── prodajalec.spec.ts
    └── contacts.spec.ts
```

---

*Posodobljeno: 2026-01-18*

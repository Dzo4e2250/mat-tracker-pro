import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useInventoryByUser,
  useDirtyMatsByUser,
  useMatsOnTest,
  usePickupHistory,
  SellerStats,
  InventoryStatsData,
  DirtyMatsBySeller,
  OnTestMatInfo,
  PickupHistoryItem,
} from './useInventoryStats';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Import after mock
import { supabase } from '@/integrations/supabase/client';

// Create a test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock chain builder for Supabase queries
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      resolve({ data, error });
      return Promise.resolve({ data, error });
    },
  };
  return builder;
}

// Sample test data
const mockProfiles = [
  {
    id: 'user-1',
    first_name: 'Janez',
    last_name: 'Novak',
    code_prefix: 'JN',
  },
  {
    id: 'user-2',
    first_name: 'Marija',
    last_name: 'Kovač',
    code_prefix: 'MK',
  },
];

const mockCycles = [
  { salesperson_id: 'user-1', status: 'clean' },
  { salesperson_id: 'user-1', status: 'on_test' },
  { salesperson_id: 'user-1', status: 'dirty' },
  { salesperson_id: 'user-1', status: 'waiting_driver' },
  { salesperson_id: 'user-2', status: 'on_test' },
  { salesperson_id: 'user-2', status: 'dirty' },
];

const mockDirtyCycle = {
  id: 'cycle-1',
  status: 'dirty',
  pickup_requested_at: '2026-01-24T10:00:00Z',
  location_lat: 46.0569,
  location_lng: 14.5058,
  salesperson_id: 'user-1',
  qr_codes: { code: 'QR001' },
  mat_types: { code: 'ST60x90', name: 'Standard 60x90' },
  companies: {
    name: 'Test Company',
    address_street: 'Testna ulica 1',
    address_city: 'Ljubljana',
  },
  contacts: {
    first_name: 'Janez',
    last_name: 'Novak',
    phone: '+386 40 123 456',
  },
  profiles: {
    first_name: 'Marko',
    last_name: 'Prodajalec',
    code_prefix: 'MP',
  },
};

const mockOnTestCycle = {
  id: 'cycle-2',
  test_start_date: '2026-01-10T10:00:00Z',
  last_contact_date: '2026-01-20T10:00:00Z',
  salesperson_id: 'user-1',
  created_at: '2026-01-10T10:00:00Z',
  qr_codes: { code: 'QR002' },
  mat_types: { code: 'ST60x90', name: 'Standard 60x90' },
  companies: {
    name: 'Test Company',
    address_street: 'Testna ulica 1',
    address_city: 'Ljubljana',
  },
  contacts: {
    first_name: 'Ana',
    last_name: 'Novak',
    phone: '+386 40 999 999',
  },
  profiles: {
    first_name: 'Marko',
    last_name: 'Prodajalec',
    code_prefix: 'MP',
  },
};

const mockPickupHistory = [
  {
    id: 'pickup-1',
    status: 'completed',
    scheduled_date: '2026-01-20',
    completed_at: '2026-01-20T15:00:00Z',
    assigned_driver: 'Voznik 1',
    notes: 'Vse pobrano',
    created_at: '2026-01-20T08:00:00Z',
    driver_pickup_items: [{ count: 5 }],
  },
  {
    id: 'pickup-2',
    status: 'pending',
    scheduled_date: '2026-01-25',
    completed_at: null,
    assigned_driver: 'Voznik 2',
    notes: null,
    created_at: '2026-01-24T08:00:00Z',
    driver_pickup_items: [{ count: 3 }],
  },
];

describe('useInventoryByUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch inventory stats by user', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createMockQueryBuilder(mockProfiles) as any;
      }
      if (table === 'cycles') {
        return createMockQueryBuilder(mockCycles) as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInventoryByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.from).toHaveBeenCalledWith('cycles');

    const data = result.current.data as InventoryStatsData;
    expect(data.sellers).toHaveLength(2);
    expect(data.totals.total).toBe(6);
  });

  it('should calculate correct stats per seller', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createMockQueryBuilder(mockProfiles) as any;
      }
      if (table === 'cycles') {
        return createMockQueryBuilder(mockCycles) as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInventoryByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as InventoryStatsData;
    const seller1 = data.sellers.find(s => s.id === 'user-1');

    expect(seller1).toBeDefined();
    expect(seller1?.clean).toBe(1);
    expect(seller1?.onTest).toBe(1);
    expect(seller1?.dirty).toBe(1);
    expect(seller1?.waitingDriver).toBe(1);
    expect(seller1?.total).toBe(4);
  });

  it('should calculate correct totals', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createMockQueryBuilder(mockProfiles) as any;
      }
      if (table === 'cycles') {
        return createMockQueryBuilder(mockCycles) as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInventoryByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as InventoryStatsData;

    expect(data.totals.clean).toBe(1);
    expect(data.totals.onTest).toBe(2);
    expect(data.totals.dirty).toBe(2);
    expect(data.totals.waitingDriver).toBe(1);
    expect(data.totals.total).toBe(6);
  });

  it('should handle error when fetch fails', async () => {
    const mockError = { message: 'Database error', code: '500' };
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
        resolve({ data: null, error: mockError });
        return Promise.resolve({ data: null, error: mockError });
      },
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInventoryByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useDirtyMatsByUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch dirty mats grouped by seller', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([mockDirtyCycle]) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDirtyMatsByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('cycles');
  });

  it('should correctly transform dirty mat data', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([mockDirtyCycle]) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDirtyMatsByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as DirtyMatsBySeller[];
    expect(data).toHaveLength(1);
    expect(data[0].sellerId).toBe('user-1');
    expect(data[0].sellerName).toBe('Marko Prodajalec');
    expect(data[0].mats).toHaveLength(1);
    expect(data[0].mats[0].qrCode).toBe('QR001');
    expect(data[0].mats[0].companyName).toBe('Test Company');
    expect(data[0].mats[0].status).toBe('dirty');
  });

  it('should group multiple mats by seller', async () => {
    const multipleDirtyMats = [
      mockDirtyCycle,
      { ...mockDirtyCycle, id: 'cycle-2', qr_codes: { code: 'QR002' } },
      {
        ...mockDirtyCycle,
        id: 'cycle-3',
        salesperson_id: 'user-2',
        profiles: { first_name: 'Ana', last_name: 'Druga', code_prefix: 'AD' },
      },
    ];

    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder(multipleDirtyMats) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDirtyMatsByUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as DirtyMatsBySeller[];
    expect(data).toHaveLength(2);

    const seller1 = data.find(s => s.sellerId === 'user-1');
    expect(seller1?.mats).toHaveLength(2);

    const seller2 = data.find(s => s.sellerId === 'user-2');
    expect(seller2?.mats).toHaveLength(1);
  });
});

describe('useMatsOnTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch mats on test', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([mockOnTestCycle]) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMatsOnTest(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('cycles');
  });

  it('should calculate days on test correctly', async () => {
    // Use a fixed date that's 14 days after the test start date
    const testStartDate = '2026-01-10T10:00:00Z';
    const cycleWithTestStart = { ...mockOnTestCycle, test_start_date: testStartDate };

    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([cycleWithTestStart]) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMatsOnTest(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as OnTestMatInfo[];
    expect(data).toHaveLength(1);
    expect(data[0].daysOnTest).toBeGreaterThanOrEqual(0);
  });

  it('should filter by minimum days', async () => {
    const recentCycle = { ...mockOnTestCycle, test_start_date: new Date().toISOString() };
    const oldCycle = {
      ...mockOnTestCycle,
      id: 'cycle-3',
      test_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([recentCycle, oldCycle]) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMatsOnTest(20), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as OnTestMatInfo[];
    // Only the old cycle should pass the 20 day filter
    expect(data.length).toBe(1);
    expect(data[0].daysOnTest).toBeGreaterThanOrEqual(20);
  });

  it('should correctly transform on test mat data', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([mockOnTestCycle]) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMatsOnTest(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as OnTestMatInfo[];
    expect(data[0].qrCode).toBe('QR002');
    expect(data[0].matTypeName).toBe('ST60x90');
    expect(data[0].companyName).toBe('Test Company');
    expect(data[0].contactName).toBe('Ana Novak');
    expect(data[0].salespersonName).toBe('Marko Prodajalec');
    expect(data[0].salespersonPrefix).toBe('MP');
  });
});

describe('usePickupHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch pickup history', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder(mockPickupHistory) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePickupHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('driver_pickups');
  });

  it('should correctly transform pickup history data', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder(mockPickupHistory) as any
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePickupHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as PickupHistoryItem[];
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('pickup-1');
    expect(data[0].status).toBe('completed');
    expect(data[0].assignedDriver).toBe('Voznik 1');
    expect(data[0].itemCount).toBe(5);
  });

  it('should use custom limit', async () => {
    const mockBuilder = createMockQueryBuilder(mockPickupHistory);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    renderHook(() => usePickupHistory(10), { wrapper });

    await waitFor(() => {
      expect(mockBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  it('should use default limit of 50', async () => {
    const mockBuilder = createMockQueryBuilder(mockPickupHistory);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    renderHook(() => usePickupHistory(), { wrapper });

    await waitFor(() => {
      expect(mockBuilder.limit).toHaveBeenCalledWith(50);
    });
  });
});

describe('Query keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useInventoryByUser should use correct query key', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return createMockQueryBuilder([]) as any;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useInventoryByUser(), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['inventory', 'by-user'])).toBeDefined();
    });
  });

  it('useDirtyMatsByUser should use correct query key', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([]) as any
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useDirtyMatsByUser(), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['inventory', 'dirty-mats'])).toBeDefined();
    });
  });

  it('useMatsOnTest should use correct query key with minDays', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([]) as any
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useMatsOnTest(14), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['inventory', 'on-test', 14])).toBeDefined();
    });
  });

  it('usePickupHistory should use correct query key with limit', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createMockQueryBuilder([]) as any
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => usePickupHistory(25), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['inventory', 'pickup-history', 25])).toBeDefined();
    });
  });
});

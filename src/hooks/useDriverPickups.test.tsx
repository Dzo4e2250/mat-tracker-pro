import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useDriverPickups,
  useActivePickups,
  useCreateDriverPickup,
  useUpdatePickupStatus,
  useMarkItemPickedUp,
  useCompletePickup,
  useDeletePickup,
  generatePickupPDF,
  generateMapsUrl,
  DriverPickup,
} from './useDriverPickups';

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
const mockPickupItem = {
  id: 'item-1',
  cycle_id: 'cycle-1',
  picked_up: false,
  picked_up_at: null,
  notes: null,
  cycles: {
    id: 'cycle-1',
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
  },
};

const mockDriverPickup = {
  id: 'pickup-1',
  status: 'pending',
  scheduled_date: '2026-01-25',
  completed_at: null,
  assigned_driver: 'Voznik 1',
  notes: 'Test opomba',
  created_at: '2026-01-24T10:00:00Z',
  created_by: 'user-1',
  driver_pickup_items: [mockPickupItem],
};

const mockDriverPickups = [
  mockDriverPickup,
  {
    ...mockDriverPickup,
    id: 'pickup-2',
    status: 'in_progress',
    driver_pickup_items: [
      { ...mockPickupItem, id: 'item-2', picked_up: true },
    ],
  },
  {
    ...mockDriverPickup,
    id: 'pickup-3',
    status: 'completed',
    completed_at: '2026-01-24T15:00:00Z',
  },
];

describe('useDriverPickups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all pickups when no status filter is provided', async () => {
    const mockBuilder = createMockQueryBuilder(mockDriverPickups);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDriverPickups(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('driver_pickups');
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(3);
  });

  it('should filter by single status when provided', async () => {
    const mockBuilder = createMockQueryBuilder([mockDriverPickup]);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDriverPickups('pending'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockBuilder.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('should filter by multiple statuses when array is provided', async () => {
    const mockBuilder = createMockQueryBuilder(mockDriverPickups.slice(0, 2));
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDriverPickups(['pending', 'in_progress']), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockBuilder.in).toHaveBeenCalledWith('status', ['pending', 'in_progress']);
  });

  it('should handle error when fetch fails', async () => {
    const mockError = { message: 'Database error', code: '500' };
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
        resolve({ data: null, error: mockError });
        return Promise.resolve({ data: null, error: mockError });
      },
    };
    vi.mocked(supabase.from).mockReturnValue(builder as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDriverPickups(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should correctly transform pickup data', async () => {
    const mockBuilder = createMockQueryBuilder([mockDriverPickup]);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDriverPickups(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const pickup = result.current.data?.[0];
    expect(pickup).toBeDefined();
    expect(pickup?.id).toBe('pickup-1');
    expect(pickup?.status).toBe('pending');
    expect(pickup?.scheduledDate).toBe('2026-01-25');
    expect(pickup?.assignedDriver).toBe('Voznik 1');
    expect(pickup?.items).toHaveLength(1);
    expect(pickup?.items[0].qrCode).toBe('QR001');
    expect(pickup?.items[0].matTypeName).toBe('ST60x90');
    expect(pickup?.items[0].companyName).toBe('Test Company');
    expect(pickup?.items[0].contactName).toBe('Janez Novak');
  });
});

describe('useActivePickups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch only pending and in_progress pickups', async () => {
    const mockBuilder = createMockQueryBuilder(mockDriverPickups.slice(0, 2));
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useActivePickups(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockBuilder.in).toHaveBeenCalledWith('status', ['pending', 'in_progress']);
  });
});

describe('useCreateDriverPickup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new pickup with items', async () => {
    const mockPickup = { id: 'new-pickup-1' };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'driver_pickups') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockPickup, error: null }),
        } as any;
      }
      if (table === 'driver_pickup_items') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }
      if (table === 'cycles') {
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }
      return {} as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateDriverPickup(), { wrapper });

    await result.current.mutateAsync({
      cycleIds: ['cycle-1', 'cycle-2'],
      scheduledDate: '2026-01-25',
      assignedDriver: 'Voznik 1',
      createdBy: 'user-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPickup);
  });
});

describe('useUpdatePickupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update pickup status', async () => {
    const updatedPickup = { ...mockDriverPickup, status: 'in_progress' };

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedPickup, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdatePickupStatus(), { wrapper });

    await result.current.mutateAsync({
      pickupId: 'pickup-1',
      status: 'in_progress',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('in_progress');
  });

  it('should set completed_at when status is completed', async () => {
    const updatedPickup = {
      ...mockDriverPickup,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    const mockUpdate = vi.fn().mockReturnThis();
    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedPickup, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdatePickupStatus(), { wrapper });

    await result.current.mutateAsync({
      pickupId: 'pickup-1',
      status: 'completed',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('completed');
    expect(updateCall.completed_at).toBeDefined();
  });
});

describe('useMarkItemPickedUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark item as picked up', async () => {
    const updatedItem = { ...mockPickupItem, picked_up: true, picked_up_at: new Date().toISOString() };

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedItem, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMarkItemPickedUp(), { wrapper });

    await result.current.mutateAsync({
      itemId: 'item-1',
      pickedUp: true,
      notes: 'Prevzeto ob 14:00',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.picked_up).toBe(true);
  });
});

describe('useCompletePickup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete pickup and update related cycles and QR codes', async () => {
    const completedPickup = {
      ...mockDriverPickup,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'driver_pickup_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
            resolve({ data: [{ cycle_id: 'cycle-1' }], error: null });
            return Promise.resolve({ data: [{ cycle_id: 'cycle-1' }], error: null });
          },
        } as any;
      }
      if (table === 'cycles') {
        return {
          update: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
            resolve({ data: [{ qr_code_id: 'qr-1' }], error: null });
            return Promise.resolve({ data: [{ qr_code_id: 'qr-1' }], error: null });
          },
        } as any;
      }
      if (table === 'qr_codes') {
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }
      if (table === 'driver_pickups') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: completedPickup, error: null }),
        } as any;
      }
      return {} as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompletePickup(), { wrapper });

    await result.current.mutateAsync('pickup-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('completed');
  });
});

describe('useDeletePickup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete pickup and revert cycle statuses', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'driver_pickup_items') {
        return {
          select: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
            resolve({ data: [{ cycle_id: 'cycle-1' }], error: null });
            return Promise.resolve({ data: [{ cycle_id: 'cycle-1' }], error: null });
          },
        } as any;
      }
      if (table === 'cycles') {
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }
      if (table === 'driver_pickups') {
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }
      return {} as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeletePickup(), { wrapper });

    await result.current.mutateAsync('pickup-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('generatePickupPDF', () => {
  it('should generate HTML content for pickup', () => {
    const pickup: DriverPickup = {
      id: 'pickup-1',
      status: 'pending',
      scheduledDate: '2026-01-25',
      completedAt: null,
      assignedDriver: 'Voznik 1',
      notes: 'Test opomba',
      createdAt: '2026-01-24T10:00:00Z',
      createdBy: 'user-1',
      items: [
        {
          id: 'item-1',
          cycleId: 'cycle-1',
          qrCode: 'QR001',
          matTypeName: 'ST60x90',
          companyName: 'Test Company',
          companyAddress: 'Testna ulica 1, Ljubljana',
          contactName: 'Janez Novak',
          contactPhone: '+386 40 123 456',
          pickedUp: false,
          pickedUpAt: null,
          notes: null,
        },
      ],
    };

    const html = generatePickupPDF(pickup);

    expect(html).toContain('Seznam za prevzem');
    expect(html).toContain('Voznik 1');
    expect(html).toContain('QR001');
    expect(html).toContain('ST60x90');
    expect(html).toContain('Test Company');
    expect(html).toContain('Janez Novak');
  });
});

describe('generateMapsUrl', () => {
  it('should generate Google Maps URL with addresses', () => {
    const pickup: DriverPickup = {
      id: 'pickup-1',
      status: 'pending',
      scheduledDate: null,
      completedAt: null,
      assignedDriver: null,
      notes: null,
      createdAt: '2026-01-24T10:00:00Z',
      createdBy: null,
      items: [
        {
          id: 'item-1',
          cycleId: 'cycle-1',
          qrCode: 'QR001',
          matTypeName: 'ST60x90',
          companyName: 'Company 1',
          companyAddress: 'Testna ulica 1, Ljubljana',
          contactName: null,
          contactPhone: null,
          pickedUp: false,
          pickedUpAt: null,
          notes: null,
        },
        {
          id: 'item-2',
          cycleId: 'cycle-2',
          qrCode: 'QR002',
          matTypeName: 'ST60x90',
          companyName: 'Company 2',
          companyAddress: 'Druga ulica 5, Maribor',
          contactName: null,
          contactPhone: null,
          pickedUp: false,
          pickedUpAt: null,
          notes: null,
        },
      ],
    };

    const url = generateMapsUrl(pickup);

    expect(url).toBeDefined();
    expect(url).toContain('google.com/maps/dir');
    expect(url).toContain(encodeURIComponent('Testna ulica 1, Ljubljana'));
    expect(url).toContain(encodeURIComponent('Druga ulica 5, Maribor'));
  });

  it('should return null when no addresses are available', () => {
    const pickup: DriverPickup = {
      id: 'pickup-1',
      status: 'pending',
      scheduledDate: null,
      completedAt: null,
      assignedDriver: null,
      notes: null,
      createdAt: '2026-01-24T10:00:00Z',
      createdBy: null,
      items: [
        {
          id: 'item-1',
          cycleId: 'cycle-1',
          qrCode: 'QR001',
          matTypeName: 'ST60x90',
          companyName: null,
          companyAddress: null,
          contactName: null,
          contactPhone: null,
          pickedUp: false,
          pickedUpAt: null,
          notes: null,
        },
      ],
    };

    const url = generateMapsUrl(pickup);

    expect(url).toBeNull();
  });
});

describe('Query keys', () => {
  it('useDriverPickups should use correct query key', async () => {
    const mockBuilder = createMockQueryBuilder(mockDriverPickups);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useDriverPickups('pending'), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['driver-pickups', 'pending'])).toBeDefined();
    });
  });
});

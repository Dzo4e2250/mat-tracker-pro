import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCycles, useCycleHistory, CycleWithRelations } from './useCycles';
import { mockCycle, mockCycles } from '@/test/mocks/supabase';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
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
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };

  // Make builder thenable for query execution
  return {
    ...builder,
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      resolve({ data, error });
      return Promise.resolve({ data, error });
    },
  };
}

describe('useCycles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when userId is undefined', async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useCycles(undefined), { wrapper });

    // Query should not be enabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should fetch cycles when userId is provided', async () => {
    const mockBuilder = createMockQueryBuilder(mockCycles);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useCycles('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('cycles');
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.neq).toHaveBeenCalledWith('status', 'completed');
    expect(mockBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockBuilder.eq).toHaveBeenCalledWith('salesperson_id', 'user-1');
    expect(result.current.data).toEqual(mockCycles);
  });

  it('should handle error when fetch fails', async () => {
    const mockError = { message: 'Database error', code: '500' };
    // Create a builder that returns an error from Supabase
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
        // Supabase returns { data: null, error: ... } on errors
        resolve({ data: null, error: mockError });
        return Promise.resolve({ data: null, error: mockError });
      },
    };
    vi.mocked(supabase.from).mockReturnValue(builder as any);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useCycles('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return typed CycleWithRelations array', async () => {
    const mockBuilder = createMockQueryBuilder(mockCycles);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useCycles('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Type check - data should be CycleWithRelations[]
    const data = result.current.data;
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);

    if (data && data.length > 0) {
      const cycle = data[0] as CycleWithRelations;
      expect(cycle.id).toBeDefined();
      expect(cycle.status).toBeDefined();
      expect(cycle.qr_code).toBeDefined();
      expect(cycle.mat_type).toBeDefined();
      expect(cycle.company).toBeDefined();
    }
  });
});

describe('useCycleHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when userId is undefined', async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(() => useCycleHistory(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should fetch cycle history with limit of 50', async () => {
    const mockBuilder = createMockQueryBuilder(mockCycles);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();

    const { result } = renderHook(() => useCycleHistory('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('cycles');
    expect(mockBuilder.limit).toHaveBeenCalledWith(50);
    expect(mockBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual(mockCycles);
  });

  it('should not filter by status (includes all statuses)', async () => {
    const mockBuilder = createMockQueryBuilder(mockCycles);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const wrapper = createWrapper();

    renderHook(() => useCycleHistory('user-1'), { wrapper });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalled();
    });

    // History should NOT filter by status (unlike useCycles which excludes 'completed')
    expect(mockBuilder.neq).not.toHaveBeenCalledWith('status', 'completed');
  });
});

describe('Cycles query keys', () => {
  it('useCycles should use correct query key', async () => {
    const mockBuilder = createMockQueryBuilder(mockCycles);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCycles('user-1'), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['cycles', 'user-1'])).toBeDefined();
    });
  });

  it('useCycleHistory should use correct query key', async () => {
    const mockBuilder = createMockQueryBuilder(mockCycles);
    vi.mocked(supabase.from).mockReturnValue(mockBuilder as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCycleHistory('user-1'), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['cycles', 'history', 'user-1'])).toBeDefined();
    });
  });
});

describe('Cycle data structure', () => {
  it('mockCycle should have all required relations', () => {
    expect(mockCycle.qr_code).toBeDefined();
    expect(mockCycle.qr_code.code).toBe('QR001');

    expect(mockCycle.mat_type).toBeDefined();
    expect(mockCycle.mat_type.code).toBe('ST60x90');

    expect(mockCycle.company).toBeDefined();
    expect(mockCycle.company.name).toBe('Test Company');

    expect(mockCycle.contact).toBeDefined();
    expect(mockCycle.contact.first_name).toBe('Janez');
  });

  it('mockCycles should have different statuses', () => {
    const statuses = mockCycles.map((c) => c.status);
    expect(statuses).toContain('on_test');
    expect(statuses).toContain('clean');
    expect(statuses).toContain('dirty');
  });
});

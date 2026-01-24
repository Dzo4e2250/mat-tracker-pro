import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useCompanyContacts,
  useCompanyDetails,
  useCreateCompany,
  useAddContact,
  useUpdateCompany,
  useUpdateContact,
  useDeleteContact,
  useDeleteCompany,
  CompanyWithContacts,
} from './useCompanyContacts';

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
const mockCompany = {
  id: 'company-1',
  name: 'Test Company d.o.o.',
  display_name: 'Test Company',
  tax_number: 'SI12345678',
  address_street: 'Testna ulica 1',
  address_postal: '1000',
  address_city: 'Ljubljana',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockContact = {
  id: 'contact-1',
  company_id: 'company-1',
  first_name: 'Janez',
  last_name: 'Novak',
  phone: '+386 40 123 456',
  email: 'janez@test.si',
  role: 'Direktor',
  is_primary: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockCycle = {
  company_id: 'company-1',
  status: 'on_test',
  contract_signed: false,
  created_at: '2026-01-20T10:00:00Z',
  test_start_date: '2026-01-20',
  company: mockCompany,
};

describe('useCompanyContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when userId is undefined', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyContacts(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should fetch companies and contacts for user', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'cycles') {
        return createMockQueryBuilder([mockCycle]) as any;
      }
      if (table === 'companies') {
        return createMockQueryBuilder([mockCompany]) as any;
      }
      if (table === 'contacts') {
        return createMockQueryBuilder([mockContact]) as any;
      }
      if (table === 'sent_emails') {
        return createMockQueryBuilder([{ company_id: 'company-1' }]) as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('cycles');
    expect(supabase.from).toHaveBeenCalledWith('companies');
    expect(supabase.from).toHaveBeenCalledWith('contacts');
    expect(supabase.from).toHaveBeenCalledWith('sent_emails');
  });

  it('should return empty array when no companies found', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle error when fetch fails', async () => {
    const mockError = { message: 'Database error', code: '500' };
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
        resolve({ data: null, error: mockError });
        return Promise.resolve({ data: null, error: mockError });
      },
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should calculate cycle stats correctly', async () => {
    const cyclesWithStats = [
      { ...mockCycle, status: 'on_test', contract_signed: false },
      { ...mockCycle, status: 'on_test', contract_signed: true },
      { ...mockCycle, status: 'clean', contract_signed: true },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'cycles') {
        return createMockQueryBuilder(cyclesWithStats) as any;
      }
      if (table === 'companies') {
        return createMockQueryBuilder([mockCompany]) as any;
      }
      if (table === 'contacts') {
        return createMockQueryBuilder([mockContact]) as any;
      }
      if (table === 'sent_emails') {
        return createMockQueryBuilder([{ company_id: 'company-1' }]) as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const company = result.current.data?.[0];
    expect(company?.cycleStats.onTest).toBe(2);
    expect(company?.cycleStats.signed).toBe(2);
    expect(company?.cycleStats.total).toBe(3);
    expect(company?.cycleStats.offerSent).toBe(true);
  });
});

describe('useCompanyDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when companyId is undefined', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyDetails(undefined, 'user-1'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch when userId is undefined', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyDetails('company-1', undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch company details with contacts and cycles', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
        } as any;
      }
      if (table === 'contacts') {
        return createMockQueryBuilder([mockContact]) as any;
      }
      if (table === 'cycles') {
        return createMockQueryBuilder([mockCycle]) as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCompanyDetails('company-1', 'user-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.name).toBe('Test Company d.o.o.');
    expect(result.current.data?.contacts).toHaveLength(1);
    expect(result.current.data?.cycles).toHaveLength(1);
  });
});

describe('useCreateCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new company', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
        } as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateCompany(), { wrapper });

    await result.current.mutateAsync({
      company: {
        name: 'New Company d.o.o.',
        address_city: 'Ljubljana',
      },
      userId: 'user-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('companies');
  });

  it('should create company with contact', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
        } as any;
      }
      if (table === 'contacts') {
        return {
          insert: vi.fn().mockResolvedValue({ data: mockContact, error: null }),
        } as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateCompany(), { wrapper });

    await result.current.mutateAsync({
      company: {
        name: 'New Company d.o.o.',
      },
      contact: {
        first_name: 'Janez',
        last_name: 'Novak',
        phone: '+386 40 123 456',
      },
      userId: 'user-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('contacts');
  });
});

describe('useAddContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a new contact to company', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockContact, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddContact(), { wrapper });

    await result.current.mutateAsync({
      companyId: 'company-1',
      contact: {
        first_name: 'Marija',
        last_name: 'Kovač',
      },
      userId: 'user-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('contacts');
  });
});

describe('useUpdateCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update company data', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateCompany(), { wrapper });

    await result.current.mutateAsync({
      companyId: 'company-1',
      data: { name: 'Updated Company Name' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('companies');
  });
});

describe('useUpdateContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update contact data', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    await result.current.mutateAsync({
      contactId: 'contact-1',
      data: { phone: '+386 40 999 999' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('contacts');
  });
});

describe('useDeleteContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete contact', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    await result.current.mutateAsync('contact-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('contacts');
  });
});

describe('useDeleteCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete company and related data', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await result.current.mutateAsync('company-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should delete from multiple tables
    expect(supabase.from).toHaveBeenCalledWith('company_notes');
    expect(supabase.from).toHaveBeenCalledWith('reminders');
    expect(supabase.from).toHaveBeenCalledWith('offer_items');
    expect(supabase.from).toHaveBeenCalledWith('contacts');
    expect(supabase.from).toHaveBeenCalledWith('companies');
  });
});

describe('Query keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCompanyContacts should use correct query key', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return createMockQueryBuilder([]) as any;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCompanyContacts('user-1'), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['company-contacts', 'user-1'])).toBeDefined();
    });
  });

  it('useCompanyDetails should use correct query key', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
        } as any;
      }
      return createMockQueryBuilder([]) as any;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCompanyDetails('company-1', 'user-1'), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryState(['company-details', 'company-1'])).toBeDefined();
    });
  });
});

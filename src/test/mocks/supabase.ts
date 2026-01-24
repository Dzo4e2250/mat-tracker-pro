import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
  from: vi.fn(() => ({
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
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  })),
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  rpc: vi.fn(),
};

// Reset all mocks
export function resetSupabaseMocks() {
  vi.clearAllMocks();
}

// Helper to setup mock responses
export function mockSupabaseResponse<T>(data: T, error: unknown = null) {
  return Promise.resolve({ data, error });
}

export function mockSupabaseError(message: string, code?: string) {
  return Promise.resolve({
    data: null,
    error: { message, code },
  });
}

// Sample test data
export const mockCycle = {
  id: 'cycle-1',
  qr_code_id: 'qr-1',
  salesperson_id: 'user-1',
  mat_type_id: 'mat-1',
  company_id: 'company-1',
  contact_id: 'contact-1',
  status: 'on_test',
  test_start_date: '2026-01-20T10:00:00Z',
  test_end_date: null,
  contract_signed: false,
  contract_frequency: null,
  notes: null,
  location_lat: 46.0569,
  location_lng: 14.5058,
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
  qr_code: {
    id: 'qr-1',
    code: 'QR001',
    status: 'active',
  },
  mat_type: {
    id: 'mat-1',
    code: 'ST60x90',
    name: 'Standard 60x90',
    width_cm: 60,
    height_cm: 90,
    category: 'standard',
  },
  company: {
    id: 'company-1',
    name: 'Test Company',
    display_name: 'Test Co',
    address_city: 'Ljubljana',
  },
  contact: {
    id: 'contact-1',
    first_name: 'Janez',
    last_name: 'Novak',
  },
};

export const mockCycles = [
  mockCycle,
  {
    ...mockCycle,
    id: 'cycle-2',
    qr_code_id: 'qr-2',
    status: 'clean',
    qr_code: { id: 'qr-2', code: 'QR002', status: 'active' },
  },
  {
    ...mockCycle,
    id: 'cycle-3',
    qr_code_id: 'qr-3',
    status: 'dirty',
    qr_code: { id: 'qr-3', code: 'QR003', status: 'active' },
  },
];

export const mockCompany = {
  id: 'company-1',
  name: 'Test Company d.o.o.',
  display_name: 'Test Company',
  tax_number: 'SI12345678',
  address_street: 'Testna ulica 1',
  address_postal: '1000',
  address_city: 'Ljubljana',
  address_country: 'SI',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const mockProfile = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'prodajalec',
  secondary_role: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

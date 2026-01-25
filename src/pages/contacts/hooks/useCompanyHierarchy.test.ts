/**
 * @file useCompanyHierarchy.test.ts
 * @description Testi za useCompanyHierarchy hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCompanyHierarchy } from './useCompanyHierarchy';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

const createMockCompany = (overrides: Partial<CompanyWithContacts> = {}): CompanyWithContacts => ({
  id: 'company-1',
  name: 'Test Company',
  display_name: null,
  tax_number: '12345678',
  address_street: null,
  address_city: null,
  address_postal: null,
  phone: null,
  email: null,
  website: null,
  notes: null,
  salesperson_id: 'user-1',
  parent_company_id: null,
  pipeline_status: 'new',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  contacts: [],
  ...overrides,
});

describe('useCompanyHierarchy', () => {
  it('should return empty map when companies is undefined', () => {
    const { result } = renderHook(() => useCompanyHierarchy(undefined));
    expect(result.current.size).toBe(0);
  });

  it('should return empty map when companies array is empty', () => {
    const { result } = renderHook(() => useCompanyHierarchy([]));
    expect(result.current.size).toBe(0);
  });

  it('should create hierarchy info for single company without parent', () => {
    const companies = [createMockCompany({ id: 'c1', name: 'Company 1' })];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    expect(result.current.size).toBe(1);
    const info = result.current.get('c1');
    expect(info).toBeDefined();
    expect(info?.parentCompany).toBeUndefined();
    expect(info?.childrenCount).toBe(0);
  });

  it('should detect parent-child relationship', () => {
    const companies = [
      createMockCompany({ id: 'parent', name: 'Parent Co' }),
      createMockCompany({ id: 'child', name: 'Child Co', parent_company_id: 'parent' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    const parentInfo = result.current.get('parent');
    expect(parentInfo?.childrenCount).toBe(1);
    expect(parentInfo?.parentCompany).toBeUndefined();

    const childInfo = result.current.get('child');
    expect(childInfo?.childrenCount).toBe(0);
    expect(childInfo?.parentCompany).toBeDefined();
    expect(childInfo?.parentCompany?.id).toBe('parent');
    expect(childInfo?.parentCompany?.name).toBe('Parent Co');
  });

  it('should count multiple children correctly', () => {
    const companies = [
      createMockCompany({ id: 'parent', name: 'Parent Co' }),
      createMockCompany({ id: 'child1', name: 'Child 1', parent_company_id: 'parent' }),
      createMockCompany({ id: 'child2', name: 'Child 2', parent_company_id: 'parent' }),
      createMockCompany({ id: 'child3', name: 'Child 3', parent_company_id: 'parent' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    const parentInfo = result.current.get('parent');
    expect(parentInfo?.childrenCount).toBe(3);
  });

  it('should handle display_name in parent company info', () => {
    const companies = [
      createMockCompany({ id: 'parent', name: 'Parent Co', display_name: 'Display Parent' }),
      createMockCompany({ id: 'child', name: 'Child Co', parent_company_id: 'parent' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    const childInfo = result.current.get('child');
    expect(childInfo?.parentCompany?.display_name).toBe('Display Parent');
  });

  it('should handle null display_name correctly', () => {
    const companies = [
      createMockCompany({ id: 'parent', name: 'Parent Co', display_name: null }),
      createMockCompany({ id: 'child', name: 'Child Co', parent_company_id: 'parent' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    const childInfo = result.current.get('child');
    expect(childInfo?.parentCompany?.display_name).toBeUndefined();
  });

  it('should handle orphaned child (parent not in list)', () => {
    const companies = [
      createMockCompany({ id: 'child', name: 'Child Co', parent_company_id: 'non-existent' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    const childInfo = result.current.get('child');
    expect(childInfo?.parentCompany).toBeUndefined();
    expect(childInfo?.childrenCount).toBe(0);
  });

  it('should handle multi-level hierarchy', () => {
    const companies = [
      createMockCompany({ id: 'grandparent', name: 'Grandparent' }),
      createMockCompany({ id: 'parent', name: 'Parent', parent_company_id: 'grandparent' }),
      createMockCompany({ id: 'child', name: 'Child', parent_company_id: 'parent' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    expect(result.current.get('grandparent')?.childrenCount).toBe(1);
    expect(result.current.get('parent')?.childrenCount).toBe(1);
    expect(result.current.get('parent')?.parentCompany?.id).toBe('grandparent');
    expect(result.current.get('child')?.childrenCount).toBe(0);
    expect(result.current.get('child')?.parentCompany?.id).toBe('parent');
  });

  it('should handle company with both parent and children', () => {
    const companies = [
      createMockCompany({ id: 'top', name: 'Top' }),
      createMockCompany({ id: 'middle', name: 'Middle', parent_company_id: 'top' }),
      createMockCompany({ id: 'bottom1', name: 'Bottom 1', parent_company_id: 'middle' }),
      createMockCompany({ id: 'bottom2', name: 'Bottom 2', parent_company_id: 'middle' }),
    ];
    const { result } = renderHook(() => useCompanyHierarchy(companies));

    const middleInfo = result.current.get('middle');
    expect(middleInfo?.parentCompany?.id).toBe('top');
    expect(middleInfo?.childrenCount).toBe(2);
  });
});

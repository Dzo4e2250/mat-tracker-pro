/**
 * @file CompanyRepository.test.ts
 * @description Testi za CompanyRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyRepository, companyRepository } from './CompanyRepository';
import { RepositoryError } from './BaseRepository';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('CompanyRepository', () => {
  let repository: CompanyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new CompanyRepository();
  });

  describe('search', () => {
    it('should search companies by name', async () => {
      const mockCompanies = [
        { id: '1', name: 'Test Company', tax_number: '12345678' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockCompanies, error: null }),
      } as any);

      const result = await repository.search('Test', { userId: 'user-1' });

      expect(result).toEqual(mockCompanies);
    });

    it('should search without userId filter', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      const result = await repository.search('Test');

      expect(result).toEqual([]);
    });

    it('should throw on search error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Search failed' },
        }),
      } as any);

      await expect(repository.search('Test')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findWithContacts', () => {
    it('should find company with contacts', async () => {
      const mockCompany = {
        id: '1',
        name: 'Test Company',
        contacts: [{ id: 'c1', first_name: 'John' }],
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
      } as any);

      const result = await repository.findWithContacts('1');

      expect(result).toEqual(mockCompany);
    });

    it('should return null if company not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      const result = await repository.findWithContacts('999');

      expect(result).toBeNull();
    });
  });

  describe('findByUserWithStats', () => {
    it('should find companies with cycle stats', async () => {
      const mockCompanies = [
        { id: '1', name: 'Company 1', contacts: [] },
        { id: '2', name: 'Company 2', contacts: [] },
      ];

      const mockCycles = [
        { company_id: '1', status: 'on_test', contract_signed: false },
        { company_id: '1', status: 'active', contract_signed: true },
        { company_id: '2', status: 'on_test', contract_signed: false },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockCompanies, error: null }),
          } as any;
        }
        if (table === 'cycles') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockCycles, error: null }),
          } as any;
        }
        return {} as any;
      });

      const result = await repository.findByUserWithStats('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].cycleStats).toEqual({ onTest: 1, signed: 1, total: 2 });
      expect(result[1].cycleStats).toEqual({ onTest: 1, signed: 0, total: 1 });
    });

    it('should return empty array if no companies', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      const result = await repository.findByUserWithStats('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findChildren', () => {
    it('should find child companies', async () => {
      const mockChildren = [
        { id: 'c1', name: 'Child 1', parent_company_id: 'parent-1' },
        { id: 'c2', name: 'Child 2', parent_company_id: 'parent-1' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockChildren, error: null }),
      } as any);

      const result = await repository.findChildren('parent-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('existsByTaxNumber', () => {
    it('should return true if tax number exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      } as any);

      const result = await repository.existsByTaxNumber('12345678');

      expect(result).toBe(true);
    });

    it('should return false if tax number does not exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      } as any);

      const result = await repository.existsByTaxNumber('99999999');

      expect(result).toBe(false);
    });

    it('should exclude specific company from check', async () => {
      const neqMock = vi.fn().mockResolvedValue({ count: 0, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: neqMock,
      } as any);

      await repository.existsByTaxNumber('12345678', 'exclude-id');

      expect(neqMock).toHaveBeenCalledWith('id', 'exclude-id');
    });
  });

  describe('updatePipelineStatus', () => {
    it('should update pipeline status', async () => {
      const updatedCompany = { id: '1', pipeline_status: 'contacted' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedCompany, error: null }),
      } as any);

      const result = await repository.updatePipelineStatus('1', 'contacted');

      expect(result.pipeline_status).toBe('contacted');
    });
  });

  describe('findByPipelineStatus', () => {
    it('should find companies by pipeline status', async () => {
      const mockCompanies = [
        { id: '1', name: 'Company 1', pipeline_status: 'new' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCompanies, error: null }),
      } as any);

      const result = await repository.findByPipelineStatus('new', 'user-1');

      expect(result).toEqual(mockCompanies);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(companyRepository).toBeInstanceOf(CompanyRepository);
    });
  });
});

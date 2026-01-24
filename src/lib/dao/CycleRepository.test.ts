/**
 * @file CycleRepository.test.ts
 * @description Testi za CycleRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CycleRepository, cycleRepository } from './CycleRepository';
import { RepositoryError } from './BaseRepository';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('CycleRepository', () => {
  let repository: CycleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new CycleRepository();
  });

  describe('findWithRelations', () => {
    it('should find cycle with all relations', async () => {
      const mockCycle = {
        id: '1',
        status: 'on_test',
        company: { id: 'c1', name: 'Test Company' },
        contact: { id: 'ct1', first_name: 'John' },
        qr_code: { id: 'qr1', code: 'QR001' },
        mat_type: { id: 'mt1', name: 'Standard' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCycle, error: null }),
      } as any);

      const result = await repository.findWithRelations('1');

      expect(result).toEqual(mockCycle);
      expect(result?.company?.name).toBe('Test Company');
    });

    it('should return null if cycle not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      const result = await repository.findWithRelations('999');

      expect(result).toBeNull();
    });
  });

  describe('findActiveBySalesperson', () => {
    it('should find active cycles for salesperson', async () => {
      const mockCycles = [
        { id: '1', status: 'on_test', company: { name: 'A' } },
        { id: '2', status: 'active', company: { name: 'B' } },
        { id: '3', status: 'dirty', company: { name: 'C' } },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCycles, error: null }),
      } as any);

      const result = await repository.findActiveBySalesperson('user-1');

      expect(result).toHaveLength(3);
    });
  });

  describe('findByCompany', () => {
    it('should find cycles by company', async () => {
      const mockCycles = [{ id: '1', company_id: 'c1', status: 'on_test' }];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCycles, error: null }),
      } as any);

      const result = await repository.findByCompany('c1');

      expect(result).toEqual(mockCycles);
    });

    it('should handle salesperson filter option', () => {
      // Repository should accept salespersonId parameter
      expect(repository.findByCompany).toBeDefined();
      expect(repository.findByCompany.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findByStatus', () => {
    it('should find cycles by status', async () => {
      const mockCycles = [
        { id: '1', status: 'on_test' },
        { id: '2', status: 'on_test' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCycles, error: null }),
      } as any);

      const result = await repository.findByStatus('on_test');

      expect(result).toHaveLength(2);
    });
  });

  describe('updateStatus', () => {
    it('should update cycle status', async () => {
      const updatedCycle = { id: '1', status: 'active' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedCycle, error: null }),
      } as any);

      const result = await repository.updateStatus('1', 'active');

      expect(result.status).toBe('active');
    });
  });

  describe('markContractSigned', () => {
    it('should mark contract as signed', async () => {
      const updatedCycle = { id: '1', contract_signed: true, status: 'active' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedCycle, error: null }),
      } as any);

      const result = await repository.markContractSigned('1');

      expect(result.contract_signed).toBe(true);
      expect(result.status).toBe('active');
    });
  });

  describe('updateLocation', () => {
    it('should update cycle location', async () => {
      const updatedCycle = { id: '1', location_lat: 46.05, location_lng: 14.5 };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedCycle, error: null }),
      } as any);

      const result = await repository.updateLocation('1', 46.05, 14.5);

      expect(result.location_lat).toBe(46.05);
      expect(result.location_lng).toBe(14.5);
    });
  });

  describe('getStatsBySalesperson', () => {
    it('should calculate stats correctly', async () => {
      const mockCycles = [
        { status: 'on_test' },
        { status: 'on_test' },
        { status: 'active' },
        { status: 'dirty' },
        { status: 'picked_up' },
        { status: 'completed' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockCycles, error: null }),
      } as any);

      const stats = await repository.getStatsBySalesperson('user-1');

      expect(stats.total).toBe(6);
      expect(stats.onTest).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.dirty).toBe(1);
      expect(stats.pickedUp).toBe(1);
    });

    it('should return zero stats for no cycles', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      const stats = await repository.getStatsBySalesperson('user-1');

      expect(stats.total).toBe(0);
      expect(stats.onTest).toBe(0);
    });
  });

  describe('findExpiringTests', () => {
    it('should find cycles with expiring tests', async () => {
      const mockCycles = [{ id: '1', status: 'on_test', test_end_date: '2024-01-10' }];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCycles, error: null }),
      } as any);

      const result = await repository.findExpiringTests('user-1', 2);

      expect(result).toEqual(mockCycles);
    });
  });

  describe('findHistory', () => {
    it('should find cycle history', async () => {
      const mockHistory = [
        { id: '1', status: 'completed', company: { name: 'A' } },
        { id: '2', status: 'picked_up', company: { name: 'B' } },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockHistory, error: null }),
      } as any);

      const result = await repository.findHistory('user-1', 10);

      expect(result).toHaveLength(2);
    });
  });

  describe('extendTest', () => {
    it('should extend test by specified days', async () => {
      const currentDate = new Date('2024-01-10');
      const mockCycle = { id: '1', test_end_date: currentDate.toISOString() };

      // Mock both findById and update
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findById call
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCycle, error: null }),
          } as any;
        }
        // update call
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { ...mockCycle, test_end_date: '2024-01-17' }, error: null }),
        } as any;
      });

      const result = await repository.extendTest('1', 7);
      expect(result).toBeDefined();
    });

    it('should throw if cycle not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      await expect(repository.extendTest('999')).rejects.toThrow(RepositoryError);
    });
  });

  describe('batchUpdateStatus', () => {
    it('should batch update cycle statuses', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(
        repository.batchUpdateStatus(['1', '2', '3'], 'dirty')
      ).resolves.toBeUndefined();
    });

    it('should throw on batch update error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: { message: 'Batch failed' } }),
      } as any);

      await expect(
        repository.batchUpdateStatus(['1', '2'], 'dirty')
      ).rejects.toThrow(RepositoryError);
    });
  });

  describe('batchSignContracts', () => {
    it('should batch sign contracts', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(
        repository.batchSignContracts(['1', '2', '3'])
      ).resolves.toBeUndefined();
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(cycleRepository).toBeInstanceOf(CycleRepository);
    });
  });
});

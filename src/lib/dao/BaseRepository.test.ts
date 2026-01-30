/**
 * @file BaseRepository.test.ts
 * @description Testi za BaseRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository, RepositoryError } from './BaseRepository';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

interface TestEntity {
  id: string;
  name: string;
  created_at: string;
}

describe('BaseRepository', () => {
  let repository: BaseRepository<TestEntity>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BaseRepository<TestEntity>('test_table');
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      const mockEntity = { id: '1', name: 'Test', created_at: '2024-01-01' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEntity, error: null }),
      } as any);

      const result = await repository.findById('1');

      expect(result).toEqual(mockEntity);
      expect(supabase.from).toHaveBeenCalledWith('test_table');
    });

    it('should return null if not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      } as any);

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });

    it('should throw RepositoryError on database error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '500', message: 'Database error' },
        }),
      } as any);

      await expect(repository.findById('1')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll', () => {
    it('should find all entities', async () => {
      const mockEntities = [
        { id: '1', name: 'Test 1', created_at: '2024-01-01' },
        { id: '2', name: 'Test 2', created_at: '2024-01-02' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockEntities, error: null }),
      } as any);

      const result = await repository.findAll();

      expect(result).toEqual(mockEntities);
    });

    it('should apply filters', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
        eq: eqMock,
      } as any);

      await repository.findAll({ filters: { name: 'Test' } });

      expect(selectMock).toHaveBeenCalledWith('*');
    });

    it('should apply ordering', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: orderMock,
      } as any);

      await repository.findAll({ orderBy: { column: 'name', ascending: true } });

      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('should apply pagination', async () => {
      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        range: rangeMock,
      } as any);

      await repository.findAll({ limit: 10, offset: 20 });

      expect(rangeMock).toHaveBeenCalledWith(20, 29);
    });

    it('should apply limit only without offset', async () => {
      const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: limitMock,
      } as any);

      await repository.findAll({ limit: 10 });

      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no data', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should throw RepositoryError on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      } as any);

      await expect(repository.findAll()).rejects.toThrow(RepositoryError);
    });

    it('should skip undefined and null filter values', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);

      await repository.findAll({ filters: { name: 'Test', status: undefined, value: null } });

      // eq should only be called once for 'name', not for undefined/null values
      expect(eqMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results', async () => {
      const mockEntities = [{ id: '1', name: 'Test', created_at: '2024-01-01' }];

      // Mock that works for both count and data queries
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockImplementation((selectStr, options) => {
          if (options?.count === 'exact') {
            // Count query
            return { count: 100, error: null };
          }
          // Data query - return chainable mock
          return {
            range: vi.fn().mockResolvedValue({ data: mockEntities, error: null }),
          };
        }),
      } as any);

      const result = await repository.findPaginated({ page: 1, pageSize: 10 });

      expect(result.data).toEqual(mockEntities);
      expect(result.count).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('should handle null count', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockImplementation((selectStr, options) => {
          if (options?.count === 'exact') {
            return { count: null, error: null };
          }
          return {
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }),
      } as any);

      const result = await repository.findPaginated();

      expect(result.count).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should apply filters to both count and data queries', async () => {
      const eqMock = vi.fn().mockImplementation(() => {
        return { count: 5, error: null };
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockImplementation((selectStr, options) => {
          if (options?.count === 'exact') {
            return { eq: eqMock };
          }
          return {
            eq: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }),
      } as any);

      await repository.findPaginated({ filters: { name: 'Test' } });

      expect(eqMock).toHaveBeenCalledWith('name', 'Test');
    });
  });

  describe('create', () => {
    it('should create entity', async () => {
      const newEntity = { name: 'New Entity' };
      const createdEntity = { id: '1', name: 'New Entity', created_at: '2024-01-01' };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdEntity, error: null }),
      } as any);

      const result = await repository.create(newEntity as any);

      expect(result).toEqual(createdEntity);
    });

    it('should throw on create error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate' },
        }),
      } as any);

      await expect(repository.create({ name: 'Test' } as any)).rejects.toThrow(RepositoryError);
    });
  });

  describe('createMany', () => {
    it('should create multiple entities', async () => {
      const newEntities = [{ name: 'Entity 1' }, { name: 'Entity 2' }];
      const createdEntities = [
        { id: '1', name: 'Entity 1', created_at: '2024-01-01' },
        { id: '2', name: 'Entity 2', created_at: '2024-01-01' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: createdEntities, error: null }),
      } as any);

      const result = await repository.createMany(newEntities as any);

      expect(result).toEqual(createdEntities);
    });

    it('should throw on createMany error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate' },
        }),
      } as any);

      await expect(repository.createMany([{ name: 'Test' }] as any)).rejects.toThrow(RepositoryError);
    });

    it('should return empty array when no data', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await repository.createMany([{ name: 'Test' }] as any);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update entity', async () => {
      const updatedEntity = { id: '1', name: 'Updated', created_at: '2024-01-01' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedEntity, error: null }),
      } as any);

      const result = await repository.update('1', { name: 'Updated' });

      expect(result).toEqual(updatedEntity);
    });
  });

  describe('delete', () => {
    it('should delete entity', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(repository.delete('1')).resolves.toBeUndefined();
    });

    it('should throw on delete error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { code: '23503', message: 'Foreign key violation' },
        }),
      } as any);

      await expect(repository.delete('1')).rejects.toThrow(RepositoryError);
    });
  });

  describe('deleteWhere', () => {
    it('should delete entities matching filters', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);

      await repository.deleteWhere({ name: 'Test' });

      expect(eqMock).toHaveBeenCalledWith('name', 'Test');
    });

    it('should throw on deleteWhere error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { code: '500', message: 'Error' },
        }),
      } as any);

      await expect(repository.deleteWhere({ name: 'Test' })).rejects.toThrow(RepositoryError);
    });

    it('should skip undefined and null filter values', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);

      await repository.deleteWhere({ name: 'Test', status: undefined, value: null });

      // eq should only be called once for 'name'
      expect(eqMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('exists', () => {
    it('should return true if entity exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      } as any);

      const result = await repository.exists('1');

      expect(result).toBe(true);
    });

    it('should return false if entity does not exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      } as any);

      const result = await repository.exists('999');

      expect(result).toBe(false);
    });

    it('should throw RepositoryError on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
      } as any);

      await expect(repository.exists('1')).rejects.toThrow(RepositoryError);
    });

    it('should handle null count as false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: null }),
      } as any);

      const result = await repository.exists('1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entities', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 42, error: null }),
      } as any);

      const result = await repository.count();

      expect(result).toBe(42);
    });

    it('should count with filters', async () => {
      const eqMock = vi.fn().mockResolvedValue({ count: 5, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);

      await repository.count({ name: 'Test' });

      expect(eqMock).toHaveBeenCalled();
    });

    it('should throw RepositoryError on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
      } as any);

      await expect(repository.count()).rejects.toThrow(RepositoryError);
    });

    it('should handle null count as 0', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: null, error: null }),
      } as any);

      const result = await repository.count();

      expect(result).toBe(0);
    });

    it('should skip undefined and null filter values', async () => {
      const eqMock = vi.fn().mockResolvedValue({ count: 10, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);

      await repository.count({ name: 'Test', status: undefined, value: null });

      // eq should only be called once for 'name'
      expect(eqMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should throw RepositoryError on update error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      } as any);

      await expect(repository.update('1', { name: 'Test' })).rejects.toThrow(RepositoryError);
    });
  });
});

describe('RepositoryError', () => {
  it('should create error with message', () => {
    const error = new RepositoryError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('RepositoryError');
  });

  it('should store original error', () => {
    const originalError = { code: '23505', message: 'Duplicate' };
    const error = new RepositoryError('Test error', originalError);

    expect(error.originalError).toBe(originalError);
    expect(error.code).toBe('23505');
  });

  it('should detect RLS errors', () => {
    const rlsError = new RepositoryError('RLS error', { code: '42501' });
    const otherError = new RepositoryError('Other error', { code: '500' });

    expect(rlsError.isRLSError()).toBe(true);
    expect(otherError.isRLSError()).toBe(false);
  });

  it('should detect duplicate errors', () => {
    const dupError = new RepositoryError('Duplicate', { code: '23505' });
    const otherError = new RepositoryError('Other', { code: '500' });

    expect(dupError.isDuplicateError()).toBe(true);
    expect(otherError.isDuplicateError()).toBe(false);
  });

  it('should detect foreign key errors', () => {
    const fkError = new RepositoryError('FK error', { code: '23503' });
    const otherError = new RepositoryError('Other', { code: '500' });

    expect(fkError.isForeignKeyError()).toBe(true);
    expect(otherError.isForeignKeyError()).toBe(false);
  });
});

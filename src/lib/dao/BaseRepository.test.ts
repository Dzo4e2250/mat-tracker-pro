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

/**
 * @file BaseRepository.ts
 * @description Bazni razred za vse repozitorije - abstrahira Supabase operacije
 *
 * Prednosti:
 * - Enostavno mockanje v testih
 * - Centralizirana obravnava napak
 * - Možnost zamenjave baze brez spreminjanja poslovne logike
 * - Type-safe operacije
 */

import { supabase } from '@/integrations/supabase/client';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

/**
 * Bazni repozitorij za CRUD operacije
 */
export class BaseRepository<T extends { id: string }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Pridobi en zapis po ID
   */
  async findById(id: string, select = '*'): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(select)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new RepositoryError(`Failed to find ${this.tableName} by id`, error);
    }

    return data as T;
  }

  /**
   * Pridobi vse zapise z opcijskimi filtri
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    const { select = '*', orderBy, limit, offset, filters } = options;

    let query = supabase.from(this.tableName).select(select);

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value) as typeof query;
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    // Apply pagination
    if (limit !== undefined && offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError(`Failed to find all ${this.tableName}`, error);
    }

    return (data || []) as T[];
  }

  /**
   * Pridobi zapise s paginacijo
   */
  async findPaginated(options: QueryOptions & { page?: number; pageSize?: number } = {}): Promise<PaginatedResult<T>> {
    const { page = 1, pageSize = 50, select = '*', orderBy, filters } = options;
    const offset = (page - 1) * pageSize;

    // Get count
    let countQuery = supabase.from(this.tableName).select('id', { count: 'exact', head: true });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = countQuery.eq(key, value) as typeof countQuery;
        }
      });
    }
    const { count } = await countQuery;

    // Get data
    const data = await this.findAll({
      select,
      orderBy,
      limit: pageSize,
      offset,
      filters,
    });

    return {
      data,
      count: count || 0,
      hasMore: offset + data.length < (count || 0),
    };
  }

  /**
   * Ustvari nov zapis
   */
  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(entity as any)
      .select()
      .single();

    if (error) {
      throw new RepositoryError(`Failed to create ${this.tableName}`, error);
    }

    return data as T;
  }

  /**
   * Ustvari več zapisov
   */
  async createMany(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(entities as any[])
      .select();

    if (error) {
      throw new RepositoryError(`Failed to create multiple ${this.tableName}`, error);
    }

    return (data || []) as T[];
  }

  /**
   * Posodobi zapis
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new RepositoryError(`Failed to update ${this.tableName}`, error);
    }

    return data as T;
  }

  /**
   * Izbriši zapis
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new RepositoryError(`Failed to delete ${this.tableName}`, error);
    }
  }

  /**
   * Izbriši več zapisov po filtru
   */
  async deleteWhere(filters: Record<string, unknown>): Promise<void> {
    let query = supabase.from(this.tableName).delete();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value) as typeof query;
      }
    });

    const { error } = await query;

    if (error) {
      throw new RepositoryError(`Failed to delete ${this.tableName} where`, error);
    }
  }

  /**
   * Preveri če zapis obstaja
   */
  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('id', id);

    if (error) {
      throw new RepositoryError(`Failed to check existence of ${this.tableName}`, error);
    }

    return (count || 0) > 0;
  }

  /**
   * Štej zapise
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    let query = supabase.from(this.tableName).select('id', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value) as typeof query;
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new RepositoryError(`Failed to count ${this.tableName}`, error);
    }

    return count || 0;
  }
}

/**
 * Custom error za repozitorij operacije
 */
export class RepositoryError extends Error {
  public readonly originalError: unknown;
  public readonly code?: string;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.originalError = originalError;

    if (originalError && typeof originalError === 'object' && 'code' in originalError) {
      this.code = (originalError as { code: string }).code;
    }
  }

  /**
   * Preveri če je napaka zaradi RLS (Row Level Security)
   */
  isRLSError(): boolean {
    return this.code === '42501' || this.code === 'PGRST301';
  }

  /**
   * Preveri če je napaka zaradi duplicate key
   */
  isDuplicateError(): boolean {
    return this.code === '23505';
  }

  /**
   * Preveri če je napaka zaradi foreign key
   */
  isForeignKeyError(): boolean {
    return this.code === '23503';
  }
}

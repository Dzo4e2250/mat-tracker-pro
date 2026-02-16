/**
 * @file CompanyRepository.ts
 * @description Repozitorij za podjetja
 */

import { supabase } from '@/integrations/supabase/client';
import { BaseRepository, RepositoryError, type QueryOptions, type PaginatedResult } from './BaseRepository';
import type { Company, Contact } from '@/integrations/supabase/types';
import { sanitizeSearchQuery } from '@/lib/utils';

export interface CompanyWithRelations extends Company {
  contacts?: Contact[];
  cycleStats?: {
    onTest: number;
    signed: number;
    total: number;
  };
}

export interface CompanySearchOptions {
  query?: string;
  pipelineStatus?: string;
  createdBy?: string;
  parentCompanyId?: string | null;
}

export class CompanyRepository extends BaseRepository<Company> {
  constructor() {
    super('companies');
  }

  /**
   * Išči podjetja po imenu, davčni številki ali display_name
   */
  async search(
    searchQuery: string,
    options: QueryOptions & { userId?: string } = {}
  ): Promise<Company[]> {
    const { userId, limit = 50 } = options;

    let query = supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${sanitizeSearchQuery(searchQuery)}%,display_name.ilike.%${sanitizeSearchQuery(searchQuery)}%,tax_number.ilike.%${sanitizeSearchQuery(searchQuery)}%`)
      .limit(limit);

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError('Failed to search companies', error);
    }

    return (data || []) as Company[];
  }

  /**
   * Pridobi podjetje z vsemi kontakti
   */
  async findWithContacts(companyId: string): Promise<CompanyWithRelations | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        contacts(*)
      `)
      .eq('id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new RepositoryError('Failed to find company with contacts', error);
    }

    return data as CompanyWithRelations;
  }

  /**
   * Pridobi vsa podjetja za prodajalca s statistiko ciklov
   */
  async findByUserWithStats(userId: string): Promise<CompanyWithRelations[]> {
    // Get companies created by user
    const { data: companies, error: companiesError } = await supabase
      .from(this.tableName)
      .select(`
        *,
        contacts(*)
      `)
      .eq('created_by', userId)
      .order('name');

    if (companiesError) {
      throw new RepositoryError('Failed to find companies by user', companiesError);
    }

    if (!companies || companies.length === 0) {
      return [];
    }

    // Get cycle stats for these companies
    const companyIds = companies.map(c => c.id);
    const { data: cycles, error: cyclesError } = await supabase
      .from('cycles')
      .select('company_id, status, contract_signed')
      .in('company_id', companyIds)
      .eq('salesperson_id', userId);

    if (cyclesError) {
      throw new RepositoryError('Failed to get cycle stats', cyclesError);
    }

    // Calculate stats per company
    const statsMap = new Map<string, { onTest: number; signed: number; total: number }>();
    cycles?.forEach(cycle => {
      if (!cycle.company_id) return;

      const existing = statsMap.get(cycle.company_id) || { onTest: 0, signed: 0, total: 0 };
      existing.total++;
      if (cycle.status === 'on_test') existing.onTest++;
      if (cycle.contract_signed) existing.signed++;
      statsMap.set(cycle.company_id, existing);
    });

    // Merge stats with companies
    return companies.map(company => ({
      ...company,
      contacts: company.contacts || [],
      cycleStats: statsMap.get(company.id) || { onTest: 0, signed: 0, total: 0 },
    })) as CompanyWithRelations[];
  }

  /**
   * Pridobi podrejena podjetja (child companies)
   */
  async findChildren(parentCompanyId: string): Promise<Company[]> {
    return this.findAll({
      filters: { parent_company_id: parentCompanyId },
      orderBy: { column: 'name', ascending: true },
    });
  }

  /**
   * Preveri če podjetje z davčno številko že obstaja
   */
  async existsByTaxNumber(taxNumber: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('tax_number', taxNumber);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
      throw new RepositoryError('Failed to check tax number existence', error);
    }

    return (count || 0) > 0;
  }

  /**
   * Posodobi pipeline status
   */
  async updatePipelineStatus(companyId: string, status: string): Promise<Company> {
    return this.update(companyId, { pipeline_status: status } as Partial<Company>);
  }

  /**
   * Pridobi podjetja po pipeline statusu
   */
  async findByPipelineStatus(status: string, userId?: string): Promise<Company[]> {
    const filters: Record<string, unknown> = { pipeline_status: status };
    if (userId) {
      filters.created_by = userId;
    }

    return this.findAll({
      filters,
      orderBy: { column: 'name', ascending: true },
    });
  }
}

// Singleton instance
export const companyRepository = new CompanyRepository();

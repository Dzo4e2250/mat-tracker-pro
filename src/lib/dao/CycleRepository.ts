/**
 * @file CycleRepository.ts
 * @description Repozitorij za cikle predpražnikov
 */

import { supabase } from '@/integrations/supabase/client';
import { BaseRepository, RepositoryError } from './BaseRepository';
import type { Cycle, Company, Contact, QRCode, MatType } from '@/integrations/supabase/types';

export interface CycleWithRelations extends Cycle {
  company?: Company;
  contact?: Contact;
  qr_code?: QRCode;
  mat_type?: MatType;
}

export type CycleStatus = 'available' | 'on_test' | 'active' | 'dirty' | 'picked_up' | 'completed';

export interface CycleStats {
  total: number;
  onTest: number;
  active: number;
  dirty: number;
  pickedUp: number;
}

export class CycleRepository extends BaseRepository<Cycle> {
  constructor() {
    super('cycles');
  }

  /**
   * Pridobi cikel z vsemi relacijami
   */
  async findWithRelations(cycleId: string): Promise<CycleWithRelations | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        qr_code:qr_codes(*),
        mat_type:mat_types(*)
      `)
      .eq('id', cycleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new RepositoryError('Failed to find cycle with relations', error);
    }

    return data as CycleWithRelations;
  }

  /**
   * Pridobi aktivne cikle za prodajalca
   */
  async findActiveBySalesperson(salespersonId: string): Promise<CycleWithRelations[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        qr_code:qr_codes(*),
        mat_type:mat_types(*)
      `)
      .eq('salesperson_id', salespersonId)
      .in('status', ['on_test', 'active', 'dirty'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new RepositoryError('Failed to find active cycles', error);
    }

    return (data || []) as CycleWithRelations[];
  }

  /**
   * Pridobi cikle za podjetje
   */
  async findByCompany(companyId: string, salespersonId?: string): Promise<CycleWithRelations[]> {
    let query = supabase
      .from(this.tableName)
      .select(`
        *,
        qr_code:qr_codes(*),
        mat_type:mat_types(*)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (salespersonId) {
      query = query.eq('salesperson_id', salespersonId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError('Failed to find cycles by company', error);
    }

    return (data || []) as CycleWithRelations[];
  }

  /**
   * Pridobi cikle po statusu
   */
  async findByStatus(status: CycleStatus, salespersonId?: string): Promise<CycleWithRelations[]> {
    let query = supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(*),
        qr_code:qr_codes(*),
        mat_type:mat_types(*)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (salespersonId) {
      query = query.eq('salesperson_id', salespersonId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError('Failed to find cycles by status', error);
    }

    return (data || []) as CycleWithRelations[];
  }

  /**
   * Posodobi status cikla
   */
  async updateStatus(cycleId: string, status: CycleStatus): Promise<Cycle> {
    return this.update(cycleId, { status } as Partial<Cycle>);
  }

  /**
   * Označi pogodbo kot podpisano
   */
  async markContractSigned(cycleId: string): Promise<Cycle> {
    return this.update(cycleId, {
      contract_signed: true,
      status: 'active',
    } as Partial<Cycle>);
  }

  /**
   * Posodobi lokacijo cikla
   */
  async updateLocation(cycleId: string, lat: number, lng: number): Promise<Cycle> {
    return this.update(cycleId, {
      location_lat: lat,
      location_lng: lng,
    } as Partial<Cycle>);
  }

  /**
   * Pridobi statistiko za prodajalca
   */
  async getStatsBySalesperson(salespersonId: string): Promise<CycleStats> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('status')
      .eq('salesperson_id', salespersonId);

    if (error) {
      throw new RepositoryError('Failed to get cycle stats', error);
    }

    const stats: CycleStats = {
      total: data?.length || 0,
      onTest: 0,
      active: 0,
      dirty: 0,
      pickedUp: 0,
    };

    data?.forEach(cycle => {
      switch (cycle.status) {
        case 'on_test':
          stats.onTest++;
          break;
        case 'active':
          stats.active++;
          break;
        case 'dirty':
          stats.dirty++;
          break;
        case 'picked_up':
          stats.pickedUp++;
          break;
      }
    });

    return stats;
  }

  /**
   * Pridobi cikle ki jim poteče test
   */
  async findExpiringTests(salespersonId: string, daysAhead: number = 2): Promise<CycleWithRelations[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(*),
        qr_code:qr_codes(*),
        mat_type:mat_types(*)
      `)
      .eq('salesperson_id', salespersonId)
      .eq('status', 'on_test')
      .lte('test_end_date', futureDate.toISOString())
      .order('test_end_date', { ascending: true });

    if (error) {
      throw new RepositoryError('Failed to find expiring tests', error);
    }

    return (data || []) as CycleWithRelations[];
  }

  /**
   * Pridobi zgodovino ciklov za prodajalca
   */
  async findHistory(salespersonId: string, limit: number = 100): Promise<CycleWithRelations[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(id, name, display_name),
        qr_code:qr_codes(code),
        mat_type:mat_types(code, name)
      `)
      .eq('salesperson_id', salespersonId)
      .in('status', ['completed', 'picked_up'])
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new RepositoryError('Failed to find cycle history', error);
    }

    return (data || []) as CycleWithRelations[];
  }

  /**
   * Podaljšaj test za 7 dni
   */
  async extendTest(cycleId: string, days: number = 7): Promise<Cycle> {
    const cycle = await this.findById(cycleId);
    if (!cycle) {
      throw new RepositoryError('Cycle not found');
    }

    const currentEndDate = cycle.test_end_date ? new Date(cycle.test_end_date) : new Date();
    currentEndDate.setDate(currentEndDate.getDate() + days);

    return this.update(cycleId, {
      test_end_date: currentEndDate.toISOString(),
    } as Partial<Cycle>);
  }

  /**
   * Batch posodobitev statusov
   */
  async batchUpdateStatus(cycleIds: string[], status: CycleStatus): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ status })
      .in('id', cycleIds);

    if (error) {
      throw new RepositoryError('Failed to batch update cycle status', error);
    }
  }

  /**
   * Batch podpis pogodb
   */
  async batchSignContracts(cycleIds: string[]): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ contract_signed: true, status: 'active' })
      .in('id', cycleIds);

    if (error) {
      throw new RepositoryError('Failed to batch sign contracts', error);
    }
  }
}

// Singleton instance
export const cycleRepository = new CycleRepository();

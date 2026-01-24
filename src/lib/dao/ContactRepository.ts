/**
 * @file ContactRepository.ts
 * @description Repozitorij za kontakte
 */

import { supabase } from '@/integrations/supabase/client';
import { BaseRepository, RepositoryError } from './BaseRepository';
import type { Contact, Company } from '@/integrations/supabase/types';

export interface ContactWithCompany extends Contact {
  company?: Company;
}

export interface CreateContactData {
  company_id: string;
  first_name: string;
  last_name?: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  is_primary?: boolean;
  is_billing_contact?: boolean;
  is_service_contact?: boolean;
  contact_since?: string | null;
  location_address?: string | null;
  created_by: string;
}

export class ContactRepository extends BaseRepository<Contact> {
  constructor() {
    super('contacts');
  }

  /**
   * Pridobi vse kontakte za podjetje
   */
  async findByCompany(companyId: string): Promise<Contact[]> {
    return this.findAll({
      filters: { company_id: companyId },
      orderBy: { column: 'created_at', ascending: false },
    });
  }

  /**
   * Pridobi kontakt s podjetjem
   */
  async findWithCompany(contactId: string): Promise<ContactWithCompany | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', contactId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new RepositoryError('Failed to find contact with company', error);
    }

    return data as ContactWithCompany;
  }

  /**
   * Išči kontakte po imenu ali emailu
   */
  async search(searchQuery: string, userId?: string): Promise<ContactWithCompany[]> {
    let query = supabase
      .from(this.tableName)
      .select(`
        *,
        company:companies(*)
      `)
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(50);

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError('Failed to search contacts', error);
    }

    return (data || []) as ContactWithCompany[];
  }

  /**
   * Pridobi primarne kontakte za podjetje
   */
  async findPrimaryByCompany(companyId: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .eq('is_primary', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new RepositoryError('Failed to find primary contact', error);
    }

    return data as Contact;
  }

  /**
   * Pridobi kontakte za fakturiranje
   */
  async findBillingContacts(companyId: string): Promise<Contact[]> {
    return this.findAll({
      filters: { company_id: companyId, is_billing_contact: true },
    });
  }

  /**
   * Pridobi servisne kontakte
   */
  async findServiceContacts(companyId: string): Promise<Contact[]> {
    return this.findAll({
      filters: { company_id: companyId, is_service_contact: true },
    });
  }

  /**
   * Ustvari kontakt z validacijo
   */
  async createContact(data: CreateContactData): Promise<Contact> {
    // Validate required fields
    if (!data.first_name?.trim()) {
      throw new RepositoryError('First name is required');
    }

    if (!data.company_id) {
      throw new RepositoryError('Company ID is required');
    }

    return this.create({
      ...data,
      first_name: data.first_name.trim(),
      last_name: data.last_name?.trim() || '',
    } as Omit<Contact, 'id' | 'created_at' | 'updated_at'>);
  }

  /**
   * Nastavi kontakt kot primarni (in odstrani primarnost drugim)
   */
  async setPrimary(contactId: string, companyId: string): Promise<void> {
    // First, remove primary from all contacts in company
    await supabase
      .from(this.tableName)
      .update({ is_primary: false })
      .eq('company_id', companyId);

    // Then set this contact as primary
    await this.update(contactId, { is_primary: true } as Partial<Contact>);
  }

  /**
   * Preveri če email že obstaja za drugo podjetje
   */
  async emailExistsForOtherCompany(email: string, companyId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .neq('company_id', companyId);

    if (error) {
      throw new RepositoryError('Failed to check email existence', error);
    }

    return (count || 0) > 0;
  }

  /**
   * Pridobi kontakte ustvarjene v določenem obdobju
   */
  async findCreatedBetween(startDate: Date, endDate: Date, userId?: string): Promise<Contact[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError('Failed to find contacts by date range', error);
    }

    return (data || []) as Contact[];
  }
}

// Singleton instance
export const contactRepository = new ContactRepository();

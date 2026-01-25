/**
 * @file ContactRepository.test.ts
 * @description Testi za ContactRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactRepository, contactRepository } from './ContactRepository';
import { RepositoryError } from './BaseRepository';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('ContactRepository', () => {
  let repository: ContactRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ContactRepository();
  });

  describe('findWithCompany', () => {
    it('should find contact with company data', async () => {
      const mockContact = {
        id: 'c1',
        first_name: 'John',
        last_name: 'Doe',
        company: { id: 'company-1', name: 'Test Company' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockContact, error: null }),
      } as any);

      const result = await repository.findWithCompany('c1');

      expect(result).toEqual(mockContact);
      expect(result?.company?.name).toBe('Test Company');
    });

    it('should return null if contact not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      const result = await repository.findWithCompany('999');

      expect(result).toBeNull();
    });
  });

  describe('findByCompany', () => {
    it('should find all contacts for a company', async () => {
      const mockContacts = [
        { id: 'c1', first_name: 'John', company_id: 'company-1' },
        { id: 'c2', first_name: 'Jane', company_id: 'company-1' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      } as any);

      const result = await repository.findByCompany('company-1');

      expect(result).toHaveLength(2);
    });

    it('should throw RepositoryError on database error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      } as any);

      await expect(repository.findByCompany('company-1')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findPrimaryByCompany', () => {
    it('should find primary contact for company', async () => {
      const mockContact = { id: 'c1', first_name: 'John', is_primary: true };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockContact, error: null }),
      } as any);

      const result = await repository.findPrimaryByCompany('company-1');

      expect(result).toEqual(mockContact);
    });

    it('should return null if no primary contact', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      const result = await repository.findPrimaryByCompany('company-1');

      expect(result).toBeNull();
    });
  });

  describe('createContact', () => {
    it('should create contact with company association', async () => {
      const newContact = {
        first_name: 'John',
        last_name: 'Doe',
        company_id: 'company-1',
        created_by: 'user-1',
      };
      const createdContact = { id: 'new-1', ...newContact };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdContact, error: null }),
      } as any);

      const result = await repository.createContact(newContact);

      expect(result.id).toBe('new-1');
      expect(result.first_name).toBe('John');
    });

    it('should throw RepositoryError if first_name is empty', async () => {
      await expect(repository.createContact({
        first_name: '',
        company_id: 'company-1',
        created_by: 'user-1',
      })).rejects.toThrow(RepositoryError);
    });

    it('should throw RepositoryError if company_id is missing', async () => {
      await expect(repository.createContact({
        first_name: 'John',
        company_id: '',
        created_by: 'user-1',
      })).rejects.toThrow(RepositoryError);
    });
  });

  describe('update (inherited)', () => {
    it('should update contact fields', async () => {
      const updatedContact = { id: 'c1', first_name: 'Jane', last_name: 'Smith' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedContact, error: null }),
      } as any);

      const result = await repository.update('c1', { first_name: 'Jane' });

      expect(result.first_name).toBe('Jane');
    });
  });

  describe('setPrimary', () => {
    it('should set contact as primary', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'c1', is_primary: true }, error: null }),
      } as any);

      await expect(repository.setPrimary('c1', 'company-1')).resolves.not.toThrow();
    });
  });

  describe('search', () => {
    it('should search contacts by name', async () => {
      const mockContacts = [
        { id: 'c1', first_name: 'John', last_name: 'Doe' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      } as any);

      const result = await repository.search('John');

      expect(result).toEqual(mockContacts);
    });

    it('should return empty array on no results', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      const result = await repository.search('Nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(contactRepository).toBeInstanceOf(ContactRepository);
    });
  });
});

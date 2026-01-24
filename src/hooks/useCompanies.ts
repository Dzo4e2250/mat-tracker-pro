import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyInsert, Contact, ContactInsert } from '@/integrations/supabase/types';

export type CompanyWithContacts = Company & {
  contacts?: Contact[];
};

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          contacts(*)
        `)
        .order('name');

      if (error) throw error;
      return data as CompanyWithContacts[];
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: CompanyInsert) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Fetch company cycle history (past attempts with notes)
export interface CompanyCycleHistory {
  id: string;
  status: string;
  notes: string | null;
  test_start_date: string | null;
  test_end_date: string | null;
  contract_signed: boolean;
  salesperson: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function useCompanyHistory(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-history', companyId],
    queryFn: async (): Promise<CompanyCycleHistory[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('cycles')
        .select(`
          id,
          status,
          notes,
          test_start_date,
          test_end_date,
          contract_signed,
          profiles!cycles_salesperson_id_fkey(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((cycle: any) => ({
        id: cycle.id,
        status: cycle.status,
        notes: cycle.notes,
        test_start_date: cycle.test_start_date,
        test_end_date: cycle.test_end_date,
        contract_signed: cycle.contract_signed,
        salesperson: cycle.profiles ? {
          first_name: cycle.profiles.first_name,
          last_name: cycle.profiles.last_name,
        } : null,
      }));
    },
    enabled: !!companyId,
  });
}

// Create company with contact in one transaction
export function useCreateCompanyWithContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      company,
      contact,
    }: {
      company: Omit<CompanyInsert, 'id'> & { display_name?: string };
      contact?: Omit<ContactInsert, 'id' | 'company_id'>;
    }) => {
      // Create company (including display_name if provided)
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();

      if (companyError) throw companyError;

      // Create contact if provided
      if (contact && (contact.first_name || contact.email || contact.phone)) {
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            ...contact,
            company_id: newCompany.id,
            first_name: contact.first_name || 'Kontakt',
            last_name: contact.last_name || '',
            is_primary: true,
          });

        if (contactError) {
          // Error handled
        }
      }

      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

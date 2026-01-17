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
          console.error('Error creating contact:', contactError);
        }
      }

      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

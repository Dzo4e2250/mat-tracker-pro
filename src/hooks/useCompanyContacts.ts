import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company, Contact, Cycle } from '@/integrations/supabase/types';

// Extended types
export type CompanyWithContacts = Company & {
  contacts: Contact[];
  cycles: Array<{
    company_id: string;
    status: string;
    contract_signed: boolean;
    created_at: string;
    test_start_date: string | null;
  }>;
  cycleStats: {
    onTest: number;
    signed: number;
    total: number;
    offerSent: boolean;
  };
  lastActivity?: string;
};

export type ContactWithCompany = Contact & {
  company?: Company;
};

// Fetch all companies for a salesperson (created by them or has cycles with them)
export function useCompanyContacts(userId?: string) {
  return useQuery({
    queryKey: ['company-contacts', userId],
    staleTime: 1000 * 60 * 5, // 5 minut - podatki so "sveži" 5 minut
    gcTime: 1000 * 60 * 30, // 30 minut v cache-u
    refetchOnWindowFocus: false, // ne refetchaj ob fokusu okna
    queryFn: async () => {
      if (!userId) return [];

      // Get all companies where user created them or has cycles
      const { data: cycles, error: cyclesError } = await supabase
        .from('cycles')
        .select(`
          company_id,
          status,
          contract_signed,
          created_at,
          test_start_date,
          company:companies(*)
        `)
        .eq('salesperson_id', userId)
        .not('company_id', 'is', null);

      if (cyclesError) throw cyclesError;

      // Also get companies created by user (even without cycles)
      const { data: createdCompanies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', userId);

      if (companiesError) throw companiesError;

      // Merge and deduplicate companies
      const companyMap = new Map<string, Company>();

      // Add companies from cycles
      cycles?.forEach(cycle => {
        if (cycle.company) {
          companyMap.set(cycle.company.id, cycle.company as Company);
        }
      });

      // Add created companies
      createdCompanies?.forEach(company => {
        companyMap.set(company.id, company);
      });

      // Get all company IDs
      const companyIds = Array.from(companyMap.keys());

      if (companyIds.length === 0) return [];

      // Get contacts for all companies
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .in('company_id', companyIds);

      if (contactsError) throw contactsError;

      // Get sent emails to check which companies have offers sent
      const { data: sentEmails, error: sentEmailsError } = await supabase
        .from('sent_emails')
        .select('company_id')
        .in('company_id', companyIds);

      if (sentEmailsError) throw sentEmailsError;

      // Create set of company IDs that have offers sent
      const companiesWithOffers = new Set(
        sentEmails?.map(e => e.company_id).filter(Boolean) || []
      );

      // Group contacts by company and sort by created_at (newest first)
      const contactsByCompany = new Map<string, Contact[]>();
      contacts?.forEach(contact => {
        const existing = contactsByCompany.get(contact.company_id) || [];
        existing.push(contact);
        contactsByCompany.set(contact.company_id, existing);
      });

      // Sort contacts within each company (newest first)
      contactsByCompany.forEach((companyContacts, companyId) => {
        companyContacts.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Calculate stats for each company
      const cyclesByCompany = new Map<string, typeof cycles>();
      cycles?.forEach(cycle => {
        if (cycle.company_id) {
          const existing = cyclesByCompany.get(cycle.company_id) || [];
          existing.push(cycle);
          cyclesByCompany.set(cycle.company_id, existing);
        }
      });

      // Build final result
      const result: CompanyWithContacts[] = Array.from(companyMap.values()).map(company => {
        const companyCycles = cyclesByCompany.get(company.id) || [];
        const companyContacts = contactsByCompany.get(company.id) || [];

        const onTest = companyCycles.filter(c => c.status === 'on_test').length;
        const signed = companyCycles.filter(c => c.contract_signed).length;
        const total = companyCycles.length;
        const offerSent = companiesWithOffers.has(company.id);

        // Find last activity
        const sortedCycles = [...companyCycles].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastActivity = sortedCycles[0]?.created_at;

        return {
          ...company,
          contacts: companyContacts,
          cycles: companyCycles.map(c => ({
            company_id: c.company_id!,
            status: c.status,
            contract_signed: c.contract_signed,
            created_at: c.created_at,
            test_start_date: c.test_start_date,
          })),
          cycleStats: { onTest, signed, total, offerSent },
          lastActivity,
        };
      });

      // Sort by last activity (most recent first)
      result.sort((a, b) => {
        if (!a.lastActivity && !b.lastActivity) return 0;
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      return result;
    },
    enabled: !!userId,
  });
}

// Get company details with all cycles history
export function useCompanyDetails(companyId?: string, userId?: string) {
  return useQuery({
    queryKey: ['company-details', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Get company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      // Get contacts (sorted by created_at, newest first)
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Get cycles history
      const { data: cycles, error: cyclesError } = await supabase
        .from('cycles')
        .select(`
          *,
          qr_code:qr_codes(*),
          mat_type:mat_types(*)
        `)
        .eq('company_id', companyId)
        .eq('salesperson_id', userId)
        .order('created_at', { ascending: false });

      if (cyclesError) throw cyclesError;

      return {
        ...company,
        contacts: contacts || [],
        cycles: cycles || [],
      };
    },
    enabled: !!companyId && !!userId,
  });
}

// Create a new company with optional contact
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      company,
      contact,
      userId,
    }: {
      company: {
        name: string;
        display_name?: string;
        tax_number?: string;
        address_street?: string;
        address_postal?: string;
        address_city?: string;
        delivery_address?: string;
        delivery_postal?: string;
        delivery_city?: string;
        billing_address?: string;
        billing_postal?: string;
        billing_city?: string;
        working_hours?: string;
        delivery_instructions?: string;
        customer_number?: string;
        notes?: string;
        pipeline_status?: string;
        parent_company_id?: string;
      };
      contact?: {
        first_name: string;
        last_name?: string;
        phone?: string;
        email?: string;
        role?: string;
        is_billing_contact?: boolean;
        is_service_contact?: boolean;
      };
      userId: string;
    }) => {
      // Create company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          display_name: company.display_name || null,
          tax_number: company.tax_number || null,
          address_street: company.address_street || null,
          address_postal: company.address_postal || null,
          address_city: company.address_city || null,
          delivery_address: company.delivery_address || null,
          delivery_postal: company.delivery_postal || null,
          delivery_city: company.delivery_city || null,
          billing_address: company.billing_address || null,
          billing_postal: company.billing_postal || null,
          billing_city: company.billing_city || null,
          working_hours: company.working_hours || null,
          delivery_instructions: company.delivery_instructions || null,
          customer_number: company.customer_number || null,
          notes: company.notes || null,
          pipeline_status: company.pipeline_status || null,
          parent_company_id: company.parent_company_id || null,
          created_by: userId,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create contact if provided
      if (contact?.first_name) {
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            company_id: newCompany.id,
            first_name: contact.first_name,
            last_name: contact.last_name || '',
            phone: contact.phone || null,
            email: contact.email || null,
            role: contact.role || null,
            is_primary: true,
            is_billing_contact: contact.is_billing_contact || false,
            is_service_contact: contact.is_service_contact || false,
            created_by: userId,
          });

        if (contactError) throw contactError;
      }

      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Add contact to existing company
export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      contact,
      userId,
    }: {
      companyId: string;
      contact: {
        first_name: string;
        last_name?: string;
        phone?: string;
        work_phone?: string;
        email?: string;
        role?: string;
        is_primary?: boolean;
        contact_since?: string;
        location_address?: string;
      };
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          company_id: companyId,
          first_name: contact.first_name,
          last_name: contact.last_name || '',
          phone: contact.phone || null,
          work_phone: contact.work_phone || null,
          email: contact.email || null,
          role: contact.role || null,
          is_primary: contact.is_primary || false,
          contact_since: contact.contact_since || null,
          location_address: contact.location_address || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-details'] });
    },
  });
}

// Update company
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: Partial<Company>;
    }) => {
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-details'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Update contact
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      data,
    }: {
      contactId: string;
      data: Partial<Contact>;
    }) => {
      const { error } = await supabase
        .from('contacts')
        .update(data)
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-details'] });
    },
  });
}

// Delete contact
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all company-contacts queries (with any userId)
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-details'] });
    },
  });
}

// Delete company (and all related data)
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      // Najprej izbriši opombe (ignoriramo napake če tabela ne obstaja)
      try {
        await supabase.from('company_notes').delete().eq('company_id', companyId);
      } catch (e) { /* ignore */ }

      // Izbriši opomnike
      try {
        await supabase.from('reminders').delete().eq('company_id', companyId);
      } catch (e) { /* ignore */ }

      // Izbriši offer_items (ponudbe)
      try {
        await supabase.from('offer_items').delete().eq('company_id', companyId);
      } catch (e) { /* ignore */ }

      // Izbriši kontakte
      await supabase.from('contacts').delete().eq('company_id', companyId);

      // Nazadnje izbriši podjetje
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-details'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

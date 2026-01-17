import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Cycle, CycleInsert, MatType, Company, Contact, QRCode } from '@/integrations/supabase/types';

// Extended cycle type with relations
export type CycleWithRelations = Cycle & {
  qr_code?: QRCode;
  mat_type?: MatType;
  company?: Company;
  contact?: Contact;
};

export function useCycles(userId?: string) {
  return useQuery({
    queryKey: ['cycles', userId],
    queryFn: async () => {
      let query = supabase
        .from('cycles')
        .select(`
          *,
          qr_code:qr_codes(*),
          mat_type:mat_types(*),
          company:companies(*),
          contact:contacts(*)
        `)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('salesperson_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CycleWithRelations[];
    },
    enabled: !!userId,
  });
}

export function useCycleHistory(userId?: string) {
  return useQuery({
    queryKey: ['cycles', 'history', userId],
    queryFn: async () => {
      let query = supabase
        .from('cycles')
        .select(`
          *,
          qr_code:qr_codes(*),
          mat_type:mat_types(*),
          company:companies(*),
          contact:contacts(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq('salesperson_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CycleWithRelations[];
    },
    enabled: !!userId,
  });
}

export function useCreateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycle: CycleInsert) => {
      const { data, error } = await supabase
        .from('cycles')
        .insert(cycle)
        .select(`
          *,
          qr_code:qr_codes(*),
          mat_type:mat_types(*)
        `)
        .single();

      if (error) throw error;

      // Update QR code status to active
      await supabase
        .from('qr_codes')
        .update({ status: 'active' })
        .eq('id', cycle.qr_code_id);

      // Add to history
      await supabase.from('cycle_history').insert({
        cycle_id: data.id,
        action: 'created',
        new_status: 'clean',
        performed_by: cycle.salesperson_id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stats'] });
    },
  });
}

export function useUpdateCycleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      newStatus,
      userId,
      additionalData = {},
    }: {
      cycleId: string;
      newStatus: Cycle['status'];
      userId: string;
      additionalData?: Partial<Cycle>;
    }) => {
      // Get current cycle for history
      const { data: currentCycle } = await supabase
        .from('cycles')
        .select('status')
        .eq('id', cycleId)
        .single();

      const updateData: Partial<Cycle> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      // Add timestamps based on status
      if (newStatus === 'on_test') {
        updateData.test_start_date = new Date().toISOString();
      } else if (newStatus === 'dirty') {
        updateData.test_end_date = new Date().toISOString();
      } else if (newStatus === 'waiting_driver') {
        updateData.pickup_requested_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('cycles')
        .update(updateData)
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;

      // Add to history
      await supabase.from('cycle_history').insert({
        cycle_id: cycleId,
        action: `status_change_to_${newStatus}`,
        old_status: currentCycle?.status,
        new_status: newStatus,
        performed_by: userId,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stats'] });
    },
  });
}

export function usePutOnTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      companyId,
      contactId,
      userId,
      notes,
      testStartDate,
      locationLat,
      locationLng,
    }: {
      cycleId: string;
      companyId: string;
      contactId?: string;
      userId: string;
      notes?: string;
      testStartDate?: string; // ISO date string, defaults to now
      locationLat?: number;
      locationLng?: number;
    }) => {
      const { data: currentCycle } = await supabase
        .from('cycles')
        .select('status')
        .eq('id', cycleId)
        .single();

      const { data, error } = await supabase
        .from('cycles')
        .update({
          status: 'on_test',
          company_id: companyId,
          contact_id: contactId || null,
          test_start_date: testStartDate || new Date().toISOString(),
          notes: notes || null,
          location_lat: locationLat || null,
          location_lng: locationLng || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .select(`
          *,
          qr_code:qr_codes(*),
          mat_type:mat_types(*),
          company:companies(*),
          contact:contacts(*)
        `)
        .single();

      if (error) throw error;

      // Add to history
      await supabase.from('cycle_history').insert({
        cycle_id: cycleId,
        action: 'put_on_test',
        old_status: currentCycle?.status,
        new_status: 'on_test',
        metadata: { company_id: companyId, contact_id: contactId },
        performed_by: userId,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stats'] });
    },
  });
}

// Update test start date for existing cycle
export function useUpdateTestStartDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      testStartDate,
    }: {
      cycleId: string;
      testStartDate: string; // ISO date string
    }) => {
      const { data, error } = await supabase
        .from('cycles')
        .update({
          test_start_date: testStartDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}

// Update cycle location coordinates
export function useUpdateCycleLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      locationLat,
      locationLng,
    }: {
      cycleId: string;
      locationLat: number;
      locationLng: number;
    }) => {
      const { data, error } = await supabase
        .from('cycles')
        .update({
          location_lat: locationLat,
          location_lng: locationLng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

// Mark contract as signed (without changing status - inventar will confirm later)
export function useMarkContractSigned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      frequency,
    }: {
      cycleId: string;
      frequency?: string;
    }) => {
      const { data, error } = await supabase
        .from('cycles')
        .update({
          contract_signed: true,
          contract_signed_at: new Date().toISOString(),
          contract_frequency: frequency || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

export function useSignContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      frequency,
      userId,
    }: {
      cycleId: string;
      frequency: string;
      userId: string;
    }) => {
      const { data: currentCycle } = await supabase
        .from('cycles')
        .select('status')
        .eq('id', cycleId)
        .single();

      const { data, error } = await supabase
        .from('cycles')
        .update({
          status: 'waiting_driver',
          contract_signed: true,
          contract_frequency: frequency,
          contract_signed_at: new Date().toISOString(),
          pickup_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;

      // Add to history
      await supabase.from('cycle_history').insert({
        cycle_id: cycleId,
        action: 'contract_signed',
        old_status: currentCycle?.status,
        new_status: 'waiting_driver',
        metadata: { frequency },
        performed_by: userId,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stats'] });
    },
  });
}

export function useExtendTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      userId,
    }: {
      cycleId: string;
      userId: string;
    }) => {
      // Get current cycle
      const { data: currentCycle, error: fetchError } = await supabase
        .from('cycles')
        .select('test_start_date, extensions_count')
        .eq('id', cycleId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new test end date (extend by 7 days from current end)
      const currentStart = new Date(currentCycle.test_start_date);
      const currentEnd = new Date(currentStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      const newEnd = new Date(currentEnd.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Set new start date so that +7 days = newEnd
      const newStart = new Date(newEnd.getTime() - (7 * 24 * 60 * 60 * 1000));

      const { data, error } = await supabase
        .from('cycles')
        .update({
          test_start_date: newStart.toISOString(),
          extensions_count: (currentCycle.extensions_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;

      // Add to history
      await supabase.from('cycle_history').insert({
        cycle_id: cycleId,
        action: 'test_extended',
        old_status: 'on_test',
        new_status: 'on_test',
        metadata: {
          extensions_count: (currentCycle.extensions_count || 0) + 1,
          new_end_date: newEnd.toISOString(),
        },
        performed_by: userId,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stats'] });
    },
  });
}

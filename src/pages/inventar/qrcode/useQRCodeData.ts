/**
 * @file useQRCodeData.ts
 * @description Queries in mutations za QR kode
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateUniqueQRCodes } from '@/lib/utils';
import type { QRCode, Cycle, MatType, Company } from '@/integrations/supabase/types';

export type QRCodeWithCycle = QRCode & {
  active_cycle?: Cycle & {
    mat_type?: MatType;
    company?: Company;
  };
};

export function useFreeCodes(sellerId: string) {
  return useQuery({
    queryKey: ['free_codes', sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', sellerId)
        .eq('status', 'available')
        .order('code');
      if (error) throw error;
      return data as QRCode[];
    },
    enabled: !!sellerId,
  });
}

export function useQRCodesWithCycles(sellerId: string) {
  return useQuery({
    queryKey: ['qr_codes_with_cycles', sellerId],
    queryFn: async (): Promise<QRCodeWithCycle[]> => {
      if (!sellerId) return [];
      const { data: codes, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', sellerId)
        .order('code');
      if (error) throw error;

      const codesWithCycles: QRCodeWithCycle[] = await Promise.all(
        (codes || []).map(async (code) => {
          const { data: cycle } = await supabase
            .from('cycles')
            .select(`*, mat_type:mat_types(*), company:companies(*)`)
            .eq('qr_code_id', code.id)
            .neq('status', 'completed')
            .maybeSingle();
          return { ...code, active_cycle: cycle || undefined };
        })
      );
      return codesWithCycles;
    },
    enabled: !!sellerId,
  });
}

export function useQRCodeMutations(sellerId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCodes = useMutation({
    mutationFn: async ({
      prefix,
      count,
      ownerId,
    }: {
      prefix: string;
      count: number;
      ownerId: string;
    }) => {
      const { data: existingCodes } = await supabase
        .from('qr_codes')
        .select('code')
        .like('code', `${prefix}-%`);

      const existingSet = new Set((existingCodes || []).map(c => c.code));
      const newCodeStrings = generateUniqueQRCodes(prefix, count, existingSet);

      if (newCodeStrings.length < count) {
        throw new Error(`Uspelo je generirati samo ${newCodeStrings.length} od ${count} kod`);
      }

      const newCodes = newCodeStrings.map(code => ({
        code,
        owner_id: ownerId,
        status: 'available' as const,
      }));

      const { data, error } = await supabase.from('qr_codes').insert(newCodes).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Uspeh', description: `Ustvarjenih ${data.length} novih QR kod` });
      queryClient.invalidateQueries({ queryKey: ['free_codes', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes_with_cycles', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCode = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase.from('qr_codes').delete().eq('id', codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Uspeh', description: 'QR koda izbrisana' });
      queryClient.invalidateQueries({ queryKey: ['free_codes', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes_with_cycles', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  return { createCodes, deleteCode };
}

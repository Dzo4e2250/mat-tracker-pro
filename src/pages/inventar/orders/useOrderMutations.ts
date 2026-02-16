import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateUniqueQRCodes } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ApproveOrderParams {
  orderId: string;
  salespersonId: string;
  prefix: string;
  quantity: number;
  approvedBy: string | undefined;
}

interface RejectOrderParams {
  orderId: string;
  reason: string;
}

export function useApproveOrder(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      orderId,
      salespersonId,
      prefix,
      quantity,
      approvedBy,
    }: ApproveOrderParams) => {
      // Get existing codes to ensure uniqueness
      const existingCodesResult = await supabase
        .from('qr_codes')
        .select('code')
        .like('code', `${prefix}-%`);

      const existingCodes = new Set(
        (existingCodesResult.data || []).map((c) => c.code)
      );

      // Generate unique random codes
      const generatedCodes = generateUniqueQRCodes(prefix, quantity, existingCodes);

      if (generatedCodes.length < quantity) {
        throw new Error('Ni mogoče generirati dovolj unikatnih kod.');
      }

      const newCodes = generatedCodes.map((code) => ({
        code,
        owner_id: salespersonId,
        status: 'available',
        order_id: orderId,
      }));

      // Insert new QR codes
      const { error: codesError } = await supabase
        .from('qr_codes')
        .insert(newCodes);

      if (codesError) throw codesError;

      // Update order status to approved
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
          notes: `Količina: ${quantity}`,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return { order: data, generatedCodes };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['free_codes'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes_with_cycles'] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      toast({
        title: 'Naročilo odobreno',
        description: `Generirano ${data.generatedCodes.length} novih QR kod. Prodajalec jih lahko zdaj vidi.`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRejectOrder(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, reason }: RejectOrderParams) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Naročilo zavrnjeno',
        description: 'Naročilo je bilo zavrnjeno.',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useShipOrder(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Naročilo odposlano',
        description: 'Naročilo je bilo označeno kot odposlano.',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

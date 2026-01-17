import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderInsert } from '@/integrations/supabase/types';

export type OrderWithDetails = Order & {
  total_quantity?: number;
};

export function useOrders(userId?: string) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('salesperson_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Parse quantity from notes (format: "Količina: X\n...")
      const ordersWithQuantity: OrderWithDetails[] = (data || []).map(order => {
        let total_quantity = 0;
        if (order.notes) {
          const match = order.notes.match(/Količina:\s*(\d+)/);
          if (match) {
            total_quantity = parseInt(match[1], 10);
          }
        }
        return { ...order, total_quantity };
      });

      return ordersWithQuantity;
    },
    enabled: !!userId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      quantity,
      notes,
    }: {
      userId: string;
      quantity: number;
      notes?: string;
    }) => {
      // Store quantity in notes field for simplicity
      const orderNotes = `Količina: ${quantity}${notes ? `\nOpomba: ${notes}` : ''}`;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          salesperson_id: userId,
          status: 'pending',
          notes: orderNotes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// Fetch QR codes associated with an order
export function useOrderCodes(orderId?: string) {
  return useQuery({
    queryKey: ['order-codes', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('id, code, status')
        .eq('order_id', orderId)
        .order('code');

      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
  });
}

export function useOrderStats(userId?: string) {
  return useQuery({
    queryKey: ['orders', 'stats', userId],
    queryFn: async () => {
      // Get all QR codes owned by this user
      const { data: qrCodes, error: qrError } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('owner_id', userId);

      if (qrError) throw qrError;

      const total = qrCodes?.length || 0;
      const qrCodeIds = qrCodes?.map(qr => qr.id) || [];

      // Get active cycles (not completed) for this user's QR codes
      let active = 0;
      if (qrCodeIds.length > 0) {
        const { count: activeCycles } = await supabase
          .from('cycles')
          .select('*', { count: 'exact', head: true })
          .in('qr_code_id', qrCodeIds)
          .neq('status', 'completed');

        active = activeCycles || 0;
      }

      // Available = total codes minus codes with active cycles
      const available = total - active;

      // Get pending orders count
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('salesperson_id', userId)
        .eq('status', 'pending');

      return {
        available,
        active,
        total,
        pendingOrders: pendingOrders || 0,
      };
    },
    enabled: !!userId,
  });
}

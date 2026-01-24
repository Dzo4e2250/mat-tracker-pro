import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderWithSeller {
  id: string;
  salespersonId: string;
  salespersonName: string;
  salespersonPrefix: string | null;
  status: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  shippedAt: string | null;
  rejectionReason: string | null;
}

export function useAllOrders() {
  return useQuery({
    queryKey: ['orders', 'all'],
    queryFn: async (): Promise<OrderWithSeller[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          salesperson_id,
          status,
          notes,
          created_at,
          approved_at,
          approved_by,
          shipped_at,
          rejection_reason,
          profiles!orders_salesperson_id_fkey(first_name, last_name, code_prefix)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((order: any) => {
        let quantity = 0;
        if (order.notes) {
          const match = order.notes.match(/Količina:\s*(\d+)/);
          if (match) {
            quantity = parseInt(match[1], 10);
          }
        }

        return {
          id: order.id,
          salespersonId: order.salesperson_id,
          salespersonName: order.profiles
            ? `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`.trim()
            : 'Neznan',
          salespersonPrefix: order.profiles?.code_prefix || null,
          status: order.status,
          quantity,
          notes: order.notes,
          createdAt: order.created_at,
          approvedAt: order.approved_at,
          approvedBy: order.approved_by,
          shippedAt: order.shipped_at,
          rejectionReason: order.rejection_reason,
        };
      });
    },
  });
}

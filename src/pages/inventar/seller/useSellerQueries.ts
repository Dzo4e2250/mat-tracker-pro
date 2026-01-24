/**
 * @file useSellerQueries.ts
 * @description Queries za SellerPage - QR kode, naročila, umazane preproge
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QRCodeWithCycle, DirtyMat } from '../components/types';

export interface OrderStats {
  totalOrdered: number;
  pendingOrdered: number;
  approvedOrdered: number;
  shippedOrdered: number;
  orders: Array<{
    id: string;
    status: string;
    notes: string | null;
    created_at: string;
    quantity: number;
  }>;
}

export function useSellerQRCodes(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller_qr_codes', sellerId],
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
            .select(`
              *,
              mat_type:mat_types(*),
              company:companies(*)
            `)
            .eq('qr_code_id', code.id)
            .neq('status', 'completed')
            .maybeSingle();

          return {
            ...code,
            active_cycle: cycle || undefined,
          };
        })
      );

      return codesWithCycles;
    },
    enabled: !!sellerId,
  });
}

export function useSellerOrders(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller_orders', sellerId],
    queryFn: async (): Promise<OrderStats | null> => {
      if (!sellerId) return null;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, notes, created_at')
        .eq('salesperson_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let totalOrdered = 0;
      let pendingOrdered = 0;
      let approvedOrdered = 0;
      let shippedOrdered = 0;

      const orderList = (orders || []).map(order => {
        let quantity = 0;
        if (order.notes) {
          const match = order.notes.match(/Količina:\s*(\d+)/);
          if (match) quantity = parseInt(match[1], 10);
        }

        if (order.status === 'pending') pendingOrdered += quantity;
        else if (order.status === 'approved') approvedOrdered += quantity;
        else if (order.status === 'shipped' || order.status === 'received') shippedOrdered += quantity;

        if (order.status !== 'rejected') totalOrdered += quantity;

        return { ...order, quantity };
      });

      return {
        totalOrdered,
        pendingOrdered,
        approvedOrdered,
        shippedOrdered,
        orders: orderList,
      };
    },
    enabled: !!sellerId,
  });
}

export function useSellerDirtyMats(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller_dirty_mats', sellerId],
    queryFn: async (): Promise<DirtyMat[]> => {
      if (!sellerId) return [];

      const { data: cycles, error } = await supabase
        .from('cycles')
        .select(`
          id,
          status,
          pickup_requested_at,
          test_start_date,
          qr_code_id,
          company_id,
          qr_codes!inner(id, code),
          mat_types(code, name),
          companies(name, address_street, address_city, latitude, longitude),
          contacts(first_name, last_name, phone)
        `)
        .eq('salesperson_id', sellerId)
        .in('status', ['dirty', 'waiting_driver', 'on_test'])
        .order('pickup_requested_at', { ascending: false });

      if (error) throw error;

      // Get company contacts as fallback for cycles without direct contact
      const companyIds = [...new Set((cycles || []).filter(c => c.company_id && !c.contacts).map(c => c.company_id))];
      const companyContacts: Record<string, { first_name: string; last_name: string; phone: string }> = {};

      if (companyIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('company_id, first_name, last_name, phone')
          .in('company_id', companyIds);

        (contacts || []).forEach((contact: any) => {
          if (!companyContacts[contact.company_id]) {
            companyContacts[contact.company_id] = contact;
          }
        });
      }

      const now = new Date();
      return (cycles || []).map((cycle: any) => {
        const testStartDate = cycle.test_start_date ? new Date(cycle.test_start_date) : null;
        const daysOnTest = testStartDate
          ? Math.floor((now.getTime() - testStartDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const contact = cycle.contacts || companyContacts[cycle.company_id];

        return {
          cycleId: cycle.id,
          qrCode: cycle.qr_codes?.code || '',
          qrCodeId: cycle.qr_code_id,
          matTypeName: cycle.mat_types?.name || 'Neznano',
          matTypeCode: cycle.mat_types?.code || null,
          companyName: cycle.companies?.name || null,
          companyAddress: cycle.companies
            ? `${cycle.companies.address_street || ''}, ${cycle.companies.address_city || ''}`.trim()
            : null,
          companyLatitude: cycle.companies?.latitude || null,
          companyLongitude: cycle.companies?.longitude || null,
          contactName: contact
            ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
            : null,
          contactPhone: contact?.phone || null,
          status: cycle.status,
          pickupRequestedAt: cycle.pickup_requested_at,
          testStartDate: cycle.test_start_date,
          daysOnTest,
        };
      });
    },
    enabled: !!sellerId,
  });
}

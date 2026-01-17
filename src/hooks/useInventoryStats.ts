import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SellerStats {
  id: string;
  firstName: string;
  lastName: string;
  codePrefix: string | null;
  clean: number;
  onTest: number;
  dirty: number;
  waitingDriver: number;
  total: number;
}

export interface InventoryStatsData {
  sellers: SellerStats[];
  totals: {
    clean: number;
    onTest: number;
    dirty: number;
    waitingDriver: number;
    total: number;
  };
}

// Fetch inventory statistics broken down by seller
export function useInventoryByUser() {
  return useQuery({
    queryKey: ['inventory', 'by-user'],
    queryFn: async (): Promise<InventoryStatsData> => {
      // Get all active prodajalec profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, code_prefix')
        .eq('role', 'prodajalec')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name');

      if (profileError) throw profileError;

      // Get all active cycles (not completed)
      const { data: cycles, error: cyclesError } = await supabase
        .from('cycles')
        .select('salesperson_id, status')
        .neq('status', 'completed');

      if (cyclesError) throw cyclesError;

      // Aggregate by seller
      const sellerStatsMap = new Map<string, SellerStats>();

      // Initialize all sellers
      (profiles || []).forEach(profile => {
        sellerStatsMap.set(profile.id, {
          id: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          codePrefix: profile.code_prefix,
          clean: 0,
          onTest: 0,
          dirty: 0,
          waitingDriver: 0,
          total: 0,
        });
      });

      // Count cycles by status for each seller
      (cycles || []).forEach(cycle => {
        const seller = sellerStatsMap.get(cycle.salesperson_id);
        if (seller) {
          seller.total++;
          switch (cycle.status) {
            case 'clean':
              seller.clean++;
              break;
            case 'on_test':
              seller.onTest++;
              break;
            case 'dirty':
              seller.dirty++;
              break;
            case 'waiting_driver':
              seller.waitingDriver++;
              break;
          }
        }
      });

      const sellers = Array.from(sellerStatsMap.values());

      // Calculate totals
      const totals = sellers.reduce(
        (acc, seller) => ({
          clean: acc.clean + seller.clean,
          onTest: acc.onTest + seller.onTest,
          dirty: acc.dirty + seller.dirty,
          waitingDriver: acc.waitingDriver + seller.waitingDriver,
          total: acc.total + seller.total,
        }),
        { clean: 0, onTest: 0, dirty: 0, waitingDriver: 0, total: 0 }
      );

      return { sellers, totals };
    },
  });
}

// Fetch all dirty mats grouped by seller
export interface DirtyMatInfo {
  cycleId: string;
  qrCode: string;
  matTypeName: string;
  companyName: string | null;
  companyAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  status: 'dirty' | 'waiting_driver';
  salespersonId: string;
  salespersonName: string;
  pickupRequestedAt: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

export interface DirtyMatsBySeller {
  sellerId: string;
  sellerName: string;
  sellerPrefix: string | null;
  mats: DirtyMatInfo[];
}

export function useDirtyMatsByUser() {
  return useQuery({
    queryKey: ['inventory', 'dirty-mats'],
    queryFn: async (): Promise<DirtyMatsBySeller[]> => {
      // Get all dirty and waiting_driver cycles with related data
      const { data: cycles, error } = await supabase
        .from('cycles')
        .select(`
          id,
          status,
          pickup_requested_at,
          location_lat,
          location_lng,
          salesperson_id,
          qr_codes!inner(code),
          mat_types(code, name),
          companies(name, address_street, address_city),
          contacts(first_name, last_name, phone),
          profiles!cycles_salesperson_id_fkey(first_name, last_name, code_prefix)
        `)
        .in('status', ['dirty', 'waiting_driver'])
        .order('pickup_requested_at', { ascending: false });

      if (error) throw error;

      // Group by salesperson
      const sellerMap = new Map<string, DirtyMatsBySeller>();

      (cycles || []).forEach((cycle: any) => {
        const sellerId = cycle.salesperson_id;
        const sellerProfile = cycle.profiles;

        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, {
            sellerId,
            sellerName: `${sellerProfile?.first_name || ''} ${sellerProfile?.last_name || ''}`.trim(),
            sellerPrefix: sellerProfile?.code_prefix || null,
            mats: [],
          });
        }

        const seller = sellerMap.get(sellerId)!;
        seller.mats.push({
          cycleId: cycle.id,
          qrCode: cycle.qr_codes?.code || '',
          matTypeName: cycle.mat_types?.code || cycle.mat_types?.name || 'Neznano',
          companyName: cycle.companies?.name || null,
          companyAddress: cycle.companies
            ? `${cycle.companies.address_street || ''}, ${cycle.companies.address_city || ''}`.trim()
            : null,
          contactName: cycle.contacts
            ? `${cycle.contacts.first_name || ''} ${cycle.contacts.last_name || ''}`.trim()
            : null,
          contactPhone: cycle.contacts?.phone || null,
          status: cycle.status,
          salespersonId: sellerId,
          salespersonName: `${sellerProfile?.first_name || ''} ${sellerProfile?.last_name || ''}`.trim(),
          pickupRequestedAt: cycle.pickup_requested_at,
          locationLat: cycle.location_lat,
          locationLng: cycle.location_lng,
        });
      });

      return Array.from(sellerMap.values()).sort((a, b) =>
        a.sellerName.localeCompare(b.sellerName)
      );
    },
  });
}

// Fetch mats on test with duration info
export interface OnTestMatInfo {
  cycleId: string;
  qrCode: string;
  matTypeName: string;
  companyName: string | null;
  companyAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  salespersonId: string;
  salespersonName: string;
  salespersonPrefix: string | null;
  testStartDate: string;
  daysOnTest: number;
  lastContactDate: string | null;
}

export function useMatsOnTest(minDays = 0) {
  return useQuery({
    queryKey: ['inventory', 'on-test', minDays],
    queryFn: async (): Promise<OnTestMatInfo[]> => {
      const { data: cycles, error } = await supabase
        .from('cycles')
        .select(`
          id,
          test_start_date,
          last_contact_date,
          salesperson_id,
          qr_codes!inner(code),
          mat_types(code, name),
          companies(name, address_street, address_city),
          contacts(first_name, last_name, phone),
          profiles!cycles_salesperson_id_fkey(first_name, last_name, code_prefix)
        `)
        .eq('status', 'on_test')
        .order('test_start_date', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const results: OnTestMatInfo[] = [];

      (cycles || []).forEach((cycle: any) => {
        const testStartDate = cycle.test_start_date
          ? new Date(cycle.test_start_date)
          : new Date(cycle.created_at);
        const daysOnTest = Math.floor(
          (now.getTime() - testStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOnTest >= minDays) {
          results.push({
            cycleId: cycle.id,
            qrCode: cycle.qr_codes?.code || '',
            matTypeName: cycle.mat_types?.code || cycle.mat_types?.name || 'Neznano',
            companyName: cycle.companies?.name || null,
            companyAddress: cycle.companies
              ? `${cycle.companies.address_street || ''}, ${cycle.companies.address_city || ''}`.trim()
              : null,
            contactName: cycle.contacts
              ? `${cycle.contacts.first_name || ''} ${cycle.contacts.last_name || ''}`.trim()
              : null,
            contactPhone: cycle.contacts?.phone || null,
            salespersonId: cycle.salesperson_id,
            salespersonName: `${cycle.profiles?.first_name || ''} ${cycle.profiles?.last_name || ''}`.trim(),
            salespersonPrefix: cycle.profiles?.code_prefix || null,
            testStartDate: cycle.test_start_date || cycle.created_at,
            daysOnTest,
            lastContactDate: cycle.last_contact_date,
          });
        }
      });

      return results;
    },
  });
}

// Get pickup history
export interface PickupHistoryItem {
  id: string;
  status: string;
  scheduledDate: string | null;
  completedAt: string | null;
  assignedDriver: string | null;
  notes: string | null;
  createdAt: string;
  itemCount: number;
}

export function usePickupHistory(limit = 50) {
  return useQuery({
    queryKey: ['inventory', 'pickup-history', limit],
    queryFn: async (): Promise<PickupHistoryItem[]> => {
      const { data, error } = await supabase
        .from('driver_pickups')
        .select(`
          id,
          status,
          scheduled_date,
          completed_at,
          assigned_driver,
          notes,
          created_at,
          driver_pickup_items(count)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((pickup: any) => ({
        id: pickup.id,
        status: pickup.status,
        scheduledDate: pickup.scheduled_date,
        completedAt: pickup.completed_at,
        assignedDriver: pickup.assigned_driver,
        notes: pickup.notes,
        createdAt: pickup.created_at,
        itemCount: pickup.driver_pickup_items?.[0]?.count || 0,
      }));
    },
  });
}

/**
 * @file useDashboardActions.ts
 * @description Hook za pridobivanje akcij za danes na Dashboard-u
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActionItem {
  id: string;
  type: 'critical_test' | 'old_pickup' | 'dirty_seller' | 'waiting_driver' | 'long_test' | 'active_pickup';
  title: string;
  description: string;
  count?: number;
  link: string;
  priority: 'urgent' | 'today';
  meta?: {
    sellerId?: string;
    sellerName?: string;
    pickupId?: string;
    daysOnTest?: number;
    daysPending?: number;
  };
}

interface DashboardActionsData {
  urgent: ActionItem[];
  today: ActionItem[];
  totalUrgent: number;
  totalToday: number;
}

// Konfiguracijski pragovi (TODO: prenesi v price_settings)
const THRESHOLDS = {
  TEST_CRITICAL_DAYS: 30,
  TEST_WARNING_DAYS: 20,
  PICKUP_OLD_DAYS: 3,
  DIRTY_THRESHOLD: 10,
};

export function useDashboardActions() {
  return useQuery({
    queryKey: ['dashboard', 'actions'],
    queryFn: async (): Promise<DashboardActionsData> => {
      const actions: ActionItem[] = [];
      const now = new Date();

      // 1. Pridobi predpražnike na testu (za critical >30 dni in warning >20 dni)
      const { data: testCycles } = await supabase
        .from('cycles')
        .select(`
          id,
          test_start_date,
          salesperson_id,
          profiles!cycles_salesperson_id_fkey(first_name, last_name, code_prefix),
          companies(name)
        `)
        .eq('status', 'on_test');

      const criticalTestMats: { sellerId: string; sellerName: string; count: number; maxDays: number }[] = [];
      const warningTestMats: { sellerId: string; sellerName: string; count: number; maxDays: number }[] = [];

      const testBySeller = new Map<string, { name: string; critical: number; warning: number; maxDays: number }>();

      (testCycles || []).forEach((cycle: any) => {
        const startDate = cycle.test_start_date ? new Date(cycle.test_start_date) : null;
        if (!startDate) return;

        const daysOnTest = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const sellerId = cycle.salesperson_id;
        const sellerName = `${cycle.profiles?.first_name || ''} ${cycle.profiles?.last_name || ''}`.trim();

        if (!testBySeller.has(sellerId)) {
          testBySeller.set(sellerId, { name: sellerName, critical: 0, warning: 0, maxDays: 0 });
        }

        const seller = testBySeller.get(sellerId)!;
        seller.maxDays = Math.max(seller.maxDays, daysOnTest);

        if (daysOnTest >= THRESHOLDS.TEST_CRITICAL_DAYS) {
          seller.critical++;
        } else if (daysOnTest >= THRESHOLDS.TEST_WARNING_DAYS) {
          seller.warning++;
        }
      });

      testBySeller.forEach((data, sellerId) => {
        if (data.critical > 0) {
          actions.push({
            id: `critical-test-${sellerId}`,
            type: 'critical_test',
            title: `${data.critical}x na testu >30 dni`,
            description: `${data.name} - najdlje ${data.maxDays} dni`,
            count: data.critical,
            link: `/inventar/prodajalec/${sellerId}`,
            priority: 'urgent',
            meta: { sellerId, sellerName: data.name, daysOnTest: data.maxDays },
          });
        }
        if (data.warning > 0) {
          actions.push({
            id: `warning-test-${sellerId}`,
            type: 'long_test',
            title: `${data.warning}x na testu >20 dni`,
            description: `${data.name} - kontaktiraj stranke`,
            count: data.warning,
            link: `/inventar/prodajalec/${sellerId}`,
            priority: 'today',
            meta: { sellerId, sellerName: data.name },
          });
        }
      });

      // 2. Pridobi stare prevzeme (pending >3 dni)
      const { data: pendingPickups } = await supabase
        .from('driver_pickups')
        .select('id, created_at, assigned_driver, driver_pickup_items(count)')
        .eq('status', 'pending');

      (pendingPickups || []).forEach((pickup: any) => {
        const createdAt = new Date(pickup.created_at);
        const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        if (daysPending >= THRESHOLDS.PICKUP_OLD_DAYS) {
          const itemCount = pickup.driver_pickup_items?.[0]?.count || 0;
          actions.push({
            id: `old-pickup-${pickup.id}`,
            type: 'old_pickup',
            title: `Prevzem čaka ${daysPending} dni`,
            description: `${itemCount} predpražnikov - ${pickup.assigned_driver || 'brez šoferja'}`,
            link: '/inventar/prevzemi',
            priority: 'urgent',
            meta: { pickupId: pickup.id, daysPending },
          });
        }
      });

      // 3. Pridobi aktivne prevzeme (in_progress) - za zaključiti
      const { data: activePickups } = await supabase
        .from('driver_pickups')
        .select('id, assigned_driver, driver_pickup_items(count)')
        .eq('status', 'in_progress');

      (activePickups || []).forEach((pickup: any) => {
        const itemCount = pickup.driver_pickup_items?.[0]?.count || 0;
        actions.push({
          id: `active-pickup-${pickup.id}`,
          type: 'active_pickup',
          title: 'Prevzem v teku',
          description: `${itemCount} predpražnikov - ${pickup.assigned_driver || 'brez šoferja'}`,
          link: '/inventar/prevzemi',
          priority: 'today',
          meta: { pickupId: pickup.id },
        });
      });

      // 4. Pridobi umazane predpražnike po prodajalcih
      const { data: dirtyCycles } = await supabase
        .from('cycles')
        .select(`
          id,
          status,
          salesperson_id,
          profiles!cycles_salesperson_id_fkey(first_name, last_name, code_prefix)
        `)
        .in('status', ['dirty', 'waiting_driver']);

      const dirtyBySeller = new Map<string, { name: string; prefix: string | null; dirty: number; waiting: number }>();

      (dirtyCycles || []).forEach((cycle: any) => {
        const sellerId = cycle.salesperson_id;
        const profile = cycle.profiles;

        if (!dirtyBySeller.has(sellerId)) {
          dirtyBySeller.set(sellerId, {
            name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            prefix: profile?.code_prefix || null,
            dirty: 0,
            waiting: 0,
          });
        }

        const seller = dirtyBySeller.get(sellerId)!;
        if (cycle.status === 'dirty') {
          seller.dirty++;
        } else {
          seller.waiting++;
        }
      });

      dirtyBySeller.forEach((data, sellerId) => {
        // Umazani >= prag
        if (data.dirty >= THRESHOLDS.DIRTY_THRESHOLD) {
          actions.push({
            id: `dirty-seller-${sellerId}`,
            type: 'dirty_seller',
            title: `${data.dirty}x umazanih`,
            description: `${data.prefix ? `[${data.prefix}] ` : ''}${data.name} - organiziraj prevzem`,
            count: data.dirty,
            link: `/inventar/prodajalec/${sellerId}`,
            priority: 'today',
            meta: { sellerId, sellerName: data.name },
          });
        }

        // Čakajo šoferja
        if (data.waiting > 0) {
          actions.push({
            id: `waiting-driver-${sellerId}`,
            type: 'waiting_driver',
            title: `${data.waiting}x čaka šoferja`,
            description: `${data.prefix ? `[${data.prefix}] ` : ''}${data.name}`,
            count: data.waiting,
            link: `/inventar/prodajalec/${sellerId}`,
            priority: 'today',
            meta: { sellerId, sellerName: data.name },
          });
        }
      });

      // Razvrsti akcije
      const urgent = actions
        .filter(a => a.priority === 'urgent')
        .sort((a, b) => (b.meta?.daysOnTest || b.meta?.daysPending || 0) - (a.meta?.daysOnTest || a.meta?.daysPending || 0));

      const today = actions
        .filter(a => a.priority === 'today')
        .sort((a, b) => (b.count || 0) - (a.count || 0));

      return {
        urgent,
        today,
        totalUrgent: urgent.length,
        totalToday: today.length,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 min cache
    refetchInterval: 1000 * 60 * 5, // Osveži vsakih 5 min
  });
}

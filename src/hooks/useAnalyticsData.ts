import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { sl } from 'date-fns/locale';

export interface KPIData {
  activeCycles: number;
  onTestCount: number;
  conversionRate: number;
  contractsCount: number;
}

export interface MonthlyData {
  month: string;
  monthKey: string;
  newTests: number;
  contracts: number;
  completed: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface TopSeller {
  id: string;
  name: string;
  codePrefix: string | null;
  totalCycles: number;
  contracts: number;
  onTest: number;
}

export interface ExpiringTest {
  cycleId: string;
  qrCode: string;
  companyName: string | null;
  daysRemaining: number;
  salespersonName: string;
}

// Raw query result type for expiring tests
interface ExpiringTestQueryResult {
  id: string;
  test_start_date: string | null;
  qr_codes: { code: string } | null;
  companies: { name: string } | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
}

// KPI podatki
export function useKPIData() {
  return useQuery({
    queryKey: ['analytics-kpi'],
    queryFn: async (): Promise<KPIData> => {
      // Aktivni cikli (vse razen completed)
      const { count: activeCycles } = await supabase
        .from('cycles')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');

      // Na testu
      const { count: onTestCount } = await supabase
        .from('cycles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'on_test');

      // Konverzija (zadnjih 90 dni)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: recentCycles } = await supabase
        .from('cycles')
        .select('id, contract_signed')
        .gte('created_at', ninetyDaysAgo.toISOString());

      const totalRecent = recentCycles?.length || 0;
      const contractsSigned = recentCycles?.filter(c => c.contract_signed).length || 0;
      const conversionRate = totalRecent > 0 ? Math.round((contractsSigned / totalRecent) * 100) : 0;

      // Skupaj pogodb (s podpisano pogodbo)
      const { count: contractsCount } = await supabase
        .from('cycles')
        .select('*', { count: 'exact', head: true })
        .eq('contract_signed', true);

      return {
        activeCycles: activeCycles || 0,
        onTestCount: onTestCount || 0,
        conversionRate,
        contractsCount: contractsCount || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minut cache
  });
}

// Mesečni podatki za graf (zadnjih 12 mesecev)
export function useMonthlyData(salespersonId?: string | null) {
  return useQuery({
    queryKey: ['analytics-monthly', salespersonId],
    queryFn: async (): Promise<MonthlyData[]> => {
      const months: MonthlyData[] = [];
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        // Novi testi v mesecu
        let newTestsQuery = supabase
          .from('cycles')
          .select('*', { count: 'exact', head: true })
          .gte('test_start_date', monthStart.toISOString())
          .lte('test_start_date', monthEnd.toISOString());

        if (salespersonId) {
          newTestsQuery = newTestsQuery.eq('salesperson_id', salespersonId);
        }
        const { count: newTests } = await newTestsQuery;

        // Podpisane pogodbe v mesecu
        let contractsQuery = supabase
          .from('cycles')
          .select('*', { count: 'exact', head: true })
          .eq('contract_signed', true)
          .gte('contract_signed_at', monthStart.toISOString())
          .lte('contract_signed_at', monthEnd.toISOString());

        if (salespersonId) {
          contractsQuery = contractsQuery.eq('salesperson_id', salespersonId);
        }
        const { count: contracts } = await contractsQuery;

        // Zaključeni cikli v mesecu
        let completedQuery = supabase
          .from('cycles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('updated_at', monthStart.toISOString())
          .lte('updated_at', monthEnd.toISOString());

        if (salespersonId) {
          completedQuery = completedQuery.eq('salesperson_id', salespersonId);
        }
        const { count: completed } = await completedQuery;

        months.push({
          month: format(monthDate, 'MMM', { locale: sl }),
          monthKey: format(monthDate, 'yyyy-MM'),
          newTests: newTests || 0,
          contracts: contracts || 0,
          completed: completed || 0,
        });
      }

      return months;
    },
    staleTime: 1000 * 60 * 10, // 10 minut cache
  });
}

// Distribucija statusov za pie chart
export function useStatusDistribution() {
  return useQuery({
    queryKey: ['analytics-status-distribution'],
    queryFn: async (): Promise<StatusDistribution[]> => {
      const { data } = await supabase
        .from('cycles')
        .select('status')
        .neq('status', 'completed');

      const counts = {
        on_test: 0,
        clean: 0,
        dirty: 0,
        waiting_driver: 0,
      };

      data?.forEach(cycle => {
        if (cycle.status in counts) {
          counts[cycle.status as keyof typeof counts]++;
        }
      });

      return [
        { name: 'Na testu', value: counts.on_test, color: '#3B82F6' },
        { name: 'Čisti', value: counts.clean, color: '#22C55E' },
        { name: 'Umazani', value: counts.dirty, color: '#F59E0B' },
        { name: 'Čaka šoferja', value: counts.waiting_driver, color: '#8B5CF6' },
      ].filter(item => item.value > 0);
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Top prodajalci
export function useTopSellers(limit: number = 10) {
  return useQuery({
    queryKey: ['analytics-top-sellers', limit],
    queryFn: async (): Promise<TopSeller[]> => {
      // Pridobi vse prodajalce
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, code_prefix')
        .eq('role', 'prodajalec')
        .eq('is_active', true);

      if (!sellers) return [];

      // Za vsakega prodajalca izračunaj statistiko
      const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
          const { data: cycles } = await supabase
            .from('cycles')
            .select('id, status, contract_signed')
            .eq('salesperson_id', seller.id);

          const totalCycles = cycles?.length || 0;
          const contracts = cycles?.filter(c => c.contract_signed).length || 0;
          const onTest = cycles?.filter(c => c.status === 'on_test').length || 0;

          return {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            codePrefix: seller.code_prefix,
            totalCycles,
            contracts,
            onTest,
          };
        })
      );

      // Sortiraj po pogodbah in vrni top N
      return sellersWithStats
        .sort((a, b) => b.contracts - a.contracts)
        .slice(0, limit);
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Testi ki potečejo kmalu (v naslednjih 3 dneh) ali so že potekli
export function useExpiringTests() {
  return useQuery({
    queryKey: ['analytics-expiring-tests'],
    queryFn: async (): Promise<ExpiringTest[]> => {
      const now = new Date();
      const testDuration = 7; // dni

      const { data: cycles } = await supabase
        .from('cycles')
        .select(`
          id,
          test_start_date,
          qr_codes!inner(code),
          companies(name),
          profiles!cycles_salesperson_id_fkey(first_name, last_name)
        `)
        .eq('status', 'on_test')
        .not('test_start_date', 'is', null);

      if (!cycles) return [];

      const expiringTests: ExpiringTest[] = [];

      cycles.forEach((cycle: ExpiringTestQueryResult) => {
        if (!cycle.test_start_date) return;

        const testStart = new Date(cycle.test_start_date);
        const testEnd = new Date(testStart);
        testEnd.setDate(testEnd.getDate() + testDuration);

        const daysRemaining = Math.ceil((testEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Samo tisti ki potečejo v naslednjih 3 dneh ali so že potekli
        if (daysRemaining <= 3) {
          expiringTests.push({
            cycleId: cycle.id,
            qrCode: cycle.qr_codes?.code || '',
            companyName: cycle.companies?.name || null,
            daysRemaining,
            salespersonName: cycle.profiles
              ? `${cycle.profiles.first_name} ${cycle.profiles.last_name}`
              : 'Neznan',
          });
        }
      });

      // Sortiraj po dnevih (najprej tisti ki prej potečejo)
      return expiringTests.sort((a, b) => a.daysRemaining - b.daysRemaining);
    },
    staleTime: 1000 * 60 * 5,
  });
}

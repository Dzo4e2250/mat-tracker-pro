import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

// Query result types for useSalespersonActivities
interface ContactQueryResult {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  companies: { name: string } | null;
}

interface NoteQueryResult {
  id: string;
  content: string;
  created_at: string;
  companies: { name: string } | null;
}

interface OfferQueryResult {
  id: string;
  subject: string;
  offer_type: string | null;
  sent_at: string;
  companies: { name: string } | null;
}

interface HistoryQueryResult {
  id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  performed_at: string;
  cycles: { companies: { name: string } | null } | null;
}

// Types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface ActivityStats {
  totalContacts: number;
  totalNotes: number;
  totalOffersSent: number;
  totalStatusChanges: number;
  totalCompanies: number;
  totalKmTraveled: number;
}

export interface SalespersonSummary {
  id: string;
  name: string;
  codePrefix: string | null;
  contacts: number;
  notes: number;
  offers: number;
  statusChanges: number;
  companies: number;
  km: number;
  lastActivity: string | null;
}

export interface ActivityEvent {
  id: string;
  type: 'contact' | 'note' | 'offer' | 'status_change' | 'company';
  description: string;
  timestamp: string;
  companyName?: string;
  metadata?: Record<string, unknown>;
}

export interface DailyActivity {
  date: string;
  contacts: number;
  notes: number;
  offers: number;
  statusChanges: number;
}

// Helper to get ISO date strings for range
function getDateRangeStrings(dateRange: DateRange) {
  const fromStr = startOfDay(dateRange.from).toISOString();
  const toStr = endOfDay(dateRange.to).toISOString();
  return { fromStr, toStr };
}

// KPI stats for a period (optionally for a single salesperson)
export function useActivityStats(dateRange: DateRange, salespersonId?: string) {
  return useQuery({
    queryKey: ['activity-stats', dateRange.from.toISOString(), dateRange.to.toISOString(), salespersonId],
    queryFn: async (): Promise<ActivityStats> => {
      const { fromStr, toStr } = getDateRangeStrings(dateRange);

      // Contacts created
      let contactsQuery = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromStr)
        .lte('created_at', toStr);
      if (salespersonId) {
        contactsQuery = contactsQuery.eq('created_by', salespersonId);
      }
      const { count: contactsCount } = await contactsQuery;

      // Notes added
      let notesQuery = supabase
        .from('company_notes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromStr)
        .lte('created_at', toStr);
      if (salespersonId) {
        notesQuery = notesQuery.eq('created_by', salespersonId);
      }
      const { count: notesCount } = await notesQuery;

      // Offers sent
      let offersQuery = supabase
        .from('sent_emails')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', fromStr)
        .lte('sent_at', toStr);
      if (salespersonId) {
        offersQuery = offersQuery.eq('created_by', salespersonId);
      }
      const { count: offersCount } = await offersQuery;

      // Status changes
      let historyQuery = supabase
        .from('cycle_history')
        .select('*', { count: 'exact', head: true })
        .gte('performed_at', fromStr)
        .lte('performed_at', toStr);
      if (salespersonId) {
        historyQuery = historyQuery.eq('performed_by', salespersonId);
      }
      const { count: historyCount } = await historyQuery;

      // Companies created
      let companiesQuery = supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromStr)
        .lte('created_at', toStr);
      if (salespersonId) {
        companiesQuery = companiesQuery.eq('created_by', salespersonId);
      }
      const { count: companiesCount } = await companiesQuery;

      // Total km traveled
      let kmQuery = supabase
        .from('gps_tracking_sessions')
        .select('total_km')
        .gte('started_at', fromStr)
        .lte('started_at', toStr)
        .not('total_km', 'is', null);
      if (salespersonId) {
        kmQuery = kmQuery.eq('salesperson_id', salespersonId);
      }
      const { data: kmData } = await kmQuery;
      const totalKm = kmData?.reduce((sum, s) => sum + (s.total_km || 0), 0) || 0;

      return {
        totalContacts: contactsCount || 0,
        totalNotes: notesCount || 0,
        totalOffersSent: offersCount || 0,
        totalStatusChanges: historyCount || 0,
        totalCompanies: companiesCount || 0,
        totalKmTraveled: Math.round(totalKm * 10) / 10,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
}

// Summary for all salespeople
export function useSalespersonSummaries(dateRange: DateRange) {
  return useQuery({
    queryKey: ['salesperson-summaries', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<SalespersonSummary[]> => {
      const { fromStr, toStr } = getDateRangeStrings(dateRange);

      // Get all active salespeople (including those with secondary_role = prodajalec)
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, code_prefix, role, secondary_role')
        .eq('is_active', true)
        .or('role.eq.prodajalec,secondary_role.eq.prodajalec');

      if (!sellers) return [];

      // Fetch all data in parallel for efficiency
      const [
        { data: allContacts },
        { data: allNotes },
        { data: allOffers },
        { data: allHistory },
        { data: allCompanies },
        { data: allKm },
      ] = await Promise.all([
        supabase
          .from('contacts')
          .select('created_by, created_at')
          .gte('created_at', fromStr)
          .lte('created_at', toStr),
        supabase
          .from('company_notes')
          .select('created_by, created_at')
          .gte('created_at', fromStr)
          .lte('created_at', toStr),
        supabase
          .from('sent_emails')
          .select('created_by, sent_at')
          .gte('sent_at', fromStr)
          .lte('sent_at', toStr),
        supabase
          .from('cycle_history')
          .select('performed_by, performed_at')
          .gte('performed_at', fromStr)
          .lte('performed_at', toStr),
        supabase
          .from('companies')
          .select('created_by, created_at')
          .gte('created_at', fromStr)
          .lte('created_at', toStr),
        supabase
          .from('gps_tracking_sessions')
          .select('salesperson_id, total_km, started_at')
          .gte('started_at', fromStr)
          .lte('started_at', toStr)
          .not('total_km', 'is', null),
      ]);

      // Build summaries
      const summaries: SalespersonSummary[] = sellers.map((seller) => {
        const contacts = allContacts?.filter((c) => c.created_by === seller.id).length || 0;
        const notes = allNotes?.filter((n) => n.created_by === seller.id).length || 0;
        const offers = allOffers?.filter((o) => o.created_by === seller.id).length || 0;
        const statusChanges = allHistory?.filter((h) => h.performed_by === seller.id).length || 0;
        const companies = allCompanies?.filter((c) => c.created_by === seller.id).length || 0;
        const km = allKm
          ?.filter((k) => k.salesperson_id === seller.id)
          .reduce((sum, k) => sum + (k.total_km || 0), 0) || 0;

        // Find last activity
        const allDates: string[] = [
          ...(allContacts?.filter((c) => c.created_by === seller.id).map((c) => c.created_at) || []),
          ...(allNotes?.filter((n) => n.created_by === seller.id).map((n) => n.created_at) || []),
          ...(allOffers?.filter((o) => o.created_by === seller.id).map((o) => o.sent_at) || []),
          ...(allHistory?.filter((h) => h.performed_by === seller.id).map((h) => h.performed_at) || []),
          ...(allCompanies?.filter((c) => c.created_by === seller.id).map((c) => c.created_at) || []),
        ];

        const lastActivity = allDates.length > 0
          ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null;

        return {
          id: seller.id,
          name: `${seller.first_name} ${seller.last_name}`,
          codePrefix: seller.code_prefix,
          contacts,
          notes,
          offers,
          statusChanges,
          companies,
          km: Math.round(km * 10) / 10,
          lastActivity,
        };
      });

      // Sort by total activity (sum of all metrics except km)
      return summaries.sort((a, b) => {
        const totalA = a.contacts + a.notes + a.offers + a.statusChanges + a.companies;
        const totalB = b.contacts + b.notes + b.offers + b.statusChanges + b.companies;
        return totalB - totalA;
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Daily trends for chart
export function useDailyActivityTrends(dateRange: DateRange, salespersonId?: string) {
  return useQuery({
    queryKey: ['daily-activity-trends', dateRange.from.toISOString(), dateRange.to.toISOString(), salespersonId],
    queryFn: async (): Promise<DailyActivity[]> => {
      const { fromStr, toStr } = getDateRangeStrings(dateRange);

      // Fetch all data
      const [
        { data: allContacts },
        { data: allNotes },
        { data: allOffers },
        { data: allHistory },
      ] = await Promise.all([
        supabase
          .from('contacts')
          .select('created_by, created_at')
          .gte('created_at', fromStr)
          .lte('created_at', toStr)
          .then(({ data }) => ({
            data: salespersonId ? data?.filter((c) => c.created_by === salespersonId) : data,
          })),
        supabase
          .from('company_notes')
          .select('created_by, created_at')
          .gte('created_at', fromStr)
          .lte('created_at', toStr)
          .then(({ data }) => ({
            data: salespersonId ? data?.filter((n) => n.created_by === salespersonId) : data,
          })),
        supabase
          .from('sent_emails')
          .select('created_by, sent_at')
          .gte('sent_at', fromStr)
          .lte('sent_at', toStr)
          .then(({ data }) => ({
            data: salespersonId ? data?.filter((o) => o.created_by === salespersonId) : data,
          })),
        supabase
          .from('cycle_history')
          .select('performed_by, performed_at')
          .gte('performed_at', fromStr)
          .lte('performed_at', toStr)
          .then(({ data }) => ({
            data: salespersonId ? data?.filter((h) => h.performed_by === salespersonId) : data,
          })),
      ]);

      // Generate days in range
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

      return days.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd');

        const contactsOnDay = allContacts?.filter((c) =>
          c.created_at.startsWith(dayStr)
        ).length || 0;

        const notesOnDay = allNotes?.filter((n) =>
          n.created_at.startsWith(dayStr)
        ).length || 0;

        const offersOnDay = allOffers?.filter((o) =>
          o.sent_at.startsWith(dayStr)
        ).length || 0;

        const statusChangesOnDay = allHistory?.filter((h) =>
          h.performed_at.startsWith(dayStr)
        ).length || 0;

        return {
          date: dayStr,
          contacts: contactsOnDay,
          notes: notesOnDay,
          offers: offersOnDay,
          statusChanges: statusChangesOnDay,
        };
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Detailed activities for a single salesperson (timeline)
export function useSalespersonActivities(salespersonId: string, dateRange: DateRange, activityType?: string) {
  return useQuery({
    queryKey: ['salesperson-activities', salespersonId, dateRange.from.toISOString(), dateRange.to.toISOString(), activityType],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { fromStr, toStr } = getDateRangeStrings(dateRange);
      const events: ActivityEvent[] = [];

      // Contacts
      if (!activityType || activityType === 'contact') {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, created_at, companies(name)')
          .eq('created_by', salespersonId)
          .gte('created_at', fromStr)
          .lte('created_at', toStr);

        (contacts as ContactQueryResult[] | null)?.forEach((c) => {
          events.push({
            id: `contact-${c.id}`,
            type: 'contact',
            description: `Ustvarjen kontakt: ${c.first_name} ${c.last_name}`,
            timestamp: c.created_at,
            companyName: c.companies?.name,
          });
        });
      }

      // Notes
      if (!activityType || activityType === 'note') {
        const { data: notes } = await supabase
          .from('company_notes')
          .select('id, content, created_at, companies(name)')
          .eq('created_by', salespersonId)
          .gte('created_at', fromStr)
          .lte('created_at', toStr);

        (notes as NoteQueryResult[] | null)?.forEach((n) => {
          events.push({
            id: `note-${n.id}`,
            type: 'note',
            description: `Dodana opomba: ${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}`,
            timestamp: n.created_at,
            companyName: n.companies?.name,
          });
        });
      }

      // Offers
      if (!activityType || activityType === 'offer') {
        const { data: offers } = await supabase
          .from('sent_emails')
          .select('id, subject, offer_type, sent_at, companies(name)')
          .eq('created_by', salespersonId)
          .gte('sent_at', fromStr)
          .lte('sent_at', toStr);

        (offers as OfferQueryResult[] | null)?.forEach((o) => {
          const offerTypeLabel = o.offer_type === 'rental' ? 'najem' :
            o.offer_type === 'purchase' ? 'nakup' :
            o.offer_type === 'both' ? 'najem + nakup' : '';
          events.push({
            id: `offer-${o.id}`,
            type: 'offer',
            description: `Poslana ponudba (${offerTypeLabel}): ${o.subject}`,
            timestamp: o.sent_at,
            companyName: o.companies?.name,
          });
        });
      }

      // Status changes
      if (!activityType || activityType === 'status_change') {
        const { data: history } = await supabase
          .from('cycle_history')
          .select('id, action, old_status, new_status, performed_at, cycles(companies(name))')
          .eq('performed_by', salespersonId)
          .gte('performed_at', fromStr)
          .lte('performed_at', toStr);

        (history as HistoryQueryResult[] | null)?.forEach((h) => {
          const actionLabel = getActionLabel(h.action);
          events.push({
            id: `history-${h.id}`,
            type: 'status_change',
            description: actionLabel,
            timestamp: h.performed_at,
            companyName: h.cycles?.companies?.name,
            metadata: { action: h.action, oldStatus: h.old_status, newStatus: h.new_status },
          });
        });
      }

      // Companies created
      if (!activityType || activityType === 'company') {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, created_at')
          .eq('created_by', salespersonId)
          .gte('created_at', fromStr)
          .lte('created_at', toStr);

        companies?.forEach((c) => {
          events.push({
            id: `company-${c.id}`,
            type: 'company',
            description: `Ustvarjeno podjetje: ${c.name}`,
            timestamp: c.created_at,
            companyName: c.name,
          });
        });
      }

      // Sort by timestamp descending
      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!salespersonId,
  });
}

// Helper to get human-readable action labels
function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    created: 'Ustvarjen cikel',
    put_on_test: 'Predpražnik dan na test',
    status_change_to_on_test: 'Status spremenjen na "Na testu"',
    status_change_to_dirty: 'Status spremenjen na "Umazan"',
    status_change_to_waiting_driver: 'Status spremenjen na "Čaka šoferja"',
    status_change_to_clean: 'Status spremenjen na "Čist"',
    status_change_to_completed: 'Cikel zaključen',
    contract_signed: 'Pogodba podpisana',
    test_extended: 'Test podaljšan',
    test_extended_batch: 'Test podaljšan (skupinsko)',
    pickup_self: 'Pobrano sami',
    pickup_self_batch: 'Pobrano sami (skupinsko)',
  };
  return labels[action] || action;
}

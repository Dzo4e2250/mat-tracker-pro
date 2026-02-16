/**
 * @file useTravelLog.ts
 * @description Hook za upravljanje potnih nalogov z integracijo GPS podatkov
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  TravelLog,
  TravelLogInsert,
  TravelLogUpdate,
  TravelLogEntry,
  TravelLogEntryInsert,
  TravelLogEntryUpdate,
  TravelPurpose,
} from '@/integrations/supabase/types';
import { useGpsTrackingSessions, calculateTotalDistance } from './useGpsTracking';
import { generateRouteFromPoints, type GpsPoint } from '@/utils/slovenianCities';

// Helper to get days in month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Helper to format date as YYYY-MM-DD
export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Get travel log for specific month
export function useTravelLog(userId?: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ['travel_log', userId, year, month],
    queryFn: async () => {
      if (!userId || !year || !month) return null;

      const { data, error } = await supabase
        .from('travel_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found
          return null;
        }
        throw error;
      }

      return data as TravelLog;
    },
    enabled: !!userId && !!year && !!month,
  });
}

// Get previous month's ending odometer
export function usePreviousMonthEndingOdometer(userId?: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ['travel_log_prev_odometer', userId, year, month],
    queryFn: async () => {
      if (!userId || !year || !month) return null;

      // Calculate previous month
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      // Get previous month's travel log
      const { data: prevLog } = await supabase
        .from('travel_logs')
        .select('id, ending_odometer')
        .eq('user_id', userId)
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .single();

      if (prevLog?.ending_odometer) {
        return prevLog.ending_odometer;
      }

      // If no ending_odometer, get last entry's odometer
      if (prevLog?.id) {
        const { data: lastEntry } = await supabase
          .from('travel_log_entries')
          .select('odometer_reading')
          .eq('travel_log_id', prevLog.id)
          .order('entry_date', { ascending: false })
          .limit(1)
          .single();

        return lastEntry?.odometer_reading || null;
      }

      return null;
    },
    enabled: !!userId && !!year && !!month,
  });
}

// Get entries for a travel log
export function useTravelLogEntries(travelLogId?: string) {
  return useQuery({
    queryKey: ['travel_log_entries', travelLogId],
    queryFn: async () => {
      if (!travelLogId) return [];

      const { data, error } = await supabase
        .from('travel_log_entries')
        .select('*')
        .eq('travel_log_id', travelLogId)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      return data as TravelLogEntry[];
    },
    enabled: !!travelLogId,
  });
}

// Create travel log for a month
export function useCreateTravelLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TravelLogInsert) => {
      const { data: newLog, error } = await supabase
        .from('travel_logs')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return newLog as TravelLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['travel_log', data.user_id, data.year, data.month] });
    },
  });
}

// Update travel log
export function useUpdateTravelLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TravelLogUpdate }) => {
      const { error } = await supabase
        .from('travel_logs')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel_log'] });
    },
  });
}

// Upsert travel log entry (create or update)
export function useUpsertTravelLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TravelLogEntryInsert) => {
      // Try to find existing entry
      const { data: existing } = await supabase
        .from('travel_log_entries')
        .select('id')
        .eq('travel_log_id', data.travel_log_id)
        .eq('entry_date', data.entry_date)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('travel_log_entries')
          .update(data)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('travel_log_entries')
          .insert(data);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel_log_entries'] });
    },
  });
}

// Bulk upsert entries
export function useBulkUpsertEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: TravelLogEntryInsert[]) => {
      // Get existing entries for this travel log
      if (entries.length === 0) return;

      const travelLogId = entries[0].travel_log_id;

      const { data: existing } = await supabase
        .from('travel_log_entries')
        .select('id, entry_date')
        .eq('travel_log_id', travelLogId);

      const existingMap = new Map((existing || []).map(e => [e.entry_date, e.id]));

      // Separate updates and inserts
      const updates: { id: string; data: TravelLogEntryUpdate }[] = [];
      const inserts: TravelLogEntryInsert[] = [];

      for (const entry of entries) {
        const existingId = existingMap.get(entry.entry_date);
        if (existingId) {
          updates.push({ id: existingId, data: entry });
        } else {
          inserts.push(entry);
        }
      }

      // Perform updates
      for (const { id, data } of updates) {
        const { error } = await supabase
          .from('travel_log_entries')
          .update(data)
          .eq('id', id);
        if (error) throw error;
      }

      // Perform inserts
      if (inserts.length > 0) {
        const { error } = await supabase
          .from('travel_log_entries')
          .insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel_log_entries'] });
    },
  });
}

// Hook to get GPS data for a specific date
export function useGpsDataForDate(userId?: string, date?: string) {
  const { data: sessions } = useGpsTrackingSessions(userId, date);

  if (!sessions || sessions.length === 0) {
    return { totalKm: 0, sessions: [] };
  }

  const totalKm = sessions.reduce((sum, s) => {
    return sum + (s.total_km || calculateTotalDistance(s.points || []));
  }, 0);

  return { totalKm, sessions };
}

// GPS data za en dan
export interface DailyGpsData {
  km: number;
  route: string;
  points: GpsPoint[];
}

// Hook to get GPS data for entire month (with routes)
export function useMonthlyGpsData(userId?: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ['monthly_gps_data', userId, year, month],
    queryFn: async () => {
      if (!userId || !year || !month) return new Map<string, DailyGpsData>();

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${getDaysInMonth(year, month)}`;

      const { data, error } = await supabase
        .from('gps_tracking_sessions')
        .select('*')
        .eq('salesperson_id', userId)
        .gte('started_at', `${startDate}T00:00:00Z`)
        .lte('started_at', `${endDate}T23:59:59Z`)
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Group by date - collect km, points, and generate route
      const dataByDate = new Map<string, DailyGpsData>();

      for (const session of data || []) {
        const date = session.started_at.split('T')[0];
        const points: GpsPoint[] = typeof session.points === 'string'
          ? JSON.parse(session.points)
          : session.points || [];

        const km = session.total_km || calculateTotalDistance(points);

        const existing = dataByDate.get(date);
        if (existing) {
          // Združi podatke za isti dan
          existing.km += km;
          existing.points = [...existing.points, ...points];
        } else {
          dataByDate.set(date, {
            km,
            route: '',
            points: [...points],
          });
        }
      }

      // Generiraj relacije za vsak dan
      for (const [date, dayData] of dataByDate.entries()) {
        if (dayData.points.length > 0) {
          dayData.route = generateRouteFromPoints(dayData.points);
        }
      }

      return dataByDate;
    },
    enabled: !!userId && !!year && !!month,
  });
}

// Purpose labels in Slovenian
export const PURPOSE_LABELS: Record<TravelPurpose, string> = {
  teren: 'Teren',
  bolniska: 'Bolniška',
  dopust: 'Dopust',
  praznik: 'Praznik',
  od_doma: 'Od doma',
  prosto: 'Prosto',
};

// Calculate monthly statistics
export function calculateMonthlyStats(entries: TravelLogEntry[]) {
  let totalBusiness = 0;
  let totalPrivate = 0;
  let workDays = 0;
  let sickDays = 0;
  let vacationDays = 0;
  let holidayDays = 0;
  let homeOfficeDays = 0;

  for (const entry of entries) {
    totalBusiness += entry.km_business || 0;
    totalPrivate += entry.km_private || 0;

    switch (entry.purpose) {
      case 'teren':
        workDays++;
        break;
      case 'bolniska':
        sickDays++;
        break;
      case 'dopust':
        vacationDays++;
        break;
      case 'praznik':
        holidayDays++;
        break;
      case 'od_doma':
        homeOfficeDays++;
        break;
    }
  }

  return {
    totalBusiness,
    totalPrivate,
    totalKm: totalBusiness + totalPrivate,
    workDays,
    sickDays,
    vacationDays,
    holidayDays,
    homeOfficeDays,
  };
}

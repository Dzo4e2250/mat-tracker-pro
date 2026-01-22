import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GpsTrackingSession, GpsPoint } from '@/integrations/supabase/types';
import { useState, useEffect, useCallback, useRef } from 'react';

// Haversine formula to calculate distance between two GPS points in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate total distance from array of GPS points
export function calculateTotalDistance(points: GpsPoint[]): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return total;
}

// Fetch tracking sessions for a user
export function useGpsTrackingSessions(userId?: string, dateFilter?: string) {
  return useQuery({
    queryKey: ['gps_tracking_sessions', userId, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('gps_tracking_sessions')
        .select('*')
        .eq('salesperson_id', userId!)
        .order('started_at', { ascending: false });

      // Filter by date if provided
      if (dateFilter) {
        const startOfDay = `${dateFilter}T00:00:00Z`;
        const endOfDay = `${dateFilter}T23:59:59Z`;
        query = query
          .gte('started_at', startOfDay)
          .lte('started_at', endOfDay);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Parse JSONB points
      return (data as any[]).map(session => ({
        ...session,
        points: typeof session.points === 'string'
          ? JSON.parse(session.points)
          : session.points || []
      })) as GpsTrackingSession[];
    },
    enabled: !!userId,
  });
}

// Fetch active (not ended) session for a user
export function useActiveGpsSession(userId?: string) {
  return useQuery({
    queryKey: ['gps_tracking_sessions', 'active', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gps_tracking_sessions')
        .select('*')
        .eq('salesperson_id', userId!)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - no active session
          return null;
        }
        throw error;
      }

      return {
        ...data,
        points: typeof data.points === 'string'
          ? JSON.parse(data.points)
          : data.points || []
      } as GpsTrackingSession;
    },
    enabled: !!userId,
    refetchInterval: 5000, // Refetch every 5 seconds when tracking
  });
}

// Start a new tracking session
export function useStartTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('gps_tracking_sessions')
        .insert({
          salesperson_id: userId,
          points: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data as GpsTrackingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps_tracking_sessions'] });
    },
  });
}

// Stop tracking and calculate total km
export function useStopTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, points }: { sessionId: string; points: GpsPoint[] }) => {
      const totalKm = calculateTotalDistance(points);

      const { data, error } = await supabase
        .from('gps_tracking_sessions')
        .update({
          ended_at: new Date().toISOString(),
          total_km: totalKm,
          points: points,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as GpsTrackingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps_tracking_sessions'] });
    },
  });
}

// Save GPS point to session
export function useSaveGpsPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, points }: { sessionId: string; points: GpsPoint[] }) => {
      const { data, error } = await supabase
        .from('gps_tracking_sessions')
        .update({ points })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as GpsTrackingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps_tracking_sessions', 'active'] });
    },
  });
}

// Custom hook for GPS tracking with position watching
export function useGpsTracker(userId?: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const pointsRef = useRef<GpsPoint[]>([]);

  const startTracking = useStartTracking();
  const stopTracking = useStopTracking();
  const saveGpsPoint = useSaveGpsPoint();
  const { data: activeSession, refetch: refetchActive } = useActiveGpsSession(userId);

  // Keep ref in sync with state
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Restore active session on load
  useEffect(() => {
    if (activeSession && !isTracking) {
      setSessionId(activeSession.id);
      setPoints(activeSession.points || []);
      setIsTracking(true);
    }
  }, [activeSession]);

  const savePoints = useCallback(async (newPoints: GpsPoint[]) => {
    if (!sessionId || newPoints.length === 0) return;

    const now = Date.now();
    // Save every 30 seconds
    if (now - lastSaveTimeRef.current >= 30000) {
      lastSaveTimeRef.current = now;
      try {
        await saveGpsPoint.mutateAsync({ sessionId, points: newPoints });
      } catch (err) {
        console.error('Failed to save GPS points:', err);
      }
    }
  }, [sessionId, saveGpsPoint]);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolokacija ni podprta v tem brskalniku');
      return;
    }

    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition(position);

        const newPoint: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        setPoints(prev => {
          const updated = [...prev, newPoint];
          savePoints(updated);
          return updated;
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Dostop do lokacije je bil zavrnjen');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Lokacija ni na voljo');
            break;
          case err.TIMEOUT:
            setError('Zahteva za lokacijo je potekla');
            break;
          default:
            setError('Napaka pri pridobivanju lokacije');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 30000,
      }
    );
  }, [savePoints]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!userId) {
      setError('Uporabnik ni prijavljen');
      return;
    }

    try {
      const session = await startTracking.mutateAsync(userId);
      setSessionId(session.id);
      setPoints([]);
      setIsTracking(true);
      lastSaveTimeRef.current = Date.now();
      startWatch();
    } catch (err: any) {
      setError('Napaka pri zagonu sledenja: ' + err.message);
    }
  }, [userId, startTracking, startWatch]);

  const stop = useCallback(async () => {
    if (!sessionId) return;

    stopWatch();

    try {
      await stopTracking.mutateAsync({ sessionId, points: pointsRef.current });
      setSessionId(null);
      setPoints([]);
      setIsTracking(false);
      setCurrentPosition(null);
    } catch (err: any) {
      setError('Napaka pri ustavitvi sledenja: ' + err.message);
    }
  }, [sessionId, stopTracking, stopWatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatch();
    };
  }, [stopWatch]);

  // Start watching if we restored an active session
  useEffect(() => {
    if (isTracking && sessionId && watchIdRef.current === null) {
      startWatch();
    }
  }, [isTracking, sessionId, startWatch]);

  const currentDistance = calculateTotalDistance(points);

  return {
    isTracking,
    currentPosition,
    points,
    error,
    currentDistance,
    start,
    stop,
    isStarting: startTracking.isPending,
    isStopping: stopTracking.isPending,
  };
}

// Get daily statistics
export function useDailyGpsStats(userId?: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const { data: sessions } = useGpsTrackingSessions(userId, targetDate);

  if (!sessions) {
    return { totalKm: 0, totalSessions: 0, totalTime: 0 };
  }

  const totalKm = sessions.reduce((sum, s) => sum + (s.total_km || calculateTotalDistance(s.points || [])), 0);
  const totalSessions = sessions.length;

  // Calculate total time in minutes
  const totalTime = sessions.reduce((sum, s) => {
    if (!s.ended_at) return sum;
    const start = new Date(s.started_at).getTime();
    const end = new Date(s.ended_at).getTime();
    return sum + (end - start) / 60000;
  }, 0);

  return { totalKm, totalSessions, totalTime };
}

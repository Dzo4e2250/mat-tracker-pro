import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MapMarkerStatus = 'on_test' | 'contract_signed' | 'waiting_driver' | 'dirty' | 'completed';

export interface MapLocation {
  cycleId: string;
  qrCode: string;
  status: MapMarkerStatus;
  lat: number;
  lng: number;
  companyName: string;
  companyAddress: string;
  companyCity: string | null;
  contactName: string | null;
  contactPhone: string | null;
  matTypeName: string;
  salespersonId: string;
  salespersonName: string;
  testStartDate: string | null;
  testEndDate: string | null;
  contractSigned: boolean;
  daysOnTest: number;
}

export interface MapLocationGroup {
  lat: number;
  lng: number;
  locations: MapLocation[];
}

// Helper to determine the marker status
// PRIORITETA: contract_signed (zelena) > waiting_driver (vijolična) > dirty/completed > on_test
function getMarkerStatus(cycle: any): MapMarkerStatus {
  // Pogodba podpisana ima najvišjo prioriteto - zelena
  if (cycle.contract_signed) return 'contract_signed';
  if (cycle.status === 'waiting_driver') return 'waiting_driver';
  // dirty, completed, picked_up = neuspeli prospect (siva/rdeča)
  if (cycle.status === 'dirty' || cycle.status === 'completed' || cycle.status === 'picked_up') return 'completed';
  return 'on_test';
}

// Fetch all map locations with cycles
export function useMapLocations(filters?: {
  status?: MapMarkerStatus[];
  salespersonId?: string;
  includeDirty?: boolean; // Za inventar zemljevid - prikaže tudi pobrane predpražnike
}) {
  return useQuery({
    queryKey: ['map', 'locations', filters],
    queryFn: async (): Promise<MapLocation[]> => {
      let query = supabase
        .from('cycles')
        .select(`
          id,
          status,
          location_lat,
          location_lng,
          test_start_date,
          test_end_date,
          contract_signed,
          salesperson_id,
          qr_codes!inner(code),
          mat_types(code, name),
          companies(name, display_name, address_street, address_city),
          contacts(first_name, last_name, phone),
          profiles!cycles_salesperson_id_fkey(first_name, last_name)
        `)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null);

      // Določi katere statuse prikazati
      // POMEMBNO: contract_signed je ločeno boolean polje, ne del status enuma
      // Zato moramo uporabiti OR pogoj za vključitev podpisanih pogodb
      // includeDirty vključuje tudi completed/picked_up - to so neuspeli prospecti (potencialne stranke)
      const statusesToShow = filters?.includeDirty
        ? ['on_test', 'waiting_driver', 'dirty', 'completed', 'picked_up']
        : ['on_test', 'waiting_driver'];

      // Vključi cikle z ustreznim statusom ALI s podpisano pogodbo
      query = query.or(`status.in.(${statusesToShow.join(',')}),contract_signed.eq.true`);

      // Filter by salesperson if specified
      if (filters?.salespersonId) {
        query = query.eq('salesperson_id', filters.salespersonId);
      }

      const { data, error } = await query;

      if (error) {
        // Error handled
        throw error;
      }

      // Calculate days helper
      const now = new Date();
      const calcDays = (dateStr: string | null): number => {
        if (!dateStr) return 0;
        const date = new Date(dateStr);
        return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      };

      // Transform and filter
      let locations = (data || []).map((cycle: any) => ({
        cycleId: cycle.id,
        qrCode: cycle.qr_codes?.code || '',
        status: getMarkerStatus(cycle),
        lat: cycle.location_lat,
        lng: cycle.location_lng,
        companyName: cycle.companies?.display_name || cycle.companies?.name || 'Neznano podjetje',
        companyAddress: cycle.companies
          ? `${cycle.companies.address_street || ''}, ${cycle.companies.address_city || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
          : '',
        companyCity: cycle.companies?.address_city || null,
        contactName: cycle.contacts
          ? `${cycle.contacts.first_name || ''} ${cycle.contacts.last_name || ''}`.trim()
          : null,
        contactPhone: cycle.contacts?.phone || null,
        matTypeName: cycle.mat_types?.code || cycle.mat_types?.name || 'Neznano',
        salespersonId: cycle.salesperson_id,
        salespersonName: cycle.profiles
          ? `${cycle.profiles.first_name || ''} ${cycle.profiles.last_name || ''}`.trim()
          : 'Neznan',
        testStartDate: cycle.test_start_date,
        testEndDate: cycle.test_end_date,
        contractSigned: cycle.contract_signed || false,
        daysOnTest: calcDays(cycle.test_start_date),
      })) as MapLocation[];

      // Filter by status if specified
      if (filters?.status && filters.status.length > 0) {
        locations = locations.filter((loc) => filters.status!.includes(loc.status));
      }

      return locations;
    },
  });
}

// Group nearby locations for clustering
export function groupLocationsByProximity(
  locations: MapLocation[],
  threshold = 0.0001 // ~11 meters
): MapLocationGroup[] {
  const groups: MapLocationGroup[] = [];
  const used = new Set<string>();

  locations.forEach((loc) => {
    if (used.has(loc.cycleId)) return;

    const group: MapLocationGroup = {
      lat: loc.lat,
      lng: loc.lng,
      locations: [loc],
    };
    used.add(loc.cycleId);

    // Find nearby locations
    locations.forEach((other) => {
      if (used.has(other.cycleId)) return;
      const distance = Math.sqrt(
        Math.pow(loc.lat - other.lat, 2) + Math.pow(loc.lng - other.lng, 2)
      );
      if (distance < threshold) {
        group.locations.push(other);
        used.add(other.cycleId);
      }
    });

    // Calculate center of group
    if (group.locations.length > 1) {
      group.lat =
        group.locations.reduce((sum, l) => sum + l.lat, 0) /
        group.locations.length;
      group.lng =
        group.locations.reduce((sum, l) => sum + l.lng, 0) /
        group.locations.length;
    }

    groups.push(group);
  });

  return groups;
}

// Get color for marker based on status
export function getMarkerColor(status: MapMarkerStatus): string {
  switch (status) {
    case 'on_test':
      return '#3B82F6'; // Blue
    case 'contract_signed':
      return '#22C55E'; // Green
    case 'waiting_driver':
      return '#8B5CF6'; // Violet
    case 'completed':
      return '#EF4444'; // Red - neuspeli prospect
    default:
      return '#6B7280'; // Gray
  }
}

// Get status label in Slovenian
export function getStatusLabel(status: MapMarkerStatus): string {
  switch (status) {
    case 'on_test':
      return 'Na testu';
    case 'contract_signed':
      return 'Pogodba podpisana';
    case 'waiting_driver':
      return 'Čaka na prevzem';
    case 'completed':
      return 'Neuspeli prospect';
    default:
      return 'Neznan status';
  }
}

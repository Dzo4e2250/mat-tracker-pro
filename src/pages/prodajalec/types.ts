/**
 * Tipi za Prodajalec Dashboard
 */

import type { CycleWithRelations } from '@/hooks/useCycles';

export type ViewType = 'home' | 'scan' | 'map' | 'history' | 'statistics';

export interface QRCodeItem {
  id: string;
  code: string;
  owner_id: string | null;
  status?: string;
}

export interface MapLocation {
  lat: number;
  lng: number;
  cycle: CycleWithRelations;
}

export interface MapGroup {
  lat: number;
  lng: number;
  cycles: CycleWithRelations[];
}

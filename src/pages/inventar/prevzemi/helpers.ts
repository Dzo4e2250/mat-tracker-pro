/**
 * @file helpers.ts
 * @description Helper funkcije za Prevzemi stran
 */

import * as XLSX from 'xlsx';
import type { DriverPickup } from '@/hooks/useDriverPickups';

export interface HistoryStats {
  totalPickups: number;
  totalItems: number;
  avgDurationDays: number;
}

export function calculateHistoryStats(completedPickups: DriverPickup[]): HistoryStats | null {
  if (completedPickups.length === 0) return null;

  let totalItems = 0;
  let totalDurationMs = 0;
  let validDurations = 0;

  completedPickups.forEach(pickup => {
    totalItems += pickup.items.length;
    if (pickup.createdAt && pickup.completedAt) {
      const duration = new Date(pickup.completedAt).getTime() - new Date(pickup.createdAt).getTime();
      if (duration > 0) {
        totalDurationMs += duration;
        validDurations++;
      }
    }
  });

  const avgDurationMs = validDurations > 0 ? totalDurationMs / validDurations : 0;
  const avgDurationDays = Math.round(avgDurationMs / (1000 * 60 * 60 * 24) * 10) / 10;

  return {
    totalPickups: completedPickups.length,
    totalItems,
    avgDurationDays,
  };
}

export function exportHistoryToExcel(pickups: DriverPickup[]): number {
  const exportData: any[] = [];

  pickups.forEach(pickup => {
    pickup.items.forEach(item => {
      exportData.push({
        'ID Prevzema': pickup.id.slice(0, 8),
        'Datum ustvarjanja': pickup.createdAt
          ? new Date(pickup.createdAt).toLocaleDateString('sl-SI')
          : '-',
        'Datum zaključka': pickup.completedAt
          ? new Date(pickup.completedAt).toLocaleDateString('sl-SI')
          : '-',
        'QR Koda': item.qrCode,
        'Tip predpražnika': item.matTypeName,
        'Podjetje': item.companyName || '-',
        'Naslov': item.companyAddress || '-',
        'Kontakt': item.contactName || '-',
        'Telefon': item.contactPhone || '-',
        'Opombe': pickup.notes || '-',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Zgodovina prevzemov');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `zgodovina_prevzemov_${dateStr}.xlsx`);

  return exportData.length;
}

export function generateMapsUrlFromMats(
  mats: { cycleId: string; companyAddress?: string | null }[],
  selectedIds: Set<string>
): string | null {
  const selectedMats = mats.filter(mat => selectedIds.has(mat.cycleId));
  const addresses = selectedMats
    .filter(mat => mat.companyAddress)
    .map(mat => encodeURIComponent(mat.companyAddress!));
  return addresses.length > 0
    ? `https://www.google.com/maps/dir/${addresses.join('/')}`
    : null;
}

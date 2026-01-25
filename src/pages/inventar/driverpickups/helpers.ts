/**
 * @file helpers.ts
 * @description Helper funkcije za DriverPickups stran
 */

import { PickupStatus } from '@/hooks/useDriverPickups';

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getStatusConfig(status: PickupStatus) {
  switch (status) {
    case 'pending':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800',
        icon: 'clock',
        label: 'Čaka',
      };
    case 'in_progress':
      return {
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800',
        icon: 'play',
        label: 'V teku',
      };
    case 'completed':
      return {
        variant: 'secondary' as const,
        className: 'bg-green-100 text-green-800',
        icon: 'check',
        label: 'Zaključen',
      };
  }
}

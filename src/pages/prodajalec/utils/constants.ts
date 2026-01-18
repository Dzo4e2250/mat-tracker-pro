/**
 * Konstante za Prodajalec Dashboard
 */

export const STATUSES = {
  clean: { label: 'Čist', color: '#4CAF50', icon: '💚' },
  on_test: { label: 'Na testu', color: '#2196F3', icon: '🔵' },
  dirty: { label: 'Umazan', color: '#FF9800', icon: '🟠' },
  waiting_driver: { label: 'Čaka šoferja', color: '#9C27B0', icon: '📋' },
  completed: { label: 'Zaključeno', color: '#607D8B', icon: '✅' },
} as const;

export type StatusKey = keyof typeof STATUSES;

// Slovenia center coordinates
export const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
export const DEFAULT_ZOOM = 8;

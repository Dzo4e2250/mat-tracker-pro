import type { OptibrushPrice, CustomM2Price } from '@/hooks/usePrices';

export type TabType =
  | 'vse'
  | 'poslovni'
  | 'ergonomski'
  | 'zunanji'
  | 'design'
  | 'optibrush'
  | 'custom_m2';

export const TABS: { key: TabType; label: string }[] = [
  { key: 'vse', label: 'Vse cene' },
  { key: 'poslovni', label: 'MBW' },
  { key: 'ergonomski', label: 'ERM' },
  { key: 'zunanji', label: 'Zunanji' },
  { key: 'design', label: 'Design' },
  { key: 'optibrush', label: 'Optibrush' },
  { key: 'custom_m2', label: 'Custom m²' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  poslovni: 'MBW',
  ergonomski: 'ERM',
  zunanji: 'Zunanji',
  design: 'Design',
};

export const CATEGORY_COLORS: Record<string, string> = {
  MBW: 'bg-blue-100 text-blue-800',
  ERM: 'bg-green-100 text-green-800',
  Zunanji: 'bg-purple-100 text-purple-800',
  Design: 'bg-pink-100 text-pink-800',
};

export function getOptibrushLabel(p: OptibrushPrice): string {
  const parts: string[] = [];
  parts.push(p.has_edge ? 'Z robom' : 'Brez roba');
  parts.push(p.has_drainage ? 'z drenažnimi' : 'brez drenažnih');
  if (p.is_standard) parts.push('standard');
  else parts.push(p.is_large ? '>7.5m²' : '≤7.5m²');
  parts.push(p.color_count === '1' ? '1 barva' : '2-3 barve');
  return parts.join(', ');
}

export function getCustomM2Label(p: CustomM2Price): string {
  const size = p.size_category === 'small' ? '≤2 m²' : '>2 m²';
  const freq = `${p.frequency} ${p.frequency === '1' ? 'teden' : 'tedni'}`;
  return `${size}, ${freq}`;
}

export const MAT_PRICE_FIELDS = [
  'price_week_1',
  'price_week_2',
  'price_week_3',
  'price_week_4',
  'price_purchase',
] as const;

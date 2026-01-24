import { useState, useMemo } from 'react';
import { MapMarkerStatus } from '@/hooks/useMapLocations';

export const STATUS_OPTIONS: { value: MapMarkerStatus; label: string }[] = [
  { value: 'on_test', label: 'Na testu' },
  { value: 'contract_signed', label: 'Pogodba podpisana' },
  { value: 'waiting_driver', label: 'Čaka na prevzem' },
  { value: 'dirty', label: 'Neuspeli prospect' },
];

export function useMapFilters() {
  const [selectedStatuses, setSelectedStatuses] = useState<MapMarkerStatus[]>([
    'on_test',
    'contract_signed',
    'waiting_driver',
    'dirty',
  ]);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [minDaysOnTest, setMinDaysOnTest] = useState<number>(0);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  const toggleStatus = (status: MapMarkerStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const queryFilters = useMemo(
    () => ({
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      salespersonId: selectedSeller !== 'all' ? selectedSeller : undefined,
      includeDirty: selectedStatuses.includes('dirty'),
    }),
    [selectedStatuses, selectedSeller]
  );

  return {
    selectedStatuses,
    setSelectedStatuses,
    selectedSeller,
    setSelectedSeller,
    selectedCity,
    setSelectedCity,
    selectedDriver,
    setSelectedDriver,
    minDaysOnTest,
    setMinDaysOnTest,
    showOnlyOverdue,
    setShowOnlyOverdue,
    toggleStatus,
    queryFilters,
  };
}

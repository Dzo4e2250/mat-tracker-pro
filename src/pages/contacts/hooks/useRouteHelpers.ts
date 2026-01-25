/**
 * @file useRouteHelpers.ts
 * @description Hook za route planner funkcionalnost
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { getGoogleMapsUrl, getCompanyAddress } from '../utils';

interface UseRouteHelpersProps {
  filteredCompanies: CompanyWithContacts[];
  setShowRoutePlannerModal: (show: boolean) => void;
}

export function useRouteHelpers({
  filteredCompanies,
  setShowRoutePlannerModal,
}: UseRouteHelpersProps) {
  const { toast } = useToast();

  const openRoutePlannerModal = useCallback(() => {
    const companiesWithAddresses = filteredCompanies.filter(c => getCompanyAddress(c));
    if (companiesWithAddresses.length === 0) {
      toast({ description: 'Ni strank z naslovi', variant: 'destructive' });
      return;
    }
    setShowRoutePlannerModal(true);
  }, [filteredCompanies, setShowRoutePlannerModal, toast]);

  const openRouteWithCompanies = useCallback((selectedCompanies: CompanyWithContacts[]) => {
    if (!selectedCompanies || selectedCompanies.length === 0) {
      toast({ description: 'Ni izbranih strank', variant: 'destructive' });
      return;
    }

    if (selectedCompanies.length === 1) {
      window.open(getGoogleMapsUrl(selectedCompanies[0])!, '_blank');
      return;
    }

    const origin = encodeURIComponent(getCompanyAddress(selectedCompanies[0])!);
    const destination = encodeURIComponent(getCompanyAddress(selectedCompanies[selectedCompanies.length - 1])!);
    const waypoints = selectedCompanies
      .slice(1, -1)
      .map(c => encodeURIComponent(getCompanyAddress(c)!))
      .join('|');

    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    window.open(url, '_blank');
    toast({ description: `Odpiranje poti za ${selectedCompanies.length} strank` });
  }, [toast]);

  return {
    openRoutePlannerModal,
    openRouteWithCompanies,
  };
}

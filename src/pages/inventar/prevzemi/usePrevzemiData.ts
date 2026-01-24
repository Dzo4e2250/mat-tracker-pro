/**
 * @file usePrevzemiData.ts
 * @description Data hooks za Prevzemi stran - queries, mutations in computed data
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDirtyMatsByUser } from '@/hooks/useInventoryStats';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useDrivers } from '@/hooks/useDrivers';
import {
  useDriverPickups,
  useUpdatePickupStatus,
  useMarkItemPickedUp,
  useCompletePickup,
  useDeletePickup,
} from '@/hooks/useDriverPickups';
import { useToast } from '@/hooks/use-toast';

export type StatusFilter = 'all' | 'dirty' | 'waiting_driver';

interface CreatePickupParams {
  cycleIds: string[];
  driverName: string | null;
  scheduledDate: string;
  notes: string;
  createdBy: string | undefined;
}

export function usePrevzemiQueries() {
  const { data: sellers } = useProfilesByRole('prodajalec');
  const { data: drivers } = useDrivers();
  const { data: dirtyMats, isLoading: loadingDirty } = useDirtyMatsByUser();
  const { data: allPickups, isLoading: loadingPickups } = useDriverPickups();

  return {
    sellers,
    drivers,
    dirtyMats,
    allPickups,
    isLoading: loadingDirty || loadingPickups,
    loadingDirty,
    loadingPickups,
  };
}

export function usePrevzemiMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useUpdatePickupStatus();
  const markItemPickedUp = useMarkItemPickedUp();
  const completePickupMutation = useCompletePickup();
  const deletePickupMutation = useDeletePickup();

  const createPickup = useMutation({
    mutationFn: async ({ cycleIds, driverName, scheduledDate, notes, createdBy }: CreatePickupParams) => {
      const { data: pickup, error: pickupError } = await supabase
        .from('driver_pickups')
        .insert({
          status: 'pending',
          scheduled_date: scheduledDate || null,
          assigned_driver: driverName || null,
          notes: notes || null,
          created_by: createdBy,
        })
        .select()
        .single();
      if (pickupError) throw pickupError;

      const items = cycleIds.map(cycleId => ({ pickup_id: pickup.id, cycle_id: cycleId, picked_up: false }));
      const { error: itemsError } = await supabase.from('driver_pickup_items').insert(items);
      if (itemsError) throw itemsError;

      const { error: updateError } = await supabase
        .from('cycles')
        .update({ status: 'waiting_driver', pickup_requested_at: new Date().toISOString() })
        .in('id', cycleIds);
      if (updateError) throw updateError;

      return pickup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  const handleStartPickup = async (pickupId: string) => {
    try {
      await updateStatus.mutateAsync({ pickupId, status: 'in_progress' });
      toast({ title: 'Prevzem začet', description: 'Prevzem je bil označen kot v teku.' });
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    }
  };

  const handleCompletePickup = async (pickupId: string) => {
    try {
      await completePickupMutation.mutateAsync(pickupId);
      toast({ title: 'Prevzem zaključen', description: 'Prevzem je bil uspešno zaključen.' });
      return true;
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleDeletePickup = async (pickupId: string) => {
    try {
      await deletePickupMutation.mutateAsync(pickupId);
      toast({ title: 'Prevzem izbrisan', description: 'Prevzem je bil izbrisan.' });
      return true;
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const handleToggleItem = async (itemId: string, currentValue: boolean) => {
    try {
      await markItemPickedUp.mutateAsync({ itemId, pickedUp: !currentValue });
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    }
  };

  return {
    createPickup,
    updateStatus,
    markItemPickedUp,
    completePickup: completePickupMutation,
    deletePickup: deletePickupMutation,
    handleStartPickup,
    handleCompletePickup,
    handleDeletePickup,
    handleToggleItem,
  };
}

export function useFilteredData(
  dirtyMats: ReturnType<typeof useDirtyMatsByUser>['data'],
  allPickups: ReturnType<typeof useDriverPickups>['data'],
  selectedSeller: string,
  statusFilter: StatusFilter,
  historyDateFrom: string,
  historyDateTo: string
) {
  const activePickups = allPickups?.filter(p => p.status === 'pending' || p.status === 'in_progress') || [];
  const allCompletedPickups = allPickups?.filter(p => p.status === 'completed') || [];

  const filteredCompletedPickups = useMemo(() => {
    let filtered = allCompletedPickups;
    if (historyDateFrom) {
      const fromDate = new Date(historyDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => p.completedAt && new Date(p.completedAt) >= fromDate);
    }
    if (historyDateTo) {
      const toDate = new Date(historyDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => p.completedAt && new Date(p.completedAt) <= toDate);
    }
    return filtered;
  }, [allCompletedPickups, historyDateFrom, historyDateTo]);

  const filteredDirtyData = useMemo(() => {
    if (!dirtyMats) return [];
    return dirtyMats
      .filter(seller => selectedSeller === 'all' || seller.sellerId === selectedSeller)
      .map(seller => ({
        ...seller,
        mats: seller.mats.filter(mat => statusFilter === 'all' || mat.status === statusFilter),
      }))
      .filter(seller => seller.mats.length > 0);
  }, [dirtyMats, selectedSeller, statusFilter]);

  const allMats = useMemo(() => filteredDirtyData.flatMap(seller => seller.mats), [filteredDirtyData]);

  const totalCounts = useMemo(() => {
    if (!dirtyMats) return { dirty: 0, waitingDriver: 0, total: 0 };
    let dirty = 0, waitingDriver = 0;
    dirtyMats.forEach(seller => {
      seller.mats.forEach(mat => {
        if (mat.status === 'dirty') dirty++;
        if (mat.status === 'waiting_driver') waitingDriver++;
      });
    });
    return { dirty, waitingDriver, total: dirty + waitingDriver };
  }, [dirtyMats]);

  return {
    activePickups,
    allCompletedPickups,
    filteredCompletedPickups,
    filteredDirtyData,
    allMats,
    totalCounts,
  };
}

/**
 * @file DirtyMats.tsx
 * @description Stran za upravljanje umazanih predpražnikov
 */

import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Truck, RefreshCw } from 'lucide-react';
import { useDirtyMatsByUser } from '@/hooks/useInventoryStats';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SellerMatTable } from './prevzemi';
import { DirtyMatsStats, DirtyMatsFilters, CreatePickupDialog } from './dirtymats';

type StatusFilter = 'all' | 'dirty' | 'waiting_driver';

export default function DirtyMats() {
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMats, setSelectedMats] = useState<Set<string>>(new Set());
  const [isCreatePickupOpen, setIsCreatePickupOpen] = useState(false);
  const [pickupNotes, setPickupNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sellers } = useProfilesByRole('prodajalec');
  const { data: dirtyMats, isLoading, refetch } = useDirtyMatsByUser();

  // Filter mats based on selected criteria
  const filteredData = useMemo(() => {
    if (!dirtyMats) return [];
    return dirtyMats
      .filter((seller) => selectedSeller === 'all' || seller.sellerId === selectedSeller)
      .map((seller) => ({
        ...seller,
        mats: seller.mats.filter((mat) => statusFilter === 'all' || mat.status === statusFilter),
      }))
      .filter((seller) => seller.mats.length > 0);
  }, [dirtyMats, selectedSeller, statusFilter]);

  // Flatten all mats for selection
  const allMats = useMemo(() => filteredData.flatMap((seller) => seller.mats), [filteredData]);

  // Count totals
  const totalCounts = useMemo(() => {
    if (!dirtyMats) return { dirty: 0, waitingDriver: 0, total: 0 };
    let dirty = 0, waitingDriver = 0;
    dirtyMats.forEach((seller) => {
      seller.mats.forEach((mat) => {
        if (mat.status === 'dirty') dirty++;
        if (mat.status === 'waiting_driver') waitingDriver++;
      });
    });
    return { dirty, waitingDriver, total: dirty + waitingDriver };
  }, [dirtyMats]);

  const toggleMat = (cycleId: string) => {
    setSelectedMats((prev) => {
      const next = new Set(prev);
      next.has(cycleId) ? next.delete(cycleId) : next.add(cycleId);
      return next;
    });
  };

  const selectAll = () => setSelectedMats(new Set(allMats.map((mat) => mat.cycleId)));
  const clearSelection = () => setSelectedMats(new Set());

  const handleToggleAllSeller = (_: string, mats: { cycleId: string }[], checked: boolean) => {
    setSelectedMats((prev) => {
      const next = new Set(prev);
      mats.forEach((m) => (checked ? next.add(m.cycleId) : next.delete(m.cycleId)));
      return next;
    });
  };

  // Create driver pickup mutation
  const createPickup = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      const { data: pickup, error: pickupError } = await supabase
        .from('driver_pickups')
        .insert({
          status: 'pending',
          scheduled_date: scheduledDate || null,
          notes: pickupNotes || null,
          created_by: profile?.id,
        })
        .select()
        .single();
      if (pickupError) throw pickupError;

      const items = cycleIds.map((cycleId) => ({
        pickup_id: pickup.id,
        cycle_id: cycleId,
        picked_up: false,
      }));
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
      toast({ title: 'Prevzem ustvarjen', description: `Ustvarjen prevzem za ${selectedMats.size} predpražnikov.` });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dirty-mats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'by-user'] });
      setSelectedMats(new Set());
      setIsCreatePickupOpen(false);
      setPickupNotes('');
      setScheduledDate('');
    },
    onError: (error) => {
      toast({ title: 'Napaka', description: 'Napaka pri ustvarjanju prevzema: ' + error.message, variant: 'destructive' });
    },
  });

  // Generate Google Maps URL
  const mapsUrl = useMemo(() => {
    const selectedMatsList = allMats.filter((mat) => selectedMats.has(mat.cycleId));
    const addresses = selectedMatsList
      .filter((mat) => mat.companyAddress)
      .map((mat) => encodeURIComponent(mat.companyAddress!));
    if (addresses.length === 0) return null;
    return `https://www.google.com/maps/dir/${addresses.join('/')}`;
  }, [allMats, selectedMats]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Umazani predpražniki</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Osveži
            </Button>
          </div>

          <DirtyMatsStats
            dirty={totalCounts.dirty}
            waitingDriver={totalCounts.waitingDriver}
            total={totalCounts.total}
          />

          <DirtyMatsFilters
            selectedSeller={selectedSeller}
            onSellerChange={setSelectedSeller}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedCount={selectedMats.size}
            totalCount={allMats.length}
            sellers={sellers}
            mapsUrl={mapsUrl}
            onClearSelection={clearSelection}
            onSelectAll={selectAll}
            onCreatePickup={() => setIsCreatePickupOpen(true)}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Ni umazanih predpražnikov za prikaz.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredData.map((seller) => (
                <SellerMatTable
                  key={seller.sellerId}
                  seller={seller}
                  selectedMats={selectedMats}
                  onToggleMat={toggleMat}
                  onToggleAllSeller={handleToggleAllSeller}
                />
              ))}
            </div>
          )}

          <CreatePickupDialog
            isOpen={isCreatePickupOpen}
            onClose={() => setIsCreatePickupOpen(false)}
            selectedCount={selectedMats.size}
            scheduledDate={scheduledDate}
            onScheduledDateChange={setScheduledDate}
            notes={pickupNotes}
            onNotesChange={setPickupNotes}
            onSubmit={() => createPickup.mutate(Array.from(selectedMats))}
            isPending={createPickup.isPending}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

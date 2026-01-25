/**
 * @file DriverPickups.tsx
 * @description Stran za šoferjeve prevzeme
 */

import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Truck, RefreshCw, CheckCircle } from 'lucide-react';
import {
  useDriverPickups,
  useUpdatePickupStatus,
  useMarkItemPickedUp,
  useCompletePickup,
  useDeletePickup,
  generatePickupPDF,
  generateMapsUrl,
  DriverPickup,
} from '@/hooks/useDriverPickups';
import { useToast } from '@/hooks/use-toast';
import { DriverPickupStats, DriverPickupCard } from './driverpickups';

export default function DriverPickups() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [expandedPickups, setExpandedPickups] = useState<Set<string>>(new Set());
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { toast } = useToast();
  const { data: allPickups, isLoading, refetch } = useDriverPickups();

  const activePickups = allPickups?.filter(
    (p) => p.status === 'pending' || p.status === 'in_progress'
  ) || [];
  const completedPickups = allPickups?.filter(
    (p) => p.status === 'completed'
  ) || [];

  const updateStatus = useUpdatePickupStatus();
  const markItemPickedUp = useMarkItemPickedUp();
  const completePickup = useCompletePickup();
  const deletePickup = useDeletePickup();

  const toggleExpand = (pickupId: string) => {
    setExpandedPickups((prev) => {
      const next = new Set(prev);
      next.has(pickupId) ? next.delete(pickupId) : next.add(pickupId);
      return next;
    });
  };

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
      await completePickup.mutateAsync(pickupId);
      toast({ title: 'Prevzem zaključen', description: 'Prevzem je bil uspešno zaključen.' });
      setConfirmComplete(null);
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePickup = async (pickupId: string) => {
    try {
      await deletePickup.mutateAsync(pickupId);
      toast({ title: 'Prevzem izbrisan', description: 'Prevzem je bil izbrisan.' });
      setConfirmDelete(null);
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleItem = async (itemId: string, currentValue: boolean) => {
    try {
      await markItemPickedUp.mutateAsync({ itemId, pickedUp: !currentValue });
    } catch (error: any) {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    }
  };

  const handlePrint = (pickup: DriverPickup) => {
    const html = generatePickupPDF(pickup);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => { printWindow.print(); URL.revokeObjectURL(url); };
    }
  };

  const handleOpenMaps = (pickup: DriverPickup) => {
    const url = generateMapsUrl(pickup);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: 'Ni naslovov',
        description: 'Nobena lokacija nima naslova za prikaz na zemljevidu.',
        variant: 'destructive',
      });
    }
  };

  const renderPickup = (pickup: DriverPickup) => (
    <DriverPickupCard
      key={pickup.id}
      pickup={pickup}
      isExpanded={expandedPickups.has(pickup.id)}
      onToggleExpand={() => toggleExpand(pickup.id)}
      onStartPickup={() => handleStartPickup(pickup.id)}
      onCompletePickup={() => setConfirmComplete(pickup.id)}
      onDeletePickup={() => setConfirmDelete(pickup.id)}
      onToggleItem={handleToggleItem}
      onPrint={() => handlePrint(pickup)}
      onOpenMaps={() => handleOpenMaps(pickup)}
      isPending={{
        updateStatus: updateStatus.isPending,
        completePickup: completePickup.isPending,
        markItemPickedUp: markItemPickedUp.isPending,
      }}
    />
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Šoferjevi prevzemi</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Osveži
            </Button>
          </div>

          <DriverPickupStats
            pendingCount={activePickups.filter((p) => p.status === 'pending').length}
            inProgressCount={activePickups.filter((p) => p.status === 'in_progress').length}
            completedCount={completedPickups.length}
          />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="active">Aktivni ({activePickups.length})</TabsTrigger>
              <TabsTrigger value="completed">Zaključeni ({completedPickups.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : activePickups.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Ni aktivnih prevzemov.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Ustvari nov prevzem na strani "Umazani predpražniki".
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activePickups.map(renderPickup)
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : completedPickups.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Ni zaključenih prevzemov.</p>
                  </CardContent>
                </Card>
              ) : (
                completedPickups.map(renderPickup)
              )}
            </TabsContent>
          </Tabs>

          {/* Complete Confirmation Dialog */}
          <AlertDialog open={!!confirmComplete} onOpenChange={() => setConfirmComplete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Zaključi prevzem?</AlertDialogTitle>
                <AlertDialogDescription>
                  S tem boste označili prevzem kot zaključen. Vsi predpražniki
                  bodo označeni kot pobrani in njihov cikel bo zaključen. QR
                  kode bodo ponovno na voljo za uporabo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => confirmComplete && handleCompletePickup(confirmComplete)}
                  disabled={completePickup.isPending}
                >
                  {completePickup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Zaključi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Izbriši prevzem?</AlertDialogTitle>
                <AlertDialogDescription>
                  S tem boste izbrisali prevzem. Predpražniki bodo vrnjeni v
                  status "umazan" in jih bo treba ponovno dodati v prevzem.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => confirmDelete && handleDeletePickup(confirmDelete)}
                  disabled={deletePickup.isPending}
                >
                  {deletePickup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Izbriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </SidebarProvider>
  );
}

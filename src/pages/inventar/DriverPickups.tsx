import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Loader2,
  Truck,
  RefreshCw,
  Phone,
  MapPin,
  Printer,
  ExternalLink,
  CheckCircle,
  Clock,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useDriverPickups,
  useUpdatePickupStatus,
  useMarkItemPickedUp,
  useCompletePickup,
  useDeletePickup,
  generatePickupPDF,
  generateMapsUrl,
  DriverPickup,
  PickupStatus,
} from '@/hooks/useDriverPickups';
import { useToast } from '@/hooks/use-toast';

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
      if (next.has(pickupId)) {
        next.delete(pickupId);
      } else {
        next.add(pickupId);
      }
      return next;
    });
  };

  const handleStartPickup = async (pickupId: string) => {
    try {
      await updateStatus.mutateAsync({ pickupId, status: 'in_progress' });
      toast({
        title: 'Prevzem začet',
        description: 'Prevzem je bil označen kot v teku.',
      });
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompletePickup = async (pickupId: string) => {
    try {
      await completePickup.mutateAsync(pickupId);
      toast({
        title: 'Prevzem zaključen',
        description: 'Prevzem je bil uspešno zaključen.',
      });
      setConfirmComplete(null);
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePickup = async (pickupId: string) => {
    try {
      await deletePickup.mutateAsync(pickupId);
      toast({
        title: 'Prevzem izbrisan',
        description: 'Prevzem je bil izbrisan.',
      });
      setConfirmDelete(null);
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleItem = async (itemId: string, currentValue: boolean) => {
    try {
      await markItemPickedUp.mutateAsync({
        itemId,
        pickedUp: !currentValue,
      });
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePrint = (pickup: DriverPickup) => {
    const html = generatePickupPDF(pickup);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: PickupStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Čaka
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Play className="h-3 w-3 mr-1" />
            V teku
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Zaključen
          </Badge>
        );
    }
  };

  const renderPickupCard = (pickup: DriverPickup) => {
    const isExpanded = expandedPickups.has(pickup.id);
    const pickedUpCount = pickup.items.filter((i) => i.pickedUp).length;
    const totalCount = pickup.items.length;

    return (
      <Card key={pickup.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                Prevzem #{pickup.id.slice(0, 8)}
              </CardTitle>
              {getStatusBadge(pickup.status)}
            </div>
            <div className="flex items-center gap-2">
              {pickup.status !== 'completed' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMaps(pickup)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Pot
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(pickup)}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Natisni
                  </Button>
                  {pickup.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleStartPickup(pickup.id)}
                      disabled={updateStatus.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Začni
                    </Button>
                  )}
                  {pickup.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setConfirmComplete(pickup.id)}
                      disabled={completePickup.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Zaključi
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setConfirmDelete(pickup.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(pickup.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
            <span>
              <strong>Datum:</strong> {formatDate(pickup.scheduledDate)}
            </span>
            <span>
              <strong>Predpražniki:</strong> {pickedUpCount}/{totalCount} pobranih
            </span>
            {pickup.assignedDriver && (
              <span>
                <strong>Šofer:</strong> {pickup.assignedDriver}
              </span>
            )}
            {pickup.notes && (
              <span>
                <strong>Opombe:</strong> {pickup.notes}
              </span>
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {pickup.status !== 'completed' && 'Pobrano'}
                  </TableHead>
                  <TableHead>QR koda</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Podjetje / Naslov</TableHead>
                  <TableHead>Kontakt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickup.items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={item.pickedUp ? 'bg-green-50' : ''}
                  >
                    <TableCell>
                      {pickup.status !== 'completed' && (
                        <Checkbox
                          checked={item.pickedUp}
                          onCheckedChange={() =>
                            handleToggleItem(item.id, item.pickedUp)
                          }
                          disabled={markItemPickedUp.isPending}
                        />
                      )}
                      {pickup.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{item.qrCode}</TableCell>
                    <TableCell>{item.matTypeName}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.companyName || '-'}</div>
                      {item.companyAddress && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {item.companyAddress}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.contactName && (
                        <div className="text-sm">{item.contactName}</div>
                      )}
                      {item.contactPhone && (
                        <a
                          href={`tel:${item.contactPhone}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {item.contactPhone}
                        </a>
                      )}
                      {!item.contactName && !item.contactPhone && '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Šoferjevi prevzemi
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Osveži
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Čakajo na prevzem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">
                  {activePickups.filter((p) => p.status === 'pending').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">V teku</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {activePickups.filter((p) => p.status === 'in_progress').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Zaključeni (skupaj)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {completedPickups.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="active">
                Aktivni ({activePickups.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Zaključeni ({completedPickups.length})
              </TabsTrigger>
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
                activePickups.map(renderPickupCard)
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
                completedPickups.map(renderPickupCard)
              )}
            </TabsContent>
          </Tabs>

          {/* Complete Confirmation Dialog */}
          <AlertDialog
            open={!!confirmComplete}
            onOpenChange={() => setConfirmComplete(null)}
          >
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
                  {completePickup.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Zaključi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={!!confirmDelete}
            onOpenChange={() => setConfirmDelete(null)}
          >
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
                  {deletePickup.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
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

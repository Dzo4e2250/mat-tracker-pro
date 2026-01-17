import { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Truck,
  Filter,
  RefreshCw,
  Phone,
  MapPin,
  AlertTriangle,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useDirtyMatsByUser, DirtyMatInfo } from '@/hooks/useInventoryStats';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
      .filter((seller) => {
        if (selectedSeller !== 'all' && seller.sellerId !== selectedSeller) {
          return false;
        }
        return true;
      })
      .map((seller) => ({
        ...seller,
        mats: seller.mats.filter((mat) => {
          if (statusFilter !== 'all' && mat.status !== statusFilter) {
            return false;
          }
          return true;
        }),
      }))
      .filter((seller) => seller.mats.length > 0);
  }, [dirtyMats, selectedSeller, statusFilter]);

  // Flatten all mats for selection
  const allMats = useMemo(() => {
    return filteredData.flatMap((seller) => seller.mats);
  }, [filteredData]);

  // Count totals
  const totalCounts = useMemo(() => {
    if (!dirtyMats) return { dirty: 0, waitingDriver: 0, total: 0 };

    let dirty = 0;
    let waitingDriver = 0;

    dirtyMats.forEach((seller) => {
      seller.mats.forEach((mat) => {
        if (mat.status === 'dirty') dirty++;
        if (mat.status === 'waiting_driver') waitingDriver++;
      });
    });

    return { dirty, waitingDriver, total: dirty + waitingDriver };
  }, [dirtyMats]);

  // Toggle mat selection
  const toggleMat = (cycleId: string) => {
    setSelectedMats((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  // Select all visible mats
  const selectAll = () => {
    setSelectedMats(new Set(allMats.map((mat) => mat.cycleId)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedMats(new Set());
  };

  // Create driver pickup mutation
  const createPickup = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      // Create the pickup
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

      // Create pickup items
      const items = cycleIds.map((cycleId) => ({
        pickup_id: pickup.id,
        cycle_id: cycleId,
        picked_up: false,
      }));

      const { error: itemsError } = await supabase
        .from('driver_pickup_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update cycle statuses to waiting_driver
      const { error: updateError } = await supabase
        .from('cycles')
        .update({
          status: 'waiting_driver',
          pickup_requested_at: new Date().toISOString(),
        })
        .in('id', cycleIds);

      if (updateError) throw updateError;

      return pickup;
    },
    onSuccess: () => {
      toast({
        title: 'Prevzem ustvarjen',
        description: `Ustvarjen prevzem za ${selectedMats.size} predpražnikov.`,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dirty-mats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'by-user'] });
      setSelectedMats(new Set());
      setIsCreatePickupOpen(false);
      setPickupNotes('');
      setScheduledDate('');
    },
    onError: (error) => {
      toast({
        title: 'Napaka',
        description: 'Napaka pri ustvarjanju prevzema: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate Google Maps URL for selected mats
  const generateGoogleMapsUrl = () => {
    const selectedMatsList = allMats.filter((mat) => selectedMats.has(mat.cycleId));
    const addresses = selectedMatsList
      .filter((mat) => mat.companyAddress)
      .map((mat) => encodeURIComponent(mat.companyAddress!));

    if (addresses.length === 0) return null;

    return `https://www.google.com/maps/dir/${addresses.join('/')}`;
  };

  const mapsUrl = generateGoogleMapsUrl();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Umazani predpražniki
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

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Umazani</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  {totalCounts.dirty}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Čaka na prevzem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {totalCounts.waitingDriver}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Skupaj za obdelavo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalCounts.total}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and actions */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Filtri:</span>
                </div>

                <Select
                  value={selectedSeller}
                  onValueChange={setSelectedSeller}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Vsi prodajalci" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vsi prodajalci</SelectItem>
                    {sellers?.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.first_name} {seller.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Vsi statusi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vsi statusi</SelectItem>
                    <SelectItem value="dirty">Umazani</SelectItem>
                    <SelectItem value="waiting_driver">Čaka šoferja</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                {selectedMats.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Izbrano: {selectedMats.size}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Počisti
                    </Button>
                    {mapsUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(mapsUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Google Maps
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setIsCreatePickupOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ustvari prevzem
                    </Button>
                  </div>
                )}

                {selectedMats.size === 0 && allMats.length > 0 && (
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Izberi vse ({allMats.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mats table grouped by seller */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">
                  Ni umazanih predpražnikov za prikaz.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredData.map((seller) => (
                <Card key={seller.sellerId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {seller.sellerPrefix && (
                          <Badge variant="outline" className="font-mono">
                            {seller.sellerPrefix}
                          </Badge>
                        )}
                        <span>{seller.sellerName}</span>
                        {seller.mats.filter((m) => m.status === 'dirty')
                          .length >= 10 && (
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Opozorilo
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {seller.mats.length} predpražnikov
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={seller.mats.every((m) =>
                                selectedMats.has(m.cycleId)
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMats((prev) => {
                                    const next = new Set(prev);
                                    seller.mats.forEach((m) =>
                                      next.add(m.cycleId)
                                    );
                                    return next;
                                  });
                                } else {
                                  setSelectedMats((prev) => {
                                    const next = new Set(prev);
                                    seller.mats.forEach((m) =>
                                      next.delete(m.cycleId)
                                    );
                                    return next;
                                  });
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>QR koda</TableHead>
                          <TableHead>Tip</TableHead>
                          <TableHead>Podjetje</TableHead>
                          <TableHead>Naslov</TableHead>
                          <TableHead>Kontakt</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seller.mats.map((mat) => (
                          <TableRow key={mat.cycleId}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMats.has(mat.cycleId)}
                                onCheckedChange={() => toggleMat(mat.cycleId)}
                              />
                            </TableCell>
                            <TableCell className="font-mono">
                              {mat.qrCode}
                            </TableCell>
                            <TableCell>{mat.matTypeName}</TableCell>
                            <TableCell className="font-medium">
                              {mat.companyName || '-'}
                            </TableCell>
                            <TableCell>
                              {mat.companyAddress ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm">
                                    {mat.companyAddress}
                                  </span>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {mat.contactName ? (
                                <div className="space-y-1">
                                  <div className="text-sm">{mat.contactName}</div>
                                  {mat.contactPhone && (
                                    <a
                                      href={`tel:${mat.contactPhone}`}
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                      <Phone className="h-3 w-3" />
                                      {mat.contactPhone}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  mat.status === 'dirty'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className={
                                  mat.status === 'waiting_driver'
                                    ? 'bg-purple-100 text-purple-800'
                                    : ''
                                }
                              >
                                {mat.status === 'dirty'
                                  ? 'Umazan'
                                  : 'Čaka šoferja'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Pickup Dialog */}
          <Dialog open={isCreatePickupOpen} onOpenChange={setIsCreatePickupOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ustvari prevzem</DialogTitle>
                <DialogDescription>
                  Ustvari nov prevzem za {selectedMats.size} izbranih
                  predpražnikov.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Datum prevzema</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Opombe</Label>
                  <Textarea
                    id="notes"
                    placeholder="Dodatne opombe za šoferja..."
                    value={pickupNotes}
                    onChange={(e) => setPickupNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreatePickupOpen(false)}
                >
                  Prekliči
                </Button>
                <Button
                  onClick={() => createPickup.mutate(Array.from(selectedMats))}
                  disabled={createPickup.isPending}
                >
                  {createPickup.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Ustvari prevzem
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}

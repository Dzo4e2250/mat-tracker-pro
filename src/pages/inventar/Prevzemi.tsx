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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Truck,
  Phone,
  MapPin,
  AlertTriangle,
  Plus,
  ExternalLink,
  CheckCircle,
  Clock,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  Printer,
  Package,
  FileDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDirtyMatsByUser } from '@/hooks/useInventoryStats';
import { useProfilesByRole } from '@/hooks/useProfiles';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type StatusFilter = 'all' | 'dirty' | 'waiting_driver';

export default function Prevzemi() {
  const [activeTab, setActiveTab] = useState<'cakajo' | 'aktivni' | 'zakljuceni'>('cakajo');

  // Filter states
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMats, setSelectedMats] = useState<Set<string>>(new Set());

  // Dialog states
  const [isCreatePickupOpen, setIsCreatePickupOpen] = useState(false);
  const [pickupNotes, setPickupNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [expandedPickups, setExpandedPickups] = useState<Set<string>>(new Set());
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // History filters and pagination
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;

  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sellers } = useProfilesByRole('prodajalec');
  const { data: dirtyMats, isLoading: loadingDirty } = useDirtyMatsByUser();
  const { data: allPickups, isLoading: loadingPickups } = useDriverPickups();

  const activePickups = allPickups?.filter(p => p.status === 'pending' || p.status === 'in_progress') || [];
  const allCompletedPickups = allPickups?.filter(p => p.status === 'completed') || [];

  // Filter completed pickups by date
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

  // Pagination for completed pickups
  const totalHistoryPages = Math.ceil(filteredCompletedPickups.length / HISTORY_PAGE_SIZE);
  const paginatedCompletedPickups = filteredCompletedPickups.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  // History statistics
  const historyStats = useMemo(() => {
    if (allCompletedPickups.length === 0) return null;

    let totalItems = 0;
    let totalDurationMs = 0;
    let validDurations = 0;

    allCompletedPickups.forEach(pickup => {
      totalItems += pickup.items.length;
      if (pickup.createdAt && pickup.completedAt) {
        const duration = new Date(pickup.completedAt).getTime() - new Date(pickup.createdAt).getTime();
        if (duration > 0) {
          totalDurationMs += duration;
          validDurations++;
        }
      }
    });

    const avgDurationMs = validDurations > 0 ? totalDurationMs / validDurations : 0;
    const avgDurationDays = Math.round(avgDurationMs / (1000 * 60 * 60 * 24) * 10) / 10;

    return {
      totalPickups: allCompletedPickups.length,
      totalItems,
      avgDurationDays,
    };
  }, [allCompletedPickups]);

  const updateStatus = useUpdatePickupStatus();
  const markItemPickedUp = useMarkItemPickedUp();
  const completePickup = useCompletePickup();
  const deletePickup = useDeletePickup();

  // Filter dirty mats
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

  // Counts
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

  // Selection handlers
  const toggleMat = (cycleId: string) => {
    setSelectedMats(prev => {
      const next = new Set(prev);
      next.has(cycleId) ? next.delete(cycleId) : next.add(cycleId);
      return next;
    });
  };

  const selectAll = () => setSelectedMats(new Set(allMats.map(mat => mat.cycleId)));
  const clearSelection = () => setSelectedMats(new Set());

  // Create pickup mutation
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
      toast({ title: 'Prevzem ustvarjen', description: `Ustvarjen prevzem za ${selectedMats.size} predpražnikov.` });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      setSelectedMats(new Set());
      setIsCreatePickupOpen(false);
      setPickupNotes('');
      setScheduledDate('');
      setActiveTab('aktivni');
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Pickup handlers
  const toggleExpand = (pickupId: string) => {
    setExpandedPickups(prev => {
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
    if (url) window.open(url, '_blank');
    else toast({ title: 'Ni naslovov', description: 'Nobena lokacija nima naslova.', variant: 'destructive' });
  };

  const generateMapsUrlFromSelection = () => {
    const selectedMatsList = allMats.filter(mat => selectedMats.has(mat.cycleId));
    const addresses = selectedMatsList.filter(mat => mat.companyAddress).map(mat => encodeURIComponent(mat.companyAddress!));
    return addresses.length > 0 ? `https://www.google.com/maps/dir/${addresses.join('/')}` : null;
  };

  // Export history to Excel
  const handleExportHistory = () => {
    if (filteredCompletedPickups.length === 0) {
      toast({ title: 'Ni podatkov', description: 'Ni zaključenih prevzemov za izvoz.', variant: 'destructive' });
      return;
    }

    const exportData: any[] = [];
    filteredCompletedPickups.forEach(pickup => {
      pickup.items.forEach(item => {
        exportData.push({
          'ID Prevzema': pickup.id.slice(0, 8),
          'Datum ustvarjanja': pickup.createdAt ? new Date(pickup.createdAt).toLocaleDateString('sl-SI') : '-',
          'Datum zaključka': pickup.completedAt ? new Date(pickup.completedAt).toLocaleDateString('sl-SI') : '-',
          'QR Koda': item.qrCode,
          'Tip predpražnika': item.matTypeName,
          'Podjetje': item.companyName || '-',
          'Naslov': item.companyAddress || '-',
          'Kontakt': item.contactName || '-',
          'Telefon': item.contactPhone || '-',
          'Opombe': pickup.notes || '-',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zgodovina prevzemov');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `zgodovina_prevzemov_${dateStr}.xlsx`);

    toast({ title: 'Izvoz uspešen', description: `Izvoženo ${exportData.length} zapisov.` });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadge = (status: PickupStatus) => {
    const configs = {
      pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Čaka' },
      in_progress: { className: 'bg-blue-100 text-blue-800', icon: Play, label: 'V teku' },
      completed: { className: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Zaključen' },
    };
    const config = configs[status];
    return (
      <Badge variant="secondary" className={config.className}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const renderPickupCard = (pickup: DriverPickup, showActions = true) => {
    const isExpanded = expandedPickups.has(pickup.id);
    const pickedUpCount = pickup.items.filter(i => i.pickedUp).length;

    return (
      <Card key={pickup.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Prevzem #{pickup.id.slice(0, 8)}</CardTitle>
              {getStatusBadge(pickup.status)}
            </div>
            <div className="flex items-center gap-2">
              {showActions && pickup.status !== 'completed' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleOpenMaps(pickup)}>
                    <ExternalLink className="h-4 w-4 mr-1" />Pot
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint(pickup)}>
                    <Printer className="h-4 w-4 mr-1" />Natisni
                  </Button>
                  {pickup.status === 'pending' && (
                    <Button size="sm" onClick={() => handleStartPickup(pickup.id)} disabled={updateStatus.isPending}>
                      <Play className="h-4 w-4 mr-1" />Začni
                    </Button>
                  )}
                  {pickup.status === 'in_progress' && (
                    <Button size="sm" onClick={() => setConfirmComplete(pickup.id)} disabled={completePickup.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" />Zaključi
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(pickup.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => toggleExpand(pickup.id)}>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
            <span><strong>Datum:</strong> {formatDate(pickup.scheduledDate)}</span>
            <span><strong>Predpražniki:</strong> {pickedUpCount}/{pickup.items.length}</span>
            {pickup.notes && <span><strong>Opombe:</strong> {pickup.notes}</span>}
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">{pickup.status !== 'completed' && 'Pobrano'}</TableHead>
                  <TableHead>QR koda</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Podjetje / Naslov</TableHead>
                  <TableHead>Kontakt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickup.items.map(item => (
                  <TableRow key={item.id} className={item.pickedUp ? 'bg-green-50' : ''}>
                    <TableCell>
                      {pickup.status !== 'completed' ? (
                        <Checkbox checked={item.pickedUp} onCheckedChange={() => handleToggleItem(item.id, item.pickedUp)} disabled={markItemPickedUp.isPending} />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{item.qrCode}</TableCell>
                    <TableCell>{item.matTypeName}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.companyName || '-'}</div>
                      {item.companyAddress && <div className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-3 w-3" />{item.companyAddress}</div>}
                    </TableCell>
                    <TableCell>
                      {item.contactName && <div className="text-sm">{item.contactName}</div>}
                      {item.contactPhone && <a href={`tel:${item.contactPhone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline"><Phone className="h-3 w-3" />{item.contactPhone}</a>}
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

  const isLoading = loadingDirty || loadingPickups;
  const mapsUrl = generateMapsUrlFromSelection();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Prevzemi</h1>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className={totalCounts.dirty > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Umazani</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${totalCounts.dirty > 0 ? 'text-red-600' : ''}`}>{totalCounts.dirty}</p>
              </CardContent>
            </Card>
            <Card className={totalCounts.waitingDriver > 0 ? 'border-purple-300 bg-purple-50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Čaka šoferja</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${totalCounts.waitingDriver > 0 ? 'text-purple-600' : ''}`}>{totalCounts.waitingDriver}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Aktivni prevzemi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{activePickups.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Zaključeni</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{allCompletedPickups.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="cakajo" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Za prevzem ({totalCounts.total})
              </TabsTrigger>
              <TabsTrigger value="aktivni" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Aktivni ({activePickups.length})
              </TabsTrigger>
              <TabsTrigger value="zakljuceni" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Zaključeni ({allCompletedPickups.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Za prevzem */}
            <TabsContent value="cakajo">
              {/* Filters */}
              <Card className="mb-4">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Vsi prodajalci" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Vsi prodajalci</SelectItem>
                        {sellers?.map(seller => <SelectItem key={seller.id} value={seller.id}>{seller.first_name} {seller.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Vsi statusi" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Vsi statusi</SelectItem>
                        <SelectItem value="dirty">Umazani</SelectItem>
                        <SelectItem value="waiting_driver">Čaka šoferja</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    {selectedMats.size > 0 ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Izbrano: {selectedMats.size}</Badge>
                        <Button variant="ghost" size="sm" onClick={clearSelection}>Počisti</Button>
                        {mapsUrl && <Button variant="outline" size="sm" onClick={() => window.open(mapsUrl, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Google Maps</Button>}
                        <Button size="sm" onClick={() => setIsCreatePickupOpen(true)}><Plus className="h-4 w-4 mr-2" />Ustvari prevzem</Button>
                      </div>
                    ) : allMats.length > 0 && (
                      <Button variant="outline" size="sm" onClick={selectAll}>Izberi vse ({allMats.length})</Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
              ) : filteredDirtyData.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" /><p className="text-gray-500">Ni predpražnikov za prevzem.</p></CardContent></Card>
              ) : (
                <div className="space-y-4">
                  {filteredDirtyData.map(seller => (
                    <Card key={seller.sellerId}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {seller.sellerPrefix && <Badge variant="outline" className="font-mono">{seller.sellerPrefix}</Badge>}
                            <span>{seller.sellerName}</span>
                            {seller.mats.filter(m => m.status === 'dirty').length >= 10 && (
                              <Badge variant="destructive" className="ml-2"><AlertTriangle className="h-3 w-3 mr-1" />Opozorilo</Badge>
                            )}
                          </div>
                          <Badge variant="secondary">{seller.mats.length} predpražnikov</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={seller.mats.every(m => selectedMats.has(m.cycleId))}
                                  onCheckedChange={(checked) => {
                                    setSelectedMats(prev => {
                                      const next = new Set(prev);
                                      seller.mats.forEach(m => checked ? next.add(m.cycleId) : next.delete(m.cycleId));
                                      return next;
                                    });
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
                            {seller.mats.map(mat => (
                              <TableRow key={mat.cycleId}>
                                <TableCell><Checkbox checked={selectedMats.has(mat.cycleId)} onCheckedChange={() => toggleMat(mat.cycleId)} /></TableCell>
                                <TableCell className="font-mono">{mat.qrCode}</TableCell>
                                <TableCell>{mat.matTypeName}</TableCell>
                                <TableCell className="font-medium">{mat.companyName || '-'}</TableCell>
                                <TableCell>{mat.companyAddress ? <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-gray-400" /><span className="text-sm">{mat.companyAddress}</span></div> : '-'}</TableCell>
                                <TableCell>
                                  {mat.contactName ? (
                                    <div className="space-y-1">
                                      <div className="text-sm">{mat.contactName}</div>
                                      {mat.contactPhone && <a href={`tel:${mat.contactPhone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Phone className="h-3 w-3" />{mat.contactPhone}</a>}
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={mat.status === 'dirty' ? 'destructive' : 'secondary'} className={mat.status === 'waiting_driver' ? 'bg-purple-100 text-purple-800' : ''}>
                                    {mat.status === 'dirty' ? 'Umazan' : 'Čaka šoferja'}
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
            </TabsContent>

            {/* Tab: Aktivni */}
            <TabsContent value="aktivni">
              {loadingPickups ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
              ) : activePickups.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">Ni aktivnih prevzemov.</p></CardContent></Card>
              ) : (
                activePickups.map(pickup => renderPickupCard(pickup))
              )}
            </TabsContent>

            {/* Tab: Zaključeni */}
            <TabsContent value="zakljuceni">
              {/* History Stats */}
              {historyStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Skupaj prevzemov</p>
                          <p className="text-2xl font-bold">{historyStats.totalPickups}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pobranih predpražnikov</p>
                          <p className="text-2xl font-bold">{historyStats.totalItems}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Povp. čas prevzema</p>
                          <p className="text-2xl font-bold">{historyStats.avgDurationDays} dni</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <Card className="mb-4">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Od:</span>
                      <Input
                        type="date"
                        value={historyDateFrom}
                        onChange={(e) => { setHistoryDateFrom(e.target.value); setHistoryPage(1); }}
                        className="w-40"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Do:</span>
                      <Input
                        type="date"
                        value={historyDateTo}
                        onChange={(e) => { setHistoryDateTo(e.target.value); setHistoryPage(1); }}
                        className="w-40"
                      />
                    </div>
                    {(historyDateFrom || historyDateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); setHistoryPage(1); }}
                      >
                        Počisti filter
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Badge variant="secondary">{filteredCompletedPickups.length} prevzemov</Badge>
                    <Button variant="outline" size="sm" onClick={handleExportHistory}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Izvozi Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {loadingPickups ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
              ) : filteredCompletedPickups.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" /><p className="text-gray-500">Ni zaključenih prevzemov.</p></CardContent></Card>
              ) : (
                <>
                  {paginatedCompletedPickups.map(pickup => renderPickupCard(pickup, false))}

                  {/* Pagination */}
                  {totalHistoryPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prejšnja
                      </Button>
                      <span className="text-sm text-gray-600">
                        Stran {historyPage} od {totalHistoryPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                        disabled={historyPage === totalHistoryPages}
                      >
                        Naslednja
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Create Pickup Dialog */}
          <Dialog open={isCreatePickupOpen} onOpenChange={setIsCreatePickupOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ustvari prevzem</DialogTitle>
                <DialogDescription>Ustvari nov prevzem za {selectedMats.size} izbranih predpražnikov.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Datum prevzema</Label>
                  <Input id="scheduled_date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Opombe</Label>
                  <Textarea id="notes" placeholder="Dodatne opombe za šoferja..." value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatePickupOpen(false)}>Prekliči</Button>
                <Button onClick={() => createPickup.mutate(Array.from(selectedMats))} disabled={createPickup.isPending}>
                  {createPickup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ustvari prevzem
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Complete Confirmation */}
          <AlertDialog open={!!confirmComplete} onOpenChange={() => setConfirmComplete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Zaključi prevzem?</AlertDialogTitle>
                <AlertDialogDescription>S tem boste označili prevzem kot zaključen. Vsi predpražniki bodo označeni kot pobrani in QR kode bodo ponovno na voljo.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmComplete && handleCompletePickup(confirmComplete)} disabled={completePickup.isPending}>
                  {completePickup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Zaključi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Izbriši prevzem?</AlertDialogTitle>
                <AlertDialogDescription>S tem boste izbrisali prevzem. Predpražniki bodo vrnjeni v status "umazan".</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => confirmDelete && handleDeletePickup(confirmDelete)} disabled={deletePickup.isPending}>
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

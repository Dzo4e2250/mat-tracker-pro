/**
 * @file Prevzemi.tsx
 * @description Stran za upravljanje prevzemov umazanih predpražnikov
 */

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
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Truck,
  Phone,
  MapPin,
  AlertTriangle,
  Plus,
  ExternalLink,
  CheckCircle,
  Package,
  FileDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { generatePickupPDF, generateMapsUrl, type DriverPickup } from '@/hooks/useDriverPickups';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  PickupCard,
  CreatePickupDialog,
  ConfirmDialog,
  calculateHistoryStats,
  exportHistoryToExcel,
  generateMapsUrlFromMats,
  usePrevzemiQueries,
  usePrevzemiMutations,
  useFilteredData,
  type StatusFilter,
} from './prevzemi';

const HISTORY_PAGE_SIZE = 10;

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
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [expandedPickups, setExpandedPickups] = useState<Set<string>>(new Set());
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // History filters and pagination
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');
  const [historyPage, setHistoryPage] = useState(1);

  const { profile } = useAuth();
  const { toast } = useToast();

  // Data queries
  const { sellers, drivers, dirtyMats, allPickups, isLoading, loadingPickups } = usePrevzemiQueries();

  // Mutations
  const {
    createPickup,
    updateStatus,
    markItemPickedUp,
    completePickup,
    deletePickup,
    handleStartPickup,
    handleCompletePickup,
    handleDeletePickup,
    handleToggleItem,
  } = usePrevzemiMutations();

  // Filtered data
  const {
    activePickups,
    allCompletedPickups,
    filteredCompletedPickups,
    filteredDirtyData,
    allMats,
    totalCounts,
  } = useFilteredData(dirtyMats, allPickups, selectedSeller, statusFilter, historyDateFrom, historyDateTo);

  // Pagination
  const totalHistoryPages = Math.ceil(filteredCompletedPickups.length / HISTORY_PAGE_SIZE);
  const paginatedCompletedPickups = filteredCompletedPickups.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  // History statistics
  const historyStats = useMemo(() => calculateHistoryStats(allCompletedPickups), [allCompletedPickups]);

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

  // Pickup handlers
  const toggleExpand = (pickupId: string) => {
    setExpandedPickups(prev => {
      const next = new Set(prev);
      next.has(pickupId) ? next.delete(pickupId) : next.add(pickupId);
      return next;
    });
  };

  const handleCreatePickup = () => {
    const driverName = selectedDriver ? drivers?.find(d => d.id === selectedDriver)?.name ?? null : null;
    createPickup.mutate(
      {
        cycleIds: Array.from(selectedMats),
        driverName,
        scheduledDate,
        notes: pickupNotes,
        createdBy: profile?.id,
      },
      {
        onSuccess: () => {
          toast({ title: 'Prevzem ustvarjen', description: `Ustvarjen prevzem za ${selectedMats.size} predpražnikov.` });
          setSelectedMats(new Set());
          setIsCreatePickupOpen(false);
          setPickupNotes('');
          setScheduledDate('');
          setSelectedDriver('');
          setActiveTab('aktivni');
        },
      }
    );
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

  const handleExportHistory = () => {
    if (filteredCompletedPickups.length === 0) {
      toast({ title: 'Ni podatkov', description: 'Ni zaključenih prevzemov za izvoz.', variant: 'destructive' });
      return;
    }
    const count = exportHistoryToExcel(filteredCompletedPickups);
    toast({ title: 'Izvoz uspešen', description: `Izvoženo ${count} zapisov.` });
  };

  const onCompletePickup = async (pickupId: string) => {
    const success = await handleCompletePickup(pickupId);
    if (success) setConfirmComplete(null);
  };

  const onDeletePickup = async (pickupId: string) => {
    const success = await handleDeletePickup(pickupId);
    if (success) setConfirmDelete(null);
  };

  const mapsUrl = generateMapsUrlFromMats(allMats, selectedMats);

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
                activePickups.map(pickup => (
                  <PickupCard
                    key={pickup.id}
                    pickup={pickup}
                    isExpanded={expandedPickups.has(pickup.id)}
                    showActions={true}
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
                ))
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
                  {paginatedCompletedPickups.map(pickup => (
                    <PickupCard
                      key={pickup.id}
                      pickup={pickup}
                      isExpanded={expandedPickups.has(pickup.id)}
                      showActions={false}
                      onToggleExpand={() => toggleExpand(pickup.id)}
                    />
                  ))}

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
          <CreatePickupDialog
            isOpen={isCreatePickupOpen}
            onClose={() => setIsCreatePickupOpen(false)}
            selectedCount={selectedMats.size}
            drivers={drivers}
            selectedDriver={selectedDriver}
            setSelectedDriver={setSelectedDriver}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            notes={pickupNotes}
            setNotes={setPickupNotes}
            onSubmit={handleCreatePickup}
            isPending={createPickup.isPending}
          />

          {/* Complete Confirmation */}
          <ConfirmDialog
            isOpen={!!confirmComplete}
            onClose={() => setConfirmComplete(null)}
            onConfirm={() => confirmComplete && onCompletePickup(confirmComplete)}
            isPending={completePickup.isPending}
            title="Zaključi prevzem?"
            description="S tem boste označili prevzem kot zaključen. Vsi predpražniki bodo označeni kot pobrani in QR kode bodo ponovno na voljo."
            confirmText="Zaključi"
          />

          {/* Delete Confirmation */}
          <ConfirmDialog
            isOpen={!!confirmDelete}
            onClose={() => setConfirmDelete(null)}
            onConfirm={() => confirmDelete && onDeletePickup(confirmDelete)}
            isPending={deletePickup.isPending}
            title="Izbriši prevzem?"
            description="S tem boste izbrisali prevzem. Predpražniki bodo vrnjeni v status 'umazan'."
            confirmText="Izbriši"
            variant="destructive"
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

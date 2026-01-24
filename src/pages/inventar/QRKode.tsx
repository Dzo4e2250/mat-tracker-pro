import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Plus, Loader2, QrCode, Search, Printer, RefreshCw, FileDown, X } from 'lucide-react';
import { useProdajalecProfiles } from '@/hooks/useProfiles';
import { QRCodeCanvas } from 'qrcode.react';

import {
  LABEL_PRESETS,
  type LabelPresetKey,
  useFreeCodes,
  useQRCodesWithCycles,
  useQRCodeMutations,
  type QRCodeWithCycle,
  getCodeStatus,
  calculateStats,
  exportToExcel,
  printCodesList,
  generateQRCodesPDF,
} from './qrcode';

export default function QRKode() {
  const [activeTab, setActiveTab] = useState<'dodaj' | 'pregled' | 'tiskanje'>('pregled');
  const { data: sellers = [], isLoading: loadingSellers } = useProdajalecProfiles();
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const { toast } = useToast();

  // State
  const [newCodeCount, setNewCodeCount] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [printOption, setPrintOption] = useState('all');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(50);
  const [qrPerRow, setQrPerRow] = useState(3);
  const [qrSize, setQrSize] = useState(128);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const [selectedLabelPreset, setSelectedLabelPreset] = useState<LabelPresetKey>('herma-8831');
  const qrRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);

  // Adjust QR size based on qrPerRow
  useEffect(() => {
    const baseSize = 512;
    const calculatedSize = Math.floor(baseSize / qrPerRow);
    setQrSize(Math.max(64, Math.min(256, calculatedSize)));
  }, [qrPerRow]);

  // Queries
  const { data: freeCodes = [], isLoading: loadingFreeCodes } = useFreeCodes(selectedSellerId);
  const { data: qrCodes = [], isLoading: loadingOverview, refetch: refetchOverview } = useQRCodesWithCycles(selectedSellerId);

  // Mutations
  const { createCodes, deleteCode } = useQRCodeMutations(selectedSellerId);

  // Stats
  const stats = useMemo(() => calculateStats(qrCodes), [qrCodes]);

  // Filtered codes
  const filteredCodes = qrCodes.filter((code) => {
    if (filterStatus === 'all') return true;
    return getCodeStatus(code) === filterStatus;
  });

  // Status badge helper
  const getStatusBadge = (code: QRCodeWithCycle) => {
    if (code.status === 'pending') return <Badge variant="secondary">Naročena</Badge>;
    if (code.status === 'available') return <Badge className="bg-green-500">Prosta</Badge>;
    if (code.active_cycle) {
      const cycleStatus = code.active_cycle.status;
      switch (cycleStatus) {
        case 'clean': return <Badge className="bg-blue-500">Čista</Badge>;
        case 'on_test': return <Badge className="bg-yellow-500">Na testu</Badge>;
        case 'dirty': return <Badge className="bg-orange-500">Umazana</Badge>;
        case 'waiting_driver': return <Badge className="bg-purple-500">Čaka prevzem</Badge>;
        default: return <Badge variant="outline">{cycleStatus}</Badge>;
      }
    }
    return <Badge variant="secondary">Aktivna</Badge>;
  };

  // Handlers
  const handleAddCodes = () => {
    if (!selectedSellerId || !selectedSeller?.code_prefix) {
      toast({ title: 'Napaka', description: 'Izberite prodajalca s predpono', variant: 'destructive' });
      return;
    }
    createCodes.mutate({ prefix: selectedSeller.code_prefix, count: newCodeCount, ownerId: selectedSellerId });
    setNewCodeCount(1);
  };

  const handleExportToExcel = () => {
    if (!selectedSeller) return;
    exportToExcel(filteredCodes, `${selectedSeller.first_name}_${selectedSeller.last_name}`);
    toast({ title: 'Uspeh', description: 'Excel datoteka prenesena' });
  };

  const handlePrintList = () => {
    if (!selectedSeller) return;
    printCodesList(filteredCodes, `${selectedSeller.first_name} ${selectedSeller.last_name}`, selectedSeller.code_prefix, stats);
  };

  // Print codes
  const getPrintQrCodes = () => {
    if (!selectedSeller?.code_prefix) return [];
    const allCodes = freeCodes.map((c) => c.code);
    if (printOption === 'all') return allCodes;
    if (printOption === 'range') {
      const result = [];
      for (let i = rangeStart; i <= rangeEnd; i++) {
        result.push(`${selectedSeller.code_prefix}-${String(i).padStart(3, '0')}`);
      }
      return result;
    }
    return allCodes;
  };

  const printCodes = getPrintQrCodes();

  const handleGeneratePDF = async () => {
    if (printCodes.length === 0) {
      sonnerToast.error('Ni QR kod za tiskanje');
      return;
    }

    setIsPrintLoading(true);
    try {
      sonnerToast.info('Pripravljam PDF...');
      await generateQRCodesPDF(printCodes, qrRefs.current, selectedLabelPreset, selectedSeller?.first_name || 'Export');
      sonnerToast.success('PDF uspešno generiran!');
    } catch (error) {
      // Error handled by toast
      sonnerToast.error('Napaka pri generiranju PDF-ja');
    } finally {
      setIsPrintLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">QR Kode</h1>

            {/* Seller Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Izberi prodajalca</CardTitle>
                <CardDescription>Upravljaj QR kode za izbranega prodajalca</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seller">Prodajalec</Label>
                    <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                      <SelectTrigger id="seller">
                        <SelectValue placeholder="Izberi prodajalca" />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.first_name} {seller.last_name} {seller.code_prefix && `(${seller.code_prefix})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSellerId && selectedSeller && (
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{stats.total}</p>
                          <p className="text-sm text-muted-foreground">Skupaj</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                          <p className="text-sm text-muted-foreground">Prostih</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <p className="text-2xl font-bold">{stats.pending}</p>
                          <p className="text-sm text-muted-foreground">Naročenih</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                          <p className="text-sm text-muted-foreground">Aktivnih</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">{stats.onTest}</p>
                          <p className="text-sm text-muted-foreground">Na testu</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{stats.waitingPickup}</p>
                          <p className="text-sm text-muted-foreground">Čaka prevzem</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedSellerId && (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="pregled" className="flex items-center gap-2">
                    <Search className="h-4 w-4" /> Pregled
                  </TabsTrigger>
                  <TabsTrigger value="dodaj" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Dodaj kode
                  </TabsTrigger>
                  <TabsTrigger value="tiskanje" className="flex items-center gap-2">
                    <Printer className="h-4 w-4" /> Tiskanje
                  </TabsTrigger>
                </TabsList>

                {/* PREGLED TAB */}
                <TabsContent value="pregled" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>QR kode ({filteredCodes.length})</CardTitle>
                        <div className="flex gap-2">
                          <Button onClick={() => refetchOverview()} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" /> Osveži
                          </Button>
                          <Button onClick={handleExportToExcel} variant="outline" size="sm">
                            <FileDown className="h-4 w-4 mr-2" /> Excel
                          </Button>
                          <Button onClick={handlePrintList} variant="outline" size="sm">
                            <Printer className="h-4 w-4 mr-2" /> Natisni
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="filterStatus">Filter po statusu</Label>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger id="filterStatus" className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Vse</SelectItem>
                              <SelectItem value="available">Proste</SelectItem>
                              <SelectItem value="pending">Naročene</SelectItem>
                              <SelectItem value="clean">Čiste</SelectItem>
                              <SelectItem value="on_test">Na testu</SelectItem>
                              <SelectItem value="dirty">Umazane</SelectItem>
                              <SelectItem value="waiting_driver">Čaka prevzem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {loadingOverview ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : filteredCodes.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">Ni kod za prikaz</div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {filteredCodes.map((code) => (
                              <div
                                key={code.id}
                                className={`p-3 border rounded-lg text-center relative ${
                                  code.status === 'available' ? 'bg-green-50 dark:bg-green-950 border-green-300' :
                                  code.active_cycle?.status === 'on_test' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300' :
                                  code.active_cycle?.status === 'waiting_driver' ? 'bg-purple-50 dark:bg-purple-950 border-purple-300' :
                                  'bg-gray-50 dark:bg-gray-900'
                                }`}
                              >
                                {code.active_cycle?.mat_type && (
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold truncate max-w-[90%]">
                                    {code.active_cycle.mat_type.code || code.active_cycle.mat_type.name}
                                  </div>
                                )}
                                <p className="font-mono text-sm font-semibold mb-1 mt-1">{code.code}</p>
                                {getStatusBadge(code)}
                                {code.active_cycle?.company && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{code.active_cycle.company.name}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* DODAJ TAB */}
                <TabsContent value="dodaj" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dodaj nove kode</CardTitle>
                      <CardDescription>
                        {selectedSeller?.code_prefix
                          ? `Ustvarite naključne kode v formatu ${selectedSeller.code_prefix}-XXXX`
                          : 'Prodajalec nima nastavljene predpone'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedSeller?.code_prefix ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Število kod za generiranje</Label>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" onClick={() => setNewCodeCount(Math.max(1, newCodeCount - 1))}>-</Button>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={newCodeCount}
                                onChange={(e) => setNewCodeCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                className="text-center w-24"
                              />
                              <Button variant="outline" size="icon" onClick={() => setNewCodeCount(Math.min(100, newCodeCount + 1))}>+</Button>
                            </div>
                          </div>
                          <Button onClick={handleAddCodes} disabled={createCodes.isPending} className="w-full">
                            {createCodes.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Generiraj {newCodeCount} {newCodeCount === 1 ? 'kodo' : 'kod'}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Prodajalec nima nastavljene QR predpone.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Obstoječe proste kode ({freeCodes.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingFreeCodes ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                      ) : freeCodes.length === 0 ? (
                        <div className="text-center py-8">
                          <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Ni prostih kod</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                          {freeCodes.map((code) => (
                            <div key={code.id} className="p-2 border rounded-lg text-center bg-green-50 dark:bg-green-950 border-green-300 relative group">
                              <button
                                onClick={() => deleteCode.mutate(code.id)}
                                disabled={deleteCode.isPending}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <p className="font-mono text-sm font-semibold">{code.code}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TISKANJE TAB */}
                <TabsContent value="tiskanje" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Nastavitve tiskanja</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>Format nalepk</Label>
                        <Select value={selectedLabelPreset} onValueChange={(v) => setSelectedLabelPreset(v as LabelPresetKey)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(LABEL_PRESETS).map(([key, preset]) => (
                              <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {LABEL_PRESETS[selectedLabelPreset].cols} × {LABEL_PRESETS[selectedLabelPreset].rows} = {LABEL_PRESETS[selectedLabelPreset].cols * LABEL_PRESETS[selectedLabelPreset].rows} nalepk na stran
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>Možnost tiskanja</Label>
                        <RadioGroup value={printOption} onValueChange={setPrintOption}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <Label htmlFor="all" className="cursor-pointer">Vse proste kode ({freeCodes.length})</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="range" id="range" />
                            <Label htmlFor="range" className="cursor-pointer">Obseg</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {printOption === 'range' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="rangeStart">Od</Label>
                            <Input id="rangeStart" type="number" value={rangeStart} onChange={(e) => setRangeStart(parseInt(e.target.value))} min={1} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rangeEnd">Do</Label>
                            <Input id="rangeEnd" type="number" value={rangeEnd} onChange={(e) => setRangeEnd(parseInt(e.target.value))} min={1} />
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Število kod: <strong>{printCodes.length}</strong></p>
                        <Button onClick={handleGeneratePDF} disabled={isPrintLoading || printCodes.length === 0} className="w-full">
                          <Printer className="h-4 w-4 mr-2" />
                          {isPrintLoading ? 'Pripravljam PDF...' : 'Generiraj PDF'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {printCodes.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>Predogled ({printCodes.length} kod)</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                          {printCodes.slice(0, 15).map((code) => (
                            <div key={code} className="text-center">
                              <div className="border rounded-lg p-2 bg-white"><QRCodeCanvas value={code} size={qrSize} /></div>
                              <p className="text-xs font-mono mt-1">{code}</p>
                            </div>
                          ))}
                        </div>
                        {printCodes.length > 15 && <p className="text-sm text-muted-foreground text-center mt-4">... in še {printCodes.length - 15} kod</p>}
                      </CardContent>
                    </Card>
                  )}

                  {/* Hidden QR codes for PDF */}
                  <div style={{ display: 'none' }}>
                    {printCodes.map((code) => (
                      <QRCodeCanvas key={code} value={code} size={512} ref={(el) => { if (el) qrRefs.current[code] = el; }} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

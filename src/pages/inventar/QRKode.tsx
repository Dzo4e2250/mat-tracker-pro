import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import {
  Plus,
  Loader2,
  QrCode,
  Search,
  Printer,
  RefreshCw,
  FileDown,
  CalendarIcon,
  X,
  Trash2,
} from 'lucide-react';
import { useProdajalecProfiles } from '@/hooks/useProfiles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QRCode, Cycle, MatType, Company } from '@/integrations/supabase/types';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { generateUniqueQRCodes } from '@/lib/utils';

// Prednastavitve za različne formate nalepk
const LABEL_PRESETS = {
  'herma-4360': {
    name: 'Herma 4360 / Avery 3475 (70×36mm)',
    description: 'Papirne nalepke, bele, mat - za pisarniško uporabo',
    width: 70,
    height: 36,
    cols: 3,
    rows: 8,
    leftMargin: 0,
    topMargin: 4.5,
    qrSize: 24,
    fontSize: 9,
  },
  'herma-4262': {
    name: 'Herma 4262 / Avery 3422 (70×37mm)',
    description: 'Papirne nalepke, bele, mat - univerzalne',
    width: 70,
    height: 37,
    cols: 3,
    rows: 8,
    leftMargin: 0,
    topMargin: 0,
    qrSize: 24,
    fontSize: 9,
  },
  'herma-4270': {
    name: 'Herma 4270 / Avery 3666 (38×21mm)',
    description: 'Papirne nalepke, majhne - za označevanje',
    width: 38.1,
    height: 21.2,
    cols: 5,
    rows: 13,
    leftMargin: 4.7,
    topMargin: 10.7,
    qrSize: 14,
    fontSize: 6,
  },
  'herma-8831': {
    name: 'Herma 8831 (70×37mm) - VODOODPORNE',
    description: 'Polyester nalepke, odporne na vodo in gumo - za predpražnike',
    width: 70,
    height: 37,
    cols: 3,
    rows: 8,
    leftMargin: 0,
    topMargin: 0,
    qrSize: 24,
    fontSize: 9,
  },
  'avery-l4776': {
    name: 'Avery L4776 (99.1×42.3mm) - VODOODPORNE',
    description: 'Polyester nalepke, ultra odporne - za zunanjo uporabo',
    width: 99.1,
    height: 42.3,
    cols: 2,
    rows: 7,
    leftMargin: 4.7,
    topMargin: 4.5,
    qrSize: 28,
    fontSize: 10,
  },
  'herma-4457': {
    name: 'Herma 4457 / Avery 3489 (70×50.8mm)',
    description: 'Papirne nalepke, večje - za boljšo čitljivost',
    width: 70,
    height: 50.8,
    cols: 3,
    rows: 5,
    leftMargin: 0,
    topMargin: 21.2,
    qrSize: 32,
    fontSize: 10,
  },
} as const;

type LabelPresetKey = keyof typeof LABEL_PRESETS;

type QRCodeWithCycle = QRCode & {
  active_cycle?: Cycle & {
    mat_type?: MatType;
    company?: Company;
  };
};

export default function QRKode() {
  const [activeTab, setActiveTab] = useState<'dodaj' | 'pregled' | 'tiskanje'>('pregled');
  const { data: sellers = [], isLoading: loadingSellers } = useProdajalecProfiles();
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // === FREE CODES STATE ===
  const [newCodeCount, setNewCodeCount] = useState(1);

  // === OVERVIEW STATE ===
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // === PRINT STATE ===
  const [printOption, setPrintOption] = useState('all');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(50);
  const [qrPerRow, setQrPerRow] = useState(3);
  const [qrSize, setQrSize] = useState(128);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
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

  // === FREE CODES QUERIES ===
  const { data: freeCodes = [], isLoading: loadingFreeCodes } = useQuery({
    queryKey: ['free_codes', selectedSellerId],
    queryFn: async () => {
      if (!selectedSellerId) return [];
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', selectedSellerId)
        .eq('status', 'available')
        .order('code');
      if (error) throw error;
      return data as QRCode[];
    },
    enabled: !!selectedSellerId,
  });

  // === OVERVIEW QUERIES ===
  const {
    data: qrCodes = [],
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['qr_codes_with_cycles', selectedSellerId],
    queryFn: async () => {
      if (!selectedSellerId) return [];
      const { data: codes, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', selectedSellerId)
        .order('code');
      if (error) throw error;

      const codesWithCycles: QRCodeWithCycle[] = await Promise.all(
        (codes || []).map(async (code) => {
          const { data: cycle } = await supabase
            .from('cycles')
            .select(`*, mat_type:mat_types(*), company:companies(*)`)
            .eq('qr_code_id', code.id)
            .neq('status', 'completed')
            .maybeSingle();
          return { ...code, active_cycle: cycle || undefined };
        })
      );
      return codesWithCycles;
    },
    enabled: !!selectedSellerId,
  });

  // === PRINT QUERIES ===
  const { data: printActiveQrCodes = [] } = useQuery({
    queryKey: ['print_active_codes', selectedSellerId, filterDate],
    queryFn: async () => {
      if (!selectedSellerId) return [];
      let query = supabase
        .from('qr_codes')
        .select('code')
        .eq('owner_id', selectedSellerId)
        .eq('status', 'active');

      // Note: filterDate filtering would need additional logic based on your schema
      const { data, error } = await query;
      if (error) throw error;
      return data?.map((d) => d.code) || [];
    },
    enabled: !!selectedSellerId,
  });

  // === FREE CODES MUTATIONS ===
  const createCodes = useMutation({
    mutationFn: async ({
      prefix,
      count,
      ownerId,
    }: {
      prefix: string;
      count: number;
      ownerId: string;
    }) => {
      // Get all existing codes to ensure uniqueness
      const { data: existingCodes } = await supabase
        .from('qr_codes')
        .select('code')
        .like('code', `${prefix}-%`);

      const existingSet = new Set((existingCodes || []).map(c => c.code));

      // Generate unique random codes
      const newCodeStrings = generateUniqueQRCodes(prefix, count, existingSet);

      if (newCodeStrings.length < count) {
        throw new Error(`Uspelo je generirati samo ${newCodeStrings.length} od ${count} kod`);
      }

      const newCodes = newCodeStrings.map(code => ({
        code,
        owner_id: ownerId,
        status: 'available' as const,
      }));

      const { data, error } = await supabase.from('qr_codes').insert(newCodes).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Uspeh', description: `Ustvarjenih ${data.length} novih QR kod` });
      queryClient.invalidateQueries({ queryKey: ['free_codes', selectedSellerId] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes_with_cycles', selectedSellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      setNewCodeCount(1);
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCode = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase.from('qr_codes').delete().eq('id', codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Uspeh', description: 'QR koda izbrisana' });
      queryClient.invalidateQueries({ queryKey: ['free_codes', selectedSellerId] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes_with_cycles', selectedSellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddCodes = async () => {
    if (!selectedSellerId || !selectedSeller?.code_prefix) {
      toast({
        title: 'Napaka',
        description: 'Izberite prodajalca s predpono',
        variant: 'destructive',
      });
      return;
    }

    createCodes.mutate({
      prefix: selectedSeller.code_prefix,
      count: newCodeCount,
      ownerId: selectedSellerId,
    });
  };

  // === OVERVIEW HELPERS ===
  const getStatusBadge = (code: QRCodeWithCycle) => {
    if (code.status === 'pending') return <Badge variant="secondary">Naročena</Badge>;
    if (code.status === 'available') return <Badge className="bg-green-500">Prosta</Badge>;
    if (code.active_cycle) {
      const cycleStatus = code.active_cycle.status;
      switch (cycleStatus) {
        case 'clean':
          return <Badge className="bg-blue-500">Čista</Badge>;
        case 'on_test':
          return <Badge className="bg-yellow-500">Na testu</Badge>;
        case 'dirty':
          return <Badge className="bg-orange-500">Umazana</Badge>;
        case 'waiting_driver':
          return <Badge className="bg-purple-500">Čaka prevzem</Badge>;
        default:
          return <Badge variant="outline">{cycleStatus}</Badge>;
      }
    }
    return <Badge variant="secondary">Aktivna</Badge>;
  };

  const getCodeStatus = (code: QRCodeWithCycle): string => {
    if (code.status === 'pending') return 'pending';
    if (code.status === 'available') return 'available';
    if (code.active_cycle) return code.active_cycle.status;
    return 'active';
  };

  const filteredCodes = qrCodes.filter((code) => {
    if (filterStatus === 'all') return true;
    return getCodeStatus(code) === filterStatus;
  });

  const stats = useMemo(
    () => ({
      total: qrCodes.length,
      available: qrCodes.filter((c) => c.status === 'available').length,
      pending: qrCodes.filter((c) => c.status === 'pending').length,
      active: qrCodes.filter((c) => c.status === 'active').length,
      onTest: qrCodes.filter((c) => c.active_cycle?.status === 'on_test').length,
      waitingPickup: qrCodes.filter((c) => c.active_cycle?.status === 'waiting_driver').length,
    }),
    [qrCodes]
  );

  const handleExportToExcel = () => {
    if (!selectedSeller) return;
    const exportData = filteredCodes.map((code) => ({
      'QR Koda': code.code,
      Status: getCodeStatus(code),
      'Tip preproge': code.active_cycle?.mat_type?.name || '-',
      Podjetje: code.active_cycle?.company?.name || '-',
      'Začetek testa': code.active_cycle?.test_start_date
        ? new Date(code.active_cycle.test_start_date).toLocaleDateString('sl-SI')
        : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QR Kode');
    const sellerName = `${selectedSeller.first_name}_${selectedSeller.last_name}`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `${sellerName}_QR_kode_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Uspeh', description: 'Excel datoteka prenesena' });
  };

  const handlePrintList = () => {
    if (!selectedSeller) return;
    const sellerName = `${selectedSeller.first_name} ${selectedSeller.last_name}`;
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Seznam QR kod - ${sellerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Seznam QR kod</h1>
          <div class="meta">
            <strong>Prodajalec:</strong> ${sellerName} (${selectedSeller.code_prefix || 'N/A'})<br>
            <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}<br>
            <strong>Čas:</strong> ${new Date().toLocaleTimeString('sl-SI')}
          </div>
          <div class="summary">
            <strong>Skupaj kod:</strong> ${stats.total}<br>
            <strong>Prostih:</strong> ${stats.available}<br>
            <strong>Na testu:</strong> ${stats.onTest}<br>
            <strong>Čaka prevzem:</strong> ${stats.waitingPickup}
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>QR Koda</th><th>Status</th><th>Tip</th><th>Podjetje</th></tr>
            </thead>
            <tbody>
              ${filteredCodes
                .map(
                  (code, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${code.code}</strong></td>
                  <td>${getCodeStatus(code)}</td>
                  <td>${code.active_cycle?.mat_type?.name || '-'}</td>
                  <td>${code.active_cycle?.company?.name || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    }
  };

  // === PRINT HELPERS ===
  const getPrintQrCodes = () => {
    if (!selectedSeller?.code_prefix) return [];

    // Generate codes based on free codes (available)
    const allCodes = freeCodes.map((c) => c.code);

    if (printOption === 'all') {
      return allCodes;
    } else if (printOption === 'range') {
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

      const pdf = new jsPDF('p', 'mm', 'a4');

      // Uporabi izbrano prednastavitev
      const preset = LABEL_PRESETS[selectedLabelPreset];
      const LABEL_WIDTH = preset.width;
      const LABEL_HEIGHT = preset.height;
      const COLS = preset.cols;
      const ROWS = preset.rows;
      const LEFT_MARGIN = preset.leftMargin;
      const TOP_MARGIN = preset.topMargin;
      const QR_SIZE = preset.qrSize;
      const FONT_SIZE = preset.fontSize;

      let labelIndex = 0;

      for (const code of printCodes) {
        const canvas = qrRefs.current[code];
        if (!canvas) continue;

        // Izračunaj pozicijo na strani
        const pageIndex = Math.floor(labelIndex / (COLS * ROWS));
        const posOnPage = labelIndex % (COLS * ROWS);
        const col = posOnPage % COLS;
        const row = Math.floor(posOnPage / COLS);

        // Dodaj novo stran če potrebno
        if (pageIndex > 0 && posOnPage === 0) {
          pdf.addPage();
        }

        // Izračunaj X in Y pozicijo nalepke
        const labelX = LEFT_MARGIN + col * LABEL_WIDTH;
        const labelY = TOP_MARGIN + row * LABEL_HEIGHT;

        // Centriraj QR kodo na nalepki
        const qrX = labelX + (LABEL_WIDTH - QR_SIZE) / 2;
        const qrY = labelY + 2; // 2mm od vrha nalepke

        // Nariši QR kodo
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);

        // Dodaj kodo pod QR
        pdf.setFontSize(FONT_SIZE);
        pdf.setFont('helvetica', 'bold');
        const textX = labelX + LABEL_WIDTH / 2;
        const textY = qrY + QR_SIZE + 4; // pod QR kodo
        pdf.text(code, textX, textY, { align: 'center' });

        labelIndex++;
      }

      pdf.save(
        `QR_Codes_${selectedSeller?.first_name || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`
      );
      sonnerToast.success('PDF uspešno generiran!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      sonnerToast.error('Napaka pri generiranju PDF-ja');
    } finally {
      setIsPrintLoading(false);
    }
  };

  const isLoading = loadingSellers || loadingFreeCodes || loadingOverview;

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
                            {seller.first_name} {seller.last_name}{' '}
                            {seller.code_prefix && `(${seller.code_prefix})`}
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
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="space-y-4"
              >
                <TabsList>
                  <TabsTrigger value="pregled" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Pregled
                  </TabsTrigger>
                  <TabsTrigger value="dodaj" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Dodaj kode
                  </TabsTrigger>
                  <TabsTrigger value="tiskanje" className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Tiskanje
                  </TabsTrigger>
                </TabsList>

                {/* === TAB: PREGLED === */}
                <TabsContent value="pregled" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>QR kode ({filteredCodes.length})</CardTitle>
                        <div className="flex gap-2">
                          <Button onClick={() => refetchOverview()} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Osveži
                          </Button>
                          <Button onClick={handleExportToExcel} variant="outline" size="sm">
                            <FileDown className="h-4 w-4 mr-2" />
                            Excel
                          </Button>
                          <Button onClick={handlePrintList} variant="outline" size="sm">
                            <Printer className="h-4 w-4 mr-2" />
                            Natisni
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
                          <div className="text-center py-8 text-muted-foreground">
                            Ni kod za prikaz
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {filteredCodes.map((code) => (
                              <div
                                key={code.id}
                                className={`p-3 border rounded-lg text-center relative ${
                                  code.status === 'available'
                                    ? 'bg-green-50 dark:bg-green-950 border-green-300'
                                    : code.active_cycle?.status === 'on_test'
                                      ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300'
                                      : code.active_cycle?.status === 'waiting_driver'
                                        ? 'bg-purple-50 dark:bg-purple-950 border-purple-300'
                                        : 'bg-gray-50 dark:bg-gray-900'
                                }`}
                              >
                                {code.active_cycle?.mat_type && (
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold truncate max-w-[90%]">
                                    {code.active_cycle.mat_type.code || code.active_cycle.mat_type.name}
                                  </div>
                                )}
                                <p className="font-mono text-sm font-semibold mb-1 mt-1">
                                  {code.code}
                                </p>
                                {getStatusBadge(code)}
                                {code.active_cycle?.company && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {code.active_cycle.company.name}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* === TAB: DODAJ KODE === */}
                <TabsContent value="dodaj" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dodaj nove kode</CardTitle>
                      <CardDescription>
                        {selectedSeller?.code_prefix
                          ? `Ustvarite naključne kode v formatu ${selectedSeller.code_prefix}-XXXX (npr. ${selectedSeller.code_prefix}-7KM2)`
                          : 'Prodajalec nima nastavljene predpone'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedSeller?.code_prefix ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Število kod za generiranje</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setNewCodeCount(Math.max(1, newCodeCount - 1))}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={newCodeCount}
                                onChange={(e) =>
                                  setNewCodeCount(
                                    Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                                  )
                                }
                                className="text-center w-24"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setNewCodeCount(Math.min(100, newCodeCount + 1))}
                              >
                                +
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Kode bodo imele naključne 4-mestne alfanumerične končnice
                            </p>
                          </div>

                          <Button
                            onClick={handleAddCodes}
                            disabled={createCodes.isPending}
                            className="w-full"
                          >
                            {createCodes.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Generiraj {newCodeCount} {newCodeCount === 1 ? 'kodo' : 'kod'}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Prodajalec nima nastavljene QR predpone. Nastavite jo v upravljanju
                          računov.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Obstoječe proste kode ({freeCodes.length})</CardTitle>
                      <CardDescription>
                        QR kode, ki še niso bile dodeljene nobeni preprogi
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingFreeCodes ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : freeCodes.length === 0 ? (
                        <div className="text-center py-8">
                          <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            Ni prostih kod za tega prodajalca
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                          {freeCodes.map((code) => (
                            <div
                              key={code.id}
                              className="p-2 border rounded-lg text-center bg-green-50 dark:bg-green-950 border-green-300 relative group"
                            >
                              <button
                                onClick={() => deleteCode.mutate(code.id)}
                                disabled={deleteCode.isPending}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Izbriši kodo"
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

                {/* === TAB: TISKANJE === */}
                <TabsContent value="tiskanje" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Nastavitve tiskanja</CardTitle>
                      <CardDescription>Izberite katere QR kode želite natisniti</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Izbira formata nalepk */}
                      <div className="space-y-2">
                        <Label>Format nalepk</Label>
                        <Select
                          value={selectedLabelPreset}
                          onValueChange={(v) => setSelectedLabelPreset(v as LabelPresetKey)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(LABEL_PRESETS).map(([key, preset]) => (
                              <SelectItem key={key} value={key}>
                                {preset.name} ({preset.description})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {LABEL_PRESETS[selectedLabelPreset].cols} × {LABEL_PRESETS[selectedLabelPreset].rows} ={' '}
                          {LABEL_PRESETS[selectedLabelPreset].cols * LABEL_PRESETS[selectedLabelPreset].rows} nalepk na stran
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>Možnost tiskanja</Label>
                        <RadioGroup value={printOption} onValueChange={setPrintOption}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <Label htmlFor="all" className="cursor-pointer">
                              Vse proste kode ({freeCodes.length})
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="range" id="range" />
                            <Label htmlFor="range" className="cursor-pointer">
                              Obseg
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {printOption === 'range' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="rangeStart">Od</Label>
                            <Input
                              id="rangeStart"
                              type="number"
                              value={rangeStart}
                              onChange={(e) => setRangeStart(parseInt(e.target.value))}
                              min={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="rangeEnd">Do</Label>
                            <Input
                              id="rangeEnd"
                              type="number"
                              value={rangeEnd}
                              onChange={(e) => setRangeEnd(parseInt(e.target.value))}
                              min={1}
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">
                          Število kod za tiskanje: <strong>{printCodes.length}</strong>
                        </p>
                        <Button
                          onClick={handleGeneratePDF}
                          disabled={isPrintLoading || printCodes.length === 0}
                          className="w-full"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          {isPrintLoading ? 'Pripravljam PDF...' : 'Generiraj PDF'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {printCodes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Predogled ({printCodes.length} kod)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                          {printCodes.slice(0, 15).map((code) => (
                            <div key={code} className="text-center">
                              <div className="border rounded-lg p-2 bg-white">
                                <QRCodeCanvas value={code} size={qrSize} />
                              </div>
                              <p className="text-xs font-mono mt-1">{code}</p>
                            </div>
                          ))}
                        </div>
                        {printCodes.length > 15 && (
                          <p className="text-sm text-muted-foreground text-center mt-4">
                            ... in še {printCodes.length - 15} kod
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Hidden QR codes for PDF generation */}
                  <div style={{ display: 'none' }}>
                    {printCodes.map((code) => (
                      <QRCodeCanvas
                        key={code}
                        value={code}
                        size={512}
                        ref={(el) => {
                          if (el) qrRefs.current[code] = el;
                        }}
                      />
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

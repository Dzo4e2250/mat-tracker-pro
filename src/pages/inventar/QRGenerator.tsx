import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
  qr_start_num: number | null;
  qr_end_num: number | null;
}

interface SellerStats {
  id: string;
  full_name: string;
  total_codes: number;
  active_codes: number;
}

export default function QRGenerator() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [selectedPrintId, setSelectedPrintId] = useState("");
  const [sellerStats, setSellerStats] = useState<SellerStats[]>([]);
  const [activeQrCodes, setActiveQrCodes] = useState<string[]>([]);
  const [printActiveQrCodes, setPrintActiveQrCodes] = useState<string[]>([]);
  const [prefix, setPrefix] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(80);
  const [qrPerRow, setQrPerRow] = useState(3);
  const [printOption, setPrintOption] = useState("all");
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(50);
  const [qrSize, setQrSize] = useState(128);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [selectedInactiveCodes, setSelectedInactiveCodes] = useState<string[]>([]);
  const qrRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  useEffect(() => {
    fetchSellers();
    fetchSellerStats();
  }, []);

  useEffect(() => {
    if (selectedReviewId) {
      fetchActiveQrCodes(selectedReviewId);
    }
  }, [selectedReviewId]);

  useEffect(() => {
    if (selectedPrintId) {
      fetchPrintActiveQrCodes(selectedPrintId);
    }
  }, [selectedPrintId, filterDate]);

  useEffect(() => {
    // Adjust QR size based on qrPerRow
    const baseSize = 512;
    const calculatedSize = Math.floor(baseSize / qrPerRow);
    setQrSize(Math.max(64, Math.min(256, calculatedSize)));
  }, [qrPerRow]);

  const fetchSellers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (rolesError) throw rolesError;

      const sellersData = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, qr_prefix, qr_start_num, qr_end_num')
          .eq('id', role.user_id)
          .single();
        
        return profile;
      }));

      setSellers(sellersData.filter(Boolean) as Seller[]);
    } catch (error: any) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchSellerStats = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (rolesError) throw rolesError;

      const stats = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, qr_start_num, qr_end_num')
          .eq('id', role.user_id)
          .single();
        
        if (!profile) return null;

        // Count active doormats
        const { count, error: countError } = await supabase
          .from('doormats')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', profile.id);

        if (countError) throw countError;

        const totalCodes = profile.qr_end_num && profile.qr_start_num 
          ? profile.qr_end_num - profile.qr_start_num + 1 
          : 0;

        return {
          id: profile.id,
          full_name: profile.full_name,
          total_codes: totalCodes,
          active_codes: count || 0,
        };
      }));

      setSellerStats(stats.filter(Boolean) as SellerStats[]);
    } catch (error: any) {
      console.error('Error fetching seller stats:', error);
    }
  };

  const fetchActiveQrCodes = async (sellerId: string) => {
    try {
      const { data: doormats, error } = await supabase
        .from('doormats')
        .select('qr_code')
        .eq('seller_id', sellerId);

      if (error) throw error;

      setActiveQrCodes(doormats?.map(d => d.qr_code) || []);
    } catch (error: any) {
      console.error('Error fetching active QR codes:', error);
    }
  };

  const fetchPrintActiveQrCodes = async (sellerId: string) => {
    try {
      let query = supabase
        .from('doormats')
        .select('qr_code, generation_date')
        .eq('seller_id', sellerId);

      if (filterDate) {
        const dateStr = format(filterDate, 'yyyy-MM-dd');
        query = query.eq('generation_date', dateStr);
      }

      const { data: doormats, error } = await query;

      if (error) throw error;

      setPrintActiveQrCodes(doormats?.map(d => d.qr_code) || []);
    } catch (error: any) {
      console.error('Error fetching print active QR codes:', error);
    }
  };

  const getReviewQrCodes = () => {
    const seller = sellers.find(s => s.id === selectedReviewId);
    if (!seller || !seller.qr_prefix || !seller.qr_start_num || !seller.qr_end_num) {
      return [];
    }

    const allCodes = [];
    for (let i = seller.qr_start_num; i <= seller.qr_end_num; i++) {
      const code = `${seller.qr_prefix}-${String(i).padStart(3, '0')}`;
      const isActive = activeQrCodes.includes(code);
      allCodes.push({ code, isActive });
    }

    return allCodes;
  };

  const getPrintQrCodes = () => {
    const seller = sellers.find(s => s.id === selectedPrintId);
    if (!seller || !seller.qr_prefix || !seller.qr_start_num || !seller.qr_end_num) {
      return [];
    }

    // If date filter is active, use only active codes from that date
    if (filterDate) {
      return printActiveQrCodes;
    }

    let codes: string[] = [];
    
    if (printOption === "all") {
      for (let i = seller.qr_start_num; i <= seller.qr_end_num; i++) {
        codes.push(`${seller.qr_prefix}-${String(i).padStart(3, '0')}`);
      }
    } else if (printOption === "unused") {
      for (let i = seller.qr_start_num; i <= seller.qr_end_num; i++) {
        const code = `${seller.qr_prefix}-${String(i).padStart(3, '0')}`;
        if (!printActiveQrCodes.includes(code)) {
          codes.push(code);
        }
      }
    } else if (printOption === "range") {
      for (let i = rangeStart; i <= rangeEnd; i++) {
        codes.push(`${seller.qr_prefix}-${String(i).padStart(3, '0')}`);
      }
    }

    return codes;
  };

  const handleSellerChange = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    const seller = sellers.find(s => s.id === sellerId);
    if (seller?.qr_prefix) {
      setPrefix(seller.qr_prefix);
    }
  };

  const handleGenerateQrCodes = async () => {
    if (!selectedSellerId || !prefix) {
      return;
    }

    try {
      // Update seller's profile with QR code range
      const { error } = await supabase
        .from('profiles')
        .update({ 
          qr_prefix: prefix,
          qr_start_num: startNum,
          qr_end_num: endNum 
        })
        .eq('id', selectedSellerId);

      if (error) throw error;

      // Refresh stats after generating
      await fetchSellerStats();
      
      toast.success(`Generirano ${endNum - startNum + 1} QR kod za prodajalca`);
    } catch (error: any) {
      console.error('Error generating QR codes:', error);
      toast.error('Napaka pri generiranju QR kod');
    }
  };

  const handleGeneratePDF = async () => {
    const codes = getPrintQrCodes();
    
    if (codes.length === 0) {
      toast.error('Ni QR kod za tiskanje');
      return;
    }

    try {
      toast.info('Pripravljam PDF...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const qrSizeMM = (pageWidth - 2 * margin) / qrPerRow - 5;
      
      let x = margin;
      let y = margin;
      let count = 0;

      for (const code of codes) {
        const canvas = qrRefs.current[code];
        if (!canvas) continue;

        const imgData = canvas.toDataURL('image/png');
        
        pdf.addImage(imgData, 'PNG', x, y, qrSizeMM, qrSizeMM);
        pdf.setFontSize(8);
        pdf.text(code, x + qrSizeMM / 2, y + qrSizeMM + 4, { align: 'center' });
        
        count++;
        x += qrSizeMM + 5;
        
        if (count % qrPerRow === 0) {
          x = margin;
          y += qrSizeMM + 10;
          
          if (y + qrSizeMM > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
        }
      }

      const seller = sellers.find(s => s.id === selectedPrintId);
      pdf.save(`QR_Codes_${seller?.full_name || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF uspešno generiran!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Napaka pri generiranju PDF-ja');
    }
  };

  const handleDeleteInactiveCodes = async () => {
    if (selectedInactiveCodes.length === 0) {
      toast.error('Izberite kode za brisanje');
      return;
    }

    try {
      const seller = sellers.find(s => s.id === selectedReviewId);
      if (!seller) return;

      // Extract numbers from selected codes and find new range
      const codeNumbers = selectedInactiveCodes.map(code => {
        const match = code.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }).filter(num => num > 0).sort((a, b) => a - b);

      const minDeleted = Math.min(...codeNumbers);
      const maxDeleted = Math.max(...codeNumbers);

      // Update seller's QR range
      let newStartNum = seller.qr_start_num;
      let newEndNum = seller.qr_end_num;

      // If deleting from the start
      if (minDeleted === seller.qr_start_num) {
        newStartNum = maxDeleted + 1;
      }
      // If deleting from the end
      if (maxDeleted === seller.qr_end_num) {
        newEndNum = minDeleted - 1;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          qr_start_num: newStartNum,
          qr_end_num: newEndNum 
        })
        .eq('id', selectedReviewId);

      if (error) throw error;

      toast.success(`Izbrisano ${selectedInactiveCodes.length} kod`);
      setSelectedInactiveCodes([]);
      await fetchSellers();
      await fetchSellerStats();
      await fetchActiveQrCodes(selectedReviewId);
    } catch (error) {
      console.error('Error deleting codes:', error);
      toast.error('Napaka pri brisanju kod');
    }
  };

  const toggleInactiveCodeSelection = (code: string) => {
    setSelectedInactiveCodes(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleSelectAllInactive = () => {
    const qrCodes = getReviewQrCodes();
    const inactiveCodes = qrCodes.filter(item => !item.isActive).map(item => item.code);
    setSelectedInactiveCodes(inactiveCodes);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">QR Kod Generator</h1>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generiraj QR</TabsTrigger>
          <TabsTrigger value="review">Pregled QR Kod</TabsTrigger>
          <TabsTrigger value="print">Natisni QR</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generiraj QR kode</CardTitle>
              <CardDescription>
                Ustvari QR kode z začetnicami prodajalca (npr. RIS-001)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="seller">Prodajalec</Label>
                <Select value={selectedSellerId} onValueChange={handleSellerChange}>
                  <SelectTrigger id="seller">
                    <SelectValue placeholder="Izberi prodajalca" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name} {seller.qr_prefix && `(${seller.qr_prefix})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Kratica se bo avtomatsko nastavila glede na izbiro
                </p>
              </div>

              {prefix && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Izbrana kratica: <span className="text-lg font-bold">{prefix}</span></p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Od številke</Label>
                  <Input
                    id="start"
                    type="number"
                    value={startNum}
                    onChange={(e) => setStartNum(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Do številke</Label>
                  <Input
                    id="end"
                    type="number"
                    value={endNum}
                    onChange={(e) => setEndNum(Number(e.target.value))}
                    min={1}
                    max={200}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Primer: {prefix || "XXX"}-{String(startNum).padStart(3, "0")} do{" "}
                  {prefix || "XXX"}-{String(endNum).padStart(3, "0")}
                </p>
              </div>

              <Button 
                className="w-full"
                onClick={handleGenerateQrCodes}
                disabled={!selectedSellerId || !prefix}
              >
                Generiraj QR kode
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Pregled vseh QR kod</CardTitle>
              <CardDescription>
                Pregled generiranih in aktivnih QR kod po prodajalcih
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="review-seller">Izberi prodajalca</Label>
                <Select value={selectedReviewId} onValueChange={setSelectedReviewId}>
                  <SelectTrigger id="review-seller">
                    <SelectValue placeholder="Izberi prodajalca" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReviewId && (() => {
                const qrCodes = getReviewQrCodes();
                const stats = sellerStats.find(s => s.id === selectedReviewId);
                
                return qrCodes.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-primary/5">
                        <p className="text-sm text-muted-foreground mb-1">Generirane kode</p>
                        <p className="text-3xl font-bold">{stats?.total_codes || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-green-500/10">
                        <p className="text-sm text-muted-foreground mb-1">Aktivne kode</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {stats?.active_codes || 0}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="font-medium">Prikazanih: {qrCodes.length} QR kod</p>
                      {qrCodes.some(item => !item.isActive) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllInactive}
                          >
                            Izberi vse neaktivne
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteInactiveCodes}
                            disabled={selectedInactiveCodes.length === 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Izbriši izbrane ({selectedInactiveCodes.length})
                          </Button>
                          {selectedInactiveCodes.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInactiveCodes([])}
                            >
                              Počisti izbor
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-auto">
                        {qrCodes.map((item) => (
                          <div 
                            key={item.code} 
                            className={`p-3 border rounded-lg ${
                              item.isActive 
                                ? 'bg-green-500/10 border-green-500/30' 
                                : selectedInactiveCodes.includes(item.code)
                                  ? 'bg-destructive/20 border-destructive'
                                  : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full mt-1 ${
                                item.isActive ? 'bg-green-500' : 'bg-muted-foreground'
                              }`} />
                              {!item.isActive && (
                                <Checkbox
                                  checked={selectedInactiveCodes.includes(item.code)}
                                  onCheckedChange={() => toggleInactiveCodeSelection(item.code)}
                                />
                              )}
                            </div>
                            <span className="font-mono text-sm font-medium block">
                              {item.code}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.isActive ? 'Aktivna' : 'Neaktivna'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Prodajalec nima generiranih QR kod
                  </div>
                );
              })()}

              {!selectedReviewId && (
                <div className="text-center py-8 text-muted-foreground">
                  Izberite prodajalca za prikaz QR kod
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print">
          <Card>
            <CardHeader>
              <CardTitle>Natisni QR kode</CardTitle>
              <CardDescription>Pripravi QR kode za tiskanje v PDF obliki</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="print-seller">Izberi prodajalca</Label>
                <Select value={selectedPrintId} onValueChange={setSelectedPrintId}>
                  <SelectTrigger id="print-seller">
                    <SelectValue placeholder="Izberi prodajalca" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name} {seller.qr_prefix && `(${seller.qr_prefix})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPrintId && (
                <>
                  <div className="space-y-2">
                    <Label>Filtriraj po datumu</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDate ? format(filterDate, "d. MMMM yyyy", { locale: sl }) : "Izberi datum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filterDate}
                            onSelect={setFilterDate}
                            initialFocus
                            locale={sl}
                          />
                        </PopoverContent>
                      </Popover>
                      {filterDate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setFilterDate(undefined)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {filterDate && (
                      <p className="text-sm text-muted-foreground">
                        Prikazujem samo QR kode generirane {format(filterDate, "d. MMMM yyyy", { locale: sl })}
                      </p>
                    )}
                  </div>

                  {!filterDate && (
                    <div className="space-y-2">
                      <Label>Kaj želite natisniti?</Label>
                      <RadioGroup value={printOption} onValueChange={setPrintOption}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="print-all" />
                          <Label htmlFor="print-all">Vse QR kode</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unused" id="print-unused" />
                          <Label htmlFor="print-unused">Samo proste QR kode</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="range" id="print-range" />
                          <Label htmlFor="print-range">Določen razpon</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {!filterDate && printOption === "range" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="range-start">Od številke</Label>
                        <Input
                          id="range-start"
                          type="number"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(Number(e.target.value))}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="range-end">Do številke</Label>
                        <Input
                          id="range-end"
                          type="number"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(Number(e.target.value))}
                          min={1}
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">Za tiskanje: {getPrintQrCodes().length} QR kod</p>
                  </div>

                  <div className="space-y-2">
                    <Label>QR kod na vrstico: {qrPerRow}</Label>
                    <Slider
                      value={[qrPerRow]}
                      onValueChange={(value) => setQrPerRow(value[0])}
                      min={2}
                      max={6}
                      step={1}
                    />
                  </div>

                  <Button className="w-full" onClick={handleGeneratePDF}>
                    Generiraj PDF za tiskanje
                  </Button>

                  {/* QR Code Preview */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Predogled QR kod:</Label>
                    <div 
                      className="grid gap-4 p-4 border rounded-lg bg-muted/30 max-h-[600px] overflow-auto"
                      style={{ 
                        gridTemplateColumns: `repeat(${qrPerRow}, 1fr)` 
                      }}
                    >
                      {getPrintQrCodes().map((code) => (
                        <div 
                          key={`${code}-${qrPerRow}-${qrSize}`} 
                          className="flex flex-col items-center gap-2 p-3 bg-background rounded border"
                        >
                          <QRCodeCanvas
                            value={code}
                            size={qrSize}
                            level="H"
                            includeMargin={true}
                            ref={(el) => {
                              if (el) {
                                qrRefs.current[code] = el;
                              }
                            }}
                          />
                          <p className="text-xs font-mono font-medium text-center">{code}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!selectedPrintId && (
                <div className="text-center py-8 text-muted-foreground">
                  Izberite prodajalca za pripravo QR kod za tiskanje
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

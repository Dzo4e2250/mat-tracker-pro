import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { CalendarIcon, Printer, X } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
  qr_start_num: number | null;
  qr_end_num: number | null;
}

export default function PrintQR() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [printActiveQrCodes, setPrintActiveQrCodes] = useState<string[]>([]);
  const [qrPerRow, setQrPerRow] = useState(3);
  const [printOption, setPrintOption] = useState("all");
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(50);
  const [qrSize, setQrSize] = useState(128);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const qrRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    if (selectedSellerId) {
      fetchPrintActiveQrCodes();
    }
  }, [selectedSellerId, filterDate]);

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
      // Error handled
      toast.error('Napaka pri nalaganju prodajalcev');
    }
  };

  const fetchPrintActiveQrCodes = async () => {
    if (!selectedSellerId) return;
    
    try {
      let query = supabase
        .from('doormats')
        .select('qr_code, generation_date')
        .eq('seller_id', selectedSellerId);

      if (filterDate) {
        const dateStr = format(filterDate, 'yyyy-MM-dd');
        query = query.eq('generation_date', dateStr);
      }

      const { data: doormats, error } = await query;

      if (error) throw error;

      setPrintActiveQrCodes(doormats?.map(d => d.qr_code) || []);
    } catch (error: any) {
      // Error handled
      toast.error('Napaka pri nalaganju QR kod');
    }
  };

  const getPrintQrCodes = () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (!seller || !seller.qr_prefix || !seller.qr_start_num || !seller.qr_end_num) {
      return [];
    }

    // If date filter is active, use only active codes from that date
    if (filterDate) {
      return printActiveQrCodes;
    }

    const codes: string[] = [];
    
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

  const handleGeneratePDF = async () => {
    const codes = getPrintQrCodes();
    
    if (codes.length === 0) {
      toast.error('Ni QR kod za tiskanje');
      return;
    }

    setIsLoading(true);
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

      const seller = sellers.find(s => s.id === selectedSellerId);
      pdf.save(`QR_Codes_${seller?.full_name || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF uspešno generiran!');
    } catch (error) {
      // Error handled by toast
      toast.error('Napaka pri generiranju PDF-ja');
    } finally {
      setIsLoading(false);
    }
  };

  const printCodes = getPrintQrCodes();
  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Natisni QR kode</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Nastavitve tiskanja</CardTitle>
                <CardDescription>
                  Izberite prodajalca in nastavitve za tiskanje QR kod
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="seller">Prodajalec</Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
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
                </div>

                {selectedSellerId && selectedSeller && (
                  <>
                    <div className="space-y-3">
                      <Label>Možnost tiskanja</Label>
                      <RadioGroup value={printOption} onValueChange={setPrintOption}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="all" />
                          <Label htmlFor="all" className="cursor-pointer">
                            Vse kode ({selectedSeller.qr_end_num! - selectedSeller.qr_start_num! + 1})
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unused" id="unused" />
                          <Label htmlFor="unused" className="cursor-pointer">
                            Neuporabljene kode
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

                    {printOption === "range" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rangeStart">Od</Label>
                          <Input
                            id="rangeStart"
                            type="number"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(parseInt(e.target.value))}
                            min={selectedSeller.qr_start_num || 1}
                            max={selectedSeller.qr_end_num || 100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rangeEnd">Do</Label>
                          <Input
                            id="rangeEnd"
                            type="number"
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(parseInt(e.target.value))}
                            min={selectedSeller.qr_start_num || 1}
                            max={selectedSeller.qr_end_num || 100}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Datum generiranja (opcijsko)</Label>
                        {filterDate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilterDate(undefined)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Počisti
                          </Button>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDate ? format(filterDate, "PPP", { locale: sl }) : "Izberi datum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filterDate}
                            onSelect={setFilterDate}
                            locale={sl}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>QR kod na vrstico: {qrPerRow}</Label>
                      <Slider
                        value={[qrPerRow]}
                        onValueChange={(value) => setQrPerRow(value[0])}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">
                        Število kod za tiskanje: <strong>{printCodes.length}</strong>
                      </p>
                      <Button onClick={handleGeneratePDF} disabled={isLoading || printCodes.length === 0} className="w-full">
                        <Printer className="h-4 w-4 mr-2" />
                        {isLoading ? 'Pripravljam PDF...' : 'Generiraj PDF'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {selectedSellerId && printCodes.length > 0 && (
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

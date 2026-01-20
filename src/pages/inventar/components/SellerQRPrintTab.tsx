import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import type { QRCodeWithCycle } from "./types";

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

interface SellerQRPrintTabProps {
  qrCodes: QRCodeWithCycle[];
  sellerName: string;
  codePrefix: string | null;
}

export function SellerQRPrintTab({ qrCodes, sellerName, codePrefix }: SellerQRPrintTabProps) {
  const [printOption, setPrintOption] = useState<'available' | 'selected'>('available');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedLabelPreset, setSelectedLabelPreset] = useState<LabelPresetKey>('herma-8831');
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const qrRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  // Filter available codes
  const availableCodes = useMemo(() =>
    qrCodes.filter(c => c.status === 'available').map(c => c.code),
    [qrCodes]
  );

  // Get codes to print based on selection
  const codesToPrint = useMemo(() => {
    if (printOption === 'available') {
      return availableCodes;
    }
    return Array.from(selectedCodes);
  }, [printOption, availableCodes, selectedCodes]);

  const toggleCodeSelection = (code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const selectAllAvailable = () => {
    setSelectedCodes(new Set(availableCodes));
  };

  const clearSelection = () => {
    setSelectedCodes(new Set());
  };

  const handleGeneratePDF = async () => {
    if (codesToPrint.length === 0) {
      toast.error('Ni QR kod za tiskanje');
      return;
    }

    setIsPrintLoading(true);
    try {
      toast.info('Pripravljam PDF...');

      const pdf = new jsPDF('p', 'mm', 'a4');

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

      for (const code of codesToPrint) {
        const canvas = qrRefs.current[code];
        if (!canvas) continue;

        const pageIndex = Math.floor(labelIndex / (COLS * ROWS));
        const posOnPage = labelIndex % (COLS * ROWS);
        const col = posOnPage % COLS;
        const row = Math.floor(posOnPage / COLS);

        if (pageIndex > 0 && posOnPage === 0) {
          pdf.addPage();
        }

        const labelX = LEFT_MARGIN + col * LABEL_WIDTH;
        const labelY = TOP_MARGIN + row * LABEL_HEIGHT;

        const qrX = labelX + (LABEL_WIDTH - QR_SIZE) / 2;
        const qrY = labelY + 2;

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);

        pdf.setFontSize(FONT_SIZE);
        pdf.setFont('helvetica', 'bold');
        const textX = labelX + LABEL_WIDTH / 2;
        const textY = qrY + QR_SIZE + 4;
        pdf.text(code, textX, textY, { align: 'center' });

        labelIndex++;
      }

      const safeSellerName = sellerName.replace(/\s+/g, '_');
      pdf.save(`QR_Codes_${safeSellerName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF uspešno generiran!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Napaka pri generiranju PDF-ja');
    } finally {
      setIsPrintLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Tiskanje QR kod
          </CardTitle>
          <CardDescription>Izberite katere QR kode želite natisniti na nalepke</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format nalepk */}
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
                    <div className="flex flex-col">
                      <span>{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {LABEL_PRESETS[selectedLabelPreset].cols} × {LABEL_PRESETS[selectedLabelPreset].rows} ={' '}
              {LABEL_PRESETS[selectedLabelPreset].cols * LABEL_PRESETS[selectedLabelPreset].rows} nalepk na stran
            </p>
          </div>

          {/* Možnost tiskanja */}
          <div className="space-y-3">
            <Label>Možnost tiskanja</Label>
            <RadioGroup value={printOption} onValueChange={(v) => setPrintOption(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="available" id="available" />
                <Label htmlFor="available" className="cursor-pointer">
                  Vse proste kode ({availableCodes.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="cursor-pointer">
                  Izbrane kode ({selectedCodes.size})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Izbira posameznih kod */}
          {printOption === 'selected' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Izberi kode za tiskanje</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllAvailable}>
                    Izberi vse proste
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Počisti
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {qrCodes.map((code) => {
                    const isAvailable = code.status === 'available';
                    const isSelected = selectedCodes.has(code.code);
                    return (
                      <label
                        key={code.id}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : isAvailable
                              ? 'bg-green-50 border-green-200 hover:bg-green-100'
                              : 'bg-gray-50 border-gray-200 opacity-50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCodeSelection(code.code)}
                          disabled={!isAvailable}
                        />
                        <span className={`font-mono text-sm ${!isAvailable ? 'text-muted-foreground' : ''}`}>
                          {code.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Samo proste kode (zelene) se lahko tiskajo. Aktivne kode so onemogočene.
              </p>
            </div>
          )}

          {/* Gumb za generiranje PDF */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Število kod za tiskanje: <strong>{codesToPrint.length}</strong>
              {codesToPrint.length > 0 && (
                <span className="ml-2">
                  ({Math.ceil(codesToPrint.length / (LABEL_PRESETS[selectedLabelPreset].cols * LABEL_PRESETS[selectedLabelPreset].rows))} strani)
                </span>
              )}
            </p>
            <Button
              onClick={handleGeneratePDF}
              disabled={isPrintLoading || codesToPrint.length === 0}
              className="w-full"
              size="lg"
            >
              {isPrintLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isPrintLoading ? 'Pripravljam PDF...' : `Generiraj PDF (${codesToPrint.length} kod)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Predogled */}
      {codesToPrint.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Predogled ({codesToPrint.length} kod)</CardTitle>
            <CardDescription>Prikaz prvih 12 QR kod za tiskanje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {codesToPrint.slice(0, 12).map((code) => (
                <div key={code} className="text-center">
                  <div className="border rounded-lg p-2 bg-white inline-block">
                    <QRCodeCanvas value={code} size={80} />
                  </div>
                  <p className="text-xs font-mono mt-1 font-semibold">{code}</p>
                </div>
              ))}
            </div>
            {codesToPrint.length > 12 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                ... in še {codesToPrint.length - 12} kod
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden QR codes for PDF generation */}
      <div style={{ display: 'none' }}>
        {codesToPrint.map((code) => (
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
  );
}

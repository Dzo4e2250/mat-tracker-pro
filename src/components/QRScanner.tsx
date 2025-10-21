import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrCode: string, type: string) => void;
}

const doormatTypes = [
  { code: 'MBW0', size: '85x75 cm' },
  { code: 'MBW1', size: '85x150 cm' },
  { code: 'MBW2', size: '115x200 cm' },
  { code: 'MBW4', size: '150x300 cm' },
  { code: 'ERM10R', size: '86x54 cm' },
  { code: 'ERM11R', size: '86x142 cm' },
];

export default function QRScanner({ onScan }: QRScannerProps) {
  const [manualQrCode, setManualQrCode] = useState('');
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);

  // Generate pre-defined QR codes (PRED-001 to PRED-010)
  const predefinedQrCodes = Array.from({ length: 10 }, (_, i) => 
    `PRED-${String(i + 1).padStart(3, '0')}`
  );

  const handleManualSubmit = () => {
    if (manualQrCode.trim()) {
      // For manual entry, we still need to select type
      setSelectedQrCode(manualQrCode.trim());
      setShowTypeDialog(true);
    }
  };

  const handlePredefinedQrClick = (qrCode: string) => {
    setSelectedQrCode(qrCode);
    setShowTypeDialog(true);
  };

  const handleTypeSelect = (type: string) => {
    if (selectedQrCode) {
      onScan(selectedQrCode, type);
      setShowTypeDialog(false);
      setSelectedQrCode(null);
      setManualQrCode('');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Camera Icon and Title */}
        <div className="flex flex-col items-center gap-4 py-8">
          <Camera className="h-20 w-20 text-primary" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold">Skeniraj QR</h2>
        </div>

        {/* Manual QR Input */}
        <div className="space-y-3">
          <Input
            value={manualQrCode}
            onChange={(e) => setManualQrCode(e.target.value)}
            placeholder="Vnesi QR (npr. PRED-001)"
            className="h-12 text-center"
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <Button 
            onClick={handleManualSubmit} 
            className="w-full h-12"
            disabled={!manualQrCode.trim()}
          >
            Potrdi
          </Button>
        </div>

        {/* Pre-defined QR Codes */}
        <div className="space-y-3">
          <h3 className="font-semibold">Proste QR:</h3>
          <div className="grid grid-cols-4 gap-2">
            {predefinedQrCodes.map((qrCode) => (
              <Button
                key={qrCode}
                variant="outline"
                onClick={() => handlePredefinedQrClick(qrCode)}
                className="h-10 text-sm"
              >
                {qrCode}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Doormat Type Selection Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {selectedQrCode} - Izberi tip:
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {doormatTypes.map((type) => (
              <Button
                key={type.code}
                variant="outline"
                onClick={() => handleTypeSelect(type.code)}
                className="w-full h-auto py-4 flex flex-col items-start hover:bg-accent"
              >
                <span className="font-semibold">{type.code}</span>
                <span className="text-sm text-muted-foreground">{type.size}</span>
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setShowTypeDialog(false);
              setSelectedQrCode(null);
            }}
            className="w-full"
          >
            Prekliči
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { QrReader } from 'react-qr-reader';

interface QRScannerProps {
  onScan: (qrCode: string, type: string) => void;
  checkIfExists?: (qrCode: string) => Promise<boolean>;
  usedQrCodes?: string[];
  qrPrefix?: string;
  qrMaxNumber?: number;
  sentDoormats?: Array<{ qr_code: string; type: string }>;
}

const doormatTypes = [
  { code: 'MBW0', size: '85x75 cm' },
  { code: 'MBW1', size: '85x150 cm' },
  { code: 'MBW2', size: '115x200 cm' },
  { code: 'MBW4', size: '150x300 cm' },
  { code: 'ERM10R', size: '86x54 cm' },
  { code: 'ERM11R', size: '86x142 cm' },
];

export default function QRScanner({ onScan, checkIfExists, usedQrCodes = [], qrPrefix = "PRED", qrMaxNumber = 200, sentDoormats = [] }: QRScannerProps) {
  const [manualQrCode, setManualQrCode] = useState('');
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [wasUsingCamera, setWasUsingCamera] = useState(false);

  // If sentDoormats are provided, use them as available QR codes (inactive ones from inventar)
  // Otherwise generate pre-defined QR codes using seller's prefix and max number
  const predefinedQrCodes = sentDoormats.length > 0 
    ? sentDoormats.map(d => d.qr_code)
    : Array.from({ length: qrMaxNumber > 0 ? qrMaxNumber : 200 }, (_, i) => 
        `${qrPrefix}-${String(i + 1).padStart(3, '0')}`
      ).filter(code => !usedQrCodes.includes(code));

  const handleManualSubmit = async () => {
    if (manualQrCode.trim()) {
      const qrCode = manualQrCode.trim();
      
      // Check if doormat already exists
      if (checkIfExists) {
        const exists = await checkIfExists(qrCode);
        if (exists) {
          // Let parent handle existing doormat
          onScan(qrCode, '');
          setManualQrCode('');
          return;
        }
      }
      
      // For new doormats, we need to select type
      setSelectedQrCode(qrCode);
      setWasUsingCamera(false);
      setShowTypeDialog(true);
    }
  };

  const handlePredefinedQrClick = async (qrCode: string) => {
    // For sent_by_inventar doormats, show type dialog to activate them
    setSelectedQrCode(qrCode);
    setWasUsingCamera(false);
    setShowTypeDialog(true);
  };

  const handleTypeSelect = (type: string) => {
    if (selectedQrCode) {
      onScan(selectedQrCode, type);
      setShowTypeDialog(false);
      setSelectedQrCode(null);
      setManualQrCode('');
      // Keep camera open for continuous scanning only if camera was used
      if (wasUsingCamera) {
        setShowCamera(true);
      }
    }
  };

  const handleCameraScan = async (result: any) => {
    if (result?.text) {
      const qrCode = result.text;
      setShowCamera(false);
      
      // Check if doormat already exists
      if (checkIfExists) {
        const exists = await checkIfExists(qrCode);
        if (exists) {
          // Let parent handle existing doormat
          onScan(qrCode, '');
          setWasUsingCamera(true);
          return;
        }
      }
      
      setSelectedQrCode(qrCode);
      setWasUsingCamera(true);
      setShowTypeDialog(true);
    }
  };

  if (showCamera) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Skeniraj QR kodo</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCamera(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-primary">
          <QrReader
            onResult={handleCameraScan}
            constraints={{ facingMode: 'environment' }}
            containerStyle={{ width: '100%', height: '100%' }}
            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Postavi QR kodo v okvir za skeniranje
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Camera Icon and Title */}
        <div className="flex flex-col items-center gap-4 py-8">
          <button
            onClick={() => setShowCamera(true)}
            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Camera className="h-20 w-20 text-primary" strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-semibold">Skeniraj QR</h2>
        </div>

        {/* Manual QR Input */}
        <div className="space-y-3">
          <Input
            value={manualQrCode}
            onChange={(e) => setManualQrCode(e.target.value)}
            placeholder={`Vnesi QR (npr. ${qrPrefix}-001)`}
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
          <h3 className="font-semibold">
            {sentDoormats.length > 0 ? 'Neaktivne QR kode (od inventarja):' : 'Proste QR:'}
          </h3>
          {predefinedQrCodes.length > 0 ? (
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
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              {sentDoormats.length > 0 ? 'Ni neaktivnih QR kod' : 'Vse QR kode so že uporabljene'}
            </p>
          )}
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

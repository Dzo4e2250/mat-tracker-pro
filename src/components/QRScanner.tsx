import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrCode: string, type: string) => void;
}

const DOORMAT_TYPES = ['MBW0', 'MBW1', 'MBW2', 'MBW4', 'ERM10R', 'ERM11R'];

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const handleSubmit = () => {
    if (qrCode && selectedType) {
      onScan(qrCode, selectedType);
      setQrCode('');
      setSelectedType('');
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="lg" className="w-full">
        <QrCode className="mr-2 h-5 w-5" />
        Skeniraj QR kodo
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skeniraj QR kodo</DialogTitle>
            <DialogDescription>
              Vnesi QR kodo in izberi vrsto predpražnika
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="qr-code">QR koda</Label>
              <Input
                id="qr-code"
                placeholder="Vnesi QR kodo"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Vrsta predpražnika</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Izberi vrsto" />
                </SelectTrigger>
                <SelectContent>
                  {DOORMAT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Prekliči
            </Button>
            <Button onClick={handleSubmit} disabled={!qrCode || !selectedType}>
              Potrdi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

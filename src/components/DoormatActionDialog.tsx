import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DoormatActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceTest: () => void;
  doormatCode: string;
  doormatType: string;
}

export default function DoormatActionDialog({
  isOpen,
  onClose,
  onPlaceTest,
  doormatCode,
  doormatType,
}: DoormatActionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">{doormatCode}</DialogTitle>
          <p className="text-sm text-muted-foreground">{doormatType}</p>
        </DialogHeader>
        <div className="py-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={onPlaceTest}
          >
            Daj na test
          </Button>
          <Button 
            className="w-full mt-3" 
            size="lg"
            variant="outline"
            onClick={onClose}
          >
            Zapri
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

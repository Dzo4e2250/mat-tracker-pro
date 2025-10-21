import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DoormatActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceTest: () => void;
  onCollect?: () => void;
  onSignContract?: () => void;
  onExtend?: () => void;
  isExpiring?: boolean;
  doormatCode: string;
}

export default function DoormatActionDialog({
  isOpen,
  onClose,
  onPlaceTest,
  onCollect,
  onSignContract,
  onExtend,
  isExpiring = false,
  doormatCode,
}: DoormatActionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{doormatCode}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {!isExpiring ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={onPlaceTest}
            >
              Položil test
            </Button>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={onCollect}
              >
                Pobral
              </Button>
              <Button 
                className="w-full" 
                size="lg"
                onClick={onSignContract}
              >
                Podpis pogodbe
              </Button>
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
                onClick={onExtend}
              >
                Podaljšaj za dodatnih 7 dni
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

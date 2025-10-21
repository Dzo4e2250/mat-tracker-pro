import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TestPlacement } from '@/pages/ProdajalecDashboard';
import { differenceInDays, differenceInHours } from 'date-fns';

interface TestDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCollect: () => void;
  onSignContract: () => void;
  testPlacement: TestPlacement;
  doormatCode: string;
  doormatType: string;
}

export default function TestDetailsDialog({
  isOpen,
  onClose,
  onCollect,
  onSignContract,
  testPlacement,
  doormatCode,
  doormatType,
}: TestDetailsDialogProps) {
  const now = new Date();
  const expiresAt = new Date(testPlacement.expires_at);
  const totalHours = differenceInHours(expiresAt, now);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const isExpiring = days <= 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{doormatCode}</DialogTitle>
          <p className="text-sm text-muted-foreground">{doormatType}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Podjetje:</p>
              <p className="font-semibold text-lg">{testPlacement.company_name}</p>
            </div>

            {testPlacement.contact_person && (
              <div>
                <p className="text-sm text-muted-foreground">Kontaktna oseba:</p>
                <p className="font-medium">{testPlacement.contact_person}</p>
              </div>
            )}

            {testPlacement.contact_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefon:</p>
                <p className="font-medium text-blue-600">{testPlacement.contact_phone}</p>
              </div>
            )}

            {testPlacement.contact_email && (
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium text-blue-600">{testPlacement.contact_email}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Preostali čas:</p>
            <div className={`flex items-center gap-2 text-2xl font-bold ${isExpiring ? 'text-red-600' : 'text-primary'}`}>
              <span>⏰</span>
              <span>{days}d {hours}h</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Začetek: {new Date(testPlacement.placed_at).toLocaleDateString('sl-SI')}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600" 
              size="lg"
              onClick={onCollect}
            >
              Pobrano
            </Button>
            <Button 
              className="w-full bg-purple-500 hover:bg-purple-600" 
              size="lg"
              onClick={onSignContract}
            >
              Pogodba
            </Button>
            <Button 
              className="w-full" 
              size="lg"
              variant="outline"
              onClick={onClose}
            >
              Zapri
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

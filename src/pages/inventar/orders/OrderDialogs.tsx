import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { OrderWithSeller } from './useOrderQueries';
import type { SellerStats } from '@/hooks/useInventoryStats';

interface ApproveDialogProps {
  order: OrderWithSeller | null;
  sellerStats: SellerStats | null | undefined;
  onClose: () => void;
  onApprove: (quantity: number) => void;
  isPending: boolean;
}

export function ApproveDialog({
  order,
  sellerStats,
  onClose,
  onApprove,
  isPending,
}: ApproveDialogProps) {
  const [approvedQuantity, setApprovedQuantity] = useState<string>(String(order?.quantity || ''));

  // Update quantity when order changes
  if (order && approvedQuantity === '') {
    setApprovedQuantity(String(order.quantity));
  }

  const handleClose = () => {
    setApprovedQuantity('');
    onClose();
  };

  const quantityNum = parseInt(approvedQuantity) || 0;

  return (
    <Dialog open={!!order} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odobri naročilo</DialogTitle>
          <DialogDescription>
            Naročilo za {order?.salespersonName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {order && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Zahtevana količina:</span>
                  <span className="font-semibold">{order.quantity}</span>
                </div>
                {sellerStats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trenutno čistih:</span>
                      <span>{sellerStats.clean}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Skupaj aktivnih:</span>
                      <span>{sellerStats.total}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="approved_quantity">Odobrena količina</Label>
                <Input
                  id="approved_quantity"
                  type="text"
                  inputMode="numeric"
                  value={approvedQuantity}
                  onChange={(e) => setApprovedQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Prekliči
          </Button>
          <Button
            onClick={() => onApprove(quantityNum)}
            disabled={isPending || quantityNum < 1 || !order?.salespersonPrefix}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Odobri in generiraj kode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectDialogProps {
  order: OrderWithSeller | null;
  onClose: () => void;
  onReject: (reason: string) => void;
  isPending: boolean;
}

export function RejectDialog({
  order,
  onClose,
  onReject,
  isPending,
}: RejectDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('');

  const handleClose = () => {
    setRejectionReason('');
    onClose();
  };

  return (
    <AlertDialog open={!!order} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zavrni naročilo?</AlertDialogTitle>
          <AlertDialogDescription>
            Naročilo za {order?.salespersonName} ({order?.quantity} kod)
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="rejection_reason">Razlog zavrnitve</Label>
          <Textarea
            id="rejection_reason"
            placeholder="Vpišite razlog zavrnitve..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Prekliči</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              onReject(rejectionReason);
              setRejectionReason('');
            }}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zavrni
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ShipDialogProps {
  order: OrderWithSeller | null;
  onClose: () => void;
  onShip: () => void;
  isPending: boolean;
}

export function ShipDialog({
  order,
  onClose,
  onShip,
  isPending,
}: ShipDialogProps) {
  return (
    <AlertDialog open={!!order} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Označi kot poslano?</AlertDialogTitle>
          <AlertDialogDescription>
            Potrdi, da so bili predpražniki fizično poslani prodajalcu{' '}
            {order?.salespersonName}. QR kode so bile že generirane ob
            odobritvi naročila.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Prekliči</AlertDialogCancel>
          <AlertDialogAction onClick={onShip} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Potrdi pošiljanje
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

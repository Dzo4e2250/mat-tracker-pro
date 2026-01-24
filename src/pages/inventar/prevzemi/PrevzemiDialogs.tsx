/**
 * @file PrevzemiDialogs.tsx
 * @description Dialogi za Prevzemi stran
 */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  region?: string | null;
}

interface CreatePickupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  drivers: Driver[] | undefined;
  selectedDriver: string;
  setSelectedDriver: (value: string) => void;
  scheduledDate: string;
  setScheduledDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CreatePickupDialog({
  isOpen,
  onClose,
  selectedCount,
  drivers,
  selectedDriver,
  setSelectedDriver,
  scheduledDate,
  setScheduledDate,
  notes,
  setNotes,
  onSubmit,
  isPending,
}: CreatePickupDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ustvari prevzem</DialogTitle>
          <DialogDescription>
            Ustvari nov prevzem za {selectedCount} izbranih predpražnikov.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="driver">Dostavljalec</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Izberi dostavljalca..." />
              </SelectTrigger>
              <SelectContent>
                {drivers?.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                    {driver.region && <span className="text-gray-400 ml-2">({driver.region})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">Datum prevzema</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Opombe</Label>
            <Textarea
              id="notes"
              placeholder="Dodatne opombe za šoferja..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Prekliči</Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ustvari prevzem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  title: string;
  description: string;
  confirmText: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  title,
  description,
  confirmText,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Prekliči</AlertDialogCancel>
          <AlertDialogAction
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

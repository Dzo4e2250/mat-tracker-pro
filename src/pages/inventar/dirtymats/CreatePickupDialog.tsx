/**
 * @file CreatePickupDialog.tsx
 * @description Dialog za ustvarjanje prevzema
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface CreatePickupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  scheduledDate: string;
  onScheduledDateChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CreatePickupDialog({
  isOpen,
  onClose,
  selectedCount,
  scheduledDate,
  onScheduledDateChange,
  notes,
  onNotesChange,
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
            <Label htmlFor="scheduled_date">Datum prevzema</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={scheduledDate}
              onChange={(e) => onScheduledDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Opombe</Label>
            <Textarea
              id="notes"
              placeholder="Dodatne opombe za šoferja..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Prekliči
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ustvari prevzem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

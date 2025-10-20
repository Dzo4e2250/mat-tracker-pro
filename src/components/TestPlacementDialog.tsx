import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface TestPlacementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TestPlacementData) => void;
}

export interface TestPlacementData {
  companyName: string;
  contactPerson?: string;
  contactRole?: string;
  contactPhone?: string;
  contactEmail?: string;
  taxNumber?: string;
}

export default function TestPlacementDialog({ isOpen, onClose, onSubmit }: TestPlacementDialogProps) {
  const [formData, setFormData] = useState<TestPlacementData>({
    companyName: '',
    contactPerson: '',
    contactRole: '',
    contactPhone: '',
    contactEmail: '',
    taxNumber: '',
  });

  const handleSubmit = () => {
    if (formData.companyName) {
      onSubmit(formData);
      setFormData({
        companyName: '',
        contactPerson: '',
        contactRole: '',
        contactPhone: '',
        contactEmail: '',
        taxNumber: '',
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Podatki o testu</DialogTitle>
          <DialogDescription>
            Vnesi podatke o stranki. Obvezno je samo ime podjetja.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="company-name">
              Ime podjetja <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-name"
              placeholder="Vnesi ime podjetja"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-person">Kontaktna oseba</Label>
              <Input
                id="contact-person"
                placeholder="Ime in priimek"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-role">Vloga</Label>
              <Input
                id="contact-role"
                placeholder="Npr. direktor, vodja nabave"
                value={formData.contactRole}
                onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Telefon</Label>
              <Input
                id="contact-phone"
                placeholder="+386 ..."
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="email@primer.si"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tax-number">Davčna številka</Label>
            <Input
              id="tax-number"
              placeholder="SI12345678"
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Prekliči
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.companyName}>
            Položi na test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

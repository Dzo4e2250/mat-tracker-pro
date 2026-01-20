import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, Plus, Pencil, Trash2, RotateCcw, Loader2, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeactivateDriver,
  useReactivateDriver,
} from '@/hooks/useDrivers';
import type { Driver } from '@/integrations/supabase/types';

export default function DriversManagement() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRegion, setFormRegion] = useState('');

  const { data: drivers, isLoading } = useDrivers(showInactive);
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deactivateDriver = useDeactivateDriver();
  const reactivateDriver = useReactivateDriver();

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRegion('');
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setFormName(driver.name);
    setFormPhone(driver.phone || '');
    setFormRegion(driver.region || '');
    setIsEditDialogOpen(true);
  };

  const handleDelete = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = async () => {
    if (!formName.trim()) {
      toast({
        title: 'Napaka',
        description: 'Ime dostavljalca je obvezno',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createDriver.mutateAsync({
        name: formName.trim(),
        phone: formPhone.trim() || null,
        region: formRegion.trim() || null,
      });

      toast({
        title: 'Uspeh',
        description: 'Dostavljalec je bil dodan',
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Napaka',
        description: 'Ni bilo mogoče dodati dostavljalca',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedDriver || !formName.trim()) {
      toast({
        title: 'Napaka',
        description: 'Ime dostavljalca je obvezno',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateDriver.mutateAsync({
        id: selectedDriver.id,
        updates: {
          name: formName.trim(),
          phone: formPhone.trim() || null,
          region: formRegion.trim() || null,
        },
      });

      toast({
        title: 'Uspeh',
        description: 'Dostavljalec je bil posodobljen',
      });

      setIsEditDialogOpen(false);
      setSelectedDriver(null);
      resetForm();
    } catch (error) {
      toast({
        title: 'Napaka',
        description: 'Ni bilo mogoče posodobiti dostavljalca',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDriver) return;

    try {
      await deactivateDriver.mutateAsync(selectedDriver.id);

      toast({
        title: 'Uspeh',
        description: 'Dostavljalec je bil deaktiviran',
      });

      setIsDeleteDialogOpen(false);
      setSelectedDriver(null);
    } catch (error) {
      toast({
        title: 'Napaka',
        description: 'Ni bilo mogoče deaktivirati dostavljalca',
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = async (driver: Driver) => {
    try {
      await reactivateDriver.mutateAsync(driver.id);

      toast({
        title: 'Uspeh',
        description: 'Dostavljalec je bil ponovno aktiviran',
      });
    } catch (error) {
      toast({
        title: 'Napaka',
        description: 'Ni bilo mogoče aktivirati dostavljalca',
        variant: 'destructive',
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Dostavljalci</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showInactive"
                  checked={showInactive}
                  onCheckedChange={(checked) => setShowInactive(!!checked)}
                />
                <label htmlFor="showInactive" className="text-sm text-gray-600 cursor-pointer">
                  Prikaži neaktivne
                </label>
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj dostavljalca
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seznam dostavljalcev</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : !drivers || drivers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Ni dostavljalcev. Dodaj prvega dostavljalca.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ime</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Regija</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id} className={!driver.is_active ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          {driver.phone ? (
                            <a
                              href={`tel:${driver.phone}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {driver.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.region ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {driver.region}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Aktiven</Badge>
                          ) : (
                            <Badge variant="secondary">Neaktiven</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {driver.is_active ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(driver)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(driver)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(driver)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Aktiviraj
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj dostavljalca</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ime *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ime in priimek"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+386 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Regija</Label>
                  <Input
                    id="region"
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    placeholder="npr. Ljubljana, Maribor, ..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Prekliči
                </Button>
                <Button onClick={handleSubmitAdd} disabled={createDriver.isPending}>
                  {createDriver.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Dodaj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Uredi dostavljalca</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Ime *</Label>
                  <Input
                    id="editName"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ime in priimek"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Telefon</Label>
                  <Input
                    id="editPhone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+386 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRegion">Regija</Label>
                  <Input
                    id="editRegion"
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    placeholder="npr. Ljubljana, Maribor, ..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Prekliči
                </Button>
                <Button onClick={handleSubmitEdit} disabled={updateDriver.isPending}>
                  {updateDriver.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Shrani
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deaktiviraj dostavljalca?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dostavljalec {selectedDriver?.name} bo deaktiviran in ne bo več prikazan v seznamu.
                  Lahko ga pozneje ponovno aktiviraš.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Deaktiviraj
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </SidebarProvider>
  );
}

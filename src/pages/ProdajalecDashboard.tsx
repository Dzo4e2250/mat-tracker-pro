import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, Clock, Package, Trash2, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import QRScanner from '@/components/QRScanner';
import TestPlacementDialog, { TestPlacementData } from '@/components/TestPlacementDialog';
import { differenceInDays, format } from 'date-fns';
import { sl } from 'date-fns/locale';

interface Doormat {
  id: string;
  qr_code: string;
  type: string;
  status: string;
}

interface TestPlacement {
  id: string;
  doormat_id: string;
  company_name: string;
  contact_person: string | null;
  placed_at: string;
  expires_at: string;
  extended_count: number;
  status: string;
  doormats: Doormat;
}

export default function ProdajalecDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sentDoormats, setSentDoormats] = useState<Doormat[]>([]);
  const [cleanDoormats, setCleanDoormats] = useState<Doormat[]>([]);
  const [onTestDoormats, setOnTestDoormats] = useState<TestPlacement[]>([]);
  const [dirtyDoormats, setDirtyDoormats] = useState<Doormat[]>([]);
  const [scannedDoormat, setScannedDoormat] = useState<Doormat | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'test' | 'cancel' | null>(null);

  useEffect(() => {
    if (user) {
      fetchDoormats();
      fetchTests();
      checkExpiringTests();
    }
  }, [user]);

  const fetchDoormats = async () => {
    try {
      const { data, error } = await supabase
        .from('doormats')
        .select('*')
        .eq('seller_id', user?.id);

      if (error) throw error;

      const sent = data?.filter(d => d.status === 'sent_by_inventar') || [];
      const clean = data?.filter(d => d.status === 'with_seller') || [];
      const dirty = data?.filter(d => d.status === 'dirty') || [];

      setSentDoormats(sent);
      setCleanDoormats(clean);
      setDirtyDoormats(dirty);

      if (dirty.length >= 10) {
        toast.warning('Imate 10 ali več umazanih predpražnikov. Kontaktirajte inventar.');
      }
    } catch (error: any) {
      console.error('Error fetching doormats:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('test_placements')
        .select('*, doormats(*)')
        .eq('seller_id', user?.id)
        .eq('status', 'active')
        .order('expires_at', { ascending: true });

      if (error) throw error;
      setOnTestDoormats(data || []);
    } catch (error: any) {
      console.error('Error fetching tests:', error);
    }
  };

  const checkExpiringTests = async () => {
    try {
      const { data, error } = await supabase
        .from('test_placements')
        .select('*, doormats(*)')
        .eq('seller_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;

      const now = new Date();
      data?.forEach(test => {
        const expiresAt = new Date(test.expires_at);
        const daysLeft = differenceInDays(expiresAt, now);

        if (daysLeft === 1) {
          toast.info(`Test pri ${test.company_name} se izteče jutri!`);
        } else if (daysLeft === 0) {
          toast.warning(`Test pri ${test.company_name} se izteče danes!`);
        } else if (daysLeft < 0) {
          toast.error(`Test pri ${test.company_name} je potekel!`);
        }
      });
    } catch (error: any) {
      console.error('Error checking expiring tests:', error);
    }
  };

  const handleQRScan = async (qrCode: string, type: string) => {
    try {
      const { data: existingDoormat, error: fetchError } = await supabase
        .from('doormats')
        .select('*')
        .eq('qr_code', qrCode)
        .eq('seller_id', user?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingDoormat) {
        setScannedDoormat(existingDoormat);
        if (existingDoormat.status === 'with_seller') {
          setShowActionDialog(true);
        } else {
          toast.info('Predpražnik je že v sistemu');
        }
      } else {
        const sentDoormat = sentDoormats.find(d => d.qr_code === qrCode && d.type === type);
        if (sentDoormat) {
          const { error: updateError } = await supabase
            .from('doormats')
            .update({ status: 'with_seller' })
            .eq('id', sentDoormat.id);

          if (updateError) throw updateError;

          toast.success('Predpražnik dodan na seznam čistih');
          fetchDoormats();
        } else {
          toast.error('Ta predpražnik vam ni bil poslan');
        }
      }
    } catch (error: any) {
      console.error('Error handling QR scan:', error);
      toast.error('Napaka pri skeniranju');
    }
  };

  const handleTestPlacement = async (data: TestPlacementData) => {
    if (!scannedDoormat) return;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: testError } = await supabase
        .from('test_placements')
        .insert({
          doormat_id: scannedDoormat.id,
          seller_id: user?.id,
          company_name: data.companyName,
          contact_person: data.contactPerson,
          contact_role: data.contactRole,
          contact_phone: data.contactPhone,
          contact_email: data.contactEmail,
          tax_number: data.taxNumber,
          expires_at: expiresAt.toISOString(),
        });

      if (testError) throw testError;

      const { error: doormatError } = await supabase
        .from('doormats')
        .update({ status: 'on_test' })
        .eq('id', scannedDoormat.id);

      if (doormatError) throw doormatError;

      const { error: contactError } = await supabase
        .from('contacts')
        .insert({
          seller_id: user?.id,
          company_name: data.companyName,
          contact_person: data.contactPerson,
          contact_role: data.contactRole,
          contact_phone: data.contactPhone,
          contact_email: data.contactEmail,
          tax_number: data.taxNumber,
        });

      if (contactError) throw contactError;

      toast.success('Test uspešno ustvarjen');
      setShowTestDialog(false);
      setScannedDoormat(null);
      fetchDoormats();
      fetchTests();
    } catch (error: any) {
      console.error('Error placing test:', error);
      toast.error('Napaka pri postavljanju testa');
    }
  };

  const handleActionSelect = (action: 'test' | 'cancel') => {
    setSelectedAction(action);
    setShowActionDialog(false);

    if (action === 'test') {
      setShowTestDialog(true);
    } else {
      toast.info('Skeniranje preklicano');
      setScannedDoormat(null);
    }
  };

  const handleCollectTest = async (testId: string, doormatId: string) => {
    try {
      const { error: testError } = await supabase
        .from('test_placements')
        .update({ status: 'collected' })
        .eq('id', testId);

      if (testError) throw testError;

      const { error: doormatError } = await supabase
        .from('doormats')
        .update({ status: 'dirty' })
        .eq('id', doormatId);

      if (doormatError) throw doormatError;

      toast.success('Predpražnik označen kot umazan');
      fetchDoormats();
      fetchTests();
    } catch (error: any) {
      console.error('Error collecting test:', error);
      toast.error('Napaka pri pobiranju');
    }
  };

  const handleExtendTest = async (testId: string) => {
    try {
      const test = onTestDoormats.find(t => t.id === testId);
      if (!test) return;

      const newExpiresAt = new Date(test.expires_at);
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error } = await supabase
        .from('test_placements')
        .update({
          expires_at: newExpiresAt.toISOString(),
          extended_count: test.extended_count + 1
        })
        .eq('id', testId);

      if (error) throw error;

      toast.success('Test podaljšan za 7 dni');
      fetchTests();
    } catch (error: any) {
      console.error('Error extending test:', error);
      toast.error('Napaka pri podaljšanju');
    }
  };

  const getDaysLeft = (expiresAt: string) => {
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 0) return <span className="text-destructive">Poteklo</span>;
    if (days === 0) return <span className="text-destructive">Danes!</span>;
    if (days === 1) return <span className="text-orange-500">1 dan</span>;
    return <span>{days} dni</span>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prodajalec Dashboard</h1>
            <p className="text-muted-foreground">Upravljanje mojih predpražnikov</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Odjava
          </Button>
        </div>

        <div className="mb-6">
          <QRScanner onScan={handleQRScan} />
        </div>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Poslano</CardTitle>
                <CardDescription>Od inventarja</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{sentDoormats.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Čisti</CardTitle>
                <CardDescription>Pri meni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{cleanDoormats.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Na testu</CardTitle>
                <CardDescription>Pri strankah</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{onTestDoormats.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Umazani</CardTitle>
                <CardDescription>Za čiščenje</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{dirtyDoormats.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Testi v teku</span>
                <Button variant="outline" size="sm" onClick={() => navigate('/contacts')}>
                  <Users className="mr-2 h-4 w-4" />
                  Kontakti
                </Button>
              </CardTitle>
              <CardDescription>Predpražniki na testiranju pri strankah</CardDescription>
            </CardHeader>
            <CardContent>
              {onTestDoormats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ni aktivnih testov
                </p>
              ) : (
                <div className="space-y-4">
                  {onTestDoormats.map((test) => (
                    <div key={test.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{test.company_name}</h3>
                          {test.contact_person && (
                            <p className="text-sm text-muted-foreground">{test.contact_person}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {test.doormats.type} - {test.doormats.qr_code}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-4 w-4" />
                            {getDaysLeft(test.expires_at)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(test.expires_at), 'dd. MMM yyyy', { locale: sl })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExtendTest(test.id)}
                        >
                          Podaljšaj za 7 dni
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCollectTest(test.id, test.doormat_id)}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Pobral sem
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Umazani predpražniki</CardTitle>
              <CardDescription>Čakajo na pobiranje inventarja</CardDescription>
            </CardHeader>
            <CardContent>
              {dirtyDoormats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ni umazanih predpražnikov
                </p>
              ) : (
                <div className="space-y-2">
                  {dirtyDoormats.map((doormat) => (
                    <div key={doormat.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">{doormat.type}</p>
                        <p className="text-sm text-muted-foreground">{doormat.qr_code}</p>
                      </div>
                      <Trash2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <TestPlacementDialog
          isOpen={showTestDialog}
          onClose={() => {
            setShowTestDialog(false);
            setScannedDoormat(null);
          }}
          onSubmit={handleTestPlacement}
        />

        <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Predpražnik že dodan</AlertDialogTitle>
              <AlertDialogDescription>
                Ta predpražnik je že na seznamu čistih. Ali ga želite dati na test ali ste ga skenirali po pomoti?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleActionSelect('cancel')}>
                Preklic
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleActionSelect('test')}>
                Daj na test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

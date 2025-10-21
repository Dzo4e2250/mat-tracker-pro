import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Home, Camera, Package, Heart, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import QRScanner from '@/components/QRScanner';
import TestPlacementDialog, { TestPlacementData } from '@/components/TestPlacementDialog';
import { differenceInDays } from 'date-fns';

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
  const [showScanner, setShowScanner] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDoormats();
      fetchTests();
      checkExpiringTests();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

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
      // Check if this QR code already exists for this user
      const { data: existingDoormat, error: fetchError } = await supabase
        .from('doormats')
        .select('*')
        .eq('qr_code', qrCode)
        .eq('seller_id', user?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingDoormat) {
        // Doormat already exists
        if (existingDoormat.status === 'with_seller') {
          setScannedDoormat(existingDoormat);
          setShowActionDialog(true);
        } else {
          toast.info('Predpražnik je že v sistemu');
        }
      } else {
        // Create new doormat entry with 'with_seller' status
        const { error: insertError } = await supabase
          .from('doormats')
          .insert([{
            qr_code: qrCode,
            type: type as any,
            status: 'with_seller',
            seller_id: user?.id
          }]);

        if (insertError) throw insertError;

        toast.success('Predpražnik dodan na seznam čistih');
        setShowScanner(false);
        fetchDoormats();
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
      setShowScanner(false);
      setScannedDoormat(null);
      fetchDoormats();
      fetchTests();
    } catch (error: any) {
      console.error('Error placing test:', error);
      toast.error('Napaka pri postavljanju testa');
    }
  };

  const handleActionSelect = (action: 'test' | 'cancel') => {
    setShowActionDialog(false);

    if (action === 'test') {
      setShowTestDialog(true);
    } else {
      toast.info('Skeniranje preklicano');
      setScannedDoormat(null);
    }
  };

  const totalDoormats = cleanDoormats.length + onTestDoormats.length + dirtyDoormats.length;
  const allDoormats = [...cleanDoormats, ...onTestDoormats.map(t => t.doormats), ...dirtyDoormats];
  const usedQrCodes = allDoormats.map(d => d.qr_code);

  if (showScanner) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Skeniranje</h1>
              <p className="text-sm opacity-90">{userProfile?.full_name || 'Prodajalec'}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowScanner(false)}>
              Nazaj
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          <QRScanner onScan={handleQRScan} usedQrCodes={usedQrCodes} />
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
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Lindström</h1>
            <p className="text-sm opacity-90">{userProfile?.full_name || 'George'} (PRODAJALEC)</p>
          </div>
          <Button variant="secondary" size="sm" onClick={signOut}>
            Preklopi
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 pb-24">
        <h2 className="text-xl font-bold mb-4">Moji predpražniki</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-red-700" />
                <span className="text-sm text-muted-foreground">Skupaj</span>
              </div>
              <div className="text-3xl font-bold">{totalDoormats}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Čisti</span>
              </div>
              <div className="text-3xl font-bold">{cleanDoormats.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
                <span className="text-sm text-muted-foreground">Na testu</span>
              </div>
              <div className="text-3xl font-bold">{onTestDoormats.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="h-5 w-5 text-orange-600 fill-orange-600" />
                <span className="text-sm text-muted-foreground">Umazani</span>
              </div>
              <div className="text-3xl font-bold">{dirtyDoormats.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* List Section */}
        <div>
          <h3 className="text-lg font-bold mb-3">Seznam</h3>
          <Card>
            <CardContent className="p-6">
              {allDoormats.length === 0 ? (
                <p className="text-center text-muted-foreground">Ni predpražnikov</p>
              ) : (
                <div className="space-y-2">
                  {allDoormats.map((doormat) => (
                    <div key={doormat.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{doormat.type}</p>
                        <p className="text-sm text-muted-foreground">{doormat.qr_code}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                        {doormat.status === 'with_seller' ? 'Čist' : 
                         doormat.status === 'on_test' ? 'Na testu' : 
                         doormat.status === 'dirty' ? 'Umazan' : doormat.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-primary">
            <Home className="h-6 w-6" />
            <span className="text-xs">Domov</span>
          </button>
          
          <button 
            onClick={() => setShowScanner(true)}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">Skeniraj</span>
          </button>
          
          <Button 
            className="h-12 px-6"
            onClick={() => navigate('/contacts')}
          >
            Pls Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

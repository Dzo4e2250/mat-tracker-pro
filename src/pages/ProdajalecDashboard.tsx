import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Home, Camera, Package, Heart, Circle, Search } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import QRScanner from '@/components/QRScanner';
import TestPlacementDialog, { TestPlacementData } from '@/components/TestPlacementDialog';
import DoormatActionDialog from '@/components/DoormatActionDialog';
import TestDetailsDialog from '@/components/TestDetailsDialog';
import { differenceInDays } from 'date-fns';

export interface TestPlacement {
  id: string;
  doormat_id: string;
  company_name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  placed_at: string;
  expires_at: string;
  extended_count: number;
  status: string;
  doormats: Doormat;
}

interface Doormat {
  id: string;
  qr_code: string;
  type: string;
  status: string;
}


export default function ProdajalecDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sentDoormats, setSentDoormats] = useState<Doormat[]>([]);
  const [cleanDoormats, setCleanDoormats] = useState<Doormat[]>([]);
  const [onTestDoormats, setOnTestDoormats] = useState<TestPlacement[]>([]);
  const [dirtyDoormats, setDirtyDoormats] = useState<Doormat[]>([]);
  const [waitingForDriverDoormats, setWaitingForDriverDoormats] = useState<Doormat[]>([]);
  const [scannedDoormat, setScannedDoormat] = useState<Doormat | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDoormatActionDialog, setShowDoormatActionDialog] = useState(false);
  const [showTestDetailsDialog, setShowTestDetailsDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; qr_prefix: string | null; qr_end_num: number | null } | null>(null);
  const [selectedDoormatForAction, setSelectedDoormatForAction] = useState<{ doormat: Doormat; testPlacement?: TestPlacement } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        .select('full_name, qr_prefix, qr_end_num')
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
      const waitingForDriver = data?.filter(d => d.status === 'waiting_for_driver') || [];

      setSentDoormats(sent);
      setCleanDoormats(clean);
      setDirtyDoormats(dirty);
      setWaitingForDriverDoormats(waitingForDriver);

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

  const checkIfDoormatExists = async (qrCode: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('doormats')
        .select('id')
        .eq('qr_code', qrCode)
        .eq('seller_id', user?.id)
        .maybeSingle();
      
      return !!data;
    } catch (error) {
      console.error('Error checking doormat:', error);
      return false;
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
        // Type must be provided for new doormats
        if (!type) {
          toast.error('Napaka: tip ni izbran');
          return;
        }
        
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
          comment: data.comment,
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

  const handleDoormatClick = (doormat: Doormat) => {
    const testPlacement = onTestDoormats.find(t => t.doormat_id === doormat.id);
    setSelectedDoormatForAction({ doormat, testPlacement });
    
    if (testPlacement) {
      // If doormat is on test, show test details dialog
      setShowTestDetailsDialog(true);
    } else {
      // If doormat is clean, show place on test dialog
      setShowDoormatActionDialog(true);
    }
  };

  const handlePlaceTest = () => {
    setShowDoormatActionDialog(false);
    setScannedDoormat(selectedDoormatForAction?.doormat || null);
    setShowTestDialog(true);
  };

  const handleCollectDoormat = async () => {
    if (!selectedDoormatForAction?.testPlacement) return;

    try {
      const { error: testError } = await supabase
        .from('test_placements')
        .update({ status: 'collected' })
        .eq('id', selectedDoormatForAction.testPlacement.id);

      if (testError) throw testError;

      const { error: doormatError } = await supabase
        .from('doormats')
        .update({ status: 'dirty' })
        .eq('id', selectedDoormatForAction.doormat.id);

      if (doormatError) throw doormatError;

      toast.success('Predpražnik pobran - dodan med umazane');
      setShowTestDetailsDialog(false);
      setSelectedDoormatForAction(null);
      fetchDoormats();
      fetchTests();
    } catch (error: any) {
      console.error('Error collecting doormat:', error);
      toast.error('Napaka pri pobiranju predpražnika');
    }
  };

  const handleSignContract = async () => {
    if (!selectedDoormatForAction?.testPlacement) return;

    try {
      const { error: testError } = await supabase
        .from('test_placements')
        .update({ status: 'signed' })
        .eq('id', selectedDoormatForAction.testPlacement.id);

      if (testError) throw testError;

      const { error: doormatError } = await supabase
        .from('doormats')
        .update({ status: 'waiting_for_driver' })
        .eq('id', selectedDoormatForAction.doormat.id);

      if (doormatError) throw doormatError;

      toast.success('Pogodba podpisana - čaka šoferja!');
      setShowTestDetailsDialog(false);
      setSelectedDoormatForAction(null);
      fetchDoormats();
      fetchTests();
    } catch (error: any) {
      console.error('Error signing contract:', error);
      toast.error('Napaka pri podpisu pogodbe');
    }
  };


  const totalDoormats = cleanDoormats.length + onTestDoormats.length + dirtyDoormats.length + waitingForDriverDoormats.length;
  const allDoormats = [...cleanDoormats, ...onTestDoormats.map(t => t.doormats), ...dirtyDoormats, ...waitingForDriverDoormats];
  const usedQrCodes = allDoormats.map(d => d.qr_code);

  // Filtered doormats based on status and search
  const filteredDoormats = useMemo(() => {
    let filtered = allDoormats;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doormat => doormat.status === filterStatus);
    }

    // Filter by search query (QR code or company name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doormat => {
        const testPlacement = onTestDoormats.find(t => t.doormat_id === doormat.id);
        const companyName = testPlacement?.company_name?.toLowerCase() || '';
        return doormat.qr_code.toLowerCase().includes(query) || companyName.includes(query);
      });
    }

    return filtered;
  }, [allDoormats, filterStatus, searchQuery, onTestDoormats]);

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
        
        <div className="p-4 pb-24">
          <QRScanner 
            onScan={handleQRScan}
            checkIfExists={checkIfDoormatExists}
            usedQrCodes={usedQrCodes}
            qrPrefix={userProfile?.qr_prefix || "PRED"}
            qrMaxNumber={userProfile?.qr_end_num || 200}
          />
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

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <button 
              onClick={() => setShowScanner(false)}
              className="flex flex-col items-center gap-1 text-primary"
            >
              <Home className="h-6 w-6" />
              <span className="text-xs">Domov</span>
            </button>
            
            <button className="flex flex-col items-center gap-1 text-muted-foreground">
              <Camera className="h-6 w-6" />
              <span className="text-xs">Skeniraj</span>
            </button>
            
            <button 
              onClick={() => navigate('/contacts')}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Circle className="h-6 w-6" />
              <span className="text-xs">Kontakti</span>
            </button>
          </div>
        </div>
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

          <Card className="bg-purple-50 border-purple-100 col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="h-5 w-5 text-purple-600 fill-purple-600" />
                <span className="text-sm text-muted-foreground">Čaka šoferja</span>
              </div>
              <div className="text-3xl font-bold">{waitingForDriverDoormats.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* List Section */}
        <div>
          <h3 className="text-lg font-bold mb-3">Seznam</h3>
          
          {/* Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Iskanje po QR kodi ali podjetju..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtriraj po statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vsi predpražniki</SelectItem>
                <SelectItem value="with_seller">Čisti</SelectItem>
                <SelectItem value="on_test">Na testu</SelectItem>
                <SelectItem value="dirty">Umazani</SelectItem>
                <SelectItem value="waiting_for_driver">Čaka šoferja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-6">
              {filteredDoormats.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  {allDoormats.length === 0 ? 'Ni predpražnikov' : 'Ni rezultatov'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredDoormats.map((doormat) => {
                    const testPlacement = onTestDoormats.find(t => t.doormat_id === doormat.id);
                    const daysLeft = testPlacement ? differenceInDays(new Date(testPlacement.expires_at), new Date()) : null;
                    const isExpiring = daysLeft !== null && daysLeft <= 1;

                    return (
                      <div 
                        key={doormat.id} 
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${isExpiring ? 'border-red-500 bg-red-50' : ''}`}
                        onClick={() => handleDoormatClick(doormat)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{doormat.qr_code}</p>
                            <p className="text-sm text-muted-foreground">{doormat.type}</p>
                            {testPlacement && (
                              <div className="mt-2 space-y-1 text-sm">
                                <p className="font-medium text-blue-600">{testPlacement.company_name}</p>
                                <p className={`font-semibold flex items-center gap-1 ${isExpiring ? 'text-red-600' : 'text-primary'}`}>
                                  <span>⏰</span>
                                  {daysLeft !== null && daysLeft >= 0 
                                    ? `${daysLeft}d ${Math.floor((differenceInDays(new Date(testPlacement.expires_at), new Date()) * 24) % 24)}h` 
                                    : 'Potekel'}
                                </p>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            isExpiring ? 'bg-red-100 text-red-700' : 
                            doormat.status === 'waiting_for_driver' ? 'bg-purple-100 text-purple-700' :
                            doormat.status === 'on_test' ? 'bg-blue-100 text-blue-700' :
                            'bg-secondary'
                          }`}>
                            {doormat.status === 'with_seller' ? 'Čist' : 
                             doormat.status === 'on_test' ? 'Na testu' : 
                             doormat.status === 'dirty' ? 'Umazan' :
                             doormat.status === 'waiting_for_driver' ? 'Pogodba' : doormat.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
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
          
          <button 
            onClick={() => navigate('/contacts')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Circle className="h-6 w-6" />
            <span className="text-xs">Kontakti</span>
          </button>
        </div>
      </div>

      {/* Dialogs */}
      <TestPlacementDialog
        isOpen={showTestDialog}
        onClose={() => {
          setShowTestDialog(false);
          setScannedDoormat(null);
        }}
        onSubmit={handleTestPlacement}
      />

      <DoormatActionDialog
        isOpen={showDoormatActionDialog}
        onClose={() => {
          setShowDoormatActionDialog(false);
          setSelectedDoormatForAction(null);
        }}
        onPlaceTest={handlePlaceTest}
        doormatCode={selectedDoormatForAction?.doormat.qr_code || ''}
        doormatType={selectedDoormatForAction?.doormat.type || ''}
      />

      {selectedDoormatForAction?.testPlacement && (
        <TestDetailsDialog
          isOpen={showTestDetailsDialog}
          onClose={() => {
            setShowTestDetailsDialog(false);
            setSelectedDoormatForAction(null);
          }}
          onCollect={handleCollectDoormat}
          onSignContract={handleSignContract}
          testPlacement={selectedDoormatForAction.testPlacement}
          doormatCode={selectedDoormatForAction.doormat.qr_code}
          doormatType={selectedDoormatForAction.doormat.type}
        />
      )}
    </div>
  );
}

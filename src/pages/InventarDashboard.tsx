import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, UserPlus, Package, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DOORMAT_TYPES = ['MBW0', 'MBW1', 'MBW2', 'MBW4', 'ERM10R', 'ERM11R'];

interface Doormat {
  id: string;
  qr_code: string;
  type: string;
  status: string;
  seller_id: string | null;
  profiles?: { full_name: string };
}

interface Seller {
  id: string;
  full_name: string;
  profiles?: { full_name: string };
}

export default function InventarDashboard() {
  const { user, signOut } = useAuth();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isDoormatDialogOpen, setIsDoormatDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [doormatType, setDoormatType] = useState('');
  const [doormats, setDoormats] = useState<Doormat[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedDoormats, setSelectedDoormats] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchDoormats();
      fetchSellers();
    }
  }, [user]);

  const fetchDoormats = async () => {
    try {
      const { data, error } = await supabase
        .from('doormats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch seller names separately
      const doormatData = await Promise.all((data || []).map(async (doormat) => {
        if (doormat.seller_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', doormat.seller_id)
            .single();
          return { ...doormat, profiles: profile };
        }
        return doormat;
      }));
      
      setDoormats(doormatData as any);
    } catch (error: any) {
      console.error('Error fetching doormats:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (error) throw error;
      
      const sellersData = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', role.user_id)
          .single();
        
        return {
          id: role.user_id,
          full_name: profile?.full_name || 'Unknown',
          profiles: profile
        };
      }));
      
      setSellers(sellersData);
    } catch (error: any) {
      console.error('Error fetching sellers:', error);
    }
  };

  const handleCreateProdajalec = async () => {
    if (!email || !password || !fullName) return;

    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Uporabnik ni bil ustvarjen');

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: signUpData.user.id,
          role: 'PRODAJALEC',
        });

      if (roleError) throw roleError;

      toast.success('Prodajalec uspešno ustvarjen');
      setEmail('');
      setPassword('');
      setFullName('');
      setIsUserDialogOpen(false);
      fetchSellers();
    } catch (error: any) {
      console.error('Error creating prodajalec:', error);
      toast.error(error.message || 'Napaka pri ustvarjanju prodajalca');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDoormat = async () => {
    if (!qrCode || !doormatType) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('doormats')
        .insert([{
          qr_code: qrCode,
          type: doormatType as any,
          status: 'sent_by_inventar' as any
        }]);

      if (error) throw error;

      toast.success('Predpražnik dodan');
      setQrCode('');
      setDoormatType('');
      setIsDoormatDialogOpen(false);
      fetchDoormats();
    } catch (error: any) {
      console.error('Error adding doormat:', error);
      toast.error(error.message || 'Napaka pri dodajanju predpražnika');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendDoormats = async () => {
    if (!selectedSeller || selectedDoormats.length === 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('doormats')
        .update({ seller_id: selectedSeller })
        .in('id', selectedDoormats);

      if (error) throw error;

      toast.success(`${selectedDoormats.length} predpražnikov poslanih`);
      setSelectedDoormats([]);
      setSelectedSeller('');
      setIsSendDialogOpen(false);
      fetchDoormats();
    } catch (error: any) {
      console.error('Error sending doormats:', error);
      toast.error(error.message || 'Napaka pri pošiljanju predpražnikov');
    } finally {
      setIsLoading(false);
    }
  };

  const availableDoormats = doormats.filter(d => d.status === 'sent_by_inventar' && !d.seller_id);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventar Dashboard</h1>
            <p className="text-muted-foreground">Upravljanje predpražnikov in prodajalcev</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Odjava
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Prodajalci</CardTitle>
                <CardDescription>{sellers.length} aktivnih</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Dodaj prodajalca
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dodaj novega prodajalca</DialogTitle>
                      <DialogDescription>
                        Ustvari nov račun za prodajalca
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Ime in priimek</Label>
                        <Input
                          id="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Janez Novak"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="janez.novak@primer.si"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">Geslo</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateProdajalec} disabled={isLoading}>
                        {isLoading ? 'Ustvarjam...' : 'Ustvari prodajalca'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Predpražniki</CardTitle>
                <CardDescription>{doormats.length} skupaj</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isDoormatDialogOpen} onOpenChange={setIsDoormatDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Package className="mr-2 h-4 w-4" />
                      Dodaj predpražnik
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dodaj predpražnik</DialogTitle>
                      <DialogDescription>
                        Dodaj nov testni predpražnik v sistem
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="qr-code">QR koda</Label>
                        <Input
                          id="qr-code"
                          value={qrCode}
                          onChange={(e) => setQrCode(e.target.value)}
                          placeholder="Vnesi QR kodo"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Vrsta</Label>
                        <Select value={doormatType} onValueChange={setDoormatType}>
                          <SelectTrigger id="type">
                            <SelectValue placeholder="Izberi vrsto" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOORMAT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddDoormat} disabled={isLoading}>
                        {isLoading ? 'Dodajam...' : 'Dodaj'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pošlji testne</CardTitle>
                <CardDescription>{availableDoormats.length} na voljo</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={availableDoormats.length === 0}>
                      <Send className="mr-2 h-4 w-4" />
                      Pošlji prodajalcu
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Pošlji testne predpražnike</DialogTitle>
                      <DialogDescription>
                        Izberi predpražnike in prodajalca
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Prodajalec</Label>
                        <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                          <SelectTrigger>
                            <SelectValue placeholder="Izberi prodajalca" />
                          </SelectTrigger>
                          <SelectContent>
                            {sellers.map((seller) => (
                              <SelectItem key={seller.id} value={seller.id}>
                                {seller.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Predpražniki ({selectedDoormats.length} izbranih)</Label>
                        <div className="border rounded-md max-h-60 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>QR koda</TableHead>
                                <TableHead>Vrsta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {availableDoormats.map((doormat) => (
                                <TableRow key={doormat.id}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedDoormats.includes(doormat.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedDoormats([...selectedDoormats, doormat.id]);
                                        } else {
                                          setSelectedDoormats(selectedDoormats.filter(id => id !== doormat.id));
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>{doormat.qr_code}</TableCell>
                                  <TableCell>{doormat.type}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendDoormats} disabled={isLoading || !selectedSeller || selectedDoormats.length === 0}>
                        {isLoading ? 'Pošiljam...' : 'Pošlji'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vsi predpražniki</CardTitle>
              <CardDescription>Pregled vseh predpražnikov v sistemu</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR koda</TableHead>
                    <TableHead>Vrsta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prodajalec</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doormats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Ni predpražnikov
                      </TableCell>
                    </TableRow>
                  ) : (
                    doormats.map((doormat) => (
                      <TableRow key={doormat.id}>
                        <TableCell className="font-mono">{doormat.qr_code}</TableCell>
                        <TableCell>{doormat.type}</TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                            {doormat.status}
                          </span>
                        </TableCell>
                        <TableCell>{doormat.profiles?.full_name || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

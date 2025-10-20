import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, LogOut } from 'lucide-react';

export default function InventarDashboard() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { toast } = useToast();

  const handleCreateProdajalec = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Uporabnik ni bil ustvarjen');

      // Assign PRODAJALEC role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: signUpData.user.id,
          role: 'PRODAJALEC',
        });

      if (roleError) throw roleError;

      toast({
        title: 'Prodajalec ustvarjen',
        description: `Račun za ${fullName} je bil uspešno ustvarjen.`,
      });

      setOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Prodajalci</CardTitle>
              <CardDescription>Upravljaj prodajalce</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Dodaj prodajalca
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ustvari nov račun prodajalca</DialogTitle>
                    <DialogDescription>
                      Vnesite podatke za novega prodajalca
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProdajalec} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-fullName">Ime in priimek</Label>
                      <Input
                        id="create-fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Janez Novak"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="create-email">E-pošta</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="janez@primer.si"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="create-password">Začetno geslo</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Ustvarjanje...' : 'Ustvari prodajalca'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Predpražniki</CardTitle>
              <CardDescription>Pregled vseh predpražnikov</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Funkcionalnost kmalu na voljo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Poročila</CardTitle>
              <CardDescription>Izvozi podatke</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Funkcionalnost kmalu na voljo</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

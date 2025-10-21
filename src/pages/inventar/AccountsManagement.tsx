import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  full_name: string;
  email: string;
  qr_prefix: string | null;
}

type UserRole = 'INVENTAR' | 'PRODAJALEC';

export default function AccountsManagement() {
  const [inventarUsers, setInventarUsers] = useState<User[]>([]);
  const [prodajalecUsers, setProdajalecUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inventar state
  const [newInventarEmail, setNewInventarEmail] = useState("");
  const [newInventarPassword, setNewInventarPassword] = useState("");
  const [newInventarName, setNewInventarName] = useState("");
  const [creatingInventar, setCreatingInventar] = useState(false);
  
  // Prodajalec state
  const [newProdajalecEmail, setNewProdajalecEmail] = useState("");
  const [newProdajalecPassword, setNewProdajalecPassword] = useState("");
  const [newProdajalecName, setNewProdajalecName] = useState("");
  const [newProdajalecPrefix, setNewProdajalecPrefix] = useState("");
  const [creatingProdajalec, setCreatingProdajalec] = useState(false);
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch INVENTAR users
      const { data: inventarRolesData, error: inventarRolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "INVENTAR");

      if (inventarRolesError) throw inventarRolesError;

      const inventarUserIds = inventarRolesData?.map((r) => r.user_id) || [];

      if (inventarUserIds.length > 0) {
        const { data: inventarProfilesData, error: inventarProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, qr_prefix")
          .in("id", inventarUserIds);

        if (inventarProfilesError) throw inventarProfilesError;
        setInventarUsers(inventarProfilesData || []);
      } else {
        setInventarUsers([]);
      }

      // Fetch PRODAJALEC users
      const { data: prodajalecRolesData, error: prodajalecRolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "PRODAJALEC");

      if (prodajalecRolesError) throw prodajalecRolesError;

      const prodajalecUserIds = prodajalecRolesData?.map((r) => r.user_id) || [];

      if (prodajalecUserIds.length > 0) {
        const { data: prodajalecProfilesData, error: prodajalecProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name, qr_prefix, email")
          .in("id", prodajalecUserIds);

        if (prodajalecProfilesError) throw prodajalecProfilesError;
        setProdajalecUsers(prodajalecProfilesData || []);
      } else {
        setProdajalecUsers([]);
      }
    } catch (error: any) {
      toast({
        title: "Napaka pri nalaganju uporabnikov",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    
    const isInventar = role === 'INVENTAR';
    const setCreating = isInventar ? setCreatingInventar : setCreatingProdajalec;
    const email = isInventar ? newInventarEmail : newProdajalecEmail;
    const password = isInventar ? newInventarPassword : newProdajalecPassword;
    const fullName = isInventar ? newInventarName : newProdajalecName;
    const qrPrefix = isInventar ? undefined : newProdajalecPrefix;
    
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Napaka",
          description: "Niste prijavljeni",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            qr_prefix: qrPrefix,
            role,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Napaka",
          description: result.message || result.error || "Prišlo je do napake",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      toast({
        title: "Uspeh",
        description: result.message,
      });

      // Reset form
      if (isInventar) {
        setNewInventarEmail("");
        setNewInventarPassword("");
        setNewInventarName("");
      } else {
        setNewProdajalecEmail("");
        setNewProdajalecPassword("");
        setNewProdajalecName("");
        setNewProdajalecPrefix("");
      }
      
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Napaka pri ustvarjanju računa",
        description: error.message || "Prišlo je do napake. Prosim poskusite znova.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const updateData: any = {};
      
      if (editPrefix) {
        updateData.qr_prefix = editPrefix.toUpperCase();
      }

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userId);

        if (profileError) throw profileError;
      }

      if (editPassword) {
        const { data, error: passwordError } = await supabase.functions.invoke('update-user-password', {
          body: {
            user_id: userId,
            password: editPassword,
          }
        });

        if (passwordError) {
          throw new Error(passwordError.message || 'Napaka pri posodabljanju gesla');
        }
      }

      toast({
        title: "Uspešno posodobljeno",
        description: "Podatki uporabnika so bili posodobljeni.",
      });

      setEditingUser(null);
      setEditEmail("");
      setEditPassword("");
      setEditPrefix("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Napaka pri posodabljanju",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user.id);
    setEditEmail(user.email);
    setEditPassword("");
    setEditPrefix(user.qr_prefix || "");
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditEmail("");
    setEditPassword("");
    setEditPrefix("");
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: userId,
        }
      });

      if (error) {
        throw new Error(error.message || 'Napaka pri brisanju uporabnika');
      }

      toast({
        title: "Uspešno izbrisano",
        description: "Uporabnik je bil izbrisan.",
      });

      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Napaka pri brisanju",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Upravljanje računov</h1>

            <Tabs defaultValue="inventar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inventar">Inventar računi</TabsTrigger>
                <TabsTrigger value="prodajalec">Prodajalec računi</TabsTrigger>
              </TabsList>

              <TabsContent value="inventar" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ustvari nov INVENTAR račun</CardTitle>
                    <CardDescription>Dodaj nov račun za inventar osebje</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => handleCreateUser(e, 'INVENTAR')} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Ime in priimek</label>
                        <Input
                          type="text"
                          value={newInventarName}
                          onChange={(e) => setNewInventarName(e.target.value)}
                          placeholder="Janez Novak"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={newInventarEmail}
                          onChange={(e) => setNewInventarEmail(e.target.value)}
                          placeholder="janez@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Geslo</label>
                        <Input
                          type="password"
                          value={newInventarPassword}
                          onChange={(e) => setNewInventarPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={creatingInventar}>
                        {creatingInventar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ustvari INVENTAR račun
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Obstoječi INVENTAR uporabniki</CardTitle>
                    <CardDescription>Seznam vseh INVENTAR uporabnikov</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inventarUsers.length === 0 ? (
                      <p className="text-muted-foreground">Ni INVENTAR uporabnikov</p>
                    ) : (
                      <div className="space-y-4">
                        {inventarUsers.map((user) => (
                          <div key={user.id} className="border rounded-lg p-4">
                            {editingUser === user.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium">Email (samo za ogled)</label>
                                  <Input type="email" value={editEmail} disabled />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Novo geslo (pusti prazno, če ne želiš spremeniti)</label>
                                  <Input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleUpdateUser(user.id)}>Shrani</Button>
                                  <Button variant="outline" onClick={cancelEdit}>Prekliči</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{user.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => startEditUser(user)}>
                                    Uredi
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="icon"
                                    onClick={() => setDeletingUser(user)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prodajalec" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ustvari nov PRODAJALEC račun</CardTitle>
                    <CardDescription>Dodaj nov račun za prodajalca</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => handleCreateUser(e, 'PRODAJALEC')} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Ime in priimek</label>
                        <Input
                          type="text"
                          value={newProdajalecName}
                          onChange={(e) => setNewProdajalecName(e.target.value)}
                          placeholder="George Ristov"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={newProdajalecEmail}
                          onChange={(e) => setNewProdajalecEmail(e.target.value)}
                          placeholder="george@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Geslo</label>
                        <Input
                          type="password"
                          value={newProdajalecPassword}
                          onChange={(e) => setNewProdajalecPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">QR Predpona (npr. RIST)</label>
                        <Input
                          type="text"
                          value={newProdajalecPrefix}
                          onChange={(e) => setNewProdajalecPrefix(e.target.value.toUpperCase())}
                          placeholder="RIST"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={creatingProdajalec}>
                        {creatingProdajalec && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ustvari PRODAJALEC račun
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Obstoječi PRODAJALEC uporabniki</CardTitle>
                    <CardDescription>Seznam vseh prodajalcev</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {prodajalecUsers.length === 0 ? (
                      <p className="text-muted-foreground">Ni PRODAJALEC uporabnikov</p>
                    ) : (
                      <div className="space-y-4">
                        {prodajalecUsers.map((user) => (
                          <div key={user.id} className="border rounded-lg p-4">
                            {editingUser === user.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium">Email (samo za ogled)</label>
                                  <Input type="email" value={editEmail} disabled />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">QR Predpona</label>
                                  <Input
                                    type="text"
                                    value={editPrefix}
                                    onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                                    placeholder="RIST"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Novo geslo (pusti prazno, če ne želiš spremeniti)</label>
                                  <Input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="••••••••"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleUpdateUser(user.id)}>Shrani</Button>
                                  <Button variant="outline" onClick={cancelEdit}>Prekliči</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{user.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                  {user.qr_prefix && (
                                    <p className="text-sm text-muted-foreground">QR: {user.qr_prefix}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => startEditUser(user)}>
                                    Uredi
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="icon"
                                    onClick={() => setDeletingUser(user)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši uporabnika?</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite izbrisati uporabnika <strong>{deletingUser?.full_name}</strong> ({deletingUser?.email})?
              To dejanje je nepovratno in bo izbrisalo vse podatke uporabnika.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeleteUser(deletingUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

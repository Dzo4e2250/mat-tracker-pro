import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";

interface Seller {
  id: string;
  full_name: string;
  email: string;
  qr_prefix: string | null;
}

export default function AccountsManagement() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSellerEmail, setNewSellerEmail] = useState("");
  const [newSellerPassword, setNewSellerPassword] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerPrefix, setNewSellerPrefix] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingSeller, setEditingSeller] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "PRODAJALEC");

      if (rolesError) throw rolesError;

      const userIds = rolesData?.map((r) => r.user_id) || [];

      if (userIds.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, qr_prefix, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      setSellers(profilesData || []);
    } catch (error: any) {
      toast({
        title: "Napaka pri nalaganju prodajalcev",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // First check if user with this email already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', newSellerEmail)
        .maybeSingle();

      if (existingProfile) {
        // Check if user already has PRODAJALEC role
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', existingProfile.id)
          .eq('role', 'PRODAJALEC')
          .maybeSingle();

        if (existingRole) {
          toast({
            title: "Prodajalec že obstaja",
            description: `${existingProfile.full_name || existingProfile.email} je že prodajalec v sistemu.`,
            variant: "destructive",
          });
          setCreating(false);
          return;
        }

        // User exists but doesn't have PRODAJALEC role - add the role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: existingProfile.id,
            role: "PRODAJALEC",
          });

        if (roleError) throw roleError;

        // Update profile with QR prefix if provided
        if (newSellerPrefix) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ qr_prefix: newSellerPrefix.toUpperCase() })
            .eq("id", existingProfile.id);

          if (profileError) throw profileError;
        }

        toast({
          title: "Prodajalec dodan",
          description: `${existingProfile.full_name || existingProfile.email} je bil dodan kot prodajalec.`,
        });

        setNewSellerEmail("");
        setNewSellerPassword("");
        setNewSellerName("");
        setNewSellerPrefix("");
        fetchSellers();
        setCreating(false);
        return;
      }

      // User doesn't exist - create new account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newSellerEmail,
        password: newSellerPassword,
        options: {
          data: {
            full_name: newSellerName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          toast({
            title: "Email že obstaja",
            description: "Ta email naslov je že v uporabi. Prosim uporabite drug email naslov.",
            variant: "destructive",
          });
          setCreating(false);
          return;
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error("Ni podatkov o uporabniku");

      // Update profile with QR prefix
      if (newSellerPrefix) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ qr_prefix: newSellerPrefix.toUpperCase() })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;
      }

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "PRODAJALEC",
        });

      if (roleError) throw roleError;

      toast({
        title: "Uspešno ustvarjen račun",
        description: `Prodajalec ${newSellerName} je bil uspešno dodan.`,
      });

      setNewSellerEmail("");
      setNewSellerPassword("");
      setNewSellerName("");
      setNewSellerPrefix("");
      fetchSellers();
    } catch (error: any) {
      console.error('Error creating seller:', error);
      toast({
        title: "Napaka pri ustvarjanju računa",
        description: error.message || "Prišlo je do napake. Prosim poskusite znova.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSeller = async (sellerId: string) => {
    try {
      // Update QR prefix
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ qr_prefix: editPrefix.toUpperCase() })
        .eq("id", sellerId);

      if (profileError) throw profileError;

      // Update password if provided
      if (editPassword) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          sellerId,
          { password: editPassword }
        );

        if (passwordError) throw passwordError;
      }

      toast({
        title: "Uspešno posodobljeno",
        description: "Podatki prodajalca so bili posodobljeni.",
      });

      setEditingSeller(null);
      setEditEmail("");
      setEditPassword("");
      setEditPrefix("");
      fetchSellers();
    } catch (error: any) {
      toast({
        title: "Napaka pri posodabljanju",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditSeller = (seller: Seller) => {
    setEditingSeller(seller.id);
    setEditEmail(seller.email);
    setEditPassword("");
    setEditPrefix(seller.qr_prefix || "");
  };

  const cancelEdit = () => {
    setEditingSeller(null);
    setEditEmail("");
    setEditPassword("");
    setEditPrefix("");
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

      <Card>
        <CardHeader>
          <CardTitle>Ustvari novega prodajalca</CardTitle>
          <CardDescription>Dodaj nov račun za prodajalca</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSeller} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ime in priimek</label>
              <Input
                type="text"
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                placeholder="George Ristov"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newSellerEmail}
                onChange={(e) => setNewSellerEmail(e.target.value)}
                placeholder="george@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Geslo</label>
              <Input
                type="password"
                value={newSellerPassword}
                onChange={(e) => setNewSellerPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">QR Predpona (npr. RIST)</label>
              <Input
                type="text"
                value={newSellerPrefix}
                onChange={(e) => setNewSellerPrefix(e.target.value)}
                placeholder="RIST"
                maxLength={4}
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ustvari račun
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Obstoječi prodajalci</CardTitle>
          <CardDescription>Seznam vseh prodajalcev v sistemu</CardDescription>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <p className="text-muted-foreground">Ni prodajalcev</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sellers.map((seller) => (
                <Card key={seller.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{seller.full_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editingSeller === seller.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Email (samo za ogled)</label>
                          <Input
                            value={editEmail}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Novo geslo (opcijsko)</label>
                          <Input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Pusti prazno za ohranitev trenutnega"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">QR Predpona</label>
                          <Input
                            value={editPrefix}
                            onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                            placeholder="RIST"
                            maxLength={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateSeller(seller.id)}
                            className="flex-1"
                          >
                            Shrani
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEdit}
                            className="flex-1"
                          >
                            Prekliči
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{seller.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">QR Predpona</p>
                          <p className="font-mono text-lg font-bold">
                            {seller.qr_prefix || "Ni določeno"}
                          </p>
                        </div>
                        <Button
                          onClick={() => startEditSeller(seller)}
                          className="w-full"
                          variant="outline"
                        >
                          Uredi podatke
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

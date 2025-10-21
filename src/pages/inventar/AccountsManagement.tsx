import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Seller {
  id: string;
  full_name: string;
  email: string;
}

export default function AccountsManagement() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSellerEmail, setNewSellerEmail] = useState("");
  const [newSellerPassword, setNewSellerPassword] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [creating, setCreating] = useState(false);
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
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const { data: authResponse, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) throw usersError;

      const users = authResponse?.users || [];

      const sellersWithEmail = (profilesData || []).map((profile) => {
        const user = users.find((u) => u.id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: user?.email || "",
        };
      });

      setSellers(sellersWithEmail);
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

      if (authError) throw authError;
      if (!authData.user) throw new Error("Ni podatkov o uporabniku");

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
      fetchSellers();
    } catch (error: any) {
      toast({
        title: "Napaka pri ustvarjanju računa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
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
            <div className="space-y-2">
              {sellers.map((seller) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{seller.full_name}</p>
                    <p className="text-sm text-muted-foreground">{seller.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

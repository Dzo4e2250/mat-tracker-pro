import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
}

interface FreeCode {
  id: string;
  qr_code: string;
  type: string;
  generation_date: string;
}

export default function FreeCodes() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [freeCodes, setFreeCodes] = useState<FreeCode[]>([]);
  const [newQrCode, setNewQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    if (selectedSellerId) {
      fetchFreeCodes();
    }
  }, [selectedSellerId]);

  const fetchSellers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (rolesError) throw rolesError;

      const sellersData = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, qr_prefix')
          .eq('id', role.user_id)
          .single();
        
        return profile;
      }));

      setSellers(sellersData.filter(Boolean) as Seller[]);
    } catch (error: any) {
      console.error('Error fetching sellers:', error);
      toast.error('Napaka pri nalaganju prodajalcev');
    }
  };

  const fetchFreeCodes = async () => {
    if (!selectedSellerId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('doormats')
        .select('id, qr_code, type, generation_date')
        .eq('seller_id', selectedSellerId)
        .eq('status', 'sent_by_inventar')
        .order('qr_code');

      if (error) throw error;

      setFreeCodes(data || []);
    } catch (error: any) {
      console.error('Error fetching free codes:', error);
      toast.error('Napaka pri nalaganju prostih kod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCode = async () => {
    if (!selectedSellerId || !newQrCode.trim()) {
      toast.error('Izpolnite vsa polja');
      return;
    }

    const seller = sellers.find(s => s.id === selectedSellerId);
    if (!seller?.qr_prefix) {
      toast.error('Prodajalec nima nastavljenega prefixa');
      return;
    }

    // Validate format
    const expectedPrefix = seller.qr_prefix;
    if (!newQrCode.startsWith(expectedPrefix + '-')) {
      toast.error(`QR koda mora začeti z ${expectedPrefix}-`);
      return;
    }

    setIsLoading(true);
    try {
      // Check if code already exists
      const { data: existing } = await supabase
        .from('doormats')
        .select('id')
        .eq('qr_code', newQrCode)
        .maybeSingle();

      if (existing) {
        toast.error('Ta QR koda že obstaja');
        setIsLoading(false);
        return;
      }

      // Add new code
      const { error } = await supabase
        .from('doormats')
        .insert({
          qr_code: newQrCode,
          seller_id: selectedSellerId,
          status: 'sent_by_inventar',
          type: 'MBW0',
          generation_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast.success('QR koda uspešno dodana');
      setNewQrCode('');
      fetchFreeCodes();
    } catch (error: any) {
      console.error('Error adding code:', error);
      toast.error('Napaka pri dodajanju kode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCode = async (codeId: string, qrCode: string) => {
    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('doormats')
        .delete()
        .eq('id', codeId);

      if (deleteError) throw deleteError;

      // Log to deletion history
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('deletion_history')
        .insert({
          deletion_type: 'free_code',
          doormat_type: 'MBW0',
          seller_id: selectedSellerId,
          doormat_qr_code: qrCode,
          deleted_by: user?.id,
        });

      toast.success('QR koda uspešno odstranjena');
      fetchFreeCodes();
    } catch (error: any) {
      console.error('Error deleting code:', error);
      toast.error('Napaka pri odstranjevanju kode');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Seznam prostih kod</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Izberi prodajalca</CardTitle>
                <CardDescription>
                  Upravljaj proste QR kode za izbranega prodajalca
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seller">Prodajalec</Label>
                    <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                      <SelectTrigger id="seller">
                        <SelectValue placeholder="Izberi prodajalca" />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.full_name} {seller.qr_prefix && `(${seller.qr_prefix})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSellerId && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-medium">Skupaj prostih kod</p>
                          <p className="text-2xl font-bold">{freeCodes.length}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedSellerId && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Dodaj novo kodo</CardTitle>
                    <CardDescription>
                      Vnesite QR kodo v formatu {selectedSeller?.qr_prefix}-XXX
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder={`${selectedSeller?.qr_prefix}-001`}
                          value={newQrCode}
                          onChange={(e) => setNewQrCode(e.target.value.toUpperCase())}
                          disabled={isLoading}
                        />
                      </div>
                      <Button onClick={handleAddCode} disabled={isLoading}>
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Proste QR kode</CardTitle>
                    <CardDescription>
                      Kode s statusom "sent_by_inventar"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nalagam...
                      </div>
                    ) : freeCodes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Ni prostih kod za tega prodajalca
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {freeCodes.map((code) => (
                          <div
                            key={code.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div>
                              <p className="font-mono font-semibold">{code.qr_code}</p>
                              <p className="text-sm text-muted-foreground">
                                Tip: {code.type} | Datum: {new Date(code.generation_date).toLocaleDateString('sl-SI')}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isLoading}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ste prepričani?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Ali res želite odstraniti kodo <strong>{code.qr_code}</strong>?
                                    Ta akcija je nepovratna.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Prekliči</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCode(code.id, code.qr_code)}>
                                    Odstrani
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

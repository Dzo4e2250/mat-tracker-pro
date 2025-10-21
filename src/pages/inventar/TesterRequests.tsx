import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";

const DOORMAT_TYPES = [
  "MBW0", "MBW1", "MBW2", "MBW3", "MBW4",
  "MBD0", "MBD1", "MBD2", "MBD3", "MBD4",
  "MBBR0", "MBBR1", "MBBR2", "MBBR3", "MBBR4",
  "MBGR0", "MBGR1", "MBGR2", "MBGR3", "MBGR4"
];

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
}

interface TesterRequest {
  id: string;
  seller_id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  quantities: any;
  generated_qr_codes: string[] | null;
  seller_name?: string;
}

export default function TesterRequests() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<TesterRequest[]>([]);

  useEffect(() => {
    fetchSellers();
    fetchRequests();
  }, []);

  const fetchSellers = async () => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (!roles) return;

      const sellersData = await Promise.all(roles.map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, qr_prefix')
          .eq('id', role.user_id)
          .single();
        
        return profile;
      }));

      setSellers(sellersData.filter(Boolean) as Seller[]);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data: requestsData } = await supabase
        .from('tester_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!requestsData) return;

      const requestsWithSellers = await Promise.all(requestsData.map(async (req) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', req.seller_id)
          .single();
        
        return { ...req, seller_name: profile?.full_name };
      }));

      setRequests(requestsWithSellers);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleQuantityChange = (type: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [type]: numValue
    }));
  };

  const handleSubmitRequest = async () => {
    if (!selectedSellerId) {
      toast({ title: "Napaka", description: "Izberite prodajalca", variant: "destructive" });
      return;
    }

    const filteredQuantities = Object.fromEntries(
      Object.entries(quantities).filter(([_, qty]) => qty > 0)
    );

    if (Object.keys(filteredQuantities).length === 0) {
      toast({ title: "Napaka", description: "Vnesite vsaj eno količino", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('tester_requests')
        .insert({
          seller_id: selectedSellerId,
          quantities: filteredQuantities,
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: "Uspeh", description: "Prošnja ustvarjena" });
      setQuantities({});
      setSelectedSellerId("");
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({ title: "Napaka", description: "Napaka pri ustvarjanju prošnje", variant: "destructive" });
    }
  };

  const handleApproveRequest = async (request: TesterRequest) => {
    const seller = sellers.find(s => s.id === request.seller_id);
    if (!seller?.qr_prefix) {
      toast({ title: "Napaka", description: "Prodajalec nima QR predpone", variant: "destructive" });
      return;
    }

    try {
      // Get the highest existing number for this seller
      const { data: existingDoormats } = await supabase
        .from('doormats')
        .select('qr_code')
        .eq('seller_id', request.seller_id)
        .like('qr_code', `${seller.qr_prefix}-%`);

      let nextNumber = 1;
      if (existingDoormats && existingDoormats.length > 0) {
        const numbers = existingDoormats.map(d => {
          const match = d.qr_code.match(/-(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        });
        nextNumber = Math.max(...numbers) + 1;
      }

      const qrCodesToGenerate: Array<{ qr_code: string; type: string }> = [];
      const quantities = request.quantities as Record<string, number>;

      Object.entries(quantities).forEach(([type, qty]) => {
        for (let i = 0; i < qty; i++) {
          qrCodesToGenerate.push({
            qr_code: `${seller.qr_prefix}-${String(nextNumber).padStart(3, '0')}`,
            type
          });
          nextNumber++;
        }
      });

      // Insert new doormats
      const { error: insertError } = await supabase
        .from('doormats')
        .insert(
          qrCodesToGenerate.map(item => ({
            qr_code: item.qr_code,
            seller_id: request.seller_id,
            type: item.type as any,
            status: 'sent_by_inventar' as any,
            generation_date: new Date().toISOString().split('T')[0]
          }))
        );

      if (insertError) throw insertError;

      // Update request status
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('tester_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          generated_qr_codes: qrCodesToGenerate.map(item => item.qr_code)
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({ 
        title: "Uspeh", 
        description: `Generirano ${qrCodesToGenerate.length} QR kod` 
      });
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: "Napaka", description: "Napaka pri odobritvi", variant: "destructive" });
    }
  };

  const getTotalQuantity = (quantities: Record<string, number>) => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Prošnja za testerje</h1>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Odjava
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Nova prošnja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Prodajalec</Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger>
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

                <div className="space-y-4">
                  <Label>Količine po tipih</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {DOORMAT_TYPES.map((type) => (
                      <div key={type} className="space-y-2">
                        <Label htmlFor={type} className="text-sm font-medium">{type}</Label>
                        <Input
                          id={type}
                          type="number"
                          min="0"
                          value={quantities[type] || ""}
                          onChange={(e) => handleQuantityChange(type, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSubmitRequest} className="w-full">
                  Ustvari prošnjo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prošnje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Ni prošenj</p>
                  ) : (
                    requests.map((request) => (
                      <Card key={request.id} className={request.status === 'approved' ? 'border-green-500' : ''}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium">{request.seller_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(request.created_at).toLocaleString('sl-SI')}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              request.status === 'approved' 
                                ? 'bg-green-500/10 text-green-600' 
                                : 'bg-yellow-500/10 text-yellow-600'
                            }`}>
                              {request.status === 'approved' ? 'Odobreno' : 'Na čakanju'}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {Object.entries(request.quantities as Record<string, number>).map(([type, qty]) => (
                              <div key={type} className="text-sm">
                                <span className="font-medium">{type}:</span> {qty}
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">
                              Skupaj: {getTotalQuantity(request.quantities as Record<string, number>)} kosov
                            </p>
                            {request.status === 'pending' && (
                              <Button onClick={() => handleApproveRequest(request)} size="sm">
                                Odobri
                              </Button>
                            )}
                            {request.status === 'approved' && request.approved_at && (
                              <p className="text-xs text-muted-foreground">
                                Odobreno: {new Date(request.approved_at).toLocaleString('sl-SI')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
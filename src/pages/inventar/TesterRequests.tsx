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
import { LogOut, Plus, Trash2, X } from "lucide-react";

const DOORMAT_TYPES = [
  { value: "MBW0", label: "MBW0 - 85x75 cm" },
  { value: "MBW1", label: "MBW1 - 85x150 cm" },
  { value: "MBW2", label: "MBW2 - 115x200 cm" },
  { value: "MBW3", label: "MBW3 - 115x250 cm" },
  { value: "MBW4", label: "MBW4 - 150x300 cm" },
  { value: "MBD0", label: "MBD0 - 85x75 cm" },
  { value: "MBD1", label: "MBD1 - 85x150 cm" },
  { value: "MBD2", label: "MBD2 - 115x200 cm" },
  { value: "MBD3", label: "MBD3 - 115x250 cm" },
  { value: "MBD4", label: "MBD4 - 150x300 cm" },
  { value: "MBBR0", label: "MBBR0 - 85x75 cm" },
  { value: "MBBR1", label: "MBBR1 - 85x150 cm" },
  { value: "MBBR2", label: "MBBR2 - 115x200 cm" },
  { value: "MBBR3", label: "MBBR3 - 115x250 cm" },
  { value: "MBBR4", label: "MBBR4 - 150x300 cm" },
  { value: "MBGR0", label: "MBGR0 - 85x75 cm" },
  { value: "MBGR1", label: "MBGR1 - 85x150 cm" },
  { value: "MBGR2", label: "MBGR2 - 115x200 cm" },
  { value: "MBGR3", label: "MBGR3 - 115x250 cm" },
  { value: "MBGR4", label: "MBGR4 - 150x300 cm" },
  { value: "ERM10R", label: "ERM10R - 86x54 cm (ergonomski guma)" },
  { value: "ERM11R", label: "ERM11R - 86x142 cm (ergonomski guma)" },
];

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
}

interface ShipmentItem {
  type: string;
  quantity: number;
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
  const [selectedType, setSelectedType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
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

  const handleAddItem = () => {
    if (!selectedType) {
      toast({ title: "Napaka", description: "Izberite tip predpražnika", variant: "destructive" });
      return;
    }

    const existingItem = shipmentItems.find(item => item.type === selectedType);
    if (existingItem) {
      setShipmentItems(shipmentItems.map(item => 
        item.type === selectedType 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setShipmentItems([...shipmentItems, { type: selectedType, quantity }]);
    }

    setSelectedType("");
    setQuantity(1);
  };

  const handleRemoveItem = (type: string) => {
    setShipmentItems(shipmentItems.filter(item => item.type !== type));
  };

  const handleClearAll = () => {
    setShipmentItems([]);
    setSelectedType("");
    setQuantity(1);
  };

  const handleSubmitRequest = async () => {
    if (!selectedSellerId) {
      toast({ title: "Napaka", description: "Izberite prodajalca", variant: "destructive" });
      return;
    }

    if (shipmentItems.length === 0) {
      toast({ title: "Napaka", description: "Dodajte vsaj en predmet", variant: "destructive" });
      return;
    }

    const quantities = shipmentItems.reduce((acc, item) => ({
      ...acc,
      [item.type]: item.quantity
    }), {});

    try {
      const { error } = await supabase
        .from('tester_requests')
        .insert({
          seller_id: selectedSellerId,
          quantities,
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: "Uspeh", description: "Pošiljka ustvarjena" });
      setShipmentItems([]);
      setSelectedSellerId("");
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({ title: "Napaka", description: "Napaka pri ustvarjanju pošiljke", variant: "destructive" });
    }
  };

  const handleApproveRequest = async (request: TesterRequest) => {
    const seller = sellers.find(s => s.id === request.seller_id);
    if (!seller?.qr_prefix) {
      toast({ title: "Napaka", description: "Prodajalec nima QR predpone", variant: "destructive" });
      return;
    }

    try {
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

  const getTotalQuantity = () => {
    return shipmentItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTypeLabel = (type: string) => {
    const doormat = DOORMAT_TYPES.find(d => d.value === type);
    return doormat?.label || type;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Ustvari novo pošiljko</h1>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Odjava
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Create Shipment */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Nova pošiljka</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Izberi prodajalca</Label>
                    <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="George Smith" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.full_name} {seller.qr_prefix && `(${seller.qr_prefix})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Dodaj predpražnike v pošiljko:</Label>
                    
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm text-muted-foreground">Tip predpražnika</Label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="MBW2 - 115x200 cm" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-[300px]">
                            {DOORMAT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-32 space-y-2">
                        <Label className="text-sm text-muted-foreground">Količina</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="h-10 w-10"
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="text-center h-10 w-16"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(quantity + 1)}
                            className="h-10 w-10"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleAddItem} 
                      variant="outline" 
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj
                    </Button>
                  </div>

                  {shipmentItems.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Predmeti v pošiljki:</Label>
                        <span className="text-sm text-muted-foreground">
                          Skupaj: {getTotalQuantity()} kosov
                        </span>
                      </div>

                      <div className="space-y-2">
                        {shipmentItems.map((item) => (
                          <div 
                            key={item.type} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{getTypeLabel(item.type)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm">Količina: {item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.type)}
                                className="h-8 px-3"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Odstrani
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleSubmitRequest} 
                      className="flex-1"
                      disabled={!selectedSellerId || shipmentItems.length === 0}
                    >
                      ✓ Ustvari pošiljko
                    </Button>
                    <Button 
                      onClick={handleClearAll} 
                      variant="outline"
                      disabled={shipmentItems.length === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Počisti vse
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Pending/Approved Requests */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Prošnje na čakanju</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {requests.filter(r => r.status === 'pending').length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Ni prošenj na čakanju</p>
                      ) : (
                        requests.filter(r => r.status === 'pending').map((request) => (
                          <Card key={request.id} className="border-yellow-500/30">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="font-medium">{request.seller_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(request.created_at).toLocaleString('sl-SI')}
                                  </p>
                                </div>
                                <Button onClick={() => handleApproveRequest(request)} size="sm">
                                  Odobri
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {request.quantities && typeof request.quantities === 'object' && 
                                  Object.entries(request.quantities as Record<string, number>).map(([type, qty]) => (
                                    <div key={type} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                                      <span>{getTypeLabel(type)}</span>
                                      <span className="font-medium">Količina: {qty}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Odobrene pošiljke</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[400px] overflow-auto">
                      {requests.filter(r => r.status === 'approved').length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Ni odobrenih pošiljk</p>
                      ) : (
                        requests.filter(r => r.status === 'approved').map((request) => (
                          <Card key={request.id} className="border-green-500/30">
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium">{request.seller_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Odobreno: {request.approved_at && new Date(request.approved_at).toLocaleDateString('sl-SI')}
                                  </p>
                                </div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                                  Odobreno
                                </span>
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Generirano {request.generated_qr_codes?.length || 0} QR kod
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
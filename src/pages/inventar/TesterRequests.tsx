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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CardDescription } from "@/components/ui/card";

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
  qr_start_num: number | null;
  qr_end_num: number | null;
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

interface TransportNotification {
  id: string;
  seller_id: string;
  seller_name: string;
  dirty_count: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_type: string | null;
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
  const [nextQrNumber, setNextQrNumber] = useState<number | null>(null);
  const [transportNotifications, setTransportNotifications] = useState<TransportNotification[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchSellers();
    fetchRequests();
    fetchTransportNotifications();
  }, []);

  useEffect(() => {
    if (selectedSellerId) {
      fetchNextQrNumber(selectedSellerId);
    } else {
      setNextQrNumber(null);
    }
  }, [selectedSellerId, shipmentItems]);

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
          .select('id, full_name, qr_prefix, qr_start_num, qr_end_num')
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

  const fetchTransportNotifications = async () => {
    try {
      const { data } = await supabase
        .from("transport_notifications")
        .select(`
          *,
          profiles!transport_notifications_seller_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (data) {
        const notificationsWithNames = data.map((notif: any) => ({
          ...notif,
          seller_name: notif.profiles?.full_name || "Unknown",
        }));
        setTransportNotifications(notificationsWithNames);
      }
    } catch (error) {
      console.error("Error fetching transport notifications:", error);
    }
  };

  const syncSellerQrRange = async (sellerId: string, sellerPrefix: string) => {
    try {
      // Preberi VSE doormats za tega prodajalca
      const { data: allDoormats } = await supabase
        .from('doormats')
        .select('qr_code')
        .eq('seller_id', sellerId)
        .like('qr_code', `${sellerPrefix}-%`);

      if (!allDoormats || allDoormats.length === 0) {
        return { startNum: null, endNum: null };
      }

      // Izvleči številke iz QR kod
      const numbers = allDoormats.map(d => {
        const match = d.qr_code.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }).filter(num => num > 0);

      const minNum = Math.min(...numbers);
      const maxNum = Math.max(...numbers);

      // Posodobi profil prodajalca z dejanskimi vrednostmi
      await supabase
        .from('profiles')
        .update({
          qr_start_num: minNum,
          qr_end_num: maxNum
        })
        .eq('id', sellerId);

      return { startNum: minNum, endNum: maxNum };
    } catch (error) {
      console.error('Error syncing seller QR range:', error);
      return { startNum: null, endNum: null };
    }
  };

  const fetchNextQrNumber = async (sellerId: string) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      if (!seller?.qr_prefix) return;

      // Check both scanned doormats AND reserved QR codes in tester_requests
      const { data: existingDoormats } = await supabase
        .from('doormats')
        .select('qr_code')
        .eq('seller_id', sellerId)
        .like('qr_code', `${seller.qr_prefix}-%`);

      const { data: reservedRequests } = await supabase
        .from('tester_requests')
        .select('generated_qr_codes')
        .eq('seller_id', sellerId);

      // Collect all QR numbers (both scanned and reserved)
      const allNumbers: number[] = [];
      
      if (existingDoormats) {
        existingDoormats.forEach(d => {
          const match = d.qr_code.match(/-(\d+)$/);
          if (match) allNumbers.push(parseInt(match[1]));
        });
      }
      
      if (reservedRequests) {
        reservedRequests.forEach(req => {
          (req.generated_qr_codes || []).forEach((qr: string) => {
            const match = qr.match(/-(\d+)$/);
            if (match) allNumbers.push(parseInt(match[1]));
          });
        });
      }

      let nextNumber = 1;
      if (allNumbers.length > 0) {
        nextNumber = Math.max(...allNumbers) + 1;
      }

      // Account for items already in shipment
      const totalInShipment = getTotalQuantity();
      setNextQrNumber(nextNumber + totalInShipment);
    } catch (error) {
      console.error('Error fetching next QR number:', error);
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
      // Check both scanned doormats AND reserved QR codes in tester_requests
      const { data: existingDoormats } = await supabase
        .from('doormats')
        .select('qr_code')
        .eq('seller_id', request.seller_id)
        .like('qr_code', `${seller.qr_prefix}-%`);

      const { data: reservedRequests } = await supabase
        .from('tester_requests')
        .select('generated_qr_codes')
        .eq('seller_id', request.seller_id);

      // Collect all QR numbers (both scanned and reserved)
      const allNumbers: number[] = [];

      if (existingDoormats) {
        existingDoormats.forEach(d => {
          const match = d.qr_code.match(/-(\d+)$/);
          if (match) allNumbers.push(parseInt(match[1]));
        });
      }

      if (reservedRequests) {
        reservedRequests.forEach(req => {
          (req.generated_qr_codes || []).forEach((qr: string) => {
            const match = qr.match(/-(\d+)$/);
            if (match) allNumbers.push(parseInt(match[1]));
          });
        });
      }

      let nextNumber = 1;
      if (allNumbers.length > 0) {
        nextNumber = Math.max(...allNumbers) + 1;
      }

      // Generate QR codes only - don't create doormats yet
      const qrCodes: string[] = [];
      const quantities = request.quantities as Record<string, number>;

      Object.entries(quantities).forEach(([type, qty]) => {
        for (let i = 0; i < qty; i++) {
          qrCodes.push(`${seller.qr_prefix}-${String(nextNumber).padStart(3, '0')}`);
          nextNumber++;
        }
      });

      // Update request with generated QR codes
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('tester_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          generated_qr_codes: qrCodes
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Update seller's profile with new QR range
      const qrNumbers = qrCodes.map(code => {
        const match = code.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
      const minQrNum = Math.min(...qrNumbers);
      const maxQrNum = Math.max(...qrNumbers);

      // Get current profile range to extend it
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('qr_start_num, qr_end_num')
        .eq('id', request.seller_id)
        .single();

      const newStartNum = currentProfile?.qr_start_num 
        ? Math.min(currentProfile.qr_start_num, minQrNum)
        : minQrNum;
      const newEndNum = currentProfile?.qr_end_num 
        ? Math.max(currentProfile.qr_end_num, maxQrNum)
        : maxQrNum;

      await supabase
        .from('profiles')
        .update({
          qr_start_num: newStartNum,
          qr_end_num: newEndNum
        })
        .eq('id', request.seller_id);

      toast({ 
        title: "Uspeh", 
        description: `Generirano ${qrCodes.length} QR kod - čakajo na skeniranje prodajalca` 
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

  const getPreviewQrCodes = () => {
    if (!selectedSellerId || !nextQrNumber || quantity === 0) return [];
    
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (!seller?.qr_prefix) return [];

    const codes: string[] = [];
    for (let i = 0; i < quantity; i++) {
      codes.push(`${seller.qr_prefix}-${String(nextQrNumber + i).padStart(3, '0')}`);
    }
    return codes;
  };

  const getTypeLabel = (type: string) => {
    const doormat = DOORMAT_TYPES.find(d => d.value === type);
    return doormat?.label || type;
  };

  const handleResolveTransportNotification = async (
    notificationId: string,
    resolutionType: 'carrier_notified' | 'seller_delivers'
  ) => {
    const { error } = await supabase
      .from('transport_notifications')
      .update({
        status: resolutionType,
        resolved_at: new Date().toISOString(),
        resolution_type: resolutionType
      })
      .eq('id', notificationId);
    
    if (error) {
      toast({
        title: "Napaka",
        description: "Napaka pri posodabljanju obvestila",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Obvestilo posodobljeno",
      description: resolutionType === 'carrier_notified' 
        ? "Prevoznik je bil obveščen" 
        : "Prodajalec bo sam dostavil"
    });
    fetchTransportNotifications();
  };

  const handleCompleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('transport_notifications')
      .update({
        status: 'completed'
      })
      .eq('id', notificationId);
    
    if (error) {
      toast({
        title: "Napaka",
        description: "Napaka pri posodabljanju obvestila",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Opravljeno",
      description: "Prevoz je bil opravljen"
    });
    fetchTransportNotifications();
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

            {/* Transport Notifications - Pending (Pulsing) */}
            {transportNotifications.filter(n => n.status === 'pending').length > 0 && (
              <Card className="border-red-500 animate-[pulse-red_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    OBVESTILA O PREVOZU
                  </CardTitle>
                  <CardDescription>
                    Potrebna je organizacija prevoza umazanih predpražnikov
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transportNotifications
                    .filter(n => n.status === 'pending')
                    .map((notification) => (
                      <div key={notification.id} className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{notification.seller_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {notification.dirty_count} umazanih predpražnikov
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleDateString('sl-SI')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleResolveTransportNotification(notification.id, 'carrier_notified')}
                            variant="default"
                            size="sm"
                          >
                            Prevoznik obveščen
                          </Button>
                          <Button
                            onClick={() => handleResolveTransportNotification(notification.id, 'seller_delivers')}
                            variant="secondary"
                            size="sm"
                          >
                            Prodajalec bo sam dostavil
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Transport Notifications - In Progress */}
            {transportNotifications.filter(n => n.status === 'carrier_notified' || n.status === 'seller_delivers').length > 0 && (
              <Card className="border-yellow-500">
                <CardHeader>
                  <CardTitle className="text-yellow-600 flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    V OBDELAVI
                  </CardTitle>
                  <CardDescription>
                    Potrjena obvestila, ki še niso dokončana
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transportNotifications
                    .filter(n => n.status === 'carrier_notified' || n.status === 'seller_delivers')
                    .map((notification) => (
                      <div key={notification.id} className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{notification.seller_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {notification.dirty_count} umazanih predpražnikov
                            </p>
                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                              {notification.resolution_type === 'carrier_notified' 
                                ? '🚚 Prevoznik obveščen' 
                                : '👤 Prodajalec bo sam dostavil'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Potrjeno: {notification.resolved_at ? new Date(notification.resolved_at).toLocaleDateString('sl-SI') : '-'}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleCompleteNotification(notification.id)}
                          variant="default"
                          size="sm"
                        >
                          Označi kot opravljeno
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Transport Notifications - Completed (Collapsible) */}
            {transportNotifications.filter(n => n.status === 'completed').length > 0 && (
              <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                <Card className="border-green-500">
                  <CardHeader>
                    <CollapsibleTrigger className="w-full">
                      <CardTitle className="text-green-600 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="text-2xl">✅</span>
                          OPRAVLJENO
                        </span>
                        <span className="text-sm font-normal">
                          {showCompleted ? '▲' : '▼'} {transportNotifications.filter(n => n.status === 'completed').length}
                        </span>
                      </CardTitle>
                    </CollapsibleTrigger>
                    <CardDescription>
                      Arhiv opravljenih prevozov
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {transportNotifications
                        .filter(n => n.status === 'completed')
                        .map((notification) => (
                          <div key={notification.id} className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                            <div>
                              <h4 className="font-semibold">{notification.seller_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {notification.dirty_count} umazanih predpražnikov
                              </p>
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                {notification.resolution_type === 'carrier_notified' 
                                  ? '🚚 Prevoznik obveščen' 
                                  : '👤 Prodajalec bo sam dostavil'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Opravljeno: {notification.resolved_at ? new Date(notification.resolved_at).toLocaleDateString('sl-SI') : '-'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

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
                        <SelectValue placeholder="Izberi prodajalca" />
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
                        {selectedSellerId && nextQrNumber !== null && getPreviewQrCodes().length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1 pt-1">
                            {getPreviewQrCodes().map((code, idx) => (
                              <div key={idx} className="font-mono">
                                {code}
                              </div>
                            ))}
                          </div>
                        )}
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
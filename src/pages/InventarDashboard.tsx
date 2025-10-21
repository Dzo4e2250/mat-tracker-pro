import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, LogOut, ChevronDown, Trash2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import * as XLSX from 'xlsx';

const DOORMAT_TYPES = ['MBW0', 'MBW1', 'MBW2', 'MBW4', 'ERM10R', 'ERM11R'];

interface Doormat {
  id: string;
  qr_code: string;
  type: string;
  status: string;
  seller_id: string | null;
  created_at: string;
  profiles?: { full_name: string };
}

interface Seller {
  id: string;
  full_name: string;
}

interface SellerStats {
  id: string;
  full_name: string;
  clean: number;
  on_test: number;
  dirty: number;
  waiting_for_driver: number;
  total: number;
}

export default function InventarDashboard() {
  const { user, signOut } = useAuth();
  const [doormats, setDoormats] = useState<Doormat[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [openSellers, setOpenSellers] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

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
      
      // Manually fetch profiles for each doormat
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

      // Manually fetch profiles for each seller
      const sellersData = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', role.user_id)
          .single();
        
        return {
          id: role.user_id,
          full_name: profile?.full_name || 'Unknown',
        };
      }));

      setSellers(sellersData);
    } catch (error: any) {
      console.error('Error fetching sellers:', error);
    }
  };

  const getSellerStats = (): SellerStats[] => {
    return sellers.map(seller => {
      const sellerDoormats = doormats.filter(d => d.seller_id === seller.id);
      return {
        id: seller.id,
        full_name: seller.full_name,
        clean: sellerDoormats.filter(d => d.status === 'with_seller').length,
        on_test: sellerDoormats.filter(d => d.status === 'on_test').length,
        dirty: sellerDoormats.filter(d => d.status === 'dirty').length,
        waiting_for_driver: sellerDoormats.filter(d => d.status === 'waiting_for_driver').length,
        total: sellerDoormats.length,
      };
    });
  };

  const getTotalTestDoormats = () => {
    if (selectedSellerId === "all") {
      return doormats.length;
    }
    return doormats.filter(d => d.seller_id === selectedSellerId).length;
  };

  const getFilteredDoormats = () => {
    return doormats.filter(d => {
      const sellerMatch = selectedSellerId === "all" || d.seller_id === selectedSellerId;
      const statusMatch = statusFilter === "all" || d.status === statusFilter;
      const typeMatch = typeFilter === "all" || d.type === typeFilter;
      return sellerMatch && statusMatch && typeMatch;
    });
  };

  const exportToExcel = () => {
    const sellerStats = getSellerStats();
    
    const data = sellerStats.flatMap(seller => {
      const sellerDoormats = doormats.filter(d => d.seller_id === seller.id);
      
      // Group by date and type
      const groupedByDate: Record<string, Record<string, number>> = {};
      
      sellerDoormats.forEach(doormat => {
        const date = new Date(doormat.created_at).toLocaleDateString('sl-SI');
        if (!groupedByDate[date]) {
          groupedByDate[date] = {};
        }
        if (!groupedByDate[date][doormat.type]) {
          groupedByDate[date][doormat.type] = 0;
        }
        groupedByDate[date][doormat.type]++;
      });

      // Convert to rows
      const rows = Object.entries(groupedByDate).flatMap(([date, types]) => 
        Object.entries(types).map(([type, count]) => ({
          'Prodajalec': seller.full_name,
          'Datum': date,
          'Koda predpražnika': type,
          'Število izdanih': count,
          'Na zalogi': sellerDoormats.filter(d => d.type === type && d.status === 'with_seller').length,
        }))
      );

      return rows;
    });

    // Add totals
    data.push({
      'Prodajalec': 'SKUPAJ',
      'Datum': '',
      'Koda predpražnika': '',
      'Število izdanih': doormats.length,
      'Na zalogi': doormats.filter(d => d.status === 'with_seller').length,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventar');
    XLSX.writeFile(wb, `Inventar_${new Date().toLocaleDateString('sl-SI')}.xlsx`);

    toast({
      title: "Izvoženo",
      description: "Excel datoteka je bila prenesena.",
    });
  };

  const handleDeleteSellerDoormats = async () => {
    if (selectedSellerId === "all") return;

    const confirmed = confirm(
      `Ali ste prepričani, da želite izbrisati VSE predpražnike prodajalca ${sellers.find(s => s.id === selectedSellerId)?.full_name}? To dejanje je nepovratno!`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('doormats')
        .delete()
        .eq('seller_id', selectedSellerId);

      if (error) throw error;

      toast({
        title: "Uspešno izbrisano",
        description: "Vsi predpražniki prodajalca so bili izbrisani.",
      });

      fetchDoormats();
    } catch (error: any) {
      console.error('Error deleting doormats:', error);
      toast({
        title: "Napaka",
        description: "Napaka pri brisanju predpražnikov.",
        variant: "destructive",
      });
    }
  };

  const sellerStats = getSellerStats();
  const totalTestDoormats = getTotalTestDoormats();
  const filteredDoormats = getFilteredDoormats();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Pregled po prodajalcih</h1>
              <div className="flex gap-2">
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Inventar
                </Button>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Odjava
                </Button>
              </div>
            </div>

            {/* Izberi prodajalca */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Izberi prodajalca</label>
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vsi skupaj</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-lg">
                Skupaj predpražnikov: <span className="font-bold text-2xl">{totalTestDoormats}</span>
              </div>
            </div>

            {/* Povzetek po prodajalcih */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Povzetek po prodajalcih</h2>
              
              {sellerStats.map((seller) => (
                <Collapsible
                  key={seller.id}
                  open={openSellers[seller.id]}
                  onOpenChange={(open) => setOpenSellers({ ...openSellers, [seller.id]: open })}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">
                            {seller.full_name} - Skupaj: <span className="text-3xl font-bold ml-2">{seller.total}</span>
                          </CardTitle>
                          <ChevronDown className={`h-5 w-5 transition-transform ${openSellers[seller.id] ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-4 rounded-lg bg-green-50">
                            <div className="text-sm text-muted-foreground mb-1">Čisti</div>
                            <div className="text-4xl font-bold">{seller.clean}</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-blue-50">
                            <div className="text-sm text-muted-foreground mb-1">Na testu</div>
                            <div className="text-4xl font-bold">{seller.on_test}</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-orange-50">
                            <div className="text-sm text-muted-foreground mb-1">Umazani</div>
                            <div className="text-4xl font-bold">{seller.dirty}</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-purple-50">
                            <div className="text-sm text-muted-foreground mb-1">Čaka šoferja</div>
                            <div className="text-4xl font-bold">{seller.waiting_for_driver}</div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>

            {/* Podrobnosti */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Podrobnosti</h2>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Prodajalec</label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Vsi prodajalci</SelectItem>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filtriraj po statusu</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Vsi</SelectItem>
                      <SelectItem value="with_seller">Čist</SelectItem>
                      <SelectItem value="on_test">Na testu</SelectItem>
                      <SelectItem value="dirty">Umazan</SelectItem>
                      <SelectItem value="waiting_for_driver">Čaka šoferja</SelectItem>
                      <SelectItem value="sent_by_inventar">Poslano od inventarja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filtriraj po tipu</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Vsi</SelectItem>
                      {DOORMAT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSellerId !== "all" && (
                <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Izbran prodajalec: {sellers.find(s => s.id === selectedSellerId)?.full_name}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSellerDoormats()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Izbriši vse predpražnike
                  </Button>
                </div>
              )}

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead>QR Koda</TableHead>
                          <TableHead>Tip</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Prodajalec</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDoormats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Ni predpražnikov
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDoormats.map((doormat) => (
                            <TableRow key={doormat.id}>
                              <TableCell className="font-mono">{doormat.qr_code}</TableCell>
                              <TableCell>{doormat.type}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  doormat.status === 'clean' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                                  doormat.status === 'dirty' ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
                                  doormat.status === 'on_test' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                                  'bg-secondary'
                                }`}>
                                  {doormat.status === 'clean' ? 'Čist' :
                                   doormat.status === 'dirty' ? 'Umazan' :
                                   doormat.status === 'on_test' ? 'Na testu' :
                                   doormat.status}
                                </span>
                              </TableCell>
                              <TableCell>{doormat.profiles?.full_name || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

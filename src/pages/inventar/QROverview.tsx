import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Printer, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
  qr_start_num: number | null;
  qr_end_num: number | null;
}

interface QRCodeItem {
  code: string;
  status: 'active' | 'inactive' | 'sent_by_inventar';
  type?: string;
}

export default function QROverview() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [activeDoormats, setActiveDoormats] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    if (selectedSellerId) {
      fetchQrCodes();
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
          .select('id, full_name, qr_prefix, qr_start_num, qr_end_num')
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

  const fetchQrCodes = async () => {
    if (!selectedSellerId) return;
    
    setIsLoading(true);
    try {
      const seller = sellers.find(s => s.id === selectedSellerId);
      if (!seller || !seller.qr_prefix) {
        setQrCodes([]);
        setIsLoading(false);
        return;
      }

      // Fetch all doormats for this seller
      const { data: doormats, error } = await supabase
        .from('doormats')
        .select('qr_code, status, type')
        .eq('seller_id', selectedSellerId);

      if (error) throw error;

      setActiveDoormats(doormats || []);

      // Generate all codes in range
      const allCodes: QRCodeItem[] = [];
      
      if (seller.qr_start_num && seller.qr_end_num) {
        for (let i = seller.qr_start_num; i <= seller.qr_end_num; i++) {
          const code = `${seller.qr_prefix}-${String(i).padStart(3, '0')}`;
          const doormat = doormats?.find(d => d.qr_code === code);
          
          if (doormat) {
            allCodes.push({
              code,
              status: doormat.status === 'sent_by_inventar' ? 'sent_by_inventar' : 'active',
              type: doormat.type,
            });
          } else {
            allCodes.push({
              code,
              status: 'inactive',
            });
          }
        }
      }

      setQrCodes(allCodes);
    } catch (error: any) {
      console.error('Error fetching QR codes:', error);
      toast.error('Napaka pri nalaganju QR kod');
    } finally {
      setIsLoading(false);
    }
  };

  const syncSellerQrRange = async () => {
    if (!selectedSellerId) return;
    
    setIsSyncing(true);
    try {
      const seller = sellers.find(s => s.id === selectedSellerId);
      if (!seller?.qr_prefix) return;

      // Fetch all doormats for this seller
      const { data: allDoormats } = await supabase
        .from('doormats')
        .select('qr_code')
        .eq('seller_id', selectedSellerId)
        .like('qr_code', `${seller.qr_prefix}-%`);

      if (!allDoormats || allDoormats.length === 0) {
        toast.info('Ni doormats za sinhronizacijo');
        setIsSyncing(false);
        return;
      }

      // Extract numbers from QR codes
      const numbers = allDoormats.map(d => {
        const match = d.qr_code.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }).filter(num => num > 0);

      const minNum = Math.min(...numbers);
      const maxNum = Math.max(...numbers);

      // Update seller profile
      const { error } = await supabase
        .from('profiles')
        .update({
          qr_start_num: minNum,
          qr_end_num: maxNum
        })
        .eq('id', selectedSellerId);

      if (error) throw error;

      toast.success(`Sinhronizacija uspešna: ${minNum} - ${maxNum}`);
      await fetchSellers();
      await fetchQrCodes();
    } catch (error) {
      console.error('Error syncing seller QR range:', error);
      toast.error('Napaka pri sinhronizaciji');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktivna</Badge>;
      case 'sent_by_inventar':
        return <Badge className="bg-yellow-500">Čaka aktivacijo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Neaktivna</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCodes = qrCodes.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    return true;
  });

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);
  const stats = {
    total: qrCodes.length,
    active: qrCodes.filter(c => c.status === 'active').length,
    inactive: qrCodes.filter(c => c.status === 'inactive').length,
    sent: qrCodes.filter(c => c.status === 'sent_by_inventar').length,
  };

  const availableTypes = Array.from(new Set(activeDoormats.map(d => d.type).filter(Boolean)));

  const handleExportToExcel = () => {
    if (!selectedSeller) return;

    const exportData = filteredCodes.map(item => ({
      'QR Koda': item.code,
      'Status': item.status === 'active' ? 'Aktivna' : item.status === 'sent_by_inventar' ? 'Čaka aktivacijo' : 'Neaktivna',
      'Tip': item.type || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QR Kode");
    XLSX.writeFile(wb, `${selectedSeller.full_name}_QR_kode_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Excel datoteka prenesena');
  };

  const handlePrintList = () => {
    if (!selectedSeller) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const activeCodes = filteredCodes.filter(c => c.status === 'active');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Seznam aktiviranih QR kod - ${selectedSeller.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Seznam aktiviranih predpražnikov</h1>
          <div class="meta">
            <strong>Prodajalec:</strong> ${selectedSeller.full_name} (${selectedSeller.qr_prefix})<br>
            <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}<br>
            <strong>Čas:</strong> ${new Date().toLocaleTimeString('sl-SI')}
          </div>
          
          <div class="summary">
            <strong>Skupaj aktivnih:</strong> ${activeCodes.length} / ${qrCodes.length}<br>
            ${availableTypes.map(type => {
              const count = activeCodes.filter(c => c.type === type).length;
              return `<strong>${type}:</strong> ${count}`;
            }).join('<br>')}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>QR Koda</th>
                <th>Tip predpražnika</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${activeCodes.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${item.code}</strong></td>
                  <td>${item.type || '-'}</td>
                  <td>Aktivna</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Pregled QR kod</h1>
              {selectedSellerId && (
                <div className="flex gap-2">
                  <Button onClick={handleExportToExcel} variant="outline">
                    <FileDown className="h-4 w-4 mr-2" />
                    Izvozi Excel
                  </Button>
                  <Button onClick={handlePrintList} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Natisni seznam
                  </Button>
                </div>
              )}
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Izberi prodajalca</CardTitle>
                <CardDescription>
                  Pregled vseh QR kod za izbranega prodajalca
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

                  {selectedSellerId && selectedSeller && (
                    <>
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Obseg kod</p>
                            <p className="text-lg font-semibold">
                              {selectedSeller.qr_prefix}-{String(selectedSeller.qr_start_num).padStart(3, '0')} do{' '}
                              {selectedSeller.qr_prefix}-{String(selectedSeller.qr_end_num).padStart(3, '0')}
                            </p>
                          </div>
                          <Button onClick={syncSellerQrRange} disabled={isSyncing} variant="outline">
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            Sinhroniziraj obseg
                          </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-sm text-muted-foreground">Skupaj</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                            <p className="text-sm text-muted-foreground">Aktivnih</p>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.sent}</p>
                            <p className="text-sm text-muted-foreground">Čaka aktivacijo</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-2xl font-bold">{stats.inactive}</p>
                            <p className="text-sm text-muted-foreground">Neaktivnih</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="filterStatus">Filter po statusu</Label>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger id="filterStatus">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Vse</SelectItem>
                              <SelectItem value="active">Aktivne</SelectItem>
                              <SelectItem value="sent_by_inventar">Čaka aktivacijo</SelectItem>
                              <SelectItem value="inactive">Neaktivne</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filterType">Filter po tipu</Label>
                          <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger id="filterType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Vsi tipi</SelectItem>
                              {availableTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedSellerId && (
              <Card>
                <CardHeader>
                  <CardTitle>QR kode ({filteredCodes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nalagam...
                    </div>
                  ) : filteredCodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Ni kod za prikaz
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {filteredCodes.map((item) => (
                        <div
                          key={item.code}
                          className={`p-3 border rounded-lg text-center relative ${
                            item.status === 'active' ? 'bg-green-50 dark:bg-green-950 border-green-300' :
                            item.status === 'sent_by_inventar' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300' :
                            'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          {item.type && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
                              {item.type}
                            </div>
                          )}
                          <p className="font-mono text-sm font-semibold mb-1 mt-1">{item.code}</p>
                          {getStatusBadge(item.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

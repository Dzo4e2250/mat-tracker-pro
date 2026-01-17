import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Printer, FileDown, Loader2, CheckCircle, AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProdajalecProfiles } from "@/hooks/useProfiles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QRCode, Cycle, MatType, Company } from "@/integrations/supabase/types";
import * as XLSX from 'xlsx';

type QRCodeWithCycle = QRCode & {
  active_cycle?: Cycle & {
    mat_type?: MatType;
    company?: Company;
  };
};

export default function QROverview() {
  const [searchParams] = useSearchParams();
  const { data: sellers = [], isLoading: loadingSellers } = useProdajalecProfiles();

  // Initialize from URL parameter
  const sellerFromUrl = searchParams.get('seller');
  const [selectedSellerId, setSelectedSellerId] = useState(sellerFromUrl || "");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  // Update selected seller when URL changes or sellers load
  useEffect(() => {
    const urlSeller = searchParams.get('seller');
    if (urlSeller && sellers.length > 0) {
      const sellerExists = sellers.some(s => s.id === urlSeller);
      if (sellerExists && selectedSellerId !== urlSeller) {
        setSelectedSellerId(urlSeller);
      }
    }
  }, [searchParams, sellers, selectedSellerId]);

  // Fetch QR codes for selected seller
  const { data: qrCodes = [], isLoading: loadingCodes, refetch } = useQuery({
    queryKey: ['qr_codes_with_cycles', selectedSellerId],
    queryFn: async () => {
      if (!selectedSellerId) return [];

      // Get all QR codes for this seller
      const { data: codes, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', selectedSellerId)
        .order('code');

      if (error) throw error;

      // Get active cycles for these QR codes
      const codesWithCycles: QRCodeWithCycle[] = await Promise.all(
        (codes || []).map(async (code) => {
          const { data: cycle } = await supabase
            .from('cycles')
            .select(`
              *,
              mat_type:mat_types(*),
              company:companies(*)
            `)
            .eq('qr_code_id', code.id)
            .neq('status', 'completed')
            .maybeSingle();

          return {
            ...code,
            active_cycle: cycle || undefined,
          };
        })
      );

      return codesWithCycles;
    },
    enabled: !!selectedSellerId,
  });

  // Fetch orders for selected seller (for comparison)
  const { data: orderStats } = useQuery({
    queryKey: ['seller_order_stats', selectedSellerId],
    queryFn: async () => {
      if (!selectedSellerId) return null;

      // Get all orders for this seller
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, notes')
        .eq('salesperson_id', selectedSellerId);

      if (ordersError) throw ordersError;

      // Calculate totals from orders
      let totalOrdered = 0;
      let pendingOrdered = 0;
      let approvedOrdered = 0;
      let shippedOrdered = 0;

      (orders || []).forEach(order => {
        // Parse quantity from notes
        let quantity = 0;
        if (order.notes) {
          const match = order.notes.match(/Količina:\s*(\d+)/);
          if (match) {
            quantity = parseInt(match[1], 10);
          }
        }

        if (order.status === 'pending') {
          pendingOrdered += quantity;
        } else if (order.status === 'approved') {
          approvedOrdered += quantity;
        } else if (order.status === 'shipped' || order.status === 'received') {
          shippedOrdered += quantity;
        }

        if (order.status !== 'rejected') {
          totalOrdered += quantity;
        }
      });

      // Count QR codes linked to orders for this seller
      const { count: codesFromOrders } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', selectedSellerId)
        .not('order_id', 'is', null);

      return {
        totalOrdered,
        pendingOrdered,
        approvedOrdered,
        shippedOrdered,
        codesFromOrders: codesFromOrders || 0,
      };
    },
    enabled: !!selectedSellerId,
  });

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  const getStatusBadge = (code: QRCodeWithCycle) => {
    if (code.status === 'pending') {
      return <Badge variant="secondary">Naročena</Badge>;
    }
    if (code.status === 'available') {
      return <Badge className="bg-green-500">Prosta</Badge>;
    }
    if (code.active_cycle) {
      const cycleStatus = code.active_cycle.status;
      switch (cycleStatus) {
        case 'clean':
          return <Badge className="bg-blue-500">Čista</Badge>;
        case 'on_test':
          return <Badge className="bg-yellow-500">Na testu</Badge>;
        case 'dirty':
          return <Badge className="bg-orange-500">Umazana</Badge>;
        case 'waiting_driver':
          return <Badge className="bg-purple-500">Čaka prevzem</Badge>;
        default:
          return <Badge variant="outline">{cycleStatus}</Badge>;
      }
    }
    return <Badge variant="secondary">Aktivna</Badge>;
  };

  const getCodeStatus = (code: QRCodeWithCycle): string => {
    if (code.status === 'pending') return 'pending';
    if (code.status === 'available') return 'available';
    if (code.active_cycle) return code.active_cycle.status;
    return 'active';
  };

  const filteredCodes = qrCodes.filter(code => {
    if (filterStatus === 'all') return true;
    return getCodeStatus(code) === filterStatus;
  });

  const stats = {
    total: qrCodes.length,
    available: qrCodes.filter(c => c.status === 'available').length,
    pending: qrCodes.filter(c => c.status === 'pending').length,
    active: qrCodes.filter(c => c.status === 'active').length,
    onTest: qrCodes.filter(c => c.active_cycle?.status === 'on_test').length,
    waitingPickup: qrCodes.filter(c => c.active_cycle?.status === 'waiting_driver').length,
  };

  const handleExportToExcel = () => {
    if (!selectedSeller) return;

    const exportData = filteredCodes.map(code => ({
      'QR Koda': code.code,
      'Status': getCodeStatus(code),
      'Tip predpražnika': code.active_cycle?.mat_type?.code || code.active_cycle?.mat_type?.name || '-',
      'Podjetje': code.active_cycle?.company?.name || '-',
      'Začetek testa': code.active_cycle?.test_start_date
        ? new Date(code.active_cycle.test_start_date).toLocaleDateString('sl-SI')
        : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QR Kode");

    const sellerName = `${selectedSeller.first_name}_${selectedSeller.last_name}`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `${sellerName}_QR_kode_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Uspeh",
      description: "Excel datoteka prenesena",
    });
  };

  // Translate status to Slovenian for print
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'pending': 'Naročena',
      'available': 'Prosta',
      'active': 'Aktivna',
      'clean': 'Čista',
      'on_test': 'Na testu',
      'dirty': 'Umazana',
      'waiting_driver': 'Čaka prevzem',
      'completed': 'Zaključena',
    };
    return labels[status] || status;
  };

  const handlePrintList = () => {
    if (!selectedSeller) return;

    const sellerName = `${selectedSeller.first_name} ${selectedSeller.last_name}`;

    // Create print content with proper UTF-8 encoding
    const printContent = `
      <!DOCTYPE html>
      <html lang="sl">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>Seznam QR kod - ${sellerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .comparison { margin: 15px 0; padding: 12px; background: #e8f4fd; border-radius: 8px; border: 1px solid #b3d9f7; }
            .match { color: #16a34a; font-weight: bold; }
            .mismatch { color: #dc2626; font-weight: bold; }
            @media print {
              body { padding: 10px; }
              table { font-size: 11px; }
            }
          </style>
        </head>
        <body>
          <h1>Seznam QR kod</h1>
          <div class="meta">
            <strong>Prodajalec:</strong> ${sellerName} (${selectedSeller.code_prefix || 'N/A'})<br>
            <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}<br>
            <strong>Čas:</strong> ${new Date().toLocaleTimeString('sl-SI')}
          </div>

          ${orderStats ? `
          <div class="comparison">
            <strong>Primerjava naročil:</strong><br>
            Naročeno (odobreno + poslano): <strong>${orderStats.approvedOrdered + orderStats.shippedOrdered}</strong><br>
            Generirano kod: <strong>${stats.total}</strong><br>
            Čaka odobritev: <strong>${orderStats.pendingOrdered}</strong><br>
            Stanje: ${stats.total === (orderStats.approvedOrdered + orderStats.shippedOrdered)
              ? '<span class="match">✓ Ujema se</span>'
              : `<span class="mismatch">⚠ Razlika: ${stats.total - (orderStats.approvedOrdered + orderStats.shippedOrdered)}</span>`}
          </div>
          ` : ''}

          <div class="summary">
            <strong>Skupaj kod:</strong> ${stats.total}<br>
            <strong>Prostih:</strong> ${stats.available}<br>
            <strong>Na testu:</strong> ${stats.onTest}<br>
            <strong>Čaka prevzem:</strong> ${stats.waitingPickup}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>QR Koda</th>
                <th>Status</th>
                <th>Tip predpražnika</th>
                <th>Podjetje</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCodes.map((code, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${code.code}</strong></td>
                  <td>${getStatusLabel(getCodeStatus(code))}</td>
                  <td>${code.active_cycle?.mat_type?.code || code.active_cycle?.mat_type?.name || '-'}</td>
                  <td>${code.active_cycle?.company?.name || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([printContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    }
  };

  const isLoading = loadingSellers || loadingCodes;

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
                            {seller.first_name} {seller.last_name} {seller.code_prefix && `(${seller.code_prefix})`}
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
                            <p className="text-sm text-muted-foreground">Predpona kod</p>
                            <p className="text-lg font-semibold">
                              {selectedSeller.code_prefix || 'Ni nastavljeno'}
                            </p>
                          </div>
                          <Button onClick={() => refetch()} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Osveži
                          </Button>
                        </div>

                        {/* Order vs QR codes comparison */}
                        {orderStats && (orderStats.totalOrdered > 0 || stats.total > 0) && (
                          <div className="mb-4 p-4 rounded-lg border bg-muted/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <h3 className="font-semibold">Primerjava naročil in kod</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Naročeno (odobreno+poslano)</p>
                                <p className="text-xl font-bold">{orderStats.approvedOrdered + orderStats.shippedOrdered}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Generirano kod</p>
                                <p className="text-xl font-bold">{stats.total}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Čaka odobritev</p>
                                <p className="text-xl font-bold text-yellow-600">{orderStats.pendingOrdered}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Stanje</p>
                                {stats.total === (orderStats.approvedOrdered + orderStats.shippedOrdered) ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-semibold">Ujema se</span>
                                  </div>
                                ) : stats.total > (orderStats.approvedOrdered + orderStats.shippedOrdered) ? (
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span className="font-semibold">+{stats.total - (orderStats.approvedOrdered + orderStats.shippedOrdered)} več kod</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span className="font-semibold">-{(orderStats.approvedOrdered + orderStats.shippedOrdered) - stats.total} manjka</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-sm text-muted-foreground">Skupaj</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                            <p className="text-sm text-muted-foreground">Prostih</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-sm text-muted-foreground">Naročenih</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                            <p className="text-sm text-muted-foreground">Aktivnih</p>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">{stats.onTest}</p>
                            <p className="text-sm text-muted-foreground">Na testu</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">{stats.waitingPickup}</p>
                            <p className="text-sm text-muted-foreground">Čaka prevzem</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="filterStatus">Filter po statusu</Label>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger id="filterStatus">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Vse</SelectItem>
                              <SelectItem value="available">Proste</SelectItem>
                              <SelectItem value="pending">Naročene</SelectItem>
                              <SelectItem value="clean">Čiste</SelectItem>
                              <SelectItem value="on_test">Na testu</SelectItem>
                              <SelectItem value="dirty">Umazane</SelectItem>
                              <SelectItem value="waiting_driver">Čaka prevzem</SelectItem>
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
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredCodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Ni kod za prikaz
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {filteredCodes.map((code) => (
                        <div
                          key={code.id}
                          className={`p-3 border rounded-lg text-center relative ${
                            code.status === 'available' ? 'bg-green-50 dark:bg-green-950 border-green-300' :
                            code.active_cycle?.status === 'on_test' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300' :
                            code.active_cycle?.status === 'waiting_driver' ? 'bg-purple-50 dark:bg-purple-950 border-purple-300' :
                            'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          {code.active_cycle?.mat_type && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold truncate max-w-[90%]">
                              {code.active_cycle.mat_type.code || code.active_cycle.mat_type.name}
                            </div>
                          )}
                          <p className="font-mono text-sm font-semibold mb-1 mt-1">{code.code}</p>
                          {getStatusBadge(code)}
                          {code.active_cycle?.company && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {code.active_cycle.company.name}
                            </p>
                          )}
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

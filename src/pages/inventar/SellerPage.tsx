import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Printer,
  FileDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Package,
  Phone,
  Mail,
  QrCode,
  ArrowLeft,
} from "lucide-react";
import { useProdajalecProfiles } from "@/hooks/useProfiles";
import * as XLSX from 'xlsx';

import {
  DirtyMat,
  QRCodeWithCycle,
  SellerDirtyMatsCard,
  SellerWaitingDriverCard,
  SellerLongTestCard,
  SellerQRCodesTab,
  SellerQRPrintTab,
} from "./components";

import {
  useSellerQRCodes,
  useSellerOrders,
  useSellerDirtyMats,
  useSellerMutations,
  SellerConfirmDialogs,
} from "./seller";

export default function SellerPage() {
  const { id: sellerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("qr-kode");
  const [selectedDirtyMats, setSelectedDirtyMats] = useState<Set<string>>(new Set());
  const [confirmSelfDelivery, setConfirmSelfDelivery] = useState<string[] | null>(null);
  const [confirmCreatePickup, setConfirmCreatePickup] = useState<DirtyMat[] | null>(null);
  const [confirmCompletePickup, setConfirmCompletePickup] = useState<string[] | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);

  // Fetch seller profile
  const { data: sellers = [] } = useProdajalecProfiles();
  const seller = sellers.find(s => s.id === sellerId);

  // Queries
  const { data: qrCodes = [], isLoading: loadingCodes, refetch } = useSellerQRCodes(sellerId);
  const { data: orderStats } = useSellerOrders(sellerId);
  const { data: dirtyMats = [], isLoading: loadingDirty } = useSellerDirtyMats(sellerId);

  // Mutations
  const {
    selfDeliveryMutation,
    createPickupMutation,
    completePickupMutation,
    sendEmailWarningMutation,
    createCodesMutation,
    deleteCodeMutation,
    handleAddCodes,
  } = useSellerMutations({
    sellerId,
    seller,
    setSelectedDirtyMats,
    setConfirmSelfDelivery,
    setConfirmCreatePickup,
    setConfirmCompletePickup,
    setConfirmDeleteCode,
  });

  // Stats
  const stats = useMemo(() => ({
    total: qrCodes.length,
    available: qrCodes.filter(c => !c.active_cycle && c.status === 'available').length,
    pending: qrCodes.filter(c => c.status === 'pending').length,
    active: qrCodes.filter(c => c.status === 'active' && !c.active_cycle).length,
    onTest: qrCodes.filter(c => c.active_cycle?.status === 'on_test').length,
    dirty: qrCodes.filter(c => c.active_cycle?.status === 'dirty').length,
    waitingPickup: qrCodes.filter(c => c.active_cycle?.status === 'waiting_driver').length,
    clean: qrCodes.filter(c => c.active_cycle?.status === 'clean').length,
  }), [qrCodes]);

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'pending': 'Naročena', 'available': 'Prosta', 'active': 'Aktivna',
      'clean': 'Čista', 'on_test': 'Na testu', 'dirty': 'Umazana',
      'waiting_driver': 'Čaka prevzem', 'completed': 'Zaključena',
    };
    return labels[status] || status;
  };

  const getCodeStatus = (code: QRCodeWithCycle): string => {
    if (code.active_cycle) return code.active_cycle.status;
    if (code.status === 'pending') return 'pending';
    if (code.status === 'available') return 'available';
    return 'active';
  };

  // Dirty mats filtering
  const dirtyMatsOnly = dirtyMats.filter(m => m.status === 'dirty');
  const waitingDriverMats = dirtyMats.filter(m => m.status === 'waiting_driver');
  const longTestMats = dirtyMats.filter(m => m.status === 'on_test' && m.daysOnTest >= 20);

  // Selection handlers
  const toggleDirtyMat = (cycleId: string) => {
    setSelectedDirtyMats(prev => {
      const next = new Set(prev);
      next.has(cycleId) ? next.delete(cycleId) : next.add(cycleId);
      return next;
    });
  };

  const selectAllDirty = () => {
    setSelectedDirtyMats(new Set(dirtyMatsOnly.map(m => m.cycleId)));
  };

  // Print handler
  const handlePrintList = () => {
    if (!seller) return;
    const sellerName = `${seller.first_name} ${seller.last_name}`;
    const filteredCodes = qrCodes;

    const printContent = `
      <!DOCTYPE html>
      <html lang="sl">
        <head>
          <meta charset="UTF-8">
          <title>Seznam QR kod - ${sellerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .comparison { margin: 15px 0; padding: 12px; background: #e8f4fd; border-radius: 8px; }
            .match { color: #16a34a; } .mismatch { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Seznam QR kod</h1>
          <div class="meta">
            <strong>Prodajalec:</strong> ${sellerName} (${seller.code_prefix || 'N/A'})<br>
            <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}
          </div>
          ${orderStats ? `
          <div class="comparison">
            <strong>Primerjava:</strong> Naročeno: ${orderStats.approvedOrdered + orderStats.shippedOrdered} | Aktivirano: ${stats.total - stats.available}
            ${(stats.total - stats.available) === (orderStats.approvedOrdered + orderStats.shippedOrdered)
              ? '<span class="match"> ✓ Ujema se</span>'
              : `<span class="mismatch"> ⚠ Razlika: ${(stats.total - stats.available) - (orderStats.approvedOrdered + orderStats.shippedOrdered)}</span>`}
          </div>
          ` : ''}
          <div class="summary">
            Skupaj: ${stats.total} | Proste: ${stats.available} | Na testu: ${stats.onTest} | Umazane: ${stats.dirty} | Čaka prevzem: ${stats.waitingPickup}
          </div>
          <table>
            <thead><tr><th>#</th><th>QR Koda</th><th>Status</th><th>Tip</th><th>Podjetje</th></tr></thead>
            <tbody>
              ${filteredCodes.map((code, i) => {
                const status = getCodeStatus(code);
                const isDirty = status === 'dirty' || status === 'waiting_driver';
                const companyName = code.active_cycle?.company?.name || '-';
                return `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${code.code}</strong></td>
                  <td>${getStatusLabel(status)}</td>
                  <td>${code.active_cycle?.mat_type?.code || code.active_cycle?.mat_type?.name || '-'}</td>
                  <td>${isDirty ? `<span style="text-decoration: line-through; color: #999;">${companyName}</span>` : companyName}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([printContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => { printWindow.print(); URL.revokeObjectURL(url); };
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    if (!seller) return;

    const exportData = qrCodes.map(code => ({
      'QR Koda': code.code,
      'Status': getStatusLabel(getCodeStatus(code)),
      'Tip predpražnika': code.active_cycle?.mat_type?.code || code.active_cycle?.mat_type?.name || '-',
      'Podjetje': code.active_cycle?.company?.name || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QR Kode");

    const fileName = `${seller.first_name}_${seller.last_name}_QR_kode_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Uspeh", description: "Excel datoteka prenesena" });
  };

  if (!seller) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <InventarSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" aria-label="Nazaj na inventar" onClick={() => navigate('/inventar')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold">{seller.first_name} {seller.last_name}</h1>
                    {seller.code_prefix && (
                      <Badge variant="outline" className="font-mono text-lg px-3">
                        {seller.code_prefix}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                    {seller.phone && (
                      <a href={`tel:${seller.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="h-4 w-4" /> {seller.phone}
                      </a>
                    )}
                    {seller.email && (
                      <a href={`mailto:${seller.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="h-4 w-4" /> {seller.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportToExcel} variant="outline">
                  <FileDown className="h-4 w-4 mr-2" /> Izvozi
                </Button>
                <Button onClick={handlePrintList} variant="outline">
                  <Printer className="h-4 w-4 mr-2" /> Natisni
                </Button>
                <Button onClick={() => refetch()} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" /> Osveži
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Skupaj</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                  <p className="text-sm text-muted-foreground">Proste</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-yellow-600">{stats.onTest}</p>
                  <p className="text-sm text-muted-foreground">Na testu</p>
                </CardContent>
              </Card>
              <Card className={stats.dirty > 0 ? "bg-orange-50 border-orange-300" : ""}>
                <CardContent className="pt-4">
                  <p className={`text-2xl font-bold ${stats.dirty > 0 ? 'text-orange-600' : ''}`}>{stats.dirty}</p>
                  <p className="text-sm text-muted-foreground">Umazane</p>
                </CardContent>
              </Card>
              <Card className={stats.waitingPickup > 0 ? "bg-purple-50 border-purple-300" : ""}>
                <CardContent className="pt-4">
                  <p className={`text-2xl font-bold ${stats.waitingPickup > 0 ? 'text-purple-600' : ''}`}>{stats.waitingPickup}</p>
                  <p className="text-sm text-muted-foreground">Čaka šoferja</p>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="pt-4">
                  {orderStats ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Naročeno vs Aktivirano</p>
                        <p className="text-lg font-semibold">
                          {orderStats.approvedOrdered + orderStats.shippedOrdered} / {stats.total - stats.available}
                        </p>
                      </div>
                      {(stats.total - stats.available) === (orderStats.approvedOrdered + orderStats.shippedOrdered) ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Ni naročil</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="qr-kode" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> QR Kode ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="tiskanje" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" /> Tiskanje ({stats.available})
                </TabsTrigger>
                <TabsTrigger value="ukrepanje" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Za ukrepanje ({dirtyMatsOnly.length + waitingDriverMats.length + longTestMats.length})
                </TabsTrigger>
                <TabsTrigger value="narocila" className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Naročila
                </TabsTrigger>
              </TabsList>

              {/* QR Kode Tab */}
              <TabsContent value="qr-kode" className="mt-4">
                <SellerQRCodesTab
                  qrCodes={qrCodes}
                  stats={stats}
                  loadingCodes={loadingCodes}
                  codePrefix={seller.code_prefix}
                  isCreatingCodes={createCodesMutation.isPending}
                  onAddCodes={handleAddCodes}
                  onDeleteCode={(codeId) => setConfirmDeleteCode(codeId)}
                />
              </TabsContent>

              {/* Tiskanje Tab */}
              <TabsContent value="tiskanje" className="mt-4">
                <SellerQRPrintTab
                  qrCodes={qrCodes}
                  sellerName={`${seller.first_name} ${seller.last_name}`}
                  codePrefix={seller.code_prefix}
                />
              </TabsContent>

              {/* Za ukrepanje Tab */}
              <TabsContent value="ukrepanje" className="mt-4 space-y-4">
                <SellerDirtyMatsCard
                  dirtyMatsOnly={dirtyMatsOnly}
                  loadingDirty={loadingDirty}
                  selectedDirtyMats={selectedDirtyMats}
                  onToggleDirtyMat={toggleDirtyMat}
                  onSelectAllDirty={selectAllDirty}
                  onClearSelection={() => setSelectedDirtyMats(new Set())}
                  onCreatePickup={(mats) => setConfirmCreatePickup(mats)}
                  onSelfDelivery={(cycleIds) => setConfirmSelfDelivery(cycleIds)}
                />

                <SellerWaitingDriverCard
                  waitingDriverMats={waitingDriverMats}
                  isPending={completePickupMutation.isPending}
                  onCompletePickup={(cycleIds) => setConfirmCompletePickup(cycleIds)}
                />

                <SellerLongTestCard
                  longTestMats={longTestMats}
                  sellerEmail={seller.email}
                  isSendingEmail={sendEmailWarningMutation.isPending}
                  onSendEmailWarning={(mats) => sendEmailWarningMutation.mutate(mats)}
                  onCreatePickup={(mats) => setConfirmCreatePickup(mats)}
                  onSelfDelivery={(cycleIds) => setConfirmSelfDelivery(cycleIds)}
                />
              </TabsContent>

              {/* Naročila Tab */}
              <TabsContent value="narocila" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Naročila</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderStats?.orders && orderStats.orders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Datum</TableHead>
                            <TableHead>Količina</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderStats.orders.map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                {new Date(order.created_at).toLocaleDateString('sl-SI')}
                              </TableCell>
                              <TableCell className="font-semibold">{order.quantity}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  order.status === 'pending' ? 'secondary' :
                                  order.status === 'approved' ? 'default' :
                                  order.status === 'shipped' ? 'default' :
                                  order.status === 'rejected' ? 'destructive' : 'outline'
                                }>
                                  {order.status === 'pending' ? 'Čaka odobritev' :
                                   order.status === 'approved' ? 'Odobreno' :
                                   order.status === 'shipped' ? 'Poslano' :
                                   order.status === 'rejected' ? 'Zavrnjeno' : order.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Ni naročil</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <SellerConfirmDialogs
        confirmSelfDelivery={confirmSelfDelivery}
        setConfirmSelfDelivery={setConfirmSelfDelivery}
        onConfirmSelfDelivery={(cycleIds) => selfDeliveryMutation.mutate(cycleIds)}
        isSelfDeliveryPending={selfDeliveryMutation.isPending}
        confirmCreatePickup={confirmCreatePickup}
        setConfirmCreatePickup={setConfirmCreatePickup}
        onConfirmCreatePickup={(mats) => createPickupMutation.mutate(mats)}
        isCreatePickupPending={createPickupMutation.isPending}
        confirmCompletePickup={confirmCompletePickup}
        setConfirmCompletePickup={setConfirmCompletePickup}
        onConfirmCompletePickup={(cycleIds) => completePickupMutation.mutate(cycleIds)}
        isCompletePickupPending={completePickupMutation.isPending}
        confirmDeleteCode={confirmDeleteCode}
        setConfirmDeleteCode={setConfirmDeleteCode}
        onConfirmDeleteCode={(codeId) => deleteCodeMutation.mutate(codeId)}
        isDeleteCodePending={deleteCodeMutation.isPending}
      />
    </SidebarProvider>
  );
}

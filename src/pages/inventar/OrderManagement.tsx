import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, RefreshCw, Check, X, Truck, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInventoryByUser } from '@/hooks/useInventoryStats';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAllOrders,
  useApproveOrder,
  useRejectOrder,
  useShipOrder,
  formatDate,
  getStatusBadge,
  generateOrderPrintContent,
  printOrderCodes,
  ApproveDialog,
  RejectDialog,
  ShipDialog,
  type OrderWithSeller,
} from './orders';

export default function OrderManagement() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'completed' | 'rejected'>('pending');
  const [approveOrder, setApproveOrder] = useState<OrderWithSeller | null>(null);
  const [rejectOrder, setRejectOrder] = useState<OrderWithSeller | null>(null);
  const [shipOrder, setShipOrder] = useState<OrderWithSeller | null>(null);

  const { profile } = useAuth();
  const { toast } = useToast();

  const { data: orders, isLoading, refetch } = useAllOrders();
  const { data: inventoryStats } = useInventoryByUser();

  const approveMutation = useApproveOrder(() => setApproveOrder(null));
  const rejectMutation = useRejectOrder(() => setRejectOrder(null));
  const shipMutation = useShipOrder(() => setShipOrder(null));

  // Filter orders by tab
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    switch (activeTab) {
      case 'pending':
        return orders.filter((o) => o.status === 'pending');
      case 'approved':
        return orders.filter((o) => o.status === 'approved');
      case 'completed':
        return orders.filter((o) => o.status === 'shipped' || o.status === 'received');
      case 'rejected':
        return orders.filter((o) => o.status === 'rejected');
      default:
        return [];
    }
  }, [orders, activeTab]);

  // Get seller's current inventory stats
  const getSellerStats = (sellerId: string) => {
    if (!inventoryStats) return null;
    return inventoryStats.sellers.find((s) => s.id === sellerId);
  };

  // Print order codes for laundry
  const handlePrintOrderCodes = async (order: OrderWithSeller) => {
    try {
      const { data: codes, error } = await supabase
        .from('qr_codes')
        .select('code')
        .eq('order_id', order.id)
        .order('code');

      if (error) throw error;

      if (!codes || codes.length === 0) {
        toast({
          title: 'Napaka',
          description: 'Ni kod za to naročilo',
          variant: 'destructive',
        });
        return;
      }

      const printContent = generateOrderPrintContent(order, codes);
      printOrderCodes(printContent);
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message || 'Napaka pri tiskanju',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = (quantity: number) => {
    if (approveOrder?.salespersonPrefix) {
      approveMutation.mutate({
        orderId: approveOrder.id,
        salespersonId: approveOrder.salespersonId,
        prefix: approveOrder.salespersonPrefix,
        quantity,
        approvedBy: profile?.id,
      });
    }
  };

  const handleReject = (reason: string) => {
    if (rejectOrder) {
      rejectMutation.mutate({
        orderId: rejectOrder.id,
        reason,
      });
    }
  };

  const handleShip = () => {
    if (shipOrder) {
      shipMutation.mutate(shipOrder.id);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Upravljanje naročil
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Osveži
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Čakajo odobritev</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">
                  {orders?.filter((o) => o.status === 'pending').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Odobrena</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {orders?.filter((o) => o.status === 'approved').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Odposlana</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {orders?.filter((o) => o.status === 'shipped').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Zavrnjena</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">
                  {orders?.filter((o) => o.status === 'rejected').length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="pending">
                Čakajo ({orders?.filter((o) => o.status === 'pending').length || 0})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Odobrena ({orders?.filter((o) => o.status === 'approved').length || 0})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Zaključena ({orders?.filter((o) => o.status === 'shipped' || o.status === 'received').length || 0})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Zavrnjena ({orders?.filter((o) => o.status === 'rejected').length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Ni naročil v tej kategoriji.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prodajalec</TableHead>
                          <TableHead>Količina</TableHead>
                          <TableHead>Trenutno stanje</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => {
                          const sellerStats = getSellerStats(order.salespersonId);
                          return (
                            <TableRow key={order.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {order.salespersonPrefix && (
                                    <Badge variant="outline" className="font-mono">
                                      {order.salespersonPrefix}
                                    </Badge>
                                  )}
                                  <span className="font-medium">{order.salespersonName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold">{order.quantity}</span>
                              </TableCell>
                              <TableCell>
                                {sellerStats ? (
                                  <div className="text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        {sellerStats.clean} čistih
                                      </Badge>
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                        {sellerStats.onTest} na testu
                                      </Badge>
                                    </div>
                                    <div className="text-gray-500">Skupaj: {sellerStats.total}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{formatDate(order.createdAt)}</div>
                              </TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {order.status === 'pending' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 hover:text-green-700"
                                        onClick={() => setApproveOrder(order)}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Odobri
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => setRejectOrder(order)}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Zavrni
                                      </Button>
                                    </>
                                  )}
                                  {order.status === 'approved' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePrintOrderCodes(order)}
                                      >
                                        <Printer className="h-4 w-4 mr-1" />
                                        Natisni za pralnico
                                      </Button>
                                      <Button size="sm" onClick={() => setShipOrder(order)}>
                                        <Truck className="h-4 w-4 mr-1" />
                                        Pošlji
                                      </Button>
                                    </>
                                  )}
                                  {order.rejectionReason && (
                                    <span className="text-sm text-red-600">{order.rejectionReason}</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          <ApproveDialog
            order={approveOrder}
            sellerStats={approveOrder ? getSellerStats(approveOrder.salespersonId) : null}
            onClose={() => setApproveOrder(null)}
            onApprove={handleApprove}
            isPending={approveMutation.isPending}
          />
          <RejectDialog
            order={rejectOrder}
            onClose={() => setRejectOrder(null)}
            onReject={handleReject}
            isPending={rejectMutation.isPending}
          />
          <ShipDialog
            order={shipOrder}
            onClose={() => setShipOrder(null)}
            onShip={handleShip}
            isPending={shipMutation.isPending}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Loader2,
  Package,
  RefreshCw,
  Check,
  X,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useInventoryByUser } from '@/hooks/useInventoryStats';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateUniqueQRCodes } from '@/lib/utils';

interface OrderWithSeller {
  id: string;
  salespersonId: string;
  salespersonName: string;
  salespersonPrefix: string | null;
  status: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  shippedAt: string | null;
  rejectionReason: string | null;
}

function useAllOrders() {
  return useQuery({
    queryKey: ['orders', 'all'],
    queryFn: async (): Promise<OrderWithSeller[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          salesperson_id,
          status,
          notes,
          created_at,
          approved_at,
          approved_by,
          shipped_at,
          rejection_reason,
          profiles!orders_salesperson_id_fkey(first_name, last_name, code_prefix)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((order: any) => {
        let quantity = 0;
        if (order.notes) {
          const match = order.notes.match(/Količina:\s*(\d+)/);
          if (match) {
            quantity = parseInt(match[1], 10);
          }
        }

        return {
          id: order.id,
          salespersonId: order.salesperson_id,
          salespersonName: order.profiles
            ? `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`.trim()
            : 'Neznan',
          salespersonPrefix: order.profiles?.code_prefix || null,
          status: order.status,
          quantity,
          notes: order.notes,
          createdAt: order.created_at,
          approvedAt: order.approved_at,
          approvedBy: order.approved_by,
          shippedAt: order.shipped_at,
          rejectionReason: order.rejection_reason,
        };
      });
    },
  });
}

export default function OrderManagement() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'completed' | 'rejected'>('pending');
  const [approveOrder, setApproveOrder] = useState<OrderWithSeller | null>(null);
  const [rejectOrder, setRejectOrder] = useState<OrderWithSeller | null>(null);
  const [shipOrder, setShipOrder] = useState<OrderWithSeller | null>(null);
  const [approvedQuantity, setApprovedQuantity] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState('');

  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch } = useAllOrders();
  const { data: sellers } = useProfilesByRole('prodajalec');
  const { data: inventoryStats } = useInventoryByUser();

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

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({
      orderId,
      salespersonId,
      prefix,
      quantity,
    }: {
      orderId: string;
      salespersonId: string;
      prefix: string;
      quantity: number;
    }) => {
      // Get existing codes to ensure uniqueness
      const existingCodesResult = await supabase
        .from('qr_codes')
        .select('code')
        .like('code', `${prefix}-%`);

      const existingCodes = new Set(
        (existingCodesResult.data || []).map((c) => c.code)
      );

      // Generate unique random codes
      const generatedCodes = generateUniqueQRCodes(prefix, quantity, existingCodes);

      if (generatedCodes.length < quantity) {
        throw new Error('Ni mogoče generirati dovolj unikatnih kod.');
      }

      const newCodes = generatedCodes.map(code => ({
        code,
        owner_id: salespersonId,
        status: 'available',
        order_id: orderId,
      }));

      // Insert new QR codes
      const { error: codesError } = await supabase
        .from('qr_codes')
        .insert(newCodes);

      if (codesError) throw codesError;

      // Update order status to approved
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
          notes: `Količina: ${quantity}`,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return { order: data, generatedCodes };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Naročilo odobreno',
        description: `Generirano ${data.generatedCodes.length} novih QR kod. Prodajalec jih lahko zdaj vidi.`,
      });
      setApproveOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Naročilo zavrnjeno',
        description: 'Naročilo je bilo zavrnjeno.',
      });
      setRejectOrder(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const shipMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Just update order status to shipped (codes already generated on approval)
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Naročilo odposlano',
        description: 'Naročilo je bilo označeno kot odposlano.',
      });
      setShipOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Napaka',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Čaka odobritev
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Check className="h-3 w-3 mr-1" />
            Odobreno
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Truck className="h-3 w-3 mr-1" />
            Odposlano
          </Badge>
        );
      case 'received':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Prejeto
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Zavrnjeno
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openApproveDialog = (order: OrderWithSeller) => {
    setApproveOrder(order);
    setApprovedQuantity(order.quantity);
  };

  const openShipDialog = (order: OrderWithSeller) => {
    setShipOrder(order);
  };

  // Print order codes for laundry
  const handlePrintOrderCodes = async (order: OrderWithSeller) => {
    try {
      // Fetch QR codes for this order
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

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Naročilo za pralnico - ${order.salespersonName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 24px; margin-bottom: 5px; }
              .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
              .codes-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-top: 20px;
              }
              .code-item {
                border: 2px solid #333;
                padding: 15px;
                text-align: center;
                font-family: monospace;
                font-size: 18px;
                font-weight: bold;
                border-radius: 8px;
              }
              .summary {
                margin: 20px 0;
                padding: 15px;
                background: #f0f0f0;
                border-radius: 8px;
              }
              .checkbox {
                width: 20px;
                height: 20px;
                border: 2px solid #333;
                display: inline-block;
                margin-right: 10px;
                vertical-align: middle;
              }
              @media print {
                .code-item { break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <h1>📦 Priprava predpražnikov</h1>
            <div class="meta">
              <strong>Prodajalec:</strong> ${order.salespersonName} (${order.salespersonPrefix || 'N/A'})<br>
              <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}<br>
              <strong>Čas:</strong> ${new Date().toLocaleTimeString('sl-SI')}
            </div>
            <div class="summary">
              <strong>Skupaj predpražnikov: ${codes.length}</strong><br>
              Prosim pripravite spodaj navedene predpražnike in nanje nalepite ustrezne QR nalepke.
            </div>
            <div class="codes-grid">
              ${codes.map(c => `
                <div class="code-item">
                  <span class="checkbox"></span>
                  ${c.code}
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(url);
        };
      }
    } catch (error: any) {
      toast({
        title: 'Napaka',
        description: error.message || 'Napaka pri tiskanju',
        variant: 'destructive',
      });
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
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Osveži
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Čakajo odobritev
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">
                  {orders?.filter((o) => o.status === 'pending').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Odobrena
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {orders?.filter((o) => o.status === 'approved').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Odposlana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {orders?.filter((o) => o.status === 'shipped').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Zavrnjena
                </CardTitle>
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
                                  <span className="font-medium">
                                    {order.salespersonName}
                                  </span>
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
                                    <div className="text-gray-500">
                                      Skupaj: {sellerStats.total}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {formatDate(order.createdAt)}
                                </div>
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
                                        onClick={() => openApproveDialog(order)}
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
                                      <Button
                                        size="sm"
                                        onClick={() => openShipDialog(order)}
                                      >
                                        <Truck className="h-4 w-4 mr-1" />
                                        Pošlji
                                      </Button>
                                    </>
                                  )}
                                  {order.rejectionReason && (
                                    <span className="text-sm text-red-600">
                                      {order.rejectionReason}
                                    </span>
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

          {/* Approve Dialog */}
          <Dialog open={!!approveOrder} onOpenChange={() => setApproveOrder(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Odobri naročilo</DialogTitle>
                <DialogDescription>
                  Naročilo za {approveOrder?.salespersonName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {approveOrder && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zahtevana količina:</span>
                        <span className="font-semibold">{approveOrder.quantity}</span>
                      </div>
                      {(() => {
                        const stats = getSellerStats(approveOrder.salespersonId);
                        return stats ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Trenutno čistih:</span>
                              <span>{stats.clean}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Skupaj aktivnih:</span>
                              <span>{stats.total}</span>
                            </div>
                          </>
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="approved_quantity">Odobrena količina</Label>
                      <Input
                        id="approved_quantity"
                        type="number"
                        min={1}
                        value={approvedQuantity}
                        onChange={(e) => setApprovedQuantity(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveOrder(null)}>
                  Prekliči
                </Button>
                <Button
                  onClick={() =>
                    approveOrder &&
                    approveOrder.salespersonPrefix &&
                    approveMutation.mutate({
                      orderId: approveOrder.id,
                      salespersonId: approveOrder.salespersonId,
                      prefix: approveOrder.salespersonPrefix,
                      quantity: approvedQuantity,
                    })
                  }
                  disabled={approveMutation.isPending || approvedQuantity < 1 || !approveOrder?.salespersonPrefix}
                >
                  {approveMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Odobri in generiraj kode
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <AlertDialog open={!!rejectOrder} onOpenChange={() => setRejectOrder(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Zavrni naročilo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Naročilo za {rejectOrder?.salespersonName} ({rejectOrder?.quantity} kod)
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="rejection_reason">Razlog zavrnitve</Label>
                <Textarea
                  id="rejection_reason"
                  placeholder="Vpišite razlog zavrnitve..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() =>
                    rejectOrder &&
                    rejectMutation.mutate({
                      orderId: rejectOrder.id,
                      reason: rejectionReason,
                    })
                  }
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Zavrni
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Ship Dialog */}
          <AlertDialog open={!!shipOrder} onOpenChange={() => setShipOrder(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Označi kot poslano?</AlertDialogTitle>
                <AlertDialogDescription>
                  Potrdi, da so bili predpražniki fizično poslani prodajalcu {shipOrder?.salespersonName}.
                  QR kode so bile že generirane ob odobritvi naročila.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => shipOrder && shipMutation.mutate(shipOrder.id)}
                  disabled={shipMutation.isPending}
                >
                  {shipMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Potrdi pošiljanje
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </SidebarProvider>
  );
}

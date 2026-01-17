import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Send, Check, Clock, X, Truck, Home, Camera, Users, ChevronDown, ChevronUp, QrCode } from 'lucide-react';
import { useOrders, useCreateOrder, useOrderStats, useOrderCodes } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG = {
  pending: { label: 'Čaka odobritev', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  approved: { label: 'Odobreno', icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { label: 'Zavrnjeno', icon: X, color: 'text-red-600', bg: 'bg-red-50' },
  shipped: { label: 'Poslano', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
  received: { label: 'Prejeto', icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
};

const MAT_TYPES = [
  { code: 'MBW0', name: 'MBW0' },
  { code: 'MBW1', name: 'MBW1' },
  { code: 'MBW2', name: 'MBW2' },
  { code: 'MBW4', name: 'MBW4' },
  { code: 'ERM10R', name: 'ERM10R' },
  { code: 'ERM11R', name: 'ERM11R' },
  { code: 'ERM49R', name: 'ERM49R' },
  { code: 'ERM51R', name: 'ERM51R' },
];

// Component to show QR codes for an order
function OrderCodesPreview({ orderId }: { orderId: string }) {
  const { data: codes, isLoading } = useOrderCodes(orderId);

  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-dashed">
        <div className="animate-pulse flex flex-wrap gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!codes || codes.length === 0) {
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-dashed text-center text-gray-500 text-sm">
        <QrCode size={20} className="mx-auto mb-1 opacity-50" />
        Ni kod za to naročilo
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-white rounded-lg border border-dashed">
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
        <QrCode size={16} />
        <span className="font-medium">Generirane kode ({codes.length}):</span>
      </div>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {codes.map(code => (
          <span
            key={code.id}
            className={`px-2 py-1 rounded text-sm font-mono ${
              code.status === 'available'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {code.code}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OrderCodes() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: orders, isLoading: loadingOrders } = useOrders(user?.id);
  const { data: stats, isLoading: loadingStats } = useOrderStats(user?.id);
  const createOrder = useCreateOrder();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const updateQuantity = (code: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [code]: Math.max(0, num)
    }));
  };

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, q) => sum + q, 0);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    const total = getTotalQuantity();
    if (total < 1) {
      toast({
        description: 'Vnesi vsaj eno količino',
        variant: 'destructive',
      });
      return;
    }

    // Build order details string
    const orderDetails = MAT_TYPES
      .filter(type => quantities[type.code] > 0)
      .map(type => `${type.code}: ${quantities[type.code]}`)
      .join('\n');

    const fullNotes = `${orderDetails}${notes.trim() ? `\n\nOpomba: ${notes.trim()}` : ''}`;

    try {
      await createOrder.mutateAsync({
        userId: user.id,
        quantity: total,
        notes: fullNotes,
      });

      toast({
        description: '✅ Naročilo poslano',
      });

      setQuantities({});
      setNotes('');
    } catch (error) {
      toast({
        description: 'Napaka pri pošiljanju naročila',
        variant: 'destructive',
      });
    }
  };

  const isLoading = loadingOrders || loadingStats;

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/prodajalec')} className="p-1 hover:bg-blue-700 rounded">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Naroči nove kode</h1>
            <div className="text-sm opacity-80">{profile?.first_name} {profile?.last_name}</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Current Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-700 mb-3">Trenutno stanje</h2>

          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 p-3 rounded">
                <div className="text-2xl font-bold text-green-600">{stats?.available || 0}</div>
                <div className="text-sm text-gray-600">Proste kode</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-2xl font-bold text-blue-600">{stats?.active || 0}</div>
                <div className="text-sm text-gray-600">Aktivne</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-2xl font-bold text-gray-600">{stats?.total || 0}</div>
                <div className="text-sm text-gray-600">Skupaj</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="text-2xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</div>
                <div className="text-sm text-gray-600">V obdelavi</div>
              </div>
            </div>
          )}
        </div>

        {/* Order Form */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-700 mb-3">Novo naročilo</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-3">
              Vnesi količino za vsak tip:
            </label>

            <div className="space-y-2">
              {MAT_TYPES.map(type => (
                <div key={type.code} className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={quantities[type.code] || ''}
                    onChange={(e) => updateQuantity(type.code, e.target.value)}
                    placeholder="0"
                    className="w-20 p-2 border rounded text-center font-mono text-lg"
                  />
                  <span className="font-medium text-gray-700">{type.name}</span>
                </div>
              ))}
            </div>

            {getTotalQuantity() > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Skupaj:</div>
                <div className="text-2xl font-bold text-blue-600">{getTotalQuantity()} kod</div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Opomba za inventar (opcijsko)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Potrebujem do petka..."
              className="w-full p-3 border rounded-lg resize-none"
              rows={2}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={createOrder.isPending || getTotalQuantity() < 1}
            className="w-full bg-blue-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {createOrder.isPending ? (
              <>Pošiljam...</>
            ) : (
              <>
                <Send size={20} />
                Pošlji naročilo
              </>
            )}
          </button>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-700 mb-3">Zgodovina naročil</h2>

          {loadingOrders ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : !orders || orders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Ni naročil</p>
          ) : (
            <div className="space-y-2">
              {orders.map(order => {
                const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
                const StatusIcon = statusConfig?.icon || Clock;
                const isExpanded = expandedOrderId === order.id;
                const canExpand = order.status === 'approved' || order.status === 'shipped' || order.status === 'received';

                // Parse order details from notes
                const orderLines = order.notes?.split('\n').filter(line =>
                  MAT_TYPES.some(t => line.startsWith(t.code))
                ) || [];

                return (
                  <div key={order.id}>
                    <div
                      className={`p-3 rounded-lg border ${statusConfig?.bg || 'bg-gray-50'} ${canExpand ? 'cursor-pointer' : ''}`}
                      onClick={() => canExpand && setExpandedOrderId(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={18} className={statusConfig?.color || 'text-gray-600'} />
                          <span className="font-medium">{order.total_quantity || '?'} kod</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${statusConfig?.color || 'text-gray-600'}`}>
                            {statusConfig?.label || order.status}
                          </span>
                          {canExpand && (
                            isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />
                          )}
                        </div>
                      </div>
                      {orderLines.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1 font-mono">
                          {orderLines.join(' • ')}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(order.created_at).toLocaleDateString('sl-SI', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                      {order.rejection_reason && (
                        <div className="text-sm text-red-600 mt-1">
                          Razlog: {order.rejection_reason}
                        </div>
                      )}
                    </div>

                    {/* Expanded QR codes section */}
                    {isExpanded && <OrderCodesPreview orderId={order.id} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => navigate('/prodajalec')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Home size={22} />
            <span className="text-xs mt-1">Domov</span>
          </button>
          <button
            onClick={() => navigate('/prodajalec')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Camera size={22} />
            <span className="text-xs mt-1">Skeniraj</span>
          </button>
          <button
            onClick={() => navigate('/contacts')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Users size={22} />
            <span className="text-xs mt-1">Stranke</span>
          </button>
          <button
            className="flex-1 py-3 flex flex-col items-center text-blue-600"
          >
            <Package size={22} />
            <span className="text-xs mt-1">Naroči</span>
          </button>
        </div>
      </div>
    </div>
  );
}

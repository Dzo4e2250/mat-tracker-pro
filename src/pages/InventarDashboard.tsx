import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, AlertTriangle, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useInventarStats } from '@/hooks/useProfiles';
import { useInventoryByUser } from '@/hooks/useInventoryStats';
import { useDashboardActions, ActionItem } from '@/hooks/useDashboardActions';

const DIRTY_THRESHOLD = 10;

// Ikone za tipe akcij
const ACTION_ICONS: Record<string, React.ReactNode> = {
  critical_test: <AlertCircle className="h-4 w-4 text-red-500" />,
  old_pickup: <Clock className="h-4 w-4 text-red-500" />,
  dirty_seller: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  waiting_driver: <Clock className="h-4 w-4 text-orange-500" />,
  long_test: <Clock className="h-4 w-4 text-yellow-600" />,
  active_pickup: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
};

export default function InventarDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading: loadingStats } = useInventarStats();
  const { data: inventoryStats, isLoading: loadingInventory } = useInventoryByUser();
  const { data: actions, isLoading: loadingActions } = useDashboardActions();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 flex flex-col">
          <div className="p-6 flex-1 flex flex-col">
            {/* Actions Panel */}
            {!loadingActions && actions && (actions.totalUrgent > 0 || actions.totalToday > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Urgentno */}
                <Card className={actions.totalUrgent > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        actions.totalUrgent > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {actions.totalUrgent}
                      </span>
                      <span className={actions.totalUrgent > 0 ? 'text-red-800' : 'text-gray-500'}>
                        Urgentno
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {actions.totalUrgent === 0 ? (
                      <p className="text-sm text-gray-400">Ni urgentnih zadev</p>
                    ) : (
                      <div className="space-y-2">
                        {actions.urgent.slice(0, 5).map((action) => (
                          <ActionCard key={action.id} action={action} />
                        ))}
                        {actions.urgent.length > 5 && (
                          <p className="text-xs text-red-600">+ {actions.urgent.length - 5} več</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Za danes */}
                <Card className={actions.totalToday > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        actions.totalToday > 0 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {actions.totalToday}
                      </span>
                      <span className={actions.totalToday > 0 ? 'text-orange-800' : 'text-gray-500'}>
                        Za danes
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {actions.totalToday === 0 ? (
                      <p className="text-sm text-gray-400">Ni zadev za danes</p>
                    ) : (
                      <div className="space-y-2">
                        {actions.today.slice(0, 5).map((action) => (
                          <ActionCard key={action.id} action={action} />
                        ))}
                        {actions.today.length > 5 && (
                          <p className="text-xs text-orange-600">+ {actions.today.length - 5} več</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Header with Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Skupaj QR kod</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <p className="text-3xl font-bold">{stats?.totalQRCodes ?? 0}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Proste QR kode</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <p className="text-3xl font-bold">{stats?.availableQRCodes ?? 0}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Aktivni prodajalci</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <p className="text-3xl font-bold">{stats?.activeProdajalec ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pregled po prodajalcih */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pregled po prodajalcih
                  {inventoryStats?.sellers.some(s => s.dirty >= DIRTY_THRESHOLD) && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Opozorilo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingInventory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : inventoryStats?.sellers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Ni aktivnih prodajalcev</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prodajalec</TableHead>
                        <TableHead className="text-center">Čisti</TableHead>
                        <TableHead className="text-center">Na testu</TableHead>
                        <TableHead className="text-center">Umazani</TableHead>
                        <TableHead className="text-center">Čaka šoferja</TableHead>
                        <TableHead className="text-center">Skupaj</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryStats?.sellers.map((seller) => (
                        <TableRow
                          key={seller.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => navigate(`/inventar/prodajalec/${seller.id}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {seller.codePrefix && (
                                <Badge variant="outline" className="font-mono">
                                  {seller.codePrefix}
                                </Badge>
                              )}
                              <span>{seller.firstName} {seller.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {seller.clean}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {seller.onTest}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Badge
                                variant={seller.dirty >= DIRTY_THRESHOLD ? 'destructive' : 'secondary'}
                                className={seller.dirty >= DIRTY_THRESHOLD ? '' : 'bg-red-100 text-red-800'}
                              >
                                {seller.dirty}
                              </Badge>
                              {seller.dirty >= DIRTY_THRESHOLD && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              {seller.waitingDriver}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {seller.total}
                          </TableCell>
                        </TableRow>
                      ))}
                      {inventoryStats && inventoryStats.sellers.length > 0 && (
                        <TableRow className="bg-gray-50 font-semibold">
                          <TableCell>Skupaj</TableCell>
                          <TableCell className="text-center">{inventoryStats.totals.clean}</TableCell>
                          <TableCell className="text-center">{inventoryStats.totals.onTest}</TableCell>
                          <TableCell className="text-center">{inventoryStats.totals.dirty}</TableCell>
                          <TableCell className="text-center">{inventoryStats.totals.waitingDriver}</TableCell>
                          <TableCell className="text-center">{inventoryStats.totals.total}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

// Komponenta za prikaz posamezne akcije
function ActionCard({ action }: { action: ActionItem }) {
  return (
    <Link
      to={action.link}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors group"
    >
      <div className="flex-shrink-0">
        {ACTION_ICONS[action.type] || <AlertCircle className="h-4 w-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
        <p className="text-xs text-gray-500 truncate">{action.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
    </Link>
  );
}

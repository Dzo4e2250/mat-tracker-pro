import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, TestTube, TrendingUp, FileText, AlertTriangle, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  useKPIData,
  useMonthlyData,
  useStatusDistribution,
  useTopSellers,
  useExpiringTests,
} from '@/hooks/useAnalyticsData';
import { useProdajalecProfiles } from '@/hooks/useProfiles';

export default function Analytics() {
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

  const { data: sellers } = useProdajalecProfiles();
  const { data: kpi, isLoading: loadingKPI } = useKPIData();
  const { data: monthlyData, isLoading: loadingMonthly } = useMonthlyData(selectedSeller);
  const { data: statusDistribution, isLoading: loadingStatus } = useStatusDistribution();
  const { data: topSellers, isLoading: loadingSellers } = useTopSellers(5);
  const { data: expiringTests, isLoading: loadingExpiring } = useExpiringTests();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 flex flex-col">
          <div className="p-6 flex-1 flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Analitika</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aktivni cikli
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingKPI ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <p className="text-3xl font-bold">{kpi?.activeCycles ?? 0}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Na testu
                  </CardTitle>
                  <TestTube className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  {loadingKPI ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-600">{kpi?.onTestCount ?? 0}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Konverzija (90 dni)
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  {loadingKPI ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600">{kpi?.conversionRate ?? 0}%</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Podpisane pogodbe
                  </CardTitle>
                  <FileText className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  {loadingKPI ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <p className="text-3xl font-bold text-purple-600">{kpi?.contractsCount ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Mesečni trendi (12 mesecev)</CardTitle>
                  <Select
                    value={selectedSeller || 'all'}
                    onValueChange={(value) => setSelectedSeller(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Vsi prodajalci" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Vsi prodajalci</SelectItem>
                      {sellers?.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.code_prefix && `${seller.code_prefix} - `}
                          {seller.first_name} {seller.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {loadingMonthly ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="newTests"
                          name="Novi testi"
                          stroke="#3B82F6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="contracts"
                          name="Pogodbe"
                          stroke="#22C55E"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="completed"
                          name="Zaključeni"
                          stroke="#EF4444"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Status Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribucija statusov</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStatus ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : statusDistribution && statusDistribution.length > 0 ? (
                    <div className="flex items-center justify-center gap-8">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${value}`}
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {statusDistribution.map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.name}</span>
                            <span className="text-sm font-semibold ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Ni podatkov
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row: Top Sellers & Expiring Tests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Sellers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top prodajalci</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSellers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : topSellers && topSellers.length > 0 ? (
                    <div className="space-y-3">
                      {topSellers.map((seller, index) => (
                        <div
                          key={seller.id}
                          className="flex items-center justify-between py-2 border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                {seller.codePrefix && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {seller.codePrefix}
                                  </Badge>
                                )}
                                <span className="font-medium">{seller.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {seller.onTest} na testu
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">{seller.contracts}</p>
                            <p className="text-xs text-muted-foreground">pogodb</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Ni aktivnih prodajalcev
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Expiring Tests */}
              <Card className={expiringTests && expiringTests.length > 0 ? 'border-orange-200' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Testi ki potečejo kmalu
                    {expiringTests && expiringTests.length > 0 && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {expiringTests.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingExpiring ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : expiringTests && expiringTests.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {expiringTests.slice(0, 10).map((test) => (
                        <div
                          key={test.cycleId}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            test.daysRemaining <= 0
                              ? 'bg-red-50 border border-red-200'
                              : test.daysRemaining <= 3
                              ? 'bg-orange-50 border border-orange-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {test.daysRemaining <= 0 && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-mono font-medium">{test.qrCode}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {test.companyName || 'Brez podjetja'} - {test.salespersonName}
                            </p>
                          </div>
                          <Badge
                            variant={
                              test.daysRemaining <= 0
                                ? 'destructive'
                                : test.daysRemaining <= 3
                                ? 'secondary'
                                : 'outline'
                            }
                            className={
                              test.daysRemaining <= 0
                                ? ''
                                : test.daysRemaining <= 3
                                ? 'bg-orange-100 text-orange-800'
                                : ''
                            }
                          >
                            {test.daysRemaining <= 0
                              ? `Potekel ${Math.abs(test.daysRemaining)} dni`
                              : test.daysRemaining === 1
                              ? 'Jutri'
                              : `${test.daysRemaining} dni`}
                          </Badge>
                        </div>
                      ))}
                      {expiringTests.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          ... in še {expiringTests.length - 10} testov
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Ni testov ki bi potekli v naslednjih 3 dneh
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

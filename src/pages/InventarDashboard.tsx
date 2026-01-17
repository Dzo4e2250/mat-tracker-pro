import { useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle, Map, LayoutDashboard, Filter, Clock, Phone, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventarStats, useProfilesByRole } from '@/hooks/useProfiles';
import { useInventoryByUser, useMatsOnTest } from '@/hooks/useInventoryStats';
import {
  useMapLocations,
  groupLocationsByProximity,
  MapMarkerStatus,
  getMarkerColor,
} from '@/hooks/useMapLocations';
import { MapMarker, ClusterMarker } from '@/components/MapMarker';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DIRTY_THRESHOLD = 10;
const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
const DEFAULT_ZOOM = 8;

const STATUS_OPTIONS: { value: MapMarkerStatus; label: string }[] = [
  { value: 'on_test', label: 'Na testu' },
  { value: 'contract_signed', label: 'Pogodba podpisana' },
  { value: 'waiting_driver', label: 'Čaka na prevzem' },
  { value: 'dirty', label: 'Umazani' },
];

export default function InventarDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pregled' | 'zemljevid'>('pregled');

  // Map filters
  const [selectedStatuses, setSelectedStatuses] = useState<MapMarkerStatus[]>([
    'on_test', 'contract_signed', 'waiting_driver', 'dirty',
  ]);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');

  const { data: stats, isLoading: loadingStats } = useInventarStats();
  const { data: inventoryStats, isLoading: loadingInventory } = useInventoryByUser();
  const { data: sellers } = useProfilesByRole('prodajalec');
  const { data: longTestMats } = useMatsOnTest(20); // Mats on test > 20 days

  const mapFilters = useMemo(() => ({
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    salespersonId: selectedSeller !== 'all' ? selectedSeller : undefined,
  }), [selectedStatuses, selectedSeller]);

  const { data: locations, isLoading: loadingMap } = useMapLocations(mapFilters);

  const groups = useMemo(() => {
    if (!locations) return [];
    return groupLocationsByProximity(locations);
  }, [locations]);

  const toggleStatus = (status: MapMarkerStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const statusCounts = useMemo(() => {
    if (!locations) return {};
    return locations.reduce((acc, loc) => {
      acc[loc.status] = (acc[loc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [locations]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 flex flex-col">
          {/* Map CSS */}
          <style>{`
            .custom-marker { background: transparent !important; border: none !important; }
            .marker-container { position: relative; }
            .marker-pulse::before {
              content: ''; position: absolute; width: 24px; height: 24px; top: 0; left: 0;
              background-color: rgba(59, 130, 246, 0.4); border-radius: 50%;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(2); opacity: 0; }
              100% { transform: scale(1); opacity: 0; }
            }
            .custom-cluster { background: transparent !important; border: none !important; }
            .cluster-marker {
              width: 36px; height: 36px; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              color: white; font-weight: bold; font-size: 14px;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); border: 2px solid white;
            }
            .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
            .leaflet-popup-content { margin: 8px 12px; }
          `}</style>

          <div className="p-6 flex-1 flex flex-col">
            {/* Header with Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              <Card className={stats?.pendingRequests && stats.pendingRequests > 0 ? 'border-orange-300 bg-orange-50' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Čakajo prevzem</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <p className={`text-3xl font-bold ${stats?.pendingRequests && stats.pendingRequests > 0 ? 'text-orange-600' : ''}`}>
                      {stats?.pendingRequests ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className={longTestMats && longTestMats.length > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Na testu &gt;20 dni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${longTestMats && longTestMats.length > 0 ? 'text-yellow-600' : ''}`}>
                    {longTestMats?.length ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs: Pregled / Zemljevid */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
              <TabsList className="mb-4">
                <TabsTrigger value="pregled" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Pregled
                </TabsTrigger>
                <TabsTrigger value="zemljevid" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Zemljevid
                </TabsTrigger>
              </TabsList>

              {/* Tab: Pregled */}
              <TabsContent value="pregled" className="flex-1">
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

                {/* Long Test Warning Section */}
                {longTestMats && longTestMats.length > 0 && (
                  <Card className="mt-6 border-yellow-300 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-5 w-5" />
                        Predpražniki dolgo na testu ({longTestMats.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-yellow-700 mb-4">
                        Ti predpražniki so na testu več kot 20 dni. Priporočeno je kontaktirati stranke.
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>QR Koda</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Podjetje</TableHead>
                            <TableHead>Prodajalec</TableHead>
                            <TableHead>Dni na testu</TableHead>
                            <TableHead>Kontakt</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {longTestMats.slice(0, 10).map((mat) => (
                            <TableRow key={mat.cycleId}>
                              <TableCell className="font-mono">{mat.qrCode}</TableCell>
                              <TableCell>{mat.matTypeName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-gray-400" />
                                  {mat.companyName || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {mat.salespersonPrefix && (
                                  <Badge variant="outline" className="mr-1 font-mono text-xs">
                                    {mat.salespersonPrefix}
                                  </Badge>
                                )}
                                {mat.salespersonName}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={mat.daysOnTest >= 25 ? 'destructive' : 'secondary'}
                                  className={mat.daysOnTest >= 25 ? '' : 'bg-yellow-200 text-yellow-800'}
                                >
                                  {mat.daysOnTest} dni
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {mat.contactPhone ? (
                                  <a
                                    href={`tel:${mat.contactPhone}`}
                                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {mat.contactPhone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {longTestMats.length > 10 && (
                        <p className="text-sm text-yellow-700 mt-3 text-center">
                          ... in še {longTestMats.length - 10} predpražnikov
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Zemljevid */}
              <TabsContent value="zemljevid" className="flex-1">
                <div className="flex gap-6 h-full min-h-[500px]">
                  {/* Filters */}
                  <Card className="w-56 shrink-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtri
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Prodajalec</label>
                        <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                          <SelectTrigger>
                            <SelectValue placeholder="Vsi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Vsi prodajalci</SelectItem>
                            {sellers?.map((seller) => (
                              <SelectItem key={seller.id} value={seller.id}>
                                {seller.first_name} {seller.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-3 block">Status</label>
                        <div className="space-y-2">
                          {STATUS_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={option.value}
                                  checked={selectedStatuses.includes(option.value)}
                                  onCheckedChange={() => toggleStatus(option.value)}
                                />
                                <label htmlFor={option.value} className="text-sm text-gray-600 cursor-pointer flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMarkerColor(option.value) }} />
                                  {option.label}
                                </label>
                              </div>
                              <Badge variant="secondary" className="text-xs">{statusCounts[option.value] || 0}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 border-t text-sm text-gray-600">
                        Skupaj: <span className="font-semibold">{locations?.length || 0}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Map */}
                  <Card className="flex-1 overflow-hidden">
                    <CardContent className="p-0 h-full min-h-[500px]">
                      {loadingMap ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <MapContainer
                          center={SLOVENIA_CENTER}
                          zoom={DEFAULT_ZOOM}
                          className="h-full w-full"
                          style={{ minHeight: '500px' }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          {groups.map((group) =>
                            group.locations.length === 1 ? (
                              <MapMarker key={group.locations[0].cycleId} location={group.locations[0]} />
                            ) : (
                              <ClusterMarker
                                key={`cluster-${group.lat}-${group.lng}`}
                                locations={group.locations}
                                lat={group.lat}
                                lng={group.lng}
                              />
                            )
                          )}
                        </MapContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

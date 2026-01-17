import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Map, Filter, RefreshCw, Route, Navigation, MapPin, AlertTriangle, ExternalLink, X } from 'lucide-react';
import {
  useRouteOptimization,
  formatDistance,
  formatDuration,
  findNearestPoint,
  RoutePoint,
} from '@/hooks/useRouteOptimization';
import {
  useMapLocations,
  groupLocationsByProximity,
  MapMarkerStatus,
  getMarkerColor,
  getStatusLabel,
} from '@/hooks/useMapLocations';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { MapMarker, ClusterMarker } from '@/components/MapMarker';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
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

// Slovenia center coordinates
const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
const DEFAULT_ZOOM = 8;

const STATUS_OPTIONS: { value: MapMarkerStatus; label: string }[] = [
  { value: 'on_test', label: 'Na testu' },
  { value: 'contract_signed', label: 'Pogodba podpisana' },
  { value: 'waiting_driver', label: 'Čaka na prevzem' },
  { value: 'dirty', label: 'Umazani' },
];

export default function MapView() {
  const [selectedStatuses, setSelectedStatuses] = useState<MapMarkerStatus[]>([
    'on_test',
    'contract_signed',
    'waiting_driver',
    'dirty',
  ]);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [minDaysOnTest, setMinDaysOnTest] = useState<number>(0);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  // Route optimization state
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [checkLocationLat, setCheckLocationLat] = useState('');
  const [checkLocationLng, setCheckLocationLng] = useState('');
  const [locationCheckResult, setLocationCheckResult] = useState<{
    nearestPoint: RoutePoint | null;
    distanceKm: number;
    isWithinRange: boolean;
  } | null>(null);

  const {
    isCalculating,
    route,
    calculateOptimizedRoute,
    clearRoute,
    openInGoogleMaps,
  } = useRouteOptimization();

  const { data: sellers } = useProfilesByRole('prodajalec');

  const filters = useMemo(
    () => ({
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      salespersonId: selectedSeller !== 'all' ? selectedSeller : undefined,
    }),
    [selectedStatuses, selectedSeller]
  );

  const { data: locations, isLoading, refetch } = useMapLocations(filters);

  // Filter locations by additional criteria
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    let filtered = locations;

    // Filter by minimum days on test
    if (minDaysOnTest > 0) {
      filtered = filtered.filter(loc => loc.daysOnTest >= minDaysOnTest);
    }

    // Filter overdue (>20 days on test, not contract signed)
    if (showOnlyOverdue) {
      filtered = filtered.filter(loc => loc.status === 'on_test' && loc.daysOnTest > 20);
    }

    return filtered;
  }, [locations, minDaysOnTest, showOnlyOverdue]);

  // Group nearby locations for clustering
  const groups = useMemo(() => {
    if (!filteredLocations) return [];
    return groupLocationsByProximity(filteredLocations);
  }, [filteredLocations]);

  const toggleStatus = (status: MapMarkerStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Count locations by status
  const statusCounts = useMemo(() => {
    if (!locations) return {};
    return locations.reduce(
      (acc, loc) => {
        acc[loc.status] = (acc[loc.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [locations]);

  // Convert locations to RoutePoints
  const routePoints = useMemo((): RoutePoint[] => {
    if (!filteredLocations) return [];
    return filteredLocations
      .filter(loc => loc.lat && loc.lng)
      .map(loc => ({
        lat: loc.lat!,
        lng: loc.lng!,
        name: loc.companyName || loc.qrCode,
      }));
  }, [filteredLocations]);

  // Handle route calculation
  const handleCalculateRoute = async () => {
    if (routePoints.length < 2) return;
    await calculateOptimizedRoute(routePoints);
  };

  // Handle opening in Google Maps
  const handleOpenGoogleMaps = () => {
    if (routePoints.length === 0) return;
    openInGoogleMaps(routePoints);
  };

  // Check new location distance
  const handleCheckLocation = () => {
    const lat = parseFloat(checkLocationLat);
    const lng = parseFloat(checkLocationLng);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    const result = findNearestPoint(lat, lng, routePoints);
    setLocationCheckResult(result);
  };

  // Convert route coordinates from [lng, lat] to [lat, lng] for Leaflet
  const routeLatLngs = useMemo(() => {
    if (!route) return [];
    return route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [route]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 flex flex-col">
          {/* CSS for animated markers */}
          <style>{`
            .custom-marker {
              background: transparent !important;
              border: none !important;
            }

            .marker-container {
              position: relative;
            }

            .marker-pulse::before {
              content: '';
              position: absolute;
              width: 24px;
              height: 24px;
              top: 0;
              left: 0;
              background-color: rgba(59, 130, 246, 0.4);
              border-radius: 50%;
              animation: pulse 2s infinite;
            }

            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(2);
                opacity: 0;
              }
              100% {
                transform: scale(1);
                opacity: 0;
              }
            }

            .custom-cluster {
              background: transparent !important;
              border: none !important;
            }

            .cluster-marker {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
              border: 2px solid white;
            }

            .leaflet-popup-content-wrapper {
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .leaflet-popup-content {
              margin: 8px 12px;
            }
          `}</style>

          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Map className="h-6 w-6 text-gray-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Zemljevid predpražnikov
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showRoutePanel ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowRoutePanel(!showRoutePanel)}
                >
                  <Route className="h-4 w-4 mr-2" />
                  Optimizacija poti
                </Button>
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
            </div>

            <div className="flex gap-6 flex-1">
              {/* Sidebar filters */}
              <Card className="w-64 shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Seller filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Prodajalec
                    </label>
                    <Select
                      value={selectedSeller}
                      onValueChange={setSelectedSeller}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vsi prodajalci" />
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

                  {/* Status filters */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                      Status
                    </label>
                    <div className="space-y-2">
                      {STATUS_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={option.value}
                              checked={selectedStatuses.includes(option.value)}
                              onCheckedChange={() => toggleStatus(option.value)}
                            />
                            <label
                              htmlFor={option.value}
                              className="text-sm text-gray-600 cursor-pointer flex items-center gap-2"
                            >
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: getMarkerColor(option.value),
                                }}
                              />
                              {option.label}
                            </label>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {statusCounts[option.value] || 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Legenda
                    </h4>
                    <div className="space-y-2 text-xs">
                      {STATUS_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              option.value === 'on_test' ? 'animate-pulse' : ''
                            }`}
                            style={{
                              backgroundColor: getMarkerColor(option.value),
                            }}
                          />
                          <span className="text-gray-600">
                            {option.label}
                            {option.value === 'on_test' && ' (utripajoča)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advanced filters */}
                  <div className="pt-4 border-t space-y-3">
                    <label className="text-sm font-medium text-gray-700 block">
                      Napredni filtri
                    </label>

                    {/* Min days on test */}
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">
                        Min. dni na testu: {minDaysOnTest > 0 ? minDaysOnTest : 'Vsi'}
                      </label>
                      <Input
                        type="range"
                        min={0}
                        max={60}
                        step={5}
                        value={minDaysOnTest}
                        onChange={(e) => setMinDaysOnTest(parseInt(e.target.value))}
                        className="w-full h-2"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>0</span>
                        <span>30</span>
                        <span>60</span>
                      </div>
                    </div>

                    {/* Quick filters */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="overdue"
                        checked={showOnlyOverdue}
                        onCheckedChange={(checked) => setShowOnlyOverdue(!!checked)}
                      />
                      <label
                        htmlFor="overdue"
                        className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        Samo prekoračeni (&gt;20 dni)
                      </label>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        Filtrirano:{' '}
                        <span className="font-semibold">
                          {filteredLocations?.length || 0}
                        </span>
                        {locations && filteredLocations && locations.length !== filteredLocations.length && (
                          <span className="text-gray-400"> / {locations.length}</span>
                        )}
                      </div>
                      {filteredLocations && filteredLocations.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Prekoračenih: {filteredLocations.filter(l => l.status === 'on_test' && l.daysOnTest > 20).length}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Panel */}
              {showRoutePanel && (
                <Card className="w-72 shrink-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Optimizacija poti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Route calculation */}
                    <div className="space-y-2">
                      <Label className="text-sm">Izračunaj pot</Label>
                      <p className="text-xs text-gray-500">
                        Izračunaj optimalno pot med {routePoints.length} lokacijami
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCalculateRoute}
                          disabled={isCalculating || routePoints.length < 2}
                          className="flex-1"
                        >
                          {isCalculating ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Navigation className="h-4 w-4 mr-1" />
                          )}
                          Izračunaj
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenGoogleMaps}
                          disabled={routePoints.length < 1}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Route result */}
                    {route && (
                      <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800">Rezultat poti</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={clearRoute}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Razdalja:</span>
                            <div className="font-semibold">{formatDistance(route.distance)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Čas:</span>
                            <div className="font-semibold">{formatDuration(route.duration)}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Location check */}
                    <div className="pt-4 border-t space-y-2">
                      <Label className="text-sm flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Preveri novo lokacijo
                      </Label>
                      <p className="text-xs text-gray-500">
                        Preveri razdaljo do najbližje obstoječe stranke
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Lat (46.05)"
                          value={checkLocationLat}
                          onChange={(e) => setCheckLocationLat(e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Lng (14.50)"
                          value={checkLocationLng}
                          onChange={(e) => setCheckLocationLng(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCheckLocation}
                        disabled={!checkLocationLat || !checkLocationLng}
                        className="w-full"
                      >
                        Preveri oddaljenost
                      </Button>

                      {/* Location check result */}
                      {locationCheckResult && (
                        <div
                          className={`p-3 rounded-lg ${
                            locationCheckResult.isWithinRange
                              ? 'bg-green-50'
                              : 'bg-red-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {locationCheckResult.isWithinRange ? (
                              <Badge className="bg-green-500">V dosegu</Badge>
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <Badge variant="destructive">Predaleč!</Badge>
                              </>
                            )}
                          </div>
                          <p className="text-sm">
                            <span className="text-gray-600">Razdalja: </span>
                            <span className="font-semibold">
                              {locationCheckResult.distanceKm} km
                            </span>
                          </p>
                          {locationCheckResult.nearestPoint && (
                            <p className="text-xs text-gray-500 mt-1">
                              Najbližja: {locationCheckResult.nearestPoint.name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Map */}
              <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0 h-full min-h-[600px]">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <MapContainer
                      center={SLOVENIA_CENTER}
                      zoom={DEFAULT_ZOOM}
                      className="h-full w-full"
                      style={{ minHeight: '600px' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* Route polyline */}
                      {routeLatLngs.length > 0 && (
                        <Polyline
                          positions={routeLatLngs}
                          color="#3b82f6"
                          weight={4}
                          opacity={0.8}
                        />
                      )}

                      {groups.map((group) =>
                        group.locations.length === 1 ? (
                          <MapMarker
                            key={group.locations[0].cycleId}
                            location={group.locations[0]}
                          />
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

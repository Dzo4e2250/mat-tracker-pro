import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, useMapEvents } from 'react-leaflet';
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
import { Loader2, Map, Filter, RefreshCw, Route, Navigation, MapPin, AlertTriangle, ExternalLink, X, Pencil, Trash2, Building2, Truck } from 'lucide-react';
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
} from '@/hooks/useMapLocations';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useDriverPickups } from '@/hooks/useDriverPickups';
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
  { value: 'dirty', label: 'Neuspeli prospect' },
];

// Check if point is inside polygon
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point[0], y = point[1];

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// Drawing component for polygon selection
function DrawingLayer({
  isDrawing,
  onPolygonComplete,
  polygon,
}: {
  isDrawing: boolean;
  onPolygonComplete: (points: [number, number][]) => void;
  polygon: [number, number][];
}) {
  const [points, setPoints] = useState<[number, number][]>([]);

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      const newPoints = [...points, [e.latlng.lat, e.latlng.lng] as [number, number]];
      setPoints(newPoints);
    },
    dblclick(e) {
      if (!isDrawing || points.length < 3) return;
      e.originalEvent.preventDefault();
      onPolygonComplete(points);
      setPoints([]);
    },
  });

  // Reset points when drawing mode changes
  useEffect(() => {
    if (!isDrawing) {
      setPoints([]);
    }
  }, [isDrawing]);

  return (
    <>
      {/* Currently drawing polygon */}
      {isDrawing && points.length > 0 && (
        <Polyline
          positions={points}
          color="#f97316"
          weight={2}
          dashArray="5, 10"
        />
      )}
      {/* Completed polygon */}
      {polygon.length > 0 && (
        <Polygon
          positions={polygon}
          pathOptions={{
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
      )}
    </>
  );
}

export default function MapView() {
  const [selectedStatuses, setSelectedStatuses] = useState<MapMarkerStatus[]>([
    'on_test',
    'contract_signed',
    'waiting_driver',
    'dirty',
  ]);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [minDaysOnTest, setMinDaysOnTest] = useState<number>(0);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  // Polygon drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][]>([]);

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
  const { data: pickups } = useDriverPickups();

  // Get unique drivers from pickups
  const uniqueDrivers = useMemo(() => {
    if (!pickups) return [];
    const drivers = new Set<string>();
    pickups.forEach(p => {
      if (p.assignedDriver) drivers.add(p.assignedDriver);
    });
    return Array.from(drivers).sort();
  }, [pickups]);

  // Get cycle IDs assigned to selected driver
  const driverCycleIds = useMemo(() => {
    if (selectedDriver === 'all' || !pickups) return null;
    const ids = new Set<string>();
    pickups
      .filter(p => p.assignedDriver === selectedDriver)
      .forEach(p => {
        p.items.forEach(item => ids.add(item.cycleId));
      });
    return ids;
  }, [selectedDriver, pickups]);

  const filters = useMemo(
    () => ({
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      salespersonId: selectedSeller !== 'all' ? selectedSeller : undefined,
      includeDirty: selectedStatuses.includes('dirty'),
    }),
    [selectedStatuses, selectedSeller]
  );

  const { data: locations, isLoading, refetch } = useMapLocations(filters);

  // Get unique cities from locations
  const uniqueCities = useMemo(() => {
    if (!locations) return [];
    const cities = new Set<string>();
    locations.forEach(loc => {
      if (loc.companyCity) cities.add(loc.companyCity);
    });
    return Array.from(cities).sort();
  }, [locations]);

  // Filter locations by additional criteria
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    let filtered = locations;

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(loc => loc.companyCity === selectedCity);
    }

    // Filter by driver (show only cycles in their pickups)
    if (driverCycleIds) {
      filtered = filtered.filter(loc => driverCycleIds.has(loc.cycleId));
    }

    // Filter by minimum days on test
    if (minDaysOnTest > 0) {
      filtered = filtered.filter(loc => loc.daysOnTest >= minDaysOnTest);
    }

    // Filter overdue (>20 days on test, not contract signed)
    if (showOnlyOverdue) {
      filtered = filtered.filter(loc => loc.status === 'on_test' && loc.daysOnTest > 20);
    }

    // Filter by polygon
    if (drawnPolygon.length >= 3) {
      filtered = filtered.filter(loc =>
        isPointInPolygon([loc.lat, loc.lng], drawnPolygon)
      );
    }

    return filtered;
  }, [locations, selectedCity, driverCycleIds, minDaysOnTest, showOnlyOverdue, drawnPolygon]);

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

  // Handle polygon drawing
  const handlePolygonComplete = useCallback((points: [number, number][]) => {
    setDrawnPolygon(points);
    setIsDrawing(false);
  }, []);

  const clearPolygon = useCallback(() => {
    setDrawnPolygon([]);
  }, []);

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

          <div className="p-1 -ml-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Map className="h-6 w-6 text-gray-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Zemljevid predpražnikov
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isDrawing ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (isDrawing) {
                      setIsDrawing(false);
                    } else {
                      setDrawnPolygon([]);
                      setIsDrawing(true);
                    }
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {isDrawing ? 'Prekliči risanje' : 'Označi območje'}
                </Button>
                {drawnPolygon.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearPolygon}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Pobriši območje
                  </Button>
                )}
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

            {/* Drawing instructions */}
            {isDrawing && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <strong>Risanje območja:</strong> Klikni na zemljevid za dodajanje točk. Dvojni klik za zaključek poligona (min. 3 točke).
              </div>
            )}

            <div className="flex gap-1 flex-1">
              {/* Sidebar filters */}
              <Card className="w-56 shrink-0">
                <CardHeader className="py-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtri
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-3">
                  {/* City filter */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Mesto
                    </label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Vsa mesta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Vsa mesta</SelectItem>
                        {uniqueCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Driver filter */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Dostavljalec
                    </label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Vsi dostavljalci" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Vsi dostavljalci</SelectItem>
                        {uniqueDrivers.map((driver) => (
                          <SelectItem key={driver} value={driver}>
                            {driver}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seller filter */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Prodajalec
                    </label>
                    <Select
                      value={selectedSeller}
                      onValueChange={setSelectedSeller}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Status
                    </label>
                    <div className="space-y-1.5">
                      {STATUS_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id={option.value}
                              checked={selectedStatuses.includes(option.value)}
                              onCheckedChange={() => toggleStatus(option.value)}
                              className="h-3.5 w-3.5"
                            />
                            <label
                              htmlFor={option.value}
                              className="text-xs text-gray-600 cursor-pointer flex items-center gap-1.5"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: getMarkerColor(option.value),
                                }}
                              />
                              {option.label}
                            </label>
                          </div>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {statusCounts[option.value] || 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advanced filters */}
                  <div className="pt-2 border-t space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Napredni filtri
                    </label>

                    {/* Min days on test */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-600">
                        Min. dni na testu: {minDaysOnTest > 0 ? minDaysOnTest : 'Vsi'}
                      </label>
                      <Input
                        type="range"
                        min={0}
                        max={60}
                        step={5}
                        value={minDaysOnTest}
                        onChange={(e) => setMinDaysOnTest(parseInt(e.target.value))}
                        className="w-full h-1.5"
                      />
                    </div>

                    {/* Quick filters */}
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="overdue"
                        checked={showOnlyOverdue}
                        onCheckedChange={(checked) => setShowOnlyOverdue(!!checked)}
                        className="h-3.5 w-3.5"
                      />
                      <label
                        htmlFor="overdue"
                        className="text-xs text-gray-600 cursor-pointer flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        Prekoračeni (&gt;20 dni)
                      </label>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>
                        Filtrirano:{' '}
                        <span className="font-semibold">
                          {filteredLocations?.length || 0}
                        </span>
                        {locations && filteredLocations && locations.length !== filteredLocations.length && (
                          <span className="text-gray-400"> / {locations.length}</span>
                        )}
                      </div>
                      {drawnPolygon.length > 0 && (
                        <div className="text-orange-600">
                          V označenem območju
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Panel */}
              {showRoutePanel && (
                <Card className="w-64 shrink-0">
                  <CardHeader className="py-3 px-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Optimizacija poti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-3">
                    {/* Route calculation */}
                    <div className="space-y-2">
                      <Label className="text-xs">Izračunaj pot</Label>
                      <p className="text-[10px] text-gray-500">
                        Optimalna pot med {routePoints.length} lokacijami
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCalculateRoute}
                          disabled={isCalculating || routePoints.length < 2}
                          className="flex-1 h-8 text-xs"
                        >
                          {isCalculating ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Navigation className="h-3 w-3 mr-1" />
                          )}
                          Izračunaj
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenGoogleMaps}
                          disabled={routePoints.length < 1}
                          className="h-8"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Route result */}
                    {route && (
                      <div className="p-2 bg-blue-50 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-blue-800">Rezultat poti</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={clearRoute}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
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
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Preveri novo lokacijo
                      </Label>
                      <div className="grid grid-cols-2 gap-1">
                        <Input
                          placeholder="Lat"
                          value={checkLocationLat}
                          onChange={(e) => setCheckLocationLat(e.target.value)}
                          className="text-xs h-7"
                        />
                        <Input
                          placeholder="Lng"
                          value={checkLocationLng}
                          onChange={(e) => setCheckLocationLng(e.target.value)}
                          className="text-xs h-7"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCheckLocation}
                        disabled={!checkLocationLat || !checkLocationLng}
                        className="w-full h-7 text-xs"
                      >
                        Preveri oddaljenost
                      </Button>

                      {/* Location check result */}
                      {locationCheckResult && (
                        <div
                          className={`p-2 rounded-lg text-xs ${
                            locationCheckResult.isWithinRange
                              ? 'bg-green-50'
                              : 'bg-red-50'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {locationCheckResult.isWithinRange ? (
                              <Badge className="bg-green-500 text-[10px]">V dosegu</Badge>
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                <Badge variant="destructive" className="text-[10px]">Predaleč!</Badge>
                              </>
                            )}
                          </div>
                          <p>
                            <span className="text-gray-600">Razdalja: </span>
                            <span className="font-semibold">
                              {locationCheckResult.distanceKm} km
                            </span>
                          </p>
                          {locationCheckResult.nearestPoint && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
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
                      doubleClickZoom={!isDrawing}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Drawing layer */}
                      <DrawingLayer
                        isDrawing={isDrawing}
                        onPolygonComplete={handlePolygonComplete}
                        polygon={drawnPolygon}
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

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Map, RefreshCw, Route, Pencil, Trash2 } from 'lucide-react';
import { useRouteOptimization, RoutePoint } from '@/hooks/useRouteOptimization';
import { useMapLocations, groupLocationsByProximity } from '@/hooks/useMapLocations';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useDriverPickups } from '@/hooks/useDriverPickups';
import { MapMarker, ClusterMarker } from '@/components/MapMarker';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import {
  usePolygonDrawing,
  isPointInPolygon,
  useMapFilters,
  DrawingLayer,
  MapFilterPanel,
  RoutePanel,
  MAP_STYLES,
  SLOVENIA_CENTER,
  DEFAULT_ZOOM,
} from './mapview';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapView() {
  const filters = useMapFilters();
  const polygon = usePolygonDrawing();

  // Route optimization state
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
    pickups.forEach((p) => {
      if (p.assignedDriver) drivers.add(p.assignedDriver);
    });
    return Array.from(drivers).sort();
  }, [pickups]);

  // Get cycle IDs assigned to selected driver
  const driverCycleIds = useMemo(() => {
    if (filters.selectedDriver === 'all' || !pickups) return null;
    const ids = new Set<string>();
    pickups
      .filter((p) => p.assignedDriver === filters.selectedDriver)
      .forEach((p) => {
        p.items.forEach((item) => ids.add(item.cycleId));
      });
    return ids;
  }, [filters.selectedDriver, pickups]);

  const { data: locations, isLoading, refetch } = useMapLocations(filters.queryFilters);

  // Get unique cities from locations
  const uniqueCities = useMemo(() => {
    if (!locations) return [];
    const cities = new Set<string>();
    locations.forEach((loc) => {
      if (loc.companyCity) cities.add(loc.companyCity);
    });
    return Array.from(cities).sort();
  }, [locations]);

  // Filter locations by additional criteria
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    let filtered = locations;

    // Filter by city
    if (filters.selectedCity !== 'all') {
      filtered = filtered.filter((loc) => loc.companyCity === filters.selectedCity);
    }

    // Filter by driver (show only cycles in their pickups)
    if (driverCycleIds) {
      filtered = filtered.filter((loc) => driverCycleIds.has(loc.cycleId));
    }

    // Filter by minimum days on test
    if (filters.minDaysOnTest > 0) {
      filtered = filtered.filter((loc) => loc.daysOnTest >= filters.minDaysOnTest);
    }

    // Filter overdue (>20 days on test, not contract signed)
    if (filters.showOnlyOverdue) {
      filtered = filtered.filter(
        (loc) => loc.status === 'on_test' && loc.daysOnTest > 20
      );
    }

    // Filter by polygon
    if (polygon.drawnPolygon.length >= 3) {
      filtered = filtered.filter((loc) =>
        isPointInPolygon([loc.lat, loc.lng], polygon.drawnPolygon)
      );
    }

    return filtered;
  }, [
    locations,
    filters.selectedCity,
    driverCycleIds,
    filters.minDaysOnTest,
    filters.showOnlyOverdue,
    polygon.drawnPolygon,
  ]);

  // Group nearby locations for clustering
  const groups = useMemo(() => {
    if (!filteredLocations) return [];
    return groupLocationsByProximity(filteredLocations);
  }, [filteredLocations]);

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
      .filter((loc) => loc.lat && loc.lng)
      .map((loc) => ({
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

  // Convert route coordinates from [lng, lat] to [lat, lng] for Leaflet
  const routeLatLngs = useMemo(() => {
    if (!route) return [];
    return route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [route]);

  // Route panel visibility
  const [showRoutePanel, setShowRoutePanel] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 flex flex-col">
          <style>{MAP_STYLES}</style>

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
                  variant={polygon.isDrawing ? 'default' : 'outline'}
                  size="sm"
                  onClick={polygon.toggleDrawing}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {polygon.isDrawing ? 'Prekliči risanje' : 'Označi območje'}
                </Button>
                {polygon.drawnPolygon.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={polygon.clearPolygon}
                    aria-label="Pobriši območje"
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
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                  />
                  Osveži
                </Button>
              </div>
            </div>

            {/* Drawing instructions */}
            {polygon.isDrawing && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <strong>Risanje območja:</strong> Klikni na zemljevid za dodajanje
                točk. Dvojni klik za zaključek poligona (min. 3 točke).
              </div>
            )}

            <div className="flex gap-1 flex-1">
              {/* Filter Panel */}
              <MapFilterPanel
                selectedCity={filters.selectedCity}
                onCityChange={filters.setSelectedCity}
                uniqueCities={uniqueCities}
                selectedDriver={filters.selectedDriver}
                onDriverChange={filters.setSelectedDriver}
                uniqueDrivers={uniqueDrivers}
                selectedSeller={filters.selectedSeller}
                onSellerChange={filters.setSelectedSeller}
                sellers={sellers}
                selectedStatuses={filters.selectedStatuses}
                onStatusToggle={filters.toggleStatus}
                statusCounts={statusCounts}
                minDaysOnTest={filters.minDaysOnTest}
                onMinDaysChange={filters.setMinDaysOnTest}
                showOnlyOverdue={filters.showOnlyOverdue}
                onOverdueChange={filters.setShowOnlyOverdue}
                filteredCount={filteredLocations?.length || 0}
                totalCount={locations?.length || 0}
                hasPolygon={polygon.drawnPolygon.length > 0}
              />

              {/* Route Panel */}
              {showRoutePanel && (
                <RoutePanel
                  routePoints={routePoints}
                  route={route}
                  isCalculating={isCalculating}
                  onCalculateRoute={handleCalculateRoute}
                  onClearRoute={clearRoute}
                  onOpenGoogleMaps={handleOpenGoogleMaps}
                />
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
                      doubleClickZoom={!polygon.isDrawing}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Drawing layer */}
                      <DrawingLayer
                        isDrawing={polygon.isDrawing}
                        onPolygonComplete={polygon.handlePolygonComplete}
                        polygon={polygon.drawnPolygon}
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

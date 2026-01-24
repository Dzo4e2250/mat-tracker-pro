import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Route,
  Navigation,
  MapPin,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  formatDistance,
  formatDuration,
  findNearestPoint,
  RoutePoint,
  RouteResult,
} from '@/hooks/useRouteOptimization';

interface RoutePanelProps {
  routePoints: RoutePoint[];
  route: RouteResult | null;
  isCalculating: boolean;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
  onOpenGoogleMaps: () => void;
}

export function RoutePanel({
  routePoints,
  route,
  isCalculating,
  onCalculateRoute,
  onClearRoute,
  onOpenGoogleMaps,
}: RoutePanelProps) {
  const [checkLocationLat, setCheckLocationLat] = useState('');
  const [checkLocationLng, setCheckLocationLng] = useState('');
  const [locationCheckResult, setLocationCheckResult] = useState<{
    nearestPoint: RoutePoint | null;
    distanceKm: number;
    isWithinRange: boolean;
  } | null>(null);

  const handleCheckLocation = () => {
    const lat = parseFloat(checkLocationLat);
    const lng = parseFloat(checkLocationLng);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    const result = findNearestPoint(lat, lng, routePoints);
    setLocationCheckResult(result);
  };

  return (
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
              onClick={onCalculateRoute}
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
              onClick={onOpenGoogleMaps}
              disabled={routePoints.length < 1}
              className="h-8"
              aria-label="Odpri v Google Maps"
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
                onClick={onClearRoute}
                aria-label="Zapri rezultat poti"
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
                locationCheckResult.isWithinRange ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {locationCheckResult.isWithinRange ? (
                  <Badge className="bg-green-500 text-[10px]">V dosegu</Badge>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <Badge variant="destructive" className="text-[10px]">
                      Predaleč!
                    </Badge>
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
  );
}

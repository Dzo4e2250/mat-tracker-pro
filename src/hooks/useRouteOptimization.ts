import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat] pairs for polyline
  distance: number; // in meters
  duration: number; // in seconds
  waypoints: RoutePoint[];
}

export interface DistanceCheckResult {
  nearestPoint: RoutePoint | null;
  distanceKm: number;
  isWithinRange: boolean;
}

const ORS_API_URL = 'https://api.openrouteservice.org';

// Get API key from environment
const getApiKey = () => {
  return import.meta.env.VITE_ORS_API_KEY || '';
};

// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest point from a list
export function findNearestPoint(
  targetLat: number,
  targetLng: number,
  points: RoutePoint[]
): DistanceCheckResult {
  if (points.length === 0) {
    return { nearestPoint: null, distanceKm: Infinity, isWithinRange: false };
  }

  let nearestPoint = points[0];
  let minDistance = calculateDistance(targetLat, targetLng, points[0].lat, points[0].lng);

  for (const point of points) {
    const distance = calculateDistance(targetLat, targetLng, point.lat, point.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
    }
  }

  return {
    nearestPoint,
    distanceKm: Math.round(minDistance * 10) / 10,
    isWithinRange: minDistance <= 30, // 30km threshold
  };
}

export function useRouteOptimization() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const calculateOptimizedRoute = async (
    points: RoutePoint[],
    startPoint?: RoutePoint
  ): Promise<RouteResult | null> => {
    const apiKey = getApiKey();

    if (!apiKey) {
      toast({
        title: 'Manjka API ključ',
        description: 'Prosim dodajte VITE_ORS_API_KEY v .env datoteko',
        variant: 'destructive',
      });
      return null;
    }

    if (points.length < 2) {
      toast({
        title: 'Premalo točk',
        description: 'Za izračun poti potrebujete vsaj 2 točki',
        variant: 'destructive',
      });
      return null;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Prepare coordinates for ORS (format: [lng, lat])
      const allPoints = startPoint ? [startPoint, ...points] : points;
      const coordinates = allPoints.map(p => [p.lng, p.lat]);

      // Use optimization endpoint for route optimization
      if (points.length > 2) {
        // For multiple points, use optimization API
        const jobs = points.map((p, i) => ({
          id: i + 1,
          location: [p.lng, p.lat],
        }));

        const vehicles = [{
          id: 1,
          profile: 'driving-car',
          start: startPoint ? [startPoint.lng, startPoint.lat] : coordinates[0],
          end: startPoint ? [startPoint.lng, startPoint.lat] : coordinates[0],
        }];

        const optimizationResponse = await fetch(`${ORS_API_URL}/optimization`, {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobs, vehicles }),
        });

        if (!optimizationResponse.ok) {
          // Fallback to simple directions if optimization fails
          // Fallback to directions
        } else {
          const optimizationData = await optimizationResponse.json();

          if (optimizationData.routes && optimizationData.routes[0]) {
            const optimizedRoute = optimizationData.routes[0];
            const orderedPoints: RoutePoint[] = [];

            // Extract optimized order
            for (const step of optimizedRoute.steps) {
              if (step.type === 'job') {
                const jobIndex = step.id - 1;
                if (points[jobIndex]) {
                  orderedPoints.push(points[jobIndex]);
                }
              }
            }

            // Now get the actual route geometry
            const orderedCoords = startPoint
              ? [[startPoint.lng, startPoint.lat], ...orderedPoints.map(p => [p.lng, p.lat])]
              : orderedPoints.map(p => [p.lng, p.lat]);

            const directionsResponse = await fetch(
              `${ORS_API_URL}/v2/directions/driving-car/geojson`,
              {
                method: 'POST',
                headers: {
                  'Authorization': apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ coordinates: orderedCoords }),
              }
            );

            if (directionsResponse.ok) {
              const directionsData = await directionsResponse.json();
              const feature = directionsData.features[0];

              const result: RouteResult = {
                coordinates: feature.geometry.coordinates,
                distance: feature.properties.summary.distance,
                duration: feature.properties.summary.duration,
                waypoints: startPoint ? [startPoint, ...orderedPoints] : orderedPoints,
              };

              setRoute(result);
              return result;
            }
          }
        }
      }

      // Simple directions for 2 points or as fallback
      const directionsResponse = await fetch(
        `${ORS_API_URL}/v2/directions/driving-car/geojson`,
        {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ coordinates }),
        }
      );

      if (!directionsResponse.ok) {
        const errorData = await directionsResponse.json();
        throw new Error(errorData.error?.message || 'Napaka pri izračunu poti');
      }

      const directionsData = await directionsResponse.json();
      const feature = directionsData.features[0];

      const result: RouteResult = {
        coordinates: feature.geometry.coordinates,
        distance: feature.properties.summary.distance,
        duration: feature.properties.summary.duration,
        waypoints: allPoints,
      };

      setRoute(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Napaka pri izračunu poti';
      setError(errorMsg);
      toast({
        title: 'Napaka',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setError(null);
  };

  const openInGoogleMaps = (points: RoutePoint[]) => {
    if (points.length === 0) return;

    // Google Maps directions URL
    const origin = `${points[0].lat},${points[0].lng}`;
    const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
    const waypoints = points
      .slice(1, -1)
      .map(p => `${p.lat},${p.lng}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/${origin}`;

    if (points.length > 2) {
      // Add waypoints
      for (let i = 1; i < points.length; i++) {
        url += `/${points[i].lat},${points[i].lng}`;
      }
    } else if (points.length === 2) {
      url += `/${destination}`;
    }

    window.open(url, '_blank');
  };

  return {
    isCalculating,
    route,
    error,
    calculateOptimizedRoute,
    clearRoute,
    openInGoogleMaps,
    findNearestPoint,
    calculateDistance,
  };
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

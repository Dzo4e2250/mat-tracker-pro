import { useState, useCallback } from 'react';

export type PolygonPoint = [number, number];

// Check if point is inside polygon using ray casting algorithm
export function isPointInPolygon(
  point: PolygonPoint,
  polygon: PolygonPoint[]
): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point[0],
    y = point[1];

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

export function usePolygonDrawing() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<PolygonPoint[]>([]);

  const handlePolygonComplete = useCallback((points: PolygonPoint[]) => {
    setDrawnPolygon(points);
    setIsDrawing(false);
  }, []);

  const startDrawing = useCallback(() => {
    setDrawnPolygon([]);
    setIsDrawing(true);
  }, []);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearPolygon = useCallback(() => {
    setDrawnPolygon([]);
  }, []);

  const toggleDrawing = useCallback(() => {
    if (isDrawing) {
      cancelDrawing();
    } else {
      startDrawing();
    }
  }, [isDrawing, cancelDrawing, startDrawing]);

  return {
    isDrawing,
    drawnPolygon,
    handlePolygonComplete,
    startDrawing,
    cancelDrawing,
    clearPolygon,
    toggleDrawing,
  };
}

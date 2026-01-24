import { useState, useEffect } from 'react';
import { Polyline, Polygon, useMapEvents } from 'react-leaflet';
import type { PolygonPoint } from './usePolygonDrawing';

interface DrawingLayerProps {
  isDrawing: boolean;
  onPolygonComplete: (points: PolygonPoint[]) => void;
  polygon: PolygonPoint[];
}

export function DrawingLayer({
  isDrawing,
  onPolygonComplete,
  polygon,
}: DrawingLayerProps) {
  const [points, setPoints] = useState<PolygonPoint[]>([]);

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      const newPoints = [
        ...points,
        [e.latlng.lat, e.latlng.lng] as PolygonPoint,
      ];
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
        <Polyline positions={points} color="#f97316" weight={2} dashArray="5, 10" />
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

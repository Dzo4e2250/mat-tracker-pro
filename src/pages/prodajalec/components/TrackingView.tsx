/**
 * @file TrackingView.tsx
 * @description GPS tracking view - "Moja pot" tab for salespeople
 */

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Square, Loader2, Navigation, Calendar, Clock, Route, Car, FileText } from 'lucide-react';
import {
  useGpsTracker,
  useGpsTrackingSessions,
  useDailyGpsStats,
  calculateTotalDistance,
} from '@/hooks/useGpsTracking';
import type { GpsPoint, GpsTrackingSession } from '@/integrations/supabase/types';

interface TrackingViewProps {
  userId?: string;
  onTravelView?: () => void;
}

// Slovenia center coordinates
const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
const DEFAULT_ZOOM = 8;

// Create start/end markers
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 16px;
        height: 16px;
        background-color: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const startIcon = createMarkerIcon('#22C55E');
const endIcon = createMarkerIcon('#EF4444');
const currentIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background-color: #3B82F6;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #3B82F6, 0 2px 6px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('sl-SI', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrackingView({ userId, onTravelView }: TrackingViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSession, setSelectedSession] = useState<GpsTrackingSession | null>(null);

  const {
    isTracking,
    currentPosition,
    points: activePoints,
    error,
    currentDistance,
    start,
    stop,
    isStarting,
    isStopping,
  } = useGpsTracker(userId);

  const { data: sessions, isLoading: loadingSessions } = useGpsTrackingSessions(
    userId,
    selectedDate
  );
  const { totalKm, totalSessions, totalTime } = useDailyGpsStats(userId, selectedDate);

  // Determine which points to show on map
  const displayPoints = useMemo(() => {
    if (isTracking && activePoints.length > 0) {
      return activePoints;
    }
    if (selectedSession?.points) {
      return selectedSession.points;
    }
    // Combine all sessions for the day
    if (sessions && sessions.length > 0) {
      return sessions.flatMap(s => s.points || []);
    }
    return [];
  }, [isTracking, activePoints, selectedSession, sessions]);

  // Calculate map bounds
  const mapCenter = useMemo(() => {
    if (displayPoints.length > 0) {
      const lats = displayPoints.map(p => p.lat);
      const lngs = displayPoints.map(p => p.lng);
      return [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ] as [number, number];
    }
    if (currentPosition) {
      return [
        currentPosition.coords.latitude,
        currentPosition.coords.longitude,
      ] as [number, number];
    }
    return SLOVENIA_CENTER;
  }, [displayPoints, currentPosition]);

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Navigation className="text-blue-500" size={24} />
          Moja pot
        </h2>
        {onTravelView && (
          <button
            onClick={onTravelView}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            <FileText size={18} />
            <span className="text-sm font-medium">Potni nalog</span>
          </button>
        )}
      </div>

      {/* Tracking Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col items-center">
          {error && (
            <div className="text-red-500 text-sm mb-4 text-center">{error}</div>
          )}

          <button
            onClick={isTracking ? stop : start}
            disabled={isStarting || isStopping}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isTracking
                ? 'bg-red-500 hover:bg-red-600 active:scale-95'
                : 'bg-green-500 hover:bg-green-600 active:scale-95'
            } text-white shadow-lg`}
          >
            {isStarting || isStopping ? (
              <Loader2 className="animate-spin" size={40} />
            ) : isTracking ? (
              <Square size={40} fill="white" />
            ) : (
              <Play size={40} fill="white" />
            )}
          </button>

          <div className="mt-3 text-center">
            {isTracking ? (
              <span className="text-green-600 font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Sledenje aktivno
              </span>
            ) : (
              <span className="text-gray-500">Pritisni za zagon sledenja</span>
            )}
          </div>

          {isTracking && (
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {currentDistance.toFixed(2)} km
              </div>
              <div className="text-sm text-gray-500">
                {activePoints.length} tocke zapisanih
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-400" size={20} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSession(null);
            }}
            max={today}
            className="flex-1 border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Daily Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <Route className="mx-auto text-blue-500 mb-1" size={20} />
          <div className="text-xl font-bold">{totalKm.toFixed(1)}</div>
          <div className="text-xs text-gray-500">km</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <Navigation className="mx-auto text-green-500 mb-1" size={20} />
          <div className="text-xl font-bold">{totalSessions}</div>
          <div className="text-xs text-gray-500">sej</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <Clock className="mx-auto text-orange-500 mb-1" size={20} />
          <div className="text-xl font-bold">{formatDuration(totalTime)}</div>
          <div className="text-xs text-gray-500">cas</div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '40vh' }}>
        <style>{`
          .custom-marker {
            background: transparent !important;
            border: none !important;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <MapContainer
          center={mapCenter}
          zoom={displayPoints.length > 0 ? 13 : DEFAULT_ZOOM}
          className="h-full w-full"
          style={{ height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draw route line */}
          {displayPoints.length > 1 && (
            <Polyline
              positions={displayPoints.map(p => [p.lat, p.lng] as [number, number])}
              color="#3B82F6"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* Start marker */}
          {displayPoints.length > 0 && (
            <Marker position={[displayPoints[0].lat, displayPoints[0].lng]} icon={startIcon}>
              <Popup>Zacetek</Popup>
            </Marker>
          )}

          {/* End marker (only if not actively tracking) */}
          {displayPoints.length > 1 && !isTracking && (
            <Marker
              position={[
                displayPoints[displayPoints.length - 1].lat,
                displayPoints[displayPoints.length - 1].lng,
              ]}
              icon={endIcon}
            >
              <Popup>Konec</Popup>
            </Marker>
          )}

          {/* Current position marker (if tracking) */}
          {isTracking && currentPosition && (
            <Marker
              position={[
                currentPosition.coords.latitude,
                currentPosition.coords.longitude,
              ]}
              icon={currentIcon}
            >
              <Popup>Trenutna lokacija</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-3">
          Seje za {new Date(selectedDate).toLocaleDateString('sl-SI', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h3>

        {loadingSessions ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Ni sej za ta dan
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const distance = session.total_km || calculateTotalDistance(session.points || []);
              const isSelected = selectedSession?.id === session.id;
              const isActive = !session.ended_at;

              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(isSelected ? null : session)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isActive ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                      <span className="font-medium">
                        {formatTime(session.started_at)}
                        {session.ended_at && ` - ${formatTime(session.ended_at)}`}
                      </span>
                    </div>
                    <span className="font-bold text-blue-600">{distance.toFixed(2)} km</span>
                  </div>
                  {session.points && (
                    <div className="text-xs text-gray-500 mt-1">
                      {session.points.length} tock
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

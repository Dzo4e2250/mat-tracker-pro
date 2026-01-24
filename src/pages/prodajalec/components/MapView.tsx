/**
 * @file MapView.tsx
 * @description Prikaz predpražnikov na zemljevidu z možnostjo urejanja koordinat
 */

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin, Pencil, Check, X } from 'lucide-react';
import { SLOVENIA_CENTER, DEFAULT_ZOOM } from '../utils/constants';
import { getMarkerColor, getStatusLabel } from '@/hooks/useMapLocations';

// Create custom marker icons
const createCustomIcon = (color: string, isPulsing: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ${isPulsing ? 'animation: pulse 2s infinite;' : ''}
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to handle map clicks in edit mode
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Parse coordinates from string (supports "lat, lng" or "lat,lng" format)
function parseCoordinates(input: string): { lat: number; lng: number } | null {
  // Remove extra spaces and split by comma
  const parts = input.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  return { lat, lng };
}

interface MapLocation {
  cycleId: string;
  lat: number;
  lng: number;
  status: string;
  companyName: string;
  companyAddress?: string;
  qrCode: string;
  matTypeName?: string;
  contactName?: string;
  contactPhone?: string;
}

// Popup content with edit capability
function MarkerPopupContent({
  loc,
  onUpdateLocation,
  isUpdating
}: {
  loc: MapLocation;
  onUpdateLocation?: (cycleId: string, lat: number, lng: number) => Promise<void>;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [coordInput, setCoordInput] = useState(`${loc.lat}, ${loc.lng}`);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const parsed = parseCoordinates(coordInput);
    if (!parsed) {
      setError('Napačen format. Uporabi: lat, lng');
      return;
    }

    setError('');
    if (onUpdateLocation) {
      await onUpdateLocation(loc.cycleId, parsed.lat, parsed.lng);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCoordInput(`${loc.lat}, ${loc.lng}`);
    setError('');
    setIsEditing(false);
  };

  return (
    <div className="text-sm min-w-[200px]">
      <div className="font-bold">{loc.companyName}</div>
      <div className="text-gray-500 text-xs">{loc.companyAddress}</div>
      <div className="mt-2">
        <span className="font-mono text-xs bg-gray-100 px-1 rounded">{loc.qrCode}</span>
        <span className="ml-2">{loc.matTypeName}</span>
      </div>
      <div className="mt-1 text-xs" style={{ color: getMarkerColor(loc.status) }}>
        {getStatusLabel(loc.status)}
      </div>
      {loc.contactName && (
        <div className="mt-2 text-xs">
          <div>{loc.contactName}</div>
          {loc.contactPhone && (
            <a href={`tel:${loc.contactPhone}`} className="text-blue-600">
              {loc.contactPhone}
            </a>
          )}
        </div>
      )}

      {/* Coordinates section */}
      <div className="mt-2 pt-2 border-t">
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Koordinate (lat, lng):
              </label>
              <input
                type="text"
                value={coordInput}
                onChange={(e) => setCoordInput(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-xs p-1.5 border rounded font-mono"
                placeholder="46.056946, 14.505751"
              />
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white text-xs py-1.5 rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                <Check size={12} />
                {isUpdating ? 'Shranjujem...' : 'Shrani'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-300 disabled:bg-gray-100"
              >
                <X size={12} />
                Prekliči
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">
                {loc.lat}, {loc.lng}
              </span>
              {onUpdateLocation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Uredi koordinate"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
            <a
              href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
            >
              <MapPin size={12} />
              <span>Odpri v Google Maps</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

interface MapViewProps {
  mapLocations: MapLocation[] | undefined;
  loadingMap: boolean;
  mapEditMode?: boolean;
  clickedMapLocation?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  onUpdateLocation?: (cycleId: string, lat: number, lng: number) => Promise<void>;
  isUpdatingLocation?: boolean;
}

export default function MapView({
  mapLocations,
  loadingMap,
  mapEditMode = false,
  clickedMapLocation = null,
  onMapClick,
  onUpdateLocation,
  isUpdatingLocation = false
}: MapViewProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Moji predpražniki na zemljevidu</h2>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
            <span>Na testu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22C55E' }} />
            <span>Pogodba</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
            <span>Čaka šoferja</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Skupaj na zemljevidu: {mapLocations?.length || 0}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '60vh' }}>
        {loadingMap ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <style>{`
              .custom-marker {
                background: transparent !important;
                border: none !important;
              }
              @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.5); opacity: 0.5; }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
            <MapContainer
              center={SLOVENIA_CENTER}
              zoom={DEFAULT_ZOOM}
              className="h-full w-full"
              style={{ height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Map click handler for edit mode */}
              {mapEditMode && onMapClick && (
                <MapClickHandler onMapClick={onMapClick} />
              )}
              {/* Show marker for clicked location */}
              {mapEditMode && clickedMapLocation && (
                <Marker
                  position={[clickedMapLocation.lat, clickedMapLocation.lng]}
                  icon={L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="width: 20px; height: 20px; background: #F97316; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                />
              )}
              {mapLocations?.map((loc) => (
                <Marker
                  key={loc.cycleId}
                  position={[loc.lat, loc.lng]}
                  icon={createCustomIcon(getMarkerColor(loc.status), loc.status === 'on_test')}
                >
                  <Popup>
                    <MarkerPopupContent
                      loc={loc}
                      onUpdateLocation={onUpdateLocation}
                      isUpdating={isUpdatingLocation}
                    />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </>
        )}
      </div>
    </div>
  );
}

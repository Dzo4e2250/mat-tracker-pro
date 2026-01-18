/**
 * @file MapView.tsx
 * @description Prikaz predpražnikov na zemljevidu
 */

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin } from 'lucide-react';
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

interface MapViewProps {
  mapLocations: MapLocation[] | undefined;
  loadingMap: boolean;
  mapEditMode: boolean;
  clickedMapLocation: { lat: number; lng: number } | null;
  onMapEditModeToggle: () => void;
  onMapClick: (lat: number, lng: number) => void;
}

export default function MapView({
  mapLocations,
  loadingMap,
  mapEditMode,
  clickedMapLocation,
  onMapEditModeToggle,
  onMapClick
}: MapViewProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🗺️ Moji predpražniki na zemljevidu</h2>

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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <span>Umazan</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Skupaj na zemljevidu: {mapLocations?.length || 0}
        </div>
        <button
          onClick={onMapEditModeToggle}
          className={`mt-3 w-full py-2 rounded text-sm font-medium ${
            mapEditMode
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {mapEditMode ? '🎯 Način urejanja AKTIVEN' : '✏️ Uredi lokacije'}
        </button>
        {mapEditMode && (
          <p className="text-xs text-orange-600 mt-1">
            Klikni na zemljevid kjer je predpražnik
          </p>
        )}
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
              {mapEditMode && (
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
                    <div className="text-sm">
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
                      <div className="mt-2 pt-2 border-t">
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
                    </div>
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

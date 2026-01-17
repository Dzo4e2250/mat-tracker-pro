import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapLocation, MapMarkerStatus, getMarkerColor, getStatusLabel } from '@/hooks/useMapLocations';
import { Phone, Building2, User, Calendar, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MapMarkerProps {
  location: MapLocation;
  onClick?: (location: MapLocation) => void;
}

// Create custom marker icon with specified color
function createMarkerIcon(color: string, isPulsing: boolean = false): L.DivIcon {
  const pulsingClass = isPulsing ? 'marker-pulse' : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container ${pulsingClass}">
        <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${color}"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function MapMarker({ location, onClick }: MapMarkerProps) {
  const color = getMarkerColor(location.status);
  const isPulsing = location.status === 'on_test';
  const icon = createMarkerIcon(color, isPulsing);

  const statusLabel = getStatusLabel(location.status);
  const statusBadgeColor = {
    on_test: 'bg-blue-500',
    contract_signed: 'bg-green-500',
    waiting_driver: 'bg-purple-500',
    dirty: 'bg-red-500',
  }[location.status];

  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(location),
      }}
    >
      <Popup className="custom-popup" minWidth={280} maxWidth={350}>
        <div className="p-1">
          {/* Company name and status */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {location.companyName}
            </h3>
            <Badge className={`${statusBadgeColor} text-white text-xs shrink-0`}>
              {statusLabel}
            </Badge>
          </div>

          {/* QR Code */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <QrCode className="h-4 w-4 text-gray-400" />
            <span className="font-mono">{location.qrCode}</span>
          </div>

          {/* Address */}
          {location.companyAddress && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span>{location.companyAddress}</span>
            </div>
          )}

          {/* Contact */}
          {location.contactName && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <User className="h-4 w-4 text-gray-400" />
              <span>{location.contactName}</span>
            </div>
          )}

          {/* Phone */}
          {location.contactPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <a
                href={`tel:${location.contactPhone}`}
                className="text-blue-600 hover:underline"
              >
                {location.contactPhone}
              </a>
            </div>
          )}

          {/* Test dates */}
          {(location.testStartDate || location.testEndDate) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {formatDate(location.testStartDate)} - {formatDate(location.testEndDate)}
              </span>
            </div>
          )}

          {/* Mat type and salesperson */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tip: {location.matTypeName}</span>
              <span>Prodajalec: {location.salespersonName}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Cluster marker for multiple locations at the same position
interface ClusterMarkerProps {
  locations: MapLocation[];
  lat: number;
  lng: number;
  onClick?: (locations: MapLocation[]) => void;
}

function getPrimaryStatus(locations: MapLocation[]): MapMarkerStatus {
  // Priority: waiting_driver > dirty > on_test > contract_signed
  if (locations.some((l) => l.status === 'waiting_driver')) return 'waiting_driver';
  if (locations.some((l) => l.status === 'dirty')) return 'dirty';
  if (locations.some((l) => l.status === 'on_test')) return 'on_test';
  return 'contract_signed';
}

function createClusterIcon(count: number, color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-cluster',
    html: `
      <div class="cluster-marker" style="background-color: ${color};">
        <span>${count}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export function ClusterMarker({ locations, lat, lng, onClick }: ClusterMarkerProps) {
  const primaryStatus = getPrimaryStatus(locations);
  const color = getMarkerColor(primaryStatus);
  const icon = createClusterIcon(locations.length, color);

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(locations),
      }}
    >
      <Popup className="custom-popup" minWidth={300} maxWidth={400}>
        <div className="p-1">
          <h3 className="font-semibold text-gray-900 mb-3">
            {locations.length} predpražnikov na tej lokaciji
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {locations.map((loc) => (
              <div
                key={loc.cycleId}
                className="p-2 bg-gray-50 rounded border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm">{loc.qrCode}</span>
                  <Badge
                    className={`${
                      {
                        on_test: 'bg-blue-500',
                        contract_signed: 'bg-green-500',
                        waiting_driver: 'bg-purple-500',
                        dirty: 'bg-red-500',
                      }[loc.status]
                    } text-white text-xs`}
                  >
                    {getStatusLabel(loc.status)}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">
                  {loc.companyName}
                </div>
                {loc.contactPhone && (
                  <div className="text-xs text-blue-600">
                    {loc.contactPhone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

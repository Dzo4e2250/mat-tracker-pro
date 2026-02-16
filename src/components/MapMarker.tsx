import { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapLocation, MapMarkerStatus, getMarkerColor, getStatusLabel } from '@/hooks/useMapLocations';
import { Phone, Building2, User, Calendar, QrCode, MapPin, Check, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

// Parse coordinates from string like "46.236134, 15.267745" or "46.236134 15.267745"
function parseCoordinates(coords: string): { lat: number; lng: number } | null {
  const cleaned = coords.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(/[,\s]+/).filter(p => p.length > 0);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export function MapMarker({ location, onClick }: MapMarkerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [coordsInput, setCoordsInput] = useState(`${location.lat}, ${location.lng}`);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeRole } = useAuth();
  const canDelete = activeRole === 'inventar' || activeRole === 'admin';

  const handleDeleteCycle = async () => {
    if (!canDelete) {
      toast({ description: 'Nimate dovoljenja za brisanje', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete related records first (foreign key constraints)
      await supabase.from('cycle_history').delete().eq('cycle_id', location.cycleId);
      await supabase.from('sent_emails').delete().eq('cycle_id', location.cycleId);
      await supabase.from('offer_items').delete().eq('cycle_id', location.cycleId);
      await supabase.from('driver_pickup_items').delete().eq('cycle_id', location.cycleId);

      // Now delete the cycle
      const { error } = await supabase
        .from('cycles')
        .delete()
        .eq('id', location.cycleId);

      if (error) throw error;

      toast({ description: '✓ Predpražnik odstranjen' });
      queryClient.invalidateQueries({ queryKey: ['map-locations'] });
      setShowDeleteConfirm(false);
      setDeletePassword('');
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast({ description: 'Napaka pri brisanju', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleSaveCoordinates = async () => {
    const coords = parseCoordinates(coordsInput);
    if (!coords) {
      toast({ description: 'Neveljavne koordinate. Vnesi: 46.236, 15.267', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cycles')
        .update({ location_lat: coords.lat, location_lng: coords.lng })
        .eq('id', location.cycleId);

      if (error) throw error;

      toast({ description: '✓ Koordinate posodobljene' });
      queryClient.invalidateQueries({ queryKey: ['map-locations'] });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating coordinates:', error);
      toast({ description: 'Napaka pri shranjevanju', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setCoordsInput(`${location.lat}, ${location.lng}`);
    setIsEditing(false);
  };

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
          {/* Title and status */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {location.companyName || 'Neznano podjetje'}
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

          {/* Coordinates section */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={coordsInput}
                    onChange={(e) => setCoordsInput(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded font-mono"
                    placeholder="46.236134, 15.267745"
                  />
                  <p className="text-xs text-gray-400 mt-1">Prilepi koordinate iz Google Maps</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCoordinates}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    {isSaving ? 'Shranjujem...' : 'Shrani'}
                  </button>
                  <button
                    onClick={() => {
                      setCoordsInput(`${location.lat}, ${location.lng}`);
                      setIsEditing(false);
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    <X className="h-3 w-3" />
                    Prekliči
                  </button>
                </div>

                {/* Delete - only visible when editing and user has permission */}
                {canDelete && (showDeleteConfirm ? (
                  <div className="space-y-2 pt-2 border-t border-red-200">
                    <p className="text-xs text-red-600 font-medium">Res želite odstraniti ta predpražnik?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteCycle}
                        disabled={isDeleting}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        {isDeleting ? 'Brišem...' : 'Potrdi'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                      >
                        Prekliči
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 text-red-500 text-xs hover:bg-red-50 rounded border border-red-200"
                  >
                    <Trash2 className="h-3 w-3" />
                    Odstrani predpražnik
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 font-mono">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {location.lat}, {location.lng}
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Uredi
                </button>
              </div>
            )}
          </div>

          {/* Mat type and salesperson */}
          <div className="mt-2 pt-2 border-t border-gray-200">
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

// Individual location item in cluster with edit capability
function ClusterLocationItem({ loc }: { loc: MapLocation }) {
  const [isEditing, setIsEditing] = useState(false);
  const [coordsInput, setCoordsInput] = useState(`${loc.lat}, ${loc.lng}`);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeRole } = useAuth();
  const canDelete = activeRole === 'inventar' || activeRole === 'admin';

  const handleSaveCoordinates = async () => {
    const coords = parseCoordinates(coordsInput);
    if (!coords) {
      toast({ description: 'Neveljavne koordinate', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cycles')
        .update({ location_lat: coords.lat, location_lng: coords.lng })
        .eq('id', loc.cycleId);

      if (error) throw error;

      toast({ description: '✓ Koordinate posodobljene' });
      queryClient.invalidateQueries({ queryKey: ['map-locations'] });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating coordinates:', error);
      toast({ description: 'Napaka pri shranjevanju', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCycle = async () => {
    if (!canDelete) {
      toast({ description: 'Nimate dovoljenja za brisanje', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete related records first (foreign key constraints)
      await supabase.from('cycle_history').delete().eq('cycle_id', loc.cycleId);
      await supabase.from('sent_emails').delete().eq('cycle_id', loc.cycleId);
      await supabase.from('offer_items').delete().eq('cycle_id', loc.cycleId);
      await supabase.from('driver_pickup_items').delete().eq('cycle_id', loc.cycleId);

      // Now delete the cycle
      const { error } = await supabase
        .from('cycles')
        .delete()
        .eq('id', loc.cycleId);

      if (error) throw error;

      toast({ description: '✓ Predpražnik odstranjen' });
      queryClient.invalidateQueries({ queryKey: ['map-locations'] });
      setShowDeleteConfirm(false);
      setDeletePassword('');
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast({ description: 'Napaka pri brisanju', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-2 bg-gray-50 rounded border border-gray-100">
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
      <div className="text-xs text-gray-600 font-medium">
        {loc.companyName || 'Neznano podjetje'}
      </div>
      {loc.companyAddress && (
        <div className="text-xs text-gray-500">
          {loc.companyAddress}
        </div>
      )}
      {loc.contactPhone && (
        <div className="text-xs text-blue-600">
          {loc.contactPhone}
        </div>
      )}

      {/* Coordinate editing */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={coordsInput}
              onChange={(e) => setCoordsInput(e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded font-mono"
              placeholder="46.236, 15.267"
            />
            <div className="flex gap-1">
              <button
                onClick={handleSaveCoordinates}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {isSaving ? '...' : 'Shrani'}
              </button>
              <button
                onClick={() => {
                  setCoordsInput(`${loc.lat}, ${loc.lng}`);
                  setIsEditing(false);
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Prekliči
              </button>
            </div>

            {/* Delete - only visible when editing and user has permission */}
            {canDelete && (showDeleteConfirm ? (
              <div className="space-y-1 pt-1 border-t border-red-200">
                <p className="text-xs text-red-600">Res odstraniti?</p>
                <div className="flex gap-1">
                  <button
                    onClick={handleDeleteCycle}
                    disabled={isDeleting}
                    className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isDeleting ? '...' : 'Potrdi'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                  >
                    Ne
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-1 px-2 py-0.5 text-red-500 text-xs hover:bg-red-50 rounded border border-red-200"
              >
                <Trash2 className="h-3 w-3" />
                Odstrani
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400 font-mono truncate flex-1 mr-2">
              <MapPin className="h-3 w-3 inline mr-1" />
              {loc.lat}, {loc.lng}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline shrink-0"
            >
              Uredi
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
          <div className="max-h-80 overflow-y-auto space-y-2">
            {locations.map((loc) => (
              <ClusterLocationItem key={loc.cycleId} loc={loc} />
            ))}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

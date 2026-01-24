/**
 * @file MatDetailsModal.tsx
 * @description Modal za prikaz detajlov predpražnika
 */

import { useState } from 'react';
import { Camera, Pencil } from 'lucide-react';
import { CycleWithRelations } from '@/hooks/useCycles';
import { getTimeRemaining, formatCountdown } from '../../utils/timeHelpers';

interface MatDetailsModalProps {
  cycle: CycleWithRelations;
  // Mutations
  onUpdateLocation: (cycleId: string, lat: number, lng: number) => Promise<void>;
  onUpdateStartDate: (cycleId: string, date: string) => Promise<void>;
  onExtendTest: () => Promise<void>;
  onRequestDriverPickup: () => Promise<void>;
  onMarkAsDirty: () => Promise<void>;
  onMarkContractSigned: () => Promise<void>;
  // Pending states
  isUpdatingLocation: boolean;
  isUpdatingStartDate: boolean;
  isExtending: boolean;
  isUpdatingStatus: boolean;
  isMarkingContract: boolean;
  // Navigation
  onGoToPutOnTest: () => void;
  onAddMatToCompany: () => void;
  onViewCompany: () => void;
  onScanAnother: () => void;
  onClose: () => void;
  // Toast
  showToast: (message: string, variant?: 'default' | 'destructive') => void;
  // Update cycle state
  onUpdateCycle: (cycle: CycleWithRelations) => void;
}

export default function MatDetailsModal({
  cycle,
  onUpdateLocation,
  onUpdateStartDate,
  onExtendTest,
  onRequestDriverPickup,
  onMarkAsDirty,
  onMarkContractSigned,
  isUpdatingLocation,
  isUpdatingStartDate,
  isExtending,
  isUpdatingStatus,
  isMarkingContract,
  onGoToPutOnTest,
  onAddMatToCompany,
  onViewCompany,
  onScanAnother,
  onClose,
  showToast,
  onUpdateCycle,
}: MatDetailsModalProps) {
  // Local editing state
  const [editingLocation, setEditingLocation] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState('');
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');

  // Parse coordinates from string like "46.236134, 15.267745" or "46.236134 15.267745"
  const parseCoordinates = (coords: string): { lat: number; lng: number } | null => {
    // Remove extra whitespace and split by comma or whitespace
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
  };

  const handleSaveLocation = async () => {
    const coords = parseCoordinates(newLocationCoords);
    if (coords) {
      try {
        await onUpdateLocation(cycle.id, coords.lat, coords.lng);
        showToast('Lokacija posodobljena');
        setEditingLocation(false);
      } catch {
        showToast('Napaka pri posodabljanju lokacije', 'destructive');
      }
    } else {
      showToast('Neveljavne koordinate. Vnesi v obliki: 46.236134, 15.267745', 'destructive');
    }
  };

  const handleSaveStartDate = async () => {
    if (newStartDate) {
      try {
        await onUpdateStartDate(cycle.id, new Date(newStartDate).toISOString());
        showToast('Datum začetka posodobljen');
        setEditingStartDate(false);
        // Update local cycle state
        onUpdateCycle({
          ...cycle,
          test_start_date: new Date(newStartDate).toISOString(),
        } as CycleWithRelations);
      } catch {
        showToast('Napaka pri posodabljanju datuma', 'destructive');
      }
    }
  };

  const handleMarkContractSignedClick = async () => {
    try {
      await onMarkContractSigned();
      showToast('Pogodba označena kot podpisana');
      onUpdateCycle({
        ...cycle,
        contract_signed: true,
      } as CycleWithRelations);
    } catch {
      showToast('Napaka pri shranjevanju', 'destructive');
    }
  };

  const timeRemaining = getTimeRemaining(cycle.test_start_date, new Date());
  const countdown = formatCountdown(timeRemaining);

  return (
    <div>
      <h3 className="text-xl font-bold mb-1">{cycle.mat_type?.code || cycle.mat_type?.name}</h3>
      <div className="text-sm text-gray-500 mb-4 font-mono">
        {cycle.qr_code?.code}
      </div>

      {cycle.company && (
        <div className="mb-4 p-3 bg-blue-50 rounded space-y-2">
          <div>
            <span className="text-xs text-gray-500">Podjetje:</span>
            <div className="font-bold">{cycle.company.name}</div>
          </div>

          {cycle.contact && (
            <div>
              <span className="text-xs text-gray-500">Kontaktna oseba:</span>
              <div className="font-medium">
                {cycle.contact.first_name} {cycle.contact.last_name}
              </div>
            </div>
          )}

          {cycle.contact?.phone && (
            <div>
              <span className="text-xs text-gray-500">Telefon:</span>
              <div className="font-medium">
                <a href={'tel:' + cycle.contact.phone} className="text-blue-600">
                  {cycle.contact.phone}
                </a>
              </div>
            </div>
          )}

          {cycle.contact?.email && (
            <div>
              <span className="text-xs text-gray-500">Email:</span>
              <div className="font-medium">
                <a href={'mailto:' + cycle.contact.email} className="text-blue-600">
                  {cycle.contact.email}
                </a>
              </div>
            </div>
          )}

          {cycle.notes && (
            <div>
              <span className="text-xs text-gray-500">Opombe:</span>
              <div className="text-sm bg-white p-2 rounded mt-1">{cycle.notes}</div>
            </div>
          )}

          {/* Lokacija */}
          <div className="pt-2 border-t">
            <span className="text-xs text-gray-500">Lokacija:</span>
            {editingLocation ? (
              <div className="mt-2 space-y-2">
                <div>
                  <input
                    type="text"
                    value={newLocationCoords}
                    onChange={(e) => setNewLocationCoords(e.target.value)}
                    placeholder="46.236134, 15.267745"
                    className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Prilepi koordinate iz Google Maps</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveLocation}
                    disabled={isUpdatingLocation}
                    className="flex-1 bg-blue-500 text-white py-1.5 rounded text-sm"
                  >
                    {isUpdatingLocation ? 'Shranjujem...' : 'Shrani'}
                  </button>
                  <button
                    onClick={() => setEditingLocation(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm"
                  >
                    Prekliči
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                {(cycle as any).location_lat && (cycle as any).location_lng ? (
                  <a
                    href={`https://www.google.com/maps?q=${(cycle as any).location_lat},${(cycle as any).location_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {(cycle as any).location_lat.toFixed(6)}, {(cycle as any).location_lng.toFixed(6)} 🗺️
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">Ni nastavljeno</span>
                )}
                <button
                  onClick={() => {
                    const lat = (cycle as any).location_lat;
                    const lng = (cycle as any).location_lng;
                    setNewLocationCoords(lat && lng ? `${lat}, ${lng}` : '');
                    setEditingLocation(true);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="Uredi lokacijo"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>

          {cycle.test_start_date && (
            <div className="pt-2 border-t">
              <span className="text-xs text-gray-500">Preostali čas:</span>
              <div className="text-xl font-bold mt-1" style={{
                color: countdown?.color === 'red' ? '#DC2626' :
                       countdown?.color === 'orange' ? '#EA580C' : '#16A34A'
              }}>
                {countdown?.text}
              </div>

              {editingStartDate ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveStartDate}
                      disabled={isUpdatingStartDate}
                      className="flex-1 bg-blue-500 text-white py-1.5 rounded text-sm"
                    >
                      {isUpdatingStartDate ? 'Shranjujem...' : 'Shrani'}
                    </button>
                    <button
                      onClick={() => setEditingStartDate(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm"
                    >
                      Prekliči
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xs text-gray-500">
                    Začetek: {new Date(cycle.test_start_date).toLocaleDateString('sl-SI')}
                  </div>
                  <button
                    onClick={() => {
                      setNewStartDate(new Date(cycle.test_start_date!).toISOString().split('T')[0]);
                      setEditingStartDate(true);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                    title="Spremeni datum začetka"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {cycle.status === 'clean' && (
          <button
            onClick={onGoToPutOnTest}
            className="w-full bg-blue-500 text-white py-2 rounded"
          >
            Daj na test
          </button>
        )}
        {cycle.status === 'on_test' && (
          <div className="space-y-2">
            <button
              onClick={onExtendTest}
              disabled={isExtending}
              className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
            >
              {isExtending ? 'Podaljševanje...' : '🔄 Podaljšaj +7 dni'}
            </button>
            <button
              onClick={onAddMatToCompany}
              className="w-full bg-green-500 text-white py-2 rounded"
            >
              ➕ Dodaj predpražnik sem
            </button>
            <button
              onClick={onRequestDriverPickup}
              disabled={isUpdatingStatus}
              className="w-full bg-purple-500 text-white py-2 rounded disabled:opacity-50"
            >
              {isUpdatingStatus ? 'Shranjevanje...' : '🚛 Pobere šofer'}
            </button>
            <button
              onClick={onViewCompany}
              className="w-full bg-green-600 text-white py-2 rounded"
            >
              📋 Poglej stranko / Ponudba
            </button>
            <button
              onClick={onMarkAsDirty}
              disabled={isUpdatingStatus}
              className="w-full bg-orange-500 text-white py-2 rounded disabled:opacity-50"
            >
              {isUpdatingStatus ? 'Shranjevanje...' : '📥 Pobrano (test končan)'}
            </button>
            {!cycle.contract_signed ? (
              <button
                onClick={handleMarkContractSignedClick}
                disabled={isMarkingContract}
                className="w-full bg-emerald-600 text-white py-2 rounded disabled:opacity-50"
              >
                {isMarkingContract ? 'Shranjevanje...' : '✍️ Pogodba podpisana'}
              </button>
            ) : (
              <div className="w-full py-2 bg-green-100 text-green-800 rounded text-center text-sm">
                ✅ Pogodba že podpisana
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {cycle.status === 'on_test' && (
          <button
            onClick={onScanAnother}
            className="w-full py-2 bg-gray-100 rounded flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            Skeniraj drugo kodo
          </button>
        )}
        <button onClick={onClose} className="w-full py-2 border rounded">
          Zapri
        </button>
      </div>
    </div>
  );
}

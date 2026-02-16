/**
 * @file TravelLogPopup.tsx
 * @description Popup za vnos dnevnih potnih stroškov (13:00-17:00)
 */

import { useState, useEffect } from 'react';
import { X, Car, MapPin, Save, Calendar } from 'lucide-react';
import {
  useTravelLog,
  useCreateTravelLog,
  useTravelLogEntries,
  useUpsertTravelLogEntry,
  PURPOSE_LABELS,
} from '@/hooks/useTravelLog';
import type { TravelPurpose } from '@/integrations/supabase/types';

interface TravelLogPopupProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const WORK_TYPES: { value: TravelPurpose; label: string }[] = [
  { value: 'teren', label: 'Teren' },
  { value: 'od_doma', label: 'Delo od doma' },
  { value: 'dopust', label: 'Dopust' },
  { value: 'bolniska', label: 'Bolniška' },
];

export function TravelLogPopup({ userId, isOpen, onClose, onSuccess }: TravelLogPopupProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Get or create travel log for current month
  const { data: travelLog, isLoading: logLoading } = useTravelLog(userId, year, month);
  const { data: entries } = useTravelLogEntries(travelLog?.id);
  const createTravelLog = useCreateTravelLog();
  const upsertEntry = useUpsertTravelLogEntry();

  // Form state
  const [cities, setCities] = useState('');
  const [workType, setWorkType] = useState<TravelPurpose>('teren');
  const [kmBusiness, setKmBusiness] = useState<string>('');
  const [kmPrivate, setKmPrivate] = useState<string>('');
  const [kmOdometer, setKmOdometer] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if entry for today already exists
  const todayEntry = entries?.find(e => e.entry_date === todayStr);

  // Get last odometer reading for auto-calculation
  const lastEntry = entries
    ?.filter(e => e.entry_date < todayStr && e.odometer_reading)
    ?.sort((a, b) => b.entry_date.localeCompare(a.entry_date))?.[0];

  // Prefill form with existing entry
  useEffect(() => {
    if (todayEntry) {
      setCities(todayEntry.route || '');
      setWorkType((todayEntry.purpose as TravelPurpose) || 'teren');
      setKmBusiness(todayEntry.km_business?.toString() || '');
      setKmPrivate(todayEntry.km_private?.toString() || '');
      setKmOdometer(todayEntry.odometer_reading?.toString() || '');
      setNotes(todayEntry.notes || '');
    }
  }, [todayEntry]);

  // Auto-calculate business km when odometer changes
  useEffect(() => {
    if (kmOdometer && lastEntry?.odometer_reading) {
      const currentOdo = parseInt(kmOdometer);
      const lastOdo = lastEntry.odometer_reading;
      if (currentOdo > lastOdo) {
        const totalKm = currentOdo - lastOdo;
        const privateKm = parseFloat(kmPrivate) || 0;
        const businessKm = Math.max(0, totalKm - privateKm);
        setKmBusiness(businessKm.toString());
      }
    }
  }, [kmOdometer, kmPrivate, lastEntry?.odometer_reading]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      // Ensure travel log exists for this month
      let logId = travelLog?.id;
      if (!logId) {
        const newLog = await createTravelLog.mutateAsync({
          user_id: userId,
          year,
          month,
        });
        logId = newLog.id;
      }

      // Upsert entry for today
      await upsertEntry.mutateAsync({
        travel_log_id: logId,
        entry_date: todayStr,
        route: cities || null,
        purpose: workType,
        km_business: parseFloat(kmBusiness) || 0,
        km_private: parseFloat(kmPrivate) || 0,
        odometer_reading: kmOdometer ? parseInt(kmOdometer) : null,
        notes: notes || null,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving travel log:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1100]">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Car size={24} />
            <h2 className="text-lg font-semibold">Dnevnik poti</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Date display */}
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-3 rounded">
            <Calendar size={20} />
            <span className="font-medium">
              {today.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Last odometer info */}
          {lastEntry?.odometer_reading && (
            <div className="text-sm text-gray-500 bg-yellow-50 p-2 rounded">
              Zadnji odometer: <strong>{lastEntry.odometer_reading.toLocaleString()} km</strong> ({lastEntry.entry_date})
            </div>
          )}

          {/* Work type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip dela</label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as TravelPurpose)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              {WORK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cities visited */}
          {workType === 'teren' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin size={16} className="inline mr-1" />
                Obiskana mesta
              </label>
              <input
                type="text"
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder="npr. Ljubljana, Maribor, Celje"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Odometer */}
          {workType === 'teren' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stanje kilometrov (armatura)
              </label>
              <input
                type="number"
                value={kmOdometer}
                onChange={(e) => setKmOdometer(e.target.value)}
                placeholder="npr. 125430"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Kilometers grid */}
          {workType === 'teren' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Službeni km</label>
                <input
                  type="number"
                  step="0.1"
                  value={kmBusiness}
                  onChange={(e) => setKmBusiness(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-green-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Privatni km</label>
                <input
                  type="number"
                  step="0.1"
                  value={kmPrivate}
                  onChange={(e) => setKmPrivate(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opombe</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatne opombe..."
              rows={2}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border rounded text-gray-700 hover:bg-gray-50"
          >
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={saving || logLoading}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Shranjujem...' : todayEntry ? 'Posodobi' : 'Shrani'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TravelLogPopup;

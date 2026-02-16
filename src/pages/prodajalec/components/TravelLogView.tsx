/**
 * @file TravelLogView.tsx
 * @description Potni nalog - mesečna evidenca voženj z GPS integracijo
 */

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Car,
  MapPin,
  Calendar,
  Save,
  Loader2,
  Navigation,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  useTravelLog,
  useTravelLogEntries,
  useCreateTravelLog,
  useUpdateTravelLog,
  useBulkUpsertEntries,
  useMonthlyGpsData,
  usePreviousMonthEndingOdometer,
  getDaysInMonth,
  formatDate,
  PURPOSE_LABELS,
  calculateMonthlyStats,
} from '@/hooks/useTravelLog';
import type { TravelLogEntryInsert, TravelPurpose } from '@/integrations/supabase/types';
import { TRAVEL_PURPOSES } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

interface TravelLogViewProps {
  userId?: string;
}

// Meseci v slovenščini
const MONTH_NAMES = [
  'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
  'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
];

// Day names
const DAY_NAMES = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob'];

interface DayEntry {
  date: string;
  dayOfWeek: number;
  dayOfMonth: number;
  route: string;
  purpose: TravelPurpose;
  kmBusiness: number;
  kmPrivate: number;
  gpsKm: number;
  gpsRoute: string; // Avtomatsko generirana relacija iz GPS
  odometer: number;
}

export default function TravelLogView({ userId }: TravelLogViewProps) {
  const { toast } = useToast();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [startingOdometer, setStartingOdometer] = useState<number>(0);
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [vehicleOwner, setVehicleOwner] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Quick entry state
  const todayStr = formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [quickDate, setQuickDate] = useState(todayStr);
  const [quickRoute, setQuickRoute] = useState('');
  const [quickOdometer, setQuickOdometer] = useState('');

  // Queries
  const { data: travelLog, isLoading: loadingLog } = useTravelLog(userId, selectedYear, selectedMonth);
  const { data: savedEntries, isLoading: loadingEntries } = useTravelLogEntries(travelLog?.id);
  const { data: gpsData } = useMonthlyGpsData(userId, selectedYear, selectedMonth);
  const { data: prevMonthOdometer } = usePreviousMonthEndingOdometer(userId, selectedYear, selectedMonth);

  // Mutations
  const createTravelLog = useCreateTravelLog();
  const updateTravelLog = useUpdateTravelLog();
  const bulkUpsertEntries = useBulkUpsertEntries();

  // Track which month has been initialized to avoid re-running on async data changes
  const [initializedKey, setInitializedKey] = useState('');

  // Initialize entries when month changes or initial data loads
  useEffect(() => {
    const key = `${selectedYear}-${selectedMonth}`;
    const dataReady = !loadingLog && !loadingEntries;

    // Only initialize once per month, or when explicitly changing months
    if (!dataReady) return;
    if (initializedKey === key && hasChanges) return; // Don't overwrite unsaved changes

    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const newEntries: DayEntry[] = [];

    const startOdo = travelLog?.starting_odometer || prevMonthOdometer || 0;
    let runningOdometer = startOdo;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(selectedYear, selectedMonth, day);
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = dateObj.getDay();

      // Find saved entry
      const saved = savedEntries?.find(e => e.entry_date === date);
      // Get GPS data for this date
      const dailyGps = gpsData?.get(date);
      const gpsKm = dailyGps?.km || 0;
      const gpsRoute = dailyGps?.route || '';

      const kmBusiness = saved?.km_business || 0;
      const kmPrivate = saved?.km_private || 0;

      // Calculate odometer
      runningOdometer += kmBusiness + kmPrivate;

      // Uporabi GPS relacijo če ni shranjena relacija
      const route = saved?.route || gpsRoute;

      newEntries.push({
        date,
        dayOfWeek,
        dayOfMonth: day,
        route,
        purpose: (saved?.purpose as TravelPurpose) || (dayOfWeek === 0 || dayOfWeek === 6 ? 'prosto' : 'teren'),
        kmBusiness,
        kmPrivate,
        gpsKm: Math.round(gpsKm * 10) / 10,
        gpsRoute,
        odometer: saved?.odometer_reading || runningOdometer,
      });
    }

    setEntries(newEntries);
    setStartingOdometer(startOdo);

    // Set vehicle info from travel log
    if (travelLog) {
      setVehicleBrand(travelLog.vehicle_brand || '');
      setVehicleRegistration(travelLog.vehicle_registration || '');
      setVehicleOwner(travelLog.vehicle_owner || '');
    }

    setInitializedKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, travelLog, savedEntries, gpsData, prevMonthOdometer, loadingLog, loadingEntries]);

  // Update GPS data without overwriting user entries
  useEffect(() => {
    if (!gpsData || entries.length === 0 || !initializedKey) return;
    setEntries(prev => prev.map(entry => {
      const dailyGps = gpsData.get(entry.date);
      if (!dailyGps) return entry;
      return {
        ...entry,
        gpsKm: Math.round(dailyGps.km * 10) / 10,
        gpsRoute: dailyGps.route || entry.gpsRoute,
      };
    }));
  }, [gpsData, initializedKey]); // Only depends on GPS data, not on entries

  // Calculate statistics
  const stats = useMemo(() => {
    let totalBusiness = 0;
    let totalPrivate = 0;

    for (const entry of entries) {
      totalBusiness += entry.kmBusiness;
      totalPrivate += entry.kmPrivate;
    }

    const endingOdometer = startingOdometer + totalBusiness + totalPrivate;

    return {
      totalBusiness,
      totalPrivate,
      totalKm: totalBusiness + totalPrivate,
      endingOdometer,
      privateLimit: travelLog?.private_km_limit || 500,
      isOverLimit: totalPrivate > (travelLog?.private_km_limit || 500),
    };
  }, [entries, startingOdometer, travelLog]);

  // Recalculate odometers
  const recalculateOdometers = (updatedEntries: DayEntry[]) => {
    let running = startingOdometer;
    return updatedEntries.map(entry => {
      running += entry.kmBusiness + entry.kmPrivate;
      return { ...entry, odometer: running };
    });
  };

  // Update single entry
  const updateEntry = (index: number, field: keyof DayEntry, value: any) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Recalculate odometers if km changed
      if (field === 'kmBusiness' || field === 'kmPrivate') {
        return recalculateOdometers(updated);
      }

      return updated;
    });
    setHasChanges(true);
  };

  // Apply GPS km to business km
  // Uporabi GPS km in relacijo
  const applyGpsData = (index: number) => {
    const entry = entries[index];
    if (entry.gpsKm > 0) {
      setEntries(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          kmBusiness: Math.round(entry.gpsKm),
          route: entry.gpsRoute || updated[index].route,
        };
        return recalculateOdometers(updated);
      });
      setHasChanges(true);
    }
  };

  // Quick entry handler
  const handleQuickAdd = () => {
    if (!quickOdometer) {
      toast({ description: 'Vnesi stanje števca', variant: 'destructive' });
      return;
    }

    // Find the entry for the selected date
    const entryIndex = entries.findIndex(e => e.date === quickDate);
    if (entryIndex === -1) {
      toast({ description: 'Datum ni v tem mesecu', variant: 'destructive' });
      return;
    }

    const newOdometer = parseInt(quickOdometer);

    // Find previous entry with odometer to calculate km
    let prevOdometer = startingOdometer;
    for (let i = entryIndex - 1; i >= 0; i--) {
      if (entries[i].odometer > 0) {
        prevOdometer = entries[i].odometer;
        break;
      }
    }

    const kmDriven = Math.max(0, newOdometer - prevOdometer);

    setEntries(prev => {
      const updated = [...prev];
      updated[entryIndex] = {
        ...updated[entryIndex],
        route: quickRoute || updated[entryIndex].route,
        kmBusiness: kmDriven,
        odometer: newOdometer,
        purpose: 'teren',
      };
      return recalculateOdometers(updated);
    });

    setHasChanges(true);
    setQuickRoute('');
    setQuickOdometer('');
    toast({ description: `Dodano: ${kmDriven} km za ${quickDate}` });
  };

  // Navigate months
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(y => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(m => m - 1);
    }
    setHasChanges(false);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(y => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(m => m + 1);
    }
    setHasChanges(false);
  };

  // Save all data
  const handleSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      let logId = travelLog?.id;

      // Create travel log if doesn't exist
      if (!logId) {
        const newLog = await createTravelLog.mutateAsync({
          user_id: userId,
          year: selectedYear,
          month: selectedMonth,
          starting_odometer: startingOdometer,
          vehicle_brand: vehicleBrand || null,
          vehicle_registration: vehicleRegistration || null,
          vehicle_owner: vehicleOwner || null,
        });
        logId = newLog.id;
      } else {
        // Update existing travel log
        await updateTravelLog.mutateAsync({
          id: logId,
          data: {
            starting_odometer: startingOdometer,
            ending_odometer: stats.endingOdometer,
            vehicle_brand: vehicleBrand || null,
            vehicle_registration: vehicleRegistration || null,
            vehicle_owner: vehicleOwner || null,
          },
        });
      }

      // Save entries
      const entriesToSave: TravelLogEntryInsert[] = entries.map(entry => ({
        travel_log_id: logId!,
        entry_date: entry.date,
        route: entry.route || null,
        purpose: entry.purpose,
        km_business: entry.kmBusiness,
        km_private: entry.kmPrivate,
        odometer_reading: entry.odometer,
      }));

      await bulkUpsertEntries.mutateAsync(entriesToSave);

      toast({ description: 'Potni nalog shranjen' });
      setHasChanges(false);
    } catch (error: any) {
      toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingLog || loadingEntries;

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="text-blue-500" size={24} />
          Potni nalog
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Shrani
        </button>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <div className="text-xl font-bold">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</div>
            <div className="text-sm text-gray-500">Potni nalog</div>
          </div>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Quick entry */}
      <div className="bg-blue-50 rounded-lg shadow p-4 space-y-3 border-2 border-blue-200">
        <h3 className="font-medium flex items-center gap-2 text-blue-700">
          <Plus size={18} />
          Hitri vnos
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Datum</label>
            <input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mesta</label>
            <input
              type="text"
              value={quickRoute}
              onChange={(e) => setQuickRoute(e.target.value)}
              placeholder="lj-mb-lj"
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Števec</label>
            <input
              type="number"
              value={quickOdometer}
              onChange={(e) => setQuickOdometer(e.target.value)}
              placeholder="112500"
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleQuickAdd}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Dodaj
        </button>
      </div>

      {/* Vehicle info & starting odometer */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Car size={18} className="text-gray-500" />
          Vozilo
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Znamka</label>
            <input
              type="text"
              value={vehicleBrand}
              onChange={(e) => { setVehicleBrand(e.target.value); setHasChanges(true); }}
              placeholder="ŠKODA OCT"
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Registracija</label>
            <input
              type="text"
              value={vehicleRegistration}
              onChange={(e) => { setVehicleRegistration(e.target.value); setHasChanges(true); }}
              placeholder="LJ 49 PDD"
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Lastnik vozila</label>
          <input
            type="text"
            value={vehicleOwner}
            onChange={(e) => { setVehicleOwner(e.target.value); setHasChanges(true); }}
            placeholder="ALD d.o.o."
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Začetno stanje števca</label>
          <input
            type="text"
            inputMode="numeric"
            value={startingOdometer || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value.replace(/[^0-9]/g, ''));
              setStartingOdometer(val);
              setEntries(prev => recalculateOdometers(prev.map((e, i) => i === 0 ? { ...e } : e)));
              setHasChanges(true);
            }}
            placeholder="111062"
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-3">
          <div className="text-sm text-gray-500">Službeni km</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalBusiness}</div>
        </div>
        <div className={`rounded-lg shadow p-3 ${stats.isOverLimit ? 'bg-red-50' : 'bg-white'}`}>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            Privatni km
            {stats.isOverLimit && <AlertCircle size={14} className="text-red-500" />}
          </div>
          <div className={`text-2xl font-bold ${stats.isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
            {stats.totalPrivate}
            <span className="text-sm font-normal text-gray-400"> / {stats.privateLimit}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <div className="text-sm text-gray-500">Skupaj km</div>
          <div className="text-2xl font-bold">{stats.totalKm}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3">
          <div className="text-sm text-gray-500">Končno stanje</div>
          <div className="text-2xl font-bold text-purple-600">{stats.endingOdometer}</div>
        </div>
      </div>

      {/* Daily entries table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">Dan</th>
                <th className="px-2 py-2 text-left">Relacija</th>
                <th className="px-2 py-2 text-left">Namen</th>
                <th className="px-2 py-2 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Navigation size={12} className="text-blue-500" />
                    GPS
                  </span>
                </th>
                <th className="px-2 py-2 text-right">Služ.</th>
                <th className="px-2 py-2 text-right">Priv.</th>
                <th className="px-2 py-2 text-right">Števec</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  const isWeekend = entry.dayOfWeek === 0 || entry.dayOfWeek === 6;
                  return (
                    <tr
                      key={entry.date}
                      className={`border-t ${isWeekend ? 'bg-gray-50' : ''} ${
                        entry.purpose === 'bolniska' ? 'bg-yellow-50' :
                        entry.purpose === 'dopust' ? 'bg-green-50' :
                        entry.purpose === 'praznik' ? 'bg-purple-50' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5">
                        <div className="font-medium">{entry.dayOfMonth}.</div>
                        <div className={`text-xs ${isWeekend ? 'text-red-500' : 'text-gray-400'}`}>
                          {DAY_NAMES[entry.dayOfWeek]}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={entry.route}
                          onChange={(e) => updateEntry(index, 'route', e.target.value)}
                          placeholder="mb-lj-mb"
                          className="w-full p-1 border rounded text-xs bg-transparent"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={entry.purpose}
                          onChange={(e) => updateEntry(index, 'purpose', e.target.value)}
                          className="w-full p-1 border rounded text-xs bg-transparent"
                        >
                          {TRAVEL_PURPOSES.map(p => (
                            <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {entry.gpsKm > 0 ? (
                          <button
                            onClick={() => applyGpsData(index)}
                            className="text-blue-600 font-medium hover:underline"
                            title="Klikni za uporabo GPS km in relacije"
                          >
                            {entry.gpsKm}
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.kmBusiness || ''}
                          onChange={(e) => updateEntry(index, 'kmBusiness', e.target.value === '' ? 0 : parseInt(e.target.value.replace(/[^0-9]/g, '')))}
                          className="w-14 p-1 border rounded text-xs text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.kmPrivate || ''}
                          onChange={(e) => updateEntry(index, 'kmPrivate', e.target.value === '' ? 0 : parseInt(e.target.value.replace(/[^0-9]/g, '')))}
                          className="w-14 p-1 border rounded text-xs text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs text-gray-500">
                        {entry.odometer}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <div className="text-xs text-gray-400 text-center">
        Meja za polno boniteto: {stats.privateLimit} km privatnih voženj
      </div>
    </div>
  );
}

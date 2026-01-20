/**
 * @file ReminderModal.tsx
 * @description Modal za dodajanje opomnika za stranko
 */

import { Bell, X, Calendar } from 'lucide-react';

/**
 * Generira ICS (iCalendar) datoteko za opomnik
 */
const generateICS = (
  date: string,
  time: string,
  companyName: string,
  note?: string
): string => {
  const startDate = new Date(`${date}T${time}:00`);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // +30 min

  // Format: 20260119T090000
  const formatDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0];
  };

  const uid = `reminder-${Date.now()}@matpro.ristov.xyz`;
  const summary = `Opomnik: ${companyName}`;
  const description = note ? note.replace(/\n/g, '\\n') : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mat Tracker Pro//Reminder//SL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    // Alarm 15 minut pred
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    // Alarm ob času
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
};

/**
 * Prenese ICS datoteko
 */
const downloadICS = (
  date: string,
  time: string,
  companyName: string,
  note?: string
) => {
  const ics = generateICS(date, time, companyName, note);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `opomnik-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface ReminderModalProps {
  date: string;
  time: string;
  note: string;
  companyName?: string;
  isLoading: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  onSaveAndExport?: () => void;
  onClose: () => void;
}

/**
 * Modal za kreiranje opomnika
 * - Izbira datuma in časa
 * - Hitri izbor (čez 1 uro, jutri, naslednji teden)
 * - Opcijska opomba
 */
export default function ReminderModal({
  date,
  time,
  note,
  companyName,
  isLoading,
  onDateChange,
  onTimeChange,
  onNoteChange,
  onSave,
  onSaveAndExport,
  onClose,
}: ReminderModalProps) {
  const today = new Date().toISOString().split('T')[0];

  // Hitri izbor - čez 1 uro
  const setInOneHour = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    onDateChange(now.toISOString().split('T')[0]);
    onTimeChange(now.toTimeString().slice(0, 5));
  };

  // Hitri izbor - jutri zjutraj
  const setTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    onDateChange(tomorrow.toISOString().split('T')[0]);
    onTimeChange('09:00');
  };

  // Hitri izbor - naslednji teden
  const setNextWeek = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateChange(nextWeek.toISOString().split('T')[0]);
    onTimeChange('09:00');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b bg-blue-50 flex items-center justify-between">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            <Bell size={20} />
            Dodaj opomnik
          </h3>
          <button onClick={onClose} className="p-1 text-blue-800 hover:text-blue-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full p-2 border rounded-lg"
              min={today}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ura</label>
            <input
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {/* Quick time presets */}
          <div>
            <label className="block text-sm font-medium mb-1">Hitri izbor</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={setInOneHour}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
              >
                Čez 1 uro
              </button>
              <button
                type="button"
                onClick={setTomorrowMorning}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
              >
                Jutri zjutraj
              </button>
              <button
                type="button"
                onClick={setNextWeek}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
              >
                Naslednji teden
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Opomba (neobvezno)</label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Npr. Pokliči glede pogodbe..."
              className="w-full p-2 border rounded-lg resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg text-gray-600"
            >
              Prekliči
            </button>
            <button
              onClick={() => {
                // Shrani in izvozi ICS
                if (companyName && date && time) {
                  downloadICS(date, time, companyName, note);
                }
                onSave();
              }}
              disabled={!date || isLoading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              {isLoading ? 'Shranjujem...' : 'Shrani'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

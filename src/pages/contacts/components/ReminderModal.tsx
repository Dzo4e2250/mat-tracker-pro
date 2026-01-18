/**
 * @file ReminderModal.tsx
 * @description Modal za dodajanje opomnika za stranko
 */

import { Bell, X } from 'lucide-react';

interface ReminderModalProps {
  date: string;
  time: string;
  note: string;
  isLoading: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onNoteChange: (note: string) => void;
  onSave: () => void;
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
  isLoading,
  onDateChange,
  onTimeChange,
  onNoteChange,
  onSave,
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
              onClick={onSave}
              disabled={!date || isLoading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isLoading ? 'Shranjujem...' : 'Shrani'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

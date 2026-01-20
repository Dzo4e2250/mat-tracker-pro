/**
 * @file MeetingModal.tsx
 * @description Modal za dodajanje sestanka, roka za ponudbo ali izris
 */

import { X, Calendar } from 'lucide-react';

type MeetingType = 'sestanek' | 'ponudba' | 'izris';

interface MeetingModalProps {
  type: MeetingType;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSaveWithICS: () => void;
  onSaveOnly: () => void;
  onClose: () => void;
}

/**
 * Modal za sestanek, rok ponudbe ali izris
 * - Izbira datuma (in časa za sestanek)
 * - Preview kaj bo shranjeno
 * - Možnost prenosa .ics datoteke
 */
export default function MeetingModal({
  type,
  date,
  time,
  onDateChange,
  onTimeChange,
  onSaveWithICS,
  onSaveOnly,
  onClose,
}: MeetingModalProps) {
  const isSestanek = type === 'sestanek';
  const formattedDate = date ? new Date(date).toLocaleDateString('sl-SI') : '';

  const getTitle = () => {
    switch (type) {
      case 'sestanek': return 'Dogovorjen sestanek';
      case 'ponudba': return 'Pošlji ponudbo do';
      case 'izris': return 'Pošlji izris do';
      default: return 'Opomnik';
    }
  };

  const getPreviewText = () => {
    switch (type) {
      case 'sestanek': return `Dogovorjen sestanek za ${formattedDate} ob ${time}`;
      case 'ponudba': return `Pošlji ponudbo do ${formattedDate}`;
      case 'izris': return `Pošlji izris do ${formattedDate}`;
      default: return `Opomnik za ${formattedDate}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">{getTitle()}</h3>
          <button onClick={onClose} className="p-1">
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
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {isSestanek && (
            <div>
              <label className="block text-sm font-medium mb-1">Ura</label>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
          )}

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-gray-700 mb-1">Bo shranjeno:</p>
            <p>{getPreviewText()}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onSaveWithICS}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              Shrani + Prenesi .ics
            </button>
          </div>

          <button
            onClick={onSaveOnly}
            className="w-full py-2 text-gray-500 text-sm"
          >
            Samo shrani (brez .ics)
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @file StickyNotesInput.tsx
 * @description Fiksni input za dodajanje opomb - vedno viden na dnu panela/modala
 */

import { Plus } from 'lucide-react';

interface StickyNotesInputProps {
  newNoteDate: string;
  newNoteContent: string;
  isAddingNote: boolean;
  onNewNoteDateChange: (date: string) => void;
  onNewNoteContentChange: (content: string) => void;
  onAddNote: () => void;
  // D365 fields
  d365StartTime?: string;
  d365EndTime?: string;
  onD365StartTimeChange?: (value: string) => void;
  onD365EndTimeChange?: (value: string) => void;
}

export default function StickyNotesInput({
  newNoteDate,
  newNoteContent,
  isAddingNote,
  onNewNoteDateChange,
  onNewNoteContentChange,
  onAddNote,
  d365StartTime,
  d365EndTime,
  onD365StartTimeChange,
  onD365EndTimeChange,
}: StickyNotesInputProps) {
  return (
    <div className="bg-yellow-50 rounded-lg p-3">
      <div className="flex gap-2 mb-2">
        <input
          type="date"
          value={newNoteDate}
          onChange={(e) => onNewNoteDateChange(e.target.value)}
          className="px-2 py-1 border rounded text-sm"
        />
        <button
          onClick={onAddNote}
          disabled={!newNoteContent.trim() || isAddingNote}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm disabled:bg-gray-300 flex items-center gap-1"
        >
          <Plus size={14} />
          Dodaj
        </button>
      </div>
      <textarea
        value={newNoteContent}
        onChange={(e) => onNewNoteContentChange(e.target.value)}
        placeholder="Prosta opomba..."
        className="w-full p-2 border rounded text-sm"
        rows={2}
      />

      {onD365StartTimeChange && (
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1">Od</label>
            <input
              type="time"
              value={d365StartTime || '09:00'}
              onChange={(e) => onD365StartTimeChange?.(e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1">Do</label>
            <input
              type="time"
              value={d365EndTime || '09:30'}
              onChange={(e) => onD365EndTimeChange?.(e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

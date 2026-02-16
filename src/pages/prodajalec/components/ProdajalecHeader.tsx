/**
 * @file ProdajalecHeader.tsx
 * @description Header za prodajalec dashboard
 */

import { Menu, Car } from 'lucide-react';

interface ProdajalecHeaderProps {
  firstName?: string;
  lastName?: string;
  view: string;
  onMenuOpen: () => void;
  onTravelView: () => void;
}

export default function ProdajalecHeader({
  firstName,
  lastName,
  view,
  onMenuOpen,
  onTravelView,
}: ProdajalecHeaderProps) {
  return (
    <div className="bg-blue-600 text-white p-4 shadow">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="p-1 hover:bg-blue-700 rounded"
            aria-label="Odpri meni"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Lindström</h1>
            <div className="text-sm">{firstName} {lastName}</div>
          </div>
        </div>
        <button
          onClick={onTravelView}
          className={`p-2 rounded flex items-center gap-1 ${view === 'travel' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
          title="Potni nalog"
          aria-label="Potni nalog"
        >
          <Car size={20} />
          <span className="text-sm hidden sm:inline">Nalog</span>
        </button>
      </div>
    </div>
  );
}

/**
 * @file BottomNavigation.tsx
 * @description Spodnja navigacija za Contacts stran - prilagojena glede na vlogo
 */

import { useNavigate } from 'react-router-dom';
import { Home, Camera, Users, CheckSquare, Car } from 'lucide-react';

interface BottomNavigationProps {
  activeTab?: 'home' | 'scan' | 'contacts';
  activeRole?: string | null;
}

export function BottomNavigation({ activeTab = 'contacts', activeRole }: BottomNavigationProps) {
  const navigate = useNavigate();

  // prodajalec_oblek: isti nav kot na dashboardu, samo Stranke je aktiven
  if (activeRole === 'prodajalec_oblek') {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => navigate('/prodajalec?view=tasks')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
            aria-label="Naloge"
          >
            <CheckSquare size={22} />
            <span className="text-xs mt-1">Naloge</span>
          </button>
          <button
            onClick={() => navigate('/contacts')}
            className="flex-1 py-3 flex flex-col items-center text-blue-600"
            aria-label="Stranke"
          >
            <Users size={22} />
            <span className="text-xs mt-1">Stranke</span>
          </button>
          <button
            onClick={() => navigate('/prodajalec?view=travel')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
            aria-label="Potni nalog"
          >
            <Car size={22} />
            <span className="text-xs mt-1">Potni nalog</span>
          </button>
        </div>
      </div>
    );
  }

  // Default: Domov | Skeniraj | Stranke
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
      <div className="max-w-4xl mx-auto flex">
        <button
          onClick={() => navigate('/prodajalec')}
          className={`flex-1 py-3 flex flex-col items-center ${
            activeTab === 'home' ? 'text-blue-600' : 'text-gray-600'
          }`}
          aria-label="Domov"
        >
          <Home size={22} />
          <span className="text-xs mt-1">Domov</span>
        </button>
        <button
          onClick={() => navigate('/prodajalec?view=scan')}
          className={`flex-1 py-3 flex flex-col items-center ${
            activeTab === 'scan' ? 'text-blue-600' : 'text-gray-600'
          }`}
          aria-label="Skeniraj"
        >
          <Camera size={22} />
          <span className="text-xs mt-1">Skeniraj</span>
        </button>
        <button
          onClick={() => navigate('/contacts')}
          className={`flex-1 py-3 flex flex-col items-center ${
            activeTab === 'contacts' ? 'text-blue-600' : 'text-gray-600'
          }`}
          aria-label="Stranke"
        >
          <Users size={22} />
          <span className="text-xs mt-1">Stranke</span>
        </button>
      </div>
    </div>
  );
}

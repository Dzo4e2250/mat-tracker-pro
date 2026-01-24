/**
 * @file BottomNavigation.tsx
 * @description Spodnja navigacija za Contacts stran
 */

import { useNavigate } from 'react-router-dom';
import { Home, Camera, Users } from 'lucide-react';

interface BottomNavigationProps {
  activeTab?: 'home' | 'scan' | 'contacts';
}

export function BottomNavigation({ activeTab = 'contacts' }: BottomNavigationProps) {
  const navigate = useNavigate();

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

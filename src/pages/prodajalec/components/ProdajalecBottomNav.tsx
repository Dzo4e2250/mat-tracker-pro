/**
 * @file ProdajalecBottomNav.tsx
 * @description Bottom navigation za Prodajalec dashboard
 */

import { useNavigate } from 'react-router-dom';
import { Camera, Home, Users } from 'lucide-react';
import type { ViewType } from './types';

interface ProdajalecBottomNavProps {
  view: ViewType | 'scan' | 'home';
  onViewChange: (view: ViewType | 'scan' | 'home') => void;
}

export function ProdajalecBottomNav({ view, onViewChange }: ProdajalecBottomNavProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
      <div className="max-w-4xl mx-auto flex">
        <button
          onClick={() => onViewChange('home')}
          className={`flex-1 py-3 flex flex-col items-center ${view === 'home' ? 'text-blue-600' : 'text-gray-600'}`}
          aria-label="Domov"
        >
          <Home size={22} />
          <span className="text-xs mt-1">Domov</span>
        </button>
        <button
          onClick={() => onViewChange('scan')}
          className={`flex-1 py-3 flex flex-col items-center ${view === 'scan' ? 'text-blue-600' : 'text-gray-600'}`}
          aria-label="Skeniraj"
        >
          <Camera size={22} />
          <span className="text-xs mt-1">Skeniraj</span>
        </button>
        <button
          onClick={() => navigate('/contacts')}
          className="flex-1 py-3 flex flex-col items-center text-gray-600"
          aria-label="Stranke"
        >
          <Users size={22} />
          <span className="text-xs mt-1">Stranke</span>
        </button>
      </div>
    </div>
  );
}

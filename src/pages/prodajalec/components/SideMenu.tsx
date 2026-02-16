/**
 * @file SideMenu.tsx
 * @description Stranski navigacijski meni za ProdajalecDashboard
 */

import { X, Home, Camera, MapPin, History, TrendingUp, Users, Package, ArrowRightLeft, Key, LogOut, CheckSquare, Car, Settings } from 'lucide-react';
import type { ViewType } from './types';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onViewChange: (view: ViewType) => void;
  onNavigate: (path: string) => void;
  availableRoles: string[];
  onSwitchRole: (role: string) => void;
  onChangePassword: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  className?: string;
}

function MenuItem({ icon, label, isActive, onClick, className = '' }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded ${
        isActive ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
      } ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">{title}</div>
      <div className="space-y-1 mb-4">{children}</div>
    </>
  );
}

export function SideMenu({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  onNavigate,
  availableRoles,
  onSwitchRole,
  onChangePassword,
  onSettings,
  onSignOut,
}: SideMenuProps) {
  if (!isOpen) return null;

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    onClose();
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const canSwitchToInventar = availableRoles.length > 1 &&
    (availableRoles.includes('inventar') || availableRoles.includes('admin'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[1001]" onClick={onClose}>
      <div
        className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-[1002]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">Meni</h2>
          <button onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          {/* Glavne akcije */}
          <MenuSection title="Glavno">
            <MenuItem
              icon={<Home size={20} />}
              label="Domov"
              isActive={currentView === 'home'}
              onClick={() => handleViewChange('home')}
            />
            <MenuItem
              icon={<Camera size={20} />}
              label="Skeniraj QR"
              isActive={currentView === 'scan'}
              onClick={() => handleViewChange('scan')}
            />
          </MenuSection>

          {/* Pregledi */}
          <MenuSection title="Pregled">
            <MenuItem
              icon={<MapPin size={20} />}
              label="Zemljevid"
              isActive={currentView === 'map'}
              onClick={() => handleViewChange('map')}
            />
            <MenuItem
              icon={<Car size={20} />}
              label="Potni nalog"
              isActive={currentView === 'travel'}
              onClick={() => handleViewChange('travel')}
            />
            <MenuItem
              icon={<History size={20} />}
              label="Zgodovina"
              isActive={currentView === 'history'}
              onClick={() => handleViewChange('history')}
            />
            <MenuItem
              icon={<TrendingUp size={20} />}
              label="Statistika"
              isActive={currentView === 'statistics'}
              onClick={() => handleViewChange('statistics')}
            />
            <MenuItem
              icon={<CheckSquare size={20} />}
              label="Naloge"
              isActive={currentView === 'tasks'}
              onClick={() => handleViewChange('tasks')}
            />
          </MenuSection>

          {/* Upravljanje */}
          <MenuSection title="Upravljanje">
            <MenuItem
              icon={<Users size={20} />}
              label="Stranke"
              onClick={() => handleNavigate('/contacts')}
            />
            <MenuItem
              icon={<Package size={20} />}
              label="Naroči predpražnike"
              onClick={() => handleNavigate('/order-codes')}
            />
          </MenuSection>

          <hr className="my-4" />

          {/* Switch panel button */}
          {canSwitchToInventar && (
            <MenuItem
              icon={<ArrowRightLeft size={20} />}
              label="Preklopi v Inventar"
              onClick={() => {
                onClose();
                onSwitchRole(availableRoles.includes('admin') ? 'admin' : 'inventar');
              }}
              className="hover:bg-blue-50 text-blue-600 mb-2"
            />
          )}

          <MenuItem
            icon={<Settings size={20} />}
            label="Nastavitve"
            onClick={() => {
              onSettings();
              onClose();
            }}
            className="mb-2"
          />

          <MenuItem
            icon={<LogOut size={20} />}
            label="Odjava"
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="text-red-600"
          />
        </div>
      </div>
    </div>
  );
}

export default SideMenu;

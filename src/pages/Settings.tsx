/**
 * @file Settings.tsx
 * @description Glavna nastavitve stran z zavihki (mobile) / sidebar (desktop)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, PenLine, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileSection from './settings/ProfileSection';
import EmailTemplatesSection from './settings/EmailTemplatesSection';
import EmailSignatureSection from './settings/EmailSignatureSection';
import NotificationSettingsSection from './settings/NotificationSettingsSection';

type TabId = 'profile' | 'templates' | 'signature' | 'notifications';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profil', icon: <User size={18} /> },
  { id: 'templates', label: 'Email predloge', icon: <Mail size={18} /> },
  { id: 'signature', label: 'Podpis', icon: <PenLine size={18} /> },
  { id: 'notifications', label: 'Obvestila', icon: <Bell size={18} /> },
];

export default function Settings() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Nalaganje...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Nazaj"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">Nastavitve</h1>
          </div>

          {/* Mobile tabs - pill style */}
          <div className="flex gap-1 pb-3 overflow-x-auto lg:hidden">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className={`mx-auto p-4 ${activeTab === 'templates' || activeTab === 'notifications' ? '' : 'max-w-7xl'}`}>
        <div className="lg:flex lg:gap-4">
          {/* Desktop icon sidebar */}
          <nav className="hidden lg:block lg:w-14 lg:flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-1.5 sticky top-20 flex flex-col items-center gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                  title={tab.label}
                >
                  {tab.icon}
                </button>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              {activeTab === 'profile' && (
                <ProfileSection profile={profile} onProfileUpdate={refreshProfile} />
              )}
              {activeTab === 'templates' && (
                <EmailTemplatesSection userId={profile.id} />
              )}
              {activeTab === 'signature' && (
                <EmailSignatureSection userId={profile.id} />
              )}
              {activeTab === 'notifications' && (
                <NotificationSettingsSection userId={profile.id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

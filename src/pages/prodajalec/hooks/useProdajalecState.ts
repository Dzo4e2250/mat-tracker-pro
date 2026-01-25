/**
 * @file useProdajalecState.ts
 * @description Hook za upravljanje state v ProdajalecDashboard
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ViewType } from '../components/types';
import type { CycleWithRelations } from '@/hooks/useCycles';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface CompanyMatsData {
  companyId: string;
  companyName: string;
  companyAddress?: string;
  cycles: CycleWithRelations[];
}

export function useProdajalecState() {
  const [searchParams] = useSearchParams();

  // View state
  const [view, setView] = useState<ViewType | 'scan' | 'home'>(() => {
    const urlView = searchParams.get('view');
    return urlView === 'scan' ? 'scan' : 'home';
  });

  // Scan state
  const [scanInput, setScanInput] = useState('');

  // Cycle state
  const [selectedCycle, setSelectedCycle] = useState<CycleWithRelations | null>(null);
  const [clickedMapLocation, setClickedMapLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Modal state
  const [showMatSelectModal, setShowMatSelectModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Filter state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Dismissed alerts
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dismissedAlerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Company select modal
  const [showCompanySelectModal, setShowCompanySelectModal] = useState(false);
  const [selectedCompanyForTest, setSelectedCompanyForTest] = useState<CompanyWithContacts | null>(null);

  // Company mats modal
  const [showCompanyMatsModal, setShowCompanyMatsModal] = useState(false);
  const [selectedCompanyForMats, setSelectedCompanyForMats] = useState<CompanyMatsData | null>(null);

  // Effects
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (dismissedAlerts.size > 0) {
      localStorage.setItem('dismissedAlerts', JSON.stringify([...dismissedAlerts]));
    }
  }, [dismissedAlerts]);

  // Helper functions
  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      newSet.has(companyId) ? newSet.delete(companyId) : newSet.add(companyId);
      return newSet;
    });
  };

  const dismissAlert = (cycleId: string) => {
    setDismissedAlerts(prev => new Set([...prev, cycleId]));
  };

  const openCompanyMats = (data: CompanyMatsData) => {
    setSelectedCompanyForMats(data);
    setShowCompanyMatsModal(true);
  };

  const closeCompanyMats = () => {
    setShowCompanyMatsModal(false);
    setSelectedCompanyForMats(null);
  };

  const clearFormData = () => setFormData({});

  return {
    // View
    view,
    setView,

    // Scan
    scanInput,
    setScanInput,

    // Cycle
    selectedCycle,
    setSelectedCycle,
    clickedMapLocation,
    setClickedMapLocation,

    // Modal
    showMatSelectModal,
    setShowMatSelectModal,
    showModal,
    setShowModal,
    modalType,
    setModalType,
    formData,
    setFormData,
    taxLookupLoading,
    setTaxLookupLoading,

    // Menu
    menuOpen,
    setMenuOpen,
    showPasswordModal,
    setShowPasswordModal,

    // Filter
    currentTime,
    statusFilter,
    setStatusFilter,
    expandedCompanies,
    toggleCompany,
    dismissedAlerts,
    dismissAlert,

    // Company select
    showCompanySelectModal,
    setShowCompanySelectModal,
    selectedCompanyForTest,
    setSelectedCompanyForTest,

    // Company mats
    showCompanyMatsModal,
    selectedCompanyForMats,
    openCompanyMats,
    closeCompanyMats,

    // Helpers
    clearFormData,
  };
}

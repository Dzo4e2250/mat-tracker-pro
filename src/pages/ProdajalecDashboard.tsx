import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Home, Menu, X, History, TrendingUp, Users, LogOut, Loader2, Package, Plus, Trash2, MapPin, Pencil, Calendar, ArrowRightLeft, Key, Navigation, FileText } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { Html5Qrcode } from 'html5-qrcode';
import { useMapLocations } from '@/hooks/useMapLocations';
import { useCameraScanner } from './prodajalec/hooks';

import { useMatTypes } from '@/hooks/useMatTypes';
import { useQRCodes, useAvailableQRCodes } from '@/hooks/useQRCodes';
import { useCycles, useCycleHistory, useCreateCycle, useUpdateCycleStatus, usePutOnTest, useSignContract, useExtendTest, useUpdateTestStartDate, useUpdateCycleLocation, useMarkContractSigned, useBatchSignContracts, useBatchPickupSelf, useBatchExtendTest, CycleWithRelations } from '@/hooks/useCycles';
import { useCreateCompanyWithContact, useCreateContact, useCompanyHistory } from '@/hooks/useCompanies';
import { useCompanyContacts, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import CompanySelectModal from '@/components/CompanySelectModal';
import CompanyMatsModal from '@/components/CompanyMatsModal';
import { getCityByPostalCode } from '@/utils/postalCodes';
import { lookupCompanyByTaxNumber, isValidTaxNumberFormat } from '@/utils/companyLookup';

// Ekstrahirane komponente
import { HomeView, ScanView, MapView, HistoryView, StatisticsView, TrackingView, TravelLogView, MatDetailsModal, PutOnTestModal, SelectAvailableMatModal, MapLocationSelectModal } from './prodajalec/components';
import { STATUSES, type StatusKey } from './prodajalec/utils/constants';
// Lokalne getTimeRemaining/formatCountdown funkcije (definirane spodaj) uporabljajo state currentTime

export default function ProdajalecDashboard() {
  const { user, profile, signOut, availableRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Data hooks
  const { data: matTypes, isLoading: loadingMatTypes } = useMatTypes();
  const { data: qrCodes, isLoading: loadingQRCodes } = useQRCodes(user?.id);
  const { data: availableQRCodes } = useAvailableQRCodes(user?.id || '');
  const { data: cycles, isLoading: loadingCycles } = useCycles(user?.id);
  const { data: cycleHistory } = useCycleHistory(user?.id);
  const { data: companies } = useCompanyContacts(user?.id);

  // Company select modal state
  const [showCompanySelectModal, setShowCompanySelectModal] = useState(false);
  const [selectedCompanyForTest, setSelectedCompanyForTest] = useState<CompanyWithContacts | null>(null);

  // Map data - filtered by current user
  const { data: mapLocations, isLoading: loadingMap } = useMapLocations({
    salespersonId: user?.id,
  });

  // Mutations
  const createCycle = useCreateCycle();
  const updateStatus = useUpdateCycleStatus();
  const putOnTest = usePutOnTest();
  const signContract = useSignContract();
  const extendTest = useExtendTest();
  const updateTestStartDate = useUpdateTestStartDate();
  const updateCycleLocation = useUpdateCycleLocation();
  const markContractSigned = useMarkContractSigned();
  const batchSignContracts = useBatchSignContracts();
  const batchPickupSelf = useBatchPickupSelf();
  const batchExtendTest = useBatchExtendTest();
  const createCompanyWithContact = useCreateCompanyWithContact();
  const createContact = useCreateContact();

  const [view, setView] = useState(() => {
    const urlView = searchParams.get('view');
    return urlView === 'scan' ? 'scan' : 'home';
  });
  const [scanInput, setScanInput] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<CycleWithRelations | null>(null);
  const [mapEditMode, setMapEditMode] = useState(false);
  const [clickedMapLocation, setClickedMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMatSelectModal, setShowMatSelectModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dismissedAlerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Company Mats Modal state
  const [showCompanyMatsModal, setShowCompanyMatsModal] = useState(false);
  const [selectedCompanyForMats, setSelectedCompanyForMats] = useState<{
    companyId: string;
    companyName: string;
    companyAddress?: string;
    cycles: CycleWithRelations[];
  } | null>(null);

  // Fetch company history when a company is selected (for showing previous notes)
  const { data: companyHistoryData } = useCompanyHistory(formData.companyId);

  // Camera scanner hook - handleScan is defined below
  const handleScanCallback = useRef<(code: string) => void>(() => {});
  const {
    cameraActive,
    cameraLoading,
    cameraError,
    zoomSupported,
    zoomLevel,
    maxZoom,
    startCamera,
    stopCamera,
    applyZoom
  } = useCameraScanner({ onScan: (code) => handleScanCallback.current(code) });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Stop camera when leaving scan view
  useEffect(() => {
    if (view !== 'scan') {
      stopCamera();
    }
  }, [view, stopCamera]);

  // Persist dismissed alerts to localStorage
  useEffect(() => {
    if (dismissedAlerts.size > 0) {
      localStorage.setItem('dismissedAlerts', JSON.stringify([...dismissedAlerts]));
    }
  }, [dismissedAlerts]);

  const showToast = (message: string, variant: 'default' | 'destructive' = 'default') => {
    toast({
      description: message,
      variant,
    });
  };

  // Get available QR codes (not in active cycles)
  const getAvailableQRCodes = () => {
    if (!qrCodes || !cycles) return [];
    const activeQRIds = cycles.map(c => c.qr_code_id);
    return qrCodes.filter(qr => !activeQRIds.includes(qr.id) && qr.status === 'available');
  };

  const handleScan = (qrCode: string) => {
    // Find QR code in database
    const qr = qrCodes?.find(q => q.code === qrCode);

    if (!qr) {
      showToast('QR koda ni najdena', 'destructive');
      setScanInput('');
      return;
    }

    // Check if QR code is in active cycle
    const existingCycle = cycles?.find(c => c.qr_code_id === qr.id);

    if (existingCycle) {
      setSelectedCycle(existingCycle);
      setModalType('matDetails');
      setShowModal(true);
    } else if (qr.status === 'available') {
      setFormData({ qrId: qr.id, qrCode: qr.code });
      setModalType('selectType');
      setShowModal(true);
    } else {
      showToast('QR koda ni na voljo', 'destructive');
    }

    setScanInput('');
  };

  // Connect handleScan to camera hook
  useEffect(() => {
    handleScanCallback.current = handleScan;
  });

  const handleAddMat = async (qrId: string, matTypeId: string) => {
    if (!user?.id) return;

    try {
      await createCycle.mutateAsync({
        qr_code_id: qrId,
        salesperson_id: user.id,
        mat_type_id: matTypeId,
        status: 'clean',
      });
      showToast('✅ Predpražnik dodan');
      setShowModal(false);
      setFormData({});
    } catch (error) {
      showToast('Napaka pri dodajanju', 'destructive');
    }
  };

  // Helper function to get current GPS position
  const getCurrentPosition = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  // Lookup company by tax number using EU VIES API
  const handleTaxLookup = async () => {
    const taxNumber = formData.taxNumber;
    if (!taxNumber || !isValidTaxNumberFormat(taxNumber)) {
      toast({ description: 'Vnesite veljavno davčno številko (8 števk)', variant: 'destructive' });
      return;
    }

    setTaxLookupLoading(true);
    try {
      const companyData = await lookupCompanyByTaxNumber(taxNumber);

      if (!companyData) {
        toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
        return;
      }

      if (!companyData.isValid) {
        toast({ description: 'Davčna številka ni veljavna ali podjetje ni DDV zavezanec', variant: 'destructive' });
        return;
      }

      // Auto-fill form fields
      setFormData((prev: any) => ({
        ...prev,
        clientName: companyData.name || prev.clientName,
        addressStreet: companyData.street || prev.addressStreet,
        addressCity: companyData.city || prev.addressCity,
        addressPostal: companyData.postalCode || prev.addressPostal,
      }));

      toast({ description: `Najdeno: ${companyData.name}` });
    } catch (error) {
      toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
    } finally {
      setTaxLookupLoading(false);
    }
  };

  const handlePutOnTest = async () => {
    if (!selectedCycle || !user?.id) return;

    try {
      // Get GPS coordinates
      const location = await getCurrentPosition();

      // Create company if new
      let companyId = formData.companyId;
      let companyName = formData.clientName;
      let contactId: string | undefined;

      if (!companyId && formData.clientName) {
        // New company - create with contact
        const newCompany = await createCompanyWithContact.mutateAsync({
          company: {
            name: formData.clientName,
            display_name: formData.displayName || null,
            tax_number: formData.taxNumber || null,
            address_street: formData.addressStreet || null,
            address_postal: formData.addressPostal || null,
            address_city: formData.addressCity || null,
            created_by: user.id,
          },
          contact: formData.contactPerson ? {
            first_name: formData.contactPerson.split(' ')[0] || formData.contactPerson,
            last_name: formData.contactPerson.split(' ').slice(1).join(' ') || '',
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.contactRole || null,
            is_decision_maker: formData.isDecisionMaker || false,
            created_by: user.id,
          } : undefined,
        });
        companyId = newCompany.id;
      } else if (companyId) {
        // Existing company
        const selectedCompany = companies?.find(c => c.id === companyId);
        companyName = selectedCompany?.display_name || selectedCompany?.name || '';

        // Check if using existing contact or creating new one
        if (formData.useExistingContact && formData.contactId && formData.contactId !== 'new') {
          // Use existing contact
          contactId = formData.contactId;
        } else if (formData.contactId === 'new' && formData.contactPerson) {
          // Create new contact for existing company
          const newContact = await createContact.mutateAsync({
            company_id: companyId,
            first_name: formData.contactPerson.split(' ')[0] || formData.contactPerson,
            last_name: formData.contactPerson.split(' ').slice(1).join(' ') || '',
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.contactRole || null,
            is_decision_maker: formData.isDecisionMaker || false,
            created_by: user.id,
          });
          contactId = newContact.id;
        }
      }

      await putOnTest.mutateAsync({
        cycleId: selectedCycle.id,
        companyId,
        contactId,
        userId: user.id,
        notes: formData.comment,
        locationLat: location?.lat,
        locationLng: location?.lng,
      });

      showToast('✅ Dan na test - ' + companyName);

      // Save company info and location for "add another" option
      setFormData({
        ...formData,
        lastCompanyId: companyId,
        lastCompanyName: companyName,
        lastContactId: contactId,
        lastLocationLat: location?.lat,
        lastLocationLng: location?.lng,
      });
      setModalType('putOnTestSuccess');
    } catch (error) {
      showToast('Napaka pri shranjevanju', 'destructive');
    }
  };

  const handleMarkAsDirty = async () => {
    if (!selectedCycle || !user?.id) return;

    try {
      await updateStatus.mutateAsync({
        cycleId: selectedCycle.id,
        newStatus: 'dirty',
        userId: user.id,
      });
      showToast('✅ Označen kot umazan');
      setShowModal(false);
      setSelectedCycle(null);
    } catch (error) {
      showToast('Napaka pri posodabljanju', 'destructive');
    }
  };

  const handleRequestDriverPickup = async () => {
    if (!selectedCycle || !user?.id) return;

    try {
      await updateStatus.mutateAsync({
        cycleId: selectedCycle.id,
        newStatus: 'waiting_driver',
        userId: user.id,
      });
      showToast('✅ Naročeno za šoferja');
      setShowModal(false);
      setSelectedCycle(null);
    } catch (error) {
      showToast('Napaka pri posodabljanju', 'destructive');
    }
  };

  const handleSignContract = async () => {
    if (!selectedCycle || !user?.id || !formData.frequency) return;

    try {
      await signContract.mutateAsync({
        cycleId: selectedCycle.id,
        frequency: formData.frequency,
        userId: user.id,
      });
      showToast('✅ Ponudba poslana');
      setShowModal(false);
      setSelectedCycle(null);
      setFormData({});
    } catch (error) {
      showToast('Napaka pri shranjevanju', 'destructive');
    }
  };

  const handleExtendTest = async () => {
    if (!selectedCycle || !user?.id) return;

    try {
      await extendTest.mutateAsync({
        cycleId: selectedCycle.id,
        userId: user.id,
      });
      showToast('✅ Test podaljšan za 7 dni');
      setShowModal(false);
      setSelectedCycle(null);
    } catch (error) {
      showToast('Napaka pri podaljševanju', 'destructive');
    }
  };

  const getTimeRemaining = (testStartDate: string | null) => {
    if (!testStartDate) return null;

    const start = new Date(testStartDate);
    const endTime = start.getTime() + (7 * 24 * 60 * 60 * 1000);
    const now = currentTime.getTime();
    const diffTime = endTime - now;

    if (diffTime < 0) {
      const absDiff = Math.abs(diffTime);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return { expired: true, days, hours, minutes: 0, totalHours: -(days * 24 + hours) };
    }

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    return { expired: false, days, hours, minutes, totalHours: days * 24 + hours };
  };

  const formatCountdown = (timeRemaining: ReturnType<typeof getTimeRemaining>) => {
    if (!timeRemaining) return null;

    if (timeRemaining.expired) {
      return {
        text: 'Poteklo pred ' + timeRemaining.days + 'd ' + timeRemaining.hours + 'h',
        color: 'red'
      };
    }

    const d = timeRemaining.days;
    const h = timeRemaining.hours;
    const m = timeRemaining.minutes;

    if (d === 0 && h === 0) {
      return { text: '⏰ ' + m + ' minut!', color: 'red' };
    }

    if (d === 0) {
      return { text: '⏰ ' + h + 'h ' + m + 'min', color: 'red' };
    }

    if (d <= 1) {
      return { text: '⏰ ' + d + 'd ' + h + 'h ' + m + 'min', color: 'orange' };
    }

    if (d <= 3) {
      return { text: '⏰ ' + d + 'd ' + h + 'h', color: 'orange' };
    }

    return { text: '⏰ ' + d + 'd ' + h + 'h', color: 'green' };
  };

  const getMyStatistics = () => {
    const myCycles = cycleHistory || [];

    const totalTests = myCycles.filter(c => c.test_start_date).length;
    const successful = myCycles.filter(c => c.contract_signed).length;
    const failed = myCycles.filter(c => c.test_end_date && !c.contract_signed && c.status === 'dirty').length;
    const inProgress = myCycles.filter(c => c.status === 'on_test').length;

    const successRate = totalTests > 0 ? ((successful / totalTests) * 100).toFixed(1) : '0';

    return { totalTests, successful, failed, inProgress, successRate };
  };

  const isLoading = loadingMatTypes || loadingQRCodes || loadingCycles;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Nalaganje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-blue-600 text-white p-4 shadow">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 hover:bg-blue-700 rounded">
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Lindström</h1>
              <div className="text-sm">{profile?.first_name} {profile?.last_name}</div>
            </div>
          </div>
          <button
            onClick={() => setView('tracking')}
            className={`p-2 rounded flex items-center gap-1 ${view === 'tracking' ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
            title="Moja pot"
          >
            <Navigation size={20} />
            <span className="text-sm hidden sm:inline">Pot</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1001]" onClick={() => setMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-[1002]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">Meni</h2>
              <button onClick={() => setMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              {/* Glavne akcije */}
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">Glavno</div>
              <div className="space-y-1 mb-4">
                <button
                  onClick={() => { setView('home'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded ${view === 'home' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Home size={20} />
                  <span>Domov</span>
                </button>

                <button
                  onClick={() => { setView('scan'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded ${view === 'scan' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Camera size={20} />
                  <span>Skeniraj QR</span>
                </button>
              </div>

              {/* Pregledi */}
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">Pregled</div>
              <div className="space-y-1 mb-4">
                <button
                  onClick={() => { setView('map'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded ${view === 'map' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <MapPin size={20} />
                  <span>Zemljevid</span>
                </button>

                <button
                  onClick={() => { setView('tracking'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded ${view === 'tracking' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Navigation size={20} />
                  <span>Moja pot</span>
                </button>

                <button
                  onClick={() => { setView('history'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded ${view === 'history' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <History size={20} />
                  <span>Zgodovina</span>
                </button>

                <button
                  onClick={() => { setView('statistics'); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded ${view === 'statistics' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <TrendingUp size={20} />
                  <span>Statistika</span>
                </button>
              </div>

              {/* Upravljanje */}
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">Upravljanje</div>
              <div className="space-y-1 mb-4">
                <button
                  onClick={() => { navigate('/contacts'); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-gray-100"
                >
                  <Users size={20} />
                  <span>Stranke</span>
                </button>

                <button
                  onClick={() => { navigate('/order-codes'); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-gray-100"
                >
                  <Package size={20} />
                  <span>Naroči predpražnike</span>
                </button>
              </div>

              <hr className="my-4" />

              {/* Switch panel button - only show if user has multiple roles */}
              {availableRoles.length > 1 && (availableRoles.includes('inventar') || availableRoles.includes('admin')) && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    switchRole(availableRoles.includes('admin') ? 'admin' : 'inventar');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-blue-50 text-blue-600 mb-2"
                >
                  <ArrowRightLeft size={20} />
                  <span>Preklopi v Inventar</span>
                </button>
              )}

              <button
                onClick={() => { setShowPasswordModal(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded hover:bg-gray-100 mb-2"
              >
                <Key size={20} />
                <span>Spremeni geslo</span>
              </button>

              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded hover:bg-gray-100 text-red-600"
              >
                <LogOut size={20} />
                <span>Odjava</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        {view === 'home' && (
          <div>
            {/* Opozorila za teste ki se iztečejo - sortirano od najstarejše položitve */}
            {cycles?.filter(c => c.status === 'on_test')
              .sort((a, b) => {
                const aDate = a.test_start_date ? new Date(a.test_start_date) : null;
                const bDate = b.test_start_date ? new Date(b.test_start_date) : null;
                const aTime = aDate?.getTime() ?? 0;
                const bTime = bDate?.getTime() ?? 0;
                return aTime - bTime;
              })
              .map(cycle => {
              const timeRemaining = getTimeRemaining(cycle.test_start_date);
              if (!timeRemaining || timeRemaining.expired || timeRemaining.days > 3) return null;
              if (dismissedAlerts.has(cycle.id)) return null;

              // Utripaj rdeče ko je manj kot 1 dan
              const isUrgent = timeRemaining.days === 0;

              return (
                <div key={cycle.id} className={`border-2 border-red-400 rounded-lg p-3 mb-4 ${isUrgent ? 'animate-pulse-red' : 'bg-red-50'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</span>
                      <span className="text-sm text-gray-500 ml-2 font-mono">{cycle.qr_code?.code}</span>
                      <span className="text-sm text-gray-600 ml-2">{cycle.company?.display_name || cycle.company?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600">
                        {formatCountdown(timeRemaining)?.text}
                      </span>
                      <button
                        onClick={() => setDismissedAlerts(prev => new Set([...prev, cycle.id]))}
                        className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h2 className="text-lg font-bold mb-4">Moji predpražniki</h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-2xl font-bold">{cycles?.length || 0}</div>
                  <div className="text-sm">💼 Skupaj</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'clean').length || 0}</div>
                  <div className="text-sm">💚 Čisti</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'on_test').length || 0}</div>
                  <div className="text-sm">🔵 Na testu</div>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'dirty').length || 0}</div>
                  <div className="text-sm">🟠 Umazani</div>
                </div>
                <div className="bg-purple-50 p-3 rounded col-span-2">
                  <div className="text-2xl font-bold">{cycles?.filter(c => c.status === 'waiting_driver').length || 0}</div>
                  <div className="text-sm">📋 Čaka šoferja</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              {/* Filter tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'Vsi', count: cycles?.length || 0 },
                  { key: 'clean', label: '💚 Čisti', count: cycles?.filter(c => c.status === 'clean').length || 0 },
                  { key: 'on_test', label: '🔵 Na testu', count: cycles?.filter(c => c.status === 'on_test').length || 0 },
                  { key: 'dirty', label: '🟠 Umazani', count: cycles?.filter(c => c.status === 'dirty').length || 0 },
                  { key: 'waiting_driver', label: '📋 Šofer', count: cycles?.filter(c => c.status === 'waiting_driver').length || 0 },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* List */}
              {!cycles || cycles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Ni predpražnikov</p>
              ) : (() => {
                // Filter cycles
                const filteredCycles = statusFilter === 'all'
                  ? cycles
                  : cycles.filter(c => c.status === statusFilter);

                if (filteredCycles.length === 0) {
                  return <p className="text-gray-500 text-center py-4">Ni predpražnikov s tem statusom</p>;
                }

                // Group on_test cycles by company
                const onTestByCompany = new Map<string, CycleWithRelations[]>();
                const otherCycles: CycleWithRelations[] = [];

                filteredCycles.forEach(cycle => {
                  if (cycle.status === 'on_test' && cycle.company_id) {
                    const key = cycle.company_id;
                    if (!onTestByCompany.has(key)) {
                      onTestByCompany.set(key, []);
                    }
                    onTestByCompany.get(key)!.push(cycle);
                  } else {
                    otherCycles.push(cycle);
                  }
                });

                const toggleCompany = (companyId: string) => {
                  setExpandedCompanies(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(companyId)) {
                      newSet.delete(companyId);
                    } else {
                      newSet.add(companyId);
                    }
                    return newSet;
                  });
                };

                // Sort companies by urgency (most urgent first)
                const sortedCompanies = Array.from(onTestByCompany.entries()).sort((a, b) => {
                  const aUrgent = a[1].reduce((most, curr) => {
                    const mostTime = getTimeRemaining(most.test_start_date);
                    const currTime = getTimeRemaining(curr.test_start_date);
                    if (!mostTime) return curr;
                    if (!currTime) return most;
                    return currTime.totalHours < mostTime.totalHours ? curr : most;
                  }, a[1][0]);
                  const bUrgent = b[1].reduce((most, curr) => {
                    const mostTime = getTimeRemaining(most.test_start_date);
                    const currTime = getTimeRemaining(curr.test_start_date);
                    if (!mostTime) return curr;
                    if (!currTime) return most;
                    return currTime.totalHours < mostTime.totalHours ? curr : most;
                  }, b[1][0]);
                  const aTime = getTimeRemaining(aUrgent.test_start_date);
                  const bTime = getTimeRemaining(bUrgent.test_start_date);
                  return (aTime?.totalHours || 0) - (bTime?.totalHours || 0);
                });

                return (
                  <div className="space-y-2">
                    {/* Grouped on_test cycles by company - sorted by urgency */}
                    {sortedCompanies.map(([companyId, companyCycles]) => {
                      const isExpanded = expandedCompanies.has(companyId);
                      const companyName = companyCycles[0]?.company?.display_name || companyCycles[0]?.company?.name || 'Neznano podjetje';

                      // Find the most urgent countdown
                      const urgentCycle = companyCycles.reduce((most, curr) => {
                        const mostTime = getTimeRemaining(most.test_start_date);
                        const currTime = getTimeRemaining(curr.test_start_date);
                        if (!mostTime) return curr;
                        if (!currTime) return most;
                        return currTime.totalHours < mostTime.totalHours ? curr : most;
                      }, companyCycles[0]);
                      const urgentCountdown = formatCountdown(getTimeRemaining(urgentCycle.test_start_date));
                      const urgentTime = getTimeRemaining(urgentCycle.test_start_date);
                      const isUrgent = urgentTime && (urgentTime.expired || urgentTime.days === 0);

                      const companyAddress = companyCycles[0]?.company?.address_city || '';

                      return (
                        <div key={companyId} className={`border rounded-lg overflow-hidden ${isUrgent ? 'border-red-400 border-2 animate-pulse-red' : ''}`}>
                          <button
                            onClick={() => toggleCompany(companyId)}
                            className={`w-full p-3 flex items-center justify-between ${isUrgent ? '' : 'bg-blue-50'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏢</span>
                              <div className="text-left">
                                <div className="font-medium">{companyName}</div>
                                <div className="text-xs text-gray-500">{companyCycles.length} predpražnik{companyCycles.length > 1 ? 'ov' : ''}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {urgentCountdown && (
                                <span className="text-xs font-bold" style={{
                                  color: urgentCountdown.color === 'red' ? '#DC2626' :
                                         urgentCountdown.color === 'orange' ? '#EA580C' : '#16A34A'
                                }}>
                                  {urgentCountdown.text}
                                </span>
                              )}
                              <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="divide-y">
                              {companyCycles.map(cycle => {
                                const countdown = formatCountdown(getTimeRemaining(cycle.test_start_date));
                                return (
                                  <div
                                    key={cycle.id}
                                    className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                                    onClick={() => {
                                      setSelectedCycle(cycle);
                                      setModalType('matDetails');
                                      setShowModal(true);
                                    }}
                                  >
                                    <div>
                                      <div className="font-medium">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                                      <div className="text-xs text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                                    </div>
                                    {countdown && (
                                      <span className="text-sm font-bold" style={{
                                        color: countdown.color === 'red' ? '#DC2626' :
                                               countdown.color === 'orange' ? '#EA580C' : '#16A34A'
                                      }}>
                                        {countdown.text}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              {/* Action button at the end of the list */}
                              <div className="p-3 bg-gray-50">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCompanyForMats({
                                      companyId,
                                      companyName,
                                      companyAddress,
                                      cycles: companyCycles,
                                    });
                                    setShowCompanyMatsModal(true);
                                  }}
                                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
                                >
                                  ⚡ Ukrep za vse ({companyCycles.length})
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Other cycles (clean, dirty, waiting_driver, or on_test without company) */}
                    {otherCycles.map(cycle => {
                      const timeRemaining = getTimeRemaining(cycle.test_start_date);
                      const countdown = formatCountdown(timeRemaining);
                      const status = STATUSES[cycle.status as keyof typeof STATUSES];

                      return (
                        <div
                          key={cycle.id}
                          className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setSelectedCycle(cycle);
                            setModalType('matDetails');
                            setShowModal(true);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                              <div className="text-xs text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                            </div>
                            <div
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: status.color + '20',
                                color: status.color
                              }}
                            >
                              {status.icon}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {view === 'history' && (
          <HistoryView cycleHistory={cycleHistory} />
        )}

        {view === 'statistics' && (
          <StatisticsView cycleHistory={cycleHistory} />
        )}

        {view === 'tracking' && (
          <TrackingView userId={user?.id} />
        )}

        {view === 'map' && (
          <MapView
            mapLocations={mapLocations}
            loadingMap={loadingMap}
            mapEditMode={mapEditMode}
            clickedMapLocation={clickedMapLocation}
            onMapClick={(lat, lng) => {
              setClickedMapLocation({ lat, lng });
              setShowMatSelectModal(true);
            }}
            onUpdateLocation={async (cycleId, lat, lng) => {
              await updateCycleLocation.mutateAsync({
                cycleId,
                locationLat: lat,
                locationLng: lng,
              });
              toast({
                title: 'Uspeh',
                description: 'Lokacija posodobljena',
              });
            }}
            isUpdatingLocation={updateCycleLocation.isPending}
          />
        )}

        {view === 'scan' && (
          <ScanView
            cameraActive={cameraActive}
            cameraLoading={cameraLoading}
            cameraError={cameraError}
            zoomSupported={zoomSupported}
            zoomLevel={zoomLevel}
            maxZoom={maxZoom}
            scanInput={scanInput}
            availableQRCodes={getAvailableQRCodes()}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onZoomChange={applyZoom}
            onScanInputChange={(value) => setScanInput(value)}
            onScan={handleScan}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-end p-2 border-b">
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-56px)]">
            {modalType === 'selectType' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Izberi tip ({formData.qrCode}):</h3>
                {matTypes?.filter(t => t.category !== 'design').map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleAddMat(formData.qrId, type.id)}
                    disabled={createCycle.isPending}
                    className="w-full p-3 border rounded mb-2 text-left hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="font-medium">{type.code || type.name}</div>
                    <div className="text-sm text-gray-600">{type.width_cm}x{type.height_cm} cm</div>
                  </button>
                ))}
                <button onClick={() => setShowModal(false)} className="w-full mt-4 py-2 border rounded">
                  Prekliči
                </button>
              </div>
            )}

            {modalType === 'matDetails' && selectedCycle && (
              <MatDetailsModal
                cycle={selectedCycle}
                onUpdateLocation={async (cycleId, lat, lng) => {
                  await updateCycleLocation.mutateAsync({ cycleId, locationLat: lat, locationLng: lng });
                }}
                onUpdateStartDate={async (cycleId, date) => {
                  await updateTestStartDate.mutateAsync({ cycleId, testStartDate: date });
                }}
                onExtendTest={handleExtendTest}
                onRequestDriverPickup={handleRequestDriverPickup}
                onMarkAsDirty={handleMarkAsDirty}
                onMarkContractSigned={async () => {
                  await markContractSigned.mutateAsync({ cycleId: selectedCycle.id });
                }}
                isUpdatingLocation={updateCycleLocation.isPending}
                isUpdatingStartDate={updateTestStartDate.isPending}
                isExtending={extendTest.isPending}
                isUpdatingStatus={updateStatus.isPending}
                isMarkingContract={markContractSigned.isPending}
                onGoToPutOnTest={() => setModalType('putOnTest')}
                onAddMatToCompany={() => {
                  setFormData({
                    ...formData,
                    lastCompanyId: selectedCycle.company_id,
                    lastCompanyName: selectedCycle.company?.display_name || selectedCycle.company?.name,
                    lastContactId: selectedCycle.contact_id,
                  });
                  setModalType('selectAvailableMat');
                }}
                onViewCompany={() => {
                  setShowModal(false);
                  navigate(`/contacts?company=${selectedCycle?.company_id}`);
                }}
                onScanAnother={() => {
                  setShowModal(false);
                  setSelectedCycle(null);
                  setView('scan');
                }}
                onClose={() => setShowModal(false)}
                showToast={showToast}
                onUpdateCycle={setSelectedCycle}
              />
            )}

            {modalType === 'putOnTest' && (
              <PutOnTestModal
                formData={formData}
                setFormData={setFormData}
                companies={companies}
                companyHistoryData={companyHistoryData}
                taxLookupLoading={taxLookupLoading}
                isPending={putOnTest.isPending}
                onTaxLookup={handleTaxLookup}
                onPutOnTest={handlePutOnTest}
                onOpenCompanySelect={() => setShowCompanySelectModal(true)}
                onClearCompany={() => {
                  setFormData({ ...formData, companyId: '', clientName: '', contactId: '', useExistingContact: false });
                  setSelectedCompanyForTest(null);
                }}
                onBack={() => setModalType('matDetails')}
              />
            )}

            {modalType === 'signContract' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Podpiši pogodbo</h3>
                <select
                  value={formData.frequency || ''}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full p-2 border rounded mb-4"
                >
                  <option value="">Izberi frekvenco...</option>
                  <option value="1_week">1x tedensko</option>
                  <option value="2_weeks">2x tedensko</option>
                  <option value="3_weeks">3x tedensko</option>
                  <option value="4_weeks">4x tedensko (mesečno)</option>
                </select>
                <button
                  onClick={handleSignContract}
                  disabled={!formData.frequency || signContract.isPending}
                  className="w-full bg-purple-500 text-white py-2 rounded disabled:bg-gray-300"
                >
                  {signContract.isPending ? 'Shranjevanje...' : 'Potrdi'}
                </button>
                <button
                  onClick={() => setModalType('matDetails')}
                  className="w-full mt-2 py-2 border rounded"
                >
                  Nazaj
                </button>
              </div>
            )}


            {modalType === 'putOnTestSuccess' && (
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2">Predpražnik na testu</h3>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <div className="text-sm text-gray-600">
                    <div className="font-bold text-lg text-black">{selectedCycle?.mat_type?.code || selectedCycle?.mat_type?.name}</div>
                    <div className="text-gray-500 font-mono mb-2">{selectedCycle?.qr_code?.code}</div>
                    <div className="flex items-center gap-2 mb-1">
                      <span>🏢</span>
                      <span>{formData.lastCompanyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⏱️</span>
                      <span>Test poteče čez 7 dni</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Show available mats to add to same location
                      setModalType('selectAvailableMat');
                    }}
                    className="w-full bg-blue-500 text-white py-2 rounded"
                  >
                    ➕ Dodaj še en predpražnik sem
                  </button>

                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedCycle(null);
                      setFormData({});
                      setView('home');
                    }}
                    className="w-full py-2 border rounded"
                  >
                    🏠 Nazaj na domov
                  </button>
                </div>
              </div>
            )}

            {/* Select Available Mat Modal */}
            {modalType === 'selectAvailableMat' && (
              <SelectAvailableMatModal
                formData={formData}
                setFormData={setFormData}
                cycles={cycles}
                userId={user?.id || ''}
                isPending={putOnTest.isPending}
                onAddMat={async (cycleId) => {
                  await putOnTest.mutateAsync({
                    cycleId,
                    companyId: formData.lastCompanyId,
                    contactId: formData.lastContactId,
                    userId: user?.id || '',
                    locationLat: formData.lastLocationLat,
                    locationLng: formData.lastLocationLng,
                  });
                }}
                showToast={showToast}
                onClose={() => {
                  setShowModal(false);
                  setSelectedCycle(null);
                  setFormData({});
                  setView('home');
                }}
              />
            )}
            </div>
          </div>
        </div>
      )}

      {/* Mat Select Modal for Map Edit Mode */}
      {clickedMapLocation && (
        <MapLocationSelectModal
          isOpen={showMatSelectModal}
          clickedLocation={clickedMapLocation}
          cycles={cycles}
          isPending={updateCycleLocation.isPending}
          onUpdateLocation={async (cycleId) => {
            try {
              const cycle = cycles?.find(c => c.id === cycleId);
              await updateCycleLocation.mutateAsync({
                cycleId,
                locationLat: clickedMapLocation.lat,
                locationLng: clickedMapLocation.lng,
              });
              toast({
                title: 'Uspeh',
                description: `Lokacija za ${cycle?.qr_code?.code} posodobljena`,
              });
              setShowMatSelectModal(false);
              setClickedMapLocation(null);
            } catch (error) {
              toast({
                title: 'Napaka',
                description: 'Napaka pri posodabljanju lokacije',
                variant: 'destructive',
              });
            }
          }}
          onClose={() => {
            setShowMatSelectModal(false);
            setClickedMapLocation(null);
          }}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setView('home')}
            className={`flex-1 py-3 flex flex-col items-center ${view === 'home' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Home size={22} />
            <span className="text-xs mt-1">Domov</span>
          </button>
          <button
            onClick={() => setView('scan')}
            className={`flex-1 py-3 flex flex-col items-center ${view === 'scan' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Camera size={22} />
            <span className="text-xs mt-1">Skeniraj</span>
          </button>
          <button
            onClick={() => navigate('/contacts')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Users size={22} />
            <span className="text-xs mt-1">Stranke</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Company Select Modal */}
      <CompanySelectModal
        companies={companies || []}
        isOpen={showCompanySelectModal}
        onClose={() => setShowCompanySelectModal(false)}
        onSelect={(company) => {
          if (company) {
            setFormData({
              ...formData,
              companyId: company.id,
              clientName: company.display_name || company.name || '',
              contactId: '',
              useExistingContact: false,
            });
            setSelectedCompanyForTest(company);
          } else {
            // null means "create new company"
            setFormData({
              ...formData,
              companyId: '',
              clientName: '',
              contactId: '',
              useExistingContact: false,
            });
            setSelectedCompanyForTest(null);
          }
          setShowCompanySelectModal(false);
        }}
      />

      {/* Company Mats Modal - for batch contract signing */}
      {selectedCompanyForMats && (
        <CompanyMatsModal
          isOpen={showCompanyMatsModal}
          onClose={() => {
            setShowCompanyMatsModal(false);
            setSelectedCompanyForMats(null);
          }}
          companyName={selectedCompanyForMats.companyName}
          companyAddress={selectedCompanyForMats.companyAddress}
          cycles={selectedCompanyForMats.cycles}
          onSignContracts={async (signedCycleIds, remainingAction, remainingCycleIds) => {
            try {
              await batchSignContracts.mutateAsync({
                signedCycleIds,
                remainingAction,
                remainingCycleIds,
                userId: user?.id || '',
              });
              toast({
                title: 'Uspeh',
                description: `Pogodba podpisana za ${signedCycleIds.length} predpražnik${signedCycleIds.length > 1 ? 'ov' : ''}`,
              });
            } catch (error) {
              toast({
                title: 'Napaka',
                description: 'Napaka pri shranjevanju',
                variant: 'destructive',
              });
              throw error;
            }
          }}
          onPickupAll={async (cycleIds) => {
            try {
              await batchPickupSelf.mutateAsync({
                cycleIds,
                userId: user?.id || '',
              });
              toast({
                title: 'Uspeh',
                description: `${cycleIds.length} predpražnik${cycleIds.length > 1 ? 'ov' : ''} označenih kot pobrano`,
              });
            } catch (error) {
              toast({
                title: 'Napaka',
                description: 'Napaka pri shranjevanju',
                variant: 'destructive',
              });
              throw error;
            }
          }}
          onExtendAll={async (cycleIds) => {
            try {
              await batchExtendTest.mutateAsync({
                cycleIds,
                userId: user?.id || '',
              });
              toast({
                title: 'Uspeh',
                description: `Test podaljšan za ${cycleIds.length} predpražnik${cycleIds.length > 1 ? 'ov' : ''} (+7 dni)`,
              });
            } catch (error) {
              toast({
                title: 'Napaka',
                description: 'Napaka pri shranjevanju',
                variant: 'destructive',
              });
              throw error;
            }
          }}
          isLoading={batchSignContracts.isPending || batchPickupSelf.isPending || batchExtendTest.isPending}
        />
      )}
    </div>
  );
}

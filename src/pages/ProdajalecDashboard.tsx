import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Home, Menu, X, History, TrendingUp, Users, LogOut, Loader2, Package, Plus, Trash2, MapPin, Pencil, Calendar, ZoomIn, ArrowRightLeft, Key } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { Html5Qrcode } from 'html5-qrcode';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapLocations, groupLocationsByProximity, getMarkerColor, getStatusLabel } from '@/hooks/useMapLocations';

import { useMatTypes } from '@/hooks/useMatTypes';
import { useQRCodes, useAvailableQRCodes } from '@/hooks/useQRCodes';
import { useCycles, useCycleHistory, useCreateCycle, useUpdateCycleStatus, usePutOnTest, useSignContract, useExtendTest, useUpdateTestStartDate, useUpdateCycleLocation, useMarkContractSigned, CycleWithRelations } from '@/hooks/useCycles';
import { useCreateCompanyWithContact, useCreateContact, useCompanyHistory } from '@/hooks/useCompanies';
import { useCompanyContacts, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import CompanySelectModal from '@/components/CompanySelectModal';
import { getCityByPostalCode } from '@/utils/postalCodes';
import { lookupCompanyByTaxNumber, isValidTaxNumberFormat } from '@/utils/companyLookup';

// Ekstrahirane komponente
import { HomeView, ScanView, MapView, HistoryView, StatisticsView } from './prodajalec/components';
import { STATUSES, type StatusKey } from './prodajalec/utils/constants';
import { getTimeRemaining, formatCountdown } from './prodajalec/utils/timeHelpers';

// Konstante za zemljevid
const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
const DEFAULT_ZOOM = 8;

// Create custom marker icons
const createCustomIcon = (color: string, isPulsing: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ${isPulsing ? 'animation: pulse 2s infinite;' : ''}
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to handle map clicks in edit mode
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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

  const mapGroups = useMemo(() => {
    if (!mapLocations) return [];
    return groupLocationsByProximity(mapLocations);
  }, [mapLocations]);

  // Mutations
  const createCycle = useCreateCycle();
  const updateStatus = useUpdateCycleStatus();
  const putOnTest = usePutOnTest();
  const signContract = useSignContract();
  const extendTest = useExtendTest();
  const updateTestStartDate = useUpdateTestStartDate();
  const updateCycleLocation = useUpdateCycleLocation();
  const markContractSigned = useMarkContractSigned();
  const createCompanyWithContact = useCreateCompanyWithContact();
  const createContact = useCreateContact();

  const [view, setView] = useState(() => {
    const urlView = searchParams.get('view');
    return urlView === 'scan' ? 'scan' : 'home';
  });
  const [scanInput, setScanInput] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<CycleWithRelations | null>(null);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [newLocationLat, setNewLocationLat] = useState('');
  const [newLocationLng, setNewLocationLng] = useState('');
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Fetch company history when a company is selected (for showing previous notes)
  const { data: companyHistoryData } = useCompanyHistory(formData.companyId);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup camera when view changes or component unmounts
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Stop camera when leaving scan view
  useEffect(() => {
    if (view !== 'scan' && html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      setCameraActive(false);
    }
  }, [view]);

  const startCamera = async () => {
    setCameraError(null);
    setCameraLoading(true);
    setCameraActive(true); // Show the div first

    // Check if we're on HTTPS or localhost
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setCameraError('Kamera deluje samo na HTTPS. Prosim uporabi https://matpro.ristov.xyz');
      setCameraLoading(false);
      setCameraActive(false);
      return;
    }

    // Wait for div to be rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // First try to get list of cameras
      const devices = await Html5Qrcode.getCameras();
      console.log('Available cameras:', devices);

      if (!devices || devices.length === 0) {
        setCameraError('Ni najdenih kamer na tej napravi');
        setCameraLoading(false);
        setCameraActive(false);
        return;
      }

      // Find back camera - usually contains "back", "rear", "environment" in label
      let cameraId = devices[0].id; // Default to first camera

      for (const device of devices) {
        const label = device.label.toLowerCase();
        if (label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('zadnja')) {
          cameraId = device.id;
          break;
        }
      }

      // On mobile, back camera is often the last one
      if (devices.length > 1) {
        cameraId = devices[devices.length - 1].id;
      }

      console.log('Using camera:', cameraId);

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            return { width: qrboxSize, height: qrboxSize };
          },
        },
        (decodedText) => {
          // Successfully scanned
          handleScan(decodedText);
          stopCamera();
        },
        () => {
          // QR code not detected - ignore
        }
      );

      // Check for zoom capability
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if (capabilities.zoomFeature && capabilities.zoomFeature().isSupported()) {
          const zoomFeature = capabilities.zoomFeature();
          setZoomSupported(true);
          setMaxZoom(zoomFeature.max());
          setZoomLevel(zoomFeature.value());
        } else {
          setZoomSupported(false);
        }
      } catch (e) {
        console.log('Zoom not supported:', e);
        setZoomSupported(false);
      }

      setCameraLoading(false);
    } catch (err: any) {
      console.error('Camera error:', err);

      let errorMessage = 'Ni mogoče dostopati do kamere';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Dovoli dostop do kamere v nastavitvah brskalnika';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'Kamera ni najdena na tej napravi';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Kamera je v uporabi v drugi aplikaciji';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Zahtevana kamera ni na voljo';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setCameraError(errorMessage);
      setCameraLoading(false);
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
    setCameraActive(false);
    setZoomLevel(1);
    setZoomSupported(false);
  };

  const applyZoom = async (newZoom: number) => {
    if (html5QrCodeRef.current && zoomSupported) {
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if (capabilities.zoomFeature && capabilities.zoomFeature().isSupported()) {
          await capabilities.zoomFeature().apply(newZoom);
          setZoomLevel(newZoom);
        }
      } catch (e) {
        console.error('Error applying zoom:', e);
      }
    }
  };

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
      return { expired: true, days, hours, minutes: 0 };
    }

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    return { expired: false, days, hours, minutes };
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
            onClick={() => signOut()}
            className="p-2 hover:bg-blue-700 rounded"
            title="Odjava"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
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
            {/* Opozorila za teste ki se iztečejo */}
            {cycles?.filter(c => c.status === 'on_test').map(cycle => {
              const timeRemaining = getTimeRemaining(cycle.test_start_date);
              if (!timeRemaining || timeRemaining.expired || timeRemaining.days > 3) return null;

              return (
                <div key={cycle.id} className="bg-red-50 border-2 border-red-400 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</span>
                      <span className="text-sm text-gray-500 ml-2 font-mono">{cycle.qr_code?.code}</span>
                      <span className="text-sm text-gray-600 ml-2">{cycle.company?.display_name || cycle.company?.name}</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatCountdown(timeRemaining)?.text}
                    </span>
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

                return (
                  <div className="space-y-2">
                    {/* Grouped on_test cycles by company */}
                    {Array.from(onTestByCompany.entries()).map(([companyId, companyCycles]) => {
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

                      return (
                        <div key={companyId} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleCompany(companyId)}
                            className="w-full p-3 bg-blue-50 flex items-center justify-between"
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

        {view === 'map' && (
          <div>
            <h2 className="text-xl font-bold mb-4">🗺️ Moji predpražniki na zemljevidu</h2>

            {/* Legend */}
            <div className="bg-white rounded-lg shadow p-3 mb-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                  <span>Na testu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                  <span>Pogodba</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                  <span>Čaka šoferja</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                  <span>Umazan</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Skupaj na zemljevidu: {mapLocations?.length || 0}
              </div>
              <button
                onClick={() => setMapEditMode(!mapEditMode)}
                className={`mt-3 w-full py-2 rounded text-sm font-medium ${
                  mapEditMode
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mapEditMode ? '🎯 Način urejanja AKTIVEN' : '✏️ Uredi lokacije'}
              </button>
              {mapEditMode && (
                <p className="text-xs text-orange-600 mt-1">
                  Klikni na zemljevid kjer je predpražnik
                </p>
              )}
            </div>

            {/* Map */}
            <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '60vh' }}>
              {loadingMap ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <style>{`
                    .custom-marker {
                      background: transparent !important;
                      border: none !important;
                    }
                    @keyframes pulse {
                      0% { transform: scale(1); opacity: 1; }
                      50% { transform: scale(1.5); opacity: 0.5; }
                      100% { transform: scale(1); opacity: 1; }
                    }
                  `}</style>
                  <MapContainer
                    center={SLOVENIA_CENTER}
                    zoom={DEFAULT_ZOOM}
                    className="h-full w-full"
                    style={{ height: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {/* Map click handler for edit mode */}
                    {mapEditMode && (
                      <MapClickHandler
                        onMapClick={(lat, lng) => {
                          setClickedMapLocation({ lat, lng });
                          setShowMatSelectModal(true);
                        }}
                      />
                    )}
                    {/* Show marker for clicked location */}
                    {mapEditMode && clickedMapLocation && (
                      <Marker
                        position={[clickedMapLocation.lat, clickedMapLocation.lng]}
                        icon={L.divIcon({
                          className: 'custom-marker',
                          html: '<div style="width: 20px; height: 20px; background: #F97316; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                          iconSize: [20, 20],
                          iconAnchor: [10, 10],
                        })}
                      />
                    )}
                    {mapLocations?.map((loc) => (
                      <Marker
                        key={loc.cycleId}
                        position={[loc.lat, loc.lng]}
                        icon={createCustomIcon(getMarkerColor(loc.status), loc.status === 'on_test')}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold">{loc.companyName}</div>
                            <div className="text-gray-500 text-xs">{loc.companyAddress}</div>
                            <div className="mt-2">
                              <span className="font-mono text-xs bg-gray-100 px-1 rounded">{loc.qrCode}</span>
                              <span className="ml-2">{loc.matTypeName}</span>
                            </div>
                            <div className="mt-1 text-xs" style={{ color: getMarkerColor(loc.status) }}>
                              {getStatusLabel(loc.status)}
                            </div>
                            {loc.contactName && (
                              <div className="mt-2 text-xs">
                                <div>{loc.contactName}</div>
                                {loc.contactPhone && (
                                  <a href={`tel:${loc.contactPhone}`} className="text-blue-600">
                                    {loc.contactPhone}
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="mt-2 pt-2 border-t">
                              <a
                                href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                              >
                                <MapPin size={12} />
                                <span>Odpri v Google Maps</span>
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </>
              )}
            </div>
          </div>
        )}

        {view === 'scan' && (
          <div className="bg-white rounded-lg shadow p-6">
            {/* QR Reader div - always rendered but hidden when inactive */}
            <div className={cameraActive ? 'block' : 'hidden'}>
              {cameraLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  <p className="mt-4 text-gray-600">Zaganjam kamero...</p>
                </div>
              )}
              <div
                id="qr-reader"
                className="w-full rounded-lg"
                style={{ minHeight: cameraLoading ? '0' : '300px' }}
              />

              {/* Zoom slider */}
              {zoomSupported && !cameraLoading && (
                <div className="mt-4 bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <ZoomIn size={20} className="text-gray-600" />
                    <input
                      type="range"
                      min="1"
                      max={maxZoom}
                      step="0.1"
                      value={zoomLevel}
                      onChange={(e) => applyZoom(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {zoomLevel.toFixed(1)}x
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={stopCamera}
                className="w-full mt-4 bg-red-500 text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <X size={20} />
                Zapri kamero
              </button>
            </div>

            {/* Camera inactive UI */}
            <div className={cameraActive ? 'hidden' : 'block'}>
              {/* Big Camera Icon Button */}
              <div className="flex flex-col items-center py-8">
                <button
                  onClick={startCamera}
                  className="w-32 h-32 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                >
                  <Camera size={64} className="text-white" />
                </button>
                <p className="mt-4 text-gray-600">Pritisni za skeniranje</p>
                {cameraError && (
                  <p className="mt-2 text-sm text-red-500 text-center px-4">{cameraError}</p>
                )}
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ali vnesi ročno</span>
                </div>
              </div>

              {/* Manual Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="GEO-001"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && scanInput && handleScan(scanInput)}
                  className="flex-1 p-3 border rounded text-center text-lg"
                />
                <button
                  onClick={() => scanInput && handleScan(scanInput)}
                  disabled={!scanInput}
                  className="px-6 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
                >
                  OK
                </button>
              </div>

              {/* Quick Access to Available Codes */}
              <div className="mt-6">
                <h3 className="font-bold mb-2 text-sm text-gray-600">Proste QR kode ({getAvailableQRCodes().length}):</h3>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {getAvailableQRCodes().map(qr => (
                    <button
                      key={qr.id}
                      onClick={() => handleScan(qr.code)}
                      className="px-3 py-1 bg-green-50 border border-green-200 rounded text-sm hover:bg-green-100 font-mono"
                    >
                      {qr.code}
                    </button>
                  ))}
                  {getAvailableQRCodes().length === 0 && (
                    <p className="text-gray-500 text-sm">Ni prostih QR kod</p>
                  )}
                </div>
              </div>
            </div>
          </div>
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
              <div>
                <h3 className="text-xl font-bold mb-1">{selectedCycle.mat_type?.code || selectedCycle.mat_type?.name}</h3>
                <div className="text-sm text-gray-500 mb-4 font-mono">
                  {selectedCycle.qr_code?.code}
                </div>

                {selectedCycle.company && (
                  <div className="mb-4 p-3 bg-blue-50 rounded space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Podjetje:</span>
                      <div className="font-bold">{selectedCycle.company.name}</div>
                    </div>

                    {selectedCycle.contact && (
                      <div>
                        <span className="text-xs text-gray-500">Kontaktna oseba:</span>
                        <div className="font-medium">
                          {selectedCycle.contact.first_name} {selectedCycle.contact.last_name}
                        </div>
                      </div>
                    )}

                    {selectedCycle.contact?.phone && (
                      <div>
                        <span className="text-xs text-gray-500">Telefon:</span>
                        <div className="font-medium">
                          <a href={'tel:' + selectedCycle.contact.phone} className="text-blue-600">
                            {selectedCycle.contact.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedCycle.contact?.email && (
                      <div>
                        <span className="text-xs text-gray-500">Email:</span>
                        <div className="font-medium">
                          <a href={'mailto:' + selectedCycle.contact.email} className="text-blue-600">
                            {selectedCycle.contact.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedCycle.notes && (
                      <div>
                        <span className="text-xs text-gray-500">Opombe:</span>
                        <div className="text-sm bg-white p-2 rounded mt-1">{selectedCycle.notes}</div>
                      </div>
                    )}

                    {/* Lokacija */}
                    <div className="pt-2 border-t">
                      <span className="text-xs text-gray-500">Lokacija:</span>
                      {editingLocation ? (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500">Lat</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={newLocationLat}
                                onChange={(e) => setNewLocationLat(e.target.value)}
                                placeholder="46.2361"
                                className="w-full border rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Lng</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={newLocationLng}
                                onChange={(e) => setNewLocationLng(e.target.value)}
                                placeholder="15.2677"
                                className="w-full border rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                if (newLocationLat && newLocationLng && selectedCycle) {
                                  try {
                                    await updateCycleLocation.mutateAsync({
                                      cycleId: selectedCycle.id,
                                      locationLat: parseFloat(newLocationLat),
                                      locationLng: parseFloat(newLocationLng),
                                    });
                                    toast({
                                      title: 'Uspeh',
                                      description: 'Lokacija posodobljena',
                                    });
                                    setEditingLocation(false);
                                  } catch (error) {
                                    toast({
                                      title: 'Napaka',
                                      description: 'Napaka pri posodabljanju lokacije',
                                      variant: 'destructive',
                                    });
                                  }
                                }
                              }}
                              disabled={updateCycleLocation.isPending}
                              className="flex-1 bg-blue-500 text-white py-1.5 rounded text-sm"
                            >
                              {updateCycleLocation.isPending ? 'Shranjujem...' : 'Shrani'}
                            </button>
                            <button
                              onClick={() => setEditingLocation(false)}
                              className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm"
                            >
                              Prekliči
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          {(selectedCycle as any).location_lat && (selectedCycle as any).location_lng ? (
                            <a
                              href={`https://www.google.com/maps?q=${(selectedCycle as any).location_lat},${(selectedCycle as any).location_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {(selectedCycle as any).location_lat.toFixed(4)}, {(selectedCycle as any).location_lng.toFixed(4)} 🗺️
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">Ni nastavljeno</span>
                          )}
                          <button
                            onClick={() => {
                              setNewLocationLat((selectedCycle as any).location_lat?.toString() || '');
                              setNewLocationLng((selectedCycle as any).location_lng?.toString() || '');
                              setEditingLocation(true);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Uredi lokacijo"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedCycle.test_start_date && (
                      <div className="pt-2 border-t">
                        <span className="text-xs text-gray-500">Preostali čas:</span>
                        <div className="text-xl font-bold mt-1" style={{
                          color: formatCountdown(getTimeRemaining(selectedCycle.test_start_date))?.color === 'red' ? '#DC2626' :
                                 formatCountdown(getTimeRemaining(selectedCycle.test_start_date))?.color === 'orange' ? '#EA580C' : '#16A34A'
                        }}>
                          {formatCountdown(getTimeRemaining(selectedCycle.test_start_date))?.text}
                        </div>

                        {editingStartDate ? (
                          <div className="mt-2 space-y-2">
                            <input
                              type="date"
                              value={newStartDate}
                              onChange={(e) => setNewStartDate(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full border rounded px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (newStartDate && selectedCycle) {
                                    try {
                                      await updateTestStartDate.mutateAsync({
                                        cycleId: selectedCycle.id,
                                        testStartDate: new Date(newStartDate).toISOString(),
                                      });
                                      toast({
                                        title: 'Uspeh',
                                        description: 'Datum začetka posodobljen',
                                      });
                                      setEditingStartDate(false);
                                      // Refresh cycle data
                                      const updated = { ...selectedCycle, test_start_date: new Date(newStartDate).toISOString() };
                                      setSelectedCycle(updated as CycleWithRelations);
                                    } catch (error) {
                                      toast({
                                        title: 'Napaka',
                                        description: 'Napaka pri posodabljanju datuma',
                                        variant: 'destructive',
                                      });
                                    }
                                  }
                                }}
                                disabled={updateTestStartDate.isPending}
                                className="flex-1 bg-blue-500 text-white py-1.5 rounded text-sm"
                              >
                                {updateTestStartDate.isPending ? 'Shranjujem...' : 'Shrani'}
                              </button>
                              <button
                                onClick={() => setEditingStartDate(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm"
                              >
                                Prekliči
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-gray-500">
                              Začetek: {new Date(selectedCycle.test_start_date).toLocaleDateString('sl-SI')}
                            </div>
                            <button
                              onClick={() => {
                                setNewStartDate(new Date(selectedCycle.test_start_date!).toISOString().split('T')[0]);
                                setEditingStartDate(true);
                              }}
                              className="text-blue-500 hover:text-blue-700"
                              title="Spremeni datum začetka"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {selectedCycle.status === 'clean' && (
                    <button
                      onClick={() => setModalType('putOnTest')}
                      className="w-full bg-blue-500 text-white py-2 rounded"
                    >
                      Daj na test
                    </button>
                  )}
                  {selectedCycle.status === 'on_test' && (
                    <div className="space-y-2">
                      <button
                        onClick={handleExtendTest}
                        disabled={extendTest.isPending}
                        className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
                      >
                        {extendTest.isPending ? 'Podaljševanje...' : '🔄 Podaljšaj +7 dni'}
                      </button>
                      <button
                        onClick={() => {
                          // Add another mat to the same company
                          setFormData({
                            ...formData,
                            lastCompanyId: selectedCycle.company_id,
                            lastCompanyName: selectedCycle.company?.display_name || selectedCycle.company?.name,
                            lastContactId: selectedCycle.contact_id,
                          });
                          setModalType('selectAvailableMat');
                        }}
                        className="w-full bg-green-500 text-white py-2 rounded"
                      >
                        ➕ Dodaj predpražnik sem
                      </button>
                      <button
                        onClick={handleRequestDriverPickup}
                        disabled={updateStatus.isPending}
                        className="w-full bg-purple-500 text-white py-2 rounded disabled:opacity-50"
                      >
                        {updateStatus.isPending ? 'Shranjevanje...' : '🚛 Pobere šofer'}
                      </button>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          navigate(`/contacts?company=${selectedCycle?.company_id}`);
                        }}
                        className="w-full bg-green-600 text-white py-2 rounded"
                      >
                        📋 Poglej stranko / Ponudba
                      </button>
                      <button
                        onClick={handleMarkAsDirty}
                        disabled={updateStatus.isPending}
                        className="w-full bg-orange-500 text-white py-2 rounded disabled:opacity-50"
                      >
                        {updateStatus.isPending ? 'Shranjevanje...' : '📥 Pobrano (test končan)'}
                      </button>
                      {!selectedCycle.contract_signed ? (
                        <button
                          onClick={async () => {
                            try {
                              await markContractSigned.mutateAsync({
                                cycleId: selectedCycle.id,
                              });
                              toast({
                                title: 'Uspeh',
                                description: '✅ Pogodba označena kot podpisana',
                              });
                              // Update local state
                              setSelectedCycle({
                                ...selectedCycle,
                                contract_signed: true,
                              } as CycleWithRelations);
                            } catch (error) {
                              toast({
                                title: 'Napaka',
                                description: 'Napaka pri shranjevanju',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={markContractSigned.isPending}
                          className="w-full bg-emerald-600 text-white py-2 rounded disabled:opacity-50"
                        >
                          {markContractSigned.isPending ? 'Shranjevanje...' : '✍️ Pogodba podpisana'}
                        </button>
                      ) : (
                        <div className="w-full py-2 bg-green-100 text-green-800 rounded text-center text-sm">
                          ✅ Pogodba že podpisana
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {selectedCycle.status === 'on_test' && (
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setSelectedCycle(null);
                        setView('scan');
                      }}
                      className="w-full py-2 bg-gray-100 rounded flex items-center justify-center gap-2"
                    >
                      <Camera size={18} />
                      Skeniraj drugo kodo
                    </button>
                  )}
                  <button onClick={() => setShowModal(false)} className="w-full py-2 border rounded">
                    Zapri
                  </button>
                </div>
              </div>
            )}

            {modalType === 'putOnTest' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Daj na test</h3>
                <div className="space-y-3">
                  {/* Company selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Podjetje</label>
                    {formData.companyId ? (
                      // Selected company display
                      <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-blue-900">
                              {(() => {
                                const company = companies?.find(c => c.id === formData.companyId);
                                return company?.display_name || company?.name || formData.clientName;
                              })()}
                            </div>
                            {(() => {
                              const company = companies?.find(c => c.id === formData.companyId);
                              return company?.address_city ? (
                                <div className="text-xs text-blue-700 flex items-center gap-1 mt-0.5">
                                  <MapPin size={12} />
                                  {company.address_city}
                                  {company.tax_number && <span className="text-blue-500 ml-2">{company.tax_number}</span>}
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, companyId: '', clientName: '', contactId: '', useExistingContact: false });
                              setSelectedCompanyForTest(null);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Button to open company select modal
                      <button
                        type="button"
                        onClick={() => setShowCompanySelectModal(true)}
                        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Users size={18} />
                        Izberi obstoječe podjetje
                      </button>
                    )}
                    {!formData.companyId && (
                      <p className="text-xs text-gray-500 mt-1 text-center">ali pusti prazno za novo podjetje</p>
                    )}
                  </div>

                  {/* Show existing contacts when company is selected */}
                  {formData.companyId && (() => {
                    const selectedCompany = companies?.find(c => c.id === formData.companyId);
                    const contacts = selectedCompany?.contacts || [];
                    return contacts.length > 0 ? (
                      <div className="bg-green-50 p-3 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm text-green-700">Obstoječi kontakti</h4>
                        <div className="space-y-2">
                          {contacts.map((contact) => (
                            <label
                              key={contact.id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                                formData.contactId === contact.id
                                  ? 'bg-green-100 border-green-500'
                                  : 'bg-white border-gray-200 hover:border-green-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="existingContact"
                                checked={formData.contactId === contact.id}
                                onChange={() => setFormData({
                                  ...formData,
                                  contactId: contact.id,
                                  useExistingContact: true,
                                })}
                                className="text-green-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {contact.first_name} {contact.last_name}
                                  {contact.role && <span className="text-gray-500 font-normal"> ({contact.role})</span>}
                                </div>
                                {contact.phone && (
                                  <div className="text-xs text-gray-600">📞 {contact.phone}</div>
                                )}
                                {contact.email && (
                                  <div className="text-xs text-gray-600">✉️ {contact.email}</div>
                                )}
                              </div>
                            </label>
                          ))}
                          <label
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                              formData.contactId === 'new'
                                ? 'bg-blue-100 border-blue-500'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="existingContact"
                              checked={formData.contactId === 'new'}
                              onChange={() => setFormData({
                                ...formData,
                                contactId: 'new',
                                useExistingContact: false,
                              })}
                              className="text-blue-600"
                            />
                            <div className="font-medium text-sm text-blue-700">+ Dodaj nov kontakt</div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-700">Podjetje nima shranjenih kontaktov.</p>
                      </div>
                    );
                  })()}

                  {/* Show previous cycle notes for this company */}
                  {formData.companyId && companyHistoryData && companyHistoryData.length > 0 && (
                    <div className="bg-amber-50 p-3 rounded-lg space-y-2">
                      <h4 className="font-medium text-sm text-amber-700 flex items-center gap-2">
                        📝 Zgodovina in zapiski
                        <span className="text-xs font-normal text-amber-600">({companyHistoryData.length})</span>
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {companyHistoryData.filter(c => c.notes).map((cycle) => (
                          <div key={cycle.id} className="bg-white p-2 rounded border border-amber-200 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                cycle.status === 'dirty' ? 'bg-red-100 text-red-700' :
                                cycle.status === 'completed' ? 'bg-green-100 text-green-700' :
                                cycle.status === 'on_test' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {cycle.status === 'dirty' ? 'Neuspel' :
                                 cycle.status === 'completed' ? 'Zaključen' :
                                 cycle.status === 'on_test' ? 'Na testu' :
                                 cycle.status}
                              </span>
                              {cycle.salesperson && (
                                <span className="text-xs text-gray-500">
                                  {cycle.salesperson.first_name} {cycle.salesperson.last_name}
                                </span>
                              )}
                              {cycle.test_start_date && (
                                <span className="text-xs text-gray-400">
                                  {new Date(cycle.test_start_date).toLocaleDateString('sl-SI')}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{cycle.notes}</p>
                          </div>
                        ))}
                        {companyHistoryData.filter(c => c.notes).length === 0 && (
                          <p className="text-xs text-amber-600 italic">Ni zapiskov iz prejšnjih poskusov.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show new contact form when: 1) new company OR 2) existing company but "new contact" selected */}
                  {(!formData.companyId || formData.contactId === 'new') && (
                    <>
                      {/* Only show company fields when creating new company */}
                      {!formData.companyId && (
                      <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm text-gray-700">Novo podjetje</h4>

                        <div>
                          <label className="block text-sm font-medium mb-1">Davčna številka</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="12345678"
                              value={formData.taxNumber || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/^SI/i, '').replace(/\s/g, '');
                                setFormData({ ...formData, taxNumber: value });
                                if (/^\d{8}$/.test(value) && !taxLookupLoading) {
                                  setTimeout(() => handleTaxLookup(), 100);
                                }
                              }}
                              className="flex-1 p-2 border rounded"
                            />
                            <button
                              type="button"
                              onClick={handleTaxLookup}
                              disabled={taxLookupLoading || !formData.taxNumber}
                              className="px-3 py-2 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300"
                            >
                              {taxLookupLoading ? '...' : 'Izpolni'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Vnesi 8 števk → avtomatsko izpolni</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Ime podjetja *</label>
                          <input
                            type="text"
                            placeholder="ABC d.o.o."
                            value={formData.clientName || ''}
                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Ime na lokaciji</label>
                          <input
                            type="text"
                            placeholder="Hotel Draš (opcijsko)"
                            value={formData.displayName || ''}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                          <p className="text-xs text-gray-500 mt-1">Če se razlikuje od uradnega imena</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Ulica in hišna številka</label>
                          <input
                            type="text"
                            placeholder="Slovenska cesta 1"
                            value={formData.addressStreet || ''}
                            onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-sm font-medium mb-1">Pošta</label>
                            <input
                              type="text"
                              placeholder="1000"
                              value={formData.addressPostal || ''}
                              onChange={(e) => {
                                const postal = e.target.value;
                                const city = getCityByPostalCode(postal);
                                setFormData({
                                  ...formData,
                                  addressPostal: postal,
                                  ...(city && { addressCity: city })
                                });
                              }}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Kraj</label>
                            <input
                              type="text"
                              placeholder="Ljubljana"
                              value={formData.addressCity || ''}
                              onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                        </div>
                      </div>
                      )}

                      <div className="bg-blue-50 p-3 rounded-lg space-y-3">
                        <h4 className="font-medium text-sm text-blue-700">
                          {formData.companyId ? 'Nov kontakt' : 'Kontaktna oseba'}
                        </h4>

                        <div>
                          <label className="block text-sm font-medium mb-1">Ime in priimek</label>
                          <input
                            type="text"
                            placeholder="Janez Novak"
                            value={formData.contactPerson || ''}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium mb-1">Telefon</label>
                            <input
                              type="tel"
                              placeholder="041 123 456"
                              value={formData.phone || ''}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Vloga</label>
                            <select
                              value={formData.contactRole || ''}
                              onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                              className="w-full p-2 border rounded"
                            >
                              <option value="">Izberi...</option>
                              <option value="Vodja nabave">Vodja nabave</option>
                              <option value="Direktor">Direktor</option>
                              <option value="Lastnik">Lastnik</option>
                              <option value="Tajnica">Tajnica</option>
                              <option value="Drugo">Drugo</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="kontakt@podjetje.si"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.isDecisionMaker || false}
                            onChange={(e) => setFormData({ ...formData, isDecisionMaker: e.target.checked })}
                            className="rounded"
                          />
                          Je odločevalna oseba
                        </label>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Opombe</label>
                    <textarea
                      placeholder="Dodatne opombe..."
                      value={formData.comment || ''}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      className="w-full p-2 border rounded"
                      rows={3}
                    />
                  </div>
                </div>

                <button
                  onClick={handlePutOnTest}
                  disabled={(!formData.companyId && !formData.clientName) || putOnTest.isPending}
                  className="w-full bg-blue-500 text-white py-2 rounded mt-4 disabled:bg-gray-300"
                >
                  {putOnTest.isPending ? 'Shranjevanje...' : 'Potrdi'}
                </button>
                <button
                  onClick={() => setModalType('matDetails')}
                  className="w-full mt-2 py-2 border rounded"
                >
                  Nazaj
                </button>
              </div>
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
              <div>
                <h3 className="text-lg font-bold mb-4">Izberi predpražnik</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Dodaj na lokacijo: <strong>{formData.lastCompanyName}</strong>
                </p>

                {/* Scan option */}
                <div className="mb-4">
                  {!formData.modalCameraActive ? (
                    <>
                      <button
                        onClick={async () => {
                          setFormData({ ...formData, modalCameraActive: true, modalCameraError: null });
                          // Start camera after a short delay to ensure div is rendered
                          setTimeout(async () => {
                            try {
                              const html5QrCode = new Html5Qrcode('modal-qr-reader');
                              const cameras = await Html5Qrcode.getCameras();
                              if (cameras && cameras.length > 0) {
                                const backCamera = cameras.find(c =>
                                  c.label.toLowerCase().includes('back') ||
                                  c.label.toLowerCase().includes('rear') ||
                                  c.label.toLowerCase().includes('environment')
                                ) || cameras[cameras.length - 1];

                                await html5QrCode.start(
                                  backCamera.id,
                                  { fps: 10, qrbox: { width: 200, height: 200 } },
                                  async (decodedText) => {
                                    // Stop camera first
                                    await html5QrCode.stop();
                                    setFormData(prev => ({ ...prev, modalCameraActive: false }));

                                    // Find and add the mat
                                    const code = decodedText.trim().toUpperCase();
                                    const cleanCycles = cycles?.filter(c => c.status === 'clean') || [];
                                    const foundCycle = cleanCycles.find(c =>
                                      c.qr_code?.code?.toUpperCase() === code
                                    );
                                    if (foundCycle) {
                                      try {
                                        await putOnTest.mutateAsync({
                                          cycleId: foundCycle.id,
                                          companyId: formData.lastCompanyId,
                                          contactId: formData.lastContactId,
                                          userId: user?.id || '',
                                          locationLat: formData.lastLocationLat,
                                          locationLng: formData.lastLocationLng,
                                        });
                                        showToast('✅ Predpražnik dodan na lokacijo');
                                      } catch (error) {
                                        showToast('Napaka pri dodajanju');
                                      }
                                    } else {
                                      showToast('Koda ni najdena med prostimi predpražniki', 'destructive');
                                    }
                                  },
                                  () => {}
                                );
                              }
                            } catch (err) {
                              setFormData(prev => ({ ...prev, modalCameraActive: false, modalCameraError: 'Napaka pri zagonu kamere' }));
                            }
                          }, 100);
                        }}
                        className="w-full p-4 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-3 mb-3"
                      >
                        <Camera size={24} />
                        <span className="font-medium">Skeniraj QR kodo</span>
                      </button>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ali vnesi kodo ročno..."
                          value={formData.scanInputModal || ''}
                          onChange={(e) => setFormData({ ...formData, scanInputModal: e.target.value })}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && formData.scanInputModal) {
                              const code = formData.scanInputModal.trim().toUpperCase();
                              const cleanCycles = cycles?.filter(c => c.status === 'clean') || [];
                              const foundCycle = cleanCycles.find(c =>
                                c.qr_code?.code?.toUpperCase() === code
                              );
                              if (foundCycle) {
                                try {
                                  await putOnTest.mutateAsync({
                                    cycleId: foundCycle.id,
                                    companyId: formData.lastCompanyId,
                                    contactId: formData.lastContactId,
                                    userId: user?.id || '',
                                  });
                                  showToast('✅ Predpražnik dodan na lokacijo');
                                  setFormData({ ...formData, scanInputModal: '' });
                                } catch (error) {
                                  showToast('Napaka pri dodajanju');
                                }
                              } else {
                                showToast('Koda ni najdena med prostimi predpražniki', 'destructive');
                              }
                            }
                          }}
                          className="flex-1 p-3 border rounded-lg font-mono"
                        />
                        <button
                          onClick={async () => {
                            if (formData.scanInputModal) {
                              const code = formData.scanInputModal.trim().toUpperCase();
                              const cleanCycles = cycles?.filter(c => c.status === 'clean') || [];
                              const foundCycle = cleanCycles.find(c =>
                                c.qr_code?.code?.toUpperCase() === code
                              );
                              if (foundCycle) {
                                try {
                                  await putOnTest.mutateAsync({
                                    cycleId: foundCycle.id,
                                    companyId: formData.lastCompanyId,
                                    contactId: formData.lastContactId,
                                    userId: user?.id || '',
                                  });
                                  showToast('✅ Predpražnik dodan na lokacijo');
                                  setFormData({ ...formData, scanInputModal: '' });
                                } catch (error) {
                                  showToast('Napaka pri dodajanju');
                                }
                              } else {
                                showToast('Koda ni najdena med prostimi predpražniki', 'destructive');
                              }
                            }
                          }}
                          disabled={!formData.scanInputModal || putOnTest.isPending}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
                        >
                          Dodaj
                        </button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div id="modal-qr-reader" style={{ width: '100%', minHeight: '250px' }}></div>
                      <button
                        onClick={async () => {
                          // Try to stop any running camera
                          try {
                            const html5QrCode = new Html5Qrcode('modal-qr-reader');
                            await html5QrCode.stop();
                          } catch (e) {}
                          setFormData({ ...formData, modalCameraActive: false });
                        }}
                        className="w-full mt-2 p-2 border rounded-lg"
                      >
                        Prekliči skeniranje
                      </button>
                    </div>
                  )}
                  {formData.modalCameraError && (
                    <p className="text-red-500 text-sm mt-2">{formData.modalCameraError}</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Ali izberi s seznama:</p>
                </div>

                {(() => {
                  const cleanCycles = cycles?.filter(c => c.status === 'clean') || [];

                  if (cleanCycles.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-gray-500">Ni prostih predpražnikov</p>
                        <p className="text-sm text-gray-400 mt-1">Vsi predpražniki so že v uporabi</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {cleanCycles.map(cycle => (
                        <button
                          key={cycle.id}
                          onClick={async () => {
                            try {
                              await putOnTest.mutateAsync({
                                cycleId: cycle.id,
                                companyId: formData.lastCompanyId,
                                contactId: formData.lastContactId,
                                userId: user?.id || '',
                                locationLat: formData.lastLocationLat,
                                locationLng: formData.lastLocationLng,
                              });
                              showToast('✅ Predpražnik dodan na lokacijo');
                              // Stay in selectAvailableMat to allow adding more
                            } catch (error) {
                              showToast('Napaka pri dodajanju');
                            }
                          }}
                          disabled={putOnTest.isPending}
                          className="w-full p-3 border rounded-lg text-left hover:bg-blue-50 flex items-center gap-3 disabled:opacity-50"
                        >
                          <div className="text-2xl">💚</div>
                          <div className="flex-1">
                            <div className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                            <div className="text-sm text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                          </div>
                          <div className="text-blue-500">Dodaj →</div>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedCycle(null);
                      setFormData({});
                      setView('home');
                    }}
                    className="w-full py-2 border rounded"
                  >
                    🏠 Zaključi
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Mat Select Modal for Map Edit Mode */}
      {showMatSelectModal && clickedMapLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold">Izberi predpražnik</h3>
                <p className="text-xs text-gray-500">
                  Lokacija: {clickedMapLocation.lat.toFixed(5)}, {clickedMapLocation.lng.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMatSelectModal(false);
                  setClickedMapLocation(null);
                }}
                className="text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-600 mb-3">Predpražniki na testu:</p>
              {cycles?.filter(c => c.status === 'on_test').length === 0 ? (
                <p className="text-gray-500 text-center py-4">Ni predpražnikov na testu</p>
              ) : (
                <div className="space-y-2">
                  {cycles?.filter(c => c.status === 'on_test').map(cycle => (
                    <button
                      key={cycle.id}
                      onClick={async () => {
                        try {
                          await updateCycleLocation.mutateAsync({
                            cycleId: cycle.id,
                            locationLat: clickedMapLocation.lat,
                            locationLng: clickedMapLocation.lng,
                          });
                          toast({
                            title: 'Uspeh',
                            description: `Lokacija za ${cycle.qr_code?.code} posodobljena`,
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
                      disabled={updateCycleLocation.isPending}
                      className="w-full p-3 border rounded-lg text-left hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-sm font-bold">{cycle.qr_code?.code}</div>
                          <div className="text-sm text-gray-600">{cycle.company?.name || 'Brez podjetja'}</div>
                          {cycle.mat_type && (
                            <div className="text-xs text-gray-500">{cycle.mat_type.code || cycle.mat_type.name}</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {(cycle as any).location_lat ? '📍' : '❓'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Home, Menu, X, Users, Loader2, Navigation } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { useMapLocations } from '@/hooks/useMapLocations';
import { useCameraScanner, useCycleActions } from './prodajalec/hooks';

import { useMatTypes } from '@/hooks/useMatTypes';
import { useQRCodes } from '@/hooks/useQRCodes';
import { useCycles, useCycleHistory, useUpdateCycleStatus, useUpdateTestStartDate, useUpdateCycleLocation, useMarkContractSigned, useBatchSignContracts, useBatchPickupSelf, useBatchExtendTest, CycleWithRelations } from '@/hooks/useCycles';
import { useCompanyHistory } from '@/hooks/useCompanies';
import { useCompanyContacts, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import CompanySelectModal from '@/components/CompanySelectModal';
import CompanyMatsModal from '@/components/CompanyMatsModal';
import { lookupCompanyByTaxNumber, isValidTaxNumberFormat } from '@/utils/companyLookup';

// Ekstrahirane komponente
import { HomeView, ScanView, MapView, HistoryView, StatisticsView, TrackingView, MatDetailsModal, PutOnTestModal, SelectAvailableMatModal, MapLocationSelectModal, SideMenu, ViewType } from './prodajalec/components';

export default function ProdajalecDashboard() {
  const { user, profile, signOut, availableRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Data hooks
  const { data: matTypes, isLoading: loadingMatTypes } = useMatTypes();
  const { data: qrCodes, isLoading: loadingQRCodes } = useQRCodes(user?.id);
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
  const updateStatus = useUpdateCycleStatus();
  const updateTestStartDate = useUpdateTestStartDate();
  const updateCycleLocation = useUpdateCycleLocation();
  const markContractSigned = useMarkContractSigned();
  const batchSignContracts = useBatchSignContracts();
  const batchPickupSelf = useBatchPickupSelf();
  const batchExtendTest = useBatchExtendTest();

  // UI State - MUST be declared before useCycleActions
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

  // Cycle actions hook
  const {
    createCycle,
    putOnTest,
    signContract,
    extendTest,
    handleAddMat,
    handlePutOnTest,
    handleMarkAsDirty,
    handleRequestDriverPickup,
    handleSignContract,
    handleExtendTest,
    showToast,
  } = useCycleActions({
    userId: user?.id,
    companies,
    selectedCycle,
    formData,
    setFormData,
    setShowModal,
    setModalType,
    setSelectedCycle,
  });
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

      <SideMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentView={view}
        onViewChange={(v) => setView(v)}
        onNavigate={navigate}
        availableRoles={availableRoles}
        onSwitchRole={switchRole}
        onChangePassword={() => setShowPasswordModal(true)}
        onSignOut={signOut}
      />

      <div className="max-w-4xl mx-auto p-4">
        {view === 'home' && (
          <HomeView
            cycles={cycles}
            currentTime={currentTime}
            statusFilter={statusFilter}
            expandedCompanies={expandedCompanies}
            dismissedAlerts={dismissedAlerts}
            onStatusFilterChange={setStatusFilter}
            onToggleCompany={(companyId) => {
              setExpandedCompanies(prev => {
                const newSet = new Set(prev);
                if (newSet.has(companyId)) {
                  newSet.delete(companyId);
                } else {
                  newSet.add(companyId);
                }
                return newSet;
              });
            }}
            onCycleClick={(cycle) => {
              setSelectedCycle(cycle);
              setModalType('matDetails');
              setShowModal(true);
            }}
            onDismissAlert={(cycleId) => {
              setDismissedAlerts(prev => new Set([...prev, cycleId]));
            }}
            onShowCompanyMats={(data) => {
              setSelectedCompanyForMats(data);
              setShowCompanyMatsModal(true);
            }}
          />
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

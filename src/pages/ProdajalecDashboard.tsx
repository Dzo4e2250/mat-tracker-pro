/**
 * @file ProdajalecDashboard.tsx
 * @description Dashboard za prodajalce - verzija 2.0 (refactored)
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { useMapLocations } from '@/hooks/useMapLocations';
import { useCameraScanner, useCycleActions, useProdajalecState } from './prodajalec/hooks';

import { useMatTypes } from '@/hooks/useMatTypes';
import { useQRCodes } from '@/hooks/useQRCodes';
import { useCycles, useCycleHistory, useUpdateCycleStatus, useUpdateTestStartDate, useUpdateCycleLocation, useMarkContractSigned, useBatchSignContracts, useBatchPickupSelf, useBatchExtendTest, useBatchRemove, CycleWithRelations } from '@/hooks/useCycles';
import { useCompanyHistory } from '@/hooks/useCompanies';
import { useCompanyContacts, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import CompanySelectModal from '@/components/CompanySelectModal';
import CompanyMatsModal from '@/components/CompanyMatsModal';
import { lookupCompanyInternalFirst, isValidTaxNumberFormat } from '@/utils/companyLookup';

// Ekstrahirane komponente
import {
  HomeView, ScanView, MapView, HistoryView, StatisticsView, TrackingView,
  MatDetailsModal, PutOnTestModal, SelectAvailableMatModal, MapLocationSelectModal,
  SelectTypeModal, SignContractModal, PutOnTestSuccessModal,
  SideMenu, ProdajalecHeader, ProdajalecBottomNav, ViewType
} from './prodajalec/components';

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
  const { data: mapLocations, isLoading: loadingMap } = useMapLocations({ salespersonId: user?.id });

  // Company select modal state
  const [showCompanySelectModal, setShowCompanySelectModal] = useState(false);
  const [selectedCompanyForTest, setSelectedCompanyForTest] = useState<CompanyWithContacts | null>(null);

  // Mutations
  const updateStatus = useUpdateCycleStatus();
  const updateTestStartDate = useUpdateTestStartDate();
  const updateCycleLocation = useUpdateCycleLocation();
  const markContractSigned = useMarkContractSigned();
  const batchSignContracts = useBatchSignContracts();
  const batchPickupSelf = useBatchPickupSelf();
  const batchExtendTest = useBatchExtendTest();
  const batchRemove = useBatchRemove();

  // UI State
  const [view, setView] = useState<ViewType | 'scan' | 'home'>(() => {
    const urlView = searchParams.get('view');
    return urlView === 'scan' ? 'scan' : 'home';
  });
  const [scanInput, setScanInput] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<CycleWithRelations | null>(null);
  const [clickedMapLocation, setClickedMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMatSelectModal, setShowMatSelectModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);
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

  const { data: companyHistoryData } = useCompanyHistory(formData.companyId);

  // Cycle actions hook
  const {
    createCycle, putOnTest, signContract, extendTest,
    handleAddMat, handlePutOnTest, handleMarkAsDirty, handleRequestDriverPickup,
    handleSignContract, handleExtendTest, showToast,
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

  // Camera scanner hook
  const handleScanCallback = useRef<(code: string) => void>(() => {});
  const {
    cameraActive, cameraLoading, cameraError, zoomSupported, zoomLevel, maxZoom,
    startCamera, stopCamera, applyZoom
  } = useCameraScanner({ onScan: (code) => handleScanCallback.current(code) });

  // Effects
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view !== 'scan') stopCamera();
  }, [view, stopCamera]);

  useEffect(() => {
    if (dismissedAlerts.size > 0) {
      localStorage.setItem('dismissedAlerts', JSON.stringify([...dismissedAlerts]));
    }
  }, [dismissedAlerts]);

  // Helper functions
  const getAvailableQRCodes = () => {
    if (!qrCodes || !cycles) return [];
    const activeQRIds = cycles.map(c => c.qr_code_id);
    return qrCodes.filter(qr => !activeQRIds.includes(qr.id) && qr.status === 'available');
  };

  const handleScan = (qrCode: string) => {
    const qr = qrCodes?.find(q => q.code === qrCode);
    if (!qr) {
      showToast('QR koda ni najdena', 'destructive');
      setScanInput('');
      return;
    }

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

  useEffect(() => {
    handleScanCallback.current = handleScan;
  });

  const handleTaxLookup = async () => {
    const taxNumber = formData.taxNumber;
    if (!taxNumber || !isValidTaxNumberFormat(taxNumber)) {
      toast({ description: 'Vnesite veljavno davčno številko (8 števk)', variant: 'destructive' });
      return;
    }

    setTaxLookupLoading(true);
    try {
      const result = await lookupCompanyInternalFirst(taxNumber);
      if (!result) {
        toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
        return;
      }

      if (result.source === 'internal' && result.internalCompany) {
        // Podjetje že obstaja v bazi - avtomatsko izberi
        const company = result.internalCompany;
        const primaryContact = company.contacts?.[0];

        setFormData((prev: any) => ({
          ...prev,
          companyId: company.id,
          clientName: company.display_name || company.name,
          addressStreet: company.address_street || '',
          addressCity: company.address_city || '',
          addressPostal: company.address_postal || '',
          // Če ima kontakt, ga nastavi
          contactId: primaryContact?.id || '',
          useExistingContact: !!primaryContact,
          contactPerson: primaryContact ? `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim() : '',
          phone: primaryContact?.phone || '',
          email: primaryContact?.email || '',
          contactRole: primaryContact?.role || '',
          isDecisionMaker: primaryContact?.is_decision_maker || false,
        }));
        toast({
          description: `✅ Podjetje že v bazi: ${company.display_name || company.name}${primaryContact ? ` (${primaryContact.first_name} ${primaryContact.last_name})` : ''}`,
        });
      } else if (result.source === 'external' && result.externalData) {
        // Podjetje ni v bazi - izpolni iz VIES API
        const companyData = result.externalData;
        if (!companyData.isValid) {
          toast({ description: 'Davčna številka ni veljavna ali podjetje ni DDV zavezanec', variant: 'destructive' });
          return;
        }
        setFormData((prev: any) => ({
          ...prev,
          clientName: companyData.name || prev.clientName,
          addressStreet: companyData.street || prev.addressStreet,
          addressCity: companyData.city || prev.addressCity,
          addressPostal: companyData.postalCode || prev.addressPostal,
        }));
        toast({ description: `Najdeno (novo): ${companyData.name}` });
      }
    } catch {
      toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
    } finally {
      setTaxLookupLoading(false);
    }
  };

  const handleCompanyMatsAction = async (
    action: 'sign' | 'pickup' | 'extend' | 'remove',
    params: any
  ) => {
    try {
      if (action === 'sign') {
        await batchSignContracts.mutateAsync({ ...params, userId: user?.id || '' });
        toast({ description: `Pogodba podpisana za ${params.signedCycleIds.length} predpražnikov` });
      } else if (action === 'pickup') {
        await batchPickupSelf.mutateAsync({ cycleIds: params.cycleIds, userId: user?.id || '' });
        toast({ description: `${params.cycleIds.length} predpražnikov označenih kot pobrano` });
      } else if (action === 'extend') {
        await batchExtendTest.mutateAsync({ cycleIds: params.cycleIds, userId: user?.id || '' });
        toast({ description: `Test podaljšan za ${params.cycleIds.length} predpražnikov (+7 dni)` });
      } else if (action === 'remove') {
        await batchRemove.mutateAsync({ cycleIds: params.cycleIds, userId: user?.id || '' });
        toast({ description: `${params.cycleIds.length} predpražnikov odstranjenih in vrnjenih med čiste` });
      }
    } catch {
      toast({ description: 'Napaka pri shranjevanju', variant: 'destructive' });
      throw new Error('Action failed');
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
      <ProdajalecHeader
        firstName={profile?.first_name}
        lastName={profile?.last_name}
        view={view}
        onMenuOpen={() => setMenuOpen(true)}
        onTrackingView={() => setView('tracking')}
      />

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
                newSet.has(companyId) ? newSet.delete(companyId) : newSet.add(companyId);
                return newSet;
              });
            }}
            onCycleClick={(cycle) => {
              setSelectedCycle(cycle);
              setModalType('matDetails');
              setShowModal(true);
            }}
            onDismissAlert={(cycleId) => setDismissedAlerts(prev => new Set([...prev, cycleId]))}
            onShowCompanyMats={(data) => {
              setSelectedCompanyForMats(data);
              setShowCompanyMatsModal(true);
            }}
          />
        )}

        {view === 'history' && <HistoryView cycleHistory={cycleHistory} />}
        {view === 'statistics' && <StatisticsView cycleHistory={cycleHistory} />}
        {view === 'tracking' && <TrackingView userId={user?.id} />}

        {view === 'map' && (
          <MapView
            mapLocations={mapLocations}
            loadingMap={loadingMap}
            mapEditMode={false}
            clickedMapLocation={clickedMapLocation}
            onMapClick={(lat, lng) => {
              setClickedMapLocation({ lat, lng });
              setShowMatSelectModal(true);
            }}
            onUpdateLocation={async (cycleId, lat, lng) => {
              await updateCycleLocation.mutateAsync({ cycleId, locationLat: lat, locationLng: lng });
              toast({ description: 'Lokacija posodobljena' });
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
            onScanInputChange={setScanInput}
            onScan={handleScan}
          />
        )}
      </div>

      {/* Main Modal Container */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-end p-2 border-b">
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Zapri">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-56px)]">
              {modalType === 'selectType' && (
                <SelectTypeModal
                  qrCode={formData.qrCode}
                  matTypes={matTypes}
                  isPending={createCycle.isPending}
                  onSelect={(_, typeId) => handleAddMat(formData.qrId, typeId)}
                  onCancel={() => setShowModal(false)}
                />
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
                <SignContractModal
                  frequency={formData.frequency || ''}
                  isPending={signContract.isPending}
                  onFrequencyChange={(freq) => setFormData({ ...formData, frequency: freq })}
                  onSign={handleSignContract}
                  onBack={() => setModalType('matDetails')}
                />
              )}

              {modalType === 'putOnTestSuccess' && (
                <PutOnTestSuccessModal
                  cycle={selectedCycle}
                  companyName={formData.lastCompanyName}
                  onAddAnother={() => setModalType('selectAvailableMat')}
                  onGoHome={() => {
                    setShowModal(false);
                    setSelectedCycle(null);
                    setFormData({});
                    setView('home');
                  }}
                />
              )}

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

      {/* Map Location Select Modal */}
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
              toast({ description: `Lokacija za ${cycle?.qr_code?.code} posodobljena` });
              setShowMatSelectModal(false);
              setClickedMapLocation(null);
            } catch {
              toast({ description: 'Napaka pri posodabljanju lokacije', variant: 'destructive' });
            }
          }}
          onClose={() => {
            setShowMatSelectModal(false);
            setClickedMapLocation(null);
          }}
        />
      )}

      <ProdajalecBottomNav view={view} onViewChange={setView} />

      {/* Additional Modals */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />

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
            setFormData({ ...formData, companyId: '', clientName: '', contactId: '', useExistingContact: false });
            setSelectedCompanyForTest(null);
          }
          setShowCompanySelectModal(false);
        }}
      />

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
          onSignContracts={(signedIds, action, remainingIds) =>
            handleCompanyMatsAction('sign', { signedCycleIds: signedIds, remainingAction: action, remainingCycleIds: remainingIds })
          }
          onPickupAll={(cycleIds) => handleCompanyMatsAction('pickup', { cycleIds })}
          onExtendAll={(cycleIds) => handleCompanyMatsAction('extend', { cycleIds })}
          onRemoveAll={(cycleIds) => handleCompanyMatsAction('remove', { cycleIds })}
          isLoading={batchSignContracts.isPending || batchPickupSelf.isPending || batchExtendTest.isPending || batchRemove.isPending}
        />
      )}
    </div>
  );
}

/**
 * @file SelectAvailableMatModal.tsx
 * @description Modal za izbiro prostega predpražnika in dodajanje na isto lokacijo
 */

import { Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { CycleWithRelations } from '@/hooks/useCycles';

interface SelectAvailableMatModalProps {
  formData: {
    lastCompanyId?: string;
    lastCompanyName?: string;
    lastContactId?: string;
    lastLocationLat?: number;
    lastLocationLng?: number;
    modalCameraActive?: boolean;
    modalCameraError?: string | null;
    scanInputModal?: string;
  };
  setFormData: (data: any) => void;
  cycles: CycleWithRelations[] | undefined;
  userId: string;
  isPending: boolean;
  onAddMat: (cycleId: string) => Promise<void>;
  showToast: (message: string, variant?: 'default' | 'destructive') => void;
  onClose: () => void;
}

export default function SelectAvailableMatModal({
  formData,
  setFormData,
  cycles,
  userId,
  isPending,
  onAddMat,
  showToast,
  onClose,
}: SelectAvailableMatModalProps) {
  const cleanCycles = cycles?.filter(c => c.status === 'clean') || [];

  const handleScanCode = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    const foundCycle = cleanCycles.find(c =>
      c.qr_code?.code?.toUpperCase() === normalizedCode
    );

    if (foundCycle) {
      try {
        await onAddMat(foundCycle.id);
        showToast('✅ Predpražnik dodan na lokacijo');
      } catch (error) {
        showToast('Napaka pri dodajanju', 'destructive');
      }
    } else {
      showToast('Koda ni najdena med prostimi predpražniki', 'destructive');
    }
  };

  const startCamera = async () => {
    setFormData({ ...formData, modalCameraActive: true, modalCameraError: null });

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
              await html5QrCode.stop();
              setFormData((prev: any) => ({ ...prev, modalCameraActive: false }));
              await handleScanCode(decodedText);
            },
            () => {}
          );
        }
      } catch (err) {
        setFormData((prev: any) => ({
          ...prev,
          modalCameraActive: false,
          modalCameraError: 'Napaka pri zagonu kamere'
        }));
      }
    }, 100);
  };

  const stopCamera = async () => {
    try {
      const html5QrCode = new Html5Qrcode('modal-qr-reader');
      await html5QrCode.stop();
    } catch (e) {}
    setFormData({ ...formData, modalCameraActive: false });
  };

  const handleManualInput = async () => {
    if (formData.scanInputModal) {
      await handleScanCode(formData.scanInputModal);
      setFormData({ ...formData, scanInputModal: '' });
    }
  };

  return (
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
              onClick={startCamera}
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
                    await handleManualInput();
                  }
                }}
                className="flex-1 p-3 border rounded-lg font-mono"
              />
              <button
                onClick={handleManualInput}
                disabled={!formData.scanInputModal || isPending}
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
              onClick={stopCamera}
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

      {cleanCycles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-gray-500">Ni prostih predpražnikov</p>
          <p className="text-sm text-gray-400 mt-1">Vsi predpražniki so že v uporabi</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {cleanCycles.map(cycle => (
            <button
              key={cycle.id}
              onClick={async () => {
                try {
                  await onAddMat(cycle.id);
                  showToast('✅ Predpražnik dodan na lokacijo');
                } catch (error) {
                  showToast('Napaka pri dodajanju', 'destructive');
                }
              }}
              disabled={isPending}
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
      )}

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={onClose}
          className="w-full py-2 border rounded"
        >
          🏠 Zaključi
        </button>
      </div>
    </div>
  );
}

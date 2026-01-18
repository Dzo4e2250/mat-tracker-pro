/**
 * @file QRScannerModal.tsx
 * @description Modal za skeniranje vCard QR kod
 */

import { X, QrCode } from 'lucide-react';

interface QRScannerModalProps {
  zoomSupported: boolean;
  maxZoom: number;
  zoomLevel: number;
  scannerError: string | null;
  onZoomChange: (zoom: number) => void;
  onClose: () => void;
}

/**
 * Modal za skeniranje QR kod
 * - Prikaz kamere (id="qr-reader" za Html5Qrcode)
 * - Zoom kontrola če je podprta
 * - Prikaz napak
 */
export default function QRScannerModal({
  zoomSupported,
  maxZoom,
  zoomLevel,
  scannerError,
  onZoomChange,
  onClose,
}: QRScannerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <QrCode size={20} />
            Skeniraj vCard QR
          </h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>
        <div id="qr-reader" className="w-full min-h-[300px] bg-gray-100"></div>
        {zoomSupported && (
          <div className="px-4 py-2 border-t bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Zoom:</span>
              <input
                type="range"
                min="1"
                max={maxZoom}
                step="0.1"
                value={zoomLevel}
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs font-medium w-8">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>
        )}
        {scannerError ? (
          <div className="p-3 text-center text-sm text-red-500">
            {scannerError}
          </div>
        ) : (
          <div className="p-3 text-center text-sm text-gray-500">
            {zoomSupported ? 'Uporabi zoom za majhne QR kode' : 'Usmerite kamero na QR kodo vizitke'}
          </div>
        )}
      </div>
    </div>
  );
}

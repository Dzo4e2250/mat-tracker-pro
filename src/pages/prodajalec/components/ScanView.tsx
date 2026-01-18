/**
 * @file ScanView.tsx
 * @description QR skeniranje predpražnikov
 */

import { Camera, X, ZoomIn, Loader2 } from 'lucide-react';

interface QRCodeItem {
  id: string;
  code: string;
}

interface ScanViewProps {
  // Camera state
  cameraActive: boolean;
  cameraLoading: boolean;
  cameraError: string | null;
  zoomSupported: boolean;
  zoomLevel: number;
  maxZoom: number;
  // Input state
  scanInput: string;
  availableQRCodes: QRCodeItem[];
  // Handlers
  onStartCamera: () => void;
  onStopCamera: () => void;
  onZoomChange: (zoom: number) => void;
  onScanInputChange: (value: string) => void;
  onScan: (code: string) => void;
}

export default function ScanView({
  cameraActive,
  cameraLoading,
  cameraError,
  zoomSupported,
  zoomLevel,
  maxZoom,
  scanInput,
  availableQRCodes,
  onStartCamera,
  onStopCamera,
  onZoomChange,
  onScanInputChange,
  onScan
}: ScanViewProps) {
  return (
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
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-600 w-12 text-right">
                {zoomLevel.toFixed(1)}x
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onStopCamera}
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
            onClick={onStartCamera}
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
            onChange={(e) => onScanInputChange(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && scanInput && onScan(scanInput)}
            className="flex-1 p-3 border rounded text-center text-lg"
          />
          <button
            onClick={() => scanInput && onScan(scanInput)}
            disabled={!scanInput}
            className="px-6 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
          >
            OK
          </button>
        </div>

        {/* Quick Access to Available Codes */}
        <div className="mt-6">
          <h3 className="font-bold mb-2 text-sm text-gray-600">Proste QR kode ({availableQRCodes.length}):</h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {availableQRCodes.map(qr => (
              <button
                key={qr.id}
                onClick={() => onScan(qr.code)}
                className="px-3 py-1 bg-green-50 border border-green-200 rounded text-sm hover:bg-green-100 font-mono"
              >
                {qr.code}
              </button>
            ))}
            {availableQRCodes.length === 0 && (
              <p className="text-gray-500 text-sm">Ni prostih QR kod</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

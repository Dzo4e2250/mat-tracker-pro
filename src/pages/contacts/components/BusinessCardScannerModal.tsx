/**
 * @file BusinessCardScannerModal.tsx
 * @description Camera/upload modal za skeniranje vizitk
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Upload, Loader2, ScanLine } from 'lucide-react';
import type { ProcessingStep } from '../hooks/useBusinessCardScanner';
import { canvasToBase64 } from '@/utils/imageCompression';

interface BusinessCardScannerModalProps {
  isProcessing: boolean;
  processingStep: ProcessingStep;
  onCaptureFile: (file: File) => void;
  onCaptureBase64: (base64: string) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<ProcessingStep, string> = {
  idle: '',
  capturing: 'Zajem slike...',
  compressing: 'Kompresija slike...',
  ocr: 'AI bere vizitko...',
  matching: 'Iskanje v registru...',
  done: 'Koncano!',
  error: 'Napaka',
};

export default function BusinessCardScannerModal({
  isProcessing,
  processingStep,
  onCaptureFile,
  onCaptureBase64,
  onClose,
}: BusinessCardScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start camera on mount
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch {
        if (mounted) {
          setCameraError('Kamera ni na voljo. Uporabite gumb za nalaganje slike.');
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvasToBase64(canvas);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);

    onCaptureBase64(base64);
  }, [onCaptureBase64]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    // Stop camera if running
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);

    onCaptureFile(file);
  }, [onCaptureFile]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <ScanLine size={20} />
            Skeniraj vizitko
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" disabled={isProcessing}>
            <X size={24} />
          </button>
        </div>

        {/* Camera / Processing view */}
        <div className="relative">
          {isProcessing ? (
            <div className="w-full h-[300px] bg-gray-100 flex flex-col items-center justify-center gap-4">
              <Loader2 size={40} className="animate-spin text-indigo-500" />
              <p className="text-sm text-gray-600 font-medium">{STEP_LABELS[processingStep]}</p>
              <div className="flex gap-1">
                {(['compressing', 'ocr', 'matching'] as ProcessingStep[]).map((step, i) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      processingStep === step ? 'bg-indigo-500 animate-pulse' :
                      ['compressing', 'ocr', 'matching'].indexOf(processingStep) > i ? 'bg-green-500' :
                      'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {cameraError ? (
                <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center p-6 text-center">
                  <p className="text-sm text-gray-500">{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-[300px] object-cover bg-gray-900"
                />
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          {!isProcessing && (
            <>
              {cameraActive && (
                <button
                  onClick={handleCapture}
                  className="w-full py-3 bg-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Fotografiraj
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-500 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Nalozi sliko vizitke
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

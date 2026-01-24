/**
 * @file useCameraScanner.ts
 * @description Hook za upravljanje QR skenerja s kamero
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseCameraScannerOptions {
  onScan: (code: string) => void;
  elementId?: string;
}

interface UseCameraScannerReturn {
  // State
  cameraActive: boolean;
  cameraLoading: boolean;
  cameraError: string | null;
  zoomSupported: boolean;
  zoomLevel: number;
  maxZoom: number;
  // Actions
  startCamera: () => Promise<void>;
  stopCamera: () => Promise<void>;
  applyZoom: (zoom: number) => Promise<void>;
}

export function useCameraScanner({ onScan, elementId = 'qr-reader' }: UseCameraScannerOptions): UseCameraScannerReturn {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);

  // Keep onScan ref updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Helper to safely stop scanner
  const safeStopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        // Try to get state - this might throw if scanner not initialized
        let state;
        try {
          state = html5QrCodeRef.current.getState();
        } catch {
          // getState() failed, scanner probably not initialized
          return;
        }
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      safeStopScanner();
    };
  }, [safeStopScanner]);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        // Try to get state - this might throw if scanner not initialized
        let state;
        try {
          state = html5QrCodeRef.current.getState();
        } catch {
          // getState() failed, scanner probably not initialized
          setCameraActive(false);
          setZoomLevel(1);
          setZoomSupported(false);
          return;
        }
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.log('Camera stop skipped:', err);
      }
    }
    setCameraActive(false);
    setZoomLevel(1);
    setZoomSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraLoading(true);
    setCameraActive(true);

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
      const devices = await Html5Qrcode.getCameras();
      console.log('Available cameras:', devices);

      if (!devices || devices.length === 0) {
        setCameraError('Ni najdenih kamer na tej napravi');
        setCameraLoading(false);
        setCameraActive(false);
        return;
      }

      // Find back camera
      let cameraId = devices[0].id;

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
        html5QrCodeRef.current = new Html5Qrcode(elementId);
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
          onScanRef.current(decodedText);
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
  }, [elementId, stopCamera]);

  const applyZoom = useCallback(async (newZoom: number) => {
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
  }, [zoomSupported]);

  return {
    cameraActive,
    cameraLoading,
    cameraError,
    zoomSupported,
    zoomLevel,
    maxZoom,
    startCamera,
    stopCamera,
    applyZoom,
  };
}

/**
 * @file useQRScanner.ts
 * @description Hook za skeniranje QR kod (vCard vizitke)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface UseQRScannerProps {
  companies: CompanyWithContacts[] | undefined;
  onContactParsed: (data: any) => void;
  onExistingCompanyFound: (company: CompanyWithContacts, contactData: any) => void;
}

interface UseQRScannerReturn {
  // State
  showQRScanner: boolean;
  scannerError: string | null;
  zoomLevel: number;
  maxZoom: number;
  zoomSupported: boolean;

  // Actions
  openScanner: () => void;
  closeScanner: () => void;
  applyZoom: (zoom: number) => Promise<void>;
}

/**
 * Parsira vCard podatke iz QR kode
 */
function parseVCard(vCardText: string) {
  const data: any = {};

  // Extract FN (Full Name) or N (Name)
  const fnMatch = vCardText.match(/FN[;:]([^\r\n]+)/i);
  if (fnMatch) {
    data.contactName = fnMatch[1].trim();
  } else {
    const nMatch = vCardText.match(/N[;:]([^\r\n]+)/i);
    if (nMatch) {
      const parts = nMatch[1].split(';');
      data.contactName = `${parts[1] || ''} ${parts[0] || ''}`.trim();
    }
  }

  // Extract ORG (Organization/Company)
  const orgMatch = vCardText.match(/ORG[;:]([^\r\n]+)/i);
  if (orgMatch) {
    data.companyName = orgMatch[1].split(';')[0].trim();
  }

  // Extract TITLE (Role)
  const titleMatch = vCardText.match(/TITLE[;:]([^\r\n]+)/i);
  if (titleMatch) {
    data.contactRole = titleMatch[1].trim();
  }

  // Extract TEL (Phone)
  const telMatch = vCardText.match(/TEL[^:]*:([^\r\n]+)/i);
  if (telMatch) {
    data.contactPhone = telMatch[1].trim();
  }

  // Extract EMAIL
  const emailMatch = vCardText.match(/EMAIL[^:]*:([^\r\n]+)/i);
  if (emailMatch) {
    data.contactEmail = emailMatch[1].trim();
  }

  // Extract ADR (Address)
  const adrMatch = vCardText.match(/ADR[^:]*:([^\r\n]+)/i);
  if (adrMatch) {
    const parts = adrMatch[1].split(';');
    if (parts[2]) data.addressStreet = parts[2].trim();
    if (parts[3]) data.addressCity = parts[3].trim();
    if (parts[5]) data.addressPostal = parts[5].trim();
  }

  // Extract URL (sometimes contains tax number)
  const urlMatch = vCardText.match(/URL[^:]*:([^\r\n]+)/i);
  if (urlMatch) {
    const taxMatch = urlMatch[1].match(/SI\d{8}/i);
    if (taxMatch) {
      data.taxNumber = taxMatch[0].toUpperCase();
    }
  }

  // Sometimes tax number is in NOTE field
  const noteMatch = vCardText.match(/NOTE[^:]*:([^\r\n]+)/i);
  if (noteMatch && !data.taxNumber) {
    const taxMatch = noteMatch[1].match(/SI\d{8}/i);
    if (taxMatch) {
      data.taxNumber = taxMatch[0].toUpperCase();
    }
  }

  return data;
}

/**
 * Poišče obstoječe podjetje po imenu ali davčni številki
 */
function findExistingCompany(
  companies: CompanyWithContacts[] | undefined,
  companyName?: string,
  taxNumber?: string
): CompanyWithContacts | null {
  if (!companies) return null;

  // First check by tax number (more reliable)
  if (taxNumber) {
    const byTax = companies.find(c =>
      c.tax_number && c.tax_number.toLowerCase() === taxNumber.toLowerCase()
    );
    if (byTax) return byTax;
  }

  // Then check by company name (case insensitive, partial match)
  if (companyName) {
    const normalizedName = companyName.toLowerCase().trim();
    const byName = companies.find(c => {
      const existingName = c.name.toLowerCase().trim();
      return existingName === normalizedName ||
             existingName.includes(normalizedName) ||
             normalizedName.includes(existingName);
    });
    if (byName) return byName;
  }

  return null;
}

export function useQRScanner({
  companies,
  onContactParsed,
  onExistingCompanyFound,
}: UseQRScannerProps): UseQRScannerReturn {
  const { toast } = useToast();

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);

  // Use refs for scanner state to avoid closure issues
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Ignore "not running" errors
        console.log('Scanner stop:', err);
      }
      isRunningRef.current = false;
    }
    // Also clear the element
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
  }, []);

  const closeScanner = useCallback(async () => {
    await stopScanner();
    setShowQRScanner(false);
    setScannerError(null);
    setZoomLevel(1);
    setZoomSupported(false);
  }, [stopScanner]);

  const openScanner = useCallback(() => {
    setShowQRScanner(true);
  }, []);

  const applyZoom = useCallback(async (zoom: number) => {
    try {
      const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({ advanced: [{ zoom } as any] });
          setZoomLevel(zoom);
        }
      }
    } catch (err) {
      console.error('Zoom error:', err);
    }
  }, []);

  const handleQRScan = useCallback(async (decodedText: string) => {
    // Stop scanner first
    isRunningRef.current = false;

    if (decodedText.includes('BEGIN:VCARD') || decodedText.includes('VCARD')) {
      const parsedData = parseVCard(decodedText);
      const existing = findExistingCompany(companies, parsedData.companyName, parsedData.taxNumber);

      if (existing) {
        onExistingCompanyFound(existing, parsedData);
        toast({ description: 'Podjetje že obstaja v bazi!' });
      } else {
        onContactParsed(parsedData);
        toast({ description: 'Podatki iz QR kode uvoženi!' });
      }
    } else {
      toast({ description: 'QR koda ne vsebuje vCard podatkov', variant: 'destructive' });
    }

    // Close scanner after processing
    await closeScanner();
  }, [companies, onContactParsed, onExistingCompanyFound, closeScanner, toast]);

  // Initialize QR scanner when modal opens
  useEffect(() => {
    if (!showQRScanner) return;

    setScannerError(null);
    setZoomLevel(1);
    setZoomSupported(false);

    const timer = setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            // Prevent multiple scans
            if (!isRunningRef.current) return;

            try {
              await html5QrCode.stop();
            } catch (err) {
              // Ignore stop errors
            }
            handleQRScan(decodedText);
          },
          () => {
            // Ignore continuous scan errors
          }
        );

        isRunningRef.current = true;

        // Check zoom support after camera starts
        setTimeout(() => {
          const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities = track.getCapabilities() as any;
              if (capabilities.zoom) {
                setZoomSupported(true);
                setMaxZoom(Math.min(capabilities.zoom.max, 5));
                applyZoom(2);
              }
            }
          }
        }, 500);
      } catch (err) {
        console.error('Camera error:', err);
        setScannerError('Napaka pri dostopu do kamere. Preverite dovoljenja.');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Cleanup on unmount
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().catch(() => {});
        isRunningRef.current = false;
      }
    };
  }, [showQRScanner, handleQRScan, applyZoom]);

  return {
    showQRScanner,
    scannerError,
    zoomLevel,
    maxZoom,
    zoomSupported,
    openScanner,
    closeScanner,
    applyZoom,
  };
}

export default useQRScanner;

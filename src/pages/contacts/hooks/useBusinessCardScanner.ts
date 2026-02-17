/**
 * @file useBusinessCardScanner.ts
 * @description Hook za skeniranje vizitk z AI (camera capture → edge function → review)
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToBase64 } from '@/utils/imageCompression';

export type ProcessingStep = 'idle' | 'capturing' | 'compressing' | 'ocr' | 'matching' | 'done' | 'error';

export interface ExtractedCardData {
  company_name?: string | null;
  branch_name?: string | null;
  person_name?: string | null;
  person_role?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address_street?: string | null;
  address_postal?: string | null;
  address_city?: string | null;
  branch_address_street?: string | null;
  branch_address_postal?: string | null;
  branch_address_city?: string | null;
  tax_number?: string | null;
}

export interface MatchedCompany {
  id?: number;
  tax_number?: string;
  registration_number?: string;
  name?: string;
  address_street?: string;
  address_postal?: string;
  address_city?: string;
  activity_code?: string;
  is_vat_payer?: boolean;
  legal_form?: string;
  similarity_score?: number;
}

export interface ScanResult {
  extracted_data: ExtractedCardData;
  match: {
    matched_company: MatchedCompany | null;
    candidates: MatchedCompany[];
    confidence: 'high' | 'medium' | 'low' | 'none';
    method: string;
    reasoning?: string;
  };
}

export interface UseBusinessCardScannerReturn {
  showScanner: boolean;
  showReview: boolean;
  isProcessing: boolean;
  processingStep: ProcessingStep;
  result: ScanResult | null;
  openScanner: () => void;
  closeScanner: () => void;
  closeReview: () => void;
  processImage: (file: File) => Promise<void>;
  processBase64: (base64: string) => Promise<void>;
}

export function useBusinessCardScanner(): UseBusinessCardScannerReturn {
  const [showScanner, setShowScanner] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);

  const openScanner = useCallback(() => {
    setShowScanner(true);
    setResult(null);
    setProcessingStep('idle');
  }, []);

  const closeScanner = useCallback(() => {
    setShowScanner(false);
    setIsProcessing(false);
    setProcessingStep('idle');
  }, []);

  const closeReview = useCallback(() => {
    setShowReview(false);
    setResult(null);
  }, []);

  const sendToEdgeFunction = useCallback(async (base64: string) => {
    setProcessingStep('ocr');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Ni seje - prijavite se znova');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-business-card`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ image_base64: base64 }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Napaka pri skeniranju');
    }

    setProcessingStep('matching');
    const data: ScanResult = await response.json();

    setResult(data);
    setProcessingStep('done');
    setShowScanner(false);
    setShowReview(true);
  }, []);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProcessingStep('compressing');

    try {
      const base64 = await compressImageToBase64(file);
      await sendToEdgeFunction(base64);
    } catch (error: any) {
      console.error('Business card scan error:', error);
      setProcessingStep('error');
      toast.error(error.message || 'Napaka pri skeniranju vizitke');
    } finally {
      setIsProcessing(false);
    }
  }, [sendToEdgeFunction]);

  const processBase64 = useCallback(async (base64: string) => {
    setIsProcessing(true);

    try {
      await sendToEdgeFunction(base64);
    } catch (error: any) {
      console.error('Business card scan error:', error);
      setProcessingStep('error');
      toast.error(error.message || 'Napaka pri skeniranju vizitke');
    } finally {
      setIsProcessing(false);
    }
  }, [sendToEdgeFunction]);

  return {
    showScanner,
    showReview,
    isProcessing,
    processingStep,
    result,
    openScanner,
    closeScanner,
    closeReview,
    processImage,
    processBase64,
  };
}

export default useBusinessCardScanner;

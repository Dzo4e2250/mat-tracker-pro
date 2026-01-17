import type { QRCode, Cycle, MatType, Company } from "@/integrations/supabase/types";

export type QRCodeWithCycle = QRCode & {
  active_cycle?: Cycle & {
    mat_type?: MatType;
    company?: Company;
  };
};

export interface DirtyMat {
  cycleId: string;
  qrCode: string;
  qrCodeId: string;
  matTypeName: string;
  matTypeCode: string | null;
  companyName: string | null;
  companyAddress: string | null;
  companyLatitude: number | null;
  companyLongitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  status: 'dirty' | 'waiting_driver' | 'on_test';
  pickupRequestedAt: string | null;
  testStartDate: string | null;
  daysOnTest: number;
}

export interface SellerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  code_prefix: string | null;
}

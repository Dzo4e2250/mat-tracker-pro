import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Printer,
  FileDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Package,
  Phone,
  Mail,
  QrCode,
  Clock,
  Truck,
  User,
  MapPin,
  Building2,
  ArrowLeft,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { useProdajalecProfiles } from "@/hooks/useProfiles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QRCode, Cycle, MatType, Company } from "@/integrations/supabase/types";
import * as XLSX from 'xlsx';
import { generateUniqueQRCodes } from '@/lib/utils';

type QRCodeWithCycle = QRCode & {
  active_cycle?: Cycle & {
    mat_type?: MatType;
    company?: Company;
  };
};

interface DirtyMat {
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

export default function SellerPage() {
  const { id: sellerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("qr-kode");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDirtyMats, setSelectedDirtyMats] = useState<Set<string>>(new Set());
  const [confirmSelfDelivery, setConfirmSelfDelivery] = useState<string[] | null>(null);
  const [confirmCreatePickup, setConfirmCreatePickup] = useState<DirtyMat[] | null>(null);
  const [confirmCompletePickup, setConfirmCompletePickup] = useState<string[] | null>(null);
  const [newCodeCount, setNewCodeCount] = useState(1);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);

  // Fetch seller profile
  const { data: sellers = [] } = useProdajalecProfiles();
  const seller = sellers.find(s => s.id === sellerId);

  // Fetch QR codes for this seller
  const { data: qrCodes = [], isLoading: loadingCodes, refetch } = useQuery({
    queryKey: ['seller_qr_codes', sellerId],
    queryFn: async () => {
      if (!sellerId) return [];

      const { data: codes, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', sellerId)
        .order('code');

      if (error) throw error;

      const codesWithCycles: QRCodeWithCycle[] = await Promise.all(
        (codes || []).map(async (code) => {
          const { data: cycle } = await supabase
            .from('cycles')
            .select(`
              *,
              mat_type:mat_types(*),
              company:companies(*)
            `)
            .eq('qr_code_id', code.id)
            .neq('status', 'completed')
            .maybeSingle();

          return {
            ...code,
            active_cycle: cycle || undefined,
          };
        })
      );

      return codesWithCycles;
    },
    enabled: !!sellerId,
  });

  // Fetch orders for this seller
  const { data: orderStats } = useQuery({
    queryKey: ['seller_orders', sellerId],
    queryFn: async () => {
      if (!sellerId) return null;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, notes, created_at')
        .eq('salesperson_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let totalOrdered = 0;
      let pendingOrdered = 0;
      let approvedOrdered = 0;
      let shippedOrdered = 0;

      const orderList = (orders || []).map(order => {
        let quantity = 0;
        if (order.notes) {
          const match = order.notes.match(/Količina:\s*(\d+)/);
          if (match) quantity = parseInt(match[1], 10);
        }

        if (order.status === 'pending') pendingOrdered += quantity;
        else if (order.status === 'approved') approvedOrdered += quantity;
        else if (order.status === 'shipped' || order.status === 'received') shippedOrdered += quantity;

        if (order.status !== 'rejected') totalOrdered += quantity;

        return { ...order, quantity };
      });

      return {
        totalOrdered,
        pendingOrdered,
        approvedOrdered,
        shippedOrdered,
        orders: orderList,
      };
    },
    enabled: !!sellerId,
  });

  // Fetch dirty mats for this seller
  const { data: dirtyMats = [], isLoading: loadingDirty } = useQuery({
    queryKey: ['seller_dirty_mats', sellerId],
    queryFn: async (): Promise<DirtyMat[]> => {
      if (!sellerId) return [];

      const { data: cycles, error } = await supabase
        .from('cycles')
        .select(`
          id,
          status,
          pickup_requested_at,
          test_start_date,
          qr_code_id,
          company_id,
          qr_codes!inner(id, code),
          mat_types(code, name),
          companies(name, address_street, address_city, latitude, longitude),
          contacts(first_name, last_name, phone)
        `)
        .eq('salesperson_id', sellerId)
        .in('status', ['dirty', 'waiting_driver', 'on_test'])
        .order('pickup_requested_at', { ascending: false });

      if (error) throw error;

      // Get company contacts as fallback for cycles without direct contact
      const companyIds = [...new Set((cycles || []).filter(c => c.company_id && !c.contacts).map(c => c.company_id))];
      let companyContacts: Record<string, { first_name: string; last_name: string; phone: string }> = {};

      if (companyIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('company_id, first_name, last_name, phone')
          .in('company_id', companyIds);

        // Use first contact per company as fallback
        (contacts || []).forEach((contact: any) => {
          if (!companyContacts[contact.company_id]) {
            companyContacts[contact.company_id] = contact;
          }
        });
      }

      const now = new Date();
      return (cycles || []).map((cycle: any) => {
        const testStartDate = cycle.test_start_date ? new Date(cycle.test_start_date) : null;
        const daysOnTest = testStartDate
          ? Math.floor((now.getTime() - testStartDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Use direct contact or fallback to company contact
        const contact = cycle.contacts || companyContacts[cycle.company_id];

        return {
          cycleId: cycle.id,
          qrCode: cycle.qr_codes?.code || '',
          qrCodeId: cycle.qr_code_id,
          matTypeName: cycle.mat_types?.name || 'Neznano',
          matTypeCode: cycle.mat_types?.code || null,
          companyName: cycle.companies?.name || null,
          companyAddress: cycle.companies
            ? `${cycle.companies.address_street || ''}, ${cycle.companies.address_city || ''}`.trim()
            : null,
          companyLatitude: cycle.companies?.latitude || null,
          companyLongitude: cycle.companies?.longitude || null,
          contactName: contact
            ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
            : null,
          contactPhone: contact?.phone || null,
          status: cycle.status,
          pickupRequestedAt: cycle.pickup_requested_at,
          testStartDate: cycle.test_start_date,
          daysOnTest,
        };
      });
    },
    enabled: !!sellerId,
  });

  // Self-delivery mutation
  const selfDeliveryMutation = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      // Get cycles with their QR code IDs
      const { data: cycles, error: fetchError } = await supabase
        .from('cycles')
        .select('id, qr_code_id')
        .in('id', cycleIds);

      if (fetchError) throw fetchError;

      const qrCodeIds = cycles?.map(c => c.qr_code_id) || [];

      // Mark cycles as completed with self-delivery note
      const { error: cycleError } = await supabase
        .from('cycles')
        .update({
          status: 'completed',
          driver_pickup_at: new Date().toISOString(),
          notes: 'Lastna dostava',
        })
        .in('id', cycleIds);

      if (cycleError) throw cycleError;

      // Reset QR codes to available
      if (qrCodeIds.length > 0) {
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'available',
            last_reset_at: new Date().toISOString(),
          })
          .in('id', qrCodeIds);

        if (qrError) throw qrError;
      }

      return cycleIds.length;
    },
    onSuccess: (count) => {
      toast({
        title: 'Lastna dostava potrjena',
        description: `${count} predpražnik(ov) označenih kot lastna dostava. QR kode so spet proste.`,
      });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['seller_dirty_mats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedDirtyMats(new Set());
      setConfirmSelfDelivery(null);
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Create pickup mutation
  const createPickupMutation = useMutation({
    mutationFn: async (mats: DirtyMat[]) => {
      const cycleIds = mats.map(m => m.cycleId);

      // Create pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('driver_pickups')
        .insert({
          status: 'pending',
          notes: `Prevzem za ${seller?.first_name} ${seller?.last_name}`,
        })
        .select()
        .single();

      if (pickupError) throw pickupError;

      // Create pickup items
      const items = cycleIds.map(cycleId => ({
        pickup_id: pickup.id,
        cycle_id: cycleId,
        picked_up: false,
      }));

      const { error: itemsError } = await supabase
        .from('driver_pickup_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update cycles to waiting_driver
      const { error: updateError } = await supabase
        .from('cycles')
        .update({
          status: 'waiting_driver',
          pickup_requested_at: new Date().toISOString(),
        })
        .in('id', cycleIds);

      if (updateError) throw updateError;

      return { pickup, mats };
    },
    onSuccess: ({ mats }) => {
      // Determine pickup type based on mat status
      const pickupType = mats.some(m => m.status === 'on_test') ? 'customer' : 'warehouse';

      toast({
        title: 'Prevzem ustvarjen',
        description: pickupType === 'customer'
          ? 'Nalog za prevzem od strank ustvarjen. Odpira se dokument...'
          : 'Nalog za prevzem iz skladišča ustvarjen. Odpira se dokument...',
      });
      queryClient.invalidateQueries({ queryKey: ['seller_dirty_mats'] });
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedDirtyMats(new Set());
      setConfirmCreatePickup(null);

      // Generate PDF for driver
      generateDriverPickupPDF(mats, pickupType);
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Complete pickup mutation - marks cycles as completed and resets QR codes
  const completePickupMutation = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      // Get cycles with their QR code IDs
      const { data: cycles, error: fetchError } = await supabase
        .from('cycles')
        .select('id, qr_code_id')
        .in('id', cycleIds);

      if (fetchError) throw fetchError;

      const qrCodeIds = cycles?.map(c => c.qr_code_id) || [];

      // Mark cycles as completed
      const { error: cycleError } = await supabase
        .from('cycles')
        .update({
          status: 'completed',
          driver_pickup_at: new Date().toISOString(),
        })
        .in('id', cycleIds);

      if (cycleError) throw cycleError;

      // Reset QR codes to available
      if (qrCodeIds.length > 0) {
        const { error: qrError } = await supabase
          .from('qr_codes')
          .update({
            status: 'available',
            last_reset_at: new Date().toISOString(),
          })
          .in('id', qrCodeIds);

        if (qrError) throw qrError;
      }

      return cycleIds.length;
    },
    onSuccess: (count) => {
      toast({
        title: 'Prevzem zaključen',
        description: `${count} predpražnik(ov) pobrano. QR kode so spet proste.`,
      });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['seller_dirty_mats'] });
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedDirtyMats(new Set());
      setConfirmCompletePickup(null);
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Send email warning mutation - sends all long test mats
  const sendEmailWarningMutation = useMutation({
    mutationFn: async (mats: DirtyMat[]) => {
      if (!seller?.email) {
        throw new Error('Prodajalec nima nastavljenega emaila');
      }

      if (mats.length === 0) {
        throw new Error('Ni predpražnikov za opozorilo');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Niste prijavljeni');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-warning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sellerEmail: seller.email,
            sellerName: `${seller.first_name} ${seller.last_name}`,
            mats: mats.map(mat => ({
              qrCode: mat.qrCode,
              companyName: mat.companyName,
              companyAddress: mat.companyAddress,
              matTypeName: mat.matTypeName,
              daysOnTest: mat.daysOnTest,
            })),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Napaka pri pošiljanju emaila');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Email poslan',
        description: `Opozorilo za ${data.count} predpražnik(ov) poslano na ${seller?.email}`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Create new QR codes mutation
  const createCodesMutation = useMutation({
    mutationFn: async ({ prefix, count, ownerId }: { prefix: string; count: number; ownerId: string }) => {
      // Get all existing codes to ensure uniqueness
      const { data: existingCodes } = await supabase
        .from('qr_codes')
        .select('code')
        .like('code', `${prefix}-%`);

      const existingSet = new Set((existingCodes || []).map(c => c.code));

      // Generate unique random codes
      const newCodeStrings = generateUniqueQRCodes(prefix, count, existingSet);

      if (newCodeStrings.length < count) {
        throw new Error(`Uspelo je generirati samo ${newCodeStrings.length} od ${count} kod`);
      }

      const newCodes = newCodeStrings.map(code => ({
        code,
        owner_id: ownerId,
        status: 'available' as const,
      }));

      const { data, error } = await supabase.from('qr_codes').insert(newCodes).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Uspeh', description: `Ustvarjenih ${data.length} novih QR kod` });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      setNewCodeCount(1);
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Delete QR code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase.from('qr_codes').delete().eq('id', codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Uspeh', description: 'QR koda izbrisana' });
      queryClient.invalidateQueries({ queryKey: ['seller_qr_codes', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      setConfirmDeleteCode(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Napaka', description: error.message, variant: 'destructive' });
    },
  });

  // Handler for adding codes
  const handleAddCodes = () => {
    if (!sellerId || !seller?.code_prefix) {
      toast({
        title: 'Napaka',
        description: 'Prodajalec nima nastavljene predpone',
        variant: 'destructive',
      });
      return;
    }

    createCodesMutation.mutate({
      prefix: seller.code_prefix,
      count: newCodeCount,
      ownerId: sellerId,
    });
  };

  // Generate driver pickup PDF
  const generateDriverPickupPDF = (mats: DirtyMat[], pickupType: 'customer' | 'warehouse') => {
    const today = new Date().toLocaleDateString('sl-SI', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const isCustomerPickup = pickupType === 'customer';
    const documentTitle = isCustomerPickup
      ? '📦 Nalog za prevzem OD STRANK'
      : '🏭 Nalog za prevzem IZ SKLADIŠČA';
    const headerColor = isCustomerPickup ? '#1a73e8' : '#f97316';

    const getGoogleMapsUrl = (mat: DirtyMat) => {
      if (mat.companyLatitude && mat.companyLongitude) {
        return `https://www.google.com/maps/search/?api=1&query=${mat.companyLatitude},${mat.companyLongitude}`;
      } else if (mat.companyAddress) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mat.companyAddress)}`;
      }
      return null;
    };

    let itemsHtml: string;

    if (isCustomerPickup) {
      // Customer pickup - show addresses and contacts
      itemsHtml = mats.map((mat, index) => {
        const mapsUrl = getGoogleMapsUrl(mat);
        const coords = mat.companyLatitude && mat.companyLongitude
          ? `${mat.companyLatitude.toFixed(6)}, ${mat.companyLongitude.toFixed(6)}`
          : 'Ni koordinat';

        return `
          <div style="page-break-inside: avoid; border: 2px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <span style="font-size: 24px; font-weight: bold; font-family: monospace; background: #e5e5e5; padding: 5px 10px; border-radius: 4px;">${mat.qrCode}</span>
                <span style="margin-left: 10px; color: #666;">${mat.matTypeCode || mat.matTypeName}</span>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 18px; font-weight: bold;">#${index + 1}</span>
              </div>
            </div>

            <div style="margin: 15px 0; padding: 10px; background: #fff; border-radius: 4px;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">
                🏢 ${mat.companyName || 'Neznana stranka'}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 16px;">
                📍 ${mat.companyAddress || 'Naslov ni znan'}
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                🌐 Koordinate: ${coords}
              </p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
              <div>
                ${mat.contactName ? `<p style="margin: 0 0 5px 0;"><strong>👤 Kontakt:</strong> ${mat.contactName}</p>` : ''}
                ${mat.contactPhone ? `<p style="margin: 0;"><strong>📞 Telefon:</strong> <a href="tel:${mat.contactPhone}">${mat.contactPhone}</a></p>` : ''}
              </div>
              <div style="border: 2px solid #333; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                ☐
              </div>
            </div>

            ${mapsUrl ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
              <a href="${mapsUrl}" style="color: #1a73e8; text-decoration: none; font-size: 12px;">
                🗺️ Odpri v Google Maps
              </a>
            </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } else {
      // Warehouse pickup - simpler format
      itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 2px solid #333; padding: 12px; text-align: center; width: 50px;">#</th>
              <th style="border: 2px solid #333; padding: 12px; text-align: left;">QR Koda</th>
              <th style="border: 2px solid #333; padding: 12px; text-align: left;">Tip</th>
              <th style="border: 2px solid #333; padding: 12px; text-align: center; width: 80px;">Pobrano</th>
            </tr>
          </thead>
          <tbody>
            ${mats.map((mat, index) => `
              <tr>
                <td style="border: 2px solid #333; padding: 12px; text-align: center; font-weight: bold;">${index + 1}</td>
                <td style="border: 2px solid #333; padding: 12px; font-family: monospace; font-size: 18px; font-weight: bold;">${mat.qrCode}</td>
                <td style="border: 2px solid #333; padding: 12px;">${mat.matTypeCode || mat.matTypeName}</td>
                <td style="border: 2px solid #333; padding: 12px; text-align: center;">
                  <span style="font-size: 24px;">☐</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Generate all-locations Google Maps URL (only for customer pickup)
    let multiStopUrl: string | null = null;
    if (isCustomerPickup) {
      const allAddresses = mats
        .filter(m => m.companyAddress || (m.companyLatitude && m.companyLongitude))
        .map(m => {
          if (m.companyLatitude && m.companyLongitude) {
            return `${m.companyLatitude},${m.companyLongitude}`;
          }
          return encodeURIComponent(m.companyAddress!);
        });

      multiStopUrl = allAddresses.length > 0
        ? `https://www.google.com/maps/dir/${allAddresses.join('/')}`
        : null;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="sl">
      <head>
        <meta charset="UTF-8">
        <title>${isCustomerPickup ? 'Prevzem od strank' : 'Prevzem iz skladišča'} - ${today}</title>
        <style>
          @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none !important; }
            a { color: #333 !important; }
          }
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1 { margin-bottom: 5px; color: ${headerColor}; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .summary {
            background: ${isCustomerPickup ? '#e3f2fd' : '#fff3e0'};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid ${headerColor};
          }
          .print-btn {
            background: ${headerColor};
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
          }
          .print-btn:hover { opacity: 0.9; }
          .type-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
            background: ${headerColor};
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button class="print-btn" onclick="window.print()">🖨️ Natisni</button>
          ${multiStopUrl ? `<a href="${multiStopUrl}" target="_blank" class="print-btn" style="text-decoration: none; display: inline-block;">🗺️ Odpri vse lokacije v Maps</a>` : ''}
        </div>

        <div class="type-badge">${isCustomerPickup ? 'PREVZEM OD STRANK' : 'PREVZEM IZ SKLADIŠČA'}</div>
        <h1>${documentTitle}</h1>
        <p class="subtitle">
          <strong>Datum:</strong> ${today}<br>
          <strong>Prodajalec:</strong> ${seller?.first_name} ${seller?.last_name}
        </p>

        <div class="summary">
          <strong>Število predpražnikov:</strong> ${mats.length}<br>
          ${isCustomerPickup
            ? `<strong>Lokacije:</strong> ${new Set(mats.map(m => m.companyName).filter(Boolean)).size} različnih strank`
            : `<strong>Lokacija:</strong> Skladišče prodajalca`
          }
        </div>

        <h2>Seznam za prevzem:</h2>
        ${itemsHtml}

        <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <p style="margin: 0 0 10px 0;"><strong>Podpis šoferja:</strong> _______________________</p>
          <p style="margin: 0;"><strong>Datum/Ura prevzema:</strong> _______________________</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #333;">
          <p style="color: #666; font-size: 12px;">
            Dokument generiran: ${new Date().toLocaleString('sl-SI')}<br>
            Mat Tracker Pro - Lindstrom Group
          </p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  };

  // Filter helpers - check active_cycle FIRST, then qr_code status
  const getCodeStatus = (code: QRCodeWithCycle): string => {
    // First check if there's an active cycle - this takes priority
    if (code.active_cycle) return code.active_cycle.status;
    // Then check QR code status
    if (code.status === 'pending') return 'pending';
    if (code.status === 'available') return 'available';
    return 'active';
  };

  // Stats - based on actual status
  const stats = useMemo(() => ({
    total: qrCodes.length,
    available: qrCodes.filter(c => !c.active_cycle && c.status === 'available').length,
    pending: qrCodes.filter(c => c.status === 'pending').length,
    active: qrCodes.filter(c => c.status === 'active' && !c.active_cycle).length,
    onTest: qrCodes.filter(c => c.active_cycle?.status === 'on_test').length,
    dirty: qrCodes.filter(c => c.active_cycle?.status === 'dirty').length,
    waitingPickup: qrCodes.filter(c => c.active_cycle?.status === 'waiting_driver').length,
    clean: qrCodes.filter(c => c.active_cycle?.status === 'clean').length,
  }), [qrCodes]);

  const filteredCodes = qrCodes.filter(code => {
    if (filterStatus === 'all') return true;
    return getCodeStatus(code) === filterStatus;
  });

  const getStatusBadge = (code: QRCodeWithCycle) => {
    // First check if there's an active cycle - this takes priority
    if (code.active_cycle) {
      const cycleStatus = code.active_cycle.status;
      switch (cycleStatus) {
        case 'clean': return <Badge className="bg-blue-500">Čista</Badge>;
        case 'on_test': return <Badge className="bg-yellow-500">Na testu</Badge>;
        case 'dirty': return <Badge className="bg-orange-500">Umazana</Badge>;
        case 'waiting_driver': return <Badge className="bg-purple-500">Čaka prevzem</Badge>;
        default: return <Badge variant="outline">{cycleStatus}</Badge>;
      }
    }
    // Then check QR code status
    if (code.status === 'pending') return <Badge variant="secondary">Naročena</Badge>;
    if (code.status === 'available') return <Badge className="bg-green-500">Prosta</Badge>;
    return <Badge variant="secondary">Aktivna</Badge>;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'pending': 'Naročena', 'available': 'Prosta', 'active': 'Aktivna',
      'clean': 'Čista', 'on_test': 'Na testu', 'dirty': 'Umazana',
      'waiting_driver': 'Čaka prevzem', 'completed': 'Zaključena',
    };
    return labels[status] || status;
  };

  // Dirty mats filtering
  const dirtyMatsOnly = dirtyMats.filter(m => m.status === 'dirty');
  const waitingDriverMats = dirtyMats.filter(m => m.status === 'waiting_driver');
  const longTestMats = dirtyMats.filter(m => m.status === 'on_test' && m.daysOnTest >= 20);

  // Selection handlers
  const toggleDirtyMat = (cycleId: string) => {
    setSelectedDirtyMats(prev => {
      const next = new Set(prev);
      next.has(cycleId) ? next.delete(cycleId) : next.add(cycleId);
      return next;
    });
  };

  const selectAllDirty = () => {
    setSelectedDirtyMats(new Set(dirtyMatsOnly.map(m => m.cycleId)));
  };

  // Print handler
  const handlePrintList = () => {
    if (!seller) return;
    const sellerName = `${seller.first_name} ${seller.last_name}`;

    const printContent = `
      <!DOCTYPE html>
      <html lang="sl">
        <head>
          <meta charset="UTF-8">
          <title>Seznam QR kod - ${sellerName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .comparison { margin: 15px 0; padding: 12px; background: #e8f4fd; border-radius: 8px; }
            .match { color: #16a34a; } .mismatch { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Seznam QR kod</h1>
          <div class="meta">
            <strong>Prodajalec:</strong> ${sellerName} (${seller.code_prefix || 'N/A'})<br>
            <strong>Datum:</strong> ${new Date().toLocaleDateString('sl-SI')}
          </div>
          ${orderStats ? `
          <div class="comparison">
            <strong>Primerjava:</strong> Naročeno: ${orderStats.approvedOrdered + orderStats.shippedOrdered} | Aktivirano: ${stats.total - stats.available}
            ${(stats.total - stats.available) === (orderStats.approvedOrdered + orderStats.shippedOrdered)
              ? '<span class="match"> ✓ Ujema se</span>'
              : `<span class="mismatch"> ⚠ Razlika: ${(stats.total - stats.available) - (orderStats.approvedOrdered + orderStats.shippedOrdered)}</span>`}
          </div>
          ` : ''}
          <div class="summary">
            Skupaj: ${stats.total} | Proste: ${stats.available} | Na testu: ${stats.onTest} | Umazane: ${stats.dirty} | Čaka prevzem: ${stats.waitingPickup}
          </div>
          <table>
            <thead><tr><th>#</th><th>QR Koda</th><th>Status</th><th>Tip</th><th>Podjetje</th></tr></thead>
            <tbody>
              ${filteredCodes.map((code, i) => {
                const status = getCodeStatus(code);
                const isDirty = status === 'dirty' || status === 'waiting_driver';
                const companyName = code.active_cycle?.company?.name || '-';
                return `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${code.code}</strong></td>
                  <td>${getStatusLabel(status)}</td>
                  <td>${code.active_cycle?.mat_type?.code || code.active_cycle?.mat_type?.name || '-'}</td>
                  <td>${isDirty ? `<span style="text-decoration: line-through; color: #999;">${companyName}</span>` : companyName}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([printContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => { printWindow.print(); URL.revokeObjectURL(url); };
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    if (!seller) return;

    const exportData = filteredCodes.map(code => ({
      'QR Koda': code.code,
      'Status': getStatusLabel(getCodeStatus(code)),
      'Tip predpražnika': code.active_cycle?.mat_type?.code || code.active_cycle?.mat_type?.name || '-',
      'Podjetje': code.active_cycle?.company?.name || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QR Kode");

    const fileName = `${seller.first_name}_${seller.last_name}_QR_kode_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Uspeh", description: "Excel datoteka prenesena" });
  };

  if (!seller) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <InventarSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/inventar')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold">{seller.first_name} {seller.last_name}</h1>
                    {seller.code_prefix && (
                      <Badge variant="outline" className="font-mono text-lg px-3">
                        {seller.code_prefix}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                    {seller.phone && (
                      <a href={`tel:${seller.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="h-4 w-4" /> {seller.phone}
                      </a>
                    )}
                    {seller.email && (
                      <a href={`mailto:${seller.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="h-4 w-4" /> {seller.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportToExcel} variant="outline">
                  <FileDown className="h-4 w-4 mr-2" /> Izvozi
                </Button>
                <Button onClick={handlePrintList} variant="outline">
                  <Printer className="h-4 w-4 mr-2" /> Natisni
                </Button>
                <Button onClick={() => refetch()} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" /> Osveži
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Skupaj</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                  <p className="text-sm text-muted-foreground">Proste</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-yellow-600">{stats.onTest}</p>
                  <p className="text-sm text-muted-foreground">Na testu</p>
                </CardContent>
              </Card>
              <Card className={stats.dirty > 0 ? "bg-orange-50 border-orange-300" : ""}>
                <CardContent className="pt-4">
                  <p className={`text-2xl font-bold ${stats.dirty > 0 ? 'text-orange-600' : ''}`}>{stats.dirty}</p>
                  <p className="text-sm text-muted-foreground">Umazane</p>
                </CardContent>
              </Card>
              <Card className={stats.waitingPickup > 0 ? "bg-purple-50 border-purple-300" : ""}>
                <CardContent className="pt-4">
                  <p className={`text-2xl font-bold ${stats.waitingPickup > 0 ? 'text-purple-600' : ''}`}>{stats.waitingPickup}</p>
                  <p className="text-sm text-muted-foreground">Čaka šoferja</p>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="pt-4">
                  {orderStats ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Naročeno vs Aktivirano</p>
                        <p className="text-lg font-semibold">
                          {orderStats.approvedOrdered + orderStats.shippedOrdered} / {stats.total - stats.available}
                        </p>
                      </div>
                      {(stats.total - stats.available) === (orderStats.approvedOrdered + orderStats.shippedOrdered) ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Ni naročil</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="qr-kode" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> QR Kode ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="ukrepanje" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Za ukrepanje ({dirtyMatsOnly.length + waitingDriverMats.length + longTestMats.length})
                </TabsTrigger>
                <TabsTrigger value="narocila" className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Naročila
                </TabsTrigger>
              </TabsList>

              {/* QR Kode Tab */}
              <TabsContent value="qr-kode" className="mt-4 space-y-4">
                {/* Add new codes section */}
                {seller?.code_prefix && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Dodaj nove kode
                      </CardTitle>
                      <CardDescription>
                        Ustvari naključne kode v formatu {seller.code_prefix}-XXXX
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setNewCodeCount(Math.max(1, newCodeCount - 1))}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={newCodeCount}
                            onChange={(e) => setNewCodeCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                            className="text-center w-20"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setNewCodeCount(Math.min(100, newCodeCount + 1))}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          onClick={handleAddCodes}
                          disabled={createCodesMutation.isPending}
                        >
                          {createCodesMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Generiraj {newCodeCount} {newCodeCount === 1 ? 'kodo' : 'kod'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* QR codes grid */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>QR Kode</CardTitle>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter po statusu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Vse ({stats.total})</SelectItem>
                          <SelectItem value="available">Proste ({stats.available})</SelectItem>
                          <SelectItem value="on_test">Na testu ({stats.onTest})</SelectItem>
                          <SelectItem value="dirty">Umazane ({stats.dirty})</SelectItem>
                          <SelectItem value="waiting_driver">Čaka prevzem ({stats.waitingPickup})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingCodes ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : filteredCodes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Ni kod za prikaz</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {filteredCodes.map((code) => (
                          <div
                            key={code.id}
                            className={`p-3 border rounded-lg text-center relative group ${
                              code.status === 'available' ? 'bg-green-50 border-green-300' :
                              code.active_cycle?.status === 'on_test' ? 'bg-yellow-50 border-yellow-300' :
                              code.active_cycle?.status === 'dirty' ? 'bg-orange-50 border-orange-300' :
                              code.active_cycle?.status === 'waiting_driver' ? 'bg-purple-50 border-purple-300' :
                              'bg-gray-50'
                            }`}
                          >
                            {/* Delete button for available codes */}
                            {code.status === 'available' && !code.active_cycle && (
                              <button
                                onClick={() => setConfirmDeleteCode(code.id)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Izbriši kodo"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            {code.active_cycle?.mat_type && (
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
                                {code.active_cycle.mat_type.code || code.active_cycle.mat_type.name}
                              </div>
                            )}
                            <p className="font-mono text-sm font-semibold mb-1 mt-1">{code.code}</p>
                            {getStatusBadge(code)}
                            {code.active_cycle?.company && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {code.active_cycle.company.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Za ukrepanje Tab */}
              <TabsContent value="ukrepanje" className="mt-4 space-y-4">
                {/* Dirty Mats */}
                <Card className={dirtyMatsOnly.length > 0 ? "border-orange-300" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Umazane preproge ({dirtyMatsOnly.length})
                      </CardTitle>
                      {dirtyMatsOnly.length > 0 && (
                        <div className="flex items-center gap-2">
                          {selectedDirtyMats.size > 0 ? (
                            <>
                              <Badge variant="secondary">{selectedDirtyMats.size} izbranih</Badge>
                              <Button size="sm" variant="outline" onClick={() => setSelectedDirtyMats(new Set())}>
                                Počisti
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-600"
                                onClick={() => setConfirmCreatePickup(dirtyMatsOnly.filter(m => selectedDirtyMats.has(m.cycleId)))}
                              >
                                <Truck className="h-4 w-4 mr-1" /> Ustvari prevzem
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setConfirmSelfDelivery(Array.from(selectedDirtyMats))}
                              >
                                <User className="h-4 w-4 mr-1" /> Lastna dostava
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={selectAllDirty}>
                              Izberi vse
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingDirty ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : dirtyMatsOnly.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                        <p>Ni umazanih preprog</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedDirtyMats.size === dirtyMatsOnly.length && dirtyMatsOnly.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) selectAllDirty();
                                  else setSelectedDirtyMats(new Set());
                                }}
                              />
                            </TableHead>
                            <TableHead>QR Koda</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Podjetje</TableHead>
                            <TableHead>Kontakt</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Akcije</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dirtyMatsOnly.map((mat) => (
                            <TableRow key={mat.cycleId}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedDirtyMats.has(mat.cycleId)}
                                  onCheckedChange={() => toggleDirtyMat(mat.cycleId)}
                                />
                              </TableCell>
                              <TableCell className="font-mono font-semibold">{mat.qrCode}</TableCell>
                              <TableCell>{mat.matTypeCode || mat.matTypeName}</TableCell>
                              <TableCell>
                                {mat.companyName && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-gray-400" />
                                    {mat.companyName}
                                  </div>
                                )}
                                {mat.companyAddress && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" /> {mat.companyAddress}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {mat.contactName && <div className="text-sm">{mat.contactName}</div>}
                                {mat.contactPhone && (
                                  <a href={`tel:${mat.contactPhone}`} className="flex items-center gap-1 text-xs text-blue-600">
                                    <Phone className="h-3 w-3" /> {mat.contactPhone}
                                  </a>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">Umazana</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => setConfirmSelfDelivery([mat.cycleId])}
                                  >
                                    <User className="h-3 w-3" />
                                  </Button>
                                  {mat.status === 'dirty' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-purple-600 hover:text-purple-700"
                                      onClick={() => setConfirmCreatePickup([mat])}
                                    >
                                      <Truck className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Waiting for Driver Mats */}
                {waitingDriverMats.length > 0 && (
                  <Card className="border-purple-300 bg-purple-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-purple-800">
                            <Truck className="h-5 w-5" />
                            Čaka šoferja ({waitingDriverMats.length})
                          </CardTitle>
                          <CardDescription>Predpražniki pripravljeni za prevzem</CardDescription>
                        </div>
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => setConfirmCompletePickup(waitingDriverMats.map(m => m.cycleId))}
                          disabled={completePickupMutation.isPending}
                        >
                          {completePickupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Potrdi prevzem vseh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>QR Koda</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Akcije</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {waitingDriverMats.map((mat) => (
                            <TableRow key={mat.cycleId}>
                              <TableCell className="font-mono font-semibold">{mat.qrCode}</TableCell>
                              <TableCell>{mat.matTypeCode || mat.matTypeName}</TableCell>
                              <TableCell>
                                <Badge className="bg-purple-100 text-purple-800">Čaka šoferja</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => setConfirmCompletePickup([mat.cycleId])}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" /> Pobrano
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Long Test Mats */}
                {longTestMats.length > 0 && (
                  <Card className="border-yellow-300 bg-yellow-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-yellow-800">
                            <Clock className="h-5 w-5" />
                            Dolgo na testu ({longTestMats.length})
                          </CardTitle>
                          <CardDescription>Preproge na testu več kot 20 dni</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          className="bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
                          onClick={() => sendEmailWarningMutation.mutate(longTestMats)}
                          disabled={sendEmailWarningMutation.isPending || !seller?.email}
                        >
                          {sendEmailWarningMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4 mr-2" />
                          )}
                          Pošlji opozorilo
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>QR Koda</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Podjetje</TableHead>
                            <TableHead>Kontakt</TableHead>
                            <TableHead>Dni na testu</TableHead>
                            <TableHead>Akcije</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {longTestMats.map((mat) => (
                            <TableRow key={mat.cycleId}>
                              <TableCell className="font-mono">{mat.qrCode}</TableCell>
                              <TableCell>{mat.matTypeCode || mat.matTypeName}</TableCell>
                              <TableCell>{mat.companyName || '-'}</TableCell>
                              <TableCell>
                                {mat.contactPhone ? (
                                  <a href={`tel:${mat.contactPhone}`} className="flex items-center gap-1 text-blue-600">
                                    <Phone className="h-3 w-3" /> {mat.contactPhone}
                                  </a>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={mat.daysOnTest >= 25 ? 'destructive' : 'secondary'}
                                  className={mat.daysOnTest < 25 ? 'bg-yellow-200 text-yellow-800' : ''}>
                                  {mat.daysOnTest} dni
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-purple-600 hover:text-purple-700"
                                    title="Šofer bo prevzel"
                                    onClick={() => setConfirmCreatePickup([mat])}
                                  >
                                    <Truck className="h-3 w-3 mr-1" /> Šofer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700"
                                    title="Lastna dostava"
                                    onClick={() => setConfirmSelfDelivery([mat.cycleId])}
                                  >
                                    <User className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Naročila Tab */}
              <TabsContent value="narocila" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Naročila</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderStats?.orders && orderStats.orders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Datum</TableHead>
                            <TableHead>Količina</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderStats.orders.map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                {new Date(order.created_at).toLocaleDateString('sl-SI')}
                              </TableCell>
                              <TableCell className="font-semibold">{order.quantity}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  order.status === 'pending' ? 'secondary' :
                                  order.status === 'approved' ? 'default' :
                                  order.status === 'shipped' ? 'default' :
                                  order.status === 'rejected' ? 'destructive' : 'outline'
                                }>
                                  {order.status === 'pending' ? 'Čaka odobritev' :
                                   order.status === 'approved' ? 'Odobreno' :
                                   order.status === 'shipped' ? 'Poslano' :
                                   order.status === 'rejected' ? 'Zavrnjeno' : order.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Ni naročil</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Self-delivery Confirmation */}
      <AlertDialog open={!!confirmSelfDelivery} onOpenChange={() => setConfirmSelfDelivery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrdi lastno dostavo</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da bo prodajalec sam dostavil {confirmSelfDelivery?.length} predpražnik(ov)?
              QR kode bodo postale spet proste za uporabo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmSelfDelivery && selfDeliveryMutation.mutate(confirmSelfDelivery)}
              disabled={selfDeliveryMutation.isPending}
            >
              {selfDeliveryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Potrdi lastno dostavo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Pickup Confirmation */}
      <AlertDialog open={!!confirmCreatePickup} onOpenChange={() => setConfirmCreatePickup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ustvari nalog za dostavljalca</AlertDialogTitle>
            <AlertDialogDescription>
              Ali želite ustvariti nalog za prevzem {confirmCreatePickup?.length} predpražnik(ov)?
              Po potrditvi se bo odprl dokument za dostavljalca z naslovi in kontakti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCreatePickup && createPickupMutation.mutate(confirmCreatePickup)}
              disabled={createPickupMutation.isPending}
            >
              {createPickupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ustvari nalog
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Code Confirmation */}
      <AlertDialog open={!!confirmDeleteCode} onOpenChange={() => setConfirmDeleteCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši QR kodo</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite izbrisati to QR kodo? Ta akcija je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDeleteCode && deleteCodeMutation.mutate(confirmDeleteCode)}
              disabled={deleteCodeMutation.isPending}
            >
              {deleteCodeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Pickup Confirmation */}
      <AlertDialog open={!!confirmCompletePickup} onOpenChange={() => setConfirmCompletePickup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrdi prevzem</AlertDialogTitle>
            <AlertDialogDescription>
              Ali potrjujete, da je šofer pobral {confirmCompletePickup?.length} predpražnik(ov)?
              QR kode bodo sproščene in na voljo za ponovno uporabo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmCompletePickup && completePickupMutation.mutate(confirmCompletePickup)}
              disabled={completePickupMutation.isPending}
            >
              {completePickupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Potrdi prevzem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

/**
 * @file Contacts.tsx
 * @description Glavna CRM stran za upravljanje strank in kontaktov
 *
 * Ta datoteka je "srce" Mat Tracker Pro aplikacije - CRM modul za prodajalce.
 * Vsebuje celotno logiko za:
 * - Pregledovanje in iskanje strank
 * - Dodajanje novih strank (ročno ali preko QR kode)
 * - Upravljanje kontaktov (dodajanje, urejanje, brisanje)
 * - Pošiljanje ponudb (najem, nakup, primerjava, dodatna)
 * - Opombe in opomniki za stranke
 * - Izvoz kontaktov v vCard format
 * - Načrtovanje poti (Google Maps)
 *
 * @author Mat Tracker Pro Team
 * @version 2.0
 * @since 2025-01
 *
 * @see ARCHITECTURE.md za pregled celotne arhitekture
 * @see IMPROVEMENT_PLAN.md za načrt refaktoriranja te datoteke
 *
 * OPOMBA: Ta datoteka ima ~5000 vrstic in je kandidat za refaktoring.
 * Priporočeno je, da se razdeli na manjše komponente (glej IMPROVEMENT_PLAN.md).
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Phone, MessageSquare, Mail, MapPin, Plus, ChevronRight, Home, Camera, Users, Building2, User, X, Trash2, Package, Calendar, CheckCircle, Clock, FileText, Euro, ChevronDown, MoreVertical, Download, Check, Square, CheckSquare, FileSignature, StickyNote, QrCode, Bell, AlertTriangle, Filter, Pencil } from 'lucide-react';
import { useDueReminders, useContractPendingCompanies, useCreateReminder, useCompleteReminder, useUpdatePipelineStatus, PIPELINE_STATUSES, type ReminderWithCompany } from '@/hooks/useReminders';
import { Html5Qrcode } from 'html5-qrcode';
import { useCompanyContacts, useCompanyDetails, useCreateCompany, useAddContact, useUpdateCompany, useUpdateContact, useDeleteContact, CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CompanyNote } from '@/integrations/supabase/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getCityByPostalCode } from '@/utils/postalCodes';
import { lookupCompanyByTaxNumber, isValidTaxNumberFormat } from '@/utils/companyLookup';
import ContractModal from '@/components/ContractModal';
import {
  getRentalPrice, getPurchasePrice, getReplacementCost, getDimensions, getPriceByCode,
  STANDARD_TYPES, DESIGN_SIZES, calculateM2FromDimensions, calculateCustomPrice, calculateCustomPurchasePrice,
  FrequencyKey
} from '@/utils/priceList';

// Ekstrahirane komponente
import { TodaySection, SelectionModeBar, UrgentReminders } from '@/pages/contacts/components';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * Tip artikla v ponudbi
 * - standard: Preddefinirane velikosti iz cenika
 * - design: Design predpražniki (s potiskom)
 * - custom: Po meri (poljubne dimenzije)
 */
type ItemType = 'standard' | 'design' | 'custom';

/**
 * Namen artikla v ponudbi (za tip "dodatna")
 * - najem: Artikel za najem z menjavami
 * - nakup: Artikel za nakup brez menjav
 */
type ItemPurpose = 'najem' | 'nakup';

/**
 * Struktura posameznega artikla v ponudbi
 * Podpira tako navadne kot sezonske cene
 */
type OfferItem = {
  id: string;
  itemType: ItemType;
  purpose?: ItemPurpose; // ali gre za najem ali nakup (samo za primerjava/dodatna)
  code: string;
  name: string;
  size: string;
  m2?: number;
  customized: boolean;
  quantity: number;
  pricePerUnit: number;
  originalPrice?: number;
  discount?: number;
  // For najem only
  seasonal?: boolean;
  // Normalno obdobje
  normalFromWeek?: number;
  normalToWeek?: number;
  normalFrequency?: string; // frekvenca menjave za normalno obdobje
  normalPrice?: number; // cena na teden za normalno obdobje
  normalOriginalPrice?: number;
  normalDiscount?: number;
  // Sezonsko obdobje
  seasonalFromWeek?: number;
  seasonalToWeek?: number;
  seasonalFrequency?: string; // frekvenca menjave za sezonsko obdobje
  seasonalPrice?: number;
  seasonalOriginalPrice?: number;
  seasonalDiscount?: number;
  replacementCost?: number;
};

// Tedni 1-52 z mesecem v oklepaju
const getMonthForWeek = (week: number): string => {
  const months = ['Jan', 'Jan', 'Jan', 'Jan', 'Feb', 'Feb', 'Feb', 'Feb', 'Mar', 'Mar', 'Mar', 'Mar', 'Mar',
    'Apr', 'Apr', 'Apr', 'Apr', 'Maj', 'Maj', 'Maj', 'Maj', 'Jun', 'Jun', 'Jun', 'Jun',
    'Jul', 'Jul', 'Jul', 'Jul', 'Jul', 'Avg', 'Avg', 'Avg', 'Avg', 'Sep', 'Sep', 'Sep', 'Sep',
    'Okt', 'Okt', 'Okt', 'Okt', 'Nov', 'Nov', 'Nov', 'Nov', 'Nov', 'Dec', 'Dec', 'Dec', 'Dec', 'Dec'];
  return months[week - 1] || '';
};
const WEEKS = Array.from({ length: 52 }, (_, i) => ({
  value: i + 1,
  label: `Teden ${i + 1} (${getMonthForWeek(i + 1)})`
}));

/** Filter za prikaz strank glede na status cikla */
type FilterType = 'all' | 'active' | 'signed' | 'inactive' | 'overdue';

// ============================================================================
// HELPER FUNCTIONS (izven komponente)
// ============================================================================

/**
 * Preveri ali je cikel predpražnika v zamudi
 * Test je v zamudi če traja več kot 14 dni
 * @param cycle - Cikel predpražnika iz baze
 * @returns true če je test v zamudi
 */
const isTestOverdue = (cycle: any): boolean => {
  if (cycle.status !== 'on_test' || !cycle.test_start_date) return false;
  const testStart = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - testStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 14;
};

/**
 * Izračuna število dni zamude za test
 * @param cycle - Cikel predpražnika
 * @returns Število dni čez 14-dnevni limit (0 če ni zamude)
 */
const getDaysOverdue = (cycle: any): number => {
  if (cycle.status !== 'on_test' || !cycle.test_start_date) return 0;
  const testStart = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - testStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff - 14);
};

// ============================================================================
// GLAVNA KOMPONENTA
// ============================================================================

/**
 * Contacts - Glavna CRM stran za prodajalce
 *
 * Funkcionalnosti:
 * 1. Seznam strank z iskanjem in filtriranjem
 * 2. "Danes" sekcija - sestanki in roki za danes
 * 3. Opomniki in nujne naloge
 * 4. Dodajanje strank (ročno ali QR skeniranje vizitk)
 * 5. Upravljanje kontaktov za posamezno stranko
 * 6. Kreiranje in pošiljanje ponudb
 * 7. Opombe (CRM dnevnik) za vsako stranko
 * 8. Izvoz kontaktov v vCard format
 * 9. Načrtovanje poti za obiske
 *
 * @returns JSX.Element - CRM stran
 */
export default function Contacts() {
  // --------------------------------------------------------------------------
  // HOOKS & NAVIGATION
  // --------------------------------------------------------------------------
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // --------------------------------------------------------------------------
  // DATA FETCHING - React Query hooks za pridobivanje podatkov
  // --------------------------------------------------------------------------
  const { data: companies, isLoading } = useCompanyContacts(user?.id);
  const createCompany = useCreateCompany();
  const addContact = useAddContact();
  const updateCompany = useUpdateCompany();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  // Opomniki - nujne naloge za prodajalca
  const { data: dueReminders } = useDueReminders(user?.id);
  const { data: contractPendingCompanies } = useContractPendingCompanies(user?.id, 3);
  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const updatePipelineStatus = useUpdatePipelineStatus();

  // --------------------------------------------------------------------------
  // STATE - Stanje komponent (modali, filtri, forme, itd.)
  // --------------------------------------------------------------------------

  // Opomnik modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderCompanyId, setReminderCompanyId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderNote, setReminderNote] = useState('');

  // Filter state
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('name');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'week' | 'month' | 'lastMonth'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Recent companies (stored in localStorage)
  const [recentCompanyIds, setRecentCompanyIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recentCompanies');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Add company to recent when selected
  const addToRecent = (companyId: string) => {
    setRecentCompanyIds(prev => {
      const filtered = prev.filter(id => id !== companyId);
      const updated = [companyId, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem('recentCompanies', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle company query parameter from URL (e.g., from Dashboard redirect)
  useEffect(() => {
    const companyId = searchParams.get('company');
    if (companyId && companies) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setSelectedCompanyId(companyId);
        setSelectedCompany(company);
        // Clear the URL parameter
        searchParams.delete('company');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, companies]);

  // Fetch company details with cycles history when a company is selected
  const { data: companyDetails, isLoading: isLoadingDetails } = useCompanyDetails(
    selectedCompanyId || undefined,
    user?.id
  );
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithContacts | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [taxLookupLoading, setTaxLookupLoading] = useState(false);

  // Selection mode for export/delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerType, setOfferType] = useState<'najem' | 'nakup' | 'primerjava' | 'dodatna'>('najem');
  const [offerFrequency, setOfferFrequency] = useState<string>('2');
  // Helper to check if offer includes najem
  const hasNajem = offerType === 'najem' || offerType === 'primerjava' || offerType === 'dodatna';
  // Helper to check if offer includes nakup
  const hasNakup = offerType === 'nakup' || offerType === 'primerjava' || offerType === 'dodatna';
  const [offerItemsNakup, setOfferItemsNakup] = useState<OfferItem[]>([]);
  const [offerItemsNajem, setOfferItemsNajem] = useState<OfferItem[]>([]);
  const [offerStep, setOfferStep] = useState<'type' | 'items-nakup' | 'items-najem' | 'preview'>('type');

  // Sent offers state
  const [sentOffers, setSentOffers] = useState<any[]>([]);
  const [loadingSentOffers, setLoadingSentOffers] = useState(false);
  const [showContractConfirm, setShowContractConfirm] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [savedContracts, setSavedContracts] = useState<any[]>([]);

  // Company notes state
  const [newNoteDate, setNewNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const queryClient = useQueryClient();

  // Quick note with meeting/deadline
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState<string>('10:00');
  const [meetingType, setMeetingType] = useState<'sestanek' | 'ponudba'>('sestanek');

  // QR Scanner - za skeniranje vizitk (vCard)
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerRef, setScannerRef] = useState<Html5Qrcode | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);

  // Obstoječe podjetje - ko QR koda najde podjetje ki že obstaja
  const [showExistingCompanyModal, setShowExistingCompanyModal] = useState(false);
  const [existingCompany, setExistingCompany] = useState<CompanyWithContacts | null>(null);
  const [pendingContactData, setPendingContactData] = useState<any>(null);

  // Edit contact state
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editContactData, setEditContactData] = useState<any>({});

  // Urejanje naslova podjetja
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editAddressData, setEditAddressData] = useState<any>({});

  // --------------------------------------------------------------------------
  // QR KODA - Skeniranje in parsiranje vizitk
  // --------------------------------------------------------------------------

  /**
   * Parsira vCard podatke iz QR kode
   * Podpira standardne vCard polja: FN, N, ORG, TITLE, TEL, EMAIL, ADR, URL, NOTE
   * @param vCardText - Surovi vCard tekst
   * @returns Objekt s parsiranimi polji
   */
  const parseVCard = (vCardText: string) => {
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
      // ADR format: PO Box;Extended;Street;City;Region;Postal;Country
      if (parts[2]) data.addressStreet = parts[2].trim();
      if (parts[3]) data.addressCity = parts[3].trim();
      if (parts[5]) data.addressPostal = parts[5].trim();
    }

    // Extract URL (sometimes contains tax number or other info)
    const urlMatch = vCardText.match(/URL[^:]*:([^\r\n]+)/i);
    if (urlMatch) {
      // Check if it looks like a tax number
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
  };

  /**
   * Poišče obstoječe podjetje po imenu ali davčni številki
   * Uporablja se pri skeniranju QR kod za preprečitev duplikatov
   * @param companyName - Ime podjetja za iskanje
   * @param taxNumber - Davčna številka za iskanje
   * @returns Obstoječe podjetje ali null
   */
  const findExistingCompany = (companyName?: string, taxNumber?: string): CompanyWithContacts | null => {
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
        // Exact match or one contains the other
        return existingName === normalizedName ||
               existingName.includes(normalizedName) ||
               normalizedName.includes(existingName);
      });
      if (byName) return byName;
    }

    return null;
  };

  /**
   * Obdela rezultat skeniranja QR kode
   * Če je vCard format, parsira podatke in preveri za duplikate
   * @param decodedText - Dekodirani tekst iz QR kode
   */
  const handleQRScan = (decodedText: string) => {
    // Check if it's a vCard
    if (decodedText.includes('BEGIN:VCARD') || decodedText.includes('VCARD')) {
      const parsedData = parseVCard(decodedText);

      // Check if company already exists
      const existing = findExistingCompany(parsedData.companyName, parsedData.taxNumber);

      if (existing) {
        // Company exists - show modal to ask user what to do
        setExistingCompany(existing);
        setPendingContactData(parsedData);
        setShowExistingCompanyModal(true);
        toast({ description: 'Podjetje že obstaja v bazi!' });
      } else {
        // New company - fill form as usual
        setFormData({ ...formData, ...parsedData });
        toast({ description: 'Podatki iz QR kode uvoženi!' });
      }
    } else {
      // Maybe it's just plain text with company info
      toast({ description: 'QR koda ne vsebuje vCard podatkov', variant: 'destructive' });
    }

    // Close scanner
    if (scannerRef) {
      scannerRef.clear();
    }
    setShowQRScanner(false);
  };

  // Add contact to existing company
  const handleAddToExistingCompany = async () => {
    if (!existingCompany || !pendingContactData || !user?.id) return;

    try {
      await addContact.mutateAsync({
        companyId: existingCompany.id,
        contact: {
          first_name: pendingContactData.contactName?.split(' ')[0] || 'Kontakt',
          last_name: pendingContactData.contactName?.split(' ').slice(1).join(' ') || '',
          phone: pendingContactData.contactPhone,
          email: pendingContactData.contactEmail,
          role: pendingContactData.contactRole,
        },
        userId: user.id,
      });

      toast({ description: '✅ Kontakt dodan k obstoječemu podjetju' });
      setShowExistingCompanyModal(false);
      setExistingCompany(null);
      setPendingContactData(null);
      setShowAddModal(false);
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju kontakta', variant: 'destructive' });
    }
  };

  // Create new company anyway (ignore existing)
  const handleCreateNewAnyway = () => {
    if (pendingContactData) {
      setFormData({ ...formData, ...pendingContactData });
    }
    setShowExistingCompanyModal(false);
    setExistingCompany(null);
    setPendingContactData(null);
    toast({ description: 'Podatki uvoženi - ustvarite novo podjetje' });
  };

  // --------------------------------------------------------------------------
  // OPOMNIKI - Ustvarjanje in upravljanje opomnikov
  // --------------------------------------------------------------------------

  /**
   * Ustvari nov opomnik za stranko
   * Shrani v bazo in osveži seznam opomnikov
   */
  const handleCreateReminder = async () => {
    if (!reminderCompanyId || !reminderDate || !user?.id) return;

    const reminderAt = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();

    try {
      await createReminder.mutateAsync({
        company_id: reminderCompanyId,
        user_id: user.id,
        reminder_at: reminderAt,
        note: reminderNote || null,
      });

      toast({ description: '✅ Opomnik dodan' });
      setShowReminderModal(false);
      setReminderCompanyId(null);
      setReminderDate('');
      setReminderTime('09:00');
      setReminderNote('');
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju opomnika', variant: 'destructive' });
    }
  };

  // Handle completing a reminder
  const handleCompleteReminder = async (reminderId: string) => {
    try {
      await completeReminder.mutateAsync(reminderId);
      toast({ description: '✅ Opomnik označen kot opravljen' });
    } catch (error) {
      toast({ description: 'Napaka pri označevanju opomnika', variant: 'destructive' });
    }
  };

  // Open reminder modal for a company
  const openReminderModal = (companyId: string) => {
    setReminderCompanyId(companyId);
    // Set default date to today
    setReminderDate(new Date().toISOString().split('T')[0]);
    setShowReminderModal(true);
  };

  // --------------------------------------------------------------------------
  // FILTRIRANJE IN SORTIRANJE - Logika za prikaz seznama strank
  // --------------------------------------------------------------------------

  /**
   * Filtrira in sortira seznam podjetij
   * Upošteva: iskalni niz, filter po obdobju, filter po statusu, filter po ciklu
   * Nedavno odprte stranke so na vrhu seznama
   * @returns Filtriran in sortiran seznam podjetij
   */
  const getFilteredCompanies = () => {
    if (!companies) return [];

    let filtered = [...companies];

    // Search filter - searches name, display_name, tax_number, city, address, phone
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        // Company fields
        const matchesCompany =
          c.name.toLowerCase().includes(query) ||
          c.display_name?.toLowerCase().includes(query) ||
          c.tax_number?.toLowerCase().includes(query) ||
          c.address_city?.toLowerCase().includes(query) ||
          c.address_street?.toLowerCase().includes(query) ||
          (c as any).delivery_city?.toLowerCase().includes(query) ||
          (c as any).delivery_address?.toLowerCase().includes(query);

        // Contact fields
        const matchesContact = c.contacts?.some(contact =>
          `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.replace(/\s/g, '').includes(query.replace(/\s/g, ''))
        );

        return matchesCompany || matchesContact;
      });
    }

    // Period filter - based on contact_since field
    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date | null = null;

      switch (periodFilter) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
          break;
        default:
          startDate = new Date(0);
      }

      // Filter companies that have at least one contact with contact_since in the date range
      filtered = filtered.filter(c => {
        // Check if any contact has contact_since set
        const contactsWithDate = c.contacts?.filter(contact => (contact as any).contact_since) || [];

        if (contactsWithDate.length > 0) {
          // If contacts have contact_since, filter by those dates only
          return contactsWithDate.some(contact => {
            const contactDate = new Date((contact as any).contact_since);
            if (endDate) {
              return contactDate >= startDate && contactDate <= endDate;
            }
            return contactDate >= startDate;
          });
        } else {
          // Fallback: if NO contacts have contact_since, use company created_at
          const companyCreatedAt = new Date(c.created_at);
          if (endDate) {
            return companyCreatedAt >= startDate && companyCreatedAt <= endDate;
          }
          return companyCreatedAt >= startDate;
        }
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => (c.pipeline_status || 'new') === statusFilter);
    }

    // Existing contract filter
    if (filter !== 'all') {
      filtered = filtered.filter(company => {
        const hasSignedContract = company.cycles?.some((c: any) => c.contract_signed);
        const hasActiveCycle = company.cycles?.some((c: any) => c.status === 'on_test' || c.status === 'clean');
        const hasOverdueCycle = company.cycles?.some((c: any) => isTestOverdue(c));

        switch (filter) {
          case 'active':
            return hasActiveCycle;
          case 'signed':
            return hasSignedContract;
          case 'inactive':
            return !hasActiveCycle && !hasSignedContract;
          case 'overdue':
            return hasOverdueCycle;
          default:
            return true;
        }
      });
    }

    // Sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'sl'));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'status':
        const statusOrder = ['contract_signed', 'contract_sent', 'offer_sent', 'contacted', 'new'];
        filtered.sort((a, b) => {
          const aStatus = a.pipeline_status || 'new';
          const bStatus = b.pipeline_status || 'new';
          return statusOrder.indexOf(aStatus) - statusOrder.indexOf(bStatus);
        });
        break;
    }

    // Put recent companies at the top (only when not searching)
    if (!searchQuery && recentCompanyIds.length > 0) {
      const recent: CompanyWithContacts[] = [];
      const rest: CompanyWithContacts[] = [];

      filtered.forEach(company => {
        if (recentCompanyIds.includes(company.id)) {
          recent.push(company);
        } else {
          rest.push(company);
        }
      });

      // Sort recent by their order in recentCompanyIds
      recent.sort((a, b) => recentCompanyIds.indexOf(a.id) - recentCompanyIds.indexOf(b.id));

      return [...recent, ...rest];
    }

    return filtered;
  };

  // Apply zoom to camera
  const applyZoom = async (zoom: number) => {
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
  };

  // Initialize QR scanner when modal opens
  useEffect(() => {
    if (showQRScanner) {
      setScannerError(null);
      setZoomLevel(1);
      setZoomSupported(false);

      // Small delay to ensure DOM element exists
      const timer = setTimeout(() => {
        const html5QrCode = new Html5Qrcode('qr-reader');
        setScannerRef(html5QrCode);

        html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Success - parse the QR code
            html5QrCode.stop().then(() => {
              handleQRScan(decodedText);
            }).catch(console.error);
          },
          (errorMessage) => {
            // Ignore continuous scan errors
          }
        ).then(() => {
          // Check for zoom support after camera starts
          setTimeout(() => {
            const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
            if (videoElement && videoElement.srcObject) {
              const stream = videoElement.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              if (track) {
                const capabilities = track.getCapabilities() as any;
                if (capabilities.zoom) {
                  setZoomSupported(true);
                  setMaxZoom(Math.min(capabilities.zoom.max, 5)); // Cap at 5x
                  // Start with 2x zoom for small QR codes
                  applyZoom(2);
                }
              }
            }
          }, 500);
        }).catch((err) => {
          console.error('Camera error:', err);
          setScannerError('Napaka pri dostopu do kamere. Preverite dovoljenja.');
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef) {
          scannerRef.stop().catch(console.error);
        }
      };
    }
  }, [showQRScanner]);

  // --------------------------------------------------------------------------
  // OPOMBE (NOTES) - CRM dnevnik za vsako stranko
  // --------------------------------------------------------------------------

  /** Opombe za izbrano stranko */
  const { data: companyNotes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['company-notes', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('company_notes')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('note_date', { ascending: false });
      if (error) throw error;
      return data as CompanyNote[];
    },
    enabled: !!selectedCompanyId,
  });

  // --------------------------------------------------------------------------
  // "DANES" SEKCIJA - Sestanki in roki za danes
  // --------------------------------------------------------------------------

  /** Današnji datum za primerjavo */
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayTasks } = useQuery({
    queryKey: ['today-tasks', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_notes')
        .select('*, companies:company_id(id, name, display_name)')
        .or(`content.ilike.%sestanek%,content.ilike.%ponudbo do%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Parse dates from content and categorize
      const meetings: any[] = [];
      const deadlines: any[] = [];

      data?.forEach((note: any) => {
        const content = note.content.toLowerCase();

        // Extract date from content like "sestanek za 18. 1. 2026" or "ponudbo do 18. 1. 2026"
        const dateMatch = note.content.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
        if (dateMatch) {
          const [_, day, month, year] = dateMatch;
          const noteDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          noteDate.setHours(0, 0, 0, 0);

          const isToday = noteDate.getTime() === today.getTime();
          const isPast = noteDate.getTime() < today.getTime();
          const isSoon = noteDate.getTime() <= today.getTime() + 2 * 24 * 60 * 60 * 1000; // within 2 days

          if (content.includes('sestanek') && (isToday || (isPast && noteDate.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000))) {
            meetings.push({ ...note, noteDate, isToday, isPast });
          }

          if (content.includes('ponudbo do') && (isToday || isPast || isSoon)) {
            deadlines.push({ ...note, noteDate, isToday, isPast, isSoon });
          }
        }
      });

      // Sort by date
      meetings.sort((a, b) => a.noteDate.getTime() - b.noteDate.getTime());
      deadlines.sort((a, b) => a.noteDate.getTime() - b.noteDate.getTime());

      return { meetings, deadlines };
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ companyId, noteDate, content }: { companyId: string; noteDate: string; content: string }) => {
      const { data, error } = await supabase
        .from('company_notes')
        .insert({
          company_id: companyId,
          note_date: noteDate,
          content,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-notes', selectedCompanyId] });
      setNewNoteContent('');
      toast({ description: 'Opomba dodana' });
    },
    onError: (error: any) => {
      console.error('Error adding note:', error);
      toast({ description: `Napaka pri dodajanju opombe: ${error.message}`, variant: 'destructive' });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('company_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-notes', selectedCompanyId] });
      toast({ description: 'Opomba izbrisana' });
    },
  });

  // Filtriran seznam strank za prikaz
  const filteredCompanies = getFilteredCompanies();

  // --------------------------------------------------------------------------
  // CRUD OPERACIJE - Dodajanje, urejanje, brisanje strank in kontaktov
  // --------------------------------------------------------------------------

  /**
   * Doda novo stranko v bazo
   * Hkrati doda tudi prvi kontakt če so podatki podani
   */
  const handleAddCompany = async () => {
    if (!formData.companyName || !user?.id) {
      toast({ description: 'Ime podjetja je obvezno', variant: 'destructive' });
      return;
    }

    try {
      await createCompany.mutateAsync({
        company: {
          name: formData.companyName,
          display_name: formData.displayName,
          tax_number: formData.taxNumber,
          address_street: formData.addressStreet,
          address_postal: formData.addressPostal,
          address_city: formData.addressCity,
          delivery_address: formData.deliveryAddress,
          delivery_postal: formData.deliveryPostal,
          delivery_city: formData.deliveryCity,
          billing_address: formData.billingAddress,
          billing_postal: formData.billingPostal,
          billing_city: formData.billingCity,
          working_hours: formData.workingHours,
          delivery_instructions: formData.deliveryInstructions,
          customer_number: formData.customerNumber,
          notes: formData.notes,
        },
        contact: formData.contactName ? {
          first_name: formData.contactName.split(' ')[0],
          last_name: formData.contactName.split(' ').slice(1).join(' '),
          phone: formData.contactPhone,
          email: formData.contactEmail,
          role: formData.contactRole,
          is_billing_contact: formData.isBillingContact,
          is_service_contact: formData.isServiceContact,
        } : undefined,
        userId: user.id,
      });

      toast({ description: '✅ Stranka dodana' });
      setShowAddModal(false);
      setFormData({});
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju', variant: 'destructive' });
    }
  };

  // Lookup company by tax number using EU VIES API
  const handleTaxLookup = async () => {
    const taxNumber = formData.taxNumber;
    if (!taxNumber || !isValidTaxNumberFormat(taxNumber)) {
      toast({ description: 'Vnesite veljavno davčno številko (8 števk)', variant: 'destructive' });
      return;
    }

    setTaxLookupLoading(true);
    try {
      const companyData = await lookupCompanyByTaxNumber(taxNumber);

      if (!companyData) {
        toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
        return;
      }

      if (!companyData.isValid) {
        toast({ description: 'Davčna številka ni veljavna ali podjetje ni DDV zavezanec', variant: 'destructive' });
        return;
      }

      // Auto-fill form fields
      setFormData((prev: any) => ({
        ...prev,
        companyName: companyData.name || prev.companyName,
        addressStreet: companyData.street || prev.addressStreet,
        addressCity: companyData.city || prev.addressCity,
        addressPostal: companyData.postalCode || prev.addressPostal,
      }));

      toast({ description: `Podjetje najdeno: ${companyData.name}` });
    } catch (error) {
      toast({ description: 'Napaka pri iskanju podjetja', variant: 'destructive' });
    } finally {
      setTaxLookupLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!formData.newContactName || !selectedCompany || !user?.id) {
      toast({ description: 'Ime kontakta je obvezno', variant: 'destructive' });
      return;
    }

    try {
      await addContact.mutateAsync({
        companyId: selectedCompany.id,
        contact: {
          first_name: formData.newContactName.split(' ')[0],
          last_name: formData.newContactName.split(' ').slice(1).join(' '),
          phone: formData.newContactPhone,
          email: formData.newContactEmail,
          role: formData.newContactRole,
          contact_since: formData.newContactSince || null,
          location_address: formData.hasDifferentLocation ? formData.newContactLocation : null,
        },
        userId: user.id,
      });

      toast({ description: '✅ Kontakt dodan' });
      setShowAddContactModal(false);
      setFormData({});
      // Refresh selected company
      const updated = companies?.find(c => c.id === selectedCompany.id);
      if (updated) setSelectedCompany(updated);
    } catch (error) {
      toast({ description: 'Napaka pri dodajanju kontakta', variant: 'destructive' });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact.mutateAsync(contactId);
      toast({ description: '✅ Kontakt izbrisan' });
    } catch (error) {
      toast({ description: 'Napaka pri brisanju', variant: 'destructive' });
    }
  };

  // --------------------------------------------------------------------------
  // POMOŽNE FUNKCIJE - Formatiranje, naslovi, poti
  // --------------------------------------------------------------------------

  /**
   * Vrne primarni kontakt podjetja (ali prvega če ni označenega)
   */
  const getPrimaryContact = (company: CompanyWithContacts) => {
    return company.contacts.find(c => c.is_primary) || company.contacts[0];
  };

  /**
   * Generira .ics datoteko za Outlook/Calendar
   * @param company - Podjetje za katerega ustvarjamo dogodek
   * @param date - Datum sestanka/roka (YYYY-MM-DD)
   * @param time - Čas sestanka (HH:MM)
   * @param type - Tip dogodka ('sestanek' ali 'ponudba')
   */
  const generateICSFile = (company: CompanyWithContacts, date: string, time: string, type: 'sestanek' | 'ponudba') => {
    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const primaryContact = getPrimaryContact(company);
    const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : '';
    const companyName = company.display_name || company.name;

    // Get address for location
    const c = company as any;
    const hasDeliveryAddress = c.delivery_address || c.delivery_postal || c.delivery_city;
    const location = hasDeliveryAddress
      ? [c.delivery_address, c.delivery_postal, c.delivery_city].filter(Boolean).join(', ')
      : [company.address_street, company.address_postal, company.address_city].filter(Boolean).join(', ');

    const title = type === 'sestanek'
      ? `Sestanek - ${companyName}`
      : `Poslati ponudbo - ${companyName}`;

    const description = type === 'sestanek'
      ? `Sestanek s stranko ${companyName}${contactName ? `\\nKontakt: ${contactName}` : ''}${primaryContact?.phone ? `\\nTel: ${primaryContact.phone}` : ''}`
      : `Rok za pošiljanje ponudbe stranki ${companyName}`;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mat Tracker Pro//SL
BEGIN:VEVENT
UID:${Date.now()}@matpro.ristov.xyz
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type === 'sestanek' ? 'sestanek' : 'ponudba'}-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatAddress = (company: CompanyWithContacts) => {
    const parts = [company.address_city, company.address_postal].filter(Boolean);
    return parts.join(', ') || null;
  };

  const getGoogleMapsUrl = (company: CompanyWithContacts) => {
    // Uporabi naslov poslovalnice če obstaja, sicer sedež podjetja
    const c = company as any;
    const hasDeliveryAddress = c.delivery_address || c.delivery_postal || c.delivery_city;

    const parts = hasDeliveryAddress
      ? [c.delivery_address, c.delivery_postal, c.delivery_city].filter(Boolean)
      : [company.address_street, company.address_postal, company.address_city].filter(Boolean);

    if (parts.length === 0) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
  };

  // Get company address for route planning
  const getCompanyAddress = (company: CompanyWithContacts) => {
    const c = company as any;
    const hasDeliveryAddress = c.delivery_address || c.delivery_postal || c.delivery_city;

    const parts = hasDeliveryAddress
      ? [c.delivery_address, c.delivery_postal, c.delivery_city].filter(Boolean)
      : [company.address_street, company.address_postal, company.address_city].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Open route in Google Maps with multiple waypoints
  const openRouteInMaps = () => {
    const companiesWithAddresses = filteredCompanies
      .filter(c => getCompanyAddress(c))
      .slice(0, 10); // Google Maps supports up to 10 waypoints

    if (companiesWithAddresses.length === 0) {
      toast({ description: 'Ni strank z naslovi', variant: 'destructive' });
      return;
    }

    if (companiesWithAddresses.length === 1) {
      // Single destination
      window.open(getGoogleMapsUrl(companiesWithAddresses[0])!, '_blank');
      return;
    }

    // Multiple waypoints - Google Maps Directions URL format
    const origin = encodeURIComponent(getCompanyAddress(companiesWithAddresses[0])!);
    const destination = encodeURIComponent(getCompanyAddress(companiesWithAddresses[companiesWithAddresses.length - 1])!);
    const waypoints = companiesWithAddresses
      .slice(1, -1)
      .map(c => encodeURIComponent(getCompanyAddress(c)!))
      .join('|');

    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    window.open(url, '_blank');
    toast({ description: `Odpiranje poti za ${companiesWithAddresses.length} strank` });
  };

  // --------------------------------------------------------------------------
  // IZBIRA IN IZVOZ KONTAKTOV - vCard izvoz, množično brisanje
  // --------------------------------------------------------------------------

  /** Preklopi izbiro kontakta za izvoz/brisanje */
  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const selectAllContacts = () => {
    const allContactIds = new Set<string>();
    companies?.forEach(company => {
      company.contacts.forEach(contact => {
        allContactIds.add(contact.id);
      });
    });
    setSelectedContacts(allContactIds);
  };

  const deselectAllContacts = () => {
    setSelectedContacts(new Set());
  };

  const getAllContactsCount = () => {
    let count = 0;
    companies?.forEach(company => {
      count += company.contacts.length;
    });
    return count;
  };

  // Generate vCard format for a contact
  const generateVCard = (contact: any, company: CompanyWithContacts) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${contact.last_name || ''};${contact.first_name || ''};;;`,
      `FN:${contact.first_name || ''} ${contact.last_name || ''}`,
      `ORG:${company.name || ''}`,
    ];
    if (contact.role) lines.push(`TITLE:${contact.role}`);
    if (contact.phone) lines.push(`TEL;TYPE=WORK,VOICE:${contact.phone}`);
    if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
    if (company.address_street || company.address_city || company.address_postal) {
      lines.push(`ADR;TYPE=WORK:;;${company.address_street || ''};${company.address_city || ''};;${company.address_postal || ''};Slovenia`);
    }
    lines.push('END:VCARD');
    return lines.join('\r\n');
  };

  // Export selected contacts as vCard file
  const exportSelectedContacts = () => {
    if (selectedContacts.size === 0) {
      toast({ description: 'Najprej izberi kontakte za izvoz', variant: 'destructive' });
      return;
    }

    const vCards: string[] = [];
    companies?.forEach(company => {
      company.contacts.forEach(contact => {
        if (selectedContacts.has(contact.id)) {
          vCards.push(generateVCard(contact, company));
        }
      });
    });

    const blob = new Blob([vCards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontakti-${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ description: `✅ Izvoženih ${selectedContacts.size} kontaktov` });
    setSelectionMode(false);
    setSelectedContacts(new Set());
  };

  // Export all contacts
  const exportAllContacts = () => {
    const vCards: string[] = [];
    companies?.forEach(company => {
      company.contacts.forEach(contact => {
        vCards.push(generateVCard(contact, company));
      });
    });

    if (vCards.length === 0) {
      toast({ description: 'Ni kontaktov za izvoz', variant: 'destructive' });
      return;
    }

    const blob = new Blob([vCards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vsi-kontakti-${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ description: `✅ Izvoženih ${vCards.length} kontaktov` });
  };

  // Delete selected contacts
  const deleteSelectedContacts = async () => {
    if (selectedContacts.size === 0) {
      toast({ description: 'Najprej izberi kontakte za brisanje', variant: 'destructive' });
      return;
    }

    if (!confirm(`Ali res želiš izbrisati ${selectedContacts.size} kontaktov?`)) {
      return;
    }

    let deletedCount = 0;
    for (const contactId of selectedContacts) {
      try {
        await deleteContact.mutateAsync(contactId);
        deletedCount++;
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }

    toast({ description: `✅ Izbrisanih ${deletedCount} kontaktov` });
    setSelectionMode(false);
    setSelectedContacts(new Set());
  };

  // --------------------------------------------------------------------------
  // POSLANE PONUDBE - Pregled in upravljanje poslanih ponudb
  // --------------------------------------------------------------------------

  /**
   * Pridobi vse poslane ponudbe za podjetje
   * @param companyId - ID podjetja
   */
  const fetchSentOffers = async (companyId: string) => {
    setLoadingSentOffers(true);
    try {
      // Fetch sent_emails with their offer_items
      const { data: emails, error } = await supabase
        .schema('mat_tracker')
        .from('sent_emails')
        .select('*')
        .eq('company_id', companyId)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Fetch offer_items for each email
      const offersWithItems = await Promise.all(
        (emails || []).map(async (email) => {
          const { data: items } = await supabase
            .schema('mat_tracker')
            .from('offer_items')
            .select('*')
            .eq('sent_email_id', email.id);
          return { ...email, items: items || [] };
        })
      );

      setSentOffers(offersWithItems);
    } catch (error) {
      console.error('Error fetching sent offers:', error);
      setSentOffers([]);
    } finally {
      setLoadingSentOffers(false);
    }
  };

  // Save offer to database
  const saveOfferToDatabase = async (subject: string, email: string): Promise<boolean> => {
    if (!selectedCompany || !user?.id) {
      toast({ description: 'Napaka: Ni izbrane stranke ali uporabnika', variant: 'destructive' });
      return false;
    }

    const primaryContact = getPrimaryContact(selectedCompany);

    // Determine offer type for database
    let dbOfferType: 'rental' | 'purchase' | 'both' = 'rental';
    if (offerType === 'nakup') dbOfferType = 'purchase';
    else if (offerType === 'primerjava') dbOfferType = 'both';
    else if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
      if (hasNajemItems && hasNakupItems) dbOfferType = 'both';
      else if (hasNakupItems) dbOfferType = 'purchase';
      else dbOfferType = 'rental';
    }

    try {
      console.log('Saving offer for company:', selectedCompany.id, 'type:', dbOfferType);

      // Insert sent_email record
      const { data: sentEmail, error: emailError } = await supabase
        .schema('mat_tracker')
        .from('sent_emails')
        .insert({
          company_id: selectedCompany.id,
          contact_id: primaryContact?.id || null,
          recipient_email: email || 'ni-emaila@unknown.com',
          subject: subject,
          offer_type: dbOfferType,
          frequency: offerFrequency,
          status: 'sent',
          created_by: user.id,
        })
        .select()
        .single();

      if (emailError) {
        console.error('Email insert error:', emailError);
        throw emailError;
      }

      console.log('Saved sent_email:', sentEmail);

      // Prepare offer items
      const items = offerType === 'nakup' || offerType === 'primerjava'
        ? [...offerItemsNakup, ...offerItemsNajem]
        : offerItemsNajem;

      // Insert offer_items
      const offerItemsToInsert = items.filter(item => item.code || item.itemType === 'custom').map(item => ({
        sent_email_id: sentEmail.id,
        mat_type_id: null, // We don't have mat_type_id for custom items
        is_design: item.itemType === 'design' || item.itemType === 'custom',
        width_cm: Math.round(item.m2 ? Math.sqrt(item.m2) * 100 : 85),
        height_cm: Math.round(item.m2 ? Math.sqrt(item.m2) * 100 : 60),
        price_rental: item.purpose !== 'nakup' ? item.pricePerUnit : null,
        price_purchase: item.purpose === 'nakup' ? item.pricePerUnit : null,
        price_penalty: item.replacementCost || null,
        quantity: item.quantity,
        notes: `${item.code || item.name} - ${item.size || 'po meri'}`,
        seasonal: item.seasonal || false,
        seasonal_from_week: item.seasonalFromWeek || null,
        seasonal_to_week: item.seasonalToWeek || null,
        normal_from_week: item.normalFromWeek || null,
        normal_to_week: item.normalToWeek || null,
        frequency: item.purpose !== 'nakup' ? (item.normalFrequency || offerFrequency) : null,
        normal_frequency: item.normalFrequency || offerFrequency,
        seasonal_frequency: item.seasonalFrequency || '1',
        normal_price: item.normalPrice || item.pricePerUnit,
        seasonal_price: item.seasonalPrice || null,
      }));

      console.log('Offer items to insert:', offerItemsToInsert);

      if (offerItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .schema('mat_tracker')
          .from('offer_items')
          .insert(offerItemsToInsert);

        if (itemsError) {
          console.error('Items insert error:', itemsError);
          throw itemsError;
        }
      }

      // Refresh sent offers list
      fetchSentOffers(selectedCompany.id);
      return true;
    } catch (error: any) {
      console.error('Error saving offer to database:', error);
      toast({
        description: `Napaka pri shranjevanju: ${error?.message || 'Neznana napaka'}`,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Delete a sent offer
  const deleteSentOffer = async (offerId: string) => {
    if (!confirm('Ali res želiš izbrisati to ponudbo?')) return;

    try {
      // Delete offer_items first
      await supabase
        .schema('mat_tracker')
        .from('offer_items')
        .delete()
        .eq('sent_email_id', offerId);

      // Delete sent_email
      const { error } = await supabase
        .schema('mat_tracker')
        .from('sent_emails')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast({ description: '✅ Ponudba izbrisana' });
      setSentOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({ description: 'Napaka pri brisanju ponudbe', variant: 'destructive' });
    }
  };

  // Fetch sent offers when company is selected
  useEffect(() => {
    if (selectedCompanyId) {
      fetchSentOffers(selectedCompanyId);
    } else {
      setSentOffers([]);
    }
  }, [selectedCompanyId]);

  // --------------------------------------------------------------------------
  // KREIRANJE PONUDB - Najem, nakup, primerjava, dodatna
  // --------------------------------------------------------------------------

  /**
   * Odpre modal za novo ponudbo in ponastavi stanje
   */
  const openOfferModal = () => {
    // Reset offer state
    setOfferType('najem');
    setOfferFrequency('2');
    setOfferItemsNakup([{ id: '1', itemType: 'standard', code: '', name: 'Predpražnik', size: '', customized: false, quantity: 1, pricePerUnit: 0 }]);
    setOfferItemsNajem([{ id: '1', itemType: 'standard', code: '', name: 'Predpražnik', size: '', customized: false, quantity: 1, pricePerUnit: 0, replacementCost: 0, seasonal: false }]);
    setOfferStep('type');
    setShowOfferModal(true);
  };

  // Update najem prices when frequency changes
  const updateNajemPricesForFrequency = (newFrequency: string) => {
    setOfferFrequency(newFrequency);
    setOfferItemsNajem(prev => prev.map(item => {
      if (!item.code) return item; // Skip items without code selected
      let newPrice: number;
      if (item.itemType === 'custom' && item.m2) {
        // Recalculate custom price based on m²
        newPrice = calculateCustomPrice(item.m2, newFrequency as FrequencyKey);
      } else {
        // Use standard price lookup
        newPrice = getRentalPrice(item.code, newFrequency as FrequencyKey) || item.pricePerUnit;
      }
      return {
        ...item,
        pricePerUnit: newPrice,
        originalPrice: newPrice,
        discount: 0,
      };
    }));
  };

  const addCustomOfferItem = (type: 'nakup' | 'najem') => {
    const newItem: OfferItem = {
      id: Date.now().toString(),
      itemType: 'standard',
      code: '',
      name: 'Predpražnik',
      size: '',
      customized: false,
      quantity: 1,
      pricePerUnit: 0,
      ...(type === 'najem' && { replacementCost: 0, seasonal: false }),
    };
    if (type === 'nakup') {
      setOfferItemsNakup([...offerItemsNakup, newItem]);
    } else {
      setOfferItemsNajem([...offerItemsNajem, newItem]);
    }
  };

  const removeOfferItem = (id: string, type: 'nakup' | 'najem') => {
    if (type === 'nakup') {
      setOfferItemsNakup(offerItemsNakup.filter(item => item.id !== id));
    } else {
      setOfferItemsNajem(offerItemsNajem.filter(item => item.id !== id));
    }
  };

  const updateOfferItem = (id: string, updates: Partial<OfferItem>, type: 'nakup' | 'najem') => {
    if (type === 'nakup') {
      setOfferItemsNakup(offerItemsNakup.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    } else {
      setOfferItemsNajem(offerItemsNajem.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    }
  };

  const handleItemTypeChange = (itemId: string, newItemType: ItemType, offerType: 'nakup' | 'najem') => {
    const updates: Partial<OfferItem> = { itemType: newItemType, code: '', size: '', m2: 0, pricePerUnit: 0, replacementCost: 0 };
    updateOfferItem(itemId, updates, offerType);
  };

  const handleStandardCodeSelect = (itemId: string, code: string, offerType: 'nakup' | 'najem') => {
    const priceInfo = getPriceByCode(code);
    if (!priceInfo) return;
    const basePrice = offerType === 'nakup' ? priceInfo.odkup : priceInfo.prices[offerFrequency as FrequencyKey] || 0;
    const updates: Partial<OfferItem> = {
      code, size: priceInfo.dimensions, m2: priceInfo.m2, pricePerUnit: basePrice, originalPrice: basePrice, discount: 0,
      replacementCost: offerType === 'najem' ? priceInfo.odkup : 0,
    };
    updateOfferItem(itemId, updates, offerType);
  };

  const handleDesignSizeSelect = (itemId: string, designCode: string, offerType: 'nakup' | 'najem') => {
    // Design codes are in DESIGN_SIZES, not PRICE_LIST
    const designSize = DESIGN_SIZES.find(d => d.code === designCode);
    if (!designSize) return;
    const m2 = calculateM2FromDimensions(designSize.dimensions);
    // For nakup: m² × 165€, for najem: use calculateCustomPrice
    const basePrice = offerType === 'nakup'
      ? calculateCustomPurchasePrice(m2)
      : calculateCustomPrice(m2, offerFrequency as FrequencyKey);
    const updates: Partial<OfferItem> = {
      code: designCode,
      size: designSize.dimensions,
      m2,
      pricePerUnit: basePrice,
      originalPrice: basePrice,
      discount: 0,
      replacementCost: offerType === 'najem' ? calculateCustomPurchasePrice(m2) : 0,
      name: 'predpražnik po meri'
    };
    updateOfferItem(itemId, updates, offerType);
  };

  const handleCustomDimensionsChange = (itemId: string, dimensions: string, offerType: 'nakup' | 'najem') => {
    const m2 = calculateM2FromDimensions(dimensions);
    const basePrice = offerType === 'nakup' ? calculateCustomPurchasePrice(m2) : calculateCustomPrice(m2, offerFrequency as FrequencyKey);
    const replacementCost = offerType === 'najem' ? calculateCustomPurchasePrice(m2) : 0;
    updateOfferItem(itemId, { code: 'CUSTOM', size: dimensions, m2, pricePerUnit: basePrice, originalPrice: basePrice, discount: 0, replacementCost }, offerType);
  };

  const handlePriceChange = (itemId: string, newPrice: number, offerType: 'nakup' | 'najem') => {
    const items = offerType === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.originalPrice || item.pricePerUnit;
    const discount = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
    updateOfferItem(itemId, { pricePerUnit: newPrice, discount: discount > 0 ? discount : 0 }, offerType);
  };

  const handleDiscountChange = (itemId: string, discount: number, offerType: 'nakup' | 'najem') => {
    const items = offerType === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.originalPrice || item.pricePerUnit;
    // If discount is 0 or cleared, reset to original price
    if (!discount || discount === 0) {
      updateOfferItem(itemId, { pricePerUnit: originalPrice, discount: 0 }, offerType);
      return;
    }
    const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
    updateOfferItem(itemId, { pricePerUnit: newPrice, discount }, offerType);
  };

  const handleSeasonalToggle = (itemId: string, enabled: boolean) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    if (enabled) {
      // Default: normalno obdobje teden 13-44 (4 tedne), sezonsko obdobje teden 45-12 (1 teden)
      let normalBasePrice = 0;
      let seasonalBasePrice = 0;
      if (item.itemType === 'custom' && item.m2) {
        normalBasePrice = calculateCustomPrice(item.m2, '4');
        seasonalBasePrice = calculateCustomPrice(item.m2, '1');
      } else {
        const priceData = getPriceByCode(item.code);
        if (priceData) {
          normalBasePrice = priceData.prices['4'];
          seasonalBasePrice = priceData.prices['1'];
        }
      }
      updateOfferItem(itemId, {
        seasonal: true,
        // Normalno obdobje
        normalFromWeek: 13,
        normalToWeek: 44,
        normalFrequency: '4',
        normalPrice: normalBasePrice,
        normalOriginalPrice: normalBasePrice,
        normalDiscount: 0,
        // Sezonsko obdobje
        seasonalFromWeek: 45,
        seasonalToWeek: 12,
        seasonalFrequency: '1',
        seasonalPrice: seasonalBasePrice,
        seasonalOriginalPrice: seasonalBasePrice,
        seasonalDiscount: 0
      }, 'najem');
    } else {
      updateOfferItem(itemId, {
        seasonal: false,
        normalFromWeek: undefined,
        normalToWeek: undefined,
        normalFrequency: undefined,
        normalPrice: undefined,
        normalOriginalPrice: undefined,
        normalDiscount: undefined,
        seasonalFromWeek: undefined,
        seasonalToWeek: undefined,
        seasonalFrequency: undefined,
        seasonalPrice: undefined,
        seasonalOriginalPrice: undefined,
        seasonalDiscount: undefined
      }, 'najem');
    }
  };

  const handleSeasonalFrequencyChange = (itemId: string, newFrequency: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    // Recalculate seasonal price based on new frequency
    let seasonalBasePrice = 0;
    if (item.itemType === 'custom' && item.m2) {
      seasonalBasePrice = calculateCustomPrice(item.m2, newFrequency as FrequencyKey);
    } else {
      const priceData = getPriceByCode(item.code);
      if (priceData) seasonalBasePrice = priceData.prices[newFrequency as FrequencyKey] || priceData.prices['1'];
    }
    updateOfferItem(itemId, { seasonalFrequency: newFrequency, seasonalPrice: seasonalBasePrice, seasonalOriginalPrice: seasonalBasePrice, seasonalDiscount: 0 }, 'najem');
  };

  const handleSeasonalPriceChange = (itemId: string, newPrice: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.seasonalOriginalPrice || newPrice;
    const discount = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
    updateOfferItem(itemId, { seasonalPrice: newPrice, seasonalDiscount: discount > 0 ? discount : 0 }, 'najem');
  };

  const handleSeasonalDiscountChange = (itemId: string, discount: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.seasonalOriginalPrice || item.seasonalPrice || 0;
    const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
    updateOfferItem(itemId, { seasonalPrice: newPrice, seasonalDiscount: discount }, 'najem');
  };

  // Handlers za normalno obdobje
  const handleNormalFrequencyChange = (itemId: string, newFrequency: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    // Recalculate normal price based on new frequency
    let normalBasePrice = 0;
    if (item.itemType === 'custom' && item.m2) {
      normalBasePrice = calculateCustomPrice(item.m2, newFrequency as FrequencyKey);
    } else {
      const priceData = getPriceByCode(item.code);
      if (priceData) normalBasePrice = priceData.prices[newFrequency as FrequencyKey] || priceData.prices['1'];
    }
    updateOfferItem(itemId, { normalFrequency: newFrequency, normalPrice: normalBasePrice, normalOriginalPrice: normalBasePrice, normalDiscount: 0 }, 'najem');
  };

  const handleNormalPriceChange = (itemId: string, newPrice: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.normalOriginalPrice || newPrice;
    const discount = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
    updateOfferItem(itemId, { normalPrice: newPrice, normalDiscount: discount > 0 ? discount : 0 }, 'najem');
  };

  const handleNormalDiscountChange = (itemId: string, discount: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.normalOriginalPrice || item.normalPrice || 0;
    const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
    updateOfferItem(itemId, { normalPrice: newPrice, normalDiscount: discount }, 'najem');
  };

  const calculateOfferTotals = (type: 'nakup' | 'najem') => {
    const items = type === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (type === 'nakup') {
      const totalPrice = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
      return { totalItems, totalPrice };
    } else {
      const weeklyTotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
      // pricePerUnit is now weekly price, so 4-week = weekly * 4
      const fourWeekTotal = weeklyTotal * 4;
      return { totalItems, weeklyTotal, fourWeekTotal, frequency: offerFrequency };
    }
  };

  // HTML table styles
  const tableStyles = { headerBg: '#1e3a5f', headerText: '#ffffff', border: '#1e3a5f' };

  // Funkcije za prikaz obdobja v tednih
  const getNormalPeriodText = (seasonalFromWeek: number, seasonalToWeek: number): string => {
    // Normalno obdobje je OD konca sezonskega DO začetka sezonskega
    const normalStart = seasonalToWeek >= 52 ? 1 : seasonalToWeek + 1;
    const normalEnd = seasonalFromWeek <= 1 ? 52 : seasonalFromWeek - 1;
    return `teden ${normalStart}-${normalEnd}`;
  };
  const getSeasonalPeriodText = (seasonalFromWeek: number, seasonalToWeek: number): string => `teden ${seasonalFromWeek}-${seasonalToWeek}`;

  const generateNakupTable = () => {
    const totalsNakup = calculateOfferTotals('nakup');
    return `┌─────────────────────────────────────────────────────────────────────────────┐
│ Koda         │ Naziv      │ Velikost │ Prilagojen │ Količina │ Cena/kos    │
├─────────────────────────────────────────────────────────────────────────────┤
${offerItemsNakup.map(item => `│ ${(item.code || '').padEnd(12)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${item.pricePerUnit.toFixed(2).padStart(8)} € │`).join('\n')}
└─────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

Število predpražnikov: ${totalsNakup.totalItems} KOS
Skupna cena: ${(totalsNakup as any).totalPrice?.toFixed(2)} €`;
  };

  const generateNajemTable = () => {
    // For primerjava/dodatna, filter only najem items (exclude nakup purpose)
    const itemsToUse = (offerType === 'primerjava' || offerType === 'dodatna')
      ? offerItemsNajem.filter(i => i.purpose !== 'nakup')
      : offerItemsNajem;
    const totalsNajem = { totalItems: itemsToUse.reduce((sum, i) => sum + i.quantity, 0), fourWeekTotal: itemsToUse.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity * 4), 0) };
    const frequencyText = offerFrequency === '1' ? '1 teden' : `${offerFrequency} tedne`;
    const tableRows: string[] = [];
    itemsToUse.forEach(item => {
      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        const normalPeriod = getNormalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
        tableRows.push(`│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${frequencyText.padEnd(9)} │ ${normalPeriod.padEnd(9)} │ ${item.pricePerUnit.toFixed(2).padStart(7)} € │ ${(item.replacementCost || 0).toFixed(2).padStart(8)} € │`);
        const seasonalPeriod = getSeasonalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
        tableRows.push(`│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${'1 teden'.padEnd(9)} │ ${seasonalPeriod.padEnd(9)} │ ${item.seasonalPrice.toFixed(2).padStart(7)} € │ ${(item.replacementCost || 0).toFixed(2).padStart(8)} € │`);
      } else {
        tableRows.push(`│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${frequencyText.padEnd(9)} │ ${'-'.padEnd(9)} │ ${item.pricePerUnit.toFixed(2).padStart(7)} € │ ${(item.replacementCost || 0).toFixed(2).padStart(8)} € │`);
      }
    });
    const hasSeasonalItems = itemsToUse.some(item => item.seasonal);
    let summaryText = '';
    if (hasSeasonalItems) {
      let normalTotal = 0, seasonalTotal = 0, seasonalPeriodInfo = '', normalPeriodInfo = '', seasonalFreqInfo = '';
      itemsToUse.forEach(item => {
        if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
          // pricePerUnit is already weekly, so 4-week = weekly * 4
          normalTotal += item.pricePerUnit * item.quantity * 4;
          seasonalTotal += item.seasonalPrice * item.quantity * 4;
          normalPeriodInfo = getNormalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
          seasonalPeriodInfo = getSeasonalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
          seasonalFreqInfo = item.seasonalFrequency === '1' ? '1 teden' : `${item.seasonalFrequency} tedna`;
        } else {
          // pricePerUnit is already weekly, so 4-week = weekly * 4
          normalTotal += item.pricePerUnit * item.quantity * 4;
        }
      });
      summaryText = `Število predpražnikov: ${totalsNajem.totalItems} KOS\n\n4-tedenski obračun:\n  Obdobje 1 (${normalPeriodInfo}, menjava na ${frequencyText}): ${normalTotal.toFixed(2)} €\n  Obdobje 2 (${seasonalPeriodInfo}, menjava na ${seasonalFreqInfo}): ${seasonalTotal.toFixed(2)} €`;
    } else {
      summaryText = `Število predpražnikov: ${totalsNajem.totalItems} KOS\nFrekvenca menjave: ${frequencyText.toUpperCase()}\n4-tedenski obračun: ${(totalsNajem as any).fourWeekTotal?.toFixed(2)} €`;
    }
    return `┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Koda   │ Naziv      │ Velikost │ Prilagojen │ Količina │ Frekvenca │ Obdobje   │ Cena/teden │ Povračilo │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
${tableRows.join('\n')}
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

${summaryText}`;
  };

  // Generate nakup table from najem items (for primerjava)
  const generateNakupTableFromNajem = () => {
    const items = offerItemsNajem.map(item => {
      const purchasePrice = item.itemType === 'custom' && item.m2
        ? calculateCustomPurchasePrice(item.m2)
        : getPurchasePrice(item.code);
      return { ...item, pricePerUnit: purchasePrice };
    });
    const totals = { totalItems: items.reduce((sum, i) => sum + i.quantity, 0), totalPrice: items.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0) };
    const tableRows = items.map(item => `│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10).slice(0, 10)} │ ${(item.size || '').padEnd(8).slice(0, 8)} │ ${item.customized ? 'da' : 'ne'.padEnd(10)} │ ${String(item.quantity).padStart(8)} │ ${item.pricePerUnit.toFixed(2).padStart(13)} € │`);
    return `┌───────────────────────────────────────────────────────────────────────────────────┐
│ Koda   │ Naziv      │ Velikost │ Prilagojen │ Količina │ Cena/kos (NAKUP) │
├───────────────────────────────────────────────────────────────────────────────────┤
${tableRows.join('\n')}
└───────────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

Število predpražnikov: ${totals.totalItems} KOS
Cena: ${totals.totalPrice.toFixed(2)} €`;
  };

  // Generate nakup table from najem items filtered by purpose === 'nakup' (for dodatna)
  const generateNakupTableFiltered = () => {
    const nakupItems = offerItemsNajem.filter(i => i.purpose === 'nakup');
    const totals = { totalItems: nakupItems.reduce((sum, i) => sum + i.quantity, 0), totalPrice: nakupItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0) };
    const tableRows = nakupItems.map(item => `│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10).slice(0, 10)} │ ${(item.size || '').padEnd(8).slice(0, 8)} │ ${item.customized ? 'da' : 'ne'.padEnd(10)} │ ${String(item.quantity).padStart(8)} │ ${item.pricePerUnit.toFixed(2).padStart(13)} € │`);
    return `┌───────────────────────────────────────────────────────────────────────────────────┐
│ Koda   │ Naziv      │ Velikost │ Prilagojen │ Količina │ Cena/kos (NAKUP) │
├───────────────────────────────────────────────────────────────────────────────────┤
${tableRows.join('\n')}
└───────────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

Število predpražnikov: ${totals.totalItems} KOS
Cena: ${totals.totalPrice.toFixed(2)} €`;
  };

  // --------------------------------------------------------------------------
  // GENERIRANJE E-POŠTE - Tekstovna in HTML vsebina ponudbe
  // --------------------------------------------------------------------------

  /**
   * Generira vsebino e-pošte v tekstovnem formatu
   * Uporablja se za navadno kopiranje ali mailto link
   */
  const generateEmailContent = () => {
    const signature = `Lep pozdrav,`;
    const hasSeasonalItems = offerItemsNajem.some(item => item.seasonal);

    // Seasonal text addition
    const seasonalText = hasSeasonalItems
      ? `\nKot dogovorjeno, ponudba vključuje tudi sezonsko prilagoditev s pogostejšo menjavo v obdobju povečanega obiska.\n`
      : '';

    const serviceText = hasSeasonalItems
      ? `Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih (z upoštevanjem sezonske prilagoditve) ter strošek pranja in dostave.`
      : `Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih ter strošek pranja in dostave.`;

    if (offerType === 'najem') return `Pozdravljeni,\n\nkot dogovorjeno pošiljam ponudbo za najem predpražnikov. V spodnji tabeli so navedene dimenzije, cene in pogostost menjave.${seasonalText}\n${generateNajemTable()}\n\n${serviceText}\n\nZa vsa dodatna vprašanja ali morebitne prilagoditve ponudbe sem vam z veseljem na voljo.\n\n${signature}`;
    if (offerType === 'nakup') return `Pozdravljeni,\n\nkot dogovorjeno pošiljam ponudbo za nakup profesionalnih predpražnikov. Podrobnosti o dimenzijah in cenah se nahajajo v spodnji tabeli.\n\n${generateNakupTable()}\n\nPredpražniki so visoke kakovosti in primerni za dolgotrajno uporabo.\n\nZa vsa dodatna vprašanja glede materialov ali dobavnih rokov sem vam na voljo.\n\n${signature}`;
    if (offerType === 'primerjava') return `Pozdravljeni,\n\nkot dogovorjeno pošiljam ponudbo za najem, prav tako pa spodaj prilagam tudi ponudbo za nakup predpražnikov, da lahko primerjate obe možnosti.${seasonalText}\n1. Opcija: Najem in vzdrževanje\nVključuje redno menjavo in čiščenje${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.\n\n${generateNajemTable()}\n\n2. Opcija: Nakup predpražnikov\nEnkraten strošek nakupa predpražnikov v trajno last.\n\n${generateNakupTableFromNajem()}\n\nZa vsa dodatna vprašanja ali pomoč pri izbiri optimalne rešitve sem vam z veseljem na voljo.\n\n${signature}`;
    if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');

      // Build intro text based on what items are included
      let introText = 'Pozdravljeni,\n\n';
      if (hasNajemItems && hasNakupItems) {
        introText += 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.';
      } else if (hasNajemItems) {
        introText += 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov.';
      } else if (hasNakupItems) {
        introText += 'kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.';
      }

      // Build najem section if has najem items
      let najemSection = '';
      if (hasNajemItems) {
        const sectionTitle = hasNakupItems ? '\n\n1. Najem predpražnikov\n' : '\n';
        najemSection = `${seasonalText}${sectionTitle}Vključuje servis in menjavo po dogovoru${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.\n\n${generateNajemTable()}`;
      }

      // Build nakup section if has nakup items
      let nakupSection = '';
      if (hasNakupItems) {
        const sectionTitle = hasNajemItems ? '\n\n2. Nakup predpražnikov\n' : '\n';
        nakupSection = `${sectionTitle}Predpražniki za nakup v trajno last (brez menjave).\n\n${generateNakupTableFiltered()}`;
      }

      return `${introText}${najemSection}${nakupSection}\n\nZa vsa dodatna vprašanja sem vam na voljo.\n\n${signature}`;
    }
    return '';
  };

  // Generate HTML table for NAKUP
  const generateNakupTableHTML = () => {
    const totalsNakup = calculateOfferTotals('nakup');
    const rows = offerItemsNakup.map(item => `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${item.pricePerUnit.toFixed(2)} €</td></tr>`).join('');
    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th colspan="2" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: left;">Artikel</th><th colspan="4" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Cena/kos<br/><em>NAKUP</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalsNakup.totalItems} KOS</p><p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> ${(totalsNakup as any).totalPrice?.toFixed(2)} €</p>`;
  };

  // Generate HTML table for NAJEM
  const generateNajemTableHTML = () => {
    // For primerjava/dodatna, filter only najem items
    const itemsToUse = (offerType === 'primerjava' || offerType === 'dodatna')
      ? offerItemsNajem.filter(i => i.purpose !== 'nakup')
      : offerItemsNajem;

    const hasSeasonalItems = itemsToUse.some(item => item.seasonal);
    const frequencyText = offerFrequency === '1' ? '1 teden' : `${offerFrequency} tedna`;

    // Calculate totals
    let normalTotal = 0;
    let seasonalTotal = 0;
    let normalPeriodInfo = '';
    let seasonalPeriodInfo = '';
    let normalFreqInfo = '';
    let seasonalFreqInfo = '';

    itemsToUse.forEach(item => {
      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        // Use normalPrice (from Obdobje 1) instead of pricePerUnit when seasonal is enabled
        const normalPrice = item.normalPrice || item.pricePerUnit;
        normalTotal += normalPrice * item.quantity * 4;
        seasonalTotal += item.seasonalPrice * item.quantity * 4;
        normalPeriodInfo = `teden ${item.normalFromWeek || 13}-${item.normalToWeek || 44}`;
        seasonalPeriodInfo = `teden ${item.seasonalFromWeek}-${item.seasonalToWeek}`;
        normalFreqInfo = item.normalFrequency === '1' ? '1 teden' : `${item.normalFrequency || '4'} tedne`;
        seasonalFreqInfo = item.seasonalFrequency === '1' ? '1 teden' : `${item.seasonalFrequency} tedna`;
      } else {
        normalTotal += item.pricePerUnit * item.quantity * 4;
      }
    });

    const totalItems = itemsToUse.reduce((sum, i) => sum + i.quantity, 0);

    const rows = itemsToUse.map(item => {
      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        const normalPeriod = `teden ${item.normalFromWeek || 13}-${item.normalToWeek || 44}`;
        const seasonalPeriod = `teden ${item.seasonalFromWeek}-${item.seasonalToWeek}`;
        // Use normalFrequency/normalPrice for Obdobje 1 (not the main offerFrequency/pricePerUnit)
        const normalFreqText = item.normalFrequency === '1' ? '1 teden' : `${item.normalFrequency || '4'} tedne`;
        const normalPrice = item.normalPrice || item.pricePerUnit;
        const seasonalFreqText = item.seasonalFrequency === '1' ? '1 teden' : `${item.seasonalFrequency} tedna`;
        return `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${normalFreqText}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${normalPeriod}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${normalPrice.toFixed(2)} €</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${(item.replacementCost || 0).toFixed(2)} €</td></tr><tr style="background-color: #fff8e6;"><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;"><strong>${seasonalFreqText}</strong></td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;"><strong>${seasonalPeriod}</strong></td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;"><strong>${item.seasonalPrice.toFixed(2)} €</strong></td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${(item.replacementCost || 0).toFixed(2)} €</td></tr>`;
      }
      return `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${frequencyText}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">-</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${item.pricePerUnit.toFixed(2)} €</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${(item.replacementCost || 0).toFixed(2)} €</td></tr>`;
    }).join('');

    // Build summary HTML based on whether there are seasonal items
    let summaryHTML = '';
    if (hasSeasonalItems) {
      summaryHTML = `
        <p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalItems} KOS</p>
        <p style="font-size: 12px; margin: 10px 0 5px 0;"><strong>4-tedenski obračun:</strong></p>
        <ul style="font-size: 12px; margin: 5px 0 5px 20px; padding: 0; list-style: none;">
          <li style="margin-bottom: 5px;"><strong>Obdobje 1</strong> (${normalPeriodInfo}, menjava na ${normalFreqInfo}): <strong>${normalTotal.toFixed(2)} €</strong></li>
          <li style="color: #b45309;"><strong>Obdobje 2</strong> (${seasonalPeriodInfo}, menjava na ${seasonalFreqInfo}): <strong>${seasonalTotal.toFixed(2)} €</strong></li>
        </ul>`;
    } else {
      summaryHTML = `
        <p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalItems} KOS</p>
        <p style="font-size: 12px; margin: 5px 0;"><strong>Frekvenca menjave:</strong> ${frequencyText.toUpperCase()}</p>
        <p style="font-size: 12px; margin: 5px 0;"><strong>4-tedenski obračun:</strong> ${normalTotal.toFixed(2)} €</p>`;
    }

    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th colspan="2" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: left;">Artikli za najem</th><th colspan="7" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Frekvenca menjave</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Obdobje</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Cena/teden/kos<br/><em>NAJEM</em></th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Povračilo<br/><em>(primer uničenja ali izgube) / kos</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p>${summaryHTML}`;
  };

  // Generate HTML nakup table from najem items (for primerjava/dodatna - only nakup purpose items)
  const generateNakupTableHTMLFromNajem = () => {
    // Filter only items with purpose === 'nakup'
    const nakupItems = offerItemsNajem.filter(i => i.purpose === 'nakup');
    // Price is already set correctly for nakup items
    const totals = { totalItems: nakupItems.reduce((sum, i) => sum + i.quantity, 0), totalPrice: nakupItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0) };
    const rows = nakupItems.map(item => `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${item.pricePerUnit.toFixed(2)} €</td></tr>`).join('');
    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th colspan="2" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: left;">Artikel</th><th colspan="4" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Cena/kos<br/><em>NAKUP</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totals.totalItems} KOS</p><p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> ${totals.totalPrice.toFixed(2)} €</p>`;
  };

  // Generate full HTML email
  const generateEmailHTML = () => {
    const signature = `<p style="margin-top: 20px;">Lep pozdrav,</p>`;
    const hasSeasonalItems = offerItemsNajem.some(item => item.seasonal);

    // Seasonal text addition
    const seasonalText = hasSeasonalItems
      ? `<p>Kot dogovorjeno, ponudba vključuje tudi <strong>sezonsko prilagoditev</strong> s pogostejšo menjavo v obdobju povečanega obiska.</p>`
      : '';

    const serviceText = hasSeasonalItems
      ? `<p>Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih (z upoštevanjem sezonske prilagoditve) ter strošek pranja in dostave.</p>`
      : `<p>Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih ter strošek pranja in dostave.</p>`;

    if (offerType === 'najem') return `<p>Pozdravljeni,</p><p>kot dogovorjeno pošiljam ponudbo za najem predpražnikov. V spodnji tabeli so navedene dimenzije, cene in pogostost menjave.</p>${seasonalText}${generateNajemTableHTML()}${serviceText}<p>Za vsa dodatna vprašanja ali morebitne prilagoditve ponudbe sem vam z veseljem na voljo.</p>${signature}`;
    if (offerType === 'nakup') return `<p>Pozdravljeni,</p><p>kot dogovorjeno pošiljam ponudbo za nakup profesionalnih predpražnikov. Podrobnosti o dimenzijah in cenah se nahajajo v spodnji tabeli.</p>${generateNakupTableHTML()}<p>Predpražniki so visoke kakovosti in primerni za dolgotrajno uporabo.</p><p>Za vsa dodatna vprašanja glede materialov ali dobavnih rokov sem vam na voljo.</p>${signature}`;
    if (offerType === 'primerjava') return `<p>Pozdravljeni,</p><p>kot dogovorjeno pošiljam ponudbo za najem, prav tako pa spodaj prilagam tudi ponudbo za nakup predpražnikov, da lahko primerjate obe možnosti.</p>${seasonalText}<h3 style="color: ${tableStyles.headerBg};">1. Opcija: Najem in vzdrževanje</h3><p>Vključuje redno menjavo in čiščenje${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.</p>${generateNajemTableHTML()}<h3 style="color: ${tableStyles.headerBg}; margin-top: 30px;">2. Opcija: Nakup predpražnikov</h3><p>Enkraten strošek nakupa predpražnikov v trajno last.</p>${generateNakupTableHTMLFromNajem()}<p>Za vsa dodatna vprašanja ali pomoč pri izbiri optimalne rešitve sem vam z veseljem na voljo.</p>${signature}`;
    if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');

      // Build intro text based on what items are included
      let introText = '<p>Pozdravljeni,</p>';
      if (hasNajemItems && hasNakupItems) {
        introText += '<p>kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.</p>';
      } else if (hasNajemItems) {
        introText += '<p>kot dogovorjeno pošiljam ponudbo za najem predpražnikov.</p>';
      } else if (hasNakupItems) {
        introText += '<p>kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.</p>';
      }

      // Build najem section if has najem items
      let najemSection = '';
      if (hasNajemItems) {
        const sectionTitle = hasNakupItems ? '<h3 style="color: ' + tableStyles.headerBg + ';">1. Najem predpražnikov</h3>' : '';
        najemSection = `${seasonalText}${sectionTitle}<p>Vključuje servis in menjavo po dogovoru${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.</p>${generateNajemTableHTML()}`;
      }

      // Build nakup section if has nakup items
      let nakupSection = '';
      if (hasNakupItems) {
        const sectionNumber = hasNajemItems ? '2' : '';
        const sectionTitle = hasNajemItems ? `<h3 style="color: ${tableStyles.headerBg}; margin-top: 30px;">${sectionNumber}. Nakup predpražnikov</h3>` : '';
        nakupSection = `${sectionTitle}<p>Predpražniki za nakup v trajno last (brez menjave).</p>${generateNakupTableHTMLFromNajem()}`;
      }

      return `${introText}${najemSection}${nakupSection}<p>Za vsa dodatna vprašanja sem vam na voljo.</p>${signature}`;
    }
    return '';
  };

  // Copy HTML to clipboard
  const copyHTMLToClipboard = async () => {
    const html = generateEmailHTML();
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([generateEmailContent()], { type: 'text/plain' }) })]);
      toast({ description: '✅ Ponudba kopirana! Prilepi v Outlook.' });
    } catch {
      try { await navigator.clipboard.writeText(html); toast({ description: '✅ HTML kopiran v odložišče' }); }
      catch { toast({ description: 'Napaka pri kopiranju', variant: 'destructive' }); }
    }
  };

  const sendOfferEmail = async () => {
    const primaryContact = selectedCompany ? getPrimaryContact(selectedCompany) : null;
    const email = primaryContact?.email || '';
    const companyName = selectedCompany?.name || '';
    let subject = 'Ponudba za predpražnike';
    if (offerType === 'primerjava') {
      subject = `Ponudba za nakup in najem predpražnikov - ${companyName}`;
    } else if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
      if (hasNajemItems && hasNakupItems) subject = `Ponudba za najem in nakup predpražnikov - ${companyName}`;
      else if (hasNajemItems) subject = `Ponudba za najem predpražnikov - ${companyName}`;
      else if (hasNakupItems) subject = `Ponudba za nakup predpražnikov - ${companyName}`;
    } else if (offerType === 'nakup') {
      subject = `Ponudba za nakup predpražnikov - ${companyName}`;
    } else if (offerType === 'najem') {
      subject = `Ponudba za najem predpražnikov - ${companyName}`;
    }

    // Copy HTML to clipboard first
    const html = generateEmailHTML();
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([generateEmailContent()], { type: 'text/plain' }) })]);
    } catch {
      await navigator.clipboard.writeText(generateEmailContent());
    }

    // Save offer to database
    await saveOfferToDatabase(subject, email);

    // Open mailto with just subject - user will paste content
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    toast({ description: '✅ Ponudba kopirana in shranjena - prilepi v Outlook (Ctrl+V)' });
  };

  // ==========================================================================
  // RENDER - JSX za prikaz uporabniškega vmesnika
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Stranke</h1>
            <div className="text-sm opacity-80">{filteredCompanies.length} strank</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:bg-blue-500 rounded-lg">
              <MoreVertical size={22} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={exportAllContacts}>
                <Download className="mr-2" size={16} />
                Izvozi vse kontakte (vCard)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectionMode(true);
                setSelectedContacts(new Set());
              }}>
                <CheckSquare className="mr-2" size={16} />
                Izberi kontakte za izvoz
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setSelectionMode(true);
                setSelectedContacts(new Set());
              }} className="text-red-600">
                <Trash2 className="mr-2" size={16} />
                Izberi kontakte za brisanje
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Urgent Reminders - Red Cards */}
        <UrgentReminders
          dueReminders={dueReminders}
          contractPendingCompanies={contractPendingCompanies}
          onOpenCompany={(companyId) => {
            setSelectedCompanyId(companyId);
            const company = companies?.find(c => c.id === companyId);
            if (company) setSelectedCompany(company);
          }}
          onCompleteReminder={handleCompleteReminder}
          onAddReminder={openReminderModal}
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Išči po imenu, kontaktu, telefonu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filters - Dropdowns */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
          >
            <option value="name">A-Ž po imenu</option>
            <option value="date">Po datumu</option>
            <option value="status">Po statusu</option>
          </select>

          {/* Period filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
          >
            <option value="all">Vsa obdobja</option>
            <option value="week">Ta teden</option>
            <option value="month">Ta mesec</option>
            <option value="lastMonth">Prejšnji mesec</option>
          </select>

          {/* Pipeline status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
          >
            <option value="all">Vsi statusi</option>
            {PIPELINE_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          {/* Quick filters */}
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'Vse' },
              { key: 'active', label: '🔵 Aktivne' },
              { key: 'overdue', label: '🔴 Zamude' },
              { key: 'signed', label: '✅ Pogodbe' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterType)}
                className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Route planning button */}
          {filteredCompanies.filter(c => getCompanyAddress(c)).length > 1 && (
            <button
              onClick={openRouteInMaps}
              className="px-3 py-2 rounded-lg text-sm whitespace-nowrap bg-orange-500 text-white flex items-center gap-1"
              title={`Odpri pot za ${Math.min(filteredCompanies.filter(c => getCompanyAddress(c)).length, 10)} strank`}
            >
              <MapPin size={16} /> Pot ({Math.min(filteredCompanies.filter(c => getCompanyAddress(c)).length, 10)})
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="ml-auto px-3 py-2 rounded-lg text-sm whitespace-nowrap bg-green-500 text-white flex items-center gap-1"
          >
            <Plus size={16} /> Dodaj
          </button>
        </div>

        {/* TODAY Section - Meetings and Deadlines */}
        {!searchQuery && (
          <TodaySection
            todayTasks={todayTasks}
            onCompanyClick={(companyId) => {
              const company = companies?.find(c => c.id === companyId);
              if (company) {
                setSelectedCompany(company);
                setSelectedCompanyId(company.id);
                addToRecent(company.id);
              }
            }}
          />
        )}

        {/* Selection Mode Bar */}
        {selectionMode && (
          <SelectionModeBar
            selectedCount={selectedContacts.size}
            totalCount={getAllContactsCount()}
            onSelectAll={selectAllContacts}
            onDeselectAll={deselectAllContacts}
            onExport={exportSelectedContacts}
            onDelete={deleteSelectedContacts}
            onCancel={() => {
              setSelectionMode(false);
              setSelectedContacts(new Set());
            }}
          />
        )}

        {/* Company List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Nalagam...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'Ni rezultatov iskanja' : 'Ni strank'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCompanies.map(company => {
              const primaryContact = getPrimaryContact(company);
              const address = formatAddress(company);
              const mapsUrl = getGoogleMapsUrl(company);
              const overdueCycle = company.cycles?.find((c: any) => isTestOverdue(c));
              const daysOverdue = overdueCycle ? getDaysOverdue(overdueCycle) : 0;
              const isRecent = recentCompanyIds.includes(company.id);

              return (
                <div
                  key={company.id}
                  className={`bg-white rounded-lg shadow overflow-hidden ${overdueCycle ? 'border-2 border-red-400' : ''} ${isRecent && !searchQuery ? 'ring-2 ring-blue-200' : ''}`}
                >
                  {/* Main card - clickable */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      if (!selectionMode) {
                        setSelectedCompany(company);
                        setSelectedCompanyId(company.id);
                        addToRecent(company.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-lg flex items-center gap-2">
                          <Building2 size={18} className="text-gray-400" />
                          {company.display_name || company.name}
                          {isRecent && !searchQuery && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              Nedavno
                            </span>
                          )}
                          {overdueCycle && (
                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                              {daysOverdue > 0 ? `${daysOverdue} dni zamude` : 'Zamuja'}
                            </span>
                          )}
                        </div>
                        {!selectionMode && primaryContact && (
                          <div className="text-sm text-gray-600 mt-1">
                            {primaryContact.first_name} {primaryContact.last_name}
                            {primaryContact.role && <span className="text-gray-400"> • {primaryContact.role}</span>}
                          </div>
                        )}
                        {address && (
                          <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin size={14} />
                            {address}
                          </div>
                        )}
                      </div>
                      {!selectionMode && <ChevronRight size={20} className="text-gray-400" />}
                    </div>

                    {/* Selection mode - show all contacts with checkboxes */}
                    {selectionMode && company.contacts.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {company.contacts.map(contact => (
                          <label
                            key={contact.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleContactSelection(contact.id);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedContacts.has(contact.id)
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {selectedContacts.has(contact.id) && <Check size={14} />}
                            </button>
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {contact.first_name} {contact.last_name}
                                {contact.role && <span className="text-gray-400 font-normal"> • {contact.role}</span>}
                              </div>
                              <div className="text-xs text-gray-500">
                                {contact.phone && <span className="mr-3">{contact.phone}</span>}
                                {contact.email && <span>{contact.email}</span>}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Stats - only show when not in selection mode */}
                    {!selectionMode && company.cycleStats.total > 0 && (
                      <div className="flex gap-3 mt-3 text-sm">
                        {company.cycleStats.onTest > 0 && (
                          <span className="text-blue-600">🔵 {company.cycleStats.onTest} na testu</span>
                        )}
                        {company.cycleStats.signed > 0 && (
                          <span className="text-green-600">✅ {company.cycleStats.signed} pogodb</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick actions - Klic, Email, Zemljevid */}
                  {!selectionMode && company.contacts.length > 0 && (
                    <div className="border-t flex divide-x">
                      {/* Klic */}
                      {company.contacts.some(c => c.phone) && (
                        company.contacts.filter(c => c.phone).length === 1 ? (
                          <a
                            href={`tel:${company.contacts.find(c => c.phone)?.phone}`}
                            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-blue-600 hover:bg-blue-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={16} />
                            <span className="text-sm">Klic</span>
                          </a>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="flex-1 py-2.5 flex items-center justify-center gap-1 text-blue-600 hover:bg-blue-50">
                                <Phone size={16} />
                                <span className="text-sm">Klic</span>
                                <ChevronDown size={12} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {company.contacts.filter(c => c.phone).map(contact => (
                                <DropdownMenuItem key={contact.id} asChild>
                                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2">
                                    <Phone size={14} />
                                    <span>{contact.first_name} {contact.last_name}</span>
                                  </a>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
                      {/* Email */}
                      {company.contacts.some(c => c.email) && (
                        company.contacts.filter(c => c.email).length === 1 ? (
                          <a
                            href={`mailto:${company.contacts.find(c => c.email)?.email}`}
                            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-purple-600 hover:bg-purple-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail size={16} />
                            <span className="text-sm">Email</span>
                          </a>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="flex-1 py-2.5 flex items-center justify-center gap-1 text-purple-600 hover:bg-purple-50">
                                <Mail size={16} />
                                <span className="text-sm">Email</span>
                                <ChevronDown size={12} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {company.contacts.filter(c => c.email).map(contact => (
                                <DropdownMenuItem key={contact.id} asChild>
                                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2">
                                    <Mail size={14} />
                                    <span>{contact.first_name} {contact.last_name}</span>
                                  </a>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
                      {/* Zemljevid */}
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-orange-600 hover:bg-orange-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin size={16} />
                          <span className="text-sm">Pot</span>
                        </a>
                      )}
                      {/* Opomnik */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReminderModal(company.id);
                        }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-amber-600 hover:bg-amber-50"
                      >
                        <Bell size={16} />
                        <span className="text-sm">Opomni</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b bg-blue-50 flex items-center justify-between">
              <h3 className="font-bold text-blue-800 flex items-center gap-2">
                <Bell size={20} />
                Dodaj opomnik
              </h3>
              <button onClick={() => {
                setShowReminderModal(false);
                setReminderCompanyId(null);
                setReminderDate('');
                setReminderTime('09:00');
                setReminderNote('');
              }} className="p-1 text-blue-800 hover:text-blue-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Datum</label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ura</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              {/* Quick time presets */}
              <div>
                <label className="block text-sm font-medium mb-1">Hitri izbor</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      now.setHours(now.getHours() + 1);
                      setReminderDate(now.toISOString().split('T')[0]);
                      setReminderTime(now.toTimeString().slice(0, 5));
                    }}
                    className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Čez 1 uro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setReminderDate(tomorrow.toISOString().split('T')[0]);
                      setReminderTime('09:00');
                    }}
                    className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Jutri zjutraj
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      setReminderDate(nextWeek.toISOString().split('T')[0]);
                      setReminderTime('09:00');
                    }}
                    className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Naslednji teden
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Opomba (neobvezno)</label>
                <textarea
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="Npr. Pokliči glede pogodbe..."
                  className="w-full p-2 border rounded-lg resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReminderModal(false);
                    setReminderCompanyId(null);
                    setReminderDate('');
                    setReminderTime('09:00');
                    setReminderNote('');
                  }}
                  className="flex-1 py-2 border rounded-lg text-gray-600"
                >
                  Prekliči
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!reminderDate || createReminder.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {createReminder.isPending ? 'Shranjujem...' : 'Shrani'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Company Modal */}
      {showExistingCompanyModal && existingCompany && pendingContactData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-orange-50 flex items-center justify-between">
              <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <Building2 size={20} />
                Podjetje že obstaja!
              </h3>
              <button onClick={() => {
                setShowExistingCompanyModal(false);
                setExistingCompany(null);
                setPendingContactData(null);
              }} className="p-1 text-orange-800 hover:text-orange-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Najdeno obstoječe podjetje:</p>
                <p className="font-bold text-lg">{existingCompany.name}</p>
                {existingCompany.tax_number && (
                  <p className="text-sm text-gray-500">ID za DDV: {existingCompany.tax_number}</p>
                )}
                {existingCompany.contacts && existingCompany.contacts.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Obstoječi kontakti: {existingCompany.contacts.map(c => `${c.first_name} ${c.last_name}`).join(', ')}
                  </p>
                )}
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Nov kontakt iz vCard:</p>
                <p className="font-medium">{pendingContactData.contactName || 'Brez imena'}</p>
                {pendingContactData.contactEmail && (
                  <p className="text-sm text-gray-600">{pendingContactData.contactEmail}</p>
                )}
                {pendingContactData.contactPhone && (
                  <p className="text-sm text-gray-600">{pendingContactData.contactPhone}</p>
                )}
                {pendingContactData.contactRole && (
                  <p className="text-sm text-gray-500">{pendingContactData.contactRole}</p>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Kaj želite storiti?
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleAddToExistingCompany}
                  disabled={addContact.isPending}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Users size={18} />
                  {addContact.isPending ? 'Dodajam...' : 'Dodaj kontakt k obstoječemu podjetju'}
                </button>

                <button
                  onClick={handleCreateNewAnyway}
                  className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={18} />
                  Ustvari novo podjetje vseeno
                </button>

                <button
                  onClick={() => {
                    setShowExistingCompanyModal(false);
                    setExistingCompany(null);
                    setPendingContactData(null);
                  }}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  Prekliči
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <QrCode size={20} />
                Skeniraj vCard QR
              </h3>
              <button
                onClick={() => {
                  if (scannerRef) {
                    scannerRef.stop().catch(console.error);
                  }
                  setShowQRScanner(false);
                  setScannerError(null);
                }}
                className="p-1"
              >
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
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
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
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Dodaj stranko</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="p-2 bg-purple-100 text-purple-600 rounded-lg flex items-center gap-1"
                  title="Skeniraj QR kodo vizitke"
                >
                  <QrCode size={20} />
                </button>
                <button onClick={() => setShowAddModal(false)} className="p-1">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ime podjetja *</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="ABC d.o.o."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ime na lokaciji</label>
                <input
                  type="text"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Hotel Draš (če se razlikuje od uradnega imena)"
                />
                <p className="text-xs text-gray-500 mt-1">Opcijsko - prikazano ime, če se razlikuje od uradnega</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Davčna številka</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.taxNumber || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^SI/i, '').replace(/\s/g, '');
                      setFormData({ ...formData, taxNumber: value });
                      // Avtomatsko poišči ko je 8 števk
                      if (/^\d{8}$/.test(value) && !taxLookupLoading) {
                        setTimeout(() => handleTaxLookup(), 100);
                      }
                    }}
                    className="flex-1 p-3 border rounded-lg"
                    placeholder="12345678"
                  />
                  <button
                    type="button"
                    onClick={handleTaxLookup}
                    disabled={taxLookupLoading || !formData.taxNumber}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:bg-gray-300"
                  >
                    {taxLookupLoading ? '...' : 'Izpolni'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Avtomatsko izpolni ali klikni "Izpolni"</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ulica</label>
                <input
                  type="text"
                  value={formData.addressStreet || ''}
                  onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Slovenska cesta 1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Pošta</label>
                  <input
                    type="text"
                    value={formData.addressPostal || ''}
                    onChange={(e) => {
                      const postal = e.target.value;
                      const city = getCityByPostalCode(postal);
                      setFormData({
                        ...formData,
                        addressPostal: postal,
                        ...(city && { addressCity: city })
                      });
                    }}
                    className="w-full p-3 border rounded-lg"
                    placeholder="1000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Kraj</label>
                  <input
                    type="text"
                    value={formData.addressCity || ''}
                    onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Ljubljana"
                  />
                </div>
              </div>

              {/* Naslov poslovalnice */}
              <div className="bg-amber-50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasDifferentDeliveryAddress || false}
                    onChange={(e) => setFormData({ ...formData, hasDifferentDeliveryAddress: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Poslovalnica na drugem naslovu</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Obkljukaj če se naslov dostave razlikuje od sedeža podjetja</p>

                {formData.hasDifferentDeliveryAddress && (
                  <div className="mt-3 space-y-3 pl-6 border-l-2 border-amber-300">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ulica poslovalnice</label>
                      <input
                        type="text"
                        value={formData.deliveryAddress || ''}
                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Industrijska cesta 5"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Pošta</label>
                        <input
                          type="text"
                          value={formData.deliveryPostal || ''}
                          onChange={(e) => {
                            const postal = e.target.value;
                            const city = getCityByPostalCode(postal);
                            setFormData({
                              ...formData,
                              deliveryPostal: postal,
                              ...(city && { deliveryCity: city })
                            });
                          }}
                          className="w-full p-3 border rounded-lg"
                          placeholder="1000"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Kraj</label>
                        <input
                          type="text"
                          value={formData.deliveryCity || ''}
                          onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                          className="w-full p-3 border rounded-lg"
                          placeholder="Ljubljana"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Kontaktna oseba</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ime in priimek</label>
                    <input
                      type="text"
                      value={formData.contactName || ''}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Janez Novak"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Vloga</label>
                    <input
                      type="text"
                      value={formData.contactRole || ''}
                      onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Direktor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={formData.contactPhone || ''}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full p-3 border rounded-lg"
                      placeholder="040 123 456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full p-3 border rounded-lg"
                      placeholder="janez@podjetje.si"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddCompany}
                disabled={createCompany.isPending}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300"
              >
                {createCompany.isPending ? 'Shranjujem...' : 'Dodaj stranko'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">{selectedCompany.display_name || selectedCompany.name}</h3>
              <button onClick={() => {
                setSelectedCompany(null);
                setSelectedCompanyId(null);
              }} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Company Info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {selectedCompany.tax_number && (
                      <div className="text-sm">
                        <span className="text-gray-500">Davčna:</span> {selectedCompany.tax_number}
                      </div>
                    )}

                    {/* Sedež podjetja */}
                    {selectedCompany.address_street && (
                      <div className="text-sm">
                        <span className="text-gray-500">
                          {(selectedCompany as any).delivery_address ? 'Sedež:' : 'Naslov:'}
                        </span> {selectedCompany.address_street}
                      </div>
                    )}
                    {(selectedCompany.address_postal || selectedCompany.address_city) && !(selectedCompany as any).delivery_address && (
                      <div className="text-sm">
                        <span className="text-gray-500">Pošta:</span> {selectedCompany.address_postal} {selectedCompany.address_city}
                      </div>
                    )}
                    {(selectedCompany.address_postal || selectedCompany.address_city) && (selectedCompany as any).delivery_address && (
                      <div className="text-sm text-gray-400 ml-4">
                        {selectedCompany.address_postal} {selectedCompany.address_city}
                      </div>
                    )}

                    {/* Naslov poslovalnice */}
                    {(selectedCompany as any).delivery_address && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-sm">
                          <span className="text-amber-600 font-medium">Poslovalnica:</span> {(selectedCompany as any).delivery_address}
                        </div>
                        {((selectedCompany as any).delivery_postal || (selectedCompany as any).delivery_city) && (
                          <div className="text-sm text-gray-500 ml-4">
                            {(selectedCompany as any).delivery_postal} {(selectedCompany as any).delivery_city}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Edit address button */}
                  <button
                    onClick={() => {
                      setEditAddressData({
                        addressStreet: selectedCompany.address_street || '',
                        addressPostal: selectedCompany.address_postal || '',
                        addressCity: selectedCompany.address_city || '',
                        deliveryAddress: (selectedCompany as any).delivery_address || '',
                        deliveryPostal: (selectedCompany as any).delivery_postal || '',
                        deliveryCity: (selectedCompany as any).delivery_city || '',
                        hasDifferentDeliveryAddress: !!(selectedCompany as any).delivery_address,
                      });
                      setShowEditAddressModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                    title="Uredi naslove"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>

              {/* Dated Notes Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <StickyNote size={18} className="text-yellow-500" />
                    Opombe
                  </h4>
                </div>

                {/* Quick action buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => {
                      if (selectedCompany) {
                        addNoteMutation.mutate({
                          companyId: selectedCompany.id,
                          noteDate: new Date().toISOString().split('T')[0],
                          content: 'Klical - ni dvignil',
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-medium"
                  >
                    Klical - ni dvignil
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCompany) {
                        addNoteMutation.mutate({
                          companyId: selectedCompany.id,
                          noteDate: new Date().toISOString().split('T')[0],
                          content: 'Ni interesa',
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-xs font-medium"
                  >
                    Ni interesa
                  </button>
                  <button
                    onClick={() => {
                      setMeetingType('ponudba');
                      setMeetingDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      setMeetingTime('09:00');
                      setShowMeetingModal(true);
                    }}
                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-full text-xs font-medium"
                  >
                    Pošlji ponudbo do...
                  </button>
                  <button
                    onClick={() => {
                      setMeetingType('sestanek');
                      setMeetingDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      setMeetingTime('10:00');
                      setShowMeetingModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-medium"
                  >
                    Dogovorjen sestanek...
                  </button>
                </div>

                {/* Add new note */}
                <div className="bg-yellow-50 rounded-lg p-3 mb-3">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="date"
                      value={newNoteDate}
                      onChange={(e) => setNewNoteDate(e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        if (newNoteContent.trim() && selectedCompany) {
                          addNoteMutation.mutate({
                            companyId: selectedCompany.id,
                            noteDate: newNoteDate,
                            content: newNoteContent.trim(),
                          });
                        }
                      }}
                      disabled={!newNoteContent.trim() || addNoteMutation.isPending}
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-sm disabled:bg-gray-300 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Dodaj
                    </button>
                  </div>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Prosta opomba..."
                    className="w-full p-2 border rounded text-sm"
                    rows={2}
                  />
                </div>

                {/* Notes list */}
                {isLoadingNotes ? (
                  <div className="text-center py-2 text-gray-500 text-sm">Nalagam opombe...</div>
                ) : companyNotes && companyNotes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {companyNotes.map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded-lg p-3 relative group">
                        <div className="flex items-start justify-between">
                          <div className="text-xs text-gray-500 font-medium mb-1">
                            {new Date(note.note_date).toLocaleDateString('sl-SI', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <button
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-2">Ni opomb</p>
                )}
              </div>

              {/* Stats */}
              {selectedCompany.cycleStats.total > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{selectedCompany.cycleStats.onTest}</div>
                    <div className="text-xs text-gray-500">Na testu</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{selectedCompany.cycleStats.signed}</div>
                    <div className="text-xs text-gray-500">Pogodb</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-gray-600">{selectedCompany.cycleStats.total}</div>
                    <div className="text-xs text-gray-500">Skupaj</div>
                  </div>
                </div>
              )}

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Kontaktne osebe</h4>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="text-sm text-blue-500 flex items-center gap-1"
                  >
                    <Plus size={16} /> Dodaj
                  </button>
                </div>

                {selectedCompany.contacts.length === 0 ? (
                  <p className="text-gray-500 text-sm">Ni kontaktnih oseb</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCompany.contacts.map(contact => (
                      <div key={contact.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <User size={16} className="text-gray-400" />
                              {contact.first_name} {contact.last_name}
                              {contact.is_primary && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Glavni</span>
                              )}
                            </div>
                            {contact.role && (
                              <div className="text-sm text-gray-500">{contact.role}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingContact(contact);
                                setEditContactData({
                                  first_name: contact.first_name || '',
                                  last_name: contact.last_name || '',
                                  phone: contact.phone || '',
                                  email: contact.email || '',
                                  role: contact.role || '',
                                  is_primary: contact.is_primary || false,
                                  location_address: (contact as any).location_address || '',
                                  contact_since: (contact as any).contact_since || '',
                                });
                              }}
                              className="text-blue-500 p-1 hover:text-blue-700"
                              title="Uredi kontakt"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-red-500 p-1 hover:text-red-700"
                              title="Izbriši kontakt"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center gap-1 text-sm text-blue-600"
                            >
                              <Phone size={14} /> {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-1 text-sm text-purple-600"
                            >
                              <Mail size={14} /> {contact.email}
                            </a>
                          )}
                        </div>
                        {(contact as any).contact_since && (
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            Kontakt od: {new Date((contact as any).contact_since).toLocaleDateString('sl-SI')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cycles History */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package size={18} className="text-gray-400" />
                  Zgodovina predpražnikov
                </h4>

                {isLoadingDetails ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Nalagam...</div>
                ) : !companyDetails?.cycles || companyDetails.cycles.length === 0 ? (
                  <p className="text-gray-500 text-sm">Ni zgodovine predpražnikov</p>
                ) : (
                  <div className="space-y-2">
                    {companyDetails.cycles.map((cycle: any) => {
                      const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
                        on_test: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Na testu' },
                        completed: { icon: CheckCircle, color: 'text-gray-600 bg-gray-100', label: 'Zaključen' },
                        clean: { icon: Package, color: 'text-green-600 bg-green-50', label: 'Čist' },
                      };
                      const status = statusConfig[cycle.status] || statusConfig.clean;
                      const StatusIcon = status.icon;

                      return (
                        <div key={cycle.id} className={`rounded-lg p-3 ${status.color.split(' ')[1]}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {cycle.mat_type?.name || 'Predpražnik'}
                                <span className="text-xs text-gray-500">
                                  ({cycle.qr_code?.code || 'N/A'})
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(cycle.created_at).toLocaleDateString('sl-SI')}
                                {cycle.test_end_date && (
                                  <span className="text-gray-400">
                                    {' → '}{new Date(cycle.test_end_date).toLocaleDateString('sl-SI')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                              <StatusIcon size={12} />
                              {status.label}
                              {cycle.contract_signed && (
                                <span className="ml-1">✅</span>
                              )}
                            </div>
                          </div>
                          {cycle.notes && (
                            <div className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                              <FileText size={12} className="mt-0.5 flex-shrink-0" />
                              {cycle.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sent Offers */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText size={18} className="text-gray-400" />
                  Poslane ponudbe
                </h4>

                {loadingSentOffers ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Nalagam...</div>
                ) : sentOffers.length === 0 ? (
                  <p className="text-gray-500 text-sm">Ni poslanih ponudb</p>
                ) : (
                  <div className="space-y-2">
                    {sentOffers.map((offer) => {
                      const offerTypeLabel = offer.offer_type === 'rental' ? 'Najem' :
                        offer.offer_type === 'purchase' ? 'Nakup' : 'Najem + Nakup';
                      const frequencyLabel = offer.frequency ? `${offer.frequency} ${offer.frequency === '1' ? 'teden' : 'tedna'}` : '';
                      const hasContract = savedContracts.some(c => c.offer_id === offer.id);

                      return (
                        <div key={offer.id} className={`rounded-lg p-3 ${hasContract ? 'bg-green-50 border border-green-200' : 'bg-purple-50'}`}>
                          <div className="flex items-start justify-between">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedOffer(offer);
                                setShowContractConfirm(true);
                              }}
                            >
                              <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  offer.offer_type === 'rental' ? 'bg-blue-100 text-blue-700' :
                                  offer.offer_type === 'purchase' ? 'bg-green-100 text-green-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {offerTypeLabel}
                                </span>
                                {frequencyLabel && <span className="text-gray-500 text-xs">{frequencyLabel}</span>}
                                {hasContract && (
                                  <span className="px-2 py-0.5 rounded text-xs bg-green-500 text-white flex items-center gap-1">
                                    <FileSignature size={10} />
                                    Pogodba
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(offer.sent_at).toLocaleDateString('sl-SI')}
                                <span className="text-gray-400 ml-2">{offer.recipient_email}</span>
                              </div>
                              {offer.items && offer.items.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {offer.items.length} artikel{offer.items.length > 1 ? 'ov' : ''}
                                  {offer.items.map((item: any) => item.notes).filter(Boolean).slice(0, 2).join(', ') && (
                                    <span className="text-gray-400"> • {offer.items.map((item: any) => item.notes).filter(Boolean).slice(0, 2).join(', ')}</span>
                                  )}
                                </div>
                              )}
                              {hasContract && (
                                <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <FileSignature size={12} />
                                  Pogodba generirana {new Date(savedContracts.find(c => c.offer_id === offer.id)?.generated_at || '').toLocaleDateString('sl-SI')}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSentOffer(offer.id);
                              }}
                              className="text-red-500 p-1 hover:bg-red-100 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <button
                  onClick={openOfferModal}
                  className="w-full py-3 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
                >
                  <Euro size={18} /> Pošlji ponudbo
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {getGoogleMapsUrl(selectedCompany) && (
                    <a
                      href={getGoogleMapsUrl(selectedCompany)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center gap-2"
                    >
                      <MapPin size={18} /> Navigacija
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCompany(null);
                      setSelectedCompanyId(null);
                      navigate('/prodajalec');
                    }}
                    className="py-3 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Camera size={18} /> Dodaj predpražnik
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Dodaj kontakt</h3>
              <button onClick={() => setShowAddContactModal(false)} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ime in priimek *</label>
                <input
                  type="text"
                  value={formData.newContactName || ''}
                  onChange={(e) => setFormData({ ...formData, newContactName: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Ana Horvat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vloga</label>
                <input
                  type="text"
                  value={formData.newContactRole || ''}
                  onChange={(e) => setFormData({ ...formData, newContactRole: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Vodja nabave"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.newContactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, newContactPhone: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="040 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.newContactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, newContactEmail: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="ana@podjetje.si"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kontakt od</label>
                <input
                  type="date"
                  value={formData.newContactSince || ''}
                  onChange={(e) => setFormData({ ...formData, newContactSince: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Od kdaj imate ta kontakt (za segmentacijo)</p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasDifferentLocation || false}
                    onChange={(e) => setFormData({ ...formData, hasDifferentLocation: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Druga lokacija (poslovalnica)</span>
                </label>
                {formData.hasDifferentLocation && (
                  <input
                    type="text"
                    placeholder="Naslov poslovalnice"
                    value={formData.newContactLocation || ''}
                    onChange={(e) => setFormData({ ...formData, newContactLocation: e.target.value })}
                    className="w-full p-3 border rounded-lg mt-2"
                  />
                )}
              </div>

              <button
                onClick={handleAddContact}
                disabled={addContact.isPending}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300"
              >
                {addContact.isPending ? 'Shranjujem...' : 'Dodaj kontakt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting/Deadline Modal */}
      {showMeetingModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">
                {meetingType === 'sestanek' ? 'Dogovorjen sestanek' : 'Pošlji ponudbo do'}
              </h3>
              <button onClick={() => setShowMeetingModal(false)} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Datum</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              {meetingType === 'sestanek' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Ura</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              )}

              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                {meetingType === 'sestanek' ? (
                  <>
                    <p className="font-medium text-gray-700 mb-1">Bo shranjeno:</p>
                    <p>Dogovorjen sestanek za {new Date(meetingDate).toLocaleDateString('sl-SI')} ob {meetingTime}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-700 mb-1">Bo shranjeno:</p>
                    <p>Pošlji ponudbo do {new Date(meetingDate).toLocaleDateString('sl-SI')}</p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const content = meetingType === 'sestanek'
                      ? `Dogovorjen sestanek za ${new Date(meetingDate).toLocaleDateString('sl-SI')} ob ${meetingTime}`
                      : `Pošlji ponudbo do ${new Date(meetingDate).toLocaleDateString('sl-SI')}`;

                    addNoteMutation.mutate({
                      companyId: selectedCompany.id,
                      noteDate: new Date().toISOString().split('T')[0],
                      content,
                    });

                    // Generate ICS file
                    generateICSFile(selectedCompany, meetingDate, meetingType === 'sestanek' ? meetingTime : '09:00', meetingType);

                    setShowMeetingModal(false);
                  }}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Calendar size={18} />
                  Shrani + Prenesi .ics
                </button>
              </div>

              <button
                onClick={() => {
                  const content = meetingType === 'sestanek'
                    ? `Dogovorjen sestanek za ${new Date(meetingDate).toLocaleDateString('sl-SI')} ob ${meetingTime}`
                    : `Pošlji ponudbo do ${new Date(meetingDate).toLocaleDateString('sl-SI')}`;

                  addNoteMutation.mutate({
                    companyId: selectedCompany.id,
                    noteDate: new Date().toISOString().split('T')[0],
                    content,
                  });

                  setShowMeetingModal(false);
                }}
                className="w-full py-2 text-gray-500 text-sm"
              >
                Samo shrani (brez .ics)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {showEditAddressModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Uredi naslove</h3>
              <button onClick={() => setShowEditAddressModal(false)} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Sedež podjetja */}
              <div>
                <h4 className="font-medium text-sm text-gray-600 mb-2">Sedež podjetja (registrirani naslov)</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editAddressData.addressStreet || ''}
                    onChange={(e) => setEditAddressData({ ...editAddressData, addressStreet: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Ulica in hišna številka"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={editAddressData.addressPostal || ''}
                      onChange={(e) => {
                        const postal = e.target.value;
                        const city = getCityByPostalCode(postal);
                        setEditAddressData({
                          ...editAddressData,
                          addressPostal: postal,
                          ...(city && { addressCity: city })
                        });
                      }}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Pošta"
                    />
                    <input
                      type="text"
                      value={editAddressData.addressCity || ''}
                      onChange={(e) => setEditAddressData({ ...editAddressData, addressCity: e.target.value })}
                      className="col-span-2 w-full p-3 border rounded-lg"
                      placeholder="Kraj"
                    />
                  </div>
                </div>
              </div>

              {/* Naslov poslovalnice */}
              <div className="bg-amber-50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAddressData.hasDifferentDeliveryAddress || false}
                    onChange={(e) => setEditAddressData({ ...editAddressData, hasDifferentDeliveryAddress: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Poslovalnica na drugem naslovu</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Naslov kamor gre šofer po predpražnike</p>

                {editAddressData.hasDifferentDeliveryAddress && (
                  <div className="mt-3 space-y-3 pl-6 border-l-2 border-amber-300">
                    <input
                      type="text"
                      value={editAddressData.deliveryAddress || ''}
                      onChange={(e) => setEditAddressData({ ...editAddressData, deliveryAddress: e.target.value })}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Ulica poslovalnice"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editAddressData.deliveryPostal || ''}
                        onChange={(e) => {
                          const postal = e.target.value;
                          const city = getCityByPostalCode(postal);
                          setEditAddressData({
                            ...editAddressData,
                            deliveryPostal: postal,
                            ...(city && { deliveryCity: city })
                          });
                        }}
                        className="w-full p-3 border rounded-lg"
                        placeholder="Pošta"
                      />
                      <input
                        type="text"
                        value={editAddressData.deliveryCity || ''}
                        onChange={(e) => setEditAddressData({ ...editAddressData, deliveryCity: e.target.value })}
                        className="col-span-2 w-full p-3 border rounded-lg"
                        placeholder="Kraj"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('companies')
                      .update({
                        address_street: editAddressData.addressStreet || null,
                        address_postal: editAddressData.addressPostal || null,
                        address_city: editAddressData.addressCity || null,
                        delivery_address: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryAddress : null,
                        delivery_postal: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryPostal : null,
                        delivery_city: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryCity : null,
                      })
                      .eq('id', selectedCompany.id);

                    if (error) throw error;

                    // Update local state
                    const updated = {
                      ...selectedCompany,
                      address_street: editAddressData.addressStreet || null,
                      address_postal: editAddressData.addressPostal || null,
                      address_city: editAddressData.addressCity || null,
                      delivery_address: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryAddress : null,
                      delivery_postal: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryPostal : null,
                      delivery_city: editAddressData.hasDifferentDeliveryAddress ? editAddressData.deliveryCity : null,
                    };
                    setSelectedCompany(updated as any);
                    queryClient.invalidateQueries({ queryKey: ['companies'] });

                    toast({ description: 'Naslovi posodobljeni' });
                    setShowEditAddressModal(false);
                  } catch (error: any) {
                    console.error('Error updating address:', error);
                    toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
                  }
                }}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
              >
                Shrani naslove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Uredi kontakt</h3>
              <button onClick={() => setEditingContact(null)} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Ime *</label>
                  <input
                    type="text"
                    value={editContactData.first_name || ''}
                    onChange={(e) => setEditContactData({ ...editContactData, first_name: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Ana"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priimek</label>
                  <input
                    type="text"
                    value={editContactData.last_name || ''}
                    onChange={(e) => setEditContactData({ ...editContactData, last_name: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Horvat"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vloga</label>
                <input
                  type="text"
                  value={editContactData.role || ''}
                  onChange={(e) => setEditContactData({ ...editContactData, role: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Vodja nabave"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input
                  type="tel"
                  value={editContactData.phone || ''}
                  onChange={(e) => setEditContactData({ ...editContactData, phone: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="040 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editContactData.email || ''}
                  onChange={(e) => setEditContactData({ ...editContactData, email: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="ana@podjetje.si"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kontakt od</label>
                <input
                  type="date"
                  value={editContactData.contact_since || ''}
                  onChange={(e) => setEditContactData({ ...editContactData, contact_since: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Od kdaj imate ta kontakt</p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editContactData.is_primary || false}
                    onChange={(e) => setEditContactData({ ...editContactData, is_primary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Glavni kontakt</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Druga lokacija (poslovalnica)</label>
                <input
                  type="text"
                  value={editContactData.location_address || ''}
                  onChange={(e) => setEditContactData({ ...editContactData, location_address: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Naslov poslovalnice (opcijsko)"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingContact(null)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Prekliči
                </button>
                <button
                  onClick={async () => {
                    if (!editContactData.first_name?.trim()) {
                      toast({ description: 'Ime je obvezno', variant: 'destructive' });
                      return;
                    }
                    try {
                      await updateContact.mutateAsync({
                        contactId: editingContact.id,
                        data: {
                          first_name: editContactData.first_name.trim(),
                          last_name: editContactData.last_name?.trim() || '',
                          phone: editContactData.phone?.trim() || null,
                          email: editContactData.email?.trim() || null,
                          role: editContactData.role?.trim() || null,
                          is_primary: editContactData.is_primary || false,
                          location_address: editContactData.location_address?.trim() || null,
                          contact_since: editContactData.contact_since || null,
                        },
                      });
                      toast({ description: 'Kontakt posodobljen' });
                      setEditingContact(null);
                    } catch (error) {
                      toast({ description: 'Napaka pri posodabljanju', variant: 'destructive' });
                    }
                  }}
                  disabled={updateContact.isPending}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300"
                >
                  {updateContact.isPending ? 'Shranjujem...' : 'Shrani'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Ponudba - {selectedCompany.name}</h3>
              <button onClick={() => setShowOfferModal(false)} className="p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Step 1: Select offer type */}
              {offerStep === 'type' && (
                <div className="space-y-4">
                  <div className="text-center text-gray-600 mb-4">Izberi tip ponudbe</div>

                  <div className="space-y-3">
                    {/* Option 1: Samo najem */}
                    <button
                      onClick={() => setOfferType('najem')}
                      className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'najem' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'najem' ? 'border-blue-500' : 'border-gray-300'}`}>
                          {offerType === 'najem' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                        </div>
                        <div>
                          <div className="font-bold text-blue-600">NAJEM</div>
                          <div className="text-sm text-gray-500">Samo najem predpražnikov</div>
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Samo nakup */}
                    <button
                      onClick={() => setOfferType('nakup')}
                      className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'nakup' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'nakup' ? 'border-yellow-500' : 'border-gray-300'}`}>
                          {offerType === 'nakup' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />}
                        </div>
                        <div>
                          <div className="font-bold text-yellow-600">NAKUP</div>
                          <div className="text-sm text-gray-500">Samo nakup predpražnikov</div>
                        </div>
                      </div>
                    </button>

                    {/* Option 3: Primerjava */}
                    <button
                      onClick={() => setOfferType('primerjava')}
                      className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'primerjava' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'primerjava' ? 'border-green-500' : 'border-gray-300'}`}>
                          {offerType === 'primerjava' && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                        </div>
                        <div>
                          <div className="font-bold text-green-600">PRIMERJAVA</div>
                          <div className="text-sm text-gray-500">Isti artikli za najem IN nakup</div>
                        </div>
                      </div>
                    </button>

                    {/* Option 4: Dodatna prodaja */}
                    <button
                      onClick={() => setOfferType('dodatna')}
                      className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'dodatna' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'dodatna' ? 'border-purple-500' : 'border-gray-300'}`}>
                          {offerType === 'dodatna' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                        </div>
                        <div>
                          <div className="font-bold text-purple-600">DODATNA PRODAJA</div>
                          <div className="text-sm text-gray-500">Različni artikli za najem in nakup</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Frekvenca for najem types */}
                  {hasNajem && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm font-medium mb-2">Frekvenca menjave:</div>
                      <div className="grid grid-cols-4 gap-2">
                        {['1', '2', '3', '4'].map(freq => (
                          <button key={freq} onClick={() => updateNajemPricesForFrequency(freq)} className={`py-2 rounded ${offerFrequency === freq ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                            {freq} {freq === '1' ? 'teden' : 'tedne'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      // For primerjava and dodatna, go directly to items-najem (with purpose selector)
                      if (offerType === 'primerjava' || offerType === 'dodatna') setOfferStep('items-najem');
                      else if (hasNakup) setOfferStep('items-nakup');
                      else if (hasNajem) setOfferStep('items-najem');
                    }}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
                  >
                    Naprej →
                  </button>
                </div>
              )}

              {/* Step 2a: Configure NAKUP items */}
              {offerStep === 'items-nakup' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-2 rounded text-sm text-center font-medium">💰 Nakup - enkratni nakup</div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {offerItemsNakup.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Artikel {index + 1}</span>
                          {offerItemsNakup.length > 1 && (
                            <button onClick={() => removeOfferItem(item.id, 'nakup')} className="text-red-500 p-1"><Trash2 size={18} /></button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-1">
                          <button onClick={() => handleItemTypeChange(item.id, 'design', 'nakup')} className={`py-1 px-2 text-xs rounded ${item.itemType === 'design' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Design</button>
                          <button onClick={() => handleItemTypeChange(item.id, 'custom', 'nakup')} className={`py-1 px-2 text-xs rounded ${item.itemType === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Custom</button>
                        </div>

                        {item.itemType === 'design' && (
                          <select value={item.code} onChange={(e) => handleDesignSizeSelect(item.id, e.target.value, 'nakup')} className="w-full p-2 border rounded text-sm">
                            <option value="">Izberi velikost...</option>
                            {DESIGN_SIZES.map(d => (<option key={d.code} value={d.code}>{d.label}</option>))}
                          </select>
                        )}

                        {item.itemType === 'custom' && (
                          <div>
                            <label className="block text-xs text-gray-500">Dimenzije (cm)</label>
                            <input type="text" value={item.size} onChange={(e) => handleCustomDimensionsChange(item.id, e.target.value, 'nakup')} className="w-full p-2 border rounded text-sm" placeholder="npr. 120*180" />
                            {item.m2 ? <div className="text-xs text-gray-500 mt-1">{item.m2.toFixed(2)} m²</div> : null}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Količina</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateOfferItem(item.id, { quantity: parseInt(e.target.value) || 1 }, 'nakup')} className="w-full p-2 border rounded text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Cena/kos €</label>
                            <input type="number" step="0.01" min="0" value={item.pricePerUnit || ''} onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0, 'nakup')} className="w-full p-2 border rounded text-sm" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Popust %</label>
                            <input type="number" min="0" max="100" value={item.discount || ''} onChange={(e) => handleDiscountChange(item.id, parseInt(e.target.value) || 0, 'nakup')} className="w-full p-2 border rounded text-sm" placeholder="0" />
                          </div>
                        </div>

                        {item.discount && item.discount > 0 && item.originalPrice && (
                          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                            💰 Izhodiščna: {item.originalPrice.toFixed(2)} € → <span className="font-bold">-{item.discount}%</span> = {item.pricePerUnit.toFixed(2)} €
                          </div>
                        )}

                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={item.customized} onChange={(e) => updateOfferItem(item.id, { customized: e.target.checked }, 'nakup')} />
                          Kupcu prilagojen izdelek
                        </label>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => addCustomOfferItem('nakup')} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 flex items-center justify-center gap-2">
                    <Plus size={18} /> Dodaj artikel
                  </button>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Število artiklov:</span>
                      <span className="font-bold">{calculateOfferTotals('nakup').totalItems} KOS</span>
                    </div>
                    <div className="flex justify-between text-lg mt-2 pt-2 border-t border-yellow-200">
                      <span>Skupaj:</span>
                      <span className="font-bold">{(calculateOfferTotals('nakup') as any).totalPrice?.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setOfferStep('type')} className="flex-1 py-2 border rounded">← Nazaj</button>
                    <button
                      onClick={() => hasNajem ? setOfferStep('items-najem') : setOfferStep('preview')}
                      disabled={offerItemsNakup.some(i => !i.code || i.pricePerUnit <= 0)}
                      className="flex-1 bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
                    >
                      {hasNajem ? 'Najem →' : 'Predogled →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2b: Configure NAJEM items */}
              {offerStep === 'items-najem' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-2 rounded text-sm text-center font-medium">
                    🔄 {offerType === 'primerjava' ? 'Artikli (najem + nakup)' : offerType === 'dodatna' ? 'Artikli' : 'Najem'} - menjava na {offerFrequency} {offerFrequency === '1' ? 'teden' : 'tedne'}
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {offerItemsNajem.map((item, index) => (
                      <div key={item.id} className={`border rounded-lg p-3 space-y-2 ${item.purpose === 'nakup' ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Artikel {index + 1}
                            {item.purpose === 'nakup' && <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">NAKUP</span>}
                          </span>
                          {offerItemsNajem.length > 1 && (
                            <button onClick={() => removeOfferItem(item.id, 'najem')} className="text-red-500 p-1"><Trash2 size={18} /></button>
                          )}
                        </div>

                        <div className={`grid gap-1 ${item.purpose === 'nakup' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {item.purpose !== 'nakup' && (
                            <button onClick={() => handleItemTypeChange(item.id, 'standard', 'najem')} className={`py-1 px-2 text-xs rounded ${item.itemType === 'standard' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Standardni</button>
                          )}
                          <button onClick={() => handleItemTypeChange(item.id, 'design', 'najem')} className={`py-1 px-2 text-xs rounded ${item.itemType === 'design' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Design</button>
                          <button onClick={() => handleItemTypeChange(item.id, 'custom', 'najem')} className={`py-1 px-2 text-xs rounded ${item.itemType === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Custom</button>
                        </div>

                        {item.itemType === 'standard' && (
                          <select value={item.code} onChange={(e) => {
                            const code = e.target.value;
                            const priceInfo = getPriceByCode(code);
                            const price = item.purpose === 'nakup'
                              ? getPurchasePrice(code)
                              : getRentalPrice(code, offerFrequency as FrequencyKey);
                            updateOfferItem(item.id, {
                              code,
                              size: priceInfo?.dimensions || '',
                              m2: priceInfo?.m2,
                              pricePerUnit: price,
                              replacementCost: item.purpose !== 'nakup' ? getReplacementCost(code) : 0,
                              name: 'predpražnik'
                            }, 'najem');
                          }} className="w-full p-2 border rounded text-sm">
                            <option value="">Izberi tip...</option>
                            {STANDARD_TYPES.map(t => (<option key={t.code} value={t.code}>{t.label}</option>))}
                          </select>
                        )}

                        {item.itemType === 'design' && (
                          <select value={item.code} onChange={(e) => {
                            const code = e.target.value;
                            const designSize = DESIGN_SIZES.find(d => d.code === code);
                            const m2 = designSize ? calculateM2FromDimensions(designSize.dimensions) : 0;
                            const price = item.purpose === 'nakup'
                              ? calculateCustomPurchasePrice(m2)
                              : calculateCustomPrice(m2, offerFrequency as FrequencyKey);
                            updateOfferItem(item.id, {
                              code,
                              size: designSize?.dimensions || '',
                              m2,
                              pricePerUnit: price,
                              replacementCost: item.purpose !== 'nakup' ? calculateCustomPurchasePrice(m2) : 0,
                              name: 'predpražnik po meri'
                            }, 'najem');
                          }} className="w-full p-2 border rounded text-sm">
                            <option value="">Izberi velikost...</option>
                            {DESIGN_SIZES.map(d => (<option key={d.code} value={d.code}>{d.label}</option>))}
                          </select>
                        )}

                        {item.itemType === 'custom' && (
                          <div>
                            <label className="block text-xs text-gray-500">Dimenzije (cm)</label>
                            <input type="text" value={item.size} onChange={(e) => {
                              const dims = e.target.value;
                              const m2 = calculateM2FromDimensions(dims);
                              const price = item.purpose === 'nakup'
                                ? calculateCustomPurchasePrice(m2)
                                : calculateCustomPrice(m2, offerFrequency as FrequencyKey);
                              updateOfferItem(item.id, {
                                size: dims,
                                m2: m2 || undefined,
                                pricePerUnit: price,
                                code: m2 > 0 ? `CUSTOM-${dims.replace('*', 'x')}` : '',
                                replacementCost: item.purpose !== 'nakup' ? calculateCustomPurchasePrice(m2) : 0,
                                name: 'predpražnik po meri'
                              }, 'najem');
                            }} className="w-full p-2 border rounded text-sm" placeholder="npr. 120*180" />
                            {item.m2 && item.m2 > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                📐 {item.m2.toFixed(2)} m² {item.purpose === 'nakup' ? `× 165€ = ${item.pricePerUnit.toFixed(2)}€` : `→ ${item.m2 <= 2 ? '≤2m² tarifa' : '>2m² tarifa'}`}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Purpose selector - only for primerjava and dodatna */}
                        {(offerType === 'primerjava' || offerType === 'dodatna') && (
                          <select
                            value={item.purpose || 'najem'}
                            onChange={(e) => {
                              const newPurpose = e.target.value as 'najem' | 'nakup';
                              let newPrice = item.pricePerUnit;
                              let newItemType = item.itemType;
                              let newCode = item.code;
                              let newSize = item.size;
                              let newM2 = item.m2;
                              let newName = item.name;

                              // If switching to nakup and currently standard, change to design (standard items are not for sale)
                              if (newPurpose === 'nakup' && item.itemType === 'standard') {
                                newItemType = 'design';
                                newCode = '';
                                newSize = '';
                                newM2 = undefined;
                                newPrice = 0;
                                newName = 'predpražnik po meri';
                              } else if (item.code) {
                                if (item.itemType === 'standard') {
                                  newPrice = newPurpose === 'nakup'
                                    ? getPurchasePrice(item.code)
                                    : getRentalPrice(item.code, offerFrequency as FrequencyKey);
                                } else if (item.m2) {
                                  newPrice = newPurpose === 'nakup'
                                    ? calculateCustomPurchasePrice(item.m2)
                                    : calculateCustomPrice(item.m2, offerFrequency as FrequencyKey);
                                }
                              }
                              updateOfferItem(item.id, {
                                purpose: newPurpose,
                                itemType: newItemType,
                                code: newCode,
                                size: newSize,
                                m2: newM2,
                                name: newName,
                                pricePerUnit: newPrice,
                                replacementCost: newPurpose === 'nakup' ? 0 : (item.m2 ? calculateCustomPurchasePrice(item.m2) : getReplacementCost(item.code)),
                                discount: newPurpose === 'nakup' ? 0 : item.discount,
                                originalPrice: newPurpose === 'nakup' ? undefined : item.originalPrice
                              }, 'najem');
                            }}
                            className={`w-full p-2 border rounded text-sm font-medium ${item.purpose === 'nakup' ? 'bg-yellow-100 border-yellow-400' : 'bg-blue-50 border-blue-300'}`}
                          >
                            <option value="najem">🔄 NAJEM (menjava)</option>
                            <option value="nakup">💰 NAKUP (enkratno)</option>
                          </select>
                        )}

                        {/* NAJEM fields */}
                        {item.purpose !== 'nakup' && (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500">Količina</label>
                                <input type="number" min="1" value={item.quantity} onChange={(e) => updateOfferItem(item.id, { quantity: parseInt(e.target.value) || 1 }, 'najem')} className="w-full p-2 border rounded text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Cena/teden €</label>
                                <input type="number" step="0.01" min="0" value={item.pricePerUnit || ''} onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0, 'najem')} className="w-full p-2 border rounded text-sm" placeholder="0.00" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Popust %</label>
                                <input type="number" min="0" max="100" value={item.discount || ''} onChange={(e) => handleDiscountChange(item.id, parseInt(e.target.value) || 0, 'najem')} className="w-full p-2 border rounded text-sm" placeholder="0" />
                              </div>
                            </div>

                            {item.discount && item.discount > 0 && item.originalPrice && (
                              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                💰 Izhodiščna: {item.originalPrice.toFixed(2)} €/teden → <span className="font-bold">-{item.discount}%</span> = {item.pricePerUnit.toFixed(2)} €/teden
                              </div>
                            )}

                            <div>
                              <label className="block text-xs text-gray-500">Povračilo (izguba) €</label>
                              <input type="number" step="0.01" min="0" value={item.replacementCost || ''} onChange={(e) => updateOfferItem(item.id, { replacementCost: parseFloat(e.target.value) || 0 }, 'najem')} className="w-full p-2 border rounded text-sm" placeholder="0.00" />
                            </div>

                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={item.customized} onChange={(e) => updateOfferItem(item.id, { customized: e.target.checked }, 'najem')} />
                                Prilagojen
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={item.seasonal || false} onChange={(e) => handleSeasonalToggle(item.id, e.target.checked)} />
                                Sezonske menjave
                              </label>
                            </div>

                            {/* Seasonal section - DVE OBDOBJI */}
                            {item.seasonal && (
                              <div className="space-y-2">
                                {/* NORMALNO OBDOBJE */}
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
                                  <div className="text-sm text-blue-800 font-medium">☀️ OBDOBJE 1</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs text-blue-700 mb-1">Frekvenca menjave</label>
                                      <select
                                        value={item.normalFrequency || '4'}
                                        onChange={(e) => handleNormalFrequencyChange(item.id, e.target.value)}
                                        className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                                      >
                                        <option value="1">1 teden</option>
                                        <option value="2">2 tedna</option>
                                        <option value="4">4 tedne</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-blue-700 mb-1">Cena/teden €</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.normalPrice || ''}
                                        onChange={(e) => handleNormalPriceChange(item.id, parseFloat(e.target.value) || 0)}
                                        className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-blue-700 mb-1">Obdobje (od tedna → do tedna)</label>
                                    <div className="flex items-center gap-2">
                                      <select value={item.normalFromWeek || 13} onChange={(e) => updateOfferItem(item.id, { normalFromWeek: parseInt(e.target.value) }, 'najem')} className="flex-1 p-2 border border-blue-300 rounded text-sm bg-white">
                                        {WEEKS.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                                      </select>
                                      <span className="text-blue-500 font-bold">→</span>
                                      <select value={item.normalToWeek || 44} onChange={(e) => updateOfferItem(item.id, { normalToWeek: parseInt(e.target.value) }, 'najem')} className="flex-1 p-2 border border-blue-300 rounded text-sm bg-white">
                                        {WEEKS.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-blue-700 mb-1">Popust %</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={item.normalDiscount || ''}
                                      onChange={(e) => handleNormalDiscountChange(item.id, parseInt(e.target.value) || 0)}
                                      className="w-full p-2 border border-blue-300 rounded text-sm bg-white"
                                      placeholder="0"
                                    />
                                  </div>
                                  {item.normalDiscount && item.normalDiscount > 0 && item.normalOriginalPrice && (
                                    <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                      💰 Izhodiščna: {item.normalOriginalPrice.toFixed(2)} € → <span className="font-bold">-{item.normalDiscount}%</span> = {item.normalPrice?.toFixed(2)} €
                                    </div>
                                  )}
                                </div>

                                {/* SEZONSKO OBDOBJE */}
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 space-y-3">
                                  <div className="text-sm text-orange-800 font-medium">❄️ OBDOBJE 2</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs text-orange-700 mb-1">Frekvenca menjave</label>
                                      <select
                                        value={item.seasonalFrequency || '1'}
                                        onChange={(e) => handleSeasonalFrequencyChange(item.id, e.target.value)}
                                        className="w-full p-2 border border-orange-300 rounded text-sm bg-white"
                                      >
                                        <option value="1">1 teden</option>
                                        <option value="2">2 tedna</option>
                                        <option value="4">4 tedne</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-orange-700 mb-1">Cena/teden €</label>
                                      <input type="number" step="0.01" min="0" value={item.seasonalPrice || ''} onChange={(e) => handleSeasonalPriceChange(item.id, parseFloat(e.target.value) || 0)} className="w-full p-2 border border-orange-300 rounded text-sm bg-white" placeholder="0.00" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-orange-700 mb-1">Obdobje (od tedna → do tedna)</label>
                                    <div className="flex items-center gap-2">
                                      <select value={item.seasonalFromWeek || 45} onChange={(e) => updateOfferItem(item.id, { seasonalFromWeek: parseInt(e.target.value) }, 'najem')} className="flex-1 p-2 border border-orange-300 rounded text-sm bg-white">
                                        {WEEKS.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                                      </select>
                                      <span className="text-orange-500 font-bold">→</span>
                                      <select value={item.seasonalToWeek || 12} onChange={(e) => updateOfferItem(item.id, { seasonalToWeek: parseInt(e.target.value) }, 'najem')} className="flex-1 p-2 border border-orange-300 rounded text-sm bg-white">
                                        {WEEKS.map(w => (<option key={w.value} value={w.value}>{w.label}</option>))}
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-orange-700 mb-1">Popust %</label>
                                    <input type="number" min="0" max="100" value={item.seasonalDiscount || ''} onChange={(e) => handleSeasonalDiscountChange(item.id, parseInt(e.target.value) || 0)} className="w-full p-2 border border-orange-300 rounded text-sm bg-white" placeholder="0" />
                                  </div>
                                  {item.seasonalDiscount && item.seasonalDiscount > 0 && item.seasonalOriginalPrice && (
                                    <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                      💰 Izhodiščna: {item.seasonalOriginalPrice.toFixed(2)} € → <span className="font-bold">-{item.seasonalDiscount}%</span> = {item.seasonalPrice?.toFixed(2)} €
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* NAKUP fields - simplified */}
                        {item.purpose === 'nakup' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500">Količina</label>
                                <input type="number" min="1" value={item.quantity} onChange={(e) => updateOfferItem(item.id, { quantity: parseInt(e.target.value) || 1 }, 'najem')} className="w-full p-2 border rounded text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500">Cena/kos €</label>
                                <input type="number" step="0.01" min="0" value={item.pricePerUnit || ''} onChange={(e) => updateOfferItem(item.id, { pricePerUnit: parseFloat(e.target.value) || 0 }, 'najem')} className="w-full p-2 border rounded text-sm bg-yellow-50" />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={item.customized} onChange={(e) => updateOfferItem(item.id, { customized: e.target.checked }, 'najem')} />
                              Prilagojen
                            </label>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={() => addCustomOfferItem('najem')} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 flex items-center justify-center gap-2">
                    <Plus size={18} /> Dodaj artikel
                  </button>

                  {/* Summary - different layout for primerjava/dodatna */}
                  {(offerType === 'primerjava' || offerType === 'dodatna') ? (
                    <div className="space-y-2">
                      {/* NAJEM summary */}
                      {offerItemsNajem.filter(i => i.purpose !== 'nakup').length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-xs text-blue-600 font-medium mb-1">🔄 NAJEM</div>
                          <div className="flex justify-between text-sm">
                            <span>Artiklov za najem:</span>
                            <span className="font-bold">{offerItemsNajem.filter(i => i.purpose !== 'nakup').reduce((sum, i) => sum + i.quantity, 0)} KOS</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span>Frekvenca:</span>
                            <span className="font-bold">{offerFrequency} {offerFrequency === '1' ? 'TEDEN' : 'TEDNE'}</span>
                          </div>
                          <div className="flex justify-between text-base mt-2 pt-2 border-t border-blue-200">
                            <span>4-tedenski obračun:</span>
                            <span className="font-bold">
                              {(offerItemsNajem.filter(i => i.purpose !== 'nakup').reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0) * 4).toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      )}
                      {/* NAKUP summary */}
                      {offerItemsNajem.filter(i => i.purpose === 'nakup').length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <div className="text-xs text-yellow-700 font-medium mb-1">💰 NAKUP</div>
                          <div className="flex justify-between text-sm">
                            <span>Artiklov za nakup:</span>
                            <span className="font-bold">{offerItemsNajem.filter(i => i.purpose === 'nakup').reduce((sum, i) => sum + i.quantity, 0)} KOS</span>
                          </div>
                          <div className="flex justify-between text-base mt-2 pt-2 border-t border-yellow-300">
                            <span>Skupaj nakup:</span>
                            <span className="font-bold">
                              {(offerItemsNajem.filter(i => i.purpose === 'nakup').reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0)).toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Število artiklov:</span>
                        <span className="font-bold">{calculateOfferTotals('najem').totalItems} KOS</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Frekvenca:</span>
                        <span className="font-bold">{offerFrequency} {offerFrequency === '1' ? 'TEDEN' : 'TEDNE'}</span>
                      </div>
                      <div className="flex justify-between text-lg mt-2 pt-2 border-t border-blue-200">
                        <span>4-tedenski obračun:</span>
                        <span className="font-bold">{(calculateOfferTotals('najem') as any).fourWeekTotal?.toFixed(2)} €</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setOfferStep('type')} className="flex-1 py-2 border rounded">← Nazaj</button>
                    <button
                      onClick={() => setOfferStep('preview')}
                      disabled={offerItemsNajem.some(i => !i.code || i.pricePerUnit <= 0)}
                      className="flex-1 bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
                    >
                      Predogled →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Preview and send */}
              {offerStep === 'preview' && (
                <div className="space-y-4">
                  {/* HTML Preview */}
                  <div className="bg-white border rounded-lg p-4 max-h-[40vh] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
                  </div>

                  {/* Email info - copyable */}
                  <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                    {selectedCompany && selectedCompany.contacts.filter(c => c.email).length > 1 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-1 rounded">
                            <span className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">Za:</span>
                              <span>{getPrimaryContact(selectedCompany)?.email || 'Ni emaila'}</span>
                              <ChevronDown size={14} className="text-gray-400" />
                            </span>
                            <span className="text-xs text-blue-600">izberi & kopiraj</span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72">
                          {selectedCompany.contacts.filter(c => c.email).map(contact => (
                            <DropdownMenuItem
                              key={contact.id}
                              onClick={() => {
                                navigator.clipboard.writeText(contact.email || '');
                                toast({ description: `✅ Email kopiran: ${contact.email}` });
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Mail size={14} />
                              <span className="font-medium">{contact.first_name} {contact.last_name}</span>
                              <span className="text-gray-400 text-xs">{contact.email}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div
                        className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-1 rounded"
                        onClick={() => {
                          navigator.clipboard.writeText(getPrimaryContact(selectedCompany)?.email || '');
                          toast({ description: '✅ Email kopiran' });
                        }}
                      >
                        <span><span className="text-gray-500 text-sm">Za:</span> {getPrimaryContact(selectedCompany)?.email || 'Ni emaila'}</span>
                        <span className="text-xs text-blue-600">kopiraj</span>
                      </div>
                    )}
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-1 rounded text-sm"
                      onClick={() => {
                        const companyName = selectedCompany?.name || '';
                        let subject = 'Ponudba za predpražnike';
                        if (offerType === 'primerjava') {
                          subject = `Ponudba za nakup in najem predpražnikov - ${companyName}`;
                        } else if (offerType === 'dodatna') {
                          const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
                          const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
                          if (hasNajemItems && hasNakupItems) subject = `Ponudba za najem in nakup predpražnikov - ${companyName}`;
                          else if (hasNajemItems) subject = `Ponudba za najem predpražnikov - ${companyName}`;
                          else if (hasNakupItems) subject = `Ponudba za nakup predpražnikov - ${companyName}`;
                        } else if (offerType === 'nakup') {
                          subject = `Ponudba za nakup predpražnikov - ${companyName}`;
                        } else {
                          subject = `Ponudba za najem predpražnikov - ${companyName}`;
                        }
                        navigator.clipboard.writeText(subject);
                        toast({ description: '✅ Zadeva kopirana' });
                      }}
                    >
                      <span className="truncate"><span className="text-gray-500">Zadeva:</span> Ponudba za {(offerType === 'primerjava' || offerType === 'dodatna') ? 'nakup in najem' : offerType === 'nakup' ? 'nakup' : 'najem'}...</span>
                      <span className="text-xs text-blue-600 ml-2">kopiraj</span>
                    </div>
                  </div>

                  {/* Primary action: Copy HTML */}
                  <button
                    onClick={copyHTMLToClipboard}
                    className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <FileText size={20} />
                    Kopiraj vsebino
                  </button>

                  {/* Save offer button */}
                  <button
                    onClick={async () => {
                      const primaryContact = selectedCompany ? getPrimaryContact(selectedCompany) : null;
                      const email = primaryContact?.email || '';
                      const companyName = selectedCompany?.name || '';
                      let subject = 'Ponudba za predpražnike';
                      if (offerType === 'primerjava') {
                        subject = `Ponudba za nakup in najem predpražnikov - ${companyName}`;
                      } else if (offerType === 'dodatna') {
                        const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
                        const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
                        if (hasNajemItems && hasNakupItems) subject = `Ponudba za najem in nakup predpražnikov - ${companyName}`;
                        else if (hasNajemItems) subject = `Ponudba za najem predpražnikov - ${companyName}`;
                        else if (hasNakupItems) subject = `Ponudba za nakup predpražnikov - ${companyName}`;
                      } else if (offerType === 'nakup') {
                        subject = `Ponudba za nakup predpražnikov - ${companyName}`;
                      } else if (offerType === 'najem') {
                        subject = `Ponudba za najem predpražnikov - ${companyName}`;
                      }
                      const saved = await saveOfferToDatabase(subject, email);
                      if (saved) {
                        toast({ description: '✅ Ponudba shranjena' });
                      }
                    }}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Shrani ponudbo
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (hasNajem) setOfferStep('items-najem');
                        else if (hasNakup) setOfferStep('items-nakup');
                      }}
                      className="flex-1 py-2 border rounded text-sm"
                    >
                      ← Uredi
                    </button>
                    <button onClick={() => setShowOfferModal(false)} className="flex-1 py-2 border rounded text-sm">
                      Zapri
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Confirmation Dialog */}
      {showContractConfirm && selectedOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex justify-end p-2">
              <button onClick={() => setShowContractConfirm(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="px-6 pb-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generiranje pogodbe
              </h3>
              <p className="text-gray-600 mb-6">
                Ali želiš generirati pogodbo iz te ponudbe?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowContractConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ne
                </button>
                <button
                  onClick={() => {
                    setShowContractConfirm(false);
                    setShowContractModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Da, generiraj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {selectedOffer && selectedCompany && (
        <ContractModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          company={{
            id: selectedCompany.id,
            name: selectedCompany.name,
            tax_number: selectedCompany.tax_number,
            address_street: selectedCompany.address_street,
            address_postal: selectedCompany.address_postal,
            address_city: selectedCompany.address_city,
            delivery_address: (selectedCompany as any).delivery_address,
            delivery_postal: (selectedCompany as any).delivery_postal,
            delivery_city: (selectedCompany as any).delivery_city,
            billing_address: (selectedCompany as any).billing_address,
            billing_postal: (selectedCompany as any).billing_postal,
            billing_city: (selectedCompany as any).billing_city,
            working_hours: (selectedCompany as any).working_hours,
            delivery_instructions: (selectedCompany as any).delivery_instructions,
            customer_number: (selectedCompany as any).customer_number,
            contacts: selectedCompany.contacts.map(c => ({
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone: c.phone,
              role: c.role,
              is_billing_contact: (c as any).is_billing_contact,
              is_service_contact: (c as any).is_service_contact,
            })),
          }}
          offer={{
            id: selectedOffer.id,
            offer_type: selectedOffer.offer_type,
            frequency: selectedOffer.frequency,
            items: selectedOffer.items
              ?.filter((item: any) => item.price_rental !== null) // Only najem items for contract
              .map((item: any) => ({
                notes: item.notes,
                quantity: item.quantity,
                price_rental: item.price_rental,
                price_penalty: item.price_penalty,
                width_cm: item.width_cm,
                height_cm: item.height_cm,
                seasonal: item.seasonal,
                seasonalFromWeek: item.seasonal_from_week,
                seasonalToWeek: item.seasonal_to_week,
                normalFromWeek: item.normal_from_week,
                normalToWeek: item.normal_to_week,
                frequency: item.frequency,
                normalFrequency: item.normal_frequency,
                seasonalFrequency: item.seasonal_frequency,
                normalPrice: item.normal_price,
                seasonalPrice: item.seasonal_price,
              })) || [],
          }}
          onContractSaved={(contract) => {
            // Add the contract to saved contracts list
            setSavedContracts(prev => [...prev, contract]);
          }}
        />
      )}

      {/* Floating Action Button - Add Company */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-green-600 active:bg-green-700"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => navigate('/prodajalec')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Home size={22} />
            <span className="text-xs mt-1">Domov</span>
          </button>
          <button
            onClick={() => navigate('/prodajalec')}
            className="flex-1 py-3 flex flex-col items-center text-gray-600"
          >
            <Camera size={22} />
            <span className="text-xs mt-1">Skeniraj</span>
          </button>
          <button className="flex-1 py-3 flex flex-col items-center text-blue-600">
            <Users size={22} />
            <span className="text-xs mt-1">Stranke</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// EU VIES API za preverjanje DDV številk in pridobivanje podatkov o podjetjih
// Brezplačen API brez potrebe po avtentikaciji

import { supabase } from '@/integrations/supabase/client';

// Interface for internal company with contacts
export interface InternalCompanyData {
  id: string;
  name: string;
  display_name?: string;
  tax_number?: string;
  address_street?: string;
  address_city?: string;
  address_postal?: string;
  parent_company_id?: string;
  parent_company?: {
    id: string;
    name: string;
    display_name?: string;
    tax_number?: string;
  };
  contacts: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    is_decision_maker?: boolean;
  }>;
}

// Interface for slovenian_companies register lookup
export interface RegisterCompanyData {
  id: number;
  tax_number: string;
  registration_number: string;
  name: string;
  address_street: string;
  address_postal: string;
  address_city: string;
  activity_code: string;
  is_vat_payer: boolean;
  legal_form: string;
}

export interface LookupResult {
  source: 'internal' | 'external' | 'register';
  internalCompany?: InternalCompanyData;
  externalData?: CompanyData;
  registerCompany?: RegisterCompanyData;
}

/**
 * Najprej preveri interno bazo, nato zunanji API
 * @param taxNumber - Davčna številka (8 števk)
 * @returns Podatki iz interne baze ali zunanjega API-ja
 */
export async function lookupCompanyInternalFirst(taxNumber: string): Promise<LookupResult | null> {
  const cleanTaxNumber = taxNumber.replace(/^SI/i, '').replace(/\s/g, '');

  if (!/^\d{8}$/.test(cleanTaxNumber)) {
    return null;
  }

  try {
    // 1. Najprej preveri interno bazo
    const { data: internalCompany, error } = await supabase
      .schema('mat_tracker')
      .from('companies')
      .select(`
        id,
        name,
        display_name,
        tax_number,
        address_street,
        address_city,
        address_postal,
        parent_company_id,
        parent_company:companies!parent_company_id (
          id,
          name,
          display_name,
          tax_number
        ),
        contacts (
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          is_decision_maker
        )
      `)
      .eq('tax_number', cleanTaxNumber)
      .maybeSingle();

    if (!error && internalCompany) {
      // Podjetje že obstaja v interni bazi
      return {
        source: 'internal',
        internalCompany: internalCompany as InternalCompanyData,
      };
    }

    // 2. Preveri lokalni register slovenian_companies (278k zapisov, sveži podatki)
    const registerResult = await lookupCompanyInRegister(cleanTaxNumber);
    if (registerResult) {
      return {
        source: 'register',
        registerCompany: registerResult,
      };
    }

    // 3. Če ni v registru, preveri zunanji VIES API
    const externalData = await lookupCompanyByTaxNumber(cleanTaxNumber);
    if (externalData) {
      return {
        source: 'external',
        externalData,
      };
    }

    return null;
  } catch {
    // Fallback to external API if internal lookup fails
    const externalData = await lookupCompanyByTaxNumber(cleanTaxNumber);
    if (externalData) {
      return {
        source: 'external',
        externalData,
      };
    }
    return null;
  }
}

/**
 * Poišče podjetje v lokalnem registru slovenian_companies (278k zapisov)
 * @param taxNumber - Davčna številka (8 števk, brez SI predpone)
 */
export async function lookupCompanyInRegister(taxNumber: string): Promise<RegisterCompanyData | null> {
  try {
    const { data, error } = await supabase
      .schema('mat_tracker')
      .from('slovenian_companies')
      .select('id, tax_number, registration_number, name, address_street, address_postal, address_city, activity_code, is_vat_payer, legal_form')
      .eq('tax_number', taxNumber)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as RegisterCompanyData;
  } catch {
    return null;
  }
}

export interface VIESResponse {
  isValid: boolean;
  requestDate: string;
  userError: string;
  name: string;
  address: string;
  vatNumber: string;
}

export interface CompanyData {
  name: string;
  address: string;
  street?: string;
  city?: string;
  postalCode?: string;
  isValid: boolean;
}

/**
 * Preveri davčno številko preko EU VIES API in vrne podatke o podjetju
 * @param taxNumber - Davčna številka (8 števk, brez SI predpone)
 * @returns Podatki o podjetju ali null če ni najdeno
 */
export async function lookupCompanyByTaxNumber(taxNumber: string): Promise<CompanyData | null> {
  // Odstrani morebitno SI predpono in presledke
  const cleanTaxNumber = taxNumber.replace(/^SI/i, '').replace(/\s/g, '');

  // Preveri, da je 8 števk
  if (!/^\d{8}$/.test(cleanTaxNumber)) {
    return null;
  }

  try {
    // Uporabi lokalni nginx proxy za dostop do EU VIES API (izogni se CORS)
    const response = await fetch(`/api/vies/ms/SI/vat/${cleanTaxNumber}`);

    if (!response.ok) {
      // VIES API error - handled by returning null
      return null;
    }

    const data: VIESResponse = await response.json();

    if (!data.isValid || data.userError !== 'VALID') {
      return {
        name: '',
        address: '',
        isValid: false,
      };
    }

    // Parsiraj naslov - tipično v formatu "ULICA ŠTEVILKA, KRAJ, POŠTA MESTO"
    const addressParts = parseAddress(data.address);

    return {
      name: data.name || '',
      address: data.address || '',
      street: addressParts.street,
      city: addressParts.city,
      postalCode: addressParts.postalCode,
      isValid: true,
    };
  } catch (error) {
    // API error - handled by returning null
    return null;
  }
}

/**
 * Parsiraj naslov iz VIES formata
 * Tipični format: "DUNAJSKA CESTA 050, LJUBLJANA, 1000 LJUBLJANA"
 */
function parseAddress(address: string): { street?: string; city?: string; postalCode?: string } {
  if (!address) return {};

  const parts = address.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    // Format: "ULICA, KRAJ, POŠTA MESTO"
    const street = parts[0];
    const lastPart = parts[parts.length - 1];

    // Izvleči poštno številko (4 števke) iz zadnjega dela
    const postalMatch = lastPart.match(/^(\d{4})\s+(.+)$/);

    if (postalMatch) {
      return {
        street,
        postalCode: postalMatch[1],
        city: postalMatch[2],
      };
    }

    return { street, city: lastPart };
  } else if (parts.length === 2) {
    const street = parts[0];
    const lastPart = parts[1];
    const postalMatch = lastPart.match(/^(\d{4})\s+(.+)$/);

    if (postalMatch) {
      return {
        street,
        postalCode: postalMatch[1],
        city: postalMatch[2],
      };
    }

    return { street, city: lastPart };
  }

  return { street: address };
}

/**
 * Poišče podjetja v registru po imenu (fuzzy search)
 * @param companyName - Ime podjetja (ali del imena)
 * @param limit - Max število rezultatov
 */
export async function searchCompaniesByName(companyName: string, limit = 10): Promise<RegisterCompanyData[]> {
  if (!companyName || companyName.trim().length < 2) return [];

  try {
    // First check internal companies
    const { data: internalResults } = await supabase
      .schema('mat_tracker')
      .from('companies')
      .select('id, name, display_name, tax_number, address_street, address_city, address_postal')
      .ilike('name', `%${companyName.trim()}%`)
      .limit(3);

    // Then search register with fuzzy function
    const { data: registerResults, error } = await supabase
      .schema('mat_tracker')
      .rpc('search_companies_fuzzy', {
        p_name: companyName.trim(),
        p_city: null,
        p_limit: limit,
      });

    if (error) {
      console.error('Fuzzy search error:', error);
      return [];
    }

    return (registerResults || []) as RegisterCompanyData[];
  } catch {
    return [];
  }
}

/**
 * Preveri, ali je davčna številka v pravilnem formatu
 */
export function isValidTaxNumberFormat(taxNumber: string): boolean {
  const clean = taxNumber.replace(/^SI/i, '').replace(/\s/g, '');
  return /^\d{8}$/.test(clean);
}

/**
 * Poišče odpiralni čas podjetja iz OpenStreetMap (brezplačno)
 * Uporablja Overpass API za iskanje po imenu v Sloveniji
 * @param companyName - Ime podjetja ali lokacije
 * @param city - Opcijsko mesto za bolj natančno iskanje
 * @returns Odpiralni čas v formatu "Po-Pe 07:00-17:00" ali null
 */
export async function lookupOpeningHours(companyName: string, city?: string): Promise<string | null> {
  if (!companyName || companyName.trim().length < 3) return null;

  try {
    // Očisti ime - odstrani d.o.o., s.p. itd. za boljše iskanje
    const cleanName = companyName
      .replace(/\s*(d\.?o\.?o\.?|s\.?p\.?|d\.?d\.?|d\.?n\.?o\.?)\s*/gi, '')
      .replace(/,\s*$/, '')
      .trim();

    if (cleanName.length < 3) return null;

    // Overpass query: poišči objekte z imenom in opening_hours v Sloveniji
    const areaFilter = city
      ? `area["name"="${city}"]["admin_level"~"[6-8]"]->.city;`
      : `area["ISO3166-1"="SI"]->.city;`;

    const query = `[out:json][timeout:8];${areaFilter}(node["name"~"${cleanName}","i"]["opening_hours"](area.city);way["name"~"${cleanName}","i"]["opening_hours"](area.city););out body 1;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.elements && data.elements.length > 0) {
      const hours = data.elements[0].tags?.opening_hours;
      if (hours) {
        // Pretvori OSM format v berljiv format
        return formatOpeningHours(hours);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Pretvori OSM opening_hours format v berljiv slovenski format
 * "Mo-Fr 07:00-19:00; Sa 07:00-15:00" → "Pon-Pet 07:00-19:00, Sob 07:00-15:00"
 */
function formatOpeningHours(osmHours: string): string {
  return osmHours
    .replace(/Mo/g, 'Pon')
    .replace(/Tu/g, 'Tor')
    .replace(/We/g, 'Sre')
    .replace(/Th/g, 'Čet')
    .replace(/Fr/g, 'Pet')
    .replace(/Sa/g, 'Sob')
    .replace(/Su/g, 'Ned')
    .replace(/PH/g, 'Prazniki')
    .replace(/; /g, ', ')
    .replace(/;/g, ', ');
}

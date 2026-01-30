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

export interface LookupResult {
  source: 'internal' | 'external';
  internalCompany?: InternalCompanyData;
  externalData?: CompanyData;
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

    // 2. Če ni v bazi, preveri zunanji API
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
 * Preveri, ali je davčna številka v pravilnem formatu
 */
export function isValidTaxNumberFormat(taxNumber: string): boolean {
  const clean = taxNumber.replace(/^SI/i, '').replace(/\s/g, '');
  return /^\d{8}$/.test(clean);
}

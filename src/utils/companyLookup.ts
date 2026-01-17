// EU VIES API za preverjanje DDV številk in pridobivanje podatkov o podjetjih
// Brezplačen API brez potrebe po avtentikaciji

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
      console.error('VIES API error:', response.status);
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
    console.error('Error fetching company data:', error);
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

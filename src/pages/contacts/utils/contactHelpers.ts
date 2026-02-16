/**
 * @file contactHelpers.ts
 * @description Pomožne funkcije za Contacts modul
 */

import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

/**
 * Vrne primarni kontakt podjetja (ali prvega če ni označenega)
 */
export function getPrimaryContact(company: CompanyWithContacts) {
  return company.contacts.find(c => c.is_primary) || company.contacts[0];
}

/**
 * Formatira naslov podjetja za prikaz
 */
export function formatAddress(company: CompanyWithContacts): string | null {
  const parts = [company.address_city, company.address_postal].filter(Boolean);
  return parts.join(', ') || null;
}

/**
 * Vrne URL za Google Maps iskanje naslova
 */
export function getGoogleMapsUrl(company: CompanyWithContacts): string | null {
  const c = company as any;
  const hasDeliveryAddress = c.delivery_address || c.delivery_postal || c.delivery_city;

  const parts = hasDeliveryAddress
    ? [c.delivery_address, c.delivery_postal, c.delivery_city].filter(Boolean)
    : [company.address_street, company.address_postal, company.address_city].filter(Boolean);

  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}

/**
 * Vrne naslov podjetja za načrtovanje poti
 */
export function getCompanyAddress(company: CompanyWithContacts): string | null {
  const c = company as any;
  const hasDeliveryAddress = c.delivery_address || c.delivery_postal || c.delivery_city;

  const parts = hasDeliveryAddress
    ? [c.delivery_address, c.delivery_postal, c.delivery_city].filter(Boolean)
    : [company.address_street, company.address_postal, company.address_city].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Generira .ics datoteko za Outlook/Calendar - Outlook kompatibilno
 * @param company - Podjetje za katerega ustvarjamo dogodek
 * @param date - Datum sestanka/roka (YYYY-MM-DD)
 * @param time - Čas sestanka (HH:MM)
 * @param type - Tip dogodka ('sestanek' ali 'ponudba')
 */
export function generateICSFile(
  company: CompanyWithContacts,
  date: string,
  time: string,
  type: 'sestanek' | 'ponudba'
): void {
  const startDate = new Date(`${date}T${time}:00`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour

  const formatICSDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const primaryContact = getPrimaryContact(company);
  const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : '';
  const contactPhone = primaryContact?.phone || (primaryContact as any)?.work_phone || '';
  const contactEmail = primaryContact?.email || '';
  const companyName = company.display_name || company.name;
  const fullCompanyName = company.name;
  const taxNumber = company.tax_number || '';

  // Get address for location
  const c = company as any;
  const hasDeliveryAddress = c.delivery_address || c.delivery_postal || c.delivery_city;
  const location = hasDeliveryAddress
    ? [c.delivery_address, c.delivery_postal, c.delivery_city].filter(Boolean).join(', ')
    : [company.address_street, company.address_postal, company.address_city].filter(Boolean).join(', ');

  const title = type === 'sestanek'
    ? `Sestanek - ${companyName}`
    : `Poslati ponudbo - ${companyName}`;

  // Build detailed description for Outlook
  const descParts: string[] = [];
  if (type === 'sestanek') {
    descParts.push(`PODJETJE: ${fullCompanyName}`);
    if (taxNumber) descParts.push(`Davčna: ${taxNumber}`);
    if (contactName.trim()) descParts.push(`Kontakt: ${contactName}`);
    if (contactPhone) descParts.push(`Tel: ${contactPhone}`);
    if (contactEmail) descParts.push(`Email: ${contactEmail}`);
    if (location) descParts.push(`Naslov: ${location}`);
  } else {
    descParts.push(`Rok za pošiljanje ponudbe stranki ${companyName}`);
    if (contactEmail) descParts.push(`Email: ${contactEmail}`);
  }
  const description = descParts.join('\\n').replace(/,/g, '\\,');

  const uid = `${type}-${Date.now()}@matpro.ristov.xyz`;

  // Build ICS with CRLF line endings for Outlook compatibility
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mat Tracker Pro//SL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-MS-OLK-FORCEINSPECTOROPEN:TRUE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${title.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location.replace(/,/g, '\\,')}` : '',
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:BUSY',
    'X-MICROSOFT-CDO-IMPORTANCE:1',
    'X-MS-OLK-AUTOFILLLOCATION:FALSE',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const icsContent = lines.join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

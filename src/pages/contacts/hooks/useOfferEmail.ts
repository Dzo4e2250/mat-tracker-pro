/**
 * @file useOfferEmail.ts
 * @description Hook za generiranje emailov in tabel za ponudbe
 */

import { useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getPurchasePrice, calculateCustomPurchasePrice, recalculateItemsForFrequency, type FrequencyKey } from '@/utils/priceList';
import { OfferItem } from '../types';
import { getPrimaryContact } from '../utils/contactHelpers';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import type { UserEmailTemplate, UserEmailSignature } from '@/integrations/supabase/types';

// Table styles - default color and builder
export const DEFAULT_TABLE_COLOR = '#1e3a5f';
export const tableStyles = { headerBg: DEFAULT_TABLE_COLOR, headerText: '#ffffff', border: DEFAULT_TABLE_COLOR };

export function buildTableStyles(color?: string) {
  const c = color || DEFAULT_TABLE_COLOR;
  return { headerBg: c, headerText: '#ffffff', border: c };
}

// HTML escape utility to prevent XSS in email HTML generation
const escapeHtml = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Slovenian declension for "teden" (week)
export function formatWeeks(n: string | number): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num) || num === 1) return '1 teden';
  if (num === 2) return '2 tedna';
  if (num === 3 || num === 4) return `${num} tedne`;
  return `${num} tednov`;
}

// Period text helpers
const getNormalPeriodText = (seasonalFromWeek: number, seasonalToWeek: number): string => {
  const normalStart = seasonalToWeek >= 52 ? 1 : seasonalToWeek + 1;
  const normalEnd = seasonalFromWeek <= 1 ? 52 : seasonalFromWeek - 1;
  return `teden ${normalStart}-${normalEnd}`;
};

const getSeasonalPeriodText = (seasonalFromWeek: number, seasonalToWeek: number): string =>
  `teden ${seasonalFromWeek}-${seasonalToWeek}`;

// Generate signature HTML block
function generateSignatureHTML(sig: UserEmailSignature): string {
  const parts: string[] = [];
  parts.push('<div style="border-top: 2px solid #1e3a5f; padding-top: 10px; margin-top: 10px; font-family: Arial, sans-serif; font-size: 13px;">');
  if (sig.full_name) parts.push(`<p style="margin: 0; font-weight: bold; color: #1e3a5f;">${escapeHtml(sig.full_name)}</p>`);
  if (sig.title) parts.push(`<p style="margin: 2px 0; color: #666;">${escapeHtml(sig.title)}</p>`);
  if (sig.phone) parts.push(`<p style="margin: 2px 0;">Tel: ${escapeHtml(sig.phone)}</p>`);
  if (sig.company_name) parts.push(`<p style="margin: 8px 0 2px; font-weight: bold;">${escapeHtml(sig.company_name)}</p>`);
  if (sig.company_address) parts.push(`<p style="margin: 2px 0; color: #666;">${escapeHtml(sig.company_address)}</p>`);
  if (sig.website) parts.push(`<p style="margin: 2px 0;"><a href="${escapeHtml(sig.website)}" style="color: #0066cc;">${escapeHtml(sig.website)}</a></p>`);
  if (sig.logo_url) parts.push(`<img src="${escapeHtml(sig.logo_url)}" alt="Logo" style="max-height: 40px; margin-top: 8px;" />`);
  parts.push('</div>');
  return parts.join('');
}

// Generate signature plain text
function generateSignatureText(sig: UserEmailSignature): string {
  const lines: string[] = ['---'];
  if (sig.full_name) lines.push(sig.full_name);
  if (sig.title) lines.push(sig.title);
  if (sig.phone) lines.push(`Tel: ${sig.phone}`);
  if (sig.company_name) lines.push(sig.company_name);
  if (sig.company_address) lines.push(sig.company_address);
  if (sig.website) lines.push(sig.website);
  return lines.join('\n');
}

export interface TableSection {
  id: string;
  label: string;
  frequency: FrequencyKey;
}

export interface TextOverrides {
  introText?: string;
  serviceText?: string;
  closingText?: string;
  seasonalText?: string;
  frequencyLabel?: string;
  blockOrder?: string[];
  tableSections?: TableSection[];
}

export const DEFAULT_BLOCK_ORDER = ['intro', 'seasonal', 'tables', 'service', 'closing'];

interface UseOfferEmailProps {
  offerType: 'najem' | 'nakup' | 'primerjava' | 'dodatna';
  offerFrequency: string;
  offerItemsNakup: OfferItem[];
  offerItemsNajem: OfferItem[];
  calculateOfferTotals: (type: 'nakup' | 'najem') => {
    totalItems: number;
    totalPrice?: number;
    weeklyTotal?: number;
    fourWeekTotal?: number;
    frequency?: string;
  };
  selectedCompany: CompanyWithContacts | null;
  saveOfferToDatabase: (subject: string, email: string) => Promise<void>;
  template?: UserEmailTemplate | null;
  signature?: UserEmailSignature | null;
  tableColor?: string;
}

export function useOfferEmail({
  offerType,
  offerFrequency,
  offerItemsNakup,
  offerItemsNajem,
  calculateOfferTotals,
  selectedCompany,
  saveOfferToDatabase,
  template,
  signature,
  tableColor,
}: UseOfferEmailProps) {
  const { toast } = useToast();

  // Dynamic table styles based on tableColor prop
  const ts = useMemo(() => buildTableStyles(tableColor), [tableColor]);

  // Generate NAKUP text table
  const generateNakupTable = useCallback(() => {
    const totalsNakup = calculateOfferTotals('nakup');
    return `┌─────────────────────────────────────────────────────────────────────────────┐
│ Koda         │ Naziv      │ Velikost │ Prilagojen │ Količina │ Cena/kos    │
├─────────────────────────────────────────────────────────────────────────────┤
${offerItemsNakup.map(item => `│ ${(item.code || '').padEnd(12)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${item.pricePerUnit.toFixed(2).padStart(8)} € │`).join('\n')}
└─────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

Število predpražnikov: ${totalsNakup.totalItems} KOS
Skupna cena: ${(totalsNakup as any).totalPrice?.toFixed(2)} €`;
  }, [offerItemsNakup, calculateOfferTotals]);

  // Generate NAJEM text table
  const generateNajemTable = useCallback(() => {
    const itemsToUse = (offerType === 'primerjava' || offerType === 'dodatna')
      ? offerItemsNajem.filter(i => i.purpose !== 'nakup')
      : offerItemsNajem;
    const totalsNajem = {
      totalItems: itemsToUse.reduce((sum, i) => sum + i.quantity, 0),
      fourWeekTotal: itemsToUse.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity * 4), 0)
    };
    const frequencyText = formatWeeks(offerFrequency);
    const tableRows: string[] = [];

    itemsToUse.forEach(item => {
      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        const normalPeriod = getNormalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
        tableRows.push(`│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${frequencyText.padEnd(9)} │ ${normalPeriod.padEnd(9)} │ ${item.pricePerUnit.toFixed(2).padStart(7)} € │ ${(item.replacementCost || 0).toFixed(2).padStart(8)} € │`);
        const seasonalPeriod = getSeasonalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
        tableRows.push(`│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${formatWeeks(item.seasonalFrequency || '1').padEnd(9)} │ ${seasonalPeriod.padEnd(9)} │ ${item.seasonalPrice.toFixed(2).padStart(7)} € │ ${(item.replacementCost || 0).toFixed(2).padStart(8)} € │`);
      } else {
        const itemFreq = item.frequencyOverride || offerFrequency;
        const itemFreqText = formatWeeks(itemFreq);
        tableRows.push(`│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10)} │ ${(item.size || '').padEnd(8)} │ ${(item.customized ? 'da' : 'ne').padEnd(10)} │ ${item.quantity.toString().padEnd(8)} │ ${itemFreqText.padEnd(9)} │ ${'-'.padEnd(9)} │ ${item.pricePerUnit.toFixed(2).padStart(7)} € │ ${(item.replacementCost || 0).toFixed(2).padStart(8)} € │`);
      }
    });

    const hasSeasonalItems = itemsToUse.some(item => item.seasonal);
    let summaryText = '';

    if (hasSeasonalItems) {
      let normalTotal = 0, seasonalTotal = 0, seasonalPeriodInfo = '', normalPeriodInfo = '', seasonalFreqInfo = '';
      itemsToUse.forEach(item => {
        if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
          normalTotal += item.pricePerUnit * item.quantity * 4;
          seasonalTotal += item.seasonalPrice * item.quantity * 4;
          normalPeriodInfo = getNormalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
          seasonalPeriodInfo = getSeasonalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
          seasonalFreqInfo = formatWeeks(item.seasonalFrequency || '1');
        } else {
          normalTotal += item.pricePerUnit * item.quantity * 4;
        }
      });
      summaryText = `Število predpražnikov: ${totalsNajem.totalItems} KOS\n\n4-tedenski obračun:\n  Obdobje 1 (${normalPeriodInfo}, menjava na ${frequencyText}): ${normalTotal.toFixed(2)} €\n  Obdobje 2 (${seasonalPeriodInfo}, menjava na ${seasonalFreqInfo}): ${seasonalTotal.toFixed(2)} €`;
    } else {
      const hasMixedFrequencies = itemsToUse.some(item => item.frequencyOverride && item.frequencyOverride !== offerFrequency);
      const frequencySummary = hasMixedFrequencies ? 'MEŠANA (glej tabelo)' : frequencyText.toUpperCase();
      summaryText = `Število predpražnikov: ${totalsNajem.totalItems} KOS\nFrekvenca menjave: ${frequencySummary}\n4-tedenski obračun: ${(totalsNajem as any).fourWeekTotal?.toFixed(2)} €`;
    }

    return `┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Koda   │ Naziv      │ Velikost │ Prilagojen │ Količina │ Frekvenca │ Obdobje   │ Cena/teden │ Povračilo │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
${tableRows.join('\n')}
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

${summaryText}`;
  }, [offerType, offerFrequency, offerItemsNajem]);

  // Generate nakup table from najem items (for primerjava)
  const generateNakupTableFromNajem = useCallback(() => {
    const items = offerItemsNajem.map(item => {
      const purchasePrice = item.itemType === 'custom' && item.m2
        ? calculateCustomPurchasePrice(item.m2)
        : getPurchasePrice(item.code);
      return { ...item, pricePerUnit: purchasePrice };
    });
    const totals = {
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: items.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0)
    };
    const tableRows = items.map(item =>
      `│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10).slice(0, 10)} │ ${(item.size || '').padEnd(8).slice(0, 8)} │ ${item.customized ? 'da' : 'ne'.padEnd(10)} │ ${String(item.quantity).padStart(8)} │ ${item.pricePerUnit.toFixed(2).padStart(13)} € │`
    );
    return `┌───────────────────────────────────────────────────────────────────────────────────┐
│ Koda   │ Naziv      │ Velikost │ Prilagojen │ Količina │ Cena/kos (NAKUP) │
├───────────────────────────────────────────────────────────────────────────────────┤
${tableRows.join('\n')}
└───────────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

Število predpražnikov: ${totals.totalItems} KOS
Cena: ${totals.totalPrice.toFixed(2)} €`;
  }, [offerItemsNajem]);

  // Generate nakup table filtered by purpose (for dodatna)
  const generateNakupTableFiltered = useCallback(() => {
    const nakupItems = offerItemsNajem.filter(i => i.purpose === 'nakup');
    const totals = {
      totalItems: nakupItems.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: nakupItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0)
    };
    const tableRows = nakupItems.map(item =>
      `│ ${(item.code || '').padEnd(6)} │ ${item.name.padEnd(10).slice(0, 10)} │ ${(item.size || '').padEnd(8).slice(0, 8)} │ ${item.customized ? 'da' : 'ne'.padEnd(10)} │ ${String(item.quantity).padStart(8)} │ ${item.pricePerUnit.toFixed(2).padStart(13)} € │`
    );
    return `┌───────────────────────────────────────────────────────────────────────────────────┐
│ Koda   │ Naziv      │ Velikost │ Prilagojen │ Količina │ Cena/kos (NAKUP) │
├───────────────────────────────────────────────────────────────────────────────────┤
${tableRows.join('\n')}
└───────────────────────────────────────────────────────────────────────────────────┘
Cene ne vključujejo DDV

Število predpražnikov: ${totals.totalItems} KOS
Cena: ${totals.totalPrice.toFixed(2)} €`;
  }, [offerItemsNajem]);

  // Generate email content (plain text)
  const generateEmailContent = useCallback(() => {
    const sigText = `Lep pozdrav,`;
    const sigBlock = signature?.is_active ? `${sigText}\n${generateSignatureText(signature)}` : sigText;
    const hasSeasonalItems = offerItemsNajem.some(item => item.seasonal);

    // Use template text if available, otherwise use hardcoded defaults
    const tpl = template;
    const introTextNajem = tpl?.intro_text || 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. V spodnji tabeli so navedene dimenzije, cene in pogostost menjave.';
    const introTextNakup = tpl?.intro_text || 'kot dogovorjeno pošiljam ponudbo za nakup profesionalnih predpražnikov. Podrobnosti o dimenzijah in cenah se nahajajo v spodnji tabeli.';
    const introTextPrimerjava = tpl?.intro_text || 'kot dogovorjeno pošiljam ponudbo za najem, prav tako pa spodaj prilagam tudi ponudbo za nakup predpražnikov, da lahko primerjate obe možnosti.';

    const defaultSeasonalText = 'Kot dogovorjeno, ponudba vključuje tudi sezonsko prilagoditev s pogostejšo menjavo v obdobju povečanega obiska.';
    const seasonalTextContent = tpl?.seasonal_text || defaultSeasonalText;
    const seasonalText = hasSeasonalItems ? `\n${seasonalTextContent}\n` : '';

    const defaultServiceTextSeasonal = 'Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih (z upoštevanjem sezonske prilagoditve) ter strošek pranja in dostave.';
    const defaultServiceText = 'Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih ter strošek pranja in dostave.';
    const serviceTextNajem = tpl?.service_text || (hasSeasonalItems ? defaultServiceTextSeasonal : defaultServiceText);
    const serviceTextNakup = tpl?.service_text || 'Predpražniki so visoke kakovosti in primerni za dolgotrajno uporabo.';

    const closingTextNajem = tpl?.closing_text || 'Za vsa dodatna vprašanja ali morebitne prilagoditve ponudbe sem vam z veseljem na voljo.';
    const closingTextNakup = tpl?.closing_text || 'Za vsa dodatna vprašanja glede materialov ali dobavnih rokov sem vam na voljo.';
    const closingTextPrimerjava = tpl?.closing_text || 'Za vsa dodatna vprašanja ali pomoč pri izbiri optimalne rešitve sem vam z veseljem na voljo.';
    const closingTextDodatna = tpl?.closing_text || 'Za vsa dodatna vprašanja sem vam na voljo.';

    if (offerType === 'najem') return `Pozdravljeni,\n\n${introTextNajem}${seasonalText}\n${generateNajemTable()}\n\n${serviceTextNajem}\n\n${closingTextNajem}\n\n${sigBlock}`;
    if (offerType === 'nakup') return `Pozdravljeni,\n\n${introTextNakup}\n\n${generateNakupTable()}\n\n${serviceTextNakup}\n\n${closingTextNakup}\n\n${sigBlock}`;
    if (offerType === 'primerjava') return `Pozdravljeni,\n\n${introTextPrimerjava}${seasonalText}\n1. Opcija: Najem in vzdrževanje\nVključuje redno menjavo in čiščenje${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.\n\n${generateNajemTable()}\n\n2. Opcija: Nakup predpražnikov\nEnkraten strošek nakupa predpražnikov v trajno last.\n\n${generateNakupTableFromNajem()}\n\n${closingTextPrimerjava}\n\n${sigBlock}`;

    if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');

      let introContent = '';
      if (tpl?.intro_text) {
        introContent = tpl.intro_text;
      } else if (hasNajemItems && hasNakupItems) {
        introContent = 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.';
      } else if (hasNajemItems) {
        introContent = 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov.';
      } else if (hasNakupItems) {
        introContent = 'kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.';
      }

      let najemSection = '';
      if (hasNajemItems) {
        const sectionTitle = hasNakupItems ? '\n\n1. Najem predpražnikov\n' : '\n';
        najemSection = `${seasonalText}${sectionTitle}Vključuje servis in menjavo po dogovoru${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.\n\n${generateNajemTable()}`;
      }

      let nakupSection = '';
      if (hasNakupItems) {
        const sectionTitle = hasNajemItems ? '\n\n2. Nakup predpražnikov\n' : '\n';
        nakupSection = `${sectionTitle}Predpražniki za nakup v trajno last (brez menjave).\n\n${generateNakupTableFiltered()}`;
      }

      return `Pozdravljeni,\n\n${introContent}${najemSection}${nakupSection}\n\n${closingTextDodatna}\n\n${sigBlock}`;
    }
    return '';
  }, [offerType, offerItemsNajem, generateNajemTable, generateNakupTable, generateNakupTableFromNajem, generateNakupTableFiltered, template, signature]);

  // Generate HTML table for NAKUP
  const generateNakupTableHTML = useCallback(() => {
    const totalsNakup = calculateOfferTotals('nakup');
    const rows = offerItemsNakup.map(item =>
      `<tr><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml(item.pricePerUnit.toFixed(2))} €</td></tr>`
    ).join('');
    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th colspan="2" style="border: 1px solid ${ts.border}; padding: 8px; text-align: left;">Artikel</th><th colspan="4" style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th style="border: 1px solid ${ts.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Cena/kos<br/><em>NAKUP</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalsNakup.totalItems} KOS</p><p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> ${(totalsNakup as any).totalPrice?.toFixed(2)} €</p>`;
  }, [offerItemsNakup, calculateOfferTotals, ts]);

  // Generate HTML table for NAJEM - accepts optional frequencyLabel and items overrides
  const generateNajemTableHTML = useCallback((frequencyLabel?: string, itemsOverride?: OfferItem[]) => {
    const baseItems = itemsOverride || ((offerType === 'primerjava' || offerType === 'dodatna')
      ? offerItemsNajem.filter(i => i.purpose !== 'nakup')
      : offerItemsNajem);
    const itemsToUse = baseItems;

    const hasSeasonalItems = itemsToUse.some(item => item.seasonal);
    const frequencyText = frequencyLabel || formatWeeks(offerFrequency);

    let normalTotal = 0;
    let seasonalTotal = 0;
    let normalPeriodInfo = '';
    let seasonalPeriodInfo = '';
    let normalFreqInfo = '';
    let seasonalFreqInfo = '';

    itemsToUse.forEach(item => {
      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        const normalPrice = item.normalPrice || item.pricePerUnit;
        normalTotal += normalPrice * item.quantity * 4;
        seasonalTotal += item.seasonalPrice * item.quantity * 4;
        normalPeriodInfo = `teden ${item.normalFromWeek || 13}-${item.normalToWeek || 44}`;
        seasonalPeriodInfo = `teden ${item.seasonalFromWeek}-${item.seasonalToWeek}`;
        normalFreqInfo = formatWeeks(item.normalFrequency || '4');
        seasonalFreqInfo = formatWeeks(item.seasonalFrequency || '1');
      } else {
        normalTotal += item.pricePerUnit * item.quantity * 4;
      }
    });

    const totalItems = itemsToUse.reduce((sum, i) => sum + i.quantity, 0);

    const rows = itemsToUse.map(item => {
      if (item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice) {
        const normalPeriod = `teden ${item.normalFromWeek || 13}-${item.normalToWeek || 44}`;
        const seasonalPeriod = `teden ${item.seasonalFromWeek}-${item.seasonalToWeek}`;
        const normalFreqText = formatWeeks(item.normalFrequency || '4');
        const normalPrice = item.normalPrice || item.pricePerUnit;
        const seasonalFreqText = formatWeeks(item.seasonalFrequency || '1');
        return `<tr><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(normalFreqText)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${normalPeriod}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml(normalPrice.toFixed(2))} €</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml((item.replacementCost || 0).toFixed(2))} €</td></tr><tr style="background-color: #fff8e6;"><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;"><strong>${escapeHtml(seasonalFreqText)}</strong></td><td style="border: 1px solid ${ts.border}; padding: 8px;"><strong>${seasonalPeriod}</strong></td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;"><strong>${escapeHtml(item.seasonalPrice.toFixed(2))} €</strong></td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml((item.replacementCost || 0).toFixed(2))} €</td></tr>`;
      }
      const itemFreq = item.frequencyOverride || offerFrequency;
      const itemFreqText = item.frequencyOverride ? formatWeeks(item.frequencyOverride) : frequencyText;
      const isOverride = !!item.frequencyOverride && item.frequencyOverride !== offerFrequency;
      return `<tr><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;${isOverride ? ' font-weight: bold;' : ''}">${escapeHtml(itemFreqText)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">-</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml(item.pricePerUnit.toFixed(2))} €</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml((item.replacementCost || 0).toFixed(2))} €</td></tr>`;
    }).join('');

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
      const hasMixedFrequencies = itemsToUse.some(item => item.frequencyOverride && item.frequencyOverride !== offerFrequency);
      const frequencySummary = hasMixedFrequencies ? 'MEŠANA (glej tabelo)' : frequencyText.toUpperCase();
      summaryHTML = `
        <p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalItems} KOS</p>
        <p style="font-size: 12px; margin: 5px 0;"><strong>Frekvenca menjave:</strong> ${frequencySummary}</p>
        <p style="font-size: 12px; margin: 5px 0;"><strong>4-tedenski obračun:</strong> ${normalTotal.toFixed(2)} €</p>`;
    }

    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th colspan="2" style="border: 1px solid ${ts.border}; padding: 8px; text-align: left;">Artikli za najem</th><th colspan="7" style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th style="border: 1px solid ${ts.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Frekvenca menjave</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Obdobje</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Cena/teden/kos<br/><em>NAJEM</em></th><th style="border: 1px solid ${ts.border}; padding: 8px;">Povračilo<br/><em>(primer uničenja ali izgube) / kos</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p>${summaryHTML}`;
  }, [offerType, offerFrequency, offerItemsNajem, ts]);

  // Generate HTML nakup table from najem items (for primerjava/dodatna)
  const generateNakupTableHTMLFromNajem = useCallback(() => {
    const nakupItems = offerItemsNajem.filter(i => i.purpose === 'nakup');
    const totals = {
      totalItems: nakupItems.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: nakupItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0)
    };
    const rows = nakupItems.map(item =>
      `<tr><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml(item.pricePerUnit.toFixed(2))} €</td></tr>`
    ).join('');
    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th colspan="2" style="border: 1px solid ${ts.border}; padding: 8px; text-align: left;">Artikel</th><th colspan="4" style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th style="border: 1px solid ${ts.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Cena/kos<br/><em>NAKUP</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totals.totalItems} KOS</p><p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> ${totals.totalPrice.toFixed(2)} €</p>`;
  }, [offerItemsNajem, ts]);

  // Generate HTML table for a single item (for dimension comparison)
  const generateSingleItemTableHTML = useCallback((item: OfferItem, frequencyLabel?: string) => {
    const itemFreq = item.frequencyOverride || offerFrequency;
    const frequencyText = frequencyLabel || formatWeeks(itemFreq);
    const isSeasonal = item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice;

    let rows = '';
    let summaryHTML = '';

    if (isSeasonal) {
      // Seasonal item - show two rows (normal and seasonal period)
      const normalPeriod = `teden ${item.normalFromWeek || 13}-${item.normalToWeek || 44}`;
      const seasonalPeriod = `teden ${item.seasonalFromWeek}-${item.seasonalToWeek}`;
      const normalFreqText = formatWeeks(item.normalFrequency || '4');
      const seasonalFreqText = formatWeeks(item.seasonalFrequency || '1');
      const normalPrice = item.normalPrice || item.pricePerUnit;

      const normalTotal = normalPrice * item.quantity * 4;
      const seasonalTotal = item.seasonalPrice! * item.quantity * 4;

      rows = `<tr><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${normalFreqText}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${normalPeriod}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml(normalPrice.toFixed(2))} €</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml((item.replacementCost || 0).toFixed(2))} €</td></tr><tr style="background-color: #fff8e6;"><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;"><strong>${seasonalFreqText}</strong></td><td style="border: 1px solid ${ts.border}; padding: 8px;"><strong>${seasonalPeriod}</strong></td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;"><strong>${escapeHtml(item.seasonalPrice!.toFixed(2))} €</strong></td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml((item.replacementCost || 0).toFixed(2))} €</td></tr>`;

      summaryHTML = `
        <p style="font-size: 12px; margin: 10px 0 5px 0;"><strong>4-tedenski obračun:</strong></p>
        <ul style="font-size: 12px; margin: 5px 0 5px 20px; padding: 0; list-style: none;">
          <li style="margin-bottom: 5px;"><strong>Obdobje 1</strong> (${normalPeriod}, menjava na ${normalFreqText}): <strong>${normalTotal.toFixed(2)} €</strong></li>
          <li style="color: #b45309;"><strong>Obdobje 2</strong> (${seasonalPeriod}, menjava na ${seasonalFreqText}): <strong>${seasonalTotal.toFixed(2)} €</strong></li>
        </ul>`;

      return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th style="border: 1px solid ${ts.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Prilagojen</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Frekvenca</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Obdobje</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Cena/teden</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Povračilo</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p>${summaryHTML}`;
    }

    // Non-seasonal item
    const fourWeekTotal = item.pricePerUnit * item.quantity * 4;
    rows = `<tr><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.code || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.name)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.size || '')}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${escapeHtml(item.customized ? 'da' : 'ne')}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: center;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid ${ts.border}; padding: 8px;">${frequencyText}</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml(item.pricePerUnit.toFixed(2))} €</td><td style="border: 1px solid ${ts.border}; padding: 8px; text-align: right;">${escapeHtml((item.replacementCost || 0).toFixed(2))} €</td></tr>`;

    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${ts.headerBg}; color: ${ts.headerText};"><th style="border: 1px solid ${ts.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Prilagojen</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Frekvenca</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Cena/teden</th><th style="border: 1px solid ${ts.border}; padding: 8px;">Povračilo</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 5px 0;"><strong>4-tedenski obračun:</strong> ${fourWeekTotal.toFixed(2)} €</p>`;
  }, [offerFrequency, ts]);

  // Generate full HTML email - accepts optional text overrides for inline editing
  const generateEmailHTML = useCallback((overrides?: TextOverrides) => {
    const sigHtml = `<p style="margin-top: 20px;">Lep pozdrav,</p>`;
    const sigBlock = signature?.is_active
      ? `${sigHtml}${generateSignatureHTML(signature)}`
      : sigHtml;
    const hasSeasonalItems = offerItemsNajem.some(item => item.seasonal);

    // Use overrides > template > hardcoded defaults
    const tpl = template;
    const defaultSeasonalText = 'Kot dogovorjeno, ponudba vključuje tudi <strong>sezonsko prilagoditev</strong> s pogostejšo menjavo v obdobju povečanega obiska.';
    const seasonalContent = overrides?.seasonalText ?? tpl?.seasonal_text ?? defaultSeasonalText;
    const seasonalTextHtml = hasSeasonalItems ? `<p>${seasonalContent}</p>` : '';

    const introNajem = overrides?.introText ?? tpl?.intro_text ?? 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. V spodnji tabeli so navedene dimenzije, cene in pogostost menjave.';
    const introNakup = overrides?.introText ?? tpl?.intro_text ?? 'kot dogovorjeno pošiljam ponudbo za nakup profesionalnih predpražnikov. Podrobnosti o dimenzijah in cenah se nahajajo v spodnji tabeli.';
    const introPrimerjava = overrides?.introText ?? tpl?.intro_text ?? 'kot dogovorjeno pošiljam ponudbo za najem, prav tako pa spodaj prilagam tudi ponudbo za nakup predpražnikov, da lahko primerjate obe možnosti.';

    const defaultServiceSeasonal = 'Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih (z upoštevanjem sezonske prilagoditve) ter strošek pranja in dostave.';
    const defaultService = 'Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih ter strošek pranja in dostave.';
    const serviceNajem = overrides?.serviceText ?? tpl?.service_text ?? (hasSeasonalItems ? defaultServiceSeasonal : defaultService);
    const serviceNakup = overrides?.serviceText ?? tpl?.service_text ?? 'Predpražniki so visoke kakovosti in primerni za dolgotrajno uporabo.';

    const closingNajem = overrides?.closingText ?? tpl?.closing_text ?? 'Za vsa dodatna vprašanja ali morebitne prilagoditve ponudbe sem vam z veseljem na voljo.';
    const closingNakup = overrides?.closingText ?? tpl?.closing_text ?? 'Za vsa dodatna vprašanja glede materialov ali dobavnih rokov sem vam na voljo.';
    const closingPrimerjava = overrides?.closingText ?? tpl?.closing_text ?? 'Za vsa dodatna vprašanja ali pomoč pri izbiri optimalne rešitve sem vam z veseljem na voljo.';
    const closingDodatna = overrides?.closingText ?? tpl?.closing_text ?? 'Za vsa dodatna vprašanja sem vam na voljo.';

    const freqLabel = overrides?.frequencyLabel;
    const blockOrder = overrides?.blockOrder ?? tpl?.block_order ?? DEFAULT_BLOCK_ORDER;
    const tableSections = overrides?.tableSections;

    // Helper: render multiple table sections (frequency comparison)
    const renderMultiTableSections = (sections: TableSection[]): string => {
      const najemItems = (offerType === 'primerjava' || offerType === 'dodatna')
        ? offerItemsNajem.filter(i => i.purpose !== 'nakup')
        : offerItemsNajem;
      return sections.map(section => {
        const recalculated = recalculateItemsForFrequency(najemItems, section.frequency) as OfferItem[];
        return `<h3 style="color: ${ts.headerBg}; margin-top: 20px;">${escapeHtml(section.label)}</h3>${generateNajemTableHTML(formatWeeks(section.frequency), recalculated)}`;
      }).join('');
    };

    // Block-ordered rendering for najem and nakup
    if (offerType === 'najem') {
      const blockRenderers: Record<string, () => string> = {
        intro: () => `<p>${escapeHtml(introNajem)}</p>`,
        seasonal: () => seasonalTextHtml,
        tables: () => tableSections && tableSections.length > 0
          ? renderMultiTableSections(tableSections)
          : generateNajemTableHTML(freqLabel),
        service: () => `<p>${escapeHtml(serviceNajem)}</p>`,
        closing: () => `<p>${escapeHtml(closingNajem)}</p>`,
      };
      const body = blockOrder.map(id => blockRenderers[id]?.() || '').join('');
      return `<p>Pozdravljeni,</p>${body}${sigBlock}`;
    }

    if (offerType === 'nakup') {
      const blockRenderers: Record<string, () => string> = {
        intro: () => `<p>${escapeHtml(introNakup)}</p>`,
        seasonal: () => '',
        tables: () => generateNakupTableHTML(),
        service: () => `<p>${escapeHtml(serviceNakup)}</p>`,
        closing: () => `<p>${escapeHtml(closingNakup)}</p>`,
      };
      const body = blockOrder.map(id => blockRenderers[id]?.() || '').join('');
      return `<p>Pozdravljeni,</p>${body}${sigBlock}`;
    }

    // Check if primerjava is 2x najem (dimension comparison) vs najem+nakup
    if (offerType === 'primerjava') {
      const najemItems = offerItemsNajem.filter(i => i.purpose !== 'nakup');
      const is2xNajem = najemItems.length >= 2 && offerItemsNajem.every(i => i.purpose !== 'nakup');

      if (is2xNajem) {
        const sortedItems = [...najemItems].sort((a, b) => (a.m2 || 0) - (b.m2 || 0));
        const smallerItem = sortedItems[0];
        const largerItem = sortedItems[1];
        const hasSeasonalIn2xNajem = najemItems.some(item => item.seasonal && item.seasonalFromWeek && item.seasonalToWeek && item.seasonalPrice);

        const serviceFor2x = overrides?.serviceText ?? tpl?.service_text ?? (hasSeasonalIn2xNajem
          ? 'Cena vključuje predpražnik, redno menjavo, čiščenje in sezonsko prilagoditev (pogostejša menjava v času slabšega vremena).'
          : 'Cena vključuje predpražnik, redno menjavo in čiščenje.');
        const introFor2x = overrides?.introText ?? tpl?.intro_text ?? 'kot dogovorjeno sem pripravil informativno ponudbo za dve najpogostejši standardni dimenziji.';
        const closingFor2x = closingPrimerjava;

        const blockRenderers: Record<string, () => string> = {
          intro: () => `<p>${escapeHtml(introFor2x)}</p><p>Tako boste imeli jasno predstavo o strošku za manjšo in večjo opcijo.</p><p>Spodaj prilagam ponudbo:</p>`,
          seasonal: () => '',
          tables: () => `<h3 style="color: ${ts.headerBg};">Standardna dimenzija 1:</h3>${generateSingleItemTableHTML(smallerItem, freqLabel)}<h3 style="color: ${ts.headerBg}; margin-top: 30px;">Standardna dimenzija 2:</h3>${generateSingleItemTableHTML(largerItem, freqLabel)}`,
          service: () => `<p style="margin-top: 20px;">${escapeHtml(serviceFor2x)}</p>`,
          closing: () => `<p>${escapeHtml(closingFor2x)}</p>`,
        };
        const body = blockOrder.map(id => blockRenderers[id]?.() || '').join('');
        return `<p>Pozdravljeni,</p>${body}${sigBlock}`;
      }

      const blockRenderers: Record<string, () => string> = {
        intro: () => `<p>${escapeHtml(introPrimerjava)}</p>`,
        seasonal: () => seasonalTextHtml,
        tables: () => {
          const najemHtml = tableSections && tableSections.length > 0
            ? renderMultiTableSections(tableSections)
            : `<h3 style="color: ${ts.headerBg};">1. Opcija: Najem in vzdrževanje</h3><p>Vključuje redno menjavo in čiščenje${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.</p>${generateNajemTableHTML(freqLabel)}`;
          const nakupHtml = `<h3 style="color: ${ts.headerBg}; margin-top: 30px;">${tableSections && tableSections.length > 0 ? '' : '2. Opcija: '}Nakup predpražnikov</h3><p>Enkraten strošek nakupa predpražnikov v trajno last.</p>${generateNakupTableHTMLFromNajem()}`;
          return najemHtml + nakupHtml;
        },
        service: () => '',
        closing: () => `<p>${escapeHtml(closingPrimerjava)}</p>`,
      };
      const body = blockOrder.map(id => blockRenderers[id]?.() || '').join('');
      return `<p>Pozdravljeni,</p>${body}${sigBlock}`;
    }

    if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');

      let introContent = '';
      if (overrides?.introText != null) {
        introContent = escapeHtml(overrides.introText);
      } else if (tpl?.intro_text) {
        introContent = escapeHtml(tpl.intro_text);
      } else if (hasNajemItems && hasNakupItems) {
        introContent = 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.';
      } else if (hasNajemItems) {
        introContent = 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov.';
      } else if (hasNakupItems) {
        introContent = 'kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.';
      }

      let tablesHtml = '';
      if (hasNajemItems) {
        if (tableSections && tableSections.length > 0) {
          tablesHtml += `${seasonalTextHtml}${renderMultiTableSections(tableSections)}`;
        } else {
          const sectionTitle = hasNakupItems ? `<h3 style="color: ${ts.headerBg};">1. Najem predpražnikov</h3>` : '';
          tablesHtml += `${seasonalTextHtml}${sectionTitle}<p>Vključuje servis in menjavo po dogovoru${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.</p>${generateNajemTableHTML(freqLabel)}`;
        }
      }
      if (hasNakupItems) {
        const sectionNumber = hasNajemItems ? '2' : '';
        const sectionTitle = hasNajemItems ? `<h3 style="color: ${ts.headerBg}; margin-top: 30px;">${tableSections && tableSections.length > 0 ? '' : `${sectionNumber}. `}Nakup predpražnikov</h3>` : '';
        tablesHtml += `${sectionTitle}<p>Predpražniki za nakup v trajno last (brez menjave).</p>${generateNakupTableHTMLFromNajem()}`;
      }

      const blockRenderers: Record<string, () => string> = {
        intro: () => introContent ? `<p>${introContent}</p>` : '',
        seasonal: () => '', // seasonal is embedded in tables for dodatna
        tables: () => tablesHtml,
        service: () => '', // service is embedded in tables for dodatna
        closing: () => `<p>${escapeHtml(closingDodatna)}</p>`,
      };
      const body = blockOrder.map(id => blockRenderers[id]?.() || '').join('');
      return `<p>Pozdravljeni,</p>${body}${sigBlock}`;
    }
    return '';
  }, [offerType, offerItemsNajem, generateNajemTableHTML, generateNakupTableHTML, generateNakupTableHTMLFromNajem, generateSingleItemTableHTML, template, signature, ts]);

  // Copy HTML to clipboard
  const copyHTMLToClipboard = useCallback(async (overrides?: TextOverrides) => {
    const html = generateEmailHTML(overrides);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([generateEmailContent()], { type: 'text/plain' })
        })
      ]);
      toast({ description: '✅ Ponudba kopirana! Prilepi v Outlook.' });
    } catch {
      try {
        await navigator.clipboard.writeText(html);
        toast({ description: '✅ HTML kopiran v odložišče' });
      } catch {
        toast({ description: 'Napaka pri kopiranju', variant: 'destructive' });
      }
    }
  }, [generateEmailHTML, generateEmailContent, toast]);

  // Send offer email
  const sendOfferEmail = useCallback(async () => {
    const primaryContact = selectedCompany ? getPrimaryContact(selectedCompany) : null;
    const email = primaryContact?.email || '';
    const companyName = selectedCompany?.name || '';
    let subject = 'Ponudba za predpražnike';

    if (offerType === 'primerjava') {
      // Check if it's 2x najem (dimension comparison) vs najem+nakup
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
      if (hasNajemItems && !hasNakupItems) {
        subject = `Ponudba za najem predpražnikov - ${companyName}`;
      } else {
        subject = `Ponudba za nakup in najem predpražnikov - ${companyName}`;
      }
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
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([generateEmailContent()], { type: 'text/plain' })
        })
      ]);
    } catch {
      await navigator.clipboard.writeText(generateEmailContent());
    }

    // Save offer to database
    await saveOfferToDatabase(subject, email);

    // Open mailto with just subject - user will paste content
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    toast({ description: '✅ Ponudba kopirana in shranjena - prilepi v Outlook (Ctrl+V)' });
  }, [selectedCompany, offerType, offerItemsNajem, generateEmailHTML, generateEmailContent, saveOfferToDatabase, toast]);

  return {
    // Text table generators
    generateNakupTable,
    generateNajemTable,
    generateNakupTableFromNajem,
    generateNakupTableFiltered,
    // Email generators
    generateEmailContent,
    generateEmailHTML,
    // Actions
    copyHTMLToClipboard,
    sendOfferEmail,
  };
}

export type UseOfferEmailReturn = ReturnType<typeof useOfferEmail>;

export default useOfferEmail;

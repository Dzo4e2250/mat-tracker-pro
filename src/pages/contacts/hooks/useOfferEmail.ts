/**
 * @file useOfferEmail.ts
 * @description Hook za generiranje emailov in tabel za ponudbe
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getPurchasePrice, calculateCustomPurchasePrice } from '@/utils/priceList';
import { OfferItem } from '../types';
import { getPrimaryContact } from '../utils/contactHelpers';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';

// Table styles constant
export const tableStyles = { headerBg: '#1e3a5f', headerText: '#ffffff', border: '#1e3a5f' };

// Period text helpers
const getNormalPeriodText = (seasonalFromWeek: number, seasonalToWeek: number): string => {
  const normalStart = seasonalToWeek >= 52 ? 1 : seasonalToWeek + 1;
  const normalEnd = seasonalFromWeek <= 1 ? 52 : seasonalFromWeek - 1;
  return `teden ${normalStart}-${normalEnd}`;
};

const getSeasonalPeriodText = (seasonalFromWeek: number, seasonalToWeek: number): string =>
  `teden ${seasonalFromWeek}-${seasonalToWeek}`;

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
}

export function useOfferEmail({
  offerType,
  offerFrequency,
  offerItemsNakup,
  offerItemsNajem,
  calculateOfferTotals,
  selectedCompany,
  saveOfferToDatabase,
}: UseOfferEmailProps) {
  const { toast } = useToast();

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
          normalTotal += item.pricePerUnit * item.quantity * 4;
          seasonalTotal += item.seasonalPrice * item.quantity * 4;
          normalPeriodInfo = getNormalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
          seasonalPeriodInfo = getSeasonalPeriodText(item.seasonalFromWeek, item.seasonalToWeek);
          seasonalFreqInfo = item.seasonalFrequency === '1' ? '1 teden' : `${item.seasonalFrequency} tedna`;
        } else {
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
    const signature = `Lep pozdrav,`;
    const hasSeasonalItems = offerItemsNajem.some(item => item.seasonal);

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

      let introText = 'Pozdravljeni,\n\n';
      if (hasNajemItems && hasNakupItems) {
        introText += 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.';
      } else if (hasNajemItems) {
        introText += 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov.';
      } else if (hasNakupItems) {
        introText += 'kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.';
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

      return `${introText}${najemSection}${nakupSection}\n\nZa vsa dodatna vprašanja sem vam na voljo.\n\n${signature}`;
    }
    return '';
  }, [offerType, offerItemsNajem, generateNajemTable, generateNakupTable, generateNakupTableFromNajem, generateNakupTableFiltered]);

  // Generate HTML table for NAKUP
  const generateNakupTableHTML = useCallback(() => {
    const totalsNakup = calculateOfferTotals('nakup');
    const rows = offerItemsNakup.map(item =>
      `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${item.pricePerUnit.toFixed(2)} €</td></tr>`
    ).join('');
    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th colspan="2" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: left;">Artikel</th><th colspan="4" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Cena/kos<br/><em>NAKUP</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalsNakup.totalItems} KOS</p><p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> ${(totalsNakup as any).totalPrice?.toFixed(2)} €</p>`;
  }, [offerItemsNakup, calculateOfferTotals]);

  // Generate HTML table for NAJEM
  const generateNajemTableHTML = useCallback(() => {
    const itemsToUse = (offerType === 'primerjava' || offerType === 'dodatna')
      ? offerItemsNajem.filter(i => i.purpose !== 'nakup')
      : offerItemsNajem;

    const hasSeasonalItems = itemsToUse.some(item => item.seasonal);
    const frequencyText = offerFrequency === '1' ? '1 teden' : `${offerFrequency} tedna`;

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
        const normalFreqText = item.normalFrequency === '1' ? '1 teden' : `${item.normalFrequency || '4'} tedne`;
        const normalPrice = item.normalPrice || item.pricePerUnit;
        const seasonalFreqText = item.seasonalFrequency === '1' ? '1 teden' : `${item.seasonalFrequency} tedna`;
        return `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${normalFreqText}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${normalPeriod}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${normalPrice.toFixed(2)} €</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${(item.replacementCost || 0).toFixed(2)} €</td></tr><tr style="background-color: #fff8e6;"><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;"><strong>${seasonalFreqText}</strong></td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;"><strong>${seasonalPeriod}</strong></td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;"><strong>${item.seasonalPrice.toFixed(2)} €</strong></td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${(item.replacementCost || 0).toFixed(2)} €</td></tr>`;
      }
      return `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${frequencyText}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">-</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${item.pricePerUnit.toFixed(2)} €</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${(item.replacementCost || 0).toFixed(2)} €</td></tr>`;
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
      summaryHTML = `
        <p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totalItems} KOS</p>
        <p style="font-size: 12px; margin: 5px 0;"><strong>Frekvenca menjave:</strong> ${frequencyText.toUpperCase()}</p>
        <p style="font-size: 12px; margin: 5px 0;"><strong>4-tedenski obračun:</strong> ${normalTotal.toFixed(2)} €</p>`;
    }

    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th colspan="2" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: left;">Artikli za najem</th><th colspan="7" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Frekvenca menjave</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Obdobje</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Cena/teden/kos<br/><em>NAJEM</em></th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Povračilo<br/><em>(primer uničenja ali izgube) / kos</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p>${summaryHTML}`;
  }, [offerType, offerFrequency, offerItemsNajem]);

  // Generate HTML nakup table from najem items (for primerjava/dodatna)
  const generateNakupTableHTMLFromNajem = useCallback(() => {
    const nakupItems = offerItemsNajem.filter(i => i.purpose === 'nakup');
    const totals = {
      totalItems: nakupItems.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: nakupItems.reduce((sum, i) => sum + (i.pricePerUnit * i.quantity), 0)
    };
    const rows = nakupItems.map(item =>
      `<tr><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.code || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.name}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.size || ''}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px;">${item.customized ? 'da' : 'ne'}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">${item.quantity}</td><td style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: right;">${item.pricePerUnit.toFixed(2)} €</td></tr>`
    ).join('');
    return `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;"><thead><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th colspan="2" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: left;">Artikel</th><th colspan="4" style="border: 1px solid ${tableStyles.border}; padding: 8px; text-align: center;">Opis, količina, cena</th></tr><tr style="background-color: ${tableStyles.headerBg}; color: ${tableStyles.headerText};"><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Koda</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Naziv</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Velikost</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Kupcu prilagojen izdelek</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Količina</th><th style="border: 1px solid ${tableStyles.border}; padding: 8px;">Cena/kos<br/><em>NAKUP</em></th></tr></thead><tbody>${rows}</tbody></table><p style="font-size: 11px; color: #0066cc; margin: 5px 0;"><a href="#" style="color: #0066cc;">Cene ne vključujejo DDV</a></p><p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> ${totals.totalItems} KOS</p><p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> ${totals.totalPrice.toFixed(2)} €</p>`;
  }, [offerItemsNajem]);

  // Generate full HTML email
  const generateEmailHTML = useCallback(() => {
    const signature = `<p style="margin-top: 20px;">Lep pozdrav,</p>`;
    const hasSeasonalItems = offerItemsNajem.some(item => item.seasonal);

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

      let introText = '<p>Pozdravljeni,</p>';
      if (hasNajemItems && hasNakupItems) {
        introText += '<p>kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.</p>';
      } else if (hasNajemItems) {
        introText += '<p>kot dogovorjeno pošiljam ponudbo za najem predpražnikov.</p>';
      } else if (hasNakupItems) {
        introText += '<p>kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.</p>';
      }

      let najemSection = '';
      if (hasNajemItems) {
        const sectionTitle = hasNakupItems ? '<h3 style="color: ' + tableStyles.headerBg + ';">1. Najem predpražnikov</h3>' : '';
        najemSection = `${seasonalText}${sectionTitle}<p>Vključuje servis in menjavo po dogovoru${hasSeasonalItems ? ' s sezonsko prilagoditvijo' : ''}.</p>${generateNajemTableHTML()}`;
      }

      let nakupSection = '';
      if (hasNakupItems) {
        const sectionNumber = hasNajemItems ? '2' : '';
        const sectionTitle = hasNajemItems ? `<h3 style="color: ${tableStyles.headerBg}; margin-top: 30px;">${sectionNumber}. Nakup predpražnikov</h3>` : '';
        nakupSection = `${sectionTitle}<p>Predpražniki za nakup v trajno last (brez menjave).</p>${generateNakupTableHTMLFromNajem()}`;
      }

      return `${introText}${najemSection}${nakupSection}<p>Za vsa dodatna vprašanja sem vam na voljo.</p>${signature}`;
    }
    return '';
  }, [offerType, offerItemsNajem, generateNajemTableHTML, generateNakupTableHTML, generateNakupTableHTMLFromNajem]);

  // Copy HTML to clipboard
  const copyHTMLToClipboard = useCallback(async () => {
    const html = generateEmailHTML();
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

export default useOfferEmail;

/**
 * Hook za pridobivanje opomb/aktivnosti vseh podjetij uporabnika
 * Uporablja se za Zgodovina sekcijo
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyNote } from '@/integrations/supabase/types';
import * as XLSX from 'xlsx';

export type NoteWithCompany = CompanyNote & {
  company: Pick<Company, 'id' | 'name' | 'display_name'>;
};

// Extended type for D365 worklist with full company and contacts data
export type WorklistActivity = CompanyNote & {
  company: Pick<Company, 'id' | 'name' | 'display_name' | 'tax_number' | 'address_street' | 'address_postal' | 'address_city'> & {
    contacts: Array<{
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      work_phone: string | null;
      email: string | null;
      is_primary: boolean;
    }>;
  };
};

export type GroupedWorklistActivities = {
  companyId: string;
  companyName: string;
  company: WorklistActivity['company'];
  activities: WorklistActivity[];
  oldestActivityDate: string;
};

export type GroupedActivities = {
  companyId: string;
  companyName: string;
  activities: NoteWithCompany[];
};

// Mesečna statistika aktivnosti
export type MonthlyActivityStats = {
  month: string; // Format: "2026-01"
  monthLabel: string; // Format: "Januar 2026"
  count: number;
};

/**
 * Pridobi vse opombe/aktivnosti za podjetja uporabnika
 */
export function useCompanyNotes(userId?: string) {
  return useQuery({
    queryKey: ['all-company-notes', userId],
    staleTime: 1000 * 60 * 5, // 5 minut
    gcTime: 1000 * 60 * 30, // 30 minut v cache-u
    queryFn: async () => {
      if (!userId) return [];

      // Pridobi vsa podjetja, ki jih je ustvaril uporabnik ali ima cikle
      const { data: userCompanyIds, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', userId);

      if (companyError) throw companyError;

      const { data: cycleCompanyIds, error: cycleError } = await supabase
        .from('cycles')
        .select('company_id')
        .eq('salesperson_id', userId)
        .not('company_id', 'is', null);

      if (cycleError) throw cycleError;

      // Združi ID-je podjetij
      const allCompanyIds = new Set<string>();
      userCompanyIds?.forEach(c => allCompanyIds.add(c.id));
      cycleCompanyIds?.forEach(c => c.company_id && allCompanyIds.add(c.company_id));

      if (allCompanyIds.size === 0) return [];

      // Pridobi samo opombe ki so potrjene v CRM (imajo exported_to_d365_at)
      const { data: notes, error: notesError } = await supabase
        .from('company_notes')
        .select(`
          *,
          company:companies!company_id(id, name, display_name)
        `)
        .in('company_id', Array.from(allCompanyIds))
        .eq('created_by', userId)
        .not('exported_to_d365_at', 'is', null)  // Samo potrjene v CRM
        .order('note_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      return (notes || []) as NoteWithCompany[];
    },
    enabled: !!userId,
  });
}

/**
 * Pridobi aktivnosti za D365 worklist (še nevnešene v CRM)
 * Vrne aktivnosti z D365 polji ki še niso označene kot vnesene,
 * sortirane po datumu (najstarejše najprej)
 */
export function useD365Worklist(userId?: string) {
  return useQuery({
    queryKey: ['d365-worklist', userId],
    staleTime: 1000 * 60 * 2, // 2 minuti
    gcTime: 1000 * 60 * 15, // 15 minut v cache-u
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('company_notes')
        .select(`
          id,
          company_id,
          note_date,
          content,
          start_time,
          end_time,
          activity_category,
          activity_subcategory,
          appointment_type,
          exported_to_d365_at,
          created_by,
          created_at,
          updated_at,
          company:companies!company_id(
            id,
            name,
            display_name,
            tax_number,
            address_street,
            address_postal,
            address_city,
            contacts(
              id,
              first_name,
              last_name,
              phone,
              work_phone,
              email,
              is_primary
            )
          )
        `)
        .eq('created_by', userId)
        .is('exported_to_d365_at', null)  // Vse aktivnosti ki še niso vnesene v CRM
        .order('note_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data || []) as WorklistActivity[];
    },
    enabled: !!userId,
  });
}

/**
 * Grupira worklist aktivnosti po podjetjih
 * Sortira podjetja po datumu najstarejše aktivnosti (tisti ki čakajo najdlje so na vrhu)
 */
export function groupWorklistByCompany(activities: WorklistActivity[]): GroupedWorklistActivities[] {
  const groupMap = new Map<string, GroupedWorklistActivities>();

  for (const activity of activities) {
    if (!activity.company) continue;

    const companyId = activity.company.id;
    if (!groupMap.has(companyId)) {
      groupMap.set(companyId, {
        companyId,
        companyName: activity.company.display_name || activity.company.name,
        company: activity.company,
        activities: [],
        oldestActivityDate: activity.note_date,
      });
    }
    const group = groupMap.get(companyId)!;
    group.activities.push(activity);

    // Posodobi najstarejši datum
    if (activity.note_date < group.oldestActivityDate) {
      group.oldestActivityDate = activity.note_date;
    }
  }

  // Aktivnosti znotraj podjetja so že sortirane (najstarejše najprej) iz query-ja
  const groups = Array.from(groupMap.values());

  // Sortiraj podjetja po najstarejši aktivnosti (tisti ki čakajo najdlje najprej)
  groups.sort((a, b) => {
    return new Date(a.oldestActivityDate).getTime() - new Date(b.oldestActivityDate).getTime();
  });

  return groups;
}

/**
 * Grupira aktivnosti po podjetjih, razvrščene po datumu
 */
export function groupActivitiesByCompany(notes: NoteWithCompany[]): GroupedActivities[] {
  const groupMap = new Map<string, GroupedActivities>();

  for (const note of notes) {
    if (!note.company) continue;

    const companyId = note.company.id;
    if (!groupMap.has(companyId)) {
      groupMap.set(companyId, {
        companyId,
        companyName: note.company.display_name || note.company.name,
        activities: [],
      });
    }
    groupMap.get(companyId)!.activities.push(note);
  }

  // Razvrsti aktivnosti znotraj vsakega podjetja po datumu (najnovejše prvo)
  const groups = Array.from(groupMap.values());
  for (const group of groups) {
    group.activities.sort((a, b) => {
      // Najprej po note_date
      const dateCompare = new Date(b.note_date).getTime() - new Date(a.note_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // Nato po created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  // Razvrsti podjetja po zadnji aktivnosti
  groups.sort((a, b) => {
    const aLatest = a.activities[0]?.note_date || '';
    const bLatest = b.activities[0]?.note_date || '';
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });

  return groups;
}

/**
 * Izračuna mesečno statistiko aktivnosti
 * Vrne zadnjih 12 mesecev, sortirano od najnovejšega do najstarejšega
 */
export function calculateMonthlyStats(notes: NoteWithCompany[]): MonthlyActivityStats[] {
  const monthNames = [
    'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
    'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
  ];

  // Grupira po mesecu
  const monthMap = new Map<string, number>();

  for (const note of notes) {
    const date = new Date(note.note_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
  }

  // Pretvori v array in sortiraj (najnovejši najprej)
  const stats: MonthlyActivityStats[] = Array.from(monthMap.entries())
    .map(([month, count]) => {
      const [year, monthNum] = month.split('-');
      const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
      return { month, monthLabel, count };
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  return stats;
}

/**
 * Flat list aktivnosti razvrščenih po datumu (za export)
 */
export function flattenActivities(notes: NoteWithCompany[]): NoteWithCompany[] {
  return [...notes].sort((a, b) => {
    const dateCompare = new Date(b.note_date).getTime() - new Date(a.note_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Export aktivnosti v Excel format za Dynamics 365
 * Format: Activity Subject, Description, Due Date, Company Name, Created On
 */
export function exportActivitiesToExcel(notes: NoteWithCompany[]): void {
  // Dynamics 365 zahteva specifične stolpce za Activities import
  // https://learn.microsoft.com/en-us/dynamics365/sales/import-data

  // CSV format za Dynamics 365 Activities
  const headers = [
    'Subject',           // Kratek naslov aktivnosti
    'Description',       // Opis/vsebina opombe
    'Activity Date',     // Datum aktivnosti (MM/DD/YYYY format za D365)
    'Regarding',         // Ime podjetja (Account Name)
    'Activity Type',     // Tip aktivnosti
    'Created On',        // Datum ustvarjanja
    'Due Date',          // Rok (če je sestanek ali deadline)
  ];

  const rows = notes.map(note => {
    const companyName = note.company?.display_name || note.company?.name || '';
    const noteDate = new Date(note.note_date);
    const createdAt = new Date(note.created_at);

    // Določi tip aktivnosti glede na vsebino
    let activityType = 'Note';
    let dueDate = '';

    if (note.content.toLowerCase().includes('sestanek')) {
      activityType = 'Appointment';
      // Poskusi izvleči datum iz vsebine
      const dateMatch = note.content.match(/(\d{1,2})[./](\d{1,2})[./]?(\d{2,4})?/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] || new Date().getFullYear().toString();
        dueDate = `${month}/${day}/${year.length === 2 ? '20' + year : year}`;
      }
    } else if (note.content.toLowerCase().includes('klic') || note.content.toLowerCase().includes('telefon')) {
      activityType = 'Phone Call';
    } else if (note.content.toLowerCase().includes('email') || note.content.toLowerCase().includes('mail')) {
      activityType = 'Email';
    } else if (note.content.toLowerCase().includes('ponudbo do')) {
      activityType = 'Task';
      // Poskusi izvleči deadline
      const deadlineMatch = note.content.match(/ponudbo do[:\s]+(\d{1,2})[./](\d{1,2})/i);
      if (deadlineMatch) {
        const day = deadlineMatch[1].padStart(2, '0');
        const month = deadlineMatch[2].padStart(2, '0');
        dueDate = `${month}/${day}/${new Date().getFullYear()}`;
      }
    }

    // Ustvari kratek Subject iz vsebine (prvih 50 znakov)
    const subject = note.content.length > 50
      ? note.content.substring(0, 47) + '...'
      : note.content;

    // Format datuma za D365: MM/DD/YYYY
    const formatDate = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    return [
      subject,
      note.content,
      formatDate(noteDate),
      companyName,
      activityType,
      formatDate(createdAt),
      dueDate,
    ];
  });

  // Ustvari CSV vsebino
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Download CSV datoteko
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM za Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aktivnosti_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// D365 Category mapping (internal value -> D365 label)
const D365_CATEGORY_MAP: Record<string, string> = {
  'first_visit': 'First visit to Prospect',
  'first_visit_prospect': 'First visit to Prospect',
  'second_visit': 'Second/Further visit to Prospect',
  'second_visit_prospect': 'Second/Further visit to Prospect',
  'sales_visit': 'Sales visit to customer',
  'visit_customer': 'Sales visit to customer',
  'call': 'Phone Call',
  'email': 'Email',
  'meeting': 'Meeting',
  'offer': 'Offer sent',
};

// D365 Sub-category mapping
const D365_SUBCATEGORY_MAP: Record<string, string> = {
  'needs_analysis': 'Needs analysis',
  'offer_negotiation': 'Offer/Contract negotiation',
  'service_presentation': 'Service/Product presentation',
  'presentation': 'Presentation',
  'negotiation': 'Negotiation',
  'closing': 'Closing',
  'follow_up': 'Follow-up',
  'service': 'Service',
};

/**
 * Convert JavaScript Date to Excel serial number
 * Excel dates are stored as days since 1900-01-01 (with time as decimal fraction)
 * Uses local time (not UTC) to match D365 export format
 */
function dateToExcelSerial(date: Date): number {
  // Excel epoch is December 30, 1899
  // We need to use local time components, not UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Calculate days since Excel epoch (1899-12-30)
  // Using the same approach as Excel's DATEVALUE + TIMEVALUE
  const excelEpoch = new Date(1899, 11, 30, 0, 0, 0); // Local time epoch
  const currentDate = new Date(year, month, day, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const dayPart = Math.round((currentDate.getTime() - excelEpoch.getTime()) / msPerDay);
  const timePart = (hours * 3600 + minutes * 60 + seconds) / 86400;

  return dayPart + timePart;
}

// Base64 encoded D365 Appointment template from user's Lindstrom D365 instance
// This template contains the required CodeName, Hidden, and metadata properties that D365 needs for reimport
const D365_TEMPLATE_BASE64 = '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';

/**
 * Export aktivnosti v D365 Appointment Excel format
 * Uporablja uporabnikovo D365 predlogo za ohranitev interne strukture
 * @param notes - Vse opombe
 * @param onlyNew - Če true, izvozi samo še neizvožene opombe
 * @returns Objekt z info o izvozu in ID-ji izvoženih opomb
 */
export function exportToD365Excel(notes: NoteWithCompany[], onlyNew: boolean = false): {
  exported: number;
  skipped: number;
  alreadyExported: number;
  exportedIds: string[];
} {
  // Filter notes that have D365 fields
  let d365Notes = notes.filter(note => {
    const hasD365Fields = note.activity_category && note.activity_subcategory;
    return hasD365Fields;
  });

  // Count already exported
  const alreadyExportedCount = d365Notes.filter(n => n.exported_to_d365_at).length;

  // If onlyNew, filter out already exported
  if (onlyNew) {
    d365Notes = d365Notes.filter(note => !note.exported_to_d365_at);
  }

  if (d365Notes.length === 0) {
    return {
      exported: 0,
      skipped: notes.length - alreadyExportedCount,
      alreadyExported: alreadyExportedCount,
      exportedIds: [],
    };
  }

  // Extract time (HH:MM) from a timestamp string like "2026-01-30T09:00:00" or return as-is if already HH:MM
  const extractTime = (timestamp: string | null | undefined, defaultTime: string): string => {
    if (!timestamp) return defaultTime;
    const match = timestamp.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    if (/^\d{2}:\d{2}$/.test(timestamp)) return timestamp;
    return defaultTime;
  };

  // Load the D365 template from base64
  const templateData = Uint8Array.from(atob(D365_TEMPLATE_BASE64), c => c.charCodeAt(0));
  const wb = XLSX.read(templateData, { type: 'array' });

  // Get the Appointment worksheet
  const ws = wb.Sheets['Appointment'];

  // Get current range - we'll add new rows after existing data
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:K1');
  const startRow = range.e.r + 1; // Start after last existing row

  // Add our data rows after existing data
  // Columns: A=Appointment ID, B=Checksum, C=Modified, D=Subject, E=Status, F=Start, G=End, H=Regarding, I=Location, J=Account Hierarchy, K=Detailed Category
  d365Notes.forEach((note, idx) => {
    const rowNum = startRow + idx; // Add after existing rows
    const companyName = note.company?.display_name || note.company?.name || '';

    // Parse times
    const startTimeStr = extractTime(note.start_time, '09:00');
    const endTimeStr = extractTime(note.end_time, '09:30');

    const noteDate = new Date(note.note_date + 'T00:00:00');
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const startDateTime = new Date(noteDate);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(noteDate);
    endDateTime.setHours(endH, endM, 0, 0);

    // Set cells
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 0 })] = { t: 's', v: '' }; // Appointment ID - empty for new
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 1 })] = { t: 's', v: '' }; // Checksum - empty for new
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 2 })] = { t: 's', v: '' }; // Modified On - empty for new
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 3 })] = { t: 's', v: 'MAS' }; // Subject
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 4 })] = { t: 's', v: 'Completed' }; // Status
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 5 })] = { t: 'n', v: dateToExcelSerial(startDateTime), z: 'm/d/yy h:mm' }; // Start Time
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 6 })] = { t: 'n', v: dateToExcelSerial(endDateTime), z: 'm/d/yy h:mm' }; // End Time
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 7 })] = { t: 's', v: companyName }; // Regarding
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 8 })] = { t: 's', v: '' }; // Location
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 9 })] = { t: 's', v: 'COMPANY' }; // Account Hierarchy
    ws[XLSX.utils.encode_cell({ r: rowNum, c: 10 })] = { t: 's', v: 'P1' }; // Detailed Category
  });

  // Update the range to include all rows (existing + new)
  const lastRow = startRow + d365Notes.length - 1;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: 10 } });

  // Generate filename matching D365 format
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
  const filename = `Appointment ${dateStr}.xlsx`;

  // Download - preserve the original workbook structure
  XLSX.writeFile(wb, filename);

  return {
    exported: d365Notes.length,
    skipped: notes.length - d365Notes.length - alreadyExportedCount,
    alreadyExported: alreadyExportedCount,
    exportedIds: d365Notes.map(n => n.id),
  };
}

/**
 * Kopira D365 podatke v odložišče za ročno lepljenje v D365 Excel predlogo
 *
 * Postopek za uporabnika:
 * 1. V D365 izvozi prazno Appointment predlogo (Activities > 3 pikice > Excel templates)
 * 2. Odpri predlogo v Excelu
 * 3. Klikni celico A2 (prva vrstica pod glavami)
 * 4. Prilepi (Ctrl+V) - podatki se bodo vnesli v pravilne stolpce
 * 5. Shrani in uvozi nazaj v D365
 *
 * @param notes - Opombe za izvoz
 * @param onlyNew - Če true, izvozi samo še neizvožene
 * @returns Število izvoženih in ID-ji
 */
export async function copyD365DataToClipboard(notes: NoteWithCompany[], onlyNew: boolean = false): Promise<{
  exported: number;
  skipped: number;
  alreadyExported: number;
  exportedIds: string[];
}> {
  // Filter notes that have D365 fields
  let d365Notes = notes.filter(note => {
    const hasD365Fields = note.activity_category && note.activity_subcategory;
    return hasD365Fields;
  });

  // Count already exported
  const alreadyExportedCount = d365Notes.filter(n => n.exported_to_d365_at).length;

  // If onlyNew, filter out already exported
  if (onlyNew) {
    d365Notes = d365Notes.filter(note => !note.exported_to_d365_at);
  }

  if (d365Notes.length === 0) {
    return {
      exported: 0,
      skipped: notes.length - alreadyExportedCount,
      alreadyExported: alreadyExportedCount,
      exportedIds: [],
    };
  }

  // Extract time (HH:MM) from a timestamp string
  const extractTime = (timestamp: string | null | undefined, defaultTime: string): string => {
    if (!timestamp) return defaultTime;
    const match = timestamp.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    if (/^\d{2}:\d{2}$/.test(timestamp)) return timestamp;
    return defaultTime;
  };

  // Format date for Excel paste (M/D/YYYY H:MM format that Excel recognizes)
  const formatExcelDateTime = (date: Date, time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year} ${h}:${m.toString().padStart(2, '0')}`;
  };

  // Build tab-separated rows
  // Columns match D365 Appointment template:
  // (Do Not Modify) Appointment | (Do Not Modify) Row Checksum | (Do Not Modify) Modified On | Subject | Status | Start Time | End Time | Regarding | Location | Account Hierarchy | Detailed Category
  const rows = d365Notes.map(note => {
    const companyName = note.company?.display_name || note.company?.name || '';
    const noteDate = new Date(note.note_date + 'T00:00:00');

    const startTimeStr = extractTime(note.start_time, '09:00');
    const endTimeStr = extractTime(note.end_time, '09:30');

    const startDateTime = formatExcelDateTime(noteDate, startTimeStr);
    const endDateTime = formatExcelDateTime(noteDate, endTimeStr);

    // Tab-separated values for each column
    return [
      '',           // (Do Not Modify) Appointment - empty for new
      '',           // (Do Not Modify) Row Checksum - empty for new
      '',           // (Do Not Modify) Modified On - empty for new
      'MAS',        // Subject
      'Completed',  // Status
      startDateTime, // Start Time
      endDateTime,   // End Time
      companyName,  // Regarding
      '',           // Location
      'COMPANY',    // Account Hierarchy
      'P1',         // Detailed Category
    ].join('\t');
  });

  const clipboardText = rows.join('\n');

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(clipboardText);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = clipboardText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  return {
    exported: d365Notes.length,
    skipped: notes.length - d365Notes.length - alreadyExportedCount,
    alreadyExported: alreadyExportedCount,
    exportedIds: d365Notes.map(n => n.id),
  };
}

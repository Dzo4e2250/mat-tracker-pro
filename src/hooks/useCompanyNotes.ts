/**
 * Hook za pridobivanje opomb/aktivnosti vseh podjetij uporabnika
 * Uporablja se za Zgodovina sekcijo
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyNote } from '@/integrations/supabase/types';

export type NoteWithCompany = CompanyNote & {
  company: Pick<Company, 'id' | 'name' | 'display_name'>;
};

export type GroupedActivities = {
  companyId: string;
  companyName: string;
  activities: NoteWithCompany[];
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

      // Pridobi vse opombe za ta podjetja
      const { data: notes, error: notesError } = await supabase
        .from('company_notes')
        .select(`
          *,
          company:companies!company_id(id, name, display_name)
        `)
        .in('company_id', Array.from(allCompanyIds))
        .eq('created_by', userId)
        .order('note_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      return (notes || []) as NoteWithCompany[];
    },
    enabled: !!userId,
  });
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

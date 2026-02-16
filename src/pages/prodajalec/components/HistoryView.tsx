/**
 * @file HistoryView.tsx
 * @description Prikaz zgodovine ciklov in aktivnosti
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyNotes, groupActivitiesByCompany, calculateMonthlyStats, exportActivitiesToExcel, exportToD365Excel, copyD365DataToClipboard, useD365Worklist, type NoteWithCompany } from '@/hooks/useCompanyNotes';
import D365WorklistTab from './D365WorklistTab';
import type { CycleWithRelations } from '@/hooks/useCycles';
import { STATUSES, type StatusKey } from '../utils/constants';
import { Download, ChevronDown, ChevronUp, Calendar, Building2, MessageSquare, Phone, Mail, Users, FileText, Filter, Check, Copy, BarChart3, TrendingUp, CalendarPlus, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HistoryViewProps {
  cycleHistory: CycleWithRelations[] | undefined;
  cycles?: CycleWithRelations[];
}

type TabType = 'activities' | 'cycles' | 'worklist';
type DateFilterType = 'all' | 'today' | 'yesterday' | 'last2days' | 'thisWeek' | 'lastWeek' | 'thisMonth';

const DATE_FILTERS: { value: DateFilterType; label: string }[] = [
  { value: 'all', label: 'Vse' },
  { value: 'today', label: 'Danes' },
  { value: 'yesterday', label: 'Včeraj' },
  { value: 'last2days', label: 'Zadnja 2 dni' },
  { value: 'thisWeek', label: 'Ta teden' },
  { value: 'lastWeek', label: 'Prejšnji teden' },
  { value: 'thisMonth', label: 'Ta mesec' },
];

// Pomožna funkcija za začetek dneva
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Pomožna funkcija za začetek tedna (ponedeljek)
const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ponedeljek
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Pomožna funkcija za začetek meseca
const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function HistoryView({ cycleHistory, cycles }: HistoryViewProps) {
  const { user } = useAuth();
  const { data: allNotes, isLoading: isLoadingNotes } = useCompanyNotes(user?.id);
  const { data: worklistActivities } = useD365Worklist(user?.id);
  const [activeTab, setActiveTab] = useState<TabType>('activities');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Inventory export function - exports mat counts by type with dates
  const exportInventory = () => {
    // Filter out waiting_driver - these are already written off
    const activeCycles = cycles?.filter(c => c.status !== 'waiting_driver') || [];

    if (activeCycles.length === 0) {
      toast({ description: 'Ni predpražnikov za izvoz', variant: 'destructive' });
      return;
    }

    // Group by mat type
    const byType = new Map<string, { count: number; earliestDate: string; cycles: CycleWithRelations[] }>();

    activeCycles.forEach(cycle => {
      const typeCode = cycle.mat_type?.code || cycle.mat_type?.name || 'Neznano';
      const assignedDate = cycle.test_start_date || cycle.created_at;

      if (!byType.has(typeCode)) {
        byType.set(typeCode, { count: 0, earliestDate: assignedDate, cycles: [] });
      }

      const entry = byType.get(typeCode)!;
      entry.count++;
      entry.cycles.push(cycle);

      // Track earliest date
      if (assignedDate < entry.earliestDate) {
        entry.earliestDate = assignedDate;
      }
    });

    // Create summary data
    const summaryData = Array.from(byType.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([type, data]) => ({
        'Tip': type,
        'Količina': data.count,
        'Od datuma': new Date(data.earliestDate).toLocaleDateString('sl-SI'),
      }));

    // Create detailed data
    const detailData = activeCycles
      .sort((a, b) => {
        const typeA = a.mat_type?.code || a.mat_type?.name || '';
        const typeB = b.mat_type?.code || b.mat_type?.name || '';
        return typeA.localeCompare(typeB);
      })
      .map(cycle => ({
        'QR Koda': cycle.qr_code?.code || '',
        'Tip': cycle.mat_type?.code || cycle.mat_type?.name || '',
        'Status': STATUSES[cycle.status as StatusKey]?.label || cycle.status,
        'Podjetje': cycle.company?.display_name || cycle.company?.name || '-',
        'Datum testa': cycle.test_start_date ? new Date(cycle.test_start_date).toLocaleDateString('sl-SI') : '-',
        'Ustvarjeno': new Date(cycle.created_at).toLocaleDateString('sl-SI'),
      }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Povzetek');

    // Detail sheet
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    wsDetail['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Podrobnosti');

    // Save file
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Inventura_${dateStr}.xlsx`);

    toast({ description: `✅ Izvožena inventura: ${activeCycles.length} predpražnikov` });
  };


  // Filtriraj aktivnosti glede na izbrani datum
  const filteredNotes = useMemo(() => {
    if (!allNotes || dateFilter === 'all') return allNotes || [];

    const now = new Date();
    const today = startOfDay(now);

    let startDate: Date;
    let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Jutri (za vključitev celega dneva)

    switch (dateFilter) {
      case 'today':
        startDate = today;
        break;
      case 'yesterday':
        startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        endDate = today;
        break;
      case 'last2days':
        startDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
        break;
      case 'thisWeek':
        startDate = startOfWeek(now);
        break;
      case 'lastWeek':
        const thisWeekStart = startOfWeek(now);
        startDate = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = thisWeekStart;
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        break;
      default:
        return allNotes;
    }

    return allNotes.filter(note => {
      const noteDate = new Date(note.note_date);
      return noteDate >= startDate && noteDate < endDate;
    });
  }, [allNotes, dateFilter]);

  const groupedActivities = useMemo(() => {
    return filteredNotes ? groupActivitiesByCompany(filteredNotes) : [];
  }, [filteredNotes]);

  // Mesečna statistika - izračunamo iz VSEH potrjenih aktivnosti (ne filtriranih)
  const monthlyStats = useMemo(() => {
    return allNotes ? calculateMonthlyStats(allNotes) : [];
  }, [allNotes]);

  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (filteredNotes && filteredNotes.length > 0) {
      exportActivitiesToExcel(filteredNotes);
    }
  };

  // Mutation to mark activities as exported
  const markAsExported = useMutation({
    mutationFn: async (noteIds: string[]) => {
      const { error } = await supabase
        .from('company_notes')
        .update({ exported_to_d365_at: new Date().toISOString() })
        .in('id', noteIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-company-notes'] });
    },
  });

  // Mutation to reset all activities back to worklist
  const resetAllToWorklist = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('company_notes')
        .update({ exported_to_d365_at: null })
        .eq('created_by', user.id)
        .not('exported_to_d365_at', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-company-notes'] });
      queryClient.invalidateQueries({ queryKey: ['d365-worklist'] });
      toast({ description: '✓ Vse aktivnosti prestavljene v worklist' });
    },
    onError: (error: Error) => {
      toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
    },
  });

  const handleResetAllToWorklist = () => {
    const count = allNotes?.length || 0;
    if (count === 0) {
      toast({ description: 'Ni aktivnosti za reset' });
      return;
    }
    if (window.confirm(`Ali res želiš prestaviti vseh ${count} aktivnosti nazaj v "Za vnos v CRM"?\n\nTo bo ponastavilo status vseh tvojih aktivnosti.`)) {
      resetAllToWorklist.mutate();
    }
  };

  const handleD365Export = async () => {
    if (!filteredNotes || filteredNotes.length === 0) return;

    // Count activities with D365 fields
    const d365Ready = filteredNotes.filter(n => n.activity_category && n.activity_subcategory);
    const alreadyExported = d365Ready.filter(n => n.exported_to_d365_at);
    const newToExport = d365Ready.filter(n => !n.exported_to_d365_at);

    if (d365Ready.length === 0) {
      alert(`Nobena aktivnost nima D365 polj izpolnjenih.\n\nPri vnašanju aktivnosti izpolni D365 polja (Kategorija, Podkategorija) da jih lahko izvozis v D365 format.`);
      return;
    }

    // Ask user what to export
    let exportOnlyNew = false;
    if (alreadyExported.length > 0 && newToExport.length > 0) {
      const choice = window.confirm(
        `📊 Stanje aktivnosti:\n` +
        `• ${newToExport.length} NOVIH (še neizvoženih)\n` +
        `• ${alreadyExported.length} že izvoženih\n\n` +
        `Klikni "V redu" za izvoz SAMO novih aktivnosti\n` +
        `Klikni "Prekliči" za izvoz VSEH aktivnosti (vključno z že izvoženimi)`
      );
      exportOnlyNew = choice;
    } else if (alreadyExported.length > 0 && newToExport.length === 0) {
      const reexport = window.confirm(
        `⚠️ Vse aktivnosti (${alreadyExported.length}) so že bile izvožene.\n\n` +
        `Ali želiš ponovno izvoziti?`
      );
      if (!reexport) return;
    }

    // Perform export
    const result = exportToD365Excel(filteredNotes, exportOnlyNew);

    if (result.exported > 0) {
      // Mark as exported
      try {
        await markAsExported.mutateAsync(result.exportedIds);
        toast({
          description: `✅ Izvoženo ${result.exported} aktivnosti v D365 format` +
            (result.alreadyExported > 0 && exportOnlyNew ? ` (${result.alreadyExported} preskočenih - že izvožene)` : ''),
        });
      } catch {
        toast({
          description: `⚠️ Izvoženo ${result.exported} aktivnosti, a napaka pri označevanju kot izvožene`,
          variant: 'destructive',
        });
      }
    }
  };

  // Handler for copying D365 data to clipboard
  const handleD365Copy = async () => {
    if (!filteredNotes || filteredNotes.length === 0) return;

    // Count activities with D365 fields
    const d365Ready = filteredNotes.filter(n => n.activity_category && n.activity_subcategory);
    const alreadyExported = d365Ready.filter(n => n.exported_to_d365_at);
    const newToExport = d365Ready.filter(n => !n.exported_to_d365_at);

    if (d365Ready.length === 0) {
      alert(`Nobena aktivnost nima D365 polj izpolnjenih.\n\nPri vnašanju aktivnosti izpolni D365 polja (Kategorija, Podkategorija) da jih lahko izvozis v D365 format.`);
      return;
    }

    // Ask user what to export
    let exportOnlyNew = false;
    if (alreadyExported.length > 0 && newToExport.length > 0) {
      const choice = window.confirm(
        `📊 Stanje aktivnosti:\n` +
        `• ${newToExport.length} NOVIH (še neizvoženih)\n` +
        `• ${alreadyExported.length} že izvoženih\n\n` +
        `Klikni "V redu" za kopiranje SAMO novih aktivnosti\n` +
        `Klikni "Prekliči" za kopiranje VSEH aktivnosti (vključno z že izvoženimi)`
      );
      exportOnlyNew = choice;
    } else if (alreadyExported.length > 0 && newToExport.length === 0) {
      const recopy = window.confirm(
        `⚠️ Vse aktivnosti (${alreadyExported.length}) so že bile izvožene.\n\n` +
        `Ali želiš znova kopirati?`
      );
      if (!recopy) return;
    }

    // Perform copy to clipboard
    const result = await copyD365DataToClipboard(filteredNotes, exportOnlyNew);

    if (result.exported > 0) {
      // Mark as exported
      try {
        await markAsExported.mutateAsync(result.exportedIds);
        toast({
          title: '📋 Kopirano v odložišče!',
          description: `${result.exported} aktivnosti. Odpri svežo D365 predlogo, klikni A2, prilepi.` +
            (result.alreadyExported > 0 && exportOnlyNew ? ` (${result.alreadyExported} preskočenih)` : ''),
        });
      } catch {
        toast({
          description: `⚠️ Kopirano ${result.exported} aktivnosti, a napaka pri označevanju`,
          variant: 'destructive',
        });
      }
    }
  };

  // Ikona glede na tip aktivnosti
  const getActivityIcon = (content: string) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('sestanek')) return <Users size={14} className="text-blue-500" />;
    if (lowerContent.includes('klic') || lowerContent.includes('telefon')) return <Phone size={14} className="text-green-500" />;
    if (lowerContent.includes('email') || lowerContent.includes('mail')) return <Mail size={14} className="text-purple-500" />;
    if (lowerContent.includes('ponudba') || lowerContent.includes('ponudbo')) return <FileText size={14} className="text-orange-500" />;
    return <MessageSquare size={14} className="text-gray-400" />;
  };

  // Format datuma
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sl-SI', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Download ICS for a meeting activity
  const downloadActivityICS = (activity: NoteWithCompany) => {
    if (!activity.start_time || !activity.note_date) return;

    // Parse times
    const startMatch = activity.start_time.match(/T(\d{2}:\d{2})/);
    const endMatch = activity.end_time?.match(/T(\d{2}:\d{2})/);
    const startTime = startMatch ? startMatch[1] : '09:00';
    const endTime = endMatch ? endMatch[1] : '10:00';

    const startDate = new Date(`${activity.note_date}T${startTime}:00`);
    const endDate = new Date(`${activity.note_date}T${endTime}:00`);

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const companyName = activity.company?.display_name || activity.company?.name || 'Podjetje';
    const title = `Sestanek - ${companyName}`;
    const description = activity.content?.replace(/\n/g, '\\n').replace(/,/g, '\\,') || '';
    const uid = `activity-${activity.id}@matpro.ristov.xyz`;

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
      'SEQUENCE:0',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'X-MICROSOFT-CDO-BUSYSTATUS:BUSY',
      'X-MICROSOFT-CDO-IMPORTANCE:1',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const icsContent = lines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sestanek-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}-${activity.note_date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ description: '📅 ICS datoteka prenesena' });
  };

  // Opis filtra za prikaz
  const getFilterDescription = () => {
    const filter = DATE_FILTERS.find(f => f.value === dateFilter);
    if (dateFilter === 'all') return null;
    return filter?.label;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">📜 Zgodovina</h2>
        {activeTab === 'activities' && filteredNotes && filteredNotes.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleD365Copy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Kopiraj v odložišče za lepljenje v D365 predlogo"
            >
              <Copy size={16} />
              Kopiraj D365
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'activities'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📝 Aktivnosti
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'cycles'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔄 Cikli
        </button>
        <button
          onClick={() => setActiveTab('worklist')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors relative ${
            activeTab === 'worklist'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📋 Za vnos v CRM
          {worklistActivities && worklistActivities.length > 0 && activeTab !== 'worklist' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {worklistActivities.length}
            </span>
          )}
        </button>
      </div>

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div>
          {/* Monthly Statistics */}
          {monthlyStats.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-green-600" />
                  <span className="font-medium text-gray-800">Mesečna statistika (potrjene v CRM)</span>
                </div>
                <button
                  onClick={handleResetAllToWorklist}
                  disabled={resetAllToWorklist.isPending}
                  className="text-xs text-orange-600 hover:text-orange-700 hover:underline disabled:opacity-50"
                >
                  {resetAllToWorklist.isPending ? 'Ponastavljam...' : 'Ponastavi vse v worklist'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {monthlyStats.slice(0, 12).map((stat, idx) => (
                  <div
                    key={stat.month}
                    className={`p-3 rounded-lg text-center ${
                      idx === 0 ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${idx === 0 ? 'text-green-700' : 'text-gray-700'}`}>
                      {stat.count}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stat.monthLabel}</div>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp size={16} />
                  <span className="text-sm">Skupaj potrjenih aktivnosti:</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {allNotes?.length || 0}
                </span>
              </div>
            </div>
          )}

          {/* Date Filter */}
          <div className="bg-white rounded-lg shadow p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter po datumu:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setDateFilter(filter.value)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    dateFilter === filter.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter info */}
          {dateFilter !== 'all' && (
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg mb-3 text-sm flex items-center justify-between">
              <span>
                Prikazujem: <strong>{getFilterDescription()}</strong> ({filteredNotes?.length || 0} aktivnosti)
              </span>
              <button
                onClick={() => setDateFilter('all')}
                className="text-blue-500 hover:text-blue-700 text-xs underline"
              >
                Ponastavi
              </button>
            </div>
          )}

          {isLoadingNotes ? (
            <div className="bg-white p-4 rounded shadow text-center text-gray-500">
              Nalagam aktivnosti...
            </div>
          ) : !groupedActivities || groupedActivities.length === 0 ? (
            <div className="bg-white p-4 rounded shadow text-center text-gray-500">
              {dateFilter === 'all'
                ? 'Ni potrjenih aktivnosti. Aktivnosti se prikažejo tukaj ko jih označiš kot vnesene v CRM.'
                : 'Ni potrjenih aktivnosti za izbrano časovno obdobje.'}
            </div>
          ) : (
            <div className="space-y-3">
              {groupedActivities.map(group => {
                const isExpanded = expandedCompanies.has(group.companyId);
                const visibleActivities = isExpanded
                  ? group.activities
                  : group.activities.slice(0, 3);

                return (
                  <div key={group.companyId} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Company Header */}
                    <div
                      className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleCompanyExpanded(group.companyId)}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-blue-500" />
                        <span className="font-medium">{group.companyName}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {group.activities.length} aktivnosti
                        </span>
                      </div>
                      {group.activities.length > 3 && (
                        isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />
                      )}
                    </div>

                    {/* Activities List */}
                    <div className="divide-y divide-gray-100">
                      {visibleActivities.map(activity => {
                        // Extract time from start_time if available
                        const extractTime = (timestamp: string | null | undefined): string => {
                          if (!timestamp) return '';
                          const match = timestamp.match(/T(\d{2}:\d{2})/);
                          return match ? match[1] : '';
                        };
                        const startTime = extractTime(activity.start_time);
                        const endTime = extractTime(activity.end_time);

                        return (
                          <div key={activity.id} className="px-4 py-3 hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {getActivityIcon(activity.content)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {activity.content}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {formatDate(activity.note_date)}
                                  </span>
                                  <span>
                                    {startTime && endTime ? (
                                      `${startTime} - ${endTime}`
                                    ) : (
                                      formatTime(activity.created_at)
                                    )}
                                  </span>
                                  {/* V CRM badge */}
                                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                                    <Check size={10} />
                                    V CRM
                                  </span>
                                  {/* Download ICS button for meetings */}
                                  {activity.start_time && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadActivityICS(activity);
                                      }}
                                      className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                      title="Prenesi za Outlook"
                                    >
                                      <CalendarPlus size={10} />
                                      .ics
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Show more button */}
                    {!isExpanded && group.activities.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompanyExpanded(group.companyId);
                        }}
                        className="w-full py-2 text-sm text-blue-500 hover:bg-blue-50 border-t"
                      >
                        Prikaži še {group.activities.length - 3} aktivnosti
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <div>
          {/* Inventory Export Button */}
          {cycles && cycles.filter(c => c.status !== 'waiting_driver').length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-blue-600" />
                  <span className="font-medium text-gray-800">Inventura predpražnikov</span>
                  <span className="text-sm text-gray-500">({cycles.filter(c => c.status !== 'waiting_driver').length} aktivnih)</span>
                </div>
                <button
                  onClick={exportInventory}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download size={16} />
                  Izvozi inventuro
                </button>
              </div>
            </div>
          )}

          {!cycleHistory || cycleHistory.length === 0 ? (
            <div className="bg-white p-4 rounded shadow text-center text-gray-500">
              Ni zgodovine ciklov
            </div>
          ) : (
            cycleHistory.map(cycle => {
              const status = STATUSES[cycle.status as StatusKey];
              return (
                <div key={cycle.id} className="bg-white p-3 mb-2 rounded shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{cycle.mat_type?.code || cycle.mat_type?.name}</div>
                      <div className="text-sm text-gray-500 font-mono">{cycle.qr_code?.code}</div>
                      {cycle.company && <div className="text-sm text-gray-600">{cycle.company.name}</div>}
                    </div>
                    <div
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: status?.color + '20',
                        color: status?.color
                      }}
                    >
                      {status?.label}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(cycle.created_at).toLocaleString('sl-SI')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* D365 Worklist Tab */}
      {activeTab === 'worklist' && (
        <D365WorklistTab userId={user?.id} />
      )}
    </div>
  );
}

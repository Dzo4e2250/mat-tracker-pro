/**
 * @file HistoryView.tsx
 * @description Prikaz zgodovine ciklov in aktivnosti
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyNotes, groupActivitiesByCompany, exportActivitiesToExcel, exportToD365Excel, type NoteWithCompany } from '@/hooks/useCompanyNotes';
import type { CycleWithRelations } from '@/hooks/useCycles';
import { STATUSES, type StatusKey } from '../utils/constants';
import { Download, ChevronDown, ChevronUp, Calendar, Building2, MessageSquare, Phone, Mail, Users, FileText, Filter, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  D365_ACTIVITY_CATEGORIES,
  D365_SUBCATEGORIES,
  D365_APPOINTMENT_TYPES,
} from '@/pages/contacts/hooks/useCompanyNotes';

interface HistoryViewProps {
  cycleHistory: CycleWithRelations[] | undefined;
}

type TabType = 'activities' | 'cycles' | 'notInD365';
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

export default function HistoryView({ cycleHistory }: HistoryViewProps) {
  const { user } = useAuth();
  const { data: allNotes, isLoading: isLoadingNotes } = useCompanyNotes(user?.id);
  const [activeTab, setActiveTab] = useState<TabType>('activities');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  // Inline D365 editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editD365Category, setEditD365Category] = useState('');
  const [editD365Subcategory, setEditD365Subcategory] = useState('');
  const [editD365AppointmentType, setEditD365AppointmentType] = useState('face_to_face');
  const [editD365StartTime, setEditD365StartTime] = useState('09:00');
  const [editD365EndTime, setEditD365EndTime] = useState('09:30');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation to update note with D365 fields
  const updateNoteD365 = useMutation({
    mutationFn: async ({ noteId, noteDate, category, subcategory, appointmentType, startTime, endTime }: {
      noteId: string;
      noteDate: string;
      category: string;
      subcategory: string;
      appointmentType: string;
      startTime: string;
      endTime: string;
    }) => {
      // Combine date with time for proper timestamp format
      const combineDateTime = (date: string, time: string) => `${date}T${time}:00`;

      const { error } = await supabase
        .from('company_notes')
        .update({
          activity_category: category || null,
          activity_subcategory: subcategory || null,
          appointment_type: appointmentType || null,
          start_time: combineDateTime(noteDate, startTime),
          end_time: combineDateTime(noteDate, endTime),
        })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-company-notes'] });
      queryClient.invalidateQueries({ queryKey: ['companies-not-in-d365'] });
      toast({ description: 'D365 polja posodobljena' });
      setEditingNoteId(null);
    },
    onError: (error: any) => {
      toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
    },
  });

  const startEditingNote = (note: NoteWithCompany) => {
    setEditingNoteId(note.id);
    setEditD365Category(note.activity_category || '');
    setEditD365Subcategory(note.activity_subcategory || '');
    setEditD365AppointmentType(note.appointment_type || 'face_to_face');
    // Extract time from timestamp if exists
    const extractTime = (timestamp: string | null | undefined, def: string) => {
      if (!timestamp) return def;
      const match = timestamp.match(/T(\d{2}:\d{2})/);
      return match ? match[1] : def;
    };
    setEditD365StartTime(extractTime(note.start_time, '09:00'));
    setEditD365EndTime(extractTime(note.end_time, '09:30'));
  };

  const saveNoteD365 = (note: NoteWithCompany) => {
    if (!editD365Category || !editD365Subcategory) {
      toast({ description: 'Izpolni kategorijo in podkategorijo', variant: 'destructive' });
      return;
    }
    updateNoteD365.mutate({
      noteId: note.id,
      noteDate: note.note_date,
      category: editD365Category,
      subcategory: editD365Subcategory,
      appointmentType: editD365AppointmentType,
      startTime: editD365StartTime,
      endTime: editD365EndTime,
    });
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
  };

  // Query for companies not in D365 that have activities
  const { data: companiesNotInD365, isLoading: isLoadingD365 } = useQuery({
    queryKey: ['companies-not-in-d365', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get companies with notes from this user that don't have is_in_d365 = true
      const { data, error } = await supabase
        .from('company_notes')
        .select(`
          company_id,
          companies:company_id (
            id,
            name,
            display_name,
            is_in_d365
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by company and filter out those already in D365
      const companyMap = new Map<string, { id: string; name: string; display_name: string | null; noteCount: number }>();

      data?.forEach((note: any) => {
        if (note.companies && note.companies.is_in_d365 !== true) {
          const company = note.companies;
          const existing = companyMap.get(company.id);
          if (existing) {
            existing.noteCount++;
          } else {
            companyMap.set(company.id, {
              id: company.id,
              name: company.name,
              display_name: company.display_name,
              noteCount: 1,
            });
          }
        }
      });

      return Array.from(companyMap.values()).sort((a, b) => b.noteCount - a.noteCount);
    },
    enabled: !!user?.id,
  });

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
              onClick={handleD365Export}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download size={16} />
              D365
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
          onClick={() => setActiveTab('notInD365')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors relative ${
            activeTab === 'notInD365'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⚠️ Brez D365
          {companiesNotInD365 && companiesNotInD365.length > 0 && activeTab !== 'notInD365' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {companiesNotInD365.length}
            </span>
          )}
        </button>
      </div>

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <div>
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
                ? 'Ni aktivnosti. Aktivnosti se ustvarijo z dodajanjem opomb pri podjetjih.'
                : 'Ni aktivnosti za izbrano časovno obdobje.'}
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
                      {visibleActivities.map(activity => (
                        <div key={activity.id} className="px-4 py-3 hover:bg-gray-50">
                          {editingNoteId === activity.id ? (
                            /* Inline D365 Edit Form */
                            <div className="space-y-3">
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{activity.content}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">Kategorija *</label>
                                  <select
                                    value={editD365Category}
                                    onChange={(e) => setEditD365Category(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  >
                                    <option value="">-- Izberi --</option>
                                    {D365_ACTIVITY_CATEGORIES.map(cat => (
                                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">Podkategorija *</label>
                                  <select
                                    value={editD365Subcategory}
                                    onChange={(e) => setEditD365Subcategory(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  >
                                    <option value="">-- Izberi --</option>
                                    {D365_SUBCATEGORIES.map(sub => (
                                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">Tip</label>
                                  <select
                                    value={editD365AppointmentType}
                                    onChange={(e) => setEditD365AppointmentType(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  >
                                    {D365_APPOINTMENT_TYPES.map(type => (
                                      <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">Od</label>
                                  <input
                                    type="time"
                                    value={editD365StartTime}
                                    onChange={(e) => setEditD365StartTime(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">Do</label>
                                  <input
                                    type="time"
                                    value={editD365EndTime}
                                    onChange={(e) => setEditD365EndTime(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={cancelEditing}
                                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                  <X size={14} className="inline mr-1" />
                                  Prekliči
                                </button>
                                <button
                                  onClick={() => saveNoteD365(activity)}
                                  disabled={updateNoteD365.isPending}
                                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                  <Check size={14} className="inline mr-1" />
                                  Shrani
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Normal Activity View */
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
                                    {formatTime(activity.created_at)}
                                  </span>
                                  {/* D365 Status Badge */}
                                  {activity.activity_category ? (
                                    activity.exported_to_d365_at ? (
                                      /* Already exported - show as completed but allow editing */
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingNote(activity);
                                        }}
                                        className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs hover:bg-blue-200 flex items-center gap-1"
                                        title={`Izvoženo: ${new Date(activity.exported_to_d365_at).toLocaleDateString('sl-SI')}`}
                                      >
                                        <Check size={10} />
                                        V CRM
                                      </button>
                                    ) : (
                                      /* Has D365 fields but not yet exported - allow editing */
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingNote(activity);
                                        }}
                                        className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs hover:bg-green-200 flex items-center gap-1"
                                      >
                                        <Pencil size={10} />
                                        D365 ✓
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingNote(activity);
                                      }}
                                      className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs hover:bg-orange-200 flex items-center gap-1"
                                    >
                                      <Pencil size={10} />
                                      Dodaj D365
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
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

      {/* Not in D365 Tab */}
      {activeTab === 'notInD365' && (
        <div>
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Podjetja brez oznake D365</p>
                <p className="text-sm mt-1">
                  Ta podjetja imajo aktivnosti, ampak še niso označena kot vnešena v D365 CRM.
                  Dodaj jih v D365 in nato označi v aplikaciji.
                </p>
              </div>
            </div>
          </div>

          {isLoadingD365 ? (
            <div className="bg-white p-4 rounded shadow text-center text-gray-500">
              Nalagam podjetja...
            </div>
          ) : !companiesNotInD365 || companiesNotInD365.length === 0 ? (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-center">
              ✅ Vsa podjetja z aktivnostmi so že označena kot vnešena v D365!
            </div>
          ) : (
            <div className="space-y-2">
              {companiesNotInD365.map(company => (
                <div key={company.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 size={20} className="text-orange-500" />
                      <div>
                        <p className="font-medium">{company.display_name || company.name}</p>
                        {company.display_name && company.display_name !== company.name && (
                          <p className="text-xs text-gray-500">{company.name}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      {company.noteCount} aktivnosti
                    </span>
                  </div>
                </div>
              ))}

              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mt-4">
                <p className="font-medium mb-1">💡 Navodilo:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Odpri podjetje v D365 CRM in ga ustvari, če še ne obstaja</li>
                  <li>V aplikaciji odpri kartico podjetja (v Stranke)</li>
                  <li>Označi "Je v D365 CRM" checkbox</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

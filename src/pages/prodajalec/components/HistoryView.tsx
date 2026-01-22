/**
 * @file HistoryView.tsx
 * @description Prikaz zgodovine ciklov in aktivnosti
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyNotes, groupActivitiesByCompany, exportActivitiesToExcel, type NoteWithCompany } from '@/hooks/useCompanyNotes';
import type { CycleWithRelations } from '@/hooks/useCycles';
import { STATUSES, type StatusKey } from '../utils/constants';
import { Download, ChevronDown, ChevronUp, Calendar, Building2, MessageSquare, Phone, Mail, Users, FileText, Filter } from 'lucide-react';

interface HistoryViewProps {
  cycleHistory: CycleWithRelations[] | undefined;
}

type TabType = 'activities' | 'cycles';
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
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download size={16} />
            Export Excel
          </button>
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
                              </div>
                            </div>
                          </div>
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
    </div>
  );
}

/**
 * @file D365WorklistTab.tsx
 * @description Delovna lista za ročni vnos aktivnosti v CRM (D365)
 * Prikazuje aktivnosti ki še niso vnesene v CRM, grupirane po podjetju
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  useD365Worklist,
  groupWorklistByCompany,
  type WorklistActivity,
  type GroupedWorklistActivities,
} from '@/hooks/useCompanyNotes';
import {
  Building2,
  Calendar,
  Clock,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Smartphone,
  CalendarPlus,
} from 'lucide-react';

interface D365WorklistTabProps {
  userId?: string;
}

// Komponenta za hitro kopiranje polja
function QuickCopyField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!value) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2">
        <span className="text-xs text-gray-400">{label}:</span>
        <span className="text-xs text-gray-300">-</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded group">
      <span className="text-xs text-gray-500">{label}:</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800 max-w-[180px] truncate">
          {value}
        </span>
        <button
          onClick={handleCopy}
          className={`p-1 rounded transition-colors ${
            copied
              ? 'text-green-500 bg-green-50'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
          }`}
          title="Kopiraj"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// Kartica za eno aktivnost
function WorklistActivityCard({
  activity,
  onMarkAsEntered,
  onDelete,
  isMarkingId,
  isDeletingId,
}: {
  activity: WorklistActivity;
  onMarkAsEntered: (id: string) => void;
  onDelete: (id: string) => void;
  isMarkingId: string | null;
  isDeletingId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  // Get primary contact or first contact
  const contacts = activity.company?.contacts || [];
  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

  // Format time
  const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '';
    const match = timestamp.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '';
  };

  const startTime = formatTime(activity.start_time) || '09:00';
  const endTime = formatTime(activity.end_time) || '09:30';

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Calculate how old this activity is
  const getDaysWaiting = (): number => {
    const noteDate = new Date(activity.note_date);
    const today = new Date();
    const diffTime = today.getTime() - noteDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysWaiting = getDaysWaiting();

  const handleDelete = () => {
    if (window.confirm('Ali res želiš izbrisati to opombo? Ta akcija je nepovratna.')) {
      onDelete(activity.id);
    }
  };

  // Download ICS for Outlook
  const downloadICS = () => {
    const startDate = new Date(`${activity.note_date}T${startTime}:00`);
    const endDate = new Date(`${activity.note_date}T${endTime}:00`);

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const companyName = activity.company?.display_name || activity.company?.name || 'Podjetje';
    const fullCompanyName = activity.company?.name || companyName;
    const taxNumber = activity.company?.tax_number || '';
    const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : '';
    const contactPhone = primaryContact?.phone || primaryContact?.work_phone || '';
    const contactEmail = primaryContact?.email || '';
    const location = [
      activity.company?.address_street,
      activity.company?.address_postal,
      activity.company?.address_city,
    ].filter(Boolean).join(', ');

    const title = `Sestanek - ${companyName}`;

    // Build detailed description
    const descParts: string[] = [];
    descParts.push(`PODJETJE: ${fullCompanyName}`);
    if (taxNumber) descParts.push(`Davčna: ${taxNumber}`);
    if (contactName.trim()) descParts.push(`Kontakt: ${contactName}`);
    if (contactPhone) descParts.push(`Tel: ${contactPhone}`);
    if (contactEmail) descParts.push(`Email: ${contactEmail}`);
    if (location) descParts.push(`Naslov: ${location}`);
    if (activity.content) descParts.push(`---`);
    if (activity.content) descParts.push(activity.content);
    const description = descParts.join('\\n').replace(/,/g, '\\,');

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
      location ? `LOCATION:${location.replace(/,/g, '\\,')}` : '',
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
    ].filter(Boolean);

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

    toast({ description: '📅 ICS datoteka prenesena za Outlook' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header z datumom in checkbox */}
      <div
        className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-blue-500" />
          <span className="font-medium text-gray-800">
            {formatDate(activity.note_date)}
          </span>
          <div className="flex items-center gap-1 text-gray-500">
            <Clock size={14} />
            <span className="text-sm">
              {startTime} - {endTime}
            </span>
          </div>
          {daysWaiting > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                daysWaiting > 7
                  ? 'bg-red-100 text-red-700'
                  : daysWaiting > 3
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {daysWaiting} {daysWaiting === 1 ? 'dan' : daysWaiting === 2 ? 'dneva' : daysWaiting < 5 ? 'dni' : 'dni'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Vsebina */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* PODJETJE */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={14} className="text-blue-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Podjetje
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              <QuickCopyField
                label="Davčna št"
                value={activity.company?.tax_number}
              />
              <QuickCopyField
                label="Ime podjetja"
                value={activity.company?.display_name || activity.company?.name}
              />
            </div>
          </div>

          {/* KONTAKT */}
          {primaryContact && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-green-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Kontakt
                </span>
                {primaryContact.is_primary && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    Primarni
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                <QuickCopyField label="Priimek" value={primaryContact.last_name} />
                <QuickCopyField label="Ime" value={primaryContact.first_name} />
                <QuickCopyField
                  label="Telefon"
                  value={primaryContact.phone || primaryContact.work_phone}
                />
                <QuickCopyField label="Email" value={primaryContact.email} />
              </div>
            </div>
          )}

          {/* NASLOV */}
          {(activity.company?.address_street ||
            activity.company?.address_postal ||
            activity.company?.address_city) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-orange-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Naslov
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                <QuickCopyField
                  label="Ulica"
                  value={activity.company?.address_street}
                />
                <QuickCopyField
                  label="Pošta"
                  value={activity.company?.address_postal}
                />
                <QuickCopyField
                  label="Kraj"
                  value={activity.company?.address_city}
                />
              </div>
            </div>
          )}

          {/* VSEBINA AKTIVNOSTI */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-purple-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Vsebina aktivnosti
              </span>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {activity.content}
              </p>
            </div>
          </div>

          {/* Gumbi */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={downloadICS}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Prenesi ICS za Outlook"
            >
              <CalendarPlus size={16} />
              .ics
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeletingId === activity.id}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              Izbriši
            </button>
            <button
              onClick={() => onMarkAsEntered(activity.id)}
              disabled={isMarkingId === activity.id}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isMarkingId === activity.id ? (
                <>
                  <span className="animate-spin">...</span>
                  Označujem...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Označeno kot vneseno
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Skupina aktivnosti za eno podjetje
function CompanyWorklistGroup({
  group,
  onMarkAsEntered,
  onDelete,
  isMarkingId,
  isDeletingId,
}: {
  group: GroupedWorklistActivities;
  onMarkAsEntered: (id: string) => void;
  onDelete: (id: string) => void;
  isMarkingId: string | null;
  isDeletingId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      {/* Podjetje header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-800">{group.companyName}</h3>
            {group.company.tax_number && (
              <p className="text-xs text-gray-500">
                Davčna: {group.company.tax_number}
              </p>
            )}
          </div>
          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
            {group.activities.length}{' '}
            {group.activities.length === 1
              ? 'aktivnost'
              : group.activities.length === 2
              ? 'aktivnosti'
              : group.activities.length < 5
              ? 'aktivnosti'
              : 'aktivnosti'}
          </span>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {/* Aktivnosti */}
      {expanded && (
        <div className="space-y-3 pl-4">
          {group.activities.map((activity) => (
            <WorklistActivityCard
              key={activity.id}
              activity={activity}
              onMarkAsEntered={onMarkAsEntered}
              onDelete={onDelete}
              isMarkingId={isMarkingId}
              isDeletingId={isDeletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function D365WorklistTab({ userId }: D365WorklistTabProps) {
  const { data: worklistActivities, isLoading } = useD365Worklist(userId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mutation za označitev kot vneseno v CRM
  const markAsEnteredMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('company_notes')
        .update({ exported_to_d365_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
    },
    onMutate: (noteId) => {
      setMarkingId(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['d365-worklist'] });
      queryClient.invalidateQueries({ queryKey: ['all-company-notes'] });
      toast({ description: '✓ Označeno kot vneseno v CRM' });
    },
    onError: (error: Error) => {
      toast({
        description: `Napaka: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setMarkingId(null);
    },
  });

  // Mutation za brisanje opombe
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('company_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onMutate: (noteId) => {
      setDeletingId(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['d365-worklist'] });
      queryClient.invalidateQueries({ queryKey: ['all-company-notes'] });
      toast({ description: '🗑️ Opomba izbrisana' });
    },
    onError: (error: Error) => {
      toast({
        description: `Napaka pri brisanju: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  // Group activities by company
  const groupedActivities = worklistActivities
    ? groupWorklistByCompany(worklistActivities)
    : [];

  const totalActivities = worklistActivities?.length || 0;

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded shadow text-center text-gray-500">
        Nalagam aktivnosti za vnos...
      </div>
    );
  }

  if (totalActivities === 0) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg text-center">
        <Check size={32} className="mx-auto mb-2 text-green-500" />
        <p className="font-medium">Vse aktivnosti so vnesene v CRM!</p>
        <p className="text-sm mt-1">
          Ni čakajočih aktivnosti za vnos.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Info box with popup button */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Delovna lista za vnos v CRM</p>
              <p className="text-sm mt-1">
                Te aktivnosti še niso označene kot vnesene v D365 CRM.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              // iPhone 14 Pro dimensions: 393 x 852
              const width = 420;
              const height = 850;
              const left = window.screen.width - width - 20;
              const top = Math.max(0, (window.screen.height - height) / 2);
              window.open(
                '/worklist-popup',
                'worklist-popup',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
              );
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700"
            title="Odpri v ločenem oknu (iPhone stil)"
          >
            <Smartphone size={16} />
            iPhone okno
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
          <span className="text-2xl font-bold text-blue-600">{totalActivities}</span>
          <span className="text-sm text-gray-500 ml-2">
            {totalActivities === 1
              ? 'aktivnost'
              : totalActivities === 2
              ? 'aktivnosti'
              : totalActivities < 5
              ? 'aktivnosti'
              : 'aktivnosti'}{' '}
            za vnos
          </span>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
          <span className="text-2xl font-bold text-purple-600">
            {groupedActivities.length}
          </span>
          <span className="text-sm text-gray-500 ml-2">
            {groupedActivities.length === 1
              ? 'podjetje'
              : groupedActivities.length < 5
              ? 'podjetja'
              : 'podjetij'}
          </span>
        </div>
      </div>

      {/* Grupirane aktivnosti */}
      <div className="space-y-6">
        {groupedActivities.map((group) => (
          <CompanyWorklistGroup
            key={group.companyId}
            group={group}
            onMarkAsEntered={(id) => markAsEnteredMutation.mutate(id)}
            onDelete={(id) => deleteNoteMutation.mutate(id)}
            isMarkingId={markingId}
            isDeletingId={deletingId}
          />
        ))}
      </div>
    </div>
  );
}

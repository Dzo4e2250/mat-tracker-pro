/**
 * @file useCompanyNotes.ts
 * @description Hook za upravljanje opomb (CRM dnevnik) za stranke
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyNote } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

interface UseCompanyNotesProps {
  selectedCompanyId: string | null;
  userId: string | undefined;
}

// D365 Activity Categories
export const D365_ACTIVITY_CATEGORIES = [
  { value: 'first_visit', label: 'First Visit to Prospect' },
  { value: 'second_visit', label: 'Second/Further visit to Prospect' },
  { value: 'sales_visit', label: 'Sales visit to customer' },
] as const;

export const D365_SUBCATEGORIES = [
  { value: 'needs_analysis', label: 'Needs analysis' },
  { value: 'offer_negotiation', label: 'Offer/Contract negotiation' },
  { value: 'service_presentation', label: 'Service/Product presentation' },
] as const;

export const D365_APPOINTMENT_TYPES = [
  { value: 'face_to_face', label: 'Face to Face' },
  { value: 'virtual', label: 'Virtual Meeting' },
] as const;

export type D365ActivityCategory = typeof D365_ACTIVITY_CATEGORIES[number]['value'];
export type D365Subcategory = typeof D365_SUBCATEGORIES[number]['value'];
export type D365AppointmentType = typeof D365_APPOINTMENT_TYPES[number]['value'];

interface AddNoteParams {
  companyId: string;
  noteDate: string;
  content: string;
  activityCategory?: string | null;
  activitySubcategory?: string | null;
  appointmentType?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

/**
 * Combines a date string (YYYY-MM-DD) with a time string (HH:MM) to create a full ISO timestamp
 * Returns null if time is not provided
 */
function combineDateTime(dateStr: string, timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  // dateStr is in format YYYY-MM-DD, timeStr is in format HH:MM
  return `${dateStr}T${timeStr}:00`;
}

interface UseCompanyNotesReturn {
  // Notes data
  companyNotes: CompanyNote[] | undefined;
  isLoadingNotes: boolean;

  // Today's tasks
  todayTasks: {
    meetings: any[];
    deadlines: any[];
  } | undefined;

  // Mutations
  addNoteMutation: ReturnType<typeof useMutation<CompanyNote, Error, AddNoteParams>>;
  deleteNoteMutation: ReturnType<typeof useMutation<void, Error, string>>;
  editNoteMutation: ReturnType<typeof useMutation<void, Error, { noteId: string; content: string; noteDate: string; activityCategory?: string | null; activitySubcategory?: string | null; appointmentType?: string | null; startTime?: string | null; endTime?: string | null }>>;
}

export function useCompanyNotes({
  selectedCompanyId,
  userId,
}: UseCompanyNotesProps): UseCompanyNotesReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Opombe za izbrano stranko
  const { data: companyNotes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['company-notes', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('company_notes')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CompanyNote[];
    },
    enabled: !!selectedCompanyId,
  });

  // "Danes" sekcija - sestanki in roki za danes
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayTasks } = useQuery({
    queryKey: ['today-tasks', todayStr, userId],
    queryFn: async () => {
      if (!userId) return { meetings: [], deadlines: [] };

      const { data, error } = await supabase
        .from('company_notes')
        .select('*, companies:company_id(id, name, display_name)')
        .eq('created_by', userId)
        .or(`content.ilike.%sestanek%,content.ilike.%ponudbo do%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const meetings: any[] = [];
      const deadlines: any[] = [];

      data?.forEach((note: any) => {
        const content = note.content.toLowerCase();

        // Preskoči opravljene naloge (označene z ✓ OPRAVLJENO)
        if (content.startsWith('✓') || content.includes('opravljeno:')) {
          return;
        }

        const dateMatch = note.content.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
        if (dateMatch) {
          const [_, day, month, year] = dateMatch;
          const noteDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          noteDate.setHours(0, 0, 0, 0);

          const isToday = noteDate.getTime() === today.getTime();
          const isPast = noteDate.getTime() < today.getTime();
          const isSoon = noteDate.getTime() <= today.getTime() + 2 * 24 * 60 * 60 * 1000;

          if (content.includes('sestanek') && (isToday || (isPast && noteDate.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000))) {
            meetings.push({ ...note, noteDate, isToday, isPast });
          }

          if (content.includes('ponudbo do') && (isToday || isPast || isSoon)) {
            deadlines.push({ ...note, noteDate, isToday, isPast, isSoon });
          }
        }
      });

      meetings.sort((a, b) => a.noteDate.getTime() - b.noteDate.getTime());
      deadlines.sort((a, b) => a.noteDate.getTime() - b.noteDate.getTime());

      return { meetings, deadlines };
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ companyId, noteDate, content, activityCategory, activitySubcategory, appointmentType, startTime, endTime }: AddNoteParams) => {
      const { data, error } = await supabase
        .from('company_notes')
        .insert({
          company_id: companyId,
          note_date: noteDate,
          content,
          created_by: userId,
          activity_category: activityCategory || null,
          activity_subcategory: activitySubcategory || null,
          appointment_type: appointmentType || null,
          start_time: combineDateTime(noteDate, startTime),
          end_time: combineDateTime(noteDate, endTime),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-notes', selectedCompanyId] });
      if (variables.content.toLowerCase().includes('ni interesa')) {
        queryClient.invalidateQueries({ queryKey: ['no-interest-companies'] });
      }
      toast({ description: 'Opomba dodana' });
    },
    onError: (error: any) => {
      // Error handled by toast
      toast({ description: `Napaka pri dodajanju opombe: ${error.message}`, variant: 'destructive' });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('company_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-notes', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['no-interest-companies'] });
      toast({ description: 'Opomba izbrisana' });
    },
  });

  // Edit note mutation
  const editNoteMutation = useMutation({
    mutationFn: async ({ noteId, content, noteDate, activityCategory, activitySubcategory, appointmentType, startTime, endTime }: {
      noteId: string;
      content: string;
      noteDate: string;
      activityCategory?: string | null;
      activitySubcategory?: string | null;
      appointmentType?: string | null;
      startTime?: string | null;
      endTime?: string | null;
    }) => {
      const { error } = await supabase
        .from('company_notes')
        .update({
          content,
          note_date: noteDate,
          activity_category: activityCategory,
          activity_subcategory: activitySubcategory,
          appointment_type: appointmentType,
          start_time: combineDateTime(noteDate, startTime),
          end_time: combineDateTime(noteDate, endTime),
        })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-notes', selectedCompanyId] });
      if (variables.content.toLowerCase().includes('ni interesa')) {
        queryClient.invalidateQueries({ queryKey: ['no-interest-companies'] });
      }
      toast({ description: 'Opomba posodobljena' });
    },
    onError: (error: any) => {
      // Error handled by toast
      toast({ description: `Napaka pri urejanju opombe: ${error.message}`, variant: 'destructive' });
    },
  });

  // Update deadline date in note (for TodaySection quick actions)
  const updateNoteDeadline = useMutation({
    mutationFn: async ({ noteId, content, newDate }: { noteId: string; content: string; newDate: Date }) => {
      // Replace the date in content (format: dd. mm. yyyy)
      const day = newDate.getDate();
      const month = newDate.getMonth() + 1;
      const year = newDate.getFullYear();
      const newDateStr = `${day}. ${month}. ${year}`;

      // Replace existing date pattern with new date
      const newContent = content.replace(
        /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/,
        newDateStr
      );

      const { error } = await supabase
        .from('company_notes')
        .update({ content: newContent })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['company-notes'] });
      toast({ description: 'Datum posodobljen' });
    },
    onError: (error: any) => {
      // Error handled by toast
      toast({ description: `Napaka pri posodabljanju: ${error.message}`, variant: 'destructive' });
    },
  });

  // Mark deadline as done (add ✓ prefix to note)
  const markDeadlineDone = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      // Add "✓ OPRAVLJENO: " prefix to mark as done
      const newContent = `✓ OPRAVLJENO: ${content}`;

      const { error } = await supabase
        .from('company_notes')
        .update({ content: newContent })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['company-notes'] });
      toast({ description: 'Označeno kot opravljeno' });
    },
    onError: (error: any) => {
      // Error handled by toast
      toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
    },
  });

  return {
    companyNotes,
    isLoadingNotes,
    todayTasks,
    addNoteMutation,
    deleteNoteMutation,
    editNoteMutation,
    updateNoteDeadline,
    markDeadlineDone,
  };
}

export default useCompanyNotes;

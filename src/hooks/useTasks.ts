/**
 * @file useTasks.ts
 * @description React Query hooks za upravljanje z nalogami (tasks)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Task, TaskInsert, TaskUpdate, TaskStatus, Company } from '@/integrations/supabase/types';

// Extended task type with relations
export type TaskWithRelations = Task & {
  company?: Company | null;
};

/**
 * Fetch vseh aktivnih taskov za uporabnika
 */
export function useTasks(userId?: string) {
  return useQuery({
    queryKey: ['tasks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          company:companies(id, name, display_name, address_street, address_postal, address_city)
        `)
        .eq('salesperson_id', userId!)
        .is('archived_at', null)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as TaskWithRelations[];
    },
    enabled: !!userId,
  });
}

/**
 * Ustvari nov task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      // Pridobi najvišjo pozicijo za status
      const { data: maxPositionData } = await supabase
        .from('tasks')
        .select('position')
        .eq('salesperson_id', task.salesperson_id)
        .eq('status', task.status || 'todo')
        .is('archived_at', null)
        .order('position', { ascending: false })
        .limit(1);

      const maxPosition = maxPositionData?.[0]?.position ?? -1;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          position: maxPosition + 1,
        })
        .select(`
          *,
          company:companies(id, name, display_name, address_street, address_postal, address_city)
        `)
        .single();

      if (error) throw error;
      return data as TaskWithRelations;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.salesperson_id] });
    },
  });
}

/**
 * Posodobi status taska (premik med stolpci)
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
      newPosition,
      userId,
    }: {
      taskId: string;
      newStatus: TaskStatus;
      newPosition: number;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          position: newPosition,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.userId] });
    },
  });
}

/**
 * Batch update pozicij (za drag & drop reordering)
 */
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updates,
      userId,
    }: {
      updates: Array<{ id: string; position: number; status: TaskStatus }>;
      userId: string;
    }) => {
      // Posodobi vse taske v enem batchu
      const promises = updates.map(({ id, position, status }) =>
        supabase
          .from('tasks')
          .update({ position, status })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.userId] });
    },
  });
}

/**
 * Posodobi task (naslov, opis, itd.)
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
      userId,
    }: {
      taskId: string;
      updates: TaskUpdate;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          company:companies(id, name)
        `)
        .single();

      if (error) throw error;
      return data as TaskWithRelations;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.userId] });
    },
  });
}

/**
 * Arhiviraj task (soft delete)
 */
export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.userId] });
    },
  });
}

/**
 * Izbriši task (hard delete)
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.userId] });
    },
  });
}

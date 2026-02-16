/**
 * @file TasksView.tsx
 * @description Glavni pogled za Kanban tablo z nalogami
 */

import { useState, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, Loader2 } from 'lucide-react';
import { KanbanColumn, CreateTaskModal, TaskDetailModal } from './tasks';
import {
  useTasks,
  useCreateTask,
  useReorderTasks,
  useArchiveTask,
  useDeleteTask,
  useUpdateTask,
  TaskWithRelations,
} from '@/hooks/useTasks';
import { useCompanyContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import type { TaskStatus } from '@/integrations/supabase/types';

interface TasksViewProps {
  userId?: string;
}

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'Za narediti' },
  { status: 'in_progress', title: 'V procesiranju' },
  { status: 'done', title: 'Opravljeno' },
  { status: 'needs_help', title: 'Potrebujem pomoč' },
];

export function TasksView({ userId }: TasksViewProps) {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);

  // Data hooks
  const { data: tasks, isLoading } = useTasks(userId);
  // Lazy load companies - only when modal is open
  const { data: companies, isLoading: loadingCompanies } = useCompanyContacts(
    showCreateModal ? userId : undefined
  );

  // Mutation hooks
  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();
  const archiveTask = useArchiveTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithRelations[]> = {
      todo: [],
      in_progress: [],
      done: [],
      needs_help: [],
    };

    if (tasks) {
      tasks.forEach((task) => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });

      // Sort by position within each column
      Object.keys(grouped).forEach((status) => {
        grouped[status as TaskStatus].sort((a, b) => a.position - b.position);
      });
    }

    return grouped;
  }, [tasks]);

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    // Create copies of affected columns
    const sourceItems = [...tasksByStatus[sourceStatus]];
    const destItems =
      sourceStatus === destStatus ? sourceItems : [...tasksByStatus[destStatus]];

    // Remove from source
    const [movedTask] = sourceItems.splice(source.index, 1);

    // Add to destination
    if (sourceStatus === destStatus) {
      sourceItems.splice(destination.index, 0, movedTask);
    } else {
      destItems.splice(destination.index, 0, movedTask);
    }

    // Build updates array
    const updates: Array<{ id: string; position: number; status: TaskStatus }> = [];

    // Update source column positions
    sourceItems.forEach((task, index) => {
      updates.push({
        id: task.id,
        position: index,
        status: sourceStatus,
      });
    });

    // If moved to different column, update destination positions too
    if (sourceStatus !== destStatus) {
      destItems.forEach((task, index) => {
        // Skip if already in updates (moved task)
        if (task.id === draggableId) {
          updates.push({
            id: task.id,
            position: index,
            status: destStatus,
          });
        } else {
          updates.push({
            id: task.id,
            position: index,
            status: destStatus,
          });
        }
      });
    }

    try {
      await reorderTasks.mutateAsync({
        updates,
        userId: userId!,
      });
    } catch {
      toast({
        description: 'Napaka pri premikanju naloge',
        variant: 'destructive',
      });
    }
  };

  // Handle create task
  const handleCreate = async (data: {
    title: string;
    description: string;
    companyId?: string;
  }) => {
    if (!userId) return;

    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description || null,
        company_id: data.companyId || null,
        salesperson_id: userId,
        status: 'todo',
      });
      setShowCreateModal(false);
      toast({ description: 'Naloga ustvarjena' });
    } catch {
      toast({
        description: 'Napaka pri ustvarjanju naloge',
        variant: 'destructive',
      });
    }
  };

  // Handle archive
  const handleArchive = async (taskId: string) => {
    if (!userId) return;

    try {
      await archiveTask.mutateAsync({ taskId, userId });
      toast({ description: 'Naloga arhivirana' });
    } catch {
      toast({
        description: 'Napaka pri arhiviranju',
        variant: 'destructive',
      });
    }
  };

  // Handle delete
  const handleDelete = async (taskId: string) => {
    if (!userId) return;

    try {
      await deleteTask.mutateAsync({ taskId, userId });
      toast({ description: 'Naloga izbrisana' });
      setSelectedTask(null);
    } catch {
      toast({
        description: 'Napaka pri brisanju',
        variant: 'destructive',
      });
    }
  };

  // Handle task click - open detail modal
  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTask(task);
  };

  // Handle task update from detail modal
  const handleTaskUpdate = async (
    taskId: string,
    updates: { title?: string; description?: string; attachments?: string[]; deliveryInfo?: any }
  ) => {
    if (!userId) return;

    try {
      // Build checklist_items - merge attachments and deliveryInfo
      let checklistItems: any = undefined;

      if (updates.deliveryInfo) {
        // For delivery_info tasks, store the full deliveryInfo object
        checklistItems = {
          ...updates.deliveryInfo,
          attachments: updates.attachments || updates.deliveryInfo.attachments || [],
        };
      } else if (updates.attachments) {
        // For regular tasks, just store attachments
        checklistItems = { attachments: updates.attachments };
      }

      await updateTask.mutateAsync({
        taskId,
        updates: {
          title: updates.title,
          description: updates.description,
          checklist_items: checklistItems,
        },
        userId,
      });
      // Update selected task locally
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          title: updates.title || selectedTask.title,
          description: updates.description ?? selectedTask.description,
          checklist_items: checklistItems || selectedTask.checklist_items,
        });
      }
      // Don't show toast for every auto-save (only for explicit saves)
      if (updates.title || updates.description) {
        toast({ description: 'Naloga posodobljena' });
      }
    } catch {
      toast({
        description: 'Napaka pri posodabljanju',
        variant: 'destructive',
      });
    }
  };

  // Handle status change from detail modal
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!userId) return;

    try {
      await updateTask.mutateAsync({
        taskId,
        updates: { status: newStatus },
        userId,
      });
      // Update selected task locally
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          status: newStatus,
        });
      }
      toast({ description: 'Status posodobljen' });
    } catch {
      toast({
        description: 'Napaka pri posodabljanju statusa',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Moje naloge</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Nova naloga</span>
        </button>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(({ status, title }) => (
            <KanbanColumn
              key={status}
              status={status}
              title={title}
              tasks={tasksByStatus[status]}
              color=""
              onArchive={handleArchive}
              onDelete={handleDelete}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Create modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        companies={companies}
        loadingCompanies={loadingCompanies}
        isPending={createTask.isPending}
      />

      {/* Detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          isUpdating={updateTask.isPending}
        />
      )}
    </div>
  );
}

export default TasksView;

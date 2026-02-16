/**
 * @file KanbanColumn.tsx
 * @description Stolpec v Kanban tabli z Droppable wrappom
 */

import { Droppable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import type { TaskWithRelations } from '@/hooks/useTasks';
import type { TaskStatus } from '@/integrations/supabase/types';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: TaskWithRelations[];
  color: string;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onTaskClick: (task: TaskWithRelations) => void;
}

const columnColors: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 border-gray-300',
  in_progress: 'bg-blue-50 border-blue-300',
  done: 'bg-green-50 border-green-300',
  needs_help: 'bg-orange-50 border-orange-300',
};

const headerColors: Record<TaskStatus, string> = {
  todo: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-200 text-blue-700',
  done: 'bg-green-200 text-green-700',
  needs_help: 'bg-orange-200 text-orange-700',
};

export function KanbanColumn({
  status,
  title,
  tasks,
  onArchive,
  onDelete,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <div className={`flex flex-col rounded-lg border-2 ${columnColors[status]} min-h-[500px]`}>
      {/* Header */}
      <div className={`px-3 py-2 rounded-t-md ${headerColors[status]}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-medium">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-100/50' : ''
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                Brez nalog
              </div>
            )}
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onArchive={onArchive}
                onDelete={onDelete}
                onClick={onTaskClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default KanbanColumn;

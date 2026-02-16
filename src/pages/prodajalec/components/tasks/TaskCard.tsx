/**
 * @file TaskCard.tsx
 * @description Kartica za prikaz naloge v Kanban tabli
 */

import { Draggable } from '@hello-pangea/dnd';
import { Building2, Calendar, Archive, Trash2, GripVertical, Clock } from 'lucide-react';
import type { TaskWithRelations } from '@/hooks/useTasks';
import { format, differenceInHours, differenceInDays, addDays } from 'date-fns';
import { sl } from 'date-fns/locale';

interface TaskCardProps {
  task: TaskWithRelations;
  index: number;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onClick: (task: TaskWithRelations) => void;
}

export function TaskCard({ task, index, onArchive, onDelete, onClick }: TaskCardProps) {
  const createdDate = format(new Date(task.created_at), 'd. MMM', { locale: sl });

  // Calculate 3-day deadline countdown
  const deadline = addDays(new Date(task.created_at), 3);
  const now = new Date();
  const hoursLeft = differenceInHours(deadline, now);
  const daysLeft = differenceInDays(deadline, now);
  const isOverdue = hoursLeft < 0;
  const isUrgent = hoursLeft >= 0 && hoursLeft < 24; // Less than 24h left

  // Format countdown text
  const getCountdownText = () => {
    if (task.status === 'done') return null; // Don't show for completed tasks
    if (isOverdue) {
      const overdueDays = Math.abs(daysLeft);
      const overdueHours = Math.abs(hoursLeft) % 24;
      if (overdueDays > 0) return `+${overdueDays}d zamude`;
      return `+${overdueHours}h zamude`;
    }
    if (daysLeft > 0) return `${daysLeft}d ${hoursLeft % 24}h`;
    return `${hoursLeft}h`;
  };

  const countdownText = getCountdownText();

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => onClick(task)}
          className={`bg-white rounded-lg shadow-sm border p-3 mb-2 cursor-pointer ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300' : 'hover:shadow-md'
          } transition-shadow`}
        >
          {/* Header z grip in akcijami */}
          <div className="flex items-start justify-between mb-2">
            <div
              {...provided.dragHandleProps}
              className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mr-2 mt-0.5"
            >
              <GripVertical size={16} />
            </div>
            <h4 className="flex-1 font-medium text-gray-900 text-sm leading-tight">
              {task.title}
            </h4>
            <div className="flex items-center gap-1 ml-2">
              {task.status === 'done' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(task.id);
                  }}
                  className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                  title="Arhiviraj"
                >
                  <Archive size={14} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Izbriši"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Opis */}
          {task.description && (
            <p className="text-gray-600 text-xs mb-2 line-clamp-2">{task.description}</p>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-gray-500">
              {task.company && (
                <div className="flex items-center gap-1">
                  <Building2 size={12} />
                  <span className="truncate max-w-[100px]">{task.company.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{createdDate}</span>
              </div>
            </div>
            {/* 3-day countdown */}
            {countdownText && (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                isOverdue
                  ? 'bg-red-100 text-red-600'
                  : isUrgent
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-blue-100 text-blue-600'
              }`}>
                <Clock size={11} />
                <span>{countdownText}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default TaskCard;

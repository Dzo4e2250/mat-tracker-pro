/**
 * @file TodaySection.tsx
 * @description Sekcija "Danes & Prihajajoče" - prikazuje današnje sestanke in roke
 */

import { useState } from 'react';
import { Calendar, ChevronRight, Check, CalendarPlus } from 'lucide-react';

// Tip za sestanek ali rok
interface TaskItem {
  id: string;
  company_id: string;
  content: string;
  isToday?: boolean;
  isPast?: boolean;
  isSoon?: boolean;
  companies?: {
    display_name?: string;
    name?: string;
  };
}

// Tip za todayTasks objekt
interface TodayTasks {
  meetings?: TaskItem[];
  deadlines?: TaskItem[];
}

interface TodaySectionProps {
  todayTasks: TodayTasks | undefined;
  onCompanyClick: (companyId: string) => void;
  onMarkDone?: (noteId: string, content: string) => void;
  onPostpone?: (noteId: string, content: string, newDate: Date) => void;
}

/**
 * Prikazuje današnje sestanke in roke za ponudbe
 * Barve:
 * - Modra: današnji sestanki
 * - Rdeča: zamujeni roki
 * - Oranžna: današnji roki
 * - Siva: prihajajoči (v 2 dneh)
 */
export default function TodaySection({ todayTasks, onCompanyClick, onMarkDone, onPostpone }: TodaySectionProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Ne prikaži če ni podatkov
  const hasMeetings = (todayTasks?.meetings?.length || 0) > 0;
  const hasDeadlines = (todayTasks?.deadlines?.length || 0) > 0;

  if (!hasMeetings && !hasDeadlines) {
    return null;
  }

  // Helper za prestavitev datuma
  const handlePostpone = (task: TaskItem, days: number) => {
    if (!onPostpone) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    onPostpone(task.id, task.content, newDate);
    setExpandedTaskId(null);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-amber-50 rounded-xl p-4 border border-blue-200">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Calendar size={18} className="text-blue-500" />
        Danes & Prihajajoče
      </h3>

      <div className="space-y-2">
        {/* Today's meetings - modra */}
        {todayTasks?.meetings?.filter((m) => m.isToday).map((meeting) => (
          <div
            key={meeting.id}
            className="bg-blue-100 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div
                onClick={() => onCompanyClick(meeting.company_id)}
                className="flex-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-blue-600 uppercase">Danes sestanek</span>
                <p className="font-medium text-blue-900">
                  {meeting.companies?.display_name || meeting.companies?.name}
                </p>
                <p className="text-sm text-blue-700">{meeting.content}</p>
              </div>
              <div className="flex gap-1.5 ml-2">
                {onPostpone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(expandedTaskId === meeting.id ? null : meeting.id);
                    }}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      expandedTaskId === meeting.id
                        ? 'bg-blue-300 text-blue-700'
                        : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Prestavi datum"
                  >
                    <CalendarPlus size={16} />
                  </button>
                )}
                {onMarkDone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone(meeting.id, meeting.content);
                    }}
                    className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    title="Označi kot opravljeno"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => onCompanyClick(meeting.company_id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Odpri
                </button>
              </div>
            </div>

            {/* Razširjen meni za prestavitev */}
            {expandedTaskId === meeting.id && onPostpone && (
              <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap gap-2">
                <span className="text-xs text-blue-600 w-full mb-1">Prestavi na:</span>
                <button
                  onClick={() => handlePostpone(meeting, 1)}
                  className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs hover:bg-blue-100"
                >
                  Jutri
                </button>
                <button
                  onClick={() => handlePostpone(meeting, 2)}
                  className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs hover:bg-blue-100"
                >
                  Čez 2 dni
                </button>
                <button
                  onClick={() => handlePostpone(meeting, 7)}
                  className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs hover:bg-blue-100"
                >
                  Čez teden
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Overdue deadlines (past) - rdeča */}
        {todayTasks?.deadlines?.filter((d) => d.isPast && !d.isToday).map((deadline) => (
          <div
            key={deadline.id}
            className="bg-red-100 rounded-lg p-3 border-l-4 border-red-500"
          >
            <div className="flex items-center justify-between">
              <div
                onClick={() => onCompanyClick(deadline.company_id)}
                className="flex-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-red-600 uppercase">Zamuja!</span>
                <p className="font-medium text-red-900">
                  {deadline.companies?.display_name || deadline.companies?.name}
                </p>
                <p className="text-sm text-red-700">{deadline.content}</p>
              </div>
              <div className="flex gap-1.5 ml-2">
                {onPostpone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(expandedTaskId === deadline.id ? null : deadline.id);
                    }}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      expandedTaskId === deadline.id
                        ? 'bg-red-300 text-red-700'
                        : 'bg-white border border-red-300 text-red-600 hover:bg-red-200'
                    }`}
                    title="Prestavi datum"
                  >
                    <CalendarPlus size={16} />
                  </button>
                )}
                {onMarkDone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone(deadline.id, deadline.content);
                    }}
                    className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    title="Označi kot opravljeno"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => onCompanyClick(deadline.company_id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Odpri
                </button>
              </div>
            </div>

            {/* Razširjen meni za prestavitev */}
            {expandedTaskId === deadline.id && onPostpone && (
              <div className="mt-3 pt-3 border-t border-red-200 flex flex-wrap gap-2">
                <span className="text-xs text-red-600 w-full mb-1">Prestavi na:</span>
                <button
                  onClick={() => handlePostpone(deadline, 0)}
                  className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
                >
                  Danes
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 1)}
                  className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
                >
                  Jutri
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 2)}
                  className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
                >
                  Čez 2 dni
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 7)}
                  className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
                >
                  Čez teden
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Today's deadlines - oranžna */}
        {todayTasks?.deadlines?.filter((d) => d.isToday).map((deadline) => (
          <div
            key={deadline.id}
            className="bg-amber-100 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div
                onClick={() => onCompanyClick(deadline.company_id)}
                className="flex-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-amber-600 uppercase">Danes rok</span>
                <p className="font-medium text-amber-900">
                  {deadline.companies?.display_name || deadline.companies?.name}
                </p>
                <p className="text-sm text-amber-700">{deadline.content}</p>
              </div>
              <div className="flex gap-1.5 ml-2">
                {onPostpone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(expandedTaskId === deadline.id ? null : deadline.id);
                    }}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      expandedTaskId === deadline.id
                        ? 'bg-amber-300 text-amber-700'
                        : 'bg-white border border-amber-300 text-amber-600 hover:bg-amber-200'
                    }`}
                    title="Prestavi datum"
                  >
                    <CalendarPlus size={16} />
                  </button>
                )}
                {onMarkDone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone(deadline.id, deadline.content);
                    }}
                    className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    title="Označi kot opravljeno"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => onCompanyClick(deadline.company_id)}
                  className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  Odpri
                </button>
              </div>
            </div>

            {/* Razširjen meni za prestavitev */}
            {expandedTaskId === deadline.id && onPostpone && (
              <div className="mt-3 pt-3 border-t border-amber-200 flex flex-wrap gap-2">
                <span className="text-xs text-amber-600 w-full mb-1">Prestavi na:</span>
                <button
                  onClick={() => handlePostpone(deadline, 1)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs hover:bg-amber-100"
                >
                  Jutri
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 2)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs hover:bg-amber-100"
                >
                  Čez 2 dni
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 7)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs hover:bg-amber-100"
                >
                  Čez teden
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Upcoming deadlines (within 2 days) - siva */}
        {todayTasks?.deadlines?.filter((d) => d.isSoon && !d.isToday && !d.isPast).map((deadline) => (
          <div
            key={deadline.id}
            className="bg-gray-100 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div
                onClick={() => onCompanyClick(deadline.company_id)}
                className="flex-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-gray-500 uppercase">Kmalu</span>
                <p className="font-medium text-gray-900">
                  {deadline.companies?.display_name || deadline.companies?.name}
                </p>
                <p className="text-sm text-gray-600">{deadline.content}</p>
              </div>
              <div className="flex gap-1.5 ml-2">
                {onPostpone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(expandedTaskId === deadline.id ? null : deadline.id);
                    }}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      expandedTaskId === deadline.id
                        ? 'bg-gray-300 text-gray-700'
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Prestavi datum"
                  >
                    <CalendarPlus size={16} />
                  </button>
                )}
                {onMarkDone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone(deadline.id, deadline.content);
                    }}
                    className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    title="Označi kot opravljeno"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => onCompanyClick(deadline.company_id)}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
                >
                  Odpri
                </button>
              </div>
            </div>

            {/* Razširjen meni za prestavitev */}
            {expandedTaskId === deadline.id && onPostpone && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                <span className="text-xs text-gray-600 w-full mb-1">Prestavi na:</span>
                <button
                  onClick={() => handlePostpone(deadline, 3)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                >
                  Čez 3 dni
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 7)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                >
                  Čez teden
                </button>
                <button
                  onClick={() => handlePostpone(deadline, 14)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-100"
                >
                  Čez 2 tedna
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Upcoming meetings - svetlo modra */}
        {todayTasks?.meetings?.filter((m) => !m.isToday && !m.isPast).map((meeting) => (
          <div
            key={meeting.id}
            className="bg-blue-50 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div
                onClick={() => onCompanyClick(meeting.company_id)}
                className="flex-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-blue-500 uppercase">Prihajajoč sestanek</span>
                <p className="font-medium text-blue-800">
                  {meeting.companies?.display_name || meeting.companies?.name}
                </p>
                <p className="text-sm text-blue-600">{meeting.content}</p>
              </div>
              <div className="flex gap-1.5 ml-2">
                {onPostpone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskId(expandedTaskId === meeting.id ? null : meeting.id);
                    }}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      expandedTaskId === meeting.id
                        ? 'bg-blue-200 text-blue-700'
                        : 'bg-white border border-blue-200 text-blue-500 hover:bg-blue-100'
                    }`}
                    title="Prestavi datum"
                  >
                    <CalendarPlus size={16} />
                  </button>
                )}
                {onMarkDone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone(meeting.id, meeting.content);
                    }}
                    className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    title="Označi kot opravljeno"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => onCompanyClick(meeting.company_id)}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                >
                  Odpri
                </button>
              </div>
            </div>

            {/* Razširjen meni za prestavitev */}
            {expandedTaskId === meeting.id && onPostpone && (
              <div className="mt-3 pt-3 border-t border-blue-100 flex flex-wrap gap-2">
                <span className="text-xs text-blue-500 w-full mb-1">Prestavi na:</span>
                <button
                  onClick={() => handlePostpone(meeting, 1)}
                  className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs hover:bg-blue-50"
                >
                  Jutri
                </button>
                <button
                  onClick={() => handlePostpone(meeting, 3)}
                  className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs hover:bg-blue-50"
                >
                  Čez 3 dni
                </button>
                <button
                  onClick={() => handlePostpone(meeting, 7)}
                  className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs hover:bg-blue-50"
                >
                  Čez teden
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

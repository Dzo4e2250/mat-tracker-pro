/**
 * @file TodaySection.tsx
 * @description Sekcija "Danes & Prihajajoče" - prikazuje današnje sestanke in roke
 */

import { Calendar, ChevronRight } from 'lucide-react';

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
}

/**
 * Prikazuje današnje sestanke in roke za ponudbe
 * Barve:
 * - Modra: današnji sestanki
 * - Rdeča: zamujeni roki
 * - Oranžna: današnji roki
 * - Siva: prihajajoči (v 2 dneh)
 */
export default function TodaySection({ todayTasks, onCompanyClick }: TodaySectionProps) {
  // Ne prikaži če ni podatkov
  const hasMeetings = (todayTasks?.meetings?.length || 0) > 0;
  const hasDeadlines = (todayTasks?.deadlines?.length || 0) > 0;

  if (!hasMeetings && !hasDeadlines) {
    return null;
  }

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
            onClick={() => onCompanyClick(meeting.company_id)}
            className="bg-blue-100 rounded-lg p-3 cursor-pointer hover:bg-blue-200 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Danes sestanek</span>
                <p className="font-medium text-blue-900">
                  {meeting.companies?.display_name || meeting.companies?.name}
                </p>
                <p className="text-sm text-blue-700">{meeting.content}</p>
              </div>
              <ChevronRight size={20} className="text-blue-400" />
            </div>
          </div>
        ))}

        {/* Overdue deadlines (past) - rdeča */}
        {todayTasks?.deadlines?.filter((d) => d.isPast && !d.isToday).map((deadline) => (
          <div
            key={deadline.id}
            onClick={() => onCompanyClick(deadline.company_id)}
            className="bg-red-100 rounded-lg p-3 cursor-pointer hover:bg-red-200 transition-colors border-l-4 border-red-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-600 uppercase">Zamuja!</span>
                <p className="font-medium text-red-900">
                  {deadline.companies?.display_name || deadline.companies?.name}
                </p>
                <p className="text-sm text-red-700">{deadline.content}</p>
              </div>
              <ChevronRight size={20} className="text-red-400" />
            </div>
          </div>
        ))}

        {/* Today's deadlines - oranžna */}
        {todayTasks?.deadlines?.filter((d) => d.isToday).map((deadline) => (
          <div
            key={deadline.id}
            onClick={() => onCompanyClick(deadline.company_id)}
            className="bg-amber-100 rounded-lg p-3 cursor-pointer hover:bg-amber-200 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase">Danes rok</span>
                <p className="font-medium text-amber-900">
                  {deadline.companies?.display_name || deadline.companies?.name}
                </p>
                <p className="text-sm text-amber-700">{deadline.content}</p>
              </div>
              <ChevronRight size={20} className="text-amber-400" />
            </div>
          </div>
        ))}

        {/* Upcoming deadlines (within 2 days) - siva */}
        {todayTasks?.deadlines?.filter((d) => d.isSoon && !d.isToday && !d.isPast).map((deadline) => (
          <div
            key={deadline.id}
            onClick={() => onCompanyClick(deadline.company_id)}
            className="bg-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Kmalu</span>
                <p className="font-medium text-gray-900">
                  {deadline.companies?.display_name || deadline.companies?.name}
                </p>
                <p className="text-sm text-gray-600">{deadline.content}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </div>
        ))}

        {/* Upcoming meetings - svetlo modra */}
        {todayTasks?.meetings?.filter((m) => !m.isToday && !m.isPast).map((meeting) => (
          <div
            key={meeting.id}
            onClick={() => onCompanyClick(meeting.company_id)}
            className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-500 uppercase">Prihajajoč sestanek</span>
                <p className="font-medium text-blue-800">
                  {meeting.companies?.display_name || meeting.companies?.name}
                </p>
                <p className="text-sm text-blue-600">{meeting.content}</p>
              </div>
              <ChevronRight size={20} className="text-blue-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

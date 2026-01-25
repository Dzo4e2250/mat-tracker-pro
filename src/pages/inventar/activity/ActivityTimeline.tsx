import { Users, FileText, Mail, RefreshCw, Building } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { sl } from 'date-fns/locale';
import type { ActivityEvent } from '@/hooks/useActivityTracking';

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

const typeConfig = {
  contact: {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  note: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  offer: {
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
  status_change: {
    icon: RefreshCw,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  company: {
    icon: Building,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
  },
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Ni aktivnosti za izbrano obdobje
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const config = typeConfig[event.type];
        const Icon = config.icon;
        const timestamp = new Date(event.timestamp);

        return (
          <div
            key={event.id}
            className={`flex gap-4 p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white ${config.borderColor} border`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {event.description}
              </p>
              {event.companyName && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {event.companyName}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(timestamp, { addSuffix: true, locale: sl })}
                {' \u2022 '}
                {format(timestamp, 'd. MMM yyyy, HH:mm', { locale: sl })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

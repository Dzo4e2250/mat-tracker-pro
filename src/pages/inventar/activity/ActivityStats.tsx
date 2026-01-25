import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, FileText, Mail, RefreshCw, Building, Car } from 'lucide-react';
import type { ActivityStats as ActivityStatsType } from '@/hooks/useActivityTracking';

interface ActivityStatsProps {
  stats: ActivityStatsType | undefined;
  isLoading: boolean;
}

export function ActivityStats({ stats, isLoading }: ActivityStatsProps) {
  const items = [
    {
      title: 'Kontakti ustvarjeni',
      value: stats?.totalContacts ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Opombe dodane',
      value: stats?.totalNotes ?? 0,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Ponudbe poslane',
      value: stats?.totalOffersSent ?? 0,
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Spremembe statusa',
      value: stats?.totalStatusChanges ?? 0,
      icon: RefreshCw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Podjetja ustvarjena',
      value: stats?.totalCompanies ?? 0,
      icon: Building,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Prevoženi km',
      value: stats?.totalKmTraveled ?? 0,
      icon: Car,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      suffix: ' km',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <Card key={item.title} className={item.bgColor}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.value}{item.suffix || ''}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

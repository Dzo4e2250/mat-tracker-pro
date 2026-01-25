import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, FileText, Mail, RefreshCw, Building, Car } from 'lucide-react';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { useSalespersonActivities, useActivityStats, type DateRange, type SalespersonSummary } from '@/hooks/useActivityTracking';
import { ActivityTimeline } from './ActivityTimeline';

interface SalespersonDetailDialogProps {
  salesperson: SalespersonSummary | null;
  dateRange: DateRange;
  onClose: () => void;
}

type TabValue = 'all' | 'contact' | 'note' | 'offer' | 'status_change' | 'company';

export function SalespersonDetailDialog({
  salesperson,
  dateRange,
  onClose,
}: SalespersonDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  const { data: activities, isLoading: loadingActivities } = useSalespersonActivities(
    salesperson?.id || '',
    dateRange,
    activeTab === 'all' ? undefined : activeTab
  );

  const { data: stats, isLoading: loadingStats } = useActivityStats(
    dateRange,
    salesperson?.id
  );

  const isOpen = !!salesperson;

  const miniStats = [
    { label: 'Kontakti', value: stats?.totalContacts ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Opombe', value: stats?.totalNotes ?? 0, icon: FileText, color: 'text-green-600' },
    { label: 'Ponudbe', value: stats?.totalOffersSent ?? 0, icon: Mail, color: 'text-purple-600' },
    { label: 'Statusi', value: stats?.totalStatusChanges ?? 0, icon: RefreshCw, color: 'text-orange-600' },
    { label: 'Podjetja', value: stats?.totalCompanies ?? 0, icon: Building, color: 'text-teal-600' },
    { label: 'Km', value: stats?.totalKmTraveled ?? 0, icon: Car, color: 'text-gray-600' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{salesperson?.name}</span>
            {salesperson?.codePrefix && (
              <Badge variant="outline" className="font-mono">
                {salesperson.codePrefix}
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(dateRange.from, 'd. MMM yyyy', { locale: sl })} - {format(dateRange.to, 'd. MMM yyyy', { locale: sl })}
          </p>
        </DialogHeader>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 py-3 border-y">
          {miniStats.map((stat) => (
            <div key={stat.label} className="text-center">
              {loadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <stat.icon className={`h-3 w-3 ${stat.color}`} />
                    <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">Vse</TabsTrigger>
            <TabsTrigger value="contact">Kontakti</TabsTrigger>
            <TabsTrigger value="note">Opombe</TabsTrigger>
            <TabsTrigger value="offer">Ponudbe</TabsTrigger>
            <TabsTrigger value="status_change">Statusi</TabsTrigger>
            <TabsTrigger value="company">Podjetja</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-auto mt-4">
            {loadingActivities ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ActivityTimeline events={activities || []} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

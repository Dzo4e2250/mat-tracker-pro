import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  useActivityStats,
  useSalespersonSummaries,
  useDailyActivityTrends,
  type DateRange,
  type SalespersonSummary,
} from '@/hooks/useActivityTracking';
import {
  ActivityStats,
  ActivityFilters,
  ActivityLineChart,
  SalespersonBarChart,
  SalespersonTable,
  SalespersonDetailDialog,
} from './activity';

export default function ActivityTracking() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState<SalespersonSummary | null>(null);

  // Default to current month
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });

  // Fetch data
  const { data: stats, isLoading: loadingStats } = useActivityStats(dateRange);
  const { data: summaries, isLoading: loadingSummaries } = useSalespersonSummaries(dateRange);
  const { data: dailyTrends, isLoading: loadingTrends } = useDailyActivityTrends(dateRange);

  // Export to Excel
  const handleExport = async () => {
    if (!summaries || summaries.length === 0) {
      toast({
        title: 'Ni podatkov',
        description: 'Ni podatkov za izvoz.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const data = summaries.map((s) => ({
        'Ime': s.name,
        'Koda': s.codePrefix || '-',
        'Kontakti': s.contacts,
        'Opombe': s.notes,
        'Ponudbe': s.offers,
        'Spremembe statusa': s.statusChanges,
        'Podjetja': s.companies,
        'Km': s.km,
        'Zadnja aktivnost': s.lastActivity
          ? new Date(s.lastActivity).toLocaleString('sl-SI')
          : '-',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aktivnost prodajalcev');

      const fromStr = dateRange.from.toISOString().split('T')[0];
      const toStr = dateRange.to.toISOString().split('T')[0];
      XLSX.writeFile(wb, `Aktivnost_prodajalcev_${fromStr}_${toStr}.xlsx`);

      toast({
        title: 'Izvoženo',
        description: 'Excel datoteka je bila prenesena.',
      });
    } catch (error) {
      toast({
        title: 'Napaka',
        description: 'Napaka pri izvozu podatkov.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRowClick = (salesperson: SalespersonSummary) => {
    setSelectedSalesperson(salesperson);
  };

  const handleCloseDialog = () => {
    setSelectedSalesperson(null);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 flex flex-col">
          <div className="p-6 flex-1 flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Aktivnost Prodajalcev</h1>

            {/* Filters */}
            <ActivityFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onExport={handleExport}
              isExporting={isExporting}
            />

            {/* KPI Stats */}
            <ActivityStats stats={stats} isLoading={loadingStats} />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityLineChart data={dailyTrends} isLoading={loadingTrends} />
              <SalespersonBarChart data={summaries} isLoading={loadingSummaries} />
            </div>

            {/* Salesperson Table */}
            <SalespersonTable
              data={summaries}
              isLoading={loadingSummaries}
              onRowClick={handleRowClick}
            />
          </div>
        </main>
      </div>

      {/* Detail Dialog */}
      <SalespersonDetailDialog
        salesperson={selectedSalesperson}
        dateRange={dateRange}
        onClose={handleCloseDialog}
      />
    </SidebarProvider>
  );
}

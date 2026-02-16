import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InventarSidebar } from '@/components/InventarSidebar';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfDay, format } from 'date-fns';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
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

  // Export to D365 format
  const handleExportD365 = async () => {
    setIsExporting(true);
    try {
      const { fromStr, toStr } = {
        fromStr: dateRange.from.toISOString(),
        toStr: endOfDay(dateRange.to).toISOString(),
      };

      // Fetch notes with company data - only those with D365 category
      const { data: notes, error } = await supabase
        .from('company_notes')
        .select(`
          id,
          note_date,
          content,
          activity_category,
          activity_subcategory,
          appointment_type,
          start_time,
          end_time,
          created_at,
          company:companies(
            id,
            name,
            display_name,
            customer_number,
            address_street,
            address_city,
            pipeline_status
          )
        `)
        .gte('created_at', fromStr)
        .lte('created_at', toStr)
        .not('activity_category', 'is', null)
        .order('note_date', { ascending: true });

      if (error) throw error;

      if (!notes || notes.length === 0) {
        toast({
          title: 'Ni podatkov',
          description: 'Ni D365 aktivnosti za izbrano obdobje.',
          variant: 'destructive',
        });
        setIsExporting(false);
        return;
      }

      // D365 Category mapping
      const categoryMap: Record<string, string> = {
        'first_visit_prospect': 'First visit to Prospect',
        'second_visit_prospect': 'Second/Further visit to Prospect',
        'visit_customer': 'Sales visit to customer',
        'call': 'Phone Call',
        'email': 'Email',
        'meeting': 'Meeting',
        'offer': 'Offer sent',
      };

      // D365 Sub-category mapping
      const subcategoryMap: Record<string, string> = {
        'needs_analysis': 'Needs analysis',
        'presentation': 'Presentation',
        'negotiation': 'Negotiation',
        'closing': 'Closing',
        'follow_up': 'Follow-up',
        'service': 'Service',
      };

      // Map pipeline_status to Detailed Category
      const detailedCategoryMap: Record<string, string> = {
        'new_lead': 'P1',
        'contacted': 'P2',
        'meeting_scheduled': 'P2',
        'offer_sent': 'P3',
        'negotiation': 'P3',
        'won': 'C1',
        'customer': 'C1',
        'lost': 'P1',
      };

      // Build D365 data rows
      const d365Data = notes.map((note) => {
        const company = note.company as any;
        const companyName = company?.display_name || company?.name || '';
        const customerNumber = company?.customer_number || '';
        const location = company?.address_street && company?.address_city
          ? `${company.address_street}, ${company.address_city}`
          : '';
        const pipelineStatus = company?.pipeline_status || 'new_lead';

        // Parse start/end times
        let startTime = null;
        let endTime = null;

        if (note.start_time) {
          // If start_time is already a full timestamp, use it
          if (note.start_time.includes('T')) {
            startTime = new Date(note.start_time);
          } else {
            // Combine note_date with start_time (HH:MM format)
            startTime = new Date(`${note.note_date}T${note.start_time}:00`);
          }
        } else {
          // Fallback to note_date at 09:00
          startTime = new Date(`${note.note_date}T09:00:00`);
        }

        if (note.end_time) {
          if (note.end_time.includes('T')) {
            endTime = new Date(note.end_time);
          } else {
            endTime = new Date(`${note.note_date}T${note.end_time}:00`);
          }
        } else {
          // Default 30 min after start
          endTime = new Date(startTime.getTime() + 30 * 60000);
        }

        // Format description as HTML
        const description = `<div class="ck-content" data-wrapper="true" dir="ltr" style="--ck-image-style-spacing: 1.5em; --ck-inline-image-style-spacing: calc(var(--ck-image-style-spacing) / 2); font-family: Segoe UI; font-size: 11pt;"><p style="margin: 0;">${note.content.replace(/\n/g, '</p><p style="margin: 0;">')}</p></div>`;

        return {
          '(Do Not Modify) Appointment': '',
          '(Do Not Modify) Row Checksum': '',
          '(Do Not Modify) Modified On': '',
          'Subject': '',
          'Regarding': companyName,
          'Account Number (Regarding) (Account)': customerNumber,
          'Start Time': startTime,
          'End Time': endTime,
          'Sends Email Invitation - Required Attendees': '',
          'Location': location,
          'Status': 'Completed',
          'Category': categoryMap[note.activity_category || ''] || note.activity_category || '',
          'Sub-Category': subcategoryMap[note.activity_subcategory || ''] || note.activity_subcategory || '',
          'Description': description,
          'Account Hierarchy (Regarding) (Account)': 'COMPANY',
          'Detailed Category (Regarding) (Account)': detailedCategoryMap[pipelineStatus] || 'P1',
        };
      });

      // Create workbook with Appointment sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(d365Data);
      XLSX.utils.book_append_sheet(wb, ws, 'Appointment');

      // Create hiddenSheet with metadata (required by D365)
      const hiddenData = [
        ['appointment:LCnCIE2wQIYUgSEEuUjQkE/PFHN8h5aXaANyc0do8m9co2gMIL2WYvOiv1b+DzFCyIA6bvyVbGo5jQw1Rx5jkQ==:activityid=%28Do%20Not%20Modify%29%20Appointment&checksumLogicalName=%28Do%20Not%20Modify%29%20Row%20Checksum&modifiedon=%28Do%20Not%20Modify%29%20Modified%20On&subject=Subject&regardingobjectid=Regarding&cc6a87f3-f915-415a-a6ef-a5d1d34b4d71.accountnumber=Account%20Number%20%28Regarding%29%20%28Account%29&scheduledstart=Start%20Time&scheduledend=End%20Time&requiredattendees=Sends%20Email%20Invitation%20-%20Required%20Attendees&location=Location&statecode=Status&cf_category_new=Category&cf_subcategorynew=Sub-Category&description=Description&cc6a87f3-f915-415a-a6ef-a5d1d34b4d71.new_accounthierarchy=Account%20Hierarchy%20%28Regarding%29%20%28Account%29&cc6a87f3-f915-415a-a6ef-a5d1d34b4d71.new_detailedcategory=Detailed%20Category%20%28Regarding%29%20%28Account%29'],
        ['Open', 'Completed', 'Canceled', 'Scheduled'],
        ['GROUP', 'COMPANY GROUPING', 'COMPANY', 'SITE GROUPING', 'SITE', 'DELIVERY CUSTOMER'],
      ];
      const hiddenWs = XLSX.utils.aoa_to_sheet(hiddenData);
      XLSX.utils.book_append_sheet(wb, hiddenWs, 'hiddenSheet');

      // Download
      const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(dateRange.to, 'yyyy-MM-dd');
      XLSX.writeFile(wb, `D365_Appointment_${fromDateStr}_${toDateStr}.xlsx`);

      toast({
        title: 'Izvoženo za D365',
        description: `${notes.length} aktivnosti izvoženih v D365 formatu.`,
      });
    } catch (error) {
      console.error('D365 export error:', error);
      toast({
        title: 'Napaka',
        description: 'Napaka pri izvozu za D365.',
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
              onExportD365={handleExportD365}
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

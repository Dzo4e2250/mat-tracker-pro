import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';
import type { DailyActivity, SalespersonSummary } from '@/hooks/useActivityTracking';

interface ActivityLineChartProps {
  data: DailyActivity[] | undefined;
  isLoading: boolean;
}

interface SalespersonBarChartProps {
  data: SalespersonSummary[] | undefined;
  isLoading: boolean;
}

export function ActivityLineChart({ data, isLoading }: ActivityLineChartProps) {
  // Format dates for display
  const chartData = data?.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'd. MMM', { locale: sl }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivnost skozi čas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="dateLabel"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis fontSize={12} />
              <Tooltip
                labelFormatter={(label) => `Datum: ${label}`}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    contacts: 'Kontakti',
                    notes: 'Opombe',
                    offers: 'Ponudbe',
                    statusChanges: 'Spremembe',
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    contacts: 'Kontakti',
                    notes: 'Opombe',
                    offers: 'Ponudbe',
                    statusChanges: 'Spremembe',
                  };
                  return labels[value] || value;
                }}
              />
              <Line
                type="monotone"
                dataKey="contacts"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="notes"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="offers"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="statusChanges"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Ni podatkov za izbrano obdobje
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SalespersonBarChart({ data, isLoading }: SalespersonBarChartProps) {
  // Calculate total activity for each salesperson and take top 10
  const chartData = data
    ?.map((s) => ({
      name: s.codePrefix || s.name.split(' ').map((n) => n[0]).join(''),
      fullName: s.name,
      kontakti: s.contacts,
      opombe: s.notes,
      ponudbe: s.offers,
      spremembe: s.statusChanges,
      total: s.contacts + s.notes + s.offers + s.statusChanges,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Primerjava prodajalcev</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                width={50}
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Legend />
              <Bar dataKey="kontakti" stackId="a" fill="#3B82F6" name="Kontakti" />
              <Bar dataKey="opombe" stackId="a" fill="#22C55E" name="Opombe" />
              <Bar dataKey="ponudbe" stackId="a" fill="#8B5CF6" name="Ponudbe" />
              <Bar dataKey="spremembe" stackId="a" fill="#F59E0B" name="Spremembe" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Ni podatkov za izbrano obdobje
          </div>
        )}
      </CardContent>
    </Card>
  );
}

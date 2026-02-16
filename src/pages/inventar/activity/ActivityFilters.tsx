import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, FileDown } from 'lucide-react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns';
import { sl } from 'date-fns/locale';
import type { DateRange } from '@/hooks/useActivityTracking';

interface ActivityFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
  onExportD365?: () => void;
  isExporting?: boolean;
}

type PresetKey = 'today' | 'thisWeek' | 'thisMonth' | 'last30Days';

const presets: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Danes' },
  { key: 'thisWeek', label: 'Ta teden' },
  { key: 'thisMonth', label: 'Ta mesec' },
  { key: 'last30Days', label: 'Zadnjih 30 dni' },
];

function getPresetRange(preset: PresetKey): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'thisWeek':
      return { from: startOfWeek(now, { locale: sl }), to: endOfWeek(now, { locale: sl }) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last30Days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

function getActivePreset(dateRange: DateRange): PresetKey | null {
  for (const preset of presets) {
    const presetRange = getPresetRange(preset.key);
    if (
      format(dateRange.from, 'yyyy-MM-dd') === format(presetRange.from, 'yyyy-MM-dd') &&
      format(dateRange.to, 'yyyy-MM-dd') === format(presetRange.to, 'yyyy-MM-dd')
    ) {
      return preset.key;
    }
  }
  return null;
}

export function ActivityFilters({
  dateRange,
  onDateRangeChange,
  onExport,
  onExportD365,
  isExporting,
}: ActivityFiltersProps) {
  const activePreset = getActivePreset(dateRange);

  const handlePresetClick = (preset: PresetKey) => {
    onDateRangeChange(getPresetRange(preset));
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value ? new Date(e.target.value) : dateRange.from;
    onDateRangeChange({ ...dateRange, from: startOfDay(newFrom) });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value ? new Date(e.target.value) : dateRange.to;
    onDateRangeChange({ ...dateRange, to: endOfDay(newTo) });
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                variant={activePreset === preset.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(preset.key)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Custom date range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Od:</span>
            <Input
              type="date"
              value={format(dateRange.from, 'yyyy-MM-dd')}
              onChange={handleFromChange}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Do:</span>
            <Input
              type="date"
              value={format(dateRange.to, 'yyyy-MM-dd')}
              onChange={handleToChange}
              className="w-36"
            />
          </div>

          <div className="flex-1" />

          {/* Export buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Izvozi Excel
            </Button>
            {onExportD365 && (
              <Button
                variant="default"
                size="sm"
                onClick={onExportD365}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Izvozi za D365
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

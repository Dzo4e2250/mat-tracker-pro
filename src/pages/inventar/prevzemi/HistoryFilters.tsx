/**
 * @file HistoryFilters.tsx
 * @description Filtri za zgodovino prevzemov
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, FileDown } from 'lucide-react';

interface HistoryFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
  filteredCount: number;
  onExport: () => void;
}

export function HistoryFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  filteredCount,
  onExport,
}: HistoryFiltersProps) {
  return (
    <Card className="mb-4">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Od:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Do:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="w-40"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Počisti filter
            </Button>
          )}
          <div className="flex-1" />
          <Badge variant="secondary">{filteredCount} prevzemov</Badge>
          <Button variant="outline" size="sm" onClick={onExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Izvozi Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

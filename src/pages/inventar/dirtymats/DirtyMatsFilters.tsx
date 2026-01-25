/**
 * @file DirtyMatsFilters.tsx
 * @description Filtri in akcije za umazane predpražnike
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Plus, ExternalLink } from 'lucide-react';

type StatusFilter = 'all' | 'dirty' | 'waiting_driver';

interface Seller {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface DirtyMatsFiltersProps {
  selectedSeller: string;
  onSellerChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  selectedCount: number;
  totalCount: number;
  sellers?: Seller[];
  mapsUrl: string | null;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onCreatePickup: () => void;
}

export function DirtyMatsFilters({
  selectedSeller,
  onSellerChange,
  statusFilter,
  onStatusFilterChange,
  selectedCount,
  totalCount,
  sellers,
  mapsUrl,
  onClearSelection,
  onSelectAll,
  onCreatePickup,
}: DirtyMatsFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filtri:</span>
          </div>

          <Select value={selectedSeller} onValueChange={onSellerChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Vsi prodajalci" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vsi prodajalci</SelectItem>
              {sellers?.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  {seller.first_name} {seller.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Vsi statusi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vsi statusi</SelectItem>
              <SelectItem value="dirty">Umazani</SelectItem>
              <SelectItem value="waiting_driver">Čaka šoferja</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Izbrano: {selectedCount}</Badge>
              <Button variant="ghost" size="sm" onClick={onClearSelection}>
                Počisti
              </Button>
              {mapsUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mapsUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Maps
                </Button>
              )}
              <Button size="sm" onClick={onCreatePickup}>
                <Plus className="h-4 w-4 mr-2" />
                Ustvari prevzem
              </Button>
            </div>
          )}

          {selectedCount === 0 && totalCount > 0 && (
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Izberi vse ({totalCount})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

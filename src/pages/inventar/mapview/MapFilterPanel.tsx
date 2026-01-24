import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Building2, Truck, AlertTriangle } from 'lucide-react';
import { MapMarkerStatus, getMarkerColor } from '@/hooks/useMapLocations';
import { STATUS_OPTIONS } from './useMapFilters';
import type { PolygonPoint } from './usePolygonDrawing';

interface Seller {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface MapFilterPanelProps {
  // Filter values
  selectedCity: string;
  onCityChange: (city: string) => void;
  uniqueCities: string[];
  selectedDriver: string;
  onDriverChange: (driver: string) => void;
  uniqueDrivers: string[];
  selectedSeller: string;
  onSellerChange: (seller: string) => void;
  sellers: Seller[] | undefined;
  selectedStatuses: MapMarkerStatus[];
  onStatusToggle: (status: MapMarkerStatus) => void;
  statusCounts: Record<string, number>;
  minDaysOnTest: number;
  onMinDaysChange: (days: number) => void;
  showOnlyOverdue: boolean;
  onOverdueChange: (show: boolean) => void;
  // Stats
  filteredCount: number;
  totalCount: number;
  hasPolygon: boolean;
}

export function MapFilterPanel({
  selectedCity,
  onCityChange,
  uniqueCities,
  selectedDriver,
  onDriverChange,
  uniqueDrivers,
  selectedSeller,
  onSellerChange,
  sellers,
  selectedStatuses,
  onStatusToggle,
  statusCounts,
  minDaysOnTest,
  onMinDaysChange,
  showOnlyOverdue,
  onOverdueChange,
  filteredCount,
  totalCount,
  hasPolygon,
}: MapFilterPanelProps) {
  return (
    <Card className="w-56 shrink-0">
      <CardHeader className="py-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtri
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* City filter */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Mesto
          </label>
          <Select value={selectedCity} onValueChange={onCityChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Vsa mesta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vsa mesta</SelectItem>
              {uniqueCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Driver filter */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Dostavljalec
          </label>
          <Select value={selectedDriver} onValueChange={onDriverChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Vsi dostavljalci" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vsi dostavljalci</SelectItem>
              {uniqueDrivers.map((driver) => (
                <SelectItem key={driver} value={driver}>
                  {driver}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seller filter */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Prodajalec
          </label>
          <Select value={selectedSeller} onValueChange={onSellerChange}>
            <SelectTrigger className="h-8 text-xs">
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
        </div>

        {/* Status filters */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Status
          </label>
          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={option.value}
                    checked={selectedStatuses.includes(option.value)}
                    onCheckedChange={() => onStatusToggle(option.value)}
                    className="h-3.5 w-3.5"
                  />
                  <label
                    htmlFor={option.value}
                    className="text-xs text-gray-600 cursor-pointer flex items-center gap-1.5"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getMarkerColor(option.value) }}
                    />
                    {option.label}
                  </label>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {statusCounts[option.value] || 0}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced filters */}
        <div className="pt-2 border-t space-y-2">
          <label className="text-xs font-medium text-gray-700 block">
            Napredni filtri
          </label>

          {/* Min days on test */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-600">
              Min. dni na testu: {minDaysOnTest > 0 ? minDaysOnTest : 'Vsi'}
            </label>
            <Input
              type="range"
              min={0}
              max={60}
              step={5}
              value={minDaysOnTest}
              onChange={(e) => onMinDaysChange(parseInt(e.target.value))}
              className="w-full h-1.5"
            />
          </div>

          {/* Quick filters */}
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="overdue"
              checked={showOnlyOverdue}
              onCheckedChange={(checked) => onOverdueChange(!!checked)}
              className="h-3.5 w-3.5"
            />
            <label
              htmlFor="overdue"
              className="text-xs text-gray-600 cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Prekoračeni (&gt;20 dni)
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-600 space-y-0.5">
            <div>
              Filtrirano: <span className="font-semibold">{filteredCount}</span>
              {totalCount !== filteredCount && (
                <span className="text-gray-400"> / {totalCount}</span>
              )}
            </div>
            {hasPolygon && (
              <div className="text-orange-600">V označenem območju</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

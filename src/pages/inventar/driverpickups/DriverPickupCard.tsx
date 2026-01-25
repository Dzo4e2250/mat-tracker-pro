/**
 * @file DriverPickupCard.tsx
 * @description Kartica prevzema za šoferja
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Phone,
  MapPin,
  Printer,
  ExternalLink,
  CheckCircle,
  Clock,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DriverPickup, PickupStatus } from '@/hooks/useDriverPickups';
import { formatDate } from './helpers';

interface DriverPickupCardProps {
  pickup: DriverPickup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStartPickup: () => void;
  onCompletePickup: () => void;
  onDeletePickup: () => void;
  onToggleItem: (itemId: string, currentValue: boolean) => void;
  onPrint: () => void;
  onOpenMaps: () => void;
  isPending: {
    updateStatus: boolean;
    completePickup: boolean;
    markItemPickedUp: boolean;
  };
}

function getStatusBadge(status: PickupStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Čaka
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Play className="h-3 w-3 mr-1" />
          V teku
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Zaključen
        </Badge>
      );
  }
}

export function DriverPickupCard({
  pickup,
  isExpanded,
  onToggleExpand,
  onStartPickup,
  onCompletePickup,
  onDeletePickup,
  onToggleItem,
  onPrint,
  onOpenMaps,
  isPending,
}: DriverPickupCardProps) {
  const pickedUpCount = pickup.items.filter((i) => i.pickedUp).length;
  const totalCount = pickup.items.length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">
              Prevzem #{pickup.id.slice(0, 8)}
            </CardTitle>
            {getStatusBadge(pickup.status)}
          </div>
          <div className="flex items-center gap-2">
            {pickup.status !== 'completed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenMaps}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Pot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrint}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Natisni
                </Button>
                {pickup.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={onStartPickup}
                    disabled={isPending.updateStatus}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Začni
                  </Button>
                )}
                {pickup.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={onCompletePickup}
                    disabled={isPending.completePickup}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Zaključi
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onDeletePickup}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
          <span>
            <strong>Datum:</strong> {formatDate(pickup.scheduledDate)}
          </span>
          <span>
            <strong>Predpražniki:</strong> {pickedUpCount}/{totalCount} pobranih
          </span>
          {pickup.assignedDriver && (
            <span>
              <strong>Šofer:</strong> {pickup.assignedDriver}
            </span>
          )}
          {pickup.notes && (
            <span>
              <strong>Opombe:</strong> {pickup.notes}
            </span>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  {pickup.status !== 'completed' && 'Pobrano'}
                </TableHead>
                <TableHead>QR koda</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Podjetje / Naslov</TableHead>
                <TableHead>Kontakt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pickup.items.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.pickedUp ? 'bg-green-50' : ''}
                >
                  <TableCell>
                    {pickup.status !== 'completed' && (
                      <Checkbox
                        checked={item.pickedUp}
                        onCheckedChange={() =>
                          onToggleItem(item.id, item.pickedUp)
                        }
                        disabled={isPending.markItemPickedUp}
                      />
                    )}
                    {pickup.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{item.qrCode}</TableCell>
                  <TableCell>{item.matTypeName}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.companyName || '-'}</div>
                    {item.companyAddress && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {item.companyAddress}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.contactName && (
                      <div className="text-sm">{item.contactName}</div>
                    )}
                    {item.contactPhone && (
                      <a
                        href={`tel:${item.contactPhone}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {item.contactPhone}
                      </a>
                    )}
                    {!item.contactName && !item.contactPhone && '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

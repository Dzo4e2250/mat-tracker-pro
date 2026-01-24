/**
 * @file PickupCard.tsx
 * @description Kartica za prikaz prevzema
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle,
  Clock,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import type { DriverPickup, PickupStatus } from '@/hooks/useDriverPickups';

interface PickupCardProps {
  pickup: DriverPickup;
  isExpanded: boolean;
  showActions?: boolean;
  onToggleExpand: () => void;
  onStartPickup?: () => void;
  onCompletePickup?: () => void;
  onDeletePickup?: () => void;
  onToggleItem?: (itemId: string, currentValue: boolean) => void;
  onPrint?: () => void;
  onOpenMaps?: () => void;
  isPending?: {
    updateStatus?: boolean;
    completePickup?: boolean;
    markItemPickedUp?: boolean;
  };
}

export function getStatusBadge(status: PickupStatus) {
  const configs = {
    pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Čaka' },
    in_progress: { className: 'bg-blue-100 text-blue-800', icon: Play, label: 'V teku' },
    completed: { className: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Zaključen' },
  };
  const config = configs[status];
  return (
    <Badge variant="secondary" className={config.className}>
      <config.icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PickupCard({
  pickup,
  isExpanded,
  showActions = true,
  onToggleExpand,
  onStartPickup,
  onCompletePickup,
  onDeletePickup,
  onToggleItem,
  onPrint,
  onOpenMaps,
  isPending = {},
}: PickupCardProps) {
  const pickedUpCount = pickup.items.filter(i => i.pickedUp).length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Prevzem #{pickup.id.slice(0, 8)}</CardTitle>
            {getStatusBadge(pickup.status)}
          </div>
          <div className="flex items-center gap-2">
            {showActions && pickup.status !== 'completed' && (
              <>
                {onOpenMaps && (
                  <Button variant="outline" size="sm" onClick={onOpenMaps}>
                    <ExternalLink className="h-4 w-4 mr-1" />Pot
                  </Button>
                )}
                {onPrint && (
                  <Button variant="outline" size="sm" onClick={onPrint}>
                    <Printer className="h-4 w-4 mr-1" />Natisni
                  </Button>
                )}
                {pickup.status === 'pending' && onStartPickup && (
                  <Button size="sm" onClick={onStartPickup} disabled={isPending.updateStatus}>
                    <Play className="h-4 w-4 mr-1" />Začni
                  </Button>
                )}
                {pickup.status === 'in_progress' && onCompletePickup && (
                  <Button size="sm" onClick={onCompletePickup} disabled={isPending.completePickup}>
                    <CheckCircle className="h-4 w-4 mr-1" />Zaključi
                  </Button>
                )}
                {onDeletePickup && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={onDeletePickup}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
          {pickup.assignedDriver && <span><strong>Dostavljalec:</strong> {pickup.assignedDriver}</span>}
          <span><strong>Datum:</strong> {formatDate(pickup.scheduledDate)}</span>
          <span><strong>Predpražniki:</strong> {pickedUpCount}/{pickup.items.length}</span>
          {pickup.notes && <span><strong>Opombe:</strong> {pickup.notes}</span>}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{pickup.status !== 'completed' && 'Pobrano'}</TableHead>
                <TableHead>QR koda</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Podjetje / Naslov</TableHead>
                <TableHead>Kontakt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pickup.items.map(item => (
                <TableRow key={item.id} className={item.pickedUp ? 'bg-green-50' : ''}>
                  <TableCell>
                    {pickup.status !== 'completed' && onToggleItem ? (
                      <Checkbox
                        checked={item.pickedUp}
                        onCheckedChange={() => onToggleItem(item.id, item.pickedUp)}
                        disabled={isPending.markItemPickedUp}
                      />
                    ) : (
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
                    {item.contactName && <div className="text-sm">{item.contactName}</div>}
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

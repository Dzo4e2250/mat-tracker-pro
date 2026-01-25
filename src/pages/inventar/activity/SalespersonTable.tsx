import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { sl } from 'date-fns/locale';
import type { SalespersonSummary } from '@/hooks/useActivityTracking';

interface SalespersonTableProps {
  data: SalespersonSummary[] | undefined;
  isLoading: boolean;
  onRowClick: (salesperson: SalespersonSummary) => void;
}

type SortKey = 'name' | 'contacts' | 'notes' | 'offers' | 'statusChanges' | 'companies' | 'km' | 'lastActivity';
type SortDir = 'asc' | 'desc';

export function SalespersonTable({ data, isLoading, onRowClick }: SalespersonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('contacts');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedData = data ? [...data].sort((a, b) => {
    const multiplier = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'contacts':
        return multiplier * (a.contacts - b.contacts);
      case 'notes':
        return multiplier * (a.notes - b.notes);
      case 'offers':
        return multiplier * (a.offers - b.offers);
      case 'statusChanges':
        return multiplier * (a.statusChanges - b.statusChanges);
      case 'companies':
        return multiplier * (a.companies - b.companies);
      case 'km':
        return multiplier * (a.km - b.km);
      case 'lastActivity':
        if (!a.lastActivity && !b.lastActivity) return 0;
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return multiplier * (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime());
      default:
        return 0;
    }
  }) : [];

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className={`ml-1 h-3 w-3 ${sortKey === column ? 'text-primary' : 'text-muted-foreground'}`} />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prodajalci</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : sortedData.length > 0 ? (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortButton column="name" label="Ime" /></TableHead>
                  <TableHead className="w-16">Koda</TableHead>
                  <TableHead className="text-right"><SortButton column="contacts" label="Kont." /></TableHead>
                  <TableHead className="text-right"><SortButton column="notes" label="Opom." /></TableHead>
                  <TableHead className="text-right"><SortButton column="offers" label="Pon." /></TableHead>
                  <TableHead className="text-right"><SortButton column="statusChanges" label="Stat." /></TableHead>
                  <TableHead className="text-right"><SortButton column="companies" label="Podj." /></TableHead>
                  <TableHead className="text-right"><SortButton column="km" label="Km" /></TableHead>
                  <TableHead className="text-right"><SortButton column="lastActivity" label="Zadnja akt." /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((seller) => (
                  <TableRow
                    key={seller.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick(seller)}
                  >
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>
                      {seller.codePrefix && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {seller.codePrefix}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={seller.contacts > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                        {seller.contacts}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={seller.notes > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                        {seller.notes}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={seller.offers > 0 ? 'text-purple-600 font-medium' : 'text-muted-foreground'}>
                        {seller.offers}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={seller.statusChanges > 0 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                        {seller.statusChanges}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={seller.companies > 0 ? 'text-teal-600 font-medium' : 'text-muted-foreground'}>
                        {seller.companies}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={seller.km > 0 ? 'font-medium' : 'text-muted-foreground'}>
                        {seller.km}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {seller.lastActivity
                        ? formatDistanceToNow(new Date(seller.lastActivity), { addSuffix: true, locale: sl })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Ni aktivnih prodajalcev
          </p>
        )}
      </CardContent>
    </Card>
  );
}

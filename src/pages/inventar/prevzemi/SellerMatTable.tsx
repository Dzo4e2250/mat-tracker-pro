/**
 * @file SellerMatTable.tsx
 * @description Tabela predpražnikov za prodajalca
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Phone, MapPin, AlertTriangle } from 'lucide-react';

interface MatData {
  cycleId: string;
  qrCode: string;
  matTypeName: string;
  companyName: string | null;
  companyAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  status: string;
}

interface SellerData {
  sellerId: string;
  sellerName: string;
  sellerPrefix: string | null;
  mats: MatData[];
}

interface SellerMatTableProps {
  seller: SellerData;
  selectedMats: Set<string>;
  onToggleMat: (cycleId: string) => void;
  onToggleAllSeller: (sellerId: string, mats: MatData[], checked: boolean) => void;
}

export function SellerMatTable({
  seller,
  selectedMats,
  onToggleMat,
  onToggleAllSeller,
}: SellerMatTableProps) {
  const dirtyCount = seller.mats.filter(m => m.status === 'dirty').length;
  const allSelected = seller.mats.every(m => selectedMats.has(m.cycleId));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {seller.sellerPrefix && (
              <Badge variant="outline" className="font-mono">
                {seller.sellerPrefix}
              </Badge>
            )}
            <span>{seller.sellerName}</span>
            {dirtyCount >= 10 && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Opozorilo
              </Badge>
            )}
          </div>
          <Badge variant="secondary">{seller.mats.length} predpražnikov</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    onToggleAllSeller(seller.sellerId, seller.mats, !!checked)
                  }
                />
              </TableHead>
              <TableHead>QR koda</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Podjetje</TableHead>
              <TableHead>Naslov</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seller.mats.map(mat => (
              <TableRow key={mat.cycleId}>
                <TableCell>
                  <Checkbox
                    checked={selectedMats.has(mat.cycleId)}
                    onCheckedChange={() => onToggleMat(mat.cycleId)}
                  />
                </TableCell>
                <TableCell className="font-mono">{mat.qrCode}</TableCell>
                <TableCell>{mat.matTypeName}</TableCell>
                <TableCell className="font-medium">{mat.companyName || '-'}</TableCell>
                <TableCell>
                  {mat.companyAddress ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">{mat.companyAddress}</span>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {mat.contactName ? (
                    <div className="space-y-1">
                      <div className="text-sm">{mat.contactName}</div>
                      {mat.contactPhone && (
                        <a
                          href={`tel:${mat.contactPhone}`}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {mat.contactPhone}
                        </a>
                      )}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={mat.status === 'dirty' ? 'destructive' : 'secondary'}
                    className={mat.status === 'waiting_driver' ? 'bg-purple-100 text-purple-800' : ''}
                  >
                    {mat.status === 'dirty' ? 'Umazan' : 'Čaka šoferja'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

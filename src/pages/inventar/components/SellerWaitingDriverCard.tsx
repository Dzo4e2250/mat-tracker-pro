import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, CheckCircle, Loader2, Download, Filter } from "lucide-react";
import type { DirtyMat } from "./types";
import * as XLSX from 'xlsx';

interface SellerWaitingDriverCardProps {
  waitingDriverMats: DirtyMat[];
  isPending: boolean;
  onCompletePickup: (cycleIds: string[]) => void;
}

export function SellerWaitingDriverCard({
  waitingDriverMats,
  isPending,
  onCompletePickup,
}: SellerWaitingDriverCardProps) {
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');

  // Get unique mat types with counts
  const matTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    waitingDriverMats.forEach(mat => {
      const type = mat.matTypeCode || 'Neznano';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [waitingDriverMats]);

  // Filter mats by selected type
  const filteredMats = useMemo(() => {
    if (matTypeFilter === 'all') return waitingDriverMats;
    return waitingDriverMats.filter(mat => (mat.matTypeCode || 'Neznano') === matTypeFilter);
  }, [waitingDriverMats, matTypeFilter]);

  // Export to Excel
  const exportToExcel = () => {
    if (filteredMats.length === 0) return;

    const data = filteredMats.map(mat => ({
      'QR Koda': mat.qrCode,
      'Tip': mat.matTypeCode || mat.matTypeName,
      'Podjetje': mat.companyName || '',
      'Naslov': mat.companyAddress || '',
      'Kontakt': mat.contactName || '',
      'Telefon': mat.contactPhone || '',
      'Status': 'Čaka šoferja',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Čaka šoferja');

    ws['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];

    const dateStr = new Date().toISOString().split('T')[0];
    const typeStr = matTypeFilter !== 'all' ? `_${matTypeFilter}` : '';
    XLSX.writeFile(wb, `Caka_soferja${typeStr}_${dateStr}.xlsx`);
  };

  if (waitingDriverMats.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-300 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Truck className="h-5 w-5" />
              Čaka šoferja ({waitingDriverMats.length})
            </CardTitle>
            <CardDescription>Predpražniki pripravljeni za prevzem</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mat Type Filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-purple-500" />
              <select
                value={matTypeFilter}
                onChange={(e) => setMatTypeFilter(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-white"
              >
                <option value="all">Vsi tipi ({waitingDriverMats.length})</option>
                {matTypeCounts.map(([type, count]) => (
                  <option key={type} value={type}>
                    {type} ({count})
                  </option>
                ))}
              </select>
            </div>

            {/* Excel Export */}
            <Button size="sm" variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>

            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => onCompletePickup(filteredMats.map(m => m.cycleId))}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Potrdi prevzem vseh
            </Button>
          </div>
        </div>
        {/* Show filter info */}
        {matTypeFilter !== 'all' && (
          <div className="mt-2 text-sm text-purple-600">
            Prikazujem: <strong>{matTypeFilter}</strong> ({filteredMats.length} od {waitingDriverMats.length})
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredMats.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 text-gray-300 mb-2" />
            <p>Ni preprog za izbrani filter</p>
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>QR Koda</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMats.map((mat) => (
              <TableRow key={mat.cycleId}>
                <TableCell className="font-mono font-semibold">{mat.qrCode}</TableCell>
                <TableCell>{mat.matTypeCode || mat.matTypeName}</TableCell>
                <TableCell>
                  <Badge className="bg-purple-100 text-purple-800">Čaka šoferja</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => onCompletePickup([mat.cycleId])}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Pobrano
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}

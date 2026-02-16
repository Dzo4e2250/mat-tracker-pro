import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Phone,
  Truck,
  User,
  MapPin,
  Building2,
  CheckCircle,
  Loader2,
  Download,
  Filter,
  FileText,
} from "lucide-react";
import type { DirtyMat, SellerProfile } from "./types";
import * as XLSX from 'xlsx';
import { generateDirtyTransportDocument } from '../seller/generateDirtyTransportDocument';

interface SellerDirtyMatsCardProps {
  dirtyMatsOnly: DirtyMat[];
  loadingDirty: boolean;
  selectedDirtyMats: Set<string>;
  seller?: SellerProfile;
  onToggleDirtyMat: (cycleId: string) => void;
  onSelectAllDirty: () => void;
  onClearSelection: () => void;
  onCreatePickup: (mats: DirtyMat[]) => void;
  onSelfDelivery: (cycleIds: string[]) => void;
}

export function SellerDirtyMatsCard({
  dirtyMatsOnly,
  loadingDirty,
  selectedDirtyMats,
  seller,
  onToggleDirtyMat,
  onSelectAllDirty,
  onClearSelection,
  onCreatePickup,
  onSelfDelivery,
}: SellerDirtyMatsCardProps) {
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');

  // Get unique mat types with counts
  const matTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    dirtyMatsOnly.forEach(mat => {
      const type = mat.matTypeCode || 'Neznano';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dirtyMatsOnly]);

  // Filter mats by selected type
  const filteredMats = useMemo(() => {
    if (matTypeFilter === 'all') return dirtyMatsOnly;
    return dirtyMatsOnly.filter(mat => (mat.matTypeCode || 'Neznano') === matTypeFilter);
  }, [dirtyMatsOnly, matTypeFilter]);

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
      'Status': 'Umazana',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Umazane');

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 12 }
    ];

    const dateStr = new Date().toISOString().split('T')[0];
    const typeStr = matTypeFilter !== 'all' ? `_${matTypeFilter}` : '';
    XLSX.writeFile(wb, `Umazane_preproge${typeStr}_${dateStr}.xlsx`);
  };

  return (
    <Card className={dirtyMatsOnly.length > 0 ? "border-orange-300" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Umazane preproge ({dirtyMatsOnly.length})
          </CardTitle>
          {dirtyMatsOnly.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mat Type Filter */}
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={matTypeFilter}
                  onChange={(e) => setMatTypeFilter(e.target.value)}
                  className="text-sm border rounded px-2 py-1 bg-white"
                >
                  <option value="all">Vsi tipi ({dirtyMatsOnly.length})</option>
                  {matTypeCounts.map(([type, count]) => (
                    <option key={type} value={type}>
                      {type} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transport Document */}
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => generateDirtyTransportDocument(filteredMats, seller)}
              >
                <FileText className="h-4 w-4 mr-1" /> Odvozni nalog
              </Button>

              {/* Excel Export */}
              <Button size="sm" variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>

              {selectedDirtyMats.size > 0 ? (
                <>
                  <Badge variant="secondary">{selectedDirtyMats.size} izbranih</Badge>
                  <Button size="sm" variant="outline" onClick={onClearSelection}>
                    Počisti
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-purple-600"
                    onClick={() => onCreatePickup(filteredMats.filter(m => selectedDirtyMats.has(m.cycleId)))}
                  >
                    <Truck className="h-4 w-4 mr-1" /> Ustvari prevzem
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onSelfDelivery(Array.from(selectedDirtyMats))}
                  >
                    <User className="h-4 w-4 mr-1" /> Lastna dostava
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={onSelectAllDirty}>
                  Izberi vse
                </Button>
              )}
            </div>
          )}
        </div>
        {/* Show filter info */}
        {matTypeFilter !== 'all' && (
          <div className="mt-2 text-sm text-orange-600">
            Prikazujem: <strong>{matTypeFilter}</strong> ({filteredMats.length} od {dirtyMatsOnly.length})
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loadingDirty ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : dirtyMatsOnly.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p>Ni umazanih preprog</p>
          </div>
        ) : filteredMats.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 text-gray-300 mb-2" />
            <p>Ni preprog za izbrani filter</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedDirtyMats.size === filteredMats.length && filteredMats.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) onSelectAllDirty();
                      else onClearSelection();
                    }}
                  />
                </TableHead>
                <TableHead>QR Koda</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Podjetje</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMats.map((mat) => (
                <TableRow key={mat.cycleId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDirtyMats.has(mat.cycleId)}
                      onCheckedChange={() => onToggleDirtyMat(mat.cycleId)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{mat.qrCode}</TableCell>
                  <TableCell>{mat.matTypeCode || mat.matTypeName}</TableCell>
                  <TableCell>
                    {mat.companyName && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        {mat.companyName}
                      </div>
                    )}
                    {mat.companyAddress && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {mat.companyAddress}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {mat.contactName && <div className="text-sm">{mat.contactName}</div>}
                    {mat.contactPhone && (
                      <a href={`tel:${mat.contactPhone}`} className="flex items-center gap-1 text-xs text-blue-600">
                        <Phone className="h-3 w-3" /> {mat.contactPhone}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Umazana</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => onSelfDelivery([mat.cycleId])}
                      >
                        <User className="h-3 w-3" />
                      </Button>
                      {mat.status === 'dirty' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 hover:text-purple-700"
                          onClick={() => onCreatePickup([mat])}
                        >
                          <Truck className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
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

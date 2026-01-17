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
} from "lucide-react";
import type { DirtyMat } from "./types";

interface SellerDirtyMatsCardProps {
  dirtyMatsOnly: DirtyMat[];
  loadingDirty: boolean;
  selectedDirtyMats: Set<string>;
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
  onToggleDirtyMat,
  onSelectAllDirty,
  onClearSelection,
  onCreatePickup,
  onSelfDelivery,
}: SellerDirtyMatsCardProps) {
  return (
    <Card className={dirtyMatsOnly.length > 0 ? "border-orange-300" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Umazane preproge ({dirtyMatsOnly.length})
          </CardTitle>
          {dirtyMatsOnly.length > 0 && (
            <div className="flex items-center gap-2">
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
                    onClick={() => onCreatePickup(dirtyMatsOnly.filter(m => selectedDirtyMats.has(m.cycleId)))}
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
      </CardHeader>
      <CardContent>
        {loadingDirty ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : dirtyMatsOnly.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p>Ni umazanih preprog</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedDirtyMats.size === dirtyMatsOnly.length && dirtyMatsOnly.length > 0}
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
              {dirtyMatsOnly.map((mat) => (
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

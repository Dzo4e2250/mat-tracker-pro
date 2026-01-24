import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";
import type { QRCodeWithCycle } from "./types";

interface Stats {
  total: number;
  available: number;
  pending: number;
  active: number;
  onTest: number;
  dirty: number;
  waitingPickup: number;
  clean: number;
}

interface SellerQRCodesTabProps {
  qrCodes: QRCodeWithCycle[];
  stats: Stats;
  loadingCodes: boolean;
  codePrefix: string | null;
  isCreatingCodes: boolean;
  onAddCodes: (count: number) => void;
  onDeleteCode: (codeId: string) => void;
}

export function SellerQRCodesTab({
  qrCodes,
  stats,
  loadingCodes,
  codePrefix,
  isCreatingCodes,
  onAddCodes,
  onDeleteCode,
}: SellerQRCodesTabProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newCodeCount, setNewCodeCount] = useState(1);

  // Filter helpers - check active_cycle FIRST, then qr_code status
  const getCodeStatus = (code: QRCodeWithCycle): string => {
    if (code.active_cycle) return code.active_cycle.status;
    if (code.status === 'pending') return 'pending';
    if (code.status === 'available') return 'available';
    return 'active';
  };

  const filteredCodes = qrCodes.filter(code => {
    if (filterStatus === 'all') return true;
    return getCodeStatus(code) === filterStatus;
  });

  const getStatusBadge = (code: QRCodeWithCycle) => {
    if (code.active_cycle) {
      const cycleStatus = code.active_cycle.status;
      switch (cycleStatus) {
        case 'clean': return <Badge className="bg-blue-500">Čista</Badge>;
        case 'on_test': return <Badge className="bg-yellow-500">Na testu</Badge>;
        case 'dirty': return <Badge className="bg-orange-500">Umazana</Badge>;
        case 'waiting_driver': return <Badge className="bg-purple-500">Čaka prevzem</Badge>;
        default: return <Badge variant="outline">{cycleStatus}</Badge>;
      }
    }
    if (code.status === 'pending') return <Badge variant="secondary">Naročena</Badge>;
    if (code.status === 'available') return <Badge className="bg-green-500">Prosta</Badge>;
    return <Badge variant="secondary">Aktivna</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Add new codes section */}
      {codePrefix && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Dodaj nove kode
            </CardTitle>
            <CardDescription>
              Ustvari naključne kode v formatu {codePrefix}-XXXX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Zmanjšaj število"
                  onClick={() => setNewCodeCount(Math.max(1, newCodeCount - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newCodeCount}
                  onChange={(e) => setNewCodeCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="text-center w-20"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Povečaj število"
                  onClick={() => setNewCodeCount(Math.min(100, newCodeCount + 1))}
                >
                  +
                </Button>
              </div>
              <Button
                onClick={() => onAddCodes(newCodeCount)}
                disabled={isCreatingCodes}
              >
                {isCreatingCodes ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Generiraj {newCodeCount} {newCodeCount === 1 ? 'kodo' : 'kod'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR codes grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>QR Kode</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter po statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vse ({stats.total})</SelectItem>
                <SelectItem value="available">Proste ({stats.available})</SelectItem>
                <SelectItem value="on_test">Na testu ({stats.onTest})</SelectItem>
                <SelectItem value="dirty">Umazane ({stats.dirty})</SelectItem>
                <SelectItem value="waiting_driver">Čaka prevzem ({stats.waitingPickup})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCodes ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredCodes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Ni kod za prikaz</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredCodes.map((code) => (
                <div
                  key={code.id}
                  className={`p-3 border rounded-lg text-center relative group ${
                    code.status === 'available' ? 'bg-green-50 border-green-300' :
                    code.active_cycle?.status === 'on_test' ? 'bg-yellow-50 border-yellow-300' :
                    code.active_cycle?.status === 'dirty' ? 'bg-orange-50 border-orange-300' :
                    code.active_cycle?.status === 'waiting_driver' ? 'bg-purple-50 border-purple-300' :
                    'bg-gray-50'
                  }`}
                >
                  {/* Delete button for available codes */}
                  {code.status === 'available' && !code.active_cycle && (
                    <button
                      onClick={() => onDeleteCode(code.id)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Izbriši kodo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {code.active_cycle?.mat_type && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">
                      {code.active_cycle.mat_type.code || code.active_cycle.mat_type.name}
                    </div>
                  )}
                  <p className="font-mono text-sm font-semibold mb-1 mt-1">{code.code}</p>
                  {getStatusBadge(code)}
                  {code.active_cycle?.company && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {code.active_cycle.company.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

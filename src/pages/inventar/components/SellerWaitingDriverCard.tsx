import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, CheckCircle, Loader2 } from "lucide-react";
import type { DirtyMat } from "./types";

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
  if (waitingDriverMats.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-300 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Truck className="h-5 w-5" />
              Čaka šoferja ({waitingDriverMats.length})
            </CardTitle>
            <CardDescription>Predpražniki pripravljeni za prevzem</CardDescription>
          </div>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => onCompletePickup(waitingDriverMats.map(m => m.cycleId))}
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
      </CardHeader>
      <CardContent>
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
            {waitingDriverMats.map((mat) => (
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
      </CardContent>
    </Card>
  );
}

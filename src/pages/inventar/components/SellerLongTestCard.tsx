import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Phone, Truck, User, Mail, Loader2 } from "lucide-react";
import type { DirtyMat } from "./types";

interface SellerLongTestCardProps {
  longTestMats: DirtyMat[];
  sellerEmail: string | null;
  isSendingEmail: boolean;
  onSendEmailWarning: (mats: DirtyMat[]) => void;
  onCreatePickup: (mats: DirtyMat[]) => void;
  onSelfDelivery: (cycleIds: string[]) => void;
}

export function SellerLongTestCard({
  longTestMats,
  sellerEmail,
  isSendingEmail,
  onSendEmailWarning,
  onCreatePickup,
  onSelfDelivery,
}: SellerLongTestCardProps) {
  if (longTestMats.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              Dolgo na testu ({longTestMats.length})
            </CardTitle>
            <CardDescription>Preproge na testu več kot 20 dni</CardDescription>
          </div>
          <Button
            variant="outline"
            className="bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
            onClick={() => onSendEmailWarning(longTestMats)}
            disabled={isSendingEmail || !sellerEmail}
          >
            {isSendingEmail ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Pošlji opozorilo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>QR Koda</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Podjetje</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Dni na testu</TableHead>
              <TableHead>Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {longTestMats.map((mat) => (
              <TableRow key={mat.cycleId}>
                <TableCell className="font-mono">{mat.qrCode}</TableCell>
                <TableCell>{mat.matTypeCode || mat.matTypeName}</TableCell>
                <TableCell>{mat.companyName || '-'}</TableCell>
                <TableCell>
                  {mat.contactPhone ? (
                    <a href={`tel:${mat.contactPhone}`} className="flex items-center gap-1 text-blue-600">
                      <Phone className="h-3 w-3" /> {mat.contactPhone}
                    </a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={mat.daysOnTest >= 25 ? 'destructive' : 'secondary'}
                    className={mat.daysOnTest < 25 ? 'bg-yellow-200 text-yellow-800' : ''}>
                    {mat.daysOnTest} dni
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-600 hover:text-purple-700"
                      title="Šofer bo prevzel"
                      onClick={() => onCreatePickup([mat])}
                    >
                      <Truck className="h-3 w-3 mr-1" /> Šofer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      title="Lastna dostava"
                      onClick={() => onSelfDelivery([mat.cycleId])}
                    >
                      <User className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

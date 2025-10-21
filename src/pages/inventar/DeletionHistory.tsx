import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download, Printer } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface DeletionRecord {
  id: string;
  doormat_qr_code: string;
  doormat_type: string;
  seller_name: string | null;
  deleted_at: string;
  deletion_type: string;
}

interface TesterRequest {
  id: string;
  seller_id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  quantities: any;
  generated_qr_codes: string[] | null;
  seller_name?: string;
}

export default function DeletionHistory() {
  const { signOut } = useAuth();
  const [deletions, setDeletions] = useState<DeletionRecord[]>([]);
  const [testerRequests, setTesterRequests] = useState<TesterRequest[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletionHistory();
    fetchTesterRequests();
  }, []);

  const fetchDeletionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('deletion_history')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletions(data || []);
    } catch (error: any) {
      console.error('Error fetching deletion history:', error);
    }
  };

  const fetchTesterRequests = async () => {
    try {
      const { data: requestsData } = await supabase
        .from('tester_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!requestsData) return;

      const requestsWithSellers = await Promise.all(requestsData.map(async (req) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', req.seller_id)
          .single();
        
        return { ...req, seller_name: profile?.full_name };
      }));

      setTesterRequests(requestsWithSellers);
    } catch (error) {
      console.error('Error fetching tester requests:', error);
    }
  };

  const exportToExcel = () => {
    const data = deletions.map(deletion => ({
      'QR Koda': deletion.doormat_qr_code,
      'Tip': deletion.doormat_type,
      'Prodajalec': deletion.seller_name || '-',
      'Vrsta brisanja': deletion.deletion_type === 'selected' ? 'Označeni' : 
                        deletion.deletion_type === 'bulk_seller' ? 'Vsi prodajalca' : 'Posamezni',
      'Datum brisanja': new Date(deletion.deleted_at).toLocaleString('sl-SI'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zgodovina brisanj');
    XLSX.writeFile(wb, `Zgodovina_brisanj_${new Date().toLocaleDateString('sl-SI')}.xlsx`);

    toast({
      title: "Izvoženo",
      description: "Excel datoteka je bila prenesena.",
    });
  };

  const printRequestQRCodes = (request: TesterRequest) => {
    if (!request.generated_qr_codes || request.generated_qr_codes.length === 0) {
      toast({
        title: "Napaka",
        description: "Ni generiranih QR kod za tisk",
        variant: "destructive"
      });
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const qrPerRow = 3;
      const qrSizeMM = (pageWidth - 2 * margin) / qrPerRow - 5;
      
      let x = margin;
      let y = margin;
      let count = 0;

      // Create temporary canvas for QR codes
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;

      request.generated_qr_codes.forEach((code) => {
        // Note: For production, you'd want to use a proper QR library here
        // This is simplified - you should generate actual QR codes
        pdf.setFontSize(10);
        pdf.text(code, x + qrSizeMM / 2, y + qrSizeMM / 2, { align: 'center' });
        pdf.rect(x, y, qrSizeMM, qrSizeMM);
        
        count++;
        x += qrSizeMM + 5;
        
        if (count % qrPerRow === 0) {
          x = margin;
          y += qrSizeMM + 10;
          
          if (y + qrSizeMM > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
        }
      });

      pdf.save(`Tester_QR_${request.seller_name}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: "Uspeh",
        description: "PDF pripravljen za tisk"
      });
    } catch (error) {
      console.error('Error printing QR codes:', error);
      toast({
        title: "Napaka",
        description: "Napaka pri pripravi PDF-ja",
        variant: "destructive"
      });
    }
  };

  const getTotalQuantity = (quantities: any) => {
    if (!quantities || typeof quantities !== 'object') return 0;
    return Object.values(quantities).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0);
  };

  const getDeletionTypeLabel = (type: string) => {
    switch (type) {
      case 'selected':
        return 'Označeni';
      case 'bulk_seller':
        return 'Vsi prodajalca';
      case 'single':
        return 'Posamezni';
      default:
        return type;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Zgodovina</h1>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Odjava
              </Button>
            </div>

            <Tabs defaultValue="deletions">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deletions">Brisanja</TabsTrigger>
                <TabsTrigger value="tester-requests">Prošnje za testerje</TabsTrigger>
              </TabsList>

              <TabsContent value="deletions">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Izbrisani predpražniki</CardTitle>
                    <Button onClick={exportToExcel} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Izvozi
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-[600px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card">
                          <TableRow>
                            <TableHead>Datum in čas</TableHead>
                            <TableHead>QR Koda</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Prodajalec</TableHead>
                            <TableHead>Vrsta brisanja</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deletions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Ni zgodovine brisanj
                              </TableCell>
                            </TableRow>
                          ) : (
                            deletions.map((deletion) => (
                              <TableRow key={deletion.id}>
                                <TableCell>
                                  {new Date(deletion.deleted_at).toLocaleString('sl-SI', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </TableCell>
                                <TableCell className="font-mono">{deletion.doormat_qr_code}</TableCell>
                                <TableCell>{deletion.doormat_type}</TableCell>
                                <TableCell>{deletion.seller_name || '-'}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted">
                                    {getDeletionTypeLabel(deletion.deletion_type)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tester-requests">
                <Card>
                  <CardHeader>
                    <CardTitle>Zgodovina prošenj za testerje</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {testerRequests.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Ni prošenj</p>
                      ) : (
                        testerRequests.map((request) => (
                          <Card key={request.id} className={request.status === 'approved' ? 'border-green-500' : ''}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="font-medium">{request.seller_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Ustvarjeno: {new Date(request.created_at).toLocaleString('sl-SI')}
                                  </p>
                                  {request.approved_at && (
                                    <p className="text-sm text-muted-foreground">
                                      Odobreno: {new Date(request.approved_at).toLocaleString('sl-SI')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 items-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    request.status === 'approved' 
                                      ? 'bg-green-500/10 text-green-600' 
                                      : 'bg-yellow-500/10 text-yellow-600'
                                  }`}>
                                    {request.status === 'approved' ? 'Odobreno' : 'Na čakanju'}
                                  </span>
                                  {request.status === 'approved' && request.generated_qr_codes && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => printRequestQRCodes(request)}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Natisni
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 mb-4">
                                {request.quantities && typeof request.quantities === 'object' && 
                                  Object.entries(request.quantities as Record<string, number>).map(([type, qty]) => (
                                    <div key={type} className="text-sm">
                                      <span className="font-medium">{type}:</span> {qty}
                                    </div>
                                  ))
                                }
                              </div>

                              <p className="text-sm font-medium">
                                Skupaj: {getTotalQuantity(request.quantities)} kosov
                              </p>
                              
                              {request.generated_qr_codes && request.generated_qr_codes.length > 0 && (
                                <details className="mt-4">
                                  <summary className="text-sm font-medium cursor-pointer">
                                    Generirane QR kode ({request.generated_qr_codes.length})
                                  </summary>
                                  <div className="mt-2 grid grid-cols-4 gap-2">
                                    {request.generated_qr_codes.map((code) => (
                                      <span key={code} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        {code}
                                      </span>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

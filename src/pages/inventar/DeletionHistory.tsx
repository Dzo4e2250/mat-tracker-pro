import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Download } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

interface DeletionRecord {
  id: string;
  doormat_qr_code: string;
  doormat_type: string;
  seller_name: string | null;
  deleted_at: string;
  deletion_type: string;
}

export default function DeletionHistory() {
  const { signOut } = useAuth();
  const [deletions, setDeletions] = useState<DeletionRecord[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletionHistory();
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
              <h1 className="text-3xl font-bold">Zgodovina brisanj</h1>
              <div className="flex gap-2">
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Izvozi
                </Button>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Odjava
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Izbrisani predpražniki</CardTitle>
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

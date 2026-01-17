import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, CheckCircle, MapPin, Phone, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { Cycle, Company, Contact, MatType, QRCode, Profile } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PickupCycle = Cycle & {
  qr_code?: QRCode;
  mat_type?: MatType;
  company?: Company;
  contact?: Contact;
  salesperson?: Profile;
};

export default function TesterRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [completingCycle, setCompletingCycle] = useState<PickupCycle | null>(null);

  // Fetch cycles waiting for pickup
  const { data: pendingPickups = [], isLoading } = useQuery({
    queryKey: ['pickup_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select(`
          *,
          qr_code:qr_codes(*),
          mat_type:mat_types(*),
          company:companies(*),
          contact:contacts(*),
          salesperson:profiles!cycles_salesperson_id_fkey(*)
        `)
        .eq('status', 'waiting_driver')
        .order('pickup_requested_at', { ascending: true });

      if (error) throw error;
      return data as PickupCycle[];
    },
  });

  // Mutation to mark cycle as completed
  const completeCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      // Update cycle status to completed
      const { error: cycleError } = await supabase
        .from('cycles')
        .update({
          status: 'completed',
          driver_pickup_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cycleId);

      if (cycleError) throw cycleError;

      // Update QR code status back to available
      const cycle = pendingPickups.find(c => c.id === cycleId);
      if (cycle?.qr_code_id) {
        await supabase
          .from('qr_codes')
          .update({ status: 'available' })
          .eq('id', cycle.qr_code_id);
      }

      // Add to cycle history
      await supabase.from('cycle_history').insert({
        cycle_id: cycleId,
        action: 'driver_pickup',
        old_status: 'waiting_driver',
        new_status: 'completed',
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: "Cikel zaključen, predpražnik prevzet",
      });
      queryClient.invalidateQueries({ queryKey: ['pickup_requests'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      setCompletingCycle(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Napaka",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group pickups by company
  const groupedPickups = pendingPickups.reduce((acc, cycle) => {
    const companyId = cycle.company_id || 'unknown';
    if (!acc[companyId]) {
      acc[companyId] = {
        company: cycle.company,
        cycles: [],
      };
    }
    acc[companyId].cycles.push(cycle);
    return acc;
  }, {} as Record<string, { company?: Company; cycles: PickupCycle[] }>);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Zahteve za prevzem</h1>
                <p className="text-muted-foreground">
                  Predpražniki, ki čakajo na prevzem s strani voznika
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Truck className="h-5 w-5 mr-2" />
                {pendingPickups.length} na čakanju
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : pendingPickups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ni zahtev za prevzem</h3>
                  <p className="text-muted-foreground">
                    Trenutno ni predpražnikov, ki bi čakali na prevzem
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedPickups).map(([companyId, { company, cycles }]) => (
                  <Card key={companyId} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {company?.name || 'Neznano podjetje'}
                          </CardTitle>
                          {company && (
                            <CardDescription className="mt-1">
                              {company.address_street && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {company.address_street}, {company.address_postal} {company.address_city}
                                </span>
                              )}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-base">
                          {cycles.length} {cycles.length === 1 ? 'predpražnik' : 'predpražnikov'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {cycles.map((cycle) => (
                          <div
                            key={cycle.id}
                            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono font-semibold text-lg">
                                  {cycle.qr_code?.code}
                                </span>
                                <Badge variant="outline">
                                  {cycle.mat_type?.name || 'Neznan tip'}
                                </Badge>
                                {cycle.contract_signed && (
                                  <Badge className="bg-green-500">Pogodba</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>
                                  <strong>Prodajalec:</strong>{' '}
                                  {cycle.salesperson
                                    ? `${cycle.salesperson.first_name} ${cycle.salesperson.last_name}`
                                    : '-'}
                                </p>
                                <p>
                                  <strong>Zahteva:</strong> {formatDate(cycle.pickup_requested_at)}
                                </p>
                                {cycle.contact && (
                                  <p className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {cycle.contact.first_name} {cycle.contact.last_name}
                                    {cycle.contact.phone && ` - ${cycle.contact.phone}`}
                                  </p>
                                )}
                                {cycle.notes && (
                                  <p className="italic">"{cycle.notes}"</p>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => setCompletingCycle(cycle)}
                              className="ml-4"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Prevzeto
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!completingCycle} onOpenChange={() => setCompletingCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrdi prevzem</AlertDialogTitle>
            <AlertDialogDescription>
              Ali potrjujete, da je bil predpražnik{' '}
              <strong>{completingCycle?.qr_code?.code}</strong> prevzet?
              <br /><br />
              QR koda bo spet na voljo za novo aktivacijo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completingCycle && completeCycle.mutate(completingCycle.id)}
              disabled={completeCycle.isPending}
            >
              {completeCycle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Potrdi prevzem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

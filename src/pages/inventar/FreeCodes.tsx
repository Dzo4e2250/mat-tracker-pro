import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, QrCode } from "lucide-react";
import { useProdajalecProfiles } from "@/hooks/useProfiles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QRCode } from "@/integrations/supabase/types";

export default function FreeCodes() {
  const { data: sellers = [], isLoading: loadingSellers } = useProdajalecProfiles();
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [newCodeStart, setNewCodeStart] = useState("");
  const [newCodeCount, setNewCodeCount] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  // Fetch available QR codes for selected seller
  const { data: freeCodes = [], isLoading: loadingCodes } = useQuery({
    queryKey: ['free_codes', selectedSellerId],
    queryFn: async () => {
      if (!selectedSellerId) return [];

      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', selectedSellerId)
        .eq('status', 'available')
        .order('code');

      if (error) throw error;
      return data as QRCode[];
    },
    enabled: !!selectedSellerId,
  });

  // Mutation to create new QR codes
  const createCodes = useMutation({
    mutationFn: async ({ prefix, startNum, count, ownerId }: {
      prefix: string;
      startNum: number;
      count: number;
      ownerId: string;
    }) => {
      const newCodes = [];
      for (let i = 0; i < count; i++) {
        const code = `${prefix}-${String(startNum + i).padStart(3, '0')}`;
        newCodes.push({
          code,
          owner_id: ownerId,
          status: 'available' as const,
        });
      }

      const { data, error } = await supabase
        .from('qr_codes')
        .insert(newCodes)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Uspeh",
        description: `Ustvarjenih ${data.length} novih QR kod`,
      });
      queryClient.invalidateQueries({ queryKey: ['free_codes', selectedSellerId] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['inventar', 'stats'] });
      setNewCodeStart("");
      setNewCodeCount(1);
    },
    onError: (error: Error) => {
      toast({
        title: "Napaka",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCodes = async () => {
    if (!selectedSellerId || !selectedSeller?.code_prefix) {
      toast({
        title: "Napaka",
        description: "Izberite prodajalca s predpono",
        variant: "destructive",
      });
      return;
    }

    const startNum = parseInt(newCodeStart);
    if (isNaN(startNum) || startNum < 1) {
      toast({
        title: "Napaka",
        description: "Vnesite veljavno začetno številko",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    const codesToCheck = [];
    for (let i = 0; i < newCodeCount; i++) {
      codesToCheck.push(`${selectedSeller.code_prefix}-${String(startNum + i).padStart(3, '0')}`);
    }

    const { data: existing } = await supabase
      .from('qr_codes')
      .select('code')
      .in('code', codesToCheck);

    if (existing && existing.length > 0) {
      toast({
        title: "Napaka",
        description: `Te kode že obstajajo: ${existing.map(e => e.code).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    createCodes.mutate({
      prefix: selectedSeller.code_prefix,
      startNum,
      count: newCodeCount,
      ownerId: selectedSellerId,
    });
  };

  const getNextSuggestedNumber = () => {
    if (freeCodes.length === 0) return 1;
    const numbers = freeCodes.map(c => {
      const match = c.code.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    return Math.max(...numbers) + 1;
  };

  const isLoading = loadingSellers || loadingCodes;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Proste QR kode</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Izberi prodajalca</CardTitle>
                <CardDescription>
                  Upravljaj proste QR kode za izbranega prodajalca
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seller">Prodajalec</Label>
                    <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                      <SelectTrigger id="seller">
                        <SelectValue placeholder="Izberi prodajalca" />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.first_name} {seller.last_name} {seller.code_prefix && `(${seller.code_prefix})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSellerId && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-medium">Skupaj prostih kod</p>
                          <p className="text-2xl font-bold">{freeCodes.length}</p>
                        </div>
                        {selectedSeller?.code_prefix && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Predpona</p>
                            <p className="font-mono font-semibold">{selectedSeller.code_prefix}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedSellerId && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Dodaj nove kode</CardTitle>
                    <CardDescription>
                      {selectedSeller?.code_prefix
                        ? `Ustvarite nove kode v formatu ${selectedSeller.code_prefix}-XXX`
                        : "Prodajalec nima nastavljene predpone"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedSeller?.code_prefix ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Začetna številka</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder={String(getNextSuggestedNumber())}
                              value={newCodeStart}
                              onChange={(e) => setNewCodeStart(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Predlagana: {getNextSuggestedNumber()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Število kod</Label>
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
                          </div>
                        </div>

                        {newCodeStart && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Predogled:</p>
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: Math.min(newCodeCount, 10) }).map((_, i) => (
                                <span key={i} className="font-mono text-sm bg-background px-2 py-1 rounded">
                                  {selectedSeller.code_prefix}-{String(parseInt(newCodeStart) + i).padStart(3, '0')}
                                </span>
                              ))}
                              {newCodeCount > 10 && (
                                <span className="text-sm text-muted-foreground">... in {newCodeCount - 10} več</span>
                              )}
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={handleAddCodes}
                          disabled={createCodes.isPending || !newCodeStart}
                          className="w-full"
                        >
                          {createCodes.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Dodaj {newCodeCount} {newCodeCount === 1 ? 'kodo' : 'kod'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Prodajalec nima nastavljene QR predpone. Nastavite jo v upravljanju računov.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Obstoječe proste kode ({freeCodes.length})</CardTitle>
                    <CardDescription>
                      QR kode, ki še niso bile dodeljene nobeni preprogi
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : freeCodes.length === 0 ? (
                      <div className="text-center py-8">
                        <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Ni prostih kod za tega prodajalca</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                        {freeCodes.map((code) => (
                          <div
                            key={code.id}
                            className="p-2 border rounded-lg text-center bg-green-50 dark:bg-green-950 border-green-300"
                          >
                            <p className="font-mono text-sm font-semibold">{code.code}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

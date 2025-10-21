import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import { supabase } from "@/integrations/supabase/client";

interface Seller {
  id: string;
  full_name: string;
  qr_prefix: string | null;
  qr_start_num: number | null;
  qr_end_num: number | null;
}

interface SellerStats {
  id: string;
  full_name: string;
  total_codes: number;
  active_codes: number;
}

export default function QRGenerator() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [selectedStatsId, setSelectedStatsId] = useState("");
  const [sellerStats, setSellerStats] = useState<SellerStats[]>([]);
  const [prefix, setPrefix] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(200);
  const [qrPerRow, setQrPerRow] = useState(3);
  const [printOption, setPrintOption] = useState("all");

  useEffect(() => {
    fetchSellers();
    fetchSellerStats();
  }, []);

  const fetchSellers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (rolesError) throw rolesError;

      const sellersData = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, qr_prefix, qr_start_num, qr_end_num')
          .eq('id', role.user_id)
          .single();
        
        return profile;
      }));

      setSellers(sellersData.filter(Boolean) as Seller[]);
    } catch (error: any) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchSellerStats = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'PRODAJALEC');

      if (rolesError) throw rolesError;

      const stats = await Promise.all((roles || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, qr_start_num, qr_end_num')
          .eq('id', role.user_id)
          .single();
        
        if (!profile) return null;

        // Count active doormats
        const { count, error: countError } = await supabase
          .from('doormats')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', profile.id);

        if (countError) throw countError;

        const totalCodes = profile.qr_end_num && profile.qr_start_num 
          ? profile.qr_end_num - profile.qr_start_num + 1 
          : 0;

        return {
          id: profile.id,
          full_name: profile.full_name,
          total_codes: totalCodes,
          active_codes: count || 0,
        };
      }));

      setSellerStats(stats.filter(Boolean) as SellerStats[]);
    } catch (error: any) {
      console.error('Error fetching seller stats:', error);
    }
  };

  const handleSellerChange = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    const seller = sellers.find(s => s.id === sellerId);
    if (seller?.qr_prefix) {
      setPrefix(seller.qr_prefix);
    }
  };

  const handleGenerateQrCodes = async () => {
    if (!selectedSellerId || !prefix) {
      return;
    }

    try {
      // Update seller's profile with QR code range
      const { error } = await supabase
        .from('profiles')
        .update({ 
          qr_prefix: prefix,
          qr_start_num: startNum,
          qr_end_num: endNum 
        })
        .eq('id', selectedSellerId);

      if (error) throw error;

      // Refresh stats after generating
      await fetchSellerStats();
      
      alert(`Generirano ${endNum - startNum + 1} QR kod za prodajalca`);
    } catch (error: any) {
      console.error('Error generating QR codes:', error);
      alert('Napaka pri generiranju QR kod');
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">QR Kod Generator</h1>

            {/* Statistika prodajalcev */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Statistika QR kod po prodajalcih</CardTitle>
                <CardDescription>
                  Pregled generiranih in aktivnih QR kod za vsakega prodajalca
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stats-seller">Izberi prodajalca</Label>
                  <Select value={selectedStatsId} onValueChange={setSelectedStatsId}>
                    <SelectTrigger id="stats-seller">
                      <SelectValue placeholder="Izberi prodajalca" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellerStats.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStatsId && (() => {
                  const stats = sellerStats.find(s => s.id === selectedStatsId);
                  return stats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-primary/5">
                        <p className="text-sm text-muted-foreground mb-1">Generirane kode</p>
                        <p className="text-3xl font-bold">{stats.total_codes}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-green-500/10">
                        <p className="text-sm text-muted-foreground mb-1">Aktivne kode</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.active_codes}</p>
                      </div>
                    </div>
                  ) : null;
                })()}

                {!selectedStatsId && (
                  <div className="text-center py-8 text-muted-foreground">
                    Izberite prodajalca za prikaz statistike
                  </div>
                )}
              </CardContent>
            </Card>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generiraj QR</TabsTrigger>
          <TabsTrigger value="review">Pregled QR Kod</TabsTrigger>
          <TabsTrigger value="print">Natisni QR</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generiraj QR kode</CardTitle>
              <CardDescription>
                Ustvari QR kode z začetnicami prodajalca (npr. RIS-001)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="seller">Prodajalec</Label>
                <Select value={selectedSellerId} onValueChange={handleSellerChange}>
                  <SelectTrigger id="seller">
                    <SelectValue placeholder="Izberi prodajalca" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name} {seller.qr_prefix && `(${seller.qr_prefix})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Kratica se bo avtomatsko nastavila glede na izbiro
                </p>
              </div>

              {prefix && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Izbrana kratica: <span className="text-lg font-bold">{prefix}</span></p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Od številke</Label>
                  <Input
                    id="start"
                    type="number"
                    value={startNum}
                    onChange={(e) => setStartNum(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Do številke</Label>
                  <Input
                    id="end"
                    type="number"
                    value={endNum}
                    onChange={(e) => setEndNum(Number(e.target.value))}
                    min={1}
                    max={200}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Primer: {prefix || "XXX"}-{String(startNum).padStart(3, "0")} do{" "}
                  {prefix || "XXX"}-{String(endNum).padStart(3, "0")}
                </p>
              </div>

              <Button 
                className="w-full"
                onClick={handleGenerateQrCodes}
                disabled={!selectedSellerId || !prefix}
              >
                Generiraj QR kode
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Pregled vseh QR kod</CardTitle>
              <CardDescription>
                Skupaj QR kod: 61 | Aktivnih: 31
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Prikaži</Label>
                <RadioGroup defaultValue="all">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">Vse</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active">Aktivne</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unused" id="unused" />
                    <Label htmlFor="unused">Proste</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <p className="font-medium">Prikazanih: 61</p>
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 15 }, (_, i) => (
                    <div key={i} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="font-medium">PRED-{String(i + 1).padStart(3, "0")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uporabljena: {Math.floor(Math.random() * 3)}x
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Reset
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print">
          <Card>
            <CardHeader>
              <CardTitle>Natisni QR kode</CardTitle>
              <CardDescription>Pripravi QR kode za tiskanje v PDF obliki</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Kaj želite natisniti?</Label>
                <RadioGroup value={printOption} onValueChange={setPrintOption}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="print-all" />
                    <Label htmlFor="print-all">Vse QR kode</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unused" id="print-unused" />
                    <Label htmlFor="print-unused">Samo proste QR kode</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="range" id="print-range" />
                    <Label htmlFor="print-range">Določen razpon</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm">Za tiskanje: 61 QR kod</p>
              </div>

              <div className="space-y-2">
                <Label>QR kod na vrstico: {qrPerRow}</Label>
                <Slider
                  value={[qrPerRow]}
                  onValueChange={(value) => setQrPerRow(value[0])}
                  min={1}
                  max={6}
                  step={1}
                />
              </div>

              <Button className="w-full">Generiraj PDF za tiskanje</Button>
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

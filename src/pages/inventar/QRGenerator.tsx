import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";

export default function QRGenerator() {
  const [prefix, setPrefix] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(200);
  const [qrPerRow, setQrPerRow] = useState(3);
  const [printOption, setPrintOption] = useState("all");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">QR Kod Generator</h1>

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
                <Label htmlFor="prefix">Začetnice kode</Label>
                <Input
                  id="prefix"
                  placeholder="RIS"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  maxLength={3}
                />
                <p className="text-sm text-muted-foreground">
                  Vnesite 3 črke (npr. prve 3 črke priimka)
                </p>
              </div>

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

              <Button className="w-full">Generiraj QR kode</Button>
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

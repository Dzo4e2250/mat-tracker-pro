# Admin Panel - Podrobne specifikacije funkcij

Ta dokument vsebuje podrobne specifikacije za vse načrtovane funkcije admin panela.

---

## 1. Dashboard Analytics

### Pregled
Centraliziran pregled ključnih poslovnih metrik z vizualnimi grafi in kartami.

### Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ ANALYTICS DASHBOARD                                    [Export] │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│ │  Active   │ │ On Test   │ │Conversion │ │  Revenue  │        │
│ │   156     │ │    47     │ │   68%     │ │ €12,450   │        │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
│                                                                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ Monthly Cycles              │ │ Status Distribution         │ │
│ │ [Line chart - 12 months]    │ │ [Pie chart - statusi]       │ │
│ │                             │ │                             │ │
│ │                             │ │                             │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ Top Sellers                 │ │ Expiring Tests              │ │
│ │ 1. Janez Novak     45      │ │ ! GEO-001 - danes           │ │
│ │ 2. Ana Kovač       38      │ │ ! GEO-015 - 1 dan           │ │
│ │ 3. Peter Horvat    32      │ │ ! GEO-023 - 2 dni           │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Komponente

#### KPICards.tsx
```typescript
interface KPI {
  label: string;
  value: number | string;
  change?: number;        // % sprememba od prejšnjega obdobja
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

const kpis: KPI[] = [
  { label: 'Aktivni cikli', value: 156, change: 12, changeType: 'positive', icon: <Package /> },
  { label: 'Na testu', value: 47, change: -3, changeType: 'negative', icon: <TestTube /> },
  { label: 'Konverzija', value: '68%', change: 5, changeType: 'positive', icon: <TrendingUp /> },
  { label: 'Mesečni prihodek', value: '€12,450', change: 8, changeType: 'positive', icon: <Euro /> },
];
```

#### SalesChart.tsx (Recharts)
```typescript
// Podatki za graf
interface MonthlyData {
  month: string;      // 'Jan', 'Feb', ...
  newTests: number;   // Novi testi
  contracts: number;  // Podpisane pogodbe
  expired: number;    // Potekli testi
}

// Recharts LineChart
<LineChart data={monthlyData}>
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="newTests" stroke="#3B82F6" />
  <Line type="monotone" dataKey="contracts" stroke="#22C55E" />
  <Line type="monotone" dataKey="expired" stroke="#EF4444" />
</LineChart>
```

#### CycleStatusChart.tsx
```typescript
// Pie chart za distribucijo statusov
const statusData = [
  { name: 'Na testu', value: 47, color: '#3B82F6' },
  { name: 'Čisti', value: 89, color: '#22C55E' },
  { name: 'Umazani', value: 12, color: '#F59E0B' },
  { name: 'Čaka šoferja', value: 8, color: '#8B5CF6' },
];
```

### Supabase Queries
```sql
-- KPI: Aktivni cikli
SELECT COUNT(*) FROM mat_tracker.cycles
WHERE status NOT IN ('completed', 'cancelled');

-- KPI: Konverzija (test → pogodba)
SELECT
  ROUND(
    COUNT(CASE WHEN contract_signed THEN 1 END)::DECIMAL /
    COUNT(*)::DECIMAL * 100, 1
  ) as conversion_rate
FROM mat_tracker.cycles
WHERE status != 'available' AND created_at > NOW() - INTERVAL '90 days';

-- Monthly data
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_cycles,
  COUNT(CASE WHEN contract_signed THEN 1 END) as contracts
FROM mat_tracker.cycles
WHERE created_at > NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Top sellers
SELECT
  p.full_name,
  COUNT(c.id) as total_cycles,
  COUNT(CASE WHEN c.contract_signed THEN 1 END) as contracts
FROM mat_tracker.profiles p
LEFT JOIN mat_tracker.cycles c ON c.salesperson_id = p.id
WHERE p.role = 'salesperson'
GROUP BY p.id, p.full_name
ORDER BY contracts DESC
LIMIT 10;
```

---

## 2. Auto Reminders

### Pregled
Avtomatski email opomniki za prodajalce in inventar.

### Tipi opomnikov

| Tip | Prejemnik | Kdaj | Frekvenca |
|-----|-----------|------|-----------|
| Test poteče kmalu | Prodajalec | 3 dni pred | Enkrat |
| Test poteče danes | Prodajalec | Na dan poteka | Enkrat |
| Test je potekel | Prodajalec | Po poteku | Dnevno |
| Follow-up due | Prodajalec | Po 7 dneh neaktivnosti | Enkrat |
| Veliko čakajočih | Inventar | >10 waiting_driver | Dnevno |

### Edge Function: send-reminder-emails

```typescript
// supabase/functions/send-reminder-emails/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Najdi teste ki potečejo v 3 dneh
  const { data: expiringTests } = await supabase
    .from("cycles")
    .select(`
      id,
      qr_code:qr_codes(code),
      company:companies(name),
      salesperson:profiles!salesperson_id(full_name, email),
      test_start_date
    `)
    .eq("status", "on_test")
    .lt("test_start_date", new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()) // 14 - 3 = 11 dni
    .gt("test_start_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  // 2. Preveri ali je bil reminder že poslan
  for (const test of expiringTests || []) {
    const { data: existingReminder } = await supabase
      .from("sent_reminders")
      .select("id")
      .eq("cycle_id", test.id)
      .eq("reminder_type", "test_expiring_3d")
      .single();

    if (!existingReminder) {
      // Pošlji email
      await sendEmail({
        to: test.salesperson.email,
        subject: `Test poteče čez 3 dni: ${test.qr_code.code}`,
        html: generateTestExpiringEmail(test),
      });

      // Shrani reminder
      await supabase.from("sent_reminders").insert({
        cycle_id: test.id,
        reminder_type: "test_expiring_3d",
        email_to: test.salesperson.email,
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Email Templates

```html
<!-- templates/test-expiring.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0; }
    .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { background: #F3F4F6; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Mat Tracker Pro</h1>
  </div>
  <div class="content">
    <h2>Test poteče čez {{days_remaining}} dni</h2>

    <div class="warning">
      <strong>{{qr_code}}</strong> pri <strong>{{company_name}}</strong> poteče {{expiry_date}}.
    </div>

    <p>Prosimo, kontaktiraj stranko in:</p>
    <ul>
      <li>Podaljšaj test (+7 dni)</li>
      <li>Poberi predpražnik (status: dirty)</li>
      <li>Podpiši pogodbo</li>
    </ul>

    <p style="text-align: center; margin-top: 30px;">
      <a href="{{app_url}}/prodajalec" class="button">Odpri aplikacijo</a>
    </p>
  </div>
  <div class="footer">
    Mat Tracker Pro - Lindstrom Group Slovenija
  </div>
</body>
</html>
```

### Admin UI za nastavitve opomnikov

```
┌─────────────────────────────────────────────────────────────────┐
│ NASTAVITVE OPOMNIKOV                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Test poteče kmalu                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [x] Omogočeno          Dni pred potekom: [3] ▼              │ │
│ │ [x] Email              [ ] Push notifikacija                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Test poteče danes                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [x] Omogočeno                                               │ │
│ │ [x] Email              [x] Push notifikacija                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Follow-up reminder                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [x] Omogočeno          Dni neaktivnosti: [7] ▼              │ │
│ │ [x] Email              [ ] Push notifikacija                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                        [Shrani nastavitve]      │
└─────────────────────────────────────────────────────────────────┘
```

### Cron Job Setup (pg_cron)

```sql
-- Omogoči pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Dnevno ob 8:00 CET
SELECT cron.schedule(
  'send-daily-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://api-matpro.ristov.xyz/functions/v1/send-reminder-emails',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  )
  $$
);
```

---

## 3. Advanced Map + Route Optimization

### Pregled
Pametno načrtovanje poti za šoferje s optimizacijo vrstnega reda postaj.

### Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ NAČRTOVANJE POTI                           [Nova pot] [Izvoz]  │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌───────────────────────────────┐ │
│ │ FILTRI                    │ │                               │ │
│ │                           │ │     [LEAFLET MAP]             │ │
│ │ Prodajalec: [Vsi      ▼]  │ │                               │ │
│ │ Status: [waiting_driver▼]  │ │   A ──── B                   │ │
│ │ Regija: [Vsa        ▼]    │ │    \    /                     │ │
│ │                           │ │     \  /                      │ │
│ │ [Išči]                    │ │      C                        │ │
│ │                           │ │       \                       │ │
│ │ Najdeno: 12 lokacij       │ │        D                      │ │
│ │                           │ │                               │ │
│ │ ┌───────────────────────┐ │ │                               │ │
│ │ │ [x] GEO-001 Ljubljana │ │ │                               │ │
│ │ │ [x] GEO-015 Maribor   │ │ │                               │ │
│ │ │ [x] GEO-023 Celje     │ │ └───────────────────────────────┘ │
│ │ │ [ ] GEO-045 Kranj     │ │                                   │
│ │ └───────────────────────┘ │ OPTIMIZIRANA POT:                 │
│ │                           │ ┌───────────────────────────────┐ │
│ │ [Optimiziraj pot]         │ │ 1. Start: Skladišče           │ │
│ └───────────────────────────┘ │ 2. GEO-001 - Ljubljana        │ │
│                               │    15 min, 12 km              │ │
│                               │ 3. GEO-023 - Celje            │ │
│                               │    45 min, 58 km              │ │
│                               │ 4. GEO-015 - Maribor          │ │
│                               │    30 min, 42 km              │ │
│                               │ 5. Konec: Skladišče           │ │
│                               │                               │ │
│                               │ Skupaj: 2h 15min, 156 km      │ │
│                               └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### OpenRouteService API

```typescript
// src/hooks/useRouteOptimization.ts
interface Location {
  id: string;
  lat: number;
  lng: number;
  address: string;
  qrCode: string;
  companyName: string;
}

interface OptimizedRoute {
  stops: Array<{
    location: Location;
    arrivalTime: number;  // minutes from start
    distanceFromPrev: number;  // km
    durationFromPrev: number;  // minutes
  }>;
  totalDistance: number;
  totalDuration: number;
  geometry: string;  // polyline
}

async function optimizeRoute(
  locations: Location[],
  startPoint: [number, number]
): Promise<OptimizedRoute> {
  const response = await fetch(
    "https://api.openrouteservice.org/v2/optimization",
    {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobs: locations.map((loc, i) => ({
          id: i + 1,
          location: [loc.lng, loc.lat],
          service: 300,  // 5 min na postaji
        })),
        vehicles: [{
          id: 1,
          profile: "driving-car",
          start: startPoint,
          end: startPoint,
          capacity: [locations.length],
        }],
      }),
    }
  );

  const data = await response.json();
  return transformResponse(data, locations);
}
```

### PDF Izvoz

```typescript
// PDF za šoferja z optimizirano potjo
function generateRouteListPDF(route: OptimizedRoute): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Seznam prevzemov", 20, 20);
  doc.setFontSize(10);
  doc.text(`Datum: ${new Date().toLocaleDateString('sl-SI')}`, 20, 28);
  doc.text(`Skupna razdalja: ${route.totalDistance} km`, 20, 34);
  doc.text(`Ocenjen čas: ${Math.round(route.totalDuration / 60)}h ${route.totalDuration % 60}min`, 20, 40);

  let y = 55;
  route.stops.forEach((stop, i) => {
    doc.setFontSize(12);
    doc.text(`${i + 1}. ${stop.location.companyName}`, 20, y);
    doc.setFontSize(10);
    doc.text(stop.location.address, 25, y + 5);
    doc.text(`QR: ${stop.location.qrCode}`, 25, y + 10);
    if (i > 0) {
      doc.text(`${stop.distanceFromPrev} km, ${stop.durationFromPrev} min`, 150, y + 5);
    }
    y += 20;
  });

  return doc;
}
```

---

## 4. Financial Reporting

### Pregled
Finančni pregledi z grafi in izvozom v Excel.

### Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ FINANČNA POROČILA                    Obdobje: [Jan 2026   ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌───────────────────────────────┐ │
│ │ MESEČNI PRIHODKI          │ │ PRIHODKI PO PRODAJALCIH       │ │
│ │                           │ │                               │ │
│ │ [Bar chart - 12 mesecev]  │ │ Janez Novak      €4,250       │ │
│ │                           │ │ ████████████████████          │ │
│ │                           │ │ Ana Kovač        €3,890       │ │
│ │                           │ │ ██████████████████            │ │
│ │                           │ │ Peter Horvat     €2,450       │ │
│ │ Skupaj 2025: €145,230     │ │ ████████████                  │ │
│ └───────────────────────────┘ └───────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ NAPOVED PRIHODKOV (naslednji 3 meseci)                      │ │
│ │                                                             │ │
│ │ Mesec      | Aktivne pogodbe | Testi→Pogodbe | Skupaj      │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Feb 2026   | €12,450         | €2,100 (est)  | €14,550     │ │
│ │ Mar 2026   | €12,450         | €2,800 (est)  | €15,250     │ │
│ │ Apr 2026   | €12,450         | €3,200 (est)  | €15,650     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Izvoz Excel] [Izvoz PDF]          │
└─────────────────────────────────────────────────────────────────┘
```

### Izračun prihodkov

```typescript
// src/hooks/useFinancialData.ts
interface FinancialData {
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  currentMonthRevenue: number;
  forecastedRevenue: number;
  revenueBySellar: Array<{ name: string; revenue: number }>;
}

async function calculateMonthlyRevenue(): Promise<number> {
  // 1. Pridobi vse aktivne pogodbe
  const { data: contracts } = await supabase
    .from('cycles')
    .select(`
      id,
      mat_type:mat_types(monthly_price),
      cleaning_frequency
    `)
    .eq('contract_signed', true)
    .in('status', ['on_test', 'clean', 'dirty', 'waiting_driver']);

  // 2. Izračunaj mesečni prihodek
  let total = 0;
  for (const contract of contracts || []) {
    const monthlyPrice = contract.mat_type.monthly_price;
    const frequency = contract.cleaning_frequency || 4; // 4x mesečno default
    total += monthlyPrice * frequency;
  }

  return total;
}

async function forecastRevenue(months: number): Promise<number[]> {
  // Izračunaj konverzijo za zadnje 3 mesece
  const { data } = await supabase
    .from('cycles')
    .select('id, contract_signed')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  const conversionRate = data?.filter(c => c.contract_signed).length / (data?.length || 1);

  // Število aktivnih testov
  const { count: activeTests } = await supabase
    .from('cycles')
    .select('id', { count: 'exact' })
    .eq('status', 'on_test');

  // Povprečna vrednost pogodbe
  const avgContractValue = 85; // €/mesec

  // Napoved
  const forecasts: number[] = [];
  for (let i = 1; i <= months; i++) {
    const newContracts = Math.round((activeTests || 0) * conversionRate * (i * 0.3));
    const baseRevenue = await calculateMonthlyRevenue();
    forecasts.push(baseRevenue + (newContracts * avgContractValue));
  }

  return forecasts;
}
```

### Excel Export

```typescript
import * as XLSX from 'xlsx';

function exportFinancialReport(data: FinancialData): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Mesečni prihodki
  const revenueSheet = XLSX.utils.json_to_sheet(data.monthlyRevenue);
  XLSX.utils.book_append_sheet(wb, revenueSheet, 'Mesečni prihodki');

  // Sheet 2: Po prodajalcih
  const sellerSheet = XLSX.utils.json_to_sheet(data.revenueBySellar);
  XLSX.utils.book_append_sheet(wb, sellerSheet, 'Po prodajalcih');

  // Sheet 3: Napoved
  const forecastSheet = XLSX.utils.json_to_sheet([
    { month: 'Feb 2026', forecast: '€14,550' },
    { month: 'Mar 2026', forecast: '€15,250' },
    { month: 'Apr 2026', forecast: '€15,650' },
  ]);
  XLSX.utils.book_append_sheet(wb, forecastSheet, 'Napoved');

  XLSX.writeFile(wb, `financno-porocilo-${new Date().toISOString().slice(0,7)}.xlsx`);
}
```

---

## 5. Price Management UI

### Pregled
Admin vmesnik za upravljanje cenika predpražnikov.

### Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│ UPRAVLJANJE CENIKA                              [+ Nova cena]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Filter: [Vsi tipi      ▼]  Tip cene: [Vse      ▼]              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tip           | Mesečni najem | Sezonski | Nakup | Akcije   │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ GEO 60x90     | €45,00       | €38,00   | €180  | [✏️] [📋]│ │
│ │ GEO 90x150    | €65,00       | €55,00   | €280  | [✏️] [📋]│ │
│ │ GEO 115x180   | €85,00       | €72,00   | €380  | [✏️] [📋]│ │
│ │ LOGO 60x90    | €55,00       | €47,00   | €220  | [✏️] [📋]│ │
│ │ ...           | ...          | ...      | ...   | ...      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Legenda: [✏️] Uredi  [📋] Zgodovina cen                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ UREDI CENO - GEO 60x90                                   [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Mesečni najem                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Trenutna cena: €45,00                                       │ │
│ │ Nova cena:     [________] €                                 │ │
│ │ Velja od:      [01.02.2026] 📅                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Sezonski najem                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Trenutna cena: €38,00                                       │ │
│ │ Nova cena:     [________] €                                 │ │
│ │ Velja od:      [01.02.2026] 📅                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Prekliči]  [Shrani spremembe]     │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Tabela cen z zgodovino
CREATE TABLE mat_tracker.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mat_type_id UUID NOT NULL REFERENCES mat_tracker.mat_types(id),
  price_type TEXT NOT NULL CHECK (price_type IN ('monthly', 'seasonal', 'purchase')),
  price DECIMAL(10,2) NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unikaten indeks: en aktiven cenik na tip
  CONSTRAINT unique_active_price UNIQUE (mat_type_id, price_type, valid_to)
);

-- View za trenutne cene
CREATE VIEW mat_tracker.current_prices AS
SELECT DISTINCT ON (mat_type_id, price_type)
  mat_type_id,
  price_type,
  price
FROM mat_tracker.prices
WHERE valid_from <= CURRENT_DATE
  AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
ORDER BY mat_type_id, price_type, valid_from DESC;
```

---

## 6. Roles & Permissions

### Pregled
Fleksibilen sistem vlog in dovoljenj.

### Preddefinirane vloge

| Vloga | Opis | Privzeta dovoljenja |
|-------|------|---------------------|
| `admin` | Administrator | Vse |
| `inventar` | Upravljalec inventarja | view_*, manage_qr, manage_drivers, view_reports |
| `salesperson` | Prodajalec | view_own_cycles, create_cycle, view_contacts |
| `driver` | Šofer | view_pickups, complete_pickup |
| `viewer` | Samo pogled | view_* |

### Dovoljenja

```typescript
const PERMISSIONS = {
  // Cikli
  'view_all_cycles': 'Pregled vseh ciklov',
  'view_own_cycles': 'Pregled lastnih ciklov',
  'create_cycle': 'Ustvarjanje ciklov',
  'edit_cycle': 'Urejanje ciklov',
  'delete_cycle': 'Brisanje ciklov',

  // Kontakti
  'view_all_contacts': 'Pregled vseh kontaktov',
  'view_own_contacts': 'Pregled lastnih kontaktov',
  'create_contact': 'Ustvarjanje kontaktov',
  'edit_contact': 'Urejanje kontaktov',

  // QR kode
  'manage_qr': 'Upravljanje QR kod',
  'assign_qr': 'Dodeljevanje QR kod',
  'print_qr': 'Tiskanje QR kod',

  // Uporabniki
  'manage_users': 'Upravljanje uporabnikov',
  'manage_roles': 'Upravljanje vlog',

  // Poročila
  'view_analytics': 'Pregled analitike',
  'view_financial': 'Pregled financ',
  'export_reports': 'Izvoz poročil',

  // Šoferji
  'manage_drivers': 'Upravljanje šoferjev',
  'view_pickups': 'Pregled prevzemov',
  'complete_pickup': 'Zaključevanje prevzemov',

  // Cene
  'manage_prices': 'Upravljanje cenika',

  // Nastavitve
  'manage_settings': 'Sistemske nastavitve',
};
```

### Permission Hook

```typescript
// src/hooks/usePermissions.ts
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export function usePermission(permission: string): boolean {
  const { user } = useAuth();

  const { data: permissions } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_permissions_view')  // View ki združi user → role → permissions
        .select('permission_name')
        .eq('user_id', user?.id);
      return data?.map(p => p.permission_name) || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,  // Cache za 5 min
  });

  return permissions?.includes(permission) ?? false;
}

export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { user } = useAuth();

  const { data: userPermissions } = useQuery({
    queryKey: ['user-permissions', user?.id],
    // ... same as above
  });

  return Object.fromEntries(
    permissions.map(p => [p, userPermissions?.includes(p) ?? false])
  );
}

// Uporaba v komponenti
function AnalyticsPage() {
  const canView = usePermission('view_analytics');
  const canExport = usePermission('export_reports');

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1>Analytics</h1>
      {canExport && <ExportButton />}
    </div>
  );
}
```

### Admin UI

```
┌─────────────────────────────────────────────────────────────────┐
│ UPRAVLJANJE VLOG                                  [+ Nova vloga]│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────────────┐ │
│ │ VLOGE               │ │ DOVOLJENJA ZA: Inventar            │ │
│ │                     │ │                                     │ │
│ │ ▸ Admin         (1) │ │ Cikli                               │ │
│ │ ● Inventar      (3) │ │ [x] Pregled vseh ciklov             │ │
│ │ ▸ Prodajalec   (12) │ │ [x] Ustvarjanje ciklov              │ │
│ │ ▸ Šofer        (2)  │ │ [x] Urejanje ciklov                 │ │
│ │ ▸ Viewer       (5)  │ │ [ ] Brisanje ciklov                 │ │
│ │                     │ │                                     │ │
│ │                     │ │ QR kode                             │ │
│ │                     │ │ [x] Upravljanje QR kod              │ │
│ │                     │ │ [x] Dodeljevanje QR kod             │ │
│ │                     │ │ [x] Tiskanje QR kod                 │ │
│ │                     │ │                                     │ │
│ │                     │ │ Poročila                            │ │
│ │                     │ │ [x] Pregled analitike               │ │
│ │                     │ │ [ ] Pregled financ                  │ │
│ │                     │ │ [x] Izvoz poročil                   │ │
│ │                     │ │                                     │ │
│ └─────────────────────┘ └─────────────────────────────────────┘ │
│                                                                 │
│ UPORABNIKI Z VLOGO: Inventar (3)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Marko Kovač       marko@example.com         [Odstrani]      │ │
│ │ Jana Novak        jana@example.com          [Odstrani]      │ │
│ │ Luka Horvat       luka@example.com          [Odstrani]      │ │
│ │                                                             │ │
│ │ [+ Dodaj uporabnika]                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Real-time Notifications

### Pregled
Sistem notifikacij v aplikaciji z zvoncem in dropdown menijem.

### Wireframe
```
┌──────────────────────┐
│ 🔔 (3)               │  ← Badge s številom nepre­branih
└──────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ OBVESTILA                    [Vse]  │
├─────────────────────────────────────┤
│ ● Danes                             │
│ ┌─────────────────────────────────┐ │
│ │ ⚠️ Test GEO-001 poteče danes    │ │
│ │    Stranka: ABC d.o.o.          │ │
│ │    pred 2 urama                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ✅ Nova pogodba podpisana       │ │
│ │    XYZ d.o.o. - GEO-015        │ │
│ │    pred 4 urami                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ○ Včeraj                            │
│ ┌─────────────────────────────────┐ │
│ │ 📦 Novo naročilo QR kod         │ │
│ │    Janez Novak - 50 kod        │ │
│ │    včeraj ob 14:30             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Označi vse kot prebrano]          │
└─────────────────────────────────────┘
```

### Supabase Realtime Integration

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Unread count
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'mat_tracker',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Prikaži toast
          const notification = payload.new as Notification;
          toast(notification.title, {
            description: notification.message,
          });

          // Osveži query
          queryClient.invalidateQueries(['notifications', user.id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    queryClient.invalidateQueries(['notifications', user?.id]);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);
    queryClient.invalidateQueries(['notifications', user?.id]);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
```

### Trigger za ustvarjanje notifikacij

```sql
-- Trigger za nove notifikacije ob poteku testa
CREATE OR REPLACE FUNCTION mat_tracker.notify_test_expiring()
RETURNS TRIGGER AS $$
BEGIN
  -- Če se status spremeni na on_test, preveri datum
  IF NEW.status = 'on_test' AND NEW.test_start_date IS NOT NULL THEN
    -- Ustvari notifikacijo če test poteče v 3 dneh
    IF NEW.test_start_date + INTERVAL '11 days' <= NOW() THEN
      INSERT INTO mat_tracker.notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        NEW.salesperson_id,
        'Test poteče kmalu',
        'Test ' || (SELECT code FROM mat_tracker.qr_codes WHERE id = NEW.qr_code_id) || ' poteče v 3 dneh.',
        'warning',
        '/prodajalec?view=home'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_test_expiring
  AFTER UPDATE ON mat_tracker.cycles
  FOR EACH ROW
  EXECUTE FUNCTION mat_tracker.notify_test_expiring();
```

---

*Posodobljeno: 2026-01-18*

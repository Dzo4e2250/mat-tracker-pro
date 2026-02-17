# Faza 4: Statistika in analitika

## Cilj
Prilagojena statistika za prodajalca oblacil: pregled uspesnosti, prihodkov, primerjava obdobij.

**Predpogoj:** Faza 2 (ponudbe) + Faza 3 (narocila)

---

## 4.1 Hook: useClothingStats

**Datoteka:** `src/hooks/useClothingStats.ts`

```ts
interface ClothingStats {
  // Ponudbe
  totalOffers: number;
  offersThisMonth: number;
  offersTotalAmount: number;
  conversionRate: number;          // accepted / (sent + accepted + rejected) * 100

  // Narocila
  totalOrders: number;
  ordersThisMonth: number;
  ordersTotalAmount: number;
  ordersThisMonthAmount: number;
  averageOrderValue: number;

  // Stranke
  totalClients: number;
  newClientsThisMonth: number;
  activeClients: number;           // stranke z narocilom v zadnjih 90 dneh

  // Po mesecih (za graf)
  monthlyRevenue: { month: string; amount: number }[];
  monthlyOrders: { month: string; count: number }[];
  monthlyOffers: { month: string; sent: number; accepted: number; rejected: number }[];
}

// Queries
useClothingStats(userId: string, year?: number)           // Letna statistika
useClothingMonthlyStats(userId: string, year: number)     // Mesecna razdelitev
useClothingTopClients(userId: string, limit?: number)     // Top stranke po prihodku
useClothingProductStats(userId: string)                   // Najprodajanejsi izdelki
```

---

## 4.2 Komponenta: OblekStatisticsView

**Datoteka:** `src/pages/prodajalec/components/OblekStatisticsView.tsx`

### Wireframe:
```
+------------------------------------------+
|  Statistika                 [2026 v]     |
+------------------------------------------+
|  ┌──────────┐ ┌──────────┐ ┌──────────┐ |
|  │ Ponudbe  │ │ Narocila │ │ Prihodek │ |
|  │    45    │ │    28    │ │ 34.500 E │ |
|  │ +12% ▲  │ │  +8% ▲  │ │ +15% ▲  │ |
|  └──────────┘ └──────────┘ └──────────┘ |
+------------------------------------------+
|  ┌──────────────────────────┐            |
|  │  Mesecni prihodki (graf) │            |
|  │  ▓▓▓                    │            |
|  │  ▓▓▓ ▓▓                 │            |
|  │  ▓▓▓ ▓▓ ▓▓▓▓            │            |
|  │  Jan Feb Mar Apr ...     │            |
|  └──────────────────────────┘            |
+------------------------------------------+
|  ┌─────────────────┐ ┌────────────────┐ |
|  │ Conversion rate │ │ Top stranke    │ |
|  │                 │ │                │ |
|  │  62.2%          │ │ 1. ABC - 8.5k │ |
|  │  ████████░░     │ │ 2. XYZ - 6.2k │ |
|  │  28/45 ponudb   │ │ 3. DEF - 4.1k │ |
|  └─────────────────┘ └────────────────┘ |
+------------------------------------------+
|  ┌──────────────────────────────────┐    |
|  │ Najprodajanejsi izdelki          │    |
|  │ 1. Delovna jakna Classic - 85 kos│    |
|  │ 2. Polo majica Basic - 120 kos  │    |
|  │ 3. Delovne hlace Worker - 65 kos│    |
|  └──────────────────────────────────┘    |
+------------------------------------------+
```

### Komponente za uporabo:
- `recharts` knjiznica (ze v projektu - uporablja se v Analytics)
- shadcn Card, Badge komponente
- Obstoject vzorec iz `src/pages/inventar/Analytics.tsx`

---

## 4.3 Primerjava obdobij

Vsak KPI widget prikazuje primerjavo s prejsnjim obdobjem:
- **Mesecna primerjava:** ta mesec vs prejsnji mesec
- **Letna primerjava:** letos vs lani (isti meseci)
- Prikazano kot % sprememba z ▲/▼ ikono in zeleno/rdeco barvo

---

## 4.4 Integracija

### ViewType:
```ts
| 'oblekStats'
```

### SideMenu:
```
- Statistika (oblekStats) - ikona: TrendingUp
```

---

## 4.5 Seznam datotek

| Datoteka | Tip | Opis |
|---|---|---|
| `src/hooks/useClothingStats.ts` | Nov | Statisticni poizvedbe |
| `src/pages/prodajalec/components/OblekStatisticsView.tsx` | Nov | Glavna stran |
| `src/pages/prodajalec/components/stats/RevenueChart.tsx` | Nov | Mesecni prihodki graf |
| `src/pages/prodajalec/components/stats/ConversionWidget.tsx` | Nov | Conversion rate |
| `src/pages/prodajalec/components/stats/TopClientsWidget.tsx` | Nov | Top stranke |
| `src/pages/prodajalec/components/stats/TopProductsWidget.tsx` | Nov | Top izdelki |
| `src/pages/prodajalec/types.ts` | Edit | Dodaj oblekStats |
| Nav komponente | Edit | Dodaj v meni |

### Brez DB migracij
Vse statistike se izracunajo iz obstojecih tabel (`clothing_offers`, `clothing_orders`, `companies`).

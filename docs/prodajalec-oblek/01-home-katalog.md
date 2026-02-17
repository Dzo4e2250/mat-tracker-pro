# Faza 1: Domaca stran + Katalog izdelkov

## Cilj
Prodajalec oblek dobi lastno domaco stran (namesto praznega Kanban widgeta) in dostop do kataloga oblacil s cenami.

---

## 1.1 DB migracija - Katalog izdelkov

```sql
-- Katalog oblacil
CREATE TABLE mat_tracker.clothing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,        -- artikelna sifra (npr. "JK-001")
  name VARCHAR(255) NOT NULL,              -- naziv (npr. "Delovna jakna Classic")
  category VARCHAR(100) NOT NULL,          -- kategorija: 'jakne', 'hlace', 'majice', 'obutev', 'dodatki'
  subcategory VARCHAR(100),                -- podkategorija: 'zimska', 'letna', 'celoletna'
  description TEXT,
  sizes JSONB DEFAULT '[]',               -- dostopne velikosti: ["S","M","L","XL","XXL"]
  colors JSONB DEFAULT '[]',              -- dostopne barve: ["crna","modra","rdeca"]
  material VARCHAR(255),                   -- material: "100% poliester"
  price_unit DECIMAL(10,2) NOT NULL,       -- cena za kos (brez DDV)
  price_bulk_10 DECIMAL(10,2),             -- cena pri 10+ kosih
  price_bulk_50 DECIMAL(10,2),             -- cena pri 50+ kosih
  price_bulk_100 DECIMAL(10,2),            -- cena pri 100+ kosih
  min_order_qty INTEGER DEFAULT 1,
  image_url TEXT,                          -- URL slike izdelka
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE mat_tracker.clothing_products ENABLE ROW LEVEL SECURITY;

-- Vsi prijavljeni uporabniki lahko berejo katalog
CREATE POLICY "clothing_products_read" ON mat_tracker.clothing_products
  FOR SELECT USING (true);

-- Samo admin/inventar lahko ureja katalog
CREATE POLICY "clothing_products_write" ON mat_tracker.clothing_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inventar')
    )
  );

-- Index za hitro iskanje
CREATE INDEX idx_clothing_products_category ON mat_tracker.clothing_products(category);
CREATE INDEX idx_clothing_products_active ON mat_tracker.clothing_products(is_active);
```

---

## 1.2 TypeScript tipi

Dodaj v `src/integrations/supabase/types.ts`:

```ts
clothing_products: {
  Row: {
    id: string
    code: string
    name: string
    category: string
    subcategory: string | null
    description: string | null
    sizes: string[]
    colors: string[]
    material: string | null
    price_unit: number
    price_bulk_10: number | null
    price_bulk_50: number | null
    price_bulk_100: number | null
    min_order_qty: number
    image_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: { ... }
  Update: { ... }
  Relationships: []
}
```

---

## 1.3 Hook: useClothingProducts

**Datoteka:** `src/hooks/useClothingProducts.ts`

```ts
// Potrebne funkcije:
useClothingProducts(category?: string)   // Seznam vseh aktivnih izdelkov, opcijsko filtrirano
useClothingProduct(id: string)           // Posamezen izdelek
useCreateClothingProduct()               // Ustvari nov izdelek (admin only)
useUpdateClothingProduct()               // Posodobi izdelek (admin only)
useDeleteClothingProduct()               // Deaktiviraj izdelek (admin only)
```

---

## 1.4 Komponenta: OblekHomeView

**Datoteka:** `src/pages/prodajalec/components/OblekHomeView.tsx`

### Wireframe:
```
+------------------------------------------+
|  Dobrodosli, [Ime]          [datum]      |
+------------------------------------------+
|                                          |
|  [Ponudbe ta mesec]  [Narocila]  [Stranke] |
|      12                 5          28     |
|                                          |
+------------------------------------------+
|  Danasnji opomniki (iz reminders)        |
|  - Poklicati ABC d.o.o. ob 10:00        |
|  - Pripraviti ponudbo za XYZ            |
+------------------------------------------+
|  Zadnje aktivnosti (iz company_notes)    |
|  - Danes: Sestanek z Firma d.o.o.       |
|  - Vceraj: Poslana ponudba Podjetje     |
+------------------------------------------+
```

### Podatki:
- Statistika: query na `clothing_offers` (F2) in `clothing_orders` (F3) - v F1 prikazemo samo stevec strank
- Opomniki: obstoject `useReminders` hook (ze deluje)
- Aktivnosti: obstoject `useCompanyNotes` hook (ze deluje)

### Zacasna implementacija (pred F2/F3):
V Fazi 1, ko ponudbe in narocila se ne obstajajo, prikazemo:
- Stevilo strank (iz companies)
- Danasnje naloge (iz tasks)
- Opomniki
- Zadnje aktivnosti

---

## 1.5 Komponenta: OblekCatalogView

**Datoteka:** `src/pages/prodajalec/components/OblekCatalogView.tsx`

Katalog izdelkov za brskanje (read-only za prodajalca):

### Wireframe:
```
+------------------------------------------+
|  Katalog oblacil                [Isci]   |
+------------------------------------------+
|  [Vse] [Jakne] [Hlace] [Majice] [Obutev]|
+------------------------------------------+
|  +--------+  +--------+  +--------+     |
|  | [slika]|  | [slika]|  | [slika]|     |
|  | Jakna  |  | Hlace  |  | Polo   |     |
|  | Classic |  | Worker |  | Basic  |     |
|  | 45.00E |  | 32.00E |  | 18.00E |     |
|  | S-XXL  |  | S-XXL  |  | S-XXXL |     |
|  +--------+  +--------+  +--------+     |
+------------------------------------------+
```

### Funkcionalnosti:
- Grid prikaz izdelkov s sliko, imenom, ceno
- Filtriranje po kategoriji (tabs)
- Iskanje po imenu/kodi
- Klik na izdelek odpre detail modal z vsemi podatki + cenami po kolicinah

---

## 1.6 Integracija v ProdajalecDashboard

### ViewType razsiritev:
```ts
// src/pages/prodajalec/types.ts
export type ViewType = 'home' | 'scan' | 'map' | 'history' | 'statistics'
  | 'oblekHome' | 'oblekCatalog';
```

### ProdajalecDashboard.tsx:
```tsx
// Default view
const [view, setView] = useState<ViewType | 'scan' | 'home'>(() => {
  if (activeRole === 'prodajalec_oblek') return 'oblekHome';
  return 'home';
});

// Renderiranje
{view === 'oblekHome' && <OblekHomeView userId={user?.id} />}
{view === 'oblekCatalog' && <OblekCatalogView />}
```

### SideMenu.tsx - dodaj za prodajalec_oblek:
```
Glavno:
  - Domov (oblekHome)
  - Katalog (oblekCatalog)
Pregled:
  - Naloge (tasks)
  - Stranke (/contacts)
  - Potni nalog (travel)
```

### ProdajalecBottomNav.tsx - posodobi za prodajalec_oblek:
```
[Domov] [Naloge] [Stranke] [Potni nalog]
```

---

## 1.7 Seznam datotek za ustvariti

| Datoteka | Tip | Opis |
|---|---|---|
| SQL migracija | DB | `clothing_products` tabela |
| `src/integrations/supabase/types.ts` | Edit | Dodaj clothing_products tipe |
| `src/hooks/useClothingProducts.ts` | Nov | Hook za katalog |
| `src/pages/prodajalec/components/OblekHomeView.tsx` | Nov | Domaca stran |
| `src/pages/prodajalec/components/OblekCatalogView.tsx` | Nov | Katalog brskanje |
| `src/pages/prodajalec/components/OblekProductDetailModal.tsx` | Nov | Detail izdelka |
| `src/pages/prodajalec/types.ts` | Edit | Dodaj oblekHome, oblekCatalog |
| `src/pages/ProdajalecDashboard.tsx` | Edit | Dodaj renderiranje novih view-ov |
| `src/pages/prodajalec/components/SideMenu.tsx` | Edit | Dodaj katalog v meni |
| `src/pages/prodajalec/components/ProdajalecBottomNav.tsx` | Edit | Posodobi nav |

---

## Odvisnosti
- Brez zunanjih odvisnosti
- Uporablja obstoject shadcn/ui komponente (Card, Tabs, Input, Button)
- Slike izdelkov: Supabase Storage bucket `clothing-images`

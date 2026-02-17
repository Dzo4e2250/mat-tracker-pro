# Faza 3: Narocila in sledenje

## Cilj
Ko stranka sprejme ponudbo, se ta pretvori v narocilo. Prodajalec sledi statusu narocila od potrditve do dostave.

**Predpogoj:** Faza 2 (ponudbe)

---

## 3.1 DB migracija

```sql
-- Narocila oblacil
CREATE TABLE mat_tracker.clothing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,    -- avtomatska stevilka: "NO-2026-0001"
  offer_id UUID REFERENCES mat_tracker.clothing_offers(id),  -- referenca na ponudbo (opcijsko)
  salesperson_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES mat_tracker.companies(id),
  contact_id UUID REFERENCES mat_tracker.contacts(id),
  status VARCHAR(50) NOT NULL DEFAULT 'new',
    -- new -> confirmed -> in_production -> shipped -> delivered -> cancelled
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,                      -- pricakovani datum dostave
  actual_delivery DATE,                        -- dejanski datum dostave
  shipping_address TEXT,                       -- naslov dostave (default iz company)
  shipping_notes TEXT,                         -- navodila za dostavo
  total_amount DECIMAL(12,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Postavke narocila
CREATE TABLE mat_tracker.clothing_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mat_tracker.clothing_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES mat_tracker.clothing_products(id),
  size VARCHAR(20),
  color VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Zgodovina statusov narocila
CREATE TABLE mat_tracker.clothing_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mat_tracker.clothing_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (enak vzorec kot za ponudbe)
ALTER TABLE mat_tracker.clothing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.clothing_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.clothing_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clothing_orders_read" ON mat_tracker.clothing_orders
  FOR SELECT USING (
    salesperson_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inventar')
    )
  );

CREATE POLICY "clothing_orders_write" ON mat_tracker.clothing_orders
  FOR ALL USING (
    salesperson_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inventar')
    )
  );

CREATE POLICY "clothing_order_items_read" ON mat_tracker.clothing_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.clothing_orders co
      WHERE co.id = order_id AND (
        co.salesperson_id = auth.uid()
        OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('admin', 'inventar'))
      )
    )
  );

CREATE POLICY "clothing_order_items_write" ON mat_tracker.clothing_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.clothing_orders co
      WHERE co.id = order_id AND (
        co.salesperson_id = auth.uid()
        OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('admin', 'inventar'))
      )
    )
  );

CREATE POLICY "clothing_order_history_read" ON mat_tracker.clothing_order_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.clothing_orders co
      WHERE co.id = order_id AND (
        co.salesperson_id = auth.uid()
        OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('admin', 'inventar'))
      )
    )
  );

-- Sequence
CREATE SEQUENCE mat_tracker.clothing_order_seq START 1;

-- Indexi
CREATE INDEX idx_clothing_orders_salesperson ON mat_tracker.clothing_orders(salesperson_id);
CREATE INDEX idx_clothing_orders_company ON mat_tracker.clothing_orders(company_id);
CREATE INDEX idx_clothing_orders_status ON mat_tracker.clothing_orders(status);
CREATE INDEX idx_clothing_order_items_order ON mat_tracker.clothing_order_items(order_id);
CREATE INDEX idx_clothing_order_history_order ON mat_tracker.clothing_order_history(order_id);
```

---

## 3.2 Hook: useClothingOrders

**Datoteka:** `src/hooks/useClothingOrders.ts`

```ts
// Queries
useClothingOrders(userId?: string, status?: string)   // Seznam narocil
useClothingOrder(orderId: string)                      // Posamezno narocilo z items + history
useClothingOrdersByCompany(companyId: string)           // Narocila za stranko

// Mutations
useCreateClothingOrder()                // Ustvari narocilo (rocno ali iz ponudbe)
useConvertOfferToOrder(offerId: string) // Pretvori sprejeto ponudbo v narocilo
useUpdateClothingOrderStatus()          // Posodobi status (z avtomatskim history zapisom)
useUpdateClothingOrder()                // Posodobi podatke narocila
useCancelClothingOrder()                // Preklici narocilo
```

---

## 3.3 Komponente

### OblekOrdersView
**Datoteka:** `src/pages/prodajalec/components/OblekOrdersView.tsx`

```
+------------------------------------------+
|  Narocila                    [+ Novo]    |
+------------------------------------------+
|  [Vsa] [Nova] [V proizv.] [Poslana] [Dost.]|
+------------------------------------------+
|  NO-2026-0005  |  ABC d.o.o.             |
|  V proizvodnji |  Dostava: 15.3.2026     |
|  5 izdelkov    |  2.340,00 E             |
|  ----------------------------------------|
|  NO-2026-0004  |  XYZ d.o.o.             |
|  Dostavljeno   |  Dostava: 1.2.2026      |
|  12 izdelkov   |  5.670,00 E             |
+------------------------------------------+
```

### OblekOrderDetailModal
**Datoteka:** `src/pages/prodajalec/components/OblekOrderDetailModal.tsx`

- Podatki narocila (stranka, naslov dostave, datumi)
- Tabela postavk (izdelek, velikost, barva, kolicina, cena)
- Status timeline (history)
- Akcije: spremeni status, preklici, uredi
- Gumb za generiranje dobavnice PDF

---

## 3.4 Status flow

```
              ┌────────────────────────────────┐
              v                                |
new ──> confirmed ──> in_production ──> shipped ──> delivered
 |                         |
 └──> cancelled            └──> cancelled
```

### Kdo lahko spremeni status:
| Prehod | Kdo |
|---|---|
| new -> confirmed | prodajalec_oblek, admin |
| confirmed -> in_production | admin, inventar |
| in_production -> shipped | admin, inventar |
| shipped -> delivered | prodajalec_oblek, admin |
| * -> cancelled | prodajalec_oblek (samo new/confirmed), admin (vse) |

---

## 3.5 Pretvorba ponudbe v narocilo

Ko se ponudba oznaci kot `accepted`:
1. Prikazat gumb "Pretvori v narocilo"
2. Kopira vse postavke iz ponudbe v narocilo
3. Nastavi `offer_id` referenco
4. Status ponudbe ostane `accepted`
5. Narocilo dobi status `new`

---

## 3.6 Integracija v Contacts/CRM

V `CompanyDetailModal` (stran za stranko) dodaj tab "Narocila":
- Seznam narocil za to stranko
- Hiter pregled statusov
- Link na detail narocila

To je opcijsko in se lahko naredi po implementaciji osnove.

---

## 3.7 Seznam datotek

| Datoteka | Tip | Opis |
|---|---|---|
| SQL migracija | DB | `clothing_orders`, `clothing_order_items`, `clothing_order_history` |
| `src/integrations/supabase/types.ts` | Edit | Dodaj tipe |
| `src/hooks/useClothingOrders.ts` | Nov | CRUD + status management |
| `src/pages/prodajalec/components/OblekOrdersView.tsx` | Nov | Seznam narocil |
| `src/pages/prodajalec/components/OblekOrderDetailModal.tsx` | Nov | Detail narocila |
| `src/pages/prodajalec/components/OblekCreateOrderModal.tsx` | Nov | Rocno kreiranje |
| `src/hooks/useClothingOffers.ts` | Edit | Dodaj useConvertOfferToOrder |
| `src/pages/prodajalec/types.ts` | Edit | Dodaj oblekOrders |
| Nav komponente | Edit | Dodaj v meni |

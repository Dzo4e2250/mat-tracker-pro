# Faza 2: Ponudbe za oblacila

## Cilj
Prodajalec oblek lahko kreira, poslje in sledi ponudbam za oblacila. Ponudba se generira iz kataloga izdelkov (F1), poslje po emailu kot PDF, in ima status tracking.

**Predpogoj:** Faza 1 (katalog izdelkov mora obstajati)

---

## 2.1 DB migracija

```sql
-- Ponudbe za oblacila
CREATE TABLE mat_tracker.clothing_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_number VARCHAR(50) NOT NULL UNIQUE,   -- avtomatska stevilka: "PO-2026-0001"
  salesperson_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES mat_tracker.companies(id),
  contact_id UUID REFERENCES mat_tracker.contacts(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft -> sent -> viewed -> accepted -> rejected -> expired
  valid_until DATE,                            -- veljavnost ponudbe
  notes TEXT,
  discount_percent DECIMAL(5,2) DEFAULT 0,     -- globalni popust v %
  total_amount DECIMAL(12,2),                  -- skupni znesek (izracunan)
  pdf_url TEXT,                                -- URL generiranega PDF-ja
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Postavke ponudbe
CREATE TABLE mat_tracker.clothing_offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES mat_tracker.clothing_offers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES mat_tracker.clothing_products(id),
  size VARCHAR(20),                            -- izbrana velikost
  color VARCHAR(50),                           -- izbrana barva
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,           -- cena za kos (lahko prepisana)
  discount_percent DECIMAL(5,2) DEFAULT 0,     -- popust na postavko
  line_total DECIMAL(10,2) NOT NULL,           -- quantity * unit_price * (1 - discount/100)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE mat_tracker.clothing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.clothing_offer_items ENABLE ROW LEVEL SECURITY;

-- Prodajalec vidi svoje ponudbe, admin/inventar vidi vse
CREATE POLICY "clothing_offers_read" ON mat_tracker.clothing_offers
  FOR SELECT USING (
    salesperson_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inventar')
    )
  );

CREATE POLICY "clothing_offers_write" ON mat_tracker.clothing_offers
  FOR ALL USING (
    salesperson_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inventar')
    )
  );

CREATE POLICY "clothing_offer_items_read" ON mat_tracker.clothing_offer_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.clothing_offers co
      WHERE co.id = offer_id AND (
        co.salesperson_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mat_tracker.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'inventar')
        )
      )
    )
  );

CREATE POLICY "clothing_offer_items_write" ON mat_tracker.clothing_offer_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.clothing_offers co
      WHERE co.id = offer_id AND (
        co.salesperson_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM mat_tracker.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'inventar')
        )
      )
    )
  );

-- Sequence za offer_number
CREATE SEQUENCE mat_tracker.clothing_offer_seq START 1;

-- Indexi
CREATE INDEX idx_clothing_offers_salesperson ON mat_tracker.clothing_offers(salesperson_id);
CREATE INDEX idx_clothing_offers_company ON mat_tracker.clothing_offers(company_id);
CREATE INDEX idx_clothing_offers_status ON mat_tracker.clothing_offers(status);
CREATE INDEX idx_clothing_offer_items_offer ON mat_tracker.clothing_offer_items(offer_id);
```

---

## 2.2 Hook: useClothingOffers

**Datoteka:** `src/hooks/useClothingOffers.ts`

```ts
// Queries
useClothingOffers(userId?: string, status?: string)  // Seznam ponudb z filtriranjem
useClothingOffer(offerId: string)                     // Posamezna ponudba z items
useClothingOffersByCompany(companyId: string)          // Ponudbe za doloceno stranko

// Mutations
useCreateClothingOffer()       // Ustvari ponudbo (draft)
useUpdateClothingOffer()       // Posodobi ponudbo
useAddClothingOfferItem()      // Dodaj postavko
useRemoveClothingOfferItem()   // Odstrani postavko
useSendClothingOffer()         // Poslje ponudbo (status: draft -> sent, generira PDF, poslje email)
useAcceptClothingOffer()       // Oznaci kot sprejeto
useRejectClothingOffer()       // Oznaci kot zavrnjeno
```

---

## 2.3 Komponente

### OblekOffersView
**Datoteka:** `src/pages/prodajalec/components/OblekOffersView.tsx`

Seznam vseh ponudb s filtriranjem po statusu:

```
+------------------------------------------+
|  Ponudbe                    [+ Nova]     |
+------------------------------------------+
|  [Vse] [Osnutki] [Poslane] [Sprejete]   |
+------------------------------------------+
|  PO-2026-0012  |  ABC d.o.o.  |  Poslana |
|  3 izdelki     |  1.250,00 E  |  5.2.2026|
|  ----------------------------------------|
|  PO-2026-0011  |  XYZ d.o.o.  |  Osnutek |
|  7 izdelkov    |    890,00 E  |  4.2.2026|
+------------------------------------------+
```

### OblekOfferModal (kreiranje/urejanje)
**Datoteka:** `src/pages/prodajalec/components/OblekOfferModal.tsx`

Veckoracni modal:
1. **Izbira stranke** - iz obstojecih companies ali nova
2. **Izbira izdelkov** - brskanje kataloga, izbira velikosti/barv/kolicin
3. **Pregled in popusti** - tabela vseh postavk, globalni popust, skupni znesek
4. **Posiljanje** - predogled PDF, izbira emaila, posiljanje

### OblekOfferPDF
**Datoteka:** `src/pages/prodajalec/components/OblekOfferPDF.tsx`

PDF generiranje s knjiznico, ki ze obstaja v projektu (html2canvas + jsPDF ali pdf-lib):
- Glava s podatki podjetja
- Tabela izdelkov s slikami, velikostmi, cenami
- Skupni znesek z DDV
- Veljavnost ponudbe
- Podpis prodajalca (iz profile.signature_url)

---

## 2.4 Integracija v nav

### ViewType:
```ts
| 'oblekOffers'
```

### SideMenu - dodaj:
```
- Ponudbe (oblekOffers) - ikona: FileText
```

### ProdajalecBottomNav - posodobi za 4 gumbe:
```
[Domov] [Ponudbe] [Stranke] [Naloge]
```

---

## 2.5 Email posiljanje

Uporabi obstoject BillionMail API (ze integriran za predpraznikove ponudbe):
- Predloga: nova email template `clothing_offer` v `email_templates` tabeli
- Priloga: generiran PDF
- Tracking: shrani v `sent_emails` tabelo (ze obstaja)

---

## 2.6 Status flow

```
draft ──> sent ──> viewed ──> accepted ──> [pretvori v narocilo (F3)]
              |         |
              |         └──> rejected
              |
              └──> expired (avtomatsko po valid_until)
```

---

## 2.7 Seznam datotek

| Datoteka | Tip | Opis |
|---|---|---|
| SQL migracija | DB | `clothing_offers`, `clothing_offer_items` tabeli |
| `src/integrations/supabase/types.ts` | Edit | Dodaj tipe |
| `src/hooks/useClothingOffers.ts` | Nov | CRUD + status management |
| `src/pages/prodajalec/components/OblekOffersView.tsx` | Nov | Seznam ponudb |
| `src/pages/prodajalec/components/OblekOfferModal.tsx` | Nov | Kreiranje/urejanje ponudbe |
| `src/pages/prodajalec/components/OblekOfferPDF.tsx` | Nov | PDF generiranje |
| `src/pages/prodajalec/components/OblekOfferDetailModal.tsx` | Nov | Pregled poslane ponudbe |
| `src/pages/prodajalec/types.ts` | Edit | Dodaj oblekOffers |
| `src/pages/ProdajalecDashboard.tsx` | Edit | Dodaj renderiranje |
| Nav komponente | Edit | Dodaj v meni |
| `email_templates` | DB seed | Nova predloga za clothing_offer |

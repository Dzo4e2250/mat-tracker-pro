# LINDSTRÖM MAT TRACKER - CELOTEN NAČRT V2
## Prodajalec Aplikacija + Inventar Panel

**Verzija:** 2.0  
**Datum:** 15. januar 2026  
**Avtor:** George + Claude

---

# KAZALO

1. [Pregled projekta](#1-pregled-projekta)
2. [Tehnološki stack](#2-tehnološki-stack)
3. [Podatkovna struktura (Supabase)](#3-podatkovna-struktura-supabase)
4. [Database funkcije](#4-database-funkcije)
5. [Uporabniške vloge in pravice](#5-uporabniške-vloge-in-pravice)
6. [PRODAJALEC - UI Specifikacija](#6-prodajalec---ui-specifikacija)
7. [INVENTAR - UI Specifikacija](#7-inventar---ui-specifikacija)
8. [Integracije](#8-integracije)
9. [Offline mode](#9-offline-mode)
10. [Varnost](#10-varnost)
11. [Notifikacije](#11-notifikacije)
12. [Faze razvoja](#12-faze-razvoja)
13. [Odprti elementi](#13-odprti-elementi)

---

# 1. PREGLED PROJEKTA

## 1.1 Namen aplikacije

Mobilna PWA aplikacija za sledenje predpražnikov na terenu za podjetje Lindström. Sistem ima dve uporabniški vlogi:

- **PRODAJALEC** - terenski prodajalec, ki upravlja predpražnike na svojem območju
- **INVENTAR** - koordinator, ki ima pregled nad vsemi prodajalci in upravlja zaloge

## 1.2 Ključni problemi, ki jih rešuje

| Problem | Trenutno stanje | Rešitev z aplikacijo |
|---------|-----------------|---------------------|
| Slepo zaupanje | Ne vem koliko predpražnikov sem prejel | QR skeniranje ob prejemu |
| Pozabljeni predpražniki | Na terenu ostanejo nepobranii | Countdown timer + opozorila |
| Mesečna inventura | 2+ ure ročnega štetja | Realnočasovno stanje z enim klikom |
| CRM vnos | 30-60 min/stranko | Copy/paste ali export |
| Nepreglednost | Excel tabele, WhatsApp | Centraliziran dashboard |
| Email ponudbe | Ročno pisanje vsake | Avtomatsko iz template |

## 1.3 Obseg (Scope)

### Prodajalec aplikacija sledi:
- Predpražnike od **prejema** (od inventarja) do **prevzema** (šofer pobere)
- Ko šofer prevzame → predpražnik je **arhiviran** (ni več aktiven v pogledu)
- QR koda se **resetira** in je pripravljena za novo uporabo

### Inventar panel vidi:
- **Vse** predpražnike **vseh** prodajalcev
- Naročila za nove predpražnike
- Pobranje za šoferje
- Statistiko in poročila

## 1.4 Statusni diagram predpražnika

```
                    ┌─────────────────┐
                    │    PENDING      │ (koda naročena, čaka dostavo)
                    └────────┬────────┘
                             │ inventar potrdi prejem
                             ▼
                    ┌─────────────────┐
          ┌────────│   AVAILABLE     │ (prosta koda v avtu)
          │        └────────┬────────┘
          │                 │ prodajalec aktivira (skenira + izbere tip)
          │                 ▼
          │        ┌─────────────────┐
          │        │     CLEAN       │ (aktiviran, pripravljen za test)
          │        └────────┬────────┘
          │                 │ daj na test pri stranki
          │                 ▼
          │        ┌─────────────────┐
          │   ┌───│    ON_TEST      │◄────┐ podaljšaj +7 dni
          │   │    └────────┬────────┘     │
          │   │             │              │
          │   │       ┌─────┴─────┐        │
          │   │       ▼           ▼        │
          │   │   pobrano     pogodba      │
          │   │       │           │        │
          │   │       ▼           │        │
          │   │  ┌─────────┐      │        │
          │   │  │  DIRTY  │      │        │
          │   │  └────┬────┘      │        │
          │   │       │           │        │
          │   │       ▼           ▼        │
          │   │  ┌───────────────────┐     │
          │   │  │  WAITING_DRIVER   │     │
          │   │  └─────────┬─────────┘     │
          │   │            │               │
          │   │            ▼ šofer prevzame│
          │   │     ┌─────────────┐        │
          │   │     │  COMPLETED  │        │
          │   │     └──────┬──────┘        │
          │   │            │               │
          │   │            ▼               │
          └───┴───────► AVAILABLE ◄────────┘
                    (koda spet prosta)
```

---

# 2. TEHNOLOŠKI STACK

## 2.1 Frontend

| Tehnologija | Verzija | Namen |
|-------------|---------|-------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | UI komponente |
| React Router | 6.x | Navigacija |
| Zustand | 4.x | State management |
| TanStack Query | 5.x | Server state & caching |

## 2.2 Backend & Baza

| Tehnologija | Namen |
|-------------|-------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Baza podatkov (preko Supabase) |
| Supabase Auth | Avtentikacija |
| Supabase Realtime | Real-time posodobitve |
| Supabase Storage | Shranjevanje datotek (PDF-ji) |
| Supabase Edge Functions | Serverless funkcije (email) |
| Row Level Security (RLS) | Varnost na nivoju vrstic |

## 2.3 Knjižnice

| Knjižnica | Namen | npm |
|-----------|-------|-----|
| html5-qrcode | QR skeniranje v browserju | `html5-qrcode` |
| qrcode | Generiranje QR kod | `qrcode` |
| jsPDF | Generiranje PDF za QR nalepke | `jspdf` |
| jsPDF-AutoTable | Tabele v PDF | `jspdf-autotable` |
| date-fns | Delo z datumi | `date-fns` |
| libphonenumber-js | Validacija telefonskih številk | `libphonenumber-js` |
| vcard-creator | Generiranje vCard za kontakte | `vcard-creator` |
| papaparse | CSV parsing/export | `papaparse` |
| xlsx | Excel export | `xlsx` |
| workbox | Service worker za offline | `workbox-webpack-plugin` |
| idb | IndexedDB wrapper za offline storage | `idb` |
| lucide-react | Ikone | `lucide-react` |
| react-hot-toast | Toast notifications | `react-hot-toast` |
| zod | Schema validacija | `zod` |
| react-hook-form | Form handling | `react-hook-form` |

## 2.4 Deployment

| Komponenta | Platforma |
|------------|-----------|
| Frontend | Vercel (recommended) |
| Backend | Supabase Cloud |
| Domena | Custom (npr. mats.lindstrom.si) |

---

# 3. PODATKOVNA STRUKTURA (SUPABASE)

## 3.1 Tabela: profiles

Razširitev Supabase `auth.users` tabele.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('prodajalec', 'inventar', 'admin')),
  code_prefix TEXT UNIQUE, -- npr. 'STAN' za Stanka, 'MAJ' za Majo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Vsi lahko berejo profile (za dropdown izbire)
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Uporabnik lahko ureja samo svoj profil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Trigger za avtomatsko ustvarjanje profila ob registraciji
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'prodajalec')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 3.2 Tabela: mat_types

Tipi predpražnikov s cenikom. Imamo **DVE kategoriji**:

1. **Standardni (standard, ergo)** - MBW, ERM - imajo fiksno kodo
2. **Dizajn (design)** - custom predpražniki, koda se dodeli šele ob prejemu

```sql
CREATE TABLE mat_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,                 -- MBW0, MBW1... NULL za dizajn dimenzije
  name TEXT NOT NULL,               -- "Standardni majhen" ali "Dizajn 85x150"
  width_cm INTEGER NOT NULL,        -- 85
  height_cm INTEGER NOT NULL,       -- 75
  category TEXT NOT NULL CHECK (category IN ('standard', 'ergo', 'design')),
  
  -- Cenik (v EUR, brez DDV) - PRIVZETE VREDNOSTI, lahko se spreminjajo v ponudbi!
  price_1_week DECIMAL(10,2),       -- cena/teden pri 1x tedenski menjavi
  price_2_weeks DECIMAL(10,2),      -- cena/teden pri 2x tedenski menjavi
  price_3_weeks DECIMAL(10,2),      -- cena/teden pri menjavi vsake 3 tedne
  price_4_weeks DECIMAL(10,2),      -- cena/teden pri 4-tedenski menjavi
  price_purchase DECIMAL(10,2),     -- cena za nakup
  price_penalty DECIMAL(10,2),      -- penal ob uničenju/kraji
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Začetni podatki - STANDARDNI TIPI (CENE MANJKAJO - George mora dodati)
INSERT INTO mat_types (code, name, width_cm, height_cm, category) VALUES
('MBW0', 'Standardni majhen', 85, 75, 'standard'),
('MBW1', 'Standardni srednji', 85, 150, 'standard'),
('MBW2', 'Standardni velik', 115, 200, 'standard'),
('MBW4', 'Standardni industrijski', 150, 300, 'standard'),
('ERM10R', 'Ergonomski majhen', 86, 54, 'ergo'),
('ERM11R', 'Ergonomski srednji', 86, 142, 'ergo'),
('ERM49R', 'Ergonomski velik', 86, 300, 'ergo'),
('ERM51R', 'Ergonomski širok', 115, 175, 'ergo');

-- DIZAJN DIMENZIJE (samo dimenzije, brez kode)
-- Cene se privzeto nastavijo glede na velikost, AMPAK so editabilne v ponudbi
INSERT INTO mat_types (code, name, width_cm, height_cm, category) VALUES
(NULL, 'Dizajn 60x85', 60, 85, 'design'),
(NULL, 'Dizajn 60x90', 60, 90, 'design'),
(NULL, 'Dizajn 85x150', 85, 150, 'design'),
(NULL, 'Dizajn 115x180', 115, 180, 'design'),
(NULL, 'Dizajn 115x240', 115, 240, 'design'),
(NULL, 'Dizajn 150x250', 150, 250, 'design'),
(NULL, 'Dizajn 150x300', 150, 300, 'design');
-- Dodaj še ostale standardne dizajn dimenzije...

-- RLS
ALTER TABLE mat_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mat types are viewable by all" ON mat_types FOR SELECT USING (true);
```

### Razlika med standardnimi in dizajn predpražniki:

| Lastnost | Standardni (MBW, ERM) | Dizajn |
|----------|----------------------|--------|
| Koda | Fiksna (MBW1, ERM10R...) | Prazna dokler ne prispe |
| Tip | Izbereš tip → dimenzije se nastavijo | Izbereš dimenzijo |
| QR koda | Takoj ob aktivaciji | Šele ko prispe fizično |
| V ponudbi | Tip + dimenzija + cena | Samo dimenzija + cena |
| Cena | Privzeta iz cenika (EDITABILNA) | Privzeta iz cenika (EDITABILNA) |

## 3.3 Tabela: qr_codes

QR kode kot potrošni material.

```sql
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- STAN-001, MAJ-015...
  owner_id UUID REFERENCES profiles(id),  -- komu pripada
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- naročena, še ni prispela
    'available',         -- prosta, v avtu
    'active'             -- v uporabi (ima cycle)
  )),
  
  -- Metadata
  ordered_at TIMESTAMPTZ,           -- kdaj naročena
  received_at TIMESTAMPTZ,          -- kdaj potrjen prejem
  last_reset_at TIMESTAMPTZ,        -- kdaj nazadnje resetirana
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indeksi
CREATE INDEX idx_qr_codes_owner ON qr_codes(owner_id);
CREATE INDEX idx_qr_codes_status ON qr_codes(status);

-- RLS
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Prodajalec vidi samo svoje
CREATE POLICY "Salesperson sees own QR codes"
ON qr_codes FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- Inventar lahko ureja vse
CREATE POLICY "Inventory can manage QR codes"
ON qr_codes FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

## 3.4 Tabela: companies

Podjetja/stranke.

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Osnovni podatki
  name TEXT NOT NULL,
  tax_number TEXT,                  -- davčna številka
  registration_number TEXT,         -- matična številka
  
  -- Naslov
  address_street TEXT,
  address_city TEXT,
  address_postal TEXT,
  address_country TEXT DEFAULT 'Slovenija',
  
  -- GPS (za šoferja)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksi
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_created_by ON companies(created_by);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Vsi avtenticirani vidijo podjetja
CREATE POLICY "Companies viewable by authenticated"
ON companies FOR SELECT TO authenticated USING (true);

-- Prodajalec lahko ustvarja in ureja
CREATE POLICY "Salesperson can create companies"
ON companies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Salesperson can update own companies"
ON companies FOR UPDATE TO authenticated
USING (auth.uid() = created_by);
```

## 3.5 Tabela: contacts

Kontaktne osebe pri podjetjih.

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Osebni podatki
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Vloga
  role TEXT,                        -- "Vodja nabave", "Direktor"...
  is_decision_maker BOOLEAN DEFAULT false,  -- odločevalna oseba
  is_primary BOOLEAN DEFAULT false,         -- primarni kontakt
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksi
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(email);

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts viewable by authenticated"
ON contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Contacts editable by creator or admin"
ON contacts FOR ALL TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

## 3.6 Tabela: cycles

Življenjski cikel posameznega predpražnika (od aktivacije do prevzema).

```sql
CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id),
  salesperson_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Tip predpražnika (izbran ob aktivaciji)
  mat_type_id UUID NOT NULL REFERENCES mat_types(id),
  
  -- Trenutni status
  status TEXT NOT NULL DEFAULT 'clean' CHECK (status IN (
    'clean',             -- aktiviran, pripravljen
    'on_test',           -- pri stranki na testu
    'dirty',             -- pobran, čaka šoferja
    'waiting_driver',    -- označen za pobiranje
    'completed'          -- šofer prevzel, cikel končan
  )),
  
  -- Testno obdobje
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  test_start_date TIMESTAMPTZ,
  test_end_date TIMESTAMPTZ,        -- start + 7 dni
  extensions_count INTEGER DEFAULT 0,  -- kolikokrat podaljšan
  
  -- Lokacija (GPS)
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,            -- reverse geocoded naslov
  
  -- Pogodba (če sklenjena)
  contract_signed BOOLEAN DEFAULT false,
  contract_frequency TEXT,          -- '1_week', '2_weeks', '4_weeks'
  contract_signed_at TIMESTAMPTZ,
  
  -- Pobiranje
  pickup_requested_at TIMESTAMPTZ,
  driver_pickup_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksi
CREATE INDEX idx_cycles_qr_code ON cycles(qr_code_id);
CREATE INDEX idx_cycles_salesperson ON cycles(salesperson_id);
CREATE INDEX idx_cycles_status ON cycles(status);
CREATE INDEX idx_cycles_company ON cycles(company_id);
CREATE INDEX idx_cycles_test_end ON cycles(test_end_date);

-- RLS
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

-- Prodajalec vidi samo svoje cikle
CREATE POLICY "Salesperson sees own cycles"
ON cycles FOR SELECT TO authenticated
USING (
  salesperson_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- Prodajalec upravlja svoje cikle
CREATE POLICY "Salesperson manages own cycles"
ON cycles FOR ALL TO authenticated
USING (
  salesperson_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

## 3.7 Tabela: cycle_history

Zgodovina sprememb cikla (audit log).

```sql
CREATE TABLE cycle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,             -- 'activated', 'on_test', 'extended', 'picked_up', 'contract', 'completed'
  old_status TEXT,
  new_status TEXT,
  
  -- Dodatni podatki
  metadata JSONB,                   -- npr. {"company": "Merkur d.o.o."}
  
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cycle_history_cycle ON cycle_history(cycle_id);
CREATE INDEX idx_cycle_history_action ON cycle_history(action);

-- RLS
ALTER TABLE cycle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History viewable by related users"
ON cycle_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cycles c
    WHERE c.id = cycle_id AND (
      c.salesperson_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
    )
  )
);
```

## 3.8 Tabela: orders

Naročila za nove QR kode/predpražnike.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- čaka odobritev
    'approved',          -- odobreno
    'rejected',          -- zavrnjeno
    'shipped',           -- poslano
    'received'           -- prejeto
  )),
  
  -- Odobritev
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Dostava
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksi
CREATE INDEX idx_orders_salesperson ON orders(salesperson_id);
CREATE INDEX idx_orders_status ON orders(status);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salesperson sees own orders"
ON orders FOR SELECT TO authenticated
USING (
  salesperson_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

CREATE POLICY "Salesperson creates own orders"
ON orders FOR INSERT TO authenticated
WITH CHECK (salesperson_id = auth.uid());

CREATE POLICY "Inventory manages all orders"
ON orders FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

## 3.9 Tabela: order_items

Postavke naročila.

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mat_type_id UUID NOT NULL REFERENCES mat_types(id),
  
  quantity_requested INTEGER NOT NULL,
  quantity_approved INTEGER,        -- koliko je inventar odobril
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- RLS sledi parent tabeli orders
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items follow parent"
ON order_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id AND (
      o.salesperson_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
    )
  )
);
```

## 3.10 Tabela: email_templates

Predloge za email ponudbe.

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  
  template_type TEXT CHECK (template_type IN (
    'offer_rental',      -- ponudba za najem
    'offer_purchase',    -- ponudba za nakup
    'offer_both',        -- oboje
    'reminder',          -- opomnik pred koncem testa
    'followup'           -- follow-up po testu
  )),
  
  -- Spremenljivke: {{salesperson_name}}, {{company_name}}, {{contact_name}}, 
  --                {{mat_table}}, {{rental_price}}, {{purchase_price}}, etc.
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates viewable by all" ON email_templates FOR SELECT TO authenticated USING (true);
```

## 3.11 Tabela: offer_items

**POMEMBNO**: Postavke ponudbe s cenami, ki jih lahko prodajalec SPREMINJA!

```sql
CREATE TABLE offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_email_id UUID REFERENCES sent_emails(id) ON DELETE CASCADE,
  
  -- Predpražnik (lahko je NULL za dizajn ki še nima kode)
  cycle_id UUID REFERENCES cycles(id),
  
  -- Tip/dimenzija
  mat_type_id UUID REFERENCES mat_types(id),
  is_design BOOLEAN DEFAULT false,  -- true = dizajn predpražnik
  
  -- Dimenzije (kopirane, za arhiv)
  width_cm INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  
  -- CENE - privzeto iz cenika, AMPAK prodajalec jih lahko spremeni!
  price_rental DECIMAL(10,2),       -- cena najema (na teden)
  price_purchase DECIMAL(10,2),     -- cena nakupa
  price_penalty DECIMAL(10,2),      -- penal
  
  -- Količina (za dizajn lahko več kosov)
  quantity INTEGER DEFAULT 1,
  
  -- Opombe
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offer_items_email ON offer_items(sent_email_id);

-- RLS
ALTER TABLE offer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offer items viewable by creator"
ON offer_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sent_emails se
    WHERE se.id = sent_email_id AND se.created_by = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

### Kako deluje editiranje cen:

```
1. Prodajalec izbere predpražnik ali dizajn dimenzijo
2. Cene se AVTOMATSKO napolnijo iz cenika (mat_types tabela)
3. Prodajalec lahko SPREMENI katerokoli ceno pred pošiljanjem
4. Spremenjene cene se shranijo v offer_items tabelo
5. Email se generira s SPREMENJENIMI cenami
```

## 3.12 Tabela: sent_emails

Zgodovina poslanih emailov.

```sql
CREATE TABLE sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES cycles(id),
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  template_id UUID REFERENCES email_templates(id),
  
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  -- Ponudba
  offer_type TEXT CHECK (offer_type IN ('rental', 'purchase', 'both')),
  frequency TEXT,                   -- '1_week', '2_weeks', etc.
  
  -- Status
  billionmails_id TEXT,             -- ID iz BillionMails API
  status TEXT DEFAULT 'sent',
  
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_sent_emails_cycle ON sent_emails(cycle_id);
CREATE INDEX idx_sent_emails_company ON sent_emails(company_id);

-- RLS
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emails viewable by creator or admin"
ON sent_emails FOR SELECT TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

## 3.12 Tabela: driver_pickups

Seznami za šoferje.

```sql
CREATE TABLE driver_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- čaka
    'in_progress',       -- šofer je na poti
    'completed'          -- končano
  )),
  
  -- Kdaj
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Kdo
  assigned_driver TEXT,             -- ime šoferja
  created_by UUID REFERENCES profiles(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE driver_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver pickups viewable by inventory"
ON driver_pickups FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);
```

## 3.13 Tabela: driver_pickup_items

Postavke za pobiranje.

```sql
CREATE TABLE driver_pickup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID NOT NULL REFERENCES driver_pickups(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES cycles(id),
  
  -- Status
  picked_up BOOLEAN DEFAULT false,
  picked_up_at TIMESTAMPTZ,
  
  notes TEXT
);

CREATE INDEX idx_pickup_items_pickup ON driver_pickup_items(pickup_id);
CREATE INDEX idx_pickup_items_cycle ON driver_pickup_items(cycle_id);

-- RLS sledi parent
ALTER TABLE driver_pickup_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pickup items follow parent"
ON driver_pickup_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM driver_pickups p
    WHERE p.id = pickup_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
  )
);
```

---

# 4. DATABASE FUNKCIJE

## 4.1 Generiranje QR kod

```sql
-- Funkcija za generiranje naslednje QR kode za uporabnika
CREATE OR REPLACE FUNCTION generate_qr_codes(
  p_owner_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS SETOF qr_codes AS $$
DECLARE
  v_prefix TEXT;
  v_last_num INTEGER;
  v_new_code TEXT;
  v_i INTEGER;
BEGIN
  -- Dobi prefix uporabnika
  SELECT code_prefix INTO v_prefix
  FROM profiles WHERE id = p_owner_id;
  
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'User does not have a code prefix';
  END IF;
  
  -- Najdi zadnjo številko
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM LENGTH(v_prefix) + 2) AS INTEGER)
  ), 0) INTO v_last_num
  FROM qr_codes
  WHERE code LIKE v_prefix || '-%';
  
  -- Ustvari nove kode
  FOR v_i IN 1..p_count LOOP
    v_new_code := v_prefix || '-' || LPAD((v_last_num + v_i)::TEXT, 3, '0');
    
    INSERT INTO qr_codes (code, owner_id, status, ordered_at)
    VALUES (v_new_code, p_owner_id, 'pending', NOW())
    RETURNING * INTO v_new_code;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4.2 Aktivacija QR kode

```sql
-- Funkcija za aktivacijo QR kode (ustvari nov cikel)
CREATE OR REPLACE FUNCTION activate_qr_code(
  p_qr_code_id UUID,
  p_mat_type_id UUID
)
RETURNS cycles AS $$
DECLARE
  v_qr qr_codes;
  v_cycle cycles;
BEGIN
  -- Preveri QR kodo
  SELECT * INTO v_qr FROM qr_codes WHERE id = p_qr_code_id;
  
  IF v_qr IS NULL THEN
    RAISE EXCEPTION 'QR code not found';
  END IF;
  
  IF v_qr.status != 'available' THEN
    RAISE EXCEPTION 'QR code is not available (status: %)', v_qr.status;
  END IF;
  
  IF v_qr.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'QR code does not belong to you';
  END IF;
  
  -- Ustvari cikel
  INSERT INTO cycles (qr_code_id, salesperson_id, mat_type_id, status)
  VALUES (p_qr_code_id, auth.uid(), p_mat_type_id, 'clean')
  RETURNING * INTO v_cycle;
  
  -- Posodobi QR kodo
  UPDATE qr_codes SET status = 'active' WHERE id = p_qr_code_id;
  
  -- Zabeleži v zgodovino
  INSERT INTO cycle_history (cycle_id, action, new_status, performed_by)
  VALUES (v_cycle.id, 'activated', 'clean', auth.uid());
  
  RETURN v_cycle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4.3 Daj na test

```sql
-- Funkcija za dajanje predpražnika na test
CREATE OR REPLACE FUNCTION start_test(
  p_cycle_id UUID,
  p_company_id UUID,
  p_contact_id UUID DEFAULT NULL,
  p_location_lat DECIMAL DEFAULT NULL,
  p_location_lng DECIMAL DEFAULT NULL,
  p_location_address TEXT DEFAULT NULL
)
RETURNS cycles AS $$
DECLARE
  v_cycle cycles;
BEGIN
  -- Dobi cikel
  SELECT * INTO v_cycle FROM cycles WHERE id = p_cycle_id;
  
  IF v_cycle IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;
  
  IF v_cycle.status != 'clean' THEN
    RAISE EXCEPTION 'Can only start test from clean status (current: %)', v_cycle.status;
  END IF;
  
  -- Posodobi cikel
  UPDATE cycles SET
    status = 'on_test',
    company_id = p_company_id,
    contact_id = p_contact_id,
    test_start_date = NOW(),
    test_end_date = NOW() + INTERVAL '7 days',
    location_lat = p_location_lat,
    location_lng = p_location_lng,
    location_address = p_location_address,
    updated_at = NOW()
  WHERE id = p_cycle_id
  RETURNING * INTO v_cycle;
  
  -- Zabeleži v zgodovino
  INSERT INTO cycle_history (cycle_id, action, old_status, new_status, metadata, performed_by)
  VALUES (
    p_cycle_id, 'on_test', 'clean', 'on_test',
    jsonb_build_object('company_id', p_company_id),
    auth.uid()
  );
  
  RETURN v_cycle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4.4 Podaljšaj test

```sql
-- Funkcija za podaljšanje testa
CREATE OR REPLACE FUNCTION extend_test(
  p_cycle_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS cycles AS $$
DECLARE
  v_cycle cycles;
BEGIN
  SELECT * INTO v_cycle FROM cycles WHERE id = p_cycle_id;
  
  IF v_cycle IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;
  
  IF v_cycle.status != 'on_test' THEN
    RAISE EXCEPTION 'Can only extend test that is on_test';
  END IF;
  
  UPDATE cycles SET
    test_end_date = test_end_date + (p_days || ' days')::INTERVAL,
    extensions_count = extensions_count + 1,
    updated_at = NOW()
  WHERE id = p_cycle_id
  RETURNING * INTO v_cycle;
  
  INSERT INTO cycle_history (cycle_id, action, metadata, performed_by)
  VALUES (
    p_cycle_id, 'extended',
    jsonb_build_object('days', p_days, 'new_end_date', v_cycle.test_end_date),
    auth.uid()
  );
  
  RETURN v_cycle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4.5 Poberi predpražnik

```sql
-- Funkcija za pobiranje predpražnika
CREATE OR REPLACE FUNCTION pickup_mat(p_cycle_id UUID)
RETURNS cycles AS $$
DECLARE
  v_cycle cycles;
BEGIN
  SELECT * INTO v_cycle FROM cycles WHERE id = p_cycle_id;
  
  IF v_cycle IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;
  
  IF v_cycle.status NOT IN ('on_test', 'clean') THEN
    RAISE EXCEPTION 'Cannot pickup from status: %', v_cycle.status;
  END IF;
  
  UPDATE cycles SET
    status = 'dirty',
    updated_at = NOW()
  WHERE id = p_cycle_id
  RETURNING * INTO v_cycle;
  
  INSERT INTO cycle_history (cycle_id, action, old_status, new_status, performed_by)
  VALUES (p_cycle_id, 'picked_up', v_cycle.status, 'dirty', auth.uid());
  
  RETURN v_cycle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4.6 Zaključi cikel (šofer prevzel)

```sql
-- Funkcija za zaključek cikla
CREATE OR REPLACE FUNCTION complete_cycle(p_cycle_id UUID)
RETURNS cycles AS $$
DECLARE
  v_cycle cycles;
BEGIN
  SELECT * INTO v_cycle FROM cycles WHERE id = p_cycle_id;
  
  IF v_cycle IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;
  
  IF v_cycle.status NOT IN ('dirty', 'waiting_driver') THEN
    RAISE EXCEPTION 'Cannot complete from status: %', v_cycle.status;
  END IF;
  
  -- Zaključi cikel
  UPDATE cycles SET
    status = 'completed',
    driver_pickup_at = NOW(),
    updated_at = NOW()
  WHERE id = p_cycle_id
  RETURNING * INTO v_cycle;
  
  -- Resetiraj QR kodo
  UPDATE qr_codes SET
    status = 'available',
    last_reset_at = NOW()
  WHERE id = v_cycle.qr_code_id;
  
  INSERT INTO cycle_history (cycle_id, action, old_status, new_status, performed_by)
  VALUES (p_cycle_id, 'completed', v_cycle.status, 'completed', auth.uid());
  
  RETURN v_cycle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

# 5. UPORABNIŠKE VLOGE IN PRAVICE

## 5.1 Prodajalec

| Akcija | Dovoljeno |
|--------|-----------|
| Vidi svoje QR kode | ✅ |
| Vidi QR kode drugih | ❌ |
| Aktivira QR kode | ✅ (samo svoje) |
| Daje na test | ✅ |
| Podaljša test | ✅ |
| Pobere predpražnik | ✅ |
| Ustvarja podjetja | ✅ |
| Dodaja kontakte | ✅ |
| Pošilja email ponudbe | ✅ |
| Naroča nove kode | ✅ |
| Vidi naročila drugih | ❌ |
| Označuje za šoferja | ✅ |
| Zaključi cikel | ❌ (samo inventar) |

## 5.2 Inventar

| Akcija | Dovoljeno |
|--------|-----------|
| Vidi VSE QR kode | ✅ |
| Vidi VSE cikle | ✅ |
| Generira nove kode | ✅ |
| Odobrava/zavrača naročila | ✅ |
| Potrjuje prejem kod | ✅ |
| Zaključuje cikle | ✅ |
| Ureja šoferske sezname | ✅ |
| Vidi statistiko vseh | ✅ |
| Izvoz poročil | ✅ |

## 5.3 Admin

Vse kar inventar, plus:
- Upravljanje uporabnikov
- Urejanje cenika
- Urejanje email templateov
- Sistemske nastavitve

---

# 6. PRODAJALEC - UI SPECIFIKACIJA

## 6.1 Navigacija

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Domov  │  📷 Skeniraj  │  📦 Moji  │  ⚙️ Nastavitve │
└─────────────────────────────────────────────────────────┘
```

## 6.2 Dashboard (Domov)

```
┌─────────────────────────────────────────────────────────┐
│  👋 Pozdravljeni, Stanko                               │
│                                                         │
│  📅 Danes, 15. januar 2026                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MOJA STATISTIKA                                        │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │    🟢 5    │    🔵 12    │    🟠 3     │           │
│  │   Čistih   │  Na testu   │  Umazanih   │           │
│  └─────────────┴─────────────┴─────────────┘           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️ OPOZORILA                                          │
│                                                         │
│  🔴 STAN-003 • Merkur d.o.o.          DANES POTEČE    │
│  🟠 STAN-007 • Hofer k.d.             Jutri poteče    │
│  🟠 STAN-012 • Spar d.o.o.            Poteče čez 2 dni│
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📋 ZADNJA AKTIVNOST                                    │
│                                                         │
│  09:30  STAN-015 aktiviran (MBW2)                      │
│  09:15  STAN-003 na test → Merkur d.o.o.               │
│  Včeraj  STAN-008 pobran                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│        ┌─────────────────────────────┐                 │
│        │     📷 SKENIRAJ QR         │                 │
│        └─────────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 6.3 Skeniranje

### 6.3.1 Zaslon za skeniranje

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  📷 SKENIRAJ QR KODO                                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │                                                 │   │
│  │                  [KAMERA]                       │   │
│  │                                                 │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Nameri kamero na QR kodo predpražnika                 │
│                                                         │
│  ───────────────────────────────────────────────────   │
│                                                         │
│  💡 Ali nimaš QR kode?                                 │
│     [Vnesi kodo ročno]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3.2 Po skeniranju - NOVA KODA

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✅ Skenirana: STAN-015                                │
│  Status: 🟡 Prosta koda                                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  IZBERI TIP PREDPRAŽNIKA                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○  MBW0   │  85 x 75 cm   │  Standardni      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ●  MBW1   │  85 x 150 cm  │  Standardni      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ○  MBW2   │  115 x 200 cm │  Standardni      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ○  MBW4   │  150 x 300 cm │  Standardni      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ○  ERM10R │  86 x 54 cm   │  Ergonomski      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ○  ERM11R │  86 x 142 cm  │  Ergonomski      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           ✅ AKTIVIRAJ PREDPRAŽNIK              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3.3 Po skeniranju - OBSTOJEČ CIKEL

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✅ Skenirana: STAN-003                                │
│  Status: 🔵 Na testu                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  📦 MBW1  •  85 x 150 cm                               │
│                                                         │
│  🏢 Merkur d.o.o.                                      │
│  👤 Janez Novak                                        │
│  📍 Cesta na Brdo 85, 1000 Ljubljana                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⏱️ TEST POTEČE                                        │
│                                                         │
│       ┌─────────────────────────────────┐              │
│       │         ⚠️ DANES              │              │
│       │    15. jan 2026, 17:00         │              │
│       └─────────────────────────────────┘              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  KAJ ŽELIŠ NAREDITI?                                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         🔄 PODALJŠAJ +7 DNI                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📥 POBERI (test končan)                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📝 POGODBA PODPISANA                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📧 POŠLJI PONUDBO                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 6.4 Daj na test - Flow

### 6.4.1 Izbira lokacije

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                       DAJ NA TEST             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 STAN-003  •  MBW1  •  85 x 150 cm                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  KAM DAJEŠ NA TEST?                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    🆕 NOVA LOKACIJA                            │   │
│  │    Vnesi novo podjetje                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    📍 OBSTOJEČA LOKACIJA                       │   │
│  │    Izberi iz seznama                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  📋 AKTIVNE LOKACIJE (3)                               │
│                                                         │
│  🟢 Merkur d.o.o.        1 aktiven                     │
│  🟢 Hofer k.d.           2 aktivna                     │
│  🟢 Petrol d.d.          1 aktiven                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.4.2 Nova lokacija - Vnos podjetja

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                      NOVA LOKACIJA            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 STAN-003  •  MBW1                                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PODATKI O PODJETJU                                    │
│                                                         │
│  Ime podjetja *                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Merkur d.o.o.                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Davčna številka                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SI12345678                                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  NASLOV                                                │
│                                                         │
│  Ulica in hišna številka                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Cesta na Brdo 85                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Poštna številka         Kraj                          │
│  ┌───────────────┐       ┌─────────────────────────┐   │
│  │ 1000          │       │ Ljubljana               │   │
│  └───────────────┘       └─────────────────────────┘   │
│                                                         │
│  ☑️ Uporabi mojo GPS lokacijo                          │
│     📍 46.0569, 14.5058                                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  KONTAKTNA OSEBA                                       │
│                                                         │
│  Ime in priimek *                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Janez Novak                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Email *                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ janez.novak@merkur.si                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Telefon                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 041 123 456                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Vloga                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Vodja nabave                              ▼    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ☑️ Je odločevalna oseba                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         ✅ DAJ NA TEST (7 dni)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.4.3 Po uspešnem vnosu

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│             ✅ PREDPRAŽNIK NA TESTU                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  📦 STAN-003  •  MBW1  •  85 x 150 cm                  │
│  🏢 Merkur d.o.o.                                      │
│  👤 Janez Novak                                        │
│                                                         │
│  ⏱️ Test poteče: 22. januar 2026                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  KAJ ŽELIŠ NAREDITI?                                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    📧 POŠLJI PONUDBO                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    ➕ DODAJ ŠE EN PREDPRAŽNIK SEM              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │    🏠 NAZAJ NA DOMOV                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 6.5 Pošiljanje email ponudbe

### 6.5.1 Konfiguracija ponudbe - z dizajnom in editabilnimi cenami

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                      📧 POŠLJI PONUDBO        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🏢 Merkur d.o.o.                                      │
│  👤 Janez Novak • janez.novak@merkur.si                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PREDPRAŽNIKI NA TESTU (standardni)                    │
│                                                         │
│  ☑️ STAN-003  MBW1   85x150cm                          │
│  ☑️ STAN-007  MBW2   115x200cm                         │
│  ☐ STAN-012  ERM10R 86x54cm                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ➕ DODAJ DIZAJN PREDPRAŽNIK                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Dimenzija: [85 x 150 cm            ▼]         │   │
│  │  Količina:  [-]  2  [+]                         │   │
│  │  Koda:      _____________ (opcijsko, če že znan)│   │
│  │                                                 │   │
│  │  [+ Dodaj dizajn]                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  DODANI DIZAJNI:                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎨 Dizajn 85x150cm  x2     [🗑️ Odstrani]       │   │
│  │ 🎨 Dizajn 115x240cm x1     [🗑️ Odstrani]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  TIP PONUDBE                                           │
│                                                         │
│  ☑️ Najem                                              │
│  ☑️ Nakup                                              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  FREKVENCA MENJAVE (za najem)                          │
│                                                         │
│  ○ 1x tedensko                                         │
│  ● 2x tedensko                                         │
│  ○ Vsake 3 tedne                                       │
│  ○ Vsake 4 tedne                                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  💰 CENE (klikni za spremembo)                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  NAJEM (2x tedensko):                          │   │
│  │                                                 │   │
│  │  Artikel        │ Kol │ €/teden │ 4 tedni     │   │
│  │  ────────────────────────────────────────────  │   │
│  │  MBW1 85x150    │  1  │ [12,50] │ €50,00      │   │
│  │  MBW2 115x200   │  1  │ [18,00] │ €72,00      │   │
│  │  🎨 Dizajn 85x150│  2  │ [15,00] │ €120,00     │   │
│  │  🎨 Dizajn 115x240│ 1  │ [22,00] │ €88,00      │   │
│  │  ────────────────────────────────────────────  │   │
│  │  SKUPAJ brez DDV:              €330,00        │   │
│  │  DDV 22%:                      €72,60         │   │
│  │  SKUPAJ z DDV:                 €402,60        │   │
│  │                                                 │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                 │   │
│  │  NAKUP:                                        │   │
│  │                                                 │   │
│  │  Artikel        │ Kol │ Cena    │ Skupaj      │   │
│  │  ────────────────────────────────────────────  │   │
│  │  MBW1 85x150    │  1  │ [85,00] │ €85,00      │   │
│  │  MBW2 115x200   │  1  │ [120,00]│ €120,00     │   │
│  │  🎨 Dizajn 85x150│  2  │ [95,00] │ €190,00     │   │
│  │  🎨 Dizajn 115x240│ 1  │ [150,00]│ €150,00     │   │
│  │  ────────────────────────────────────────────  │   │
│  │  SKUPAJ z DDV:                 €545,00        │   │
│  │                                                 │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                 │   │
│  │  PENALI (v primeru poškodbe/izgube):           │   │
│  │                                                 │   │
│  │  MBW1:          [150,00]                       │   │
│  │  MBW2:          [200,00]                       │   │
│  │  🎨 Dizajn 85x150: [180,00]                    │   │
│  │  🎨 Dizajn 115x240:[250,00]                    │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️ Cene v [ ] so editabilne - klikni za spremembo    │
│  🔄 [Ponastavi na privzete cene]                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         👁️ PREDOGLED EMAILA                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📧 POŠLJI PONUDBO                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.5.2 Editiranje cene - Modal

```
┌─────────────────────────────────────────────────────────┐
│                    UREDI CENO                     ╳    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Artikel: MBW1 85x150cm                                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Privzeta cena (iz cenika): €12,50/teden               │
│                                                         │
│  Nova cena:                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  €  11,00                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Razlog za popust (opcijsko):                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Večja naročila, dolgoletno sodelovanje         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         ✅ SHRANI                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         🔄 PONASTAVI NA PRIVZETO               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.5.3 Flow za dizajn predpražnike

```
DIZAJN PREDPRAŽNIKI - WORKFLOW:

1. V PONUDBI:
   ┌──────────────────────────────────────┐
   │ Stranka želi dizajn predpražnik     │
   │                                      │
   │ → Izbereš DIMENZIJO (ne tip)        │
   │ → Koda ostane PRAZNA                │
   │ → Cena se nastavi glede na dimenzijo│
   │ → Ceno lahko SPREMENIŠ              │
   │ → Pošlješ ponudbo                   │
   └──────────────────────────────────────┘

2. KO STRANKA POTRDI:
   ┌──────────────────────────────────────┐
   │ Naročiš dizajn pri inventarju       │
   │                                      │
   │ → Inventar ustvari "pending" entry  │
   │ → Čakaš na dostavo                  │
   └──────────────────────────────────────┘

3. KO PRISPE:
   ┌──────────────────────────────────────┐
   │ Dizajn prispe s svojo kodo          │
   │                                      │
   │ → Inventar vnese kodo (npr. DES-001)│
   │ → Aktivira QR nalepko               │
   │ → Dodeli prodajalcu                 │
   └──────────────────────────────────────┘

4. PRODAJALEC:
   ┌──────────────────────────────────────┐
   │ Prejme dizajn predpražnik           │
   │                                      │
   │ → Skenira QR                        │
   │ → Sistem prepozna kot dizajn        │
   │ → Dostavi stranki                   │
   └──────────────────────────────────────┘
```

## 6.6 Seznam "Moji predpražniki"

```
┌─────────────────────────────────────────────────────────┐
│  📦 MOJI PREDPRAŽNIKI                    🔍 Išči       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filteri:  [Vsi ▼]  [Status ▼]  [Tip ▼]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  🟢 ČISTI (5)                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ STAN-015  MBW1   85x150cm       Aktiviran včeraj│   │
│  │ STAN-016  MBW2   115x200cm      Aktiviran včeraj│   │
│  │ STAN-017  ERM10R 86x54cm        Aktiviran danes │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🔵 NA TESTU (12)                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔴 STAN-003  MBW1  │ Merkur d.o.o.    │ DANES  │   │
│  │ 🟠 STAN-007  MBW2  │ Hofer k.d.       │ Jutri  │   │
│  │ 🟠 STAN-012  ERM10R│ Spar d.o.o.      │ 2 dni  │   │
│  │ 🟢 STAN-008  MBW1  │ Petrol d.d.      │ 5 dni  │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🟠 UMAZANI (3)                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ STAN-001  MBW1  │ Pobran 12.1.  │ [Za šoferja] │   │
│  │ STAN-002  MBW4  │ Pobran 14.1.  │ [Za šoferja] │   │
│  │ STAN-009  MBW2  │ Pobran 15.1.  │ [Za šoferja] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🟡 PROSTE KODE (8)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ STAN-018, STAN-019, STAN-020, STAN-021...       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 6.7 Naročilo novih kod

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                    📦 NAROČI NOVE KODE        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TRENUTNO STANJE                                        │
│                                                         │
│  Proste kode:    8                                      │
│  Aktivne:        17                                     │
│  V obdelavi:     3                                      │
│  ─────────────────                                      │
│  Skupaj:         28                                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  NAROČILO                                               │
│                                                         │
│  Koliko kod potrebuješ?                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │   [-]          10          [+]                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Opomba za inventar (opcijsko):                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Potrebujem do petka, imam veliko novih lokacij │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📤 POŠLJI NAROČILO                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ZGODOVINA NAROČIL                                     │
│                                                         │
│  ✅ 10.1.2026  10 kod  │  Prejeto                      │
│  ✅ 3.1.2026   15 kod  │  Prejeto                      │
│  ⏳ 14.1.2026  10 kod  │  Čaka odobritev               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 7. INVENTAR - UI SPECIFIKACIJA

## 7.1 Navigacija inventarja

```
┌─────────────────────────────────────────────────────────┐
│ 🏠 Pregled │ 👥 Prodajalci │ 📦 Naročila │ 🚚 Šoferji │ ⚙️│
└─────────────────────────────────────────────────────────┘
```

## 7.2 Dashboard inventarja

```
┌─────────────────────────────────────────────────────────┐
│  👋 Dobrodošli, Inventar                               │
│                                                         │
│  📅 Sreda, 15. januar 2026                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SKUPNA STATISTIKA                                      │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐   │
│  │  🟢 28 │  🔵 47 │  🟠 12 │  🚚 8  │  ⏳ 3   │   │
│  │ Čistih │Na testu │Umazanih │ Šofer  │Naročila │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🚨 ZAHTEVA POZORNOST                                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔴 Stanko ima 10+ umazanih - potrebno pobiranje│   │
│  │ 🟠 3 naročila čakajo odobritev                  │   │
│  │ 🟠 5 testov poteče DANES                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 STANJE PO PRODAJALCIH                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Prodajalec │ Čisti │ Test │ Umazani │ Skupaj   │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔴 Stanko  │   5   │  12  │   10    │   27     │   │
│  │ 🟢 Maja    │   8   │  15  │    2    │   25     │   │
│  │ 🟢 Peter   │   7   │  10  │    0    │   17     │   │
│  │ 🟢 Ana     │   8   │  10  │    0    │   18     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🔴 = 10+ umazanih (potrebno pobiranje)                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  HITRE AKCIJE                                          │
│                                                         │
│  [📋 Pripravi seznam za šoferja]                       │
│  [📦 Generiraj QR kode]                                │
│  [📊 Izvozi mesečno poročilo]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7.3 Pogled na posameznega prodajalca

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                    👤 STANKO NOVAK            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📧 stanko.novak@lindstrom.si                          │
│  📱 041 123 456                                        │
│  🏷️ Prefix: STAN                                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  STATISTIKA                                            │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │    🟢 5    │    🔵 12    │    🟠 10    │           │
│  │   Čistih   │  Na testu   │  Umazanih   │           │
│  └─────────────┴─────────────┴─────────────┘           │
│                                                         │
│  🔴 10+ umazanih - POTREBNO POBIRANJE                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PREDPRAŽNIKI NA TESTU (12)                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔴 STAN-003  MBW1  │ Merkur d.o.o.  │ DANES    │   │
│  │ 🟠 STAN-007  MBW2  │ Hofer k.d.     │ Jutri    │   │
│  │ 🟠 STAN-012  ERM10R│ Spar d.o.o.    │ 2 dni    │   │
│  │ 🟢 STAN-008  MBW1  │ Petrol d.d.    │ 5 dni    │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  UMAZANI (10)                                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑️ STAN-001  MBW1  │ Pobran 12.1.  │ Ljubljana │   │
│  │ ☑️ STAN-002  MBW4  │ Pobran 13.1.  │ Maribor   │   │
│  │ ☑️ STAN-009  MBW2  │ Pobran 14.1.  │ Ljubljana │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [📋 Dodaj izbrane v seznam za šoferja]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7.4 Naročila

```
┌─────────────────────────────────────────────────────────┐
│  📦 NAROČILA                           [+ Novo naročilo]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filter: [Vsa ▼]  [Čakajoča ▼]                         │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⏳ ČAKAJOČA ODOBRITEV (3)                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 14.1.2026 │ Stanko │ 10 kod │ "Potrebujem..."  │   │
│  │ [✅ Odobri]  [❌ Zavrni]  [📋 Podrobnosti]     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 13.1.2026 │ Maja   │ 5 kod  │                   │   │
│  │ [✅ Odobri]  [❌ Zavrni]  [📋 Podrobnosti]     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 13.1.2026 │ Peter  │ 8 kod  │                   │   │
│  │ [✅ Odobri]  [❌ Zavrni]  [📋 Podrobnosti]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ✅ ODOBRENA / POSLANA (zgodovina)                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 10.1.2026 │ Stanko │ 10 kod │ ✅ Prejeto       │   │
│  │ 8.1.2026  │ Maja   │ 15 kod │ ✅ Prejeto       │   │
│  │ 5.1.2026  │ Ana    │ 10 kod │ 📦 Poslano       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7.5 Odobritev naročila - Modal

```
┌─────────────────────────────────────────────────────────┐
│                    ODOBRI NAROČILO                ╳    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Prodajalec: Stanko Novak                              │
│  Datum: 14. januar 2026                                │
│  Opomba: "Potrebujem do petka, imam veliko novih..."   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  NAROČENO: 10 kod                                      │
│                                                         │
│  Koliko ODOBRIŠ?                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │   [-]          10          [+]                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️ Stanko ima trenutno 8 prostih kod                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         ✅ ODOBRI IN GENERIRAJ KODE            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         ❌ ZAVRNI NAROČILO                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7.6 Generiranje QR kod

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                    🏷️ GENERIRAJ QR KODE       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ZA KOGA?                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Stanko Novak (STAN)                        ▼   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  KOLIKO?                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │   [-]          10          [+]                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Naslednja koda: STAN-029                              │
│  Kode: STAN-029 do STAN-038                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  OBLIKA NALEPK                                         │
│                                                         │
│  ○ A4 - 3x7 nalepk (za tiskalnik)                      │
│  ● A4 - 5x10 nalepk (manjše)                           │
│  ○ Posamezne (za etikete)                              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PREDOGLED                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐    │   │
│  │  │ [QR]  │  │ [QR]  │  │ [QR]  │  │ [QR]  │    │   │
│  │  │STAN029│  │STAN030│  │STAN031│  │STAN032│    │   │
│  │  └───────┘  └───────┘  └───────┘  └───────┘    │   │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐    │   │
│  │  │ [QR]  │  │ [QR]  │  │ [QR]  │  │ [QR]  │    │   │
│  │  │STAN033│  │STAN034│  │STAN035│  │STAN036│    │   │
│  │  └───────┘  └───────┘  └───────┘  └───────┘    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📥 PRENESI PDF                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         🖨️ NATISNI                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7.7 Seznam za šoferja

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                    🚚 SEZNAM ZA ŠOFERJA       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📅 Datum: 16. januar 2026 (jutri)                     │
│                                                         │
│  Šofer: ________________________________               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PREDPRAŽNIKI ZA POBIRANJE (12)                        │
│                                                         │
│  📍 LJUBLJANA (8)                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑️ STAN-001 │ MBW1  │ Merkur, Brdo 85          │   │
│  │ ☑️ STAN-002 │ MBW4  │ Merkur, Brdo 85          │   │
│  │ ☑️ STAN-009 │ MBW2  │ Hofer, Šmartinska 152    │   │
│  │ ☑️ MAJ-003  │ MBW1  │ Spar, Dunajska 10        │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📍 MARIBOR (4)                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑️ PET-015 │ MBW1  │ Merkator, Tržaška 9       │   │
│  │ ☑️ PET-016 │ ERM10R│ Merkator, Tržaška 9       │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📥 PRENESI PDF ZA ŠOFERJA              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         ✅ OZNAČI VSE KOT PREVZETO             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7.8 Mesečno poročilo

```
┌─────────────────────────────────────────────────────────┐
│  ← Nazaj                    📊 MESEČNO POROČILO        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Mesec: [Januar 2026 ▼]                                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  SKUPNA STATISTIKA                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Aktivni predpražniki:              87           │   │
│  │ Novih testov:                      45           │   │
│  │ Sklenjenih pogodb:                 12           │   │
│  │ Konverzija:                        26.7%        │   │
│  │ Poslanih ponudb:                   38           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PO PRODAJALCIH                                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Prodajalec │ Testi │ Pogodbe │ Konv. │ Ponudbe │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Stanko     │  15   │    5    │ 33.3% │   12    │   │
│  │ Maja       │  12   │    4    │ 33.3% │   10    │   │
│  │ Peter      │  10   │    2    │ 20.0% │    8    │   │
│  │ Ana        │   8   │    1    │ 12.5% │    8    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  EXPORT                                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📥 PRENESI PDF                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         📊 PRENESI EXCEL                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 8. INTEGRACIJE

## 8.1 BillionMails API

### Konfiguracija

```env
# Supabase Edge Function secrets
BILLIONMAILS_API_KEY=your_api_key
BILLIONMAILS_SENDER_EMAIL=noreply@lindstrom.si
BILLIONMAILS_SENDER_NAME=Lindström d.o.o.
```

### Edge Function za pošiljanje

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { 
    to, 
    subject, 
    html_body, 
    text_body,
    cycle_id,
    company_id,
    template_id,
    offer_type,
    frequency
  } = await req.json()
  
  // Pošlji preko BillionMails
  const response = await fetch("https://api.billionmails.com/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("BILLIONMAILS_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: {
        email: Deno.env.get("BILLIONMAILS_SENDER_EMAIL"),
        name: Deno.env.get("BILLIONMAILS_SENDER_NAME")
      },
      to: [{ email: to }],
      subject: subject,
      html: html_body,
      text: text_body
    })
  })
  
  const result = await response.json()
  
  // Zabeleži v bazo
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
  
  await supabase.from("sent_emails").insert({
    cycle_id,
    company_id,
    template_id,
    recipient_email: to,
    subject,
    offer_type,
    frequency,
    billionmails_id: result.id,
    status: result.status
  })
  
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" }
  })
})
```

## 8.2 GPS Geolocation

### Pridobivanje lokacije

```typescript
// hooks/useGeolocation.ts
export function useGeolocation() {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolokacija ni podprta")
      return
    }
    
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])
  
  return { location, error, loading, getCurrentLocation }
}
```

### Reverse geocoding (GPS → naslov)

```typescript
// services/geocoding.ts
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
  )
  const data = await response.json()
  
  const addr = data.address
  const parts = []
  
  if (addr.road) parts.push(addr.road)
  if (addr.house_number) parts[0] += ` ${addr.house_number}`
  if (addr.postcode) parts.push(addr.postcode)
  if (addr.city || addr.town || addr.village) {
    parts.push(addr.city || addr.town || addr.village)
  }
  
  return parts.join(", ")
}
```

## 8.3 CRM Export (Dynamics 365)

### Copy/Paste format

```typescript
// services/crmExport.ts
export function formatForCRM(company: Company, contacts: Contact[]): string {
  const lines = [
    `Ime podjetja: ${company.name}`,
    `Davčna: ${company.tax_number || "-"}`,
    `Naslov: ${company.address_street}, ${company.address_postal} ${company.address_city}`,
    "",
    "KONTAKTI:",
  ]
  
  contacts.forEach(c => {
    lines.push(`${c.first_name} ${c.last_name}`)
    if (c.email) lines.push(`  Email: ${c.email}`)
    if (c.phone) lines.push(`  Tel: ${c.phone}`)
    if (c.role) lines.push(`  Vloga: ${c.role}`)
    lines.push("")
  })
  
  return lines.join("\n")
}

export function copyToCRM(data: string) {
  navigator.clipboard.writeText(data)
  toast.success("Kopirano! Prilepi v Dynamics 365")
}
```

### CSV Export

```typescript
// services/csvExport.ts
import Papa from "papaparse"

export function exportActivitiesToCSV(activities: Activity[]): string {
  const data = activities.map(a => ({
    "Datum": format(a.performed_at, "dd.MM.yyyy HH:mm"),
    "Tip": a.action,
    "Podjetje": a.company_name,
    "Kontakt": a.contact_name,
    "Predpražnik": a.qr_code,
    "Opombe": a.notes || ""
  }))
  
  return Papa.unparse(data, { delimiter: ";" })
}
```

---

# 9. OFFLINE MODE

## 9.1 Service Worker strategija

```typescript
// sw.ts (Workbox)
import { precacheAndRoute } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies"

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST)

// API requests - Network First
registerRoute(
  ({ url }) => url.pathname.startsWith("/rest/v1/"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 3
  })
)

// Images - Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "image-cache"
  })
)
```

## 9.2 IndexedDB za offline podatke

```typescript
// services/offlineDb.ts
import { openDB, DBSchema, IDBPDatabase } from "idb"

interface OfflineDB extends DBSchema {
  pendingActions: {
    key: string
    value: {
      id: string
      action: "activate" | "start_test" | "extend" | "pickup"
      payload: any
      createdAt: Date
    }
  }
  cachedData: {
    key: string
    value: {
      type: "qr_codes" | "cycles" | "companies"
      data: any[]
      updatedAt: Date
    }
  }
}

export async function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  return openDB<OfflineDB>("lindstrom-offline", 1, {
    upgrade(db) {
      db.createObjectStore("pendingActions", { keyPath: "id" })
      db.createObjectStore("cachedData", { keyPath: "type" })
    }
  })
}

// Ko si offline
export async function queueAction(action: string, payload: any) {
  const db = await getOfflineDB()
  await db.put("pendingActions", {
    id: crypto.randomUUID(),
    action,
    payload,
    createdAt: new Date()
  })
}

// Ko se vrneš online
export async function syncPendingActions() {
  const db = await getOfflineDB()
  const pending = await db.getAll("pendingActions")
  
  for (const action of pending) {
    try {
      await processAction(action)
      await db.delete("pendingActions", action.id)
    } catch (err) {
      console.error("Sync failed:", action, err)
    }
  }
}
```

## 9.3 Online/Offline detection

```typescript
// hooks/useOnlineStatus.ts
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingActions()
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])
  
  return isOnline
}
```

---

# 10. VARNOST

## 10.1 Row Level Security (RLS)

Vsa RLS pravila so definirana v sekciji 3 pri vsaki tabeli.

### Ključna načela:
1. **Prodajalec vidi samo svoje** - `WHERE owner_id = auth.uid()`
2. **Inventar vidi vse** - `WHERE role IN ('inventar', 'admin')`
3. **Zaščitene funkcije** - `SECURITY DEFINER` za transakcije

## 10.2 API varnost

```typescript
// middleware/auth.ts
export async function requireAuth(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  
  if (!token) {
    throw new Error("Unauthorized")
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error("Invalid token")
  }
  
  return user
}

export async function requireRole(req: Request, roles: string[]) {
  const user = await requireAuth(req)
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  
  if (!roles.includes(profile?.role)) {
    throw new Error("Forbidden")
  }
  
  return user
}
```

## 10.3 Input validacija

```typescript
// schemas/validation.ts
import { z } from "zod"

export const companySchema = z.object({
  name: z.string().min(2).max(200),
  tax_number: z.string().regex(/^SI\d{8}$/).optional(),
  address_street: z.string().max(200).optional(),
  address_city: z.string().max(100).optional(),
  address_postal: z.string().regex(/^\d{4}$/).optional()
})

export const contactSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().max(100).optional()
})
```

---

# 11. NOTIFIKACIJE

## 11.1 Push notifikacije (Firebase Cloud Messaging)

```typescript
// services/notifications.ts
import { getMessaging, getToken, onMessage } from "firebase/messaging"

export async function registerPushNotifications() {
  const messaging = getMessaging()
  
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null
  
  const token = await getToken(messaging, {
    vapidKey: process.env.VITE_FIREBASE_VAPID_KEY
  })
  
  // Shrani token v bazo
  await supabase
    .from("profiles")
    .update({ push_token: token })
    .eq("id", userId)
  
  return token
}

// Listen za notifikacije
onMessage(messaging, (payload) => {
  const { title, body, data } = payload.notification
  
  new Notification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/badge.png",
    data
  })
})
```

## 11.2 Scheduled notifications (Supabase Edge Functions + Cron)

```typescript
// supabase/functions/check-expiring-tests/index.ts
serve(async () => {
  const supabase = createClient(/*...*/)
  
  // Najdi teste ki potečejo v naslednjih 24 urah
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data: expiringCycles } = await supabase
    .from("cycles")
    .select(`
      *,
      qr_codes(code),
      companies(name),
      salesperson:profiles(push_token, email)
    `)
    .eq("status", "on_test")
    .lte("test_end_date", tomorrow.toISOString())
    .gt("test_end_date", new Date().toISOString())
  
  for (const cycle of expiringCycles) {
    // Pošlji push notifikacijo
    if (cycle.salesperson.push_token) {
      await sendPushNotification(cycle.salesperson.push_token, {
        title: "Test poteče jutri!",
        body: `${cycle.qr_codes.code} pri ${cycle.companies.name}`,
        data: { cycle_id: cycle.id }
      })
    }
  }
})
```

## 11.3 In-app notifikacije

```typescript
// components/NotificationBanner.tsx
export function NotificationBanner() {
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cycles")
        .select("*, qr_codes(code), companies(name)")
        .eq("salesperson_id", userId)
        .eq("status", "on_test")
        .lte("test_end_date", addDays(new Date(), 1).toISOString())
      return data
    }
  })
  
  if (!alerts?.length) return null
  
  return (
    <div className="bg-red-100 border-l-4 border-red-500 p-4">
      <div className="flex">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div className="ml-3">
          <p className="text-sm text-red-700">
            {alerts.length} testov poteče danes ali jutri!
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

# 12. FAZE RAZVOJA

## Faza 1: MVP Prodajalec (2-3 tedni)

- [ ] Supabase setup + vse tabele iz sekcije 3
- [ ] Auth (login/logout)
- [ ] Dashboard prodajalca
- [ ] QR skeniranje (html5-qrcode)
- [ ] Aktivacija predpražnika
- [ ] Daj na test (nova lokacija)
- [ ] Seznam predpražnikov
- [ ] Countdown timer za teste
- [ ] Osnovni kontakti in podjetja

## Faza 2: Core Features (2 tedni)

- [ ] Podaljšanje testa
- [ ] Pobiranje predpražnika
- [ ] Grupiranje po podjetjih
- [ ] "Dodaj k obstoječi lokaciji"
- [ ] GPS lokacija pri vnosu
- [ ] Zgodovina (cycle_history)
- [ ] Statistika na dashboardu

## Faza 3: Integracije (1-2 tedna)

- [ ] BillionMails Edge Function
- [ ] Email template sistem
- [ ] Pošiljanje ponudb
- [ ] CRM export (copy/paste)
- [ ] vCard export kontakta
- [ ] CSV aktivnosti

## Faza 4: Inventar Panel (2 tedni)

- [ ] Inventar dashboard
- [ ] Pogled vseh prodajalcev
- [ ] Pogled posameznega prodajalca
- [ ] Naročila sistem
- [ ] Odobritev naročil
- [ ] QR generiranje (jsPDF)
- [ ] Seznami za šoferje
- [ ] Zaključevanje ciklov
- [ ] Mesečna poročila

## Faza 5: Polish (1 teden)

- [ ] Offline mode (Workbox + IndexedDB)
- [ ] Push notifications (FCM)
- [ ] PWA manifest
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile UX polish

## Faza 6: Testing & Deploy (1 teden)

- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Dokumentacija

---

# 13. ODPRTI ELEMENTI

## Potrebujem od tebe:

### 1. CENIK PREDPRAŽNIKOV - STANDARDNI

```
| Tip     | Velikost    | Cena 1x/ted | Cena 2x/ted | Nakup   | Penal   |
|---------|-------------|-------------|-------------|---------|---------|
| MBW0    | 85x75 cm    | €?          | €?          | €?      | €?      |
| MBW1    | 85x150 cm   | €?          | €?          | €?      | €?      |
| MBW2    | 115x200 cm  | €?          | €?          | €?      | €?      |
| MBW4    | 150x300 cm  | €?          | €?          | €?      | €?      |
| ERM10R  | 86x54 cm    | €?          | €?          | €?      | €?      |
| ERM11R  | 86x142 cm   | €?          | €?          | €?      | €?      |
| ERM49R  | 86x300 cm   | €?          | €?          | €?      | €?      |
| ERM51R  | 115x175 cm  | €?          | €?          | €?      | €?      |
```

### 2. CENIK PREDPRAŽNIKOV - DIZAJN (privzete cene)

Katere standardne dimenzije nudite za dizajn predpražnike?

```
| Dimenzija   | Cena 1x/ted | Cena 2x/ted | Nakup   | Penal   |
|-------------|-------------|-------------|---------|---------|
| 60x85 cm    | €?          | €?          | €?      | €?      |
| 60x90 cm    | €?          | €?          | €?      | €?      |
| 85x150 cm   | €?          | €?          | €?      | €?      |
| 115x180 cm  | €?          | €?          | €?      | €?      |
| 115x240 cm  | €?          | €?          | €?      | €?      |
| ???         | €?          | €?          | €?      | €?      |
```

⚠️ **Opomba**: Te cene so samo PRIVZETE - prodajalec jih lahko spremeni pri vsaki ponudbi!

### 3. PRIMER EMAIL PONUDBE

Pošlji mi obstoječ email s ponudbo za najem/nakup, da naredim template.

### 4. DIMENZIJE QR NALEPK

- Velikost posamezne nalepke: ____ mm x ____ mm
- Format papirja: A4 / drug
- Koliko nalepk na list: ____

### 5. BILLIONMAILS

- API endpoint URL
- API key (ali dokumentacija za pridobitev)
- Test account za development

### 6. OSTALO

- Logotip Lindström (PNG, transparenten)
- Barve (primary, secondary)
- Ali želiš light/dark mode ali samo enega?

---

# 14. NASLEDNJI KORAKI

1. **Pošlji mi zgornje manjkajoče podatke** (cenik, email, QR dimenzije)
2. **Jaz pripravim** Supabase projekt s shemo
3. **Začnemo z MVP** - React + Vite + skeniranje
4. **Iterativno** dodajamo funkcionalnosti

Ko boš imel čas, mi pošlji kar imaš - lahko tudi delno, pa bom sproti dopolnjeval načrt.

---

**Konec specifikacije V2**

*Ta dokument je pripravljen za Claude Code - vsebuje vse potrebne informacije za implementacijo.*

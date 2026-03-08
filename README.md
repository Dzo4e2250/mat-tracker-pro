# Mat Tracker Pro

Interna aplikacija za sledenje in upravljanje predpražnikov (entry floor mats). Celoten življenjski cikel predpražnika od skladišča do stranke in nazaj z vgrajenim CRM-jem, GPS sledenjem, AI skeniranjem vizitk in sistemom ponudb.

## Kazalo

- [Pregled funkcionalnosti](#pregled-funkcionalnosti)
- [Tehnologije](#tehnologije)
- [Predpogoji](#predpogoji)
- [Postavitev Supabase baze podatkov](#postavitev-supabase-baze-podatkov)
- [Backup in restore](#backup-in-restore)
- [Spremenljivke okolja](#spremenljivke-okolja)
- [Zagon razvojnega okolja](#zagon-razvojnega-okolja)
- [Zagon z Docker](#zagon-z-docker)
- [Uporabniške vloge](#uporabniške-vloge)
- [Življenjski cikel predpražnika](#življenjski-cikel-predpražnika)
- [Struktura projekta](#struktura-projekta)
- [Struktura baze podatkov](#struktura-baze-podatkov)
- [Edge Functions](#edge-functions)

---

## Pregled funkcionalnosti

### Admin / Inventar panel
- Pregled vseh QR kod, statusov in lokacij na zemljevidu
- Analitika in KPI-ji (konverzije, trendi, top prodajalci)
- Upravljanje cenikov (najem, nakup, Optibrush, posebne dimenzije)
- Generiranje in tisk QR kod (Herma etikete, PDF)
- Organizacija prevzemov umazanih predpražnikov (dodelitev šoferja, PDF transportni dokumenti)
- Upravljanje naročil QR kod
- Administracija uporabniških računov
- Sledenje aktivnosti prodajalcev
- Izvoz v D365 format

### Prodajalec panel
- QR skeniranje s kamero in ročni vnos
- Postavitev predpražnikov na test pri stranki
- Podpisovanje pogodb in določitev frekvence servisa
- Označevanje umazanih predpražnikov za prevzem
- GPS sledenje dnevnih poti
- Potni nalogi (mesečni dnevnik kilometrov)
- Statistika osebne uspešnosti

### CRM (vsi prodajalci)
- Upravljanje podjetij in kontaktnih oseb
- **AI skeniranje vizitk** (OpenAI / Anthropic / Google) z avtomatskim iskanjem v registru podjetij
- Pipeline za sledenje statusa strank (nov kontakt → ponudba → pogodba → aktiven)
- Sistem ponudb z avtomatskim izračunom cen
- Opomniki in naloge (Kanban tabla)
- Načrtovanje poti (Google Maps integracija)
- Iskanje podjetij po davčni številki (VIES API) in slovenskem poslovnem registru
- Izvoz v Excel

---

## Tehnologije

| Plast | Tehnologije |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI** | shadcn/ui, Tailwind CSS, Radix UI |
| **State** | TanStack Query (React Query) |
| **Routing** | React Router v6 |
| **Backend** | Supabase (self-hosted ali cloud) |
| **Baza** | PostgreSQL z RLS (Row Level Security) |
| **Auth** | Supabase Auth (email/geslo) |
| **Edge Functions** | Deno (Supabase Edge Functions) |
| **Zemljevidi** | Leaflet + OpenStreetMap |
| **PDF** | pdf-lib, jsPDF |
| **Excel** | xlsx (SheetJS) |
| **Deploy** | Docker + nginx (z brotli kompresijo) |

---

## Predpogoji

- **Node.js** >= 20
- **npm** >= 9
- **Docker** (za produkcijski zagon)
- **Supabase** instanca (self-hosted ali [supabase.com](https://supabase.com) cloud)

---

## Postavitev Supabase baze podatkov

Aplikacija zahteva Supabase instanco s PostgreSQL bazo podatkov. Lahko uporabiš brezplačen Supabase cloud projekt ali self-hosted Supabase.

### Hitra postavitev (1 datoteka)

Celotna baza (28 tabel, RLS politike, triggerji, funkcije, seed podatki) se ustvari z **eno samo SQL datoteko**:

```
database/full_setup.sql
```

#### Korak za korakom:

**1. Ustvari Supabase projekt**

- **Cloud**: Odpri [supabase.com](https://supabase.com) → New project → Izberi regijo EU Central → Zabeleži **Project URL** in **anon key** (Settings → API)
- **Self-hosted**: Sledi [uradnim navodilom](https://supabase.com/docs/guides/self-hosting/docker)

**2. Zaženi setup SQL**

Odpri Supabase Dashboard → SQL Editor → Nalepi vsebino datoteke `database/full_setup.sql` in zaženi.

Ali z ukazno vrstico:

```bash
# Z psql (self-hosted)
psql -h <supabase-db-host> -U postgres -d postgres -f database/full_setup.sql

# Z Supabase CLI
supabase db push
```

Ta ena datoteka ustvari:
- Shemo `mat_tracker` + potrebne razširitve (`pgcrypto`, `pg_trgm`)
- Vseh **28 tabel** z vsemi stolpci, indeksi, CHECK omejitvami
- Vse **RLS politike** (Row Level Security) za varnost podatkov
- Vse **triggerje** (updated_at, completed_at avtomatizacija)
- Vse **funkcije** (AI šifriranje, fuzzy iskanje podjetij)
- **Storage bucket** za avatarje
- **Dovoljenja** (GRANT) za authenticated/anon uporabnike
- **Seed podatke** (tipi predpražnikov, celoten cenik, Optibrush cene)

**3. Ustvari prvega admin uporabnika**

1. V Supabase Dashboard: **Authentication → Users → Add user** (email + geslo)
2. V SQL Editorju:

```sql
-- Poišči UUID uporabnika
SELECT id, email FROM auth.users;

-- Ustvari admin profil (zamenjaj <user-id> z UUID)
INSERT INTO mat_tracker.profiles (id, email, first_name, last_name, role, is_active)
VALUES ('<user-id>', 'admin@example.com', 'Admin', 'Uporabnik', 'admin', true);
```

Nadaljnje uporabnike ustvariš preko admin panela v aplikaciji.

**4. (Opcijsko) Naloži register slovenskih podjetij**

Za AI iskanje podjetij po imenu/davčni številki potrebuješ podatke iz AJPES registra (~278.000 vrstic). Tabelo `slovenian_companies` setup skripta že ustvari - potrebuješ le uvoziti podatke.

**5. (Opcijsko) Nastavi AI šifriranje**

Če želiš uporabljati AI skeniranje vizitk, nastavi passphrase v Supabase:

```sql
ALTER DATABASE postgres SET app.ai_key_passphrase = 'tvoj-tajni-passphrase';
```

### Alternativa: Migracijske datoteke

Namesto ene datoteke lahko uporabiš 47 posameznih migracij v `supabase/migrations/`. Te so uporabne za obstoječe baze, ki že imajo del strukture. Za novo postavitev priporočamo `database/full_setup.sql`.

---

## Backup in restore

`database/full_setup.sql` ustvari samo **prazno strukturo** baze. Za obnovo s podatki (stranke, kontakti, QR kode, cikli, ponudbe, potni nalogi...) potrebuješ backup produkcijske baze.

### Backup (reden)

Naredi kompletni backup celotne baze (struktura + vsi podatki + uporabniški računi):

```bash
./database/backup.sh
```

Backup se shrani v `database/backups/mat_tracker_backup_YYYYMMDD_HHMMSS.sql.gz`.

Skripta naredi pg_dump treh delov:
1. **mat_tracker shema** - vseh 28 tabel z vsemi podatki (stranke, kontakti, cikli, ponudbe, potni nalogi, GPS seje...)
2. **auth.users** - uporabniški računi z gesli (da se lahko prijavijo)
3. **storage metapodatki** - reference na avatarje in podpise

### Restore (obnova)

Za obnovo celotne baze iz backupa:

```bash
./database/restore.sh database/backups/mat_tracker_backup_20260308_120000.sql.gz
```

Skripta:
1. Vpraša za potrditev (izbriše obstoječe podatke!)
2. Dekompresira backup
3. Kopira na strežnik in uvozi v PostgreSQL
4. Počisti začasne datoteke

### Priporočena praksa

- Redno izvajaj backup (vsaj tedensko)
- Hrani backupe na **ločeni lokaciji** (ne samo na strežniku!)
- Backup datoteke (`database/backups/`) niso v git repozitoriju (vsebujejo podatke strank)
- Pred večjimi posodobitvami vedno naredi backup

### Celotna obnova od nič

Če rabiš postaviti celotno aplikacijo na novo (nov strežnik, nov Supabase):

```bash
# 1. Postavi Supabase instanco (cloud ali self-hosted)

# 2. Če imaš backup: restore
./database/restore.sh database/backups/<zadnji-backup>.sql.gz

# 3. Če nimaš backupa: prazna baza
psql -h <host> -U postgres -d postgres -f database/full_setup.sql
# ... nato ročno ustvari admin uporabnika (glej zgoraj)

# 4. Nastavi .env s Supabase URL in ključem

# 5. Build in zaženi Docker container
docker build -t mat-tracker-pro .
docker run -d --name mat-tracker-pro --restart unless-stopped -p 3000:80 mat-tracker-pro
```

---

## Spremenljivke okolja

Ustvari `.env` datoteko v korenu projekta:

```env
# Obvezno - Supabase povezava
VITE_SUPABASE_URL=https://tvoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcijsko - ime sheme (privzeto: mat_tracker)
VITE_DB_SCHEMA=mat_tracker
```

| Spremenljivka | Opis | Obvezna |
|---------------|------|---------|
| `VITE_SUPABASE_URL` | URL tvoje Supabase instance | Da |
| `VITE_SUPABASE_ANON_KEY` | Javni anon ključ (Settings → API) | Da |
| `VITE_DB_SCHEMA` | Ime PostgreSQL sheme | Ne (privzeto: `mat_tracker`) |

> **Opomba:** `VITE_` prefix je zahtevan ker Vite te spremenljivke vgradi v frontend ob build-u. Anon key je varen za frontend - RLS politike ščitijo podatke.

---

## Zagon razvojnega okolja

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/<user>/mat-tracker-pro.git
cd mat-tracker-pro

# 2. Namesti odvisnosti
npm install

# 3. Ustvari .env datoteko (glej zgoraj)
cp .env.example .env  # ali ustvari ročno

# 4. Zaženi razvojni strežnik
npm run dev
```

Aplikacija je dostopna na `http://localhost:5173`.

### Ostali ukazi

```bash
npm run build          # Produkcijski build
npm run preview        # Predogled produkcijskega builda
npm run test           # Zaženi unit teste (vitest)
npm run test:coverage  # Testi s pokritostjo
npm run test:e2e       # E2E testi (Playwright)
npm run lint           # ESLint preverjanje
```

---

## Zagon z Docker

Aplikacija se zgradi kot statična SPA (Single Page Application) in servira preko nginx-a z brotli kompresijo.

### Enostaven zagon

```bash
# 1. Ustvari .env datoteko z VITE_ spremenljivkami (potrebne ob build-u!)

# 2. Build Docker image
docker build -t mat-tracker-pro .

# 3. Zaženi container
docker run -d \
  --name mat-tracker-pro \
  --restart unless-stopped \
  -p 3000:80 \
  mat-tracker-pro
```

Aplikacija je dostopna na `http://localhost:3000`.

### Kako deluje Docker build

Docker build poteka v 3 stopnjah (multi-stage):

1. **brotli-builder** - Prevede nginx brotli modul za kompresijo
2. **builder** - `npm ci && npm run build` zgradi React aplikacijo (`.env` spremenljivke se vgradijo tukaj!)
3. **production** - nginx:alpine servira statične datoteke s pre-kompresijo (gzip + brotli)

> **Pomembno:** Ker je to SPA frontend, se `VITE_` spremenljivke vgradijo ob `npm run build`. To pomeni, da moraš `.env` datoteko imeti prisotno **preden** zaženeš `docker build`. Supabase URL in ključ sta "vpečena" v JavaScript bundle.

### Build z build argumenti (alternativa .env)

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://tvoj-projekt.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=tvoj-anon-key \
  -t mat-tracker-pro .
```

Za to moraš dodati `ARG` direktive v Dockerfile (trenutno ni podprto out-of-the-box).

### Za reverzni proxy (nginx proxy manager, Traefik, Caddy)

```bash
docker run -d \
  --name mat-tracker-pro \
  --restart unless-stopped \
  --network tvoje-proxy-omrezje \
  -p 3000:80 \
  mat-tracker-pro
```

Reverzni proxy naj usmerja promet na port 80 containerja. SSL/TLS terminacijo izvaja proxy.

### Nginx konfiguracija v containerju

Container nginx vključuje:
- **Brotli + Gzip** pre-kompresija statičnih datotek
- **SPA routing** - vsi pathi preusmerjeni na `index.html`
- **VIES proxy** - `/api/vies/` posreduje na EU VIES API za preverjanje davčnih številk (rate limited: 5 req/min)
- **Varnostne glave** - CSP, HSTS, X-Frame-Options, itd.
- **Cache** - 1 leto za statične assete z hashi, brez cache-a za `index.html`
- **Health check** - `wget` na port 80 vsake 30 sekund

---

## Uporabniške vloge

| Vloga | Opis | Dostop |
|-------|------|--------|
| **admin** | Polni dostop do sistema | Vse funkcije + uporabniški računi |
| **inventar** | Upravljalec inventarja | Vse razen uporabniških računov |
| **prodajalec** | Prodajalec predpražnikov | Lastne QR kode, cikli, kontakti, ponudbe |
| **prodajalec_oblek** | Prodajalec oblačil | Kontakti, naloge (brez QR kod in predpražnikov) |

Uporabniki lahko imajo **sekundarno vlogo** za dostop do več panelov (npr. admin s prodajalec dostopom).

---

## Življenjski cikel predpražnika

```
Prosta (available)
  │ Skeniranje QR kode + izbira tipa
  ▼
Čista (clean)
  │ Postavitev na test pri stranki
  ▼
Na testu (on_test) ──── Podaljšanje (+7 dni)
  │                         │
  │ Podpis pogodbe          │
  │ ali konec testa   ◄─────┘
  ▼
Umazana (dirty)
  │ Zahteva za prevzem
  ▼
Čaka šoferja (waiting_driver)
  │ Šofer pobere
  ▼
Zaključeno (completed) → nazaj na Prosto
```

**Alternativne poti:**
- **Odstranitev** - iz kateregakoli statusa nazaj na prosto
- **Lasten prevzem** - prodajalec sam pobere umazanega (preskoči šoferja)

---

## Struktura projekta

```
mat-tracker-pro/
├── src/
│   ├── components/          # UI komponente (shadcn/ui + custom)
│   │   ├── contacts/        # CRM - podjetja, kontakti, ponudbe
│   │   ├── inventar/        # Admin panel komponente
│   │   ├── prodajalec/      # Prodajalec panel komponente
│   │   └── ui/              # shadcn/ui bazne komponente
│   ├── hooks/               # React hooks za Supabase queries
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client konfiguracija
│   │       └── types.ts     # Auto-generirani TypeScript tipi za bazo
│   ├── lib/                 # Utility funkcije
│   └── pages/               # Strani aplikacije
│       ├── inventar/        # Admin/Inventar strani
│       ├── prodajalec/      # Prodajalec strani
│       └── contacts/        # CRM strani
├── supabase/
│   ├── config.toml          # Supabase CLI konfiguracija
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── create-user/     # Ustvarjanje uporabnikov
│   │   ├── delete-user/     # Brisanje uporabnikov
│   │   ├── update-user-password/  # Resetiranje gesel
│   │   ├── scan-business-card/    # AI OCR vizitk
│   │   ├── save-ai-settings/     # Shranjevanje AI ključev
│   │   └── send-test-warning/    # Email opozorila
│   └── migrations/          # SQL migracijske datoteke (47 datotek)
├── Dockerfile               # Multi-stage build (brotli + node + nginx)
├── nginx.conf               # Nginx konfiguracija za SPA
├── package.json
└── .env                     # Spremenljivke okolja (ni v gitu!)
```

---

## Struktura baze podatkov

Aplikacija uporablja shemo `mat_tracker` s sledečimi glavnimi tabelami:

### Uporabniki in vloge
| Tabela | Opis |
|--------|------|
| `profiles` | Uporabniški profili (ime, vloga, QR prefix, avatar, podpis) |

### Predpražniki in sledenje
| Tabela | Opis |
|--------|------|
| `mat_types` | Katalog tipov predpražnikov (dimenzije, kategorije) |
| `qr_codes` | QR kode dodeljene prodajalcem (status: pending → available → active) |
| `cycles` | Življenjski cikli predpražnikov (test, pogodba, prevzem) |
| `cycle_history` | Revizijska sled sprememb statusov |

### CRM
| Tabela | Opis |
|--------|------|
| `companies` | Podjetja/stranke z naslovi in pipeline statusom |
| `contacts` | Kontaktne osebe podjetij |
| `company_notes` | Beležke in aktivnosti za podjetja |
| `reminders` | Opomniki za sledenje strankam |
| `tasks` | Kanban naloge (za prodajalec_oblek) |

### Ponudbe in email
| Tabela | Opis |
|--------|------|
| `email_templates` | Predloge za email ponudbe |
| `sent_emails` | Dnevnik poslanih emailov |
| `offer_items` | Postavke ponudb (tipi, cene, količine) |

### Cenik
| Tabela | Opis |
|--------|------|
| `mat_prices` | Standardni cenik predpražnikov (najem 1-4 tedne, nakup) |
| `optibrush_prices` | Cenik Optibrush po m² (rob, drenaža, barve) |
| `custom_m2_prices` | Cene po m² za posebne dimenzije |
| `price_settings` | Globalne nastavitve cen (množilniki, pragi) |

### Prevzemi
| Tabela | Opis |
|--------|------|
| `drivers` | Šoferji/dostavljalci |
| `driver_pickups` | Prevzemni nalogi |
| `driver_pickup_items` | Posamezni predpražniki v prevzemu |

### Naročila
| Tabela | Opis |
|--------|------|
| `orders` | Naročila QR kod (pending → approved → shipped → received) |
| `order_items` | Postavke naročil po tipu predpražnika |

### GPS in potni nalogi
| Tabela | Opis |
|--------|------|
| `gps_tracking_sessions` | GPS seje sledenja dnevnih poti |
| `travel_logs` | Mesečni potni nalogi |
| `travel_log_entries` | Dnevni vnosi (km, namen, pot) |

### AI in register podjetij
| Tabela | Opis |
|--------|------|
| `user_ai_settings` | Šifrirani AI API ključi (pgcrypto) |
| `slovenian_companies` | Register slovenskih podjetij (~278k) za iskanje |

### Ključni odnosi

```
profiles ──→ qr_codes ──→ cycles ──→ companies
                              │         └──→ contacts
                              ▼
                        cycle_history (revizijska sled)

cycles ──→ sent_emails ──→ offer_items
cycles ──→ driver_pickup_items ──→ driver_pickups
profiles ──→ travel_logs ──→ travel_log_entries
```

### RLS (Row Level Security) strategija

- Vse tabele imajo omogočen RLS
- **Lastniški dostop** - uporabniki vidijo le lastne podatke
- **Admin/inventar** - globalni SELECT na večini tabel
- **Ceniki** - javno branje za vse avtenticirane uporabnike
- **Edge Functions** - uporabljajo service role za privilegirane operacije

---

## Edge Functions

Supabase Edge Functions (Deno runtime) za strežniške operacije:

| Funkcija | Opis |
|----------|------|
| `create-user` | Ustvarjanje novih uporabnikov (admin/inventar kličeta) |
| `delete-user` | Brisanje uporabnikov s kaskadnim čiščenjem |
| `update-user-password` | Resetiranje gesla uporabnika |
| `scan-business-card` | AI OCR vizitk → ekstrakcija podatkov → fuzzy iskanje v registru |
| `save-ai-settings` | Šifriranje in shranjevanje AI API ključev |
| `send-test-warning` | Email opozorila za predolge teste |

### Deploy Edge Functions

```bash
# Z Supabase CLI
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy scan-business-card
# ... itd.
```

Edge Functions zahtevajo nastavitev okoljskih spremenljivk v Supabase Dashboard → Edge Functions → Secrets.

---

## Licenca

Zasebni projekt. Vsa pravica pridržana.

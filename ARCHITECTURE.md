# Mat Tracker Pro - Arhitektura

## Pregled sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React + TypeScript + Vite + TailwindCSS + shadcn/ui            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Kontakti  │  │  Prodajalec │  │       Inventar          │  │
│  │  (CRM)      │  │  Dashboard  │  │  (Admin + Šoferji)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │ Edge Functions   │ │
│  │(mat_tracker│  │          │  │          │  │ - create-user    │ │
│  │ schema)  │  │          │  │          │  │ - delete-user    │ │
│  └──────────┘  └──────────┘  └──────────┘  │ - send-warning   │ │
│                                            └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DEPLOYMENT                                 │
│  Docker + nginx + Nginx Proxy Manager (SSL)                     │
│  Server: 148.230.109.77 | Domena: matpro.ristov.xyz             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Struktura projekta

```
mat-tracker-pro/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Router in layout
│   │
│   ├── pages/                   # Strani aplikacije
│   │   ├── Contacts.tsx         # CRM - upravljanje strank (4958 vrstic!)
│   │   ├── ProdajalecDashboard.tsx  # Dashboard za prodajalca
│   │   ├── Login.tsx            # Prijava
│   │   ├── InventarDashboard.tsx    # Dashboard za inventar
│   │   └── inventar/            # Inventar modul
│   │       ├── SellerPage.tsx   # Stran prodajalca
│   │       ├── DriverPickups.tsx    # Prevzemi šoferja
│   │       ├── DirtyMats.tsx    # Umazani predpražniki
│   │       └── components/      # Komponente za inventar
│   │
│   ├── components/              # Shared komponente
│   │   ├── ui/                  # shadcn/ui komponente
│   │   ├── ProtectedRoute.tsx   # Auth guard
│   │   ├── InventarSidebar.tsx  # Navigacija
│   │   └── ContractModal.tsx    # Modal za pogodbe
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useCompanies.ts      # CRUD za podjetja
│   │   ├── useCycles.ts         # Življenjski cikel predpražnika
│   │   ├── useQRCodes.ts        # QR kode
│   │   ├── useProfiles.ts       # Uporabniški profili
│   │   ├── useReminders.ts      # Opomniki
│   │   └── useDriverPickups.ts  # Prevzemi
│   │
│   ├── contexts/                # React Context
│   │   └── AuthContext.tsx      # Avtentikacija
│   │
│   ├── integrations/supabase/   # Supabase konfiguracija
│   │   ├── client.ts            # Supabase client
│   │   └── types.ts             # Database tipi
│   │
│   └── utils/                   # Pomožne funkcije
│       ├── postalCodes.ts       # Poštne številke → kraji
│       └── companyLookup.ts     # Iskanje po davčni
│
├── supabase/
│   ├── functions/               # Edge Functions
│   │   ├── create-user/         # Ustvarjanje uporabnika
│   │   ├── delete-user/         # Brisanje uporabnika
│   │   └── send-test-warning/   # Email opozorila
│   └── migrations/              # SQL migracije
│
├── public/
│   └── manifest.json            # PWA manifest
│
├── database/
│   └── mat_tracker_schema.sql   # Celotna DB shema
│
├── Dockerfile                   # Docker build
├── nginx.conf                   # nginx konfiguracija
└── CLAUDE.md                    # Navodila za Claude
```

---

## Vloge uporabnikov

| Vloga | Opis | Dostop |
|-------|------|--------|
| **ADMIN** | Administrator sistema | Vse |
| **INVENTAR** | Upravljalec inventarja | Inventar, prodajalci, šoferji |
| **SALESPERSON** | Prodajalec | Kontakti, svoje stranke |
| **DRIVER** | Šofer (dostava/pralnica) | Prevzemi, dostave |

---

## Podatkovni model (ključne tabele)

```
companies (Podjetja/Stranke)
├── id, name, display_name
├── tax_number (davčna)
├── address_street, address_postal, address_city (sedež)
├── delivery_address, delivery_postal, delivery_city (poslovalnica)
├── pipeline_status (new → contacted → offer_sent → contract_sent → signed)
└── salesperson_id (FK → profiles)

contacts (Kontaktne osebe)
├── id, company_id (FK)
├── first_name, last_name, phone, email
├── role, is_primary
└── location_address

company_notes (Opombe/CRM)
├── id, company_id (FK)
├── note_date, content
└── created_by (FK → auth.users)

mat_cycles (Življenjski cikel predpražnika)
├── id, qr_code_id, company_id, salesperson_id
├── status (available → on_test → dirty → waiting_driver → completed)
├── test_start_date, test_end_date
├── contract_signed, contract_signed_at
└── location_lat, location_lng

qr_codes (QR kode predpražnikov)
├── id, code (unikaten)
├── mat_type_id, status, seller_id
└── last_status_change

profiles (Uporabniški profili)
├── id (= auth.users.id)
├── full_name, email, phone
├── role (admin/inventar/salesperson/driver)
└── driver_type (delivery/laundry)
```

---

## Glavni tokovi (Flows)

### 1. Prodajni tok (CRM)
```
Nova stranka → Kontaktiranje → Ponudba → Pogodba → Aktivna stranka
     │              │             │          │
     └── Opombe ────┴── Email ────┴── .ics ──┘
```

### 2. Življenjski cikel predpražnika
```
available (na zalogi)
    │
    ▼ (prodajalec skenira, postavi na test)
on_test (pri stranki)
    │
    ▼ (stranka ga umaže / poteče test)
dirty (umazan)
    │
    ▼ (inventar ga doda na seznam za prevzem)
waiting_driver (čaka šoferja)
    │
    ▼ (šofer pobere)
completed (v pralnici)
    │
    └──► available (nazaj na zalogi)
```

---

## API integracije

| Storitev | Namen | Endpoint |
|----------|-------|----------|
| **AJPES** | Iskanje podjetij po davčni | ePRS API |
| **OpenRouteService** | Optimizacija poti | openrouteservice.org |
| **BillionMail** | Pošiljanje emailov | mail.ristov.xyz |

---

## Okolja

| Okolje | URL | Namen |
|--------|-----|-------|
| **Production** | https://matpro.ristov.xyz | Živa aplikacija |
| **Development** | http://localhost:5173 | Lokalni razvoj |
| **Supabase** | https://api-matpro.ristov.xyz | Self-hosted Supabase |

---

## Ključni koncepti za razvijalce

### 1. TanStack Query (React Query)
Vsi API klici uporabljajo React Query za caching in state management.
```typescript
const { data: companies } = useCompanies();
const createCompany = useCreateCompany();
```

### 2. Supabase RLS (Row Level Security)
Vsaka tabela ima RLS politike. Če dobiš "permission denied", preveri:
1. Ali je RLS omogočen
2. Ali obstajajo politike
3. Ali ima vloga GRANT pravice

### 3. Schema `mat_tracker`
Aplikacija uporablja custom schema, ne `public`:
```typescript
export const supabase = createClient(URL, KEY, {
  db: { schema: 'mat_tracker' }
});
```

---

*Ustvarjeno: 2026-01-18*
*Avtor: Claude (Opus 4.5)*

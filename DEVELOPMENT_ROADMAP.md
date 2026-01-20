# Mat Tracker Pro - Development Roadmap

## Trenutno stanje: 7.5/10

Aplikacija je funkcionalna in v produkciji. Spodaj je načrt za izboljšave.

---

## Pregled načrtovanih funkcij

| # | Funkcija | Prioriteta | Ocena kompleksnosti |
|---|----------|------------|---------------------|
| 1 | Dashboard analytics | VISOKA | Srednja |
| 2 | Auto reminders | VISOKA | Srednja |
| 3 | Error handling | VISOKA | Nizka-Srednja |
| 4 | Testi | SREDNJA | Visoka |
| 5 | Advanced map + route optimization | SREDNJA | Visoka |
| 6 | Financial reporting | SREDNJA | Srednja |
| 7 | Price management UI | NIZKA | Nizka |
| 8 | Roles & permissions | SREDNJA | Visoka |
| 9 | Real-time notifications | NIZKA | Srednja |

---

## FAZA 1: Stabilnost in kvaliteta

### 1.1 Error Handling (Prioriteta: VISOKA)
**Cilj:** Robustno ravnanje z napakami po celotni aplikaciji

**Datoteke:**
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/utils/errorHandler.ts` - Centraliziran handler
- `src/hooks/useErrorToast.ts` - Toast notifikacije za napake

**Podrobnosti:** Glej `ERROR_HANDLING.md`

### 1.2 Testi (Prioriteta: SREDNJA)
**Cilj:** Unit in integration testi za kritične poti

**Setup:**
- Vitest za unit teste
- React Testing Library za komponente
- Playwright za E2E

**Podrobnosti:** Glej `TESTING_STRATEGY.md`

---

## FAZA 2: Admin Panel izboljšave

### 2.1 Dashboard Analytics (Prioriteta: VISOKA)
**Cilj:** Vizualni pregled ključnih metrik

**Komponente:**
```
src/pages/inventar/Analytics/
├── AnalyticsDashboard.tsx     # Glavna stran
├── components/
│   ├── SalesChart.tsx         # Graf prodaje po mesecih
│   ├── CycleStatusChart.tsx   # Pie chart statusov
│   ├── SellerPerformance.tsx  # Lestvica prodajalcev
│   ├── TestExpiry.tsx         # Testi ki potečejo
│   └── KPICards.tsx           # Ključni indikatorji
└── hooks/
    └── useAnalyticsData.ts    # Data fetching
```

**Metrike:**
- Število aktivnih ciklov po statusu (on_test, dirty, waiting_driver)
- Konverzija: test → pogodba (%)
- Povprečni čas na testu
- Top 10 prodajalcev po prodaji
- Testi ki potečejo v 3 dneh
- Mesečni trend novih strank

**Tehnologije:**
- Recharts ali Chart.js za grafe
- React Query za podatke
- Aggregated queries v Supabase

### 2.2 Auto Reminders (Prioriteta: VISOKA)
**Cilj:** Avtomatski email opomniki

**Tipi opomnikov:**
1. **Test poteče v 3 dneh** - Opomni prodajalca
2. **Test poteče danes** - Urgentno opozorilo
3. **Test je potekel** - Dnevno opozorilo dokler ni akcije
4. **Stranka čaka na follow-up** - CRM reminder

**Implementacija:**
```
supabase/functions/
├── send-reminder-emails/      # Edge function
│   ├── index.ts
│   └── templates/
│       ├── test-expiring.html
│       ├── test-expired.html
│       └── follow-up-due.html
```

**Tabele:**
```sql
-- Nova tabela za nastavitve opomnikov
CREATE TABLE mat_tracker.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  reminder_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  days_before INT DEFAULT 3,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false
);

-- Log poslanih opomnikov
CREATE TABLE mat_tracker.sent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES mat_tracker.cycles(id),
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  email_to TEXT
);
```

**Cron Job:**
- Supabase pg_cron ali external scheduler
- Dnevno ob 8:00 preveri teste ki potečejo

### 2.3 Price Management UI (Prioriteta: NIZKA)
**Cilj:** Admin vmesnik za urejanje cenika

**Trenutno stanje:**
- Cene so v `src/utils/priceList.ts` (hardcoded)
- Potrebna migracija v bazo

**Komponente:**
```
src/pages/inventar/PriceManagement/
├── PriceManagement.tsx        # Glavna stran
├── components/
│   ├── PriceTable.tsx         # Tabela cen
│   ├── PriceEditModal.tsx     # Modal za urejanje
│   └── PriceHistory.tsx       # Zgodovina sprememb
└── hooks/
    └── usePrices.ts           # CRUD za cene
```

**Nova tabela:**
```sql
CREATE TABLE mat_tracker.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mat_type_id UUID REFERENCES mat_tracker.mat_types(id),
  price_type TEXT NOT NULL, -- 'monthly', 'seasonal', 'purchase'
  price DECIMAL(10,2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## FAZA 3: Napredne funkcije

### 3.1 Advanced Map + Route Optimization (Prioriteta: SREDNJA)
**Cilj:** Pametno načrtovanje poti za šoferje

**Komponente:**
```
src/pages/inventar/RouteOptimization/
├── RouteOptimization.tsx      # Glavna stran
├── components/
│   ├── RouteMap.tsx           # Leaflet zemljevid
│   ├── RouteList.tsx          # Seznam postaj
│   ├── RouteSettings.tsx      # Nastavitve (max postaj, čas)
│   └── RouteExport.tsx        # PDF/print izvoz
└── hooks/
    └── useRouteOptimization.ts # API klici
```

**Funkcionalnosti:**
1. **Izbira ciklov za pobiranje** - Filter po lokaciji, prodajalcu, datumu
2. **Optimizacija vrstnega reda** - OpenRouteService API
3. **Vizualizacija poti** - Leaflet z markers in polyline
4. **Turn-by-turn navodila** - GPS koordinate
5. **PDF izvoz** - Za tiskanje
6. **Shranjevanje rut** - Za ponovni ogled

**API:**
```typescript
// OpenRouteService optimization endpoint
POST https://api.openrouteservice.org/v2/optimization

{
  "jobs": [
    { "id": 1, "location": [14.5058, 46.0569] },
    { "id": 2, "location": [14.5128, 46.0504] }
  ],
  "vehicles": [
    { "id": 1, "start": [14.5, 46.05], "end": [14.5, 46.05] }
  ]
}
```

### 3.2 Financial Reporting (Prioriteta: SREDNJA)
**Cilj:** Finančni pregledi in poročila

**Komponente:**
```
src/pages/inventar/FinancialReports/
├── FinancialReports.tsx       # Glavna stran
├── components/
│   ├── RevenueChart.tsx       # Graf prihodkov
│   ├── ContractValue.tsx      # Vrednost pogodb
│   ├── ForecastTable.tsx      # Napoved prihodkov
│   └── ExportButtons.tsx      # Excel/PDF izvoz
└── hooks/
    └── useFinancialData.ts
```

**Poročila:**
1. **Mesečni prihodki** - Vsota aktivnih pogodb × cena
2. **Napoved** - Na podlagi aktivnih testov in konverzije
3. **Po prodajalcih** - Kdo prinese največ
4. **Po regijah** - Zemljevid prihodkov
5. **Trend** - YoY primerjava

**Excel izvoz:**
- xlsx knjižnica (že nameščena)
- Predloge za standardna poročila

### 3.3 Roles & Permissions (Prioriteta: SREDNJA)
**Cilj:** Granularno upravljanje pravic

**Trenutno stanje:**
- 4 vloge: admin, inventar, salesperson, driver
- RLS politike v Supabase
- Potrebna bolj fleksibilna rešitev

**Nova struktura:**
```sql
-- Dovoljenja
CREATE TABLE mat_tracker.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'view_analytics', 'manage_users', etc.
  description TEXT
);

-- Vloge
CREATE TABLE mat_tracker.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Role-Permission mapping
CREATE TABLE mat_tracker.role_permissions (
  role_id UUID REFERENCES mat_tracker.roles(id),
  permission_id UUID REFERENCES mat_tracker.permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- User roles
CREATE TABLE mat_tracker.user_roles (
  user_id UUID REFERENCES auth.users(id),
  role_id UUID REFERENCES mat_tracker.roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

**Komponente:**
```
src/pages/inventar/RolesManagement/
├── RolesManagement.tsx        # Glavna stran
├── components/
│   ├── RolesList.tsx          # Seznam vlog
│   ├── RoleEditor.tsx         # Urejanje vloge
│   ├── PermissionMatrix.tsx   # Matrika dovoljenj
│   └── UserRoleAssign.tsx     # Dodeljevanje vlog
└── hooks/
    └── useRoles.ts
```

**Hook za preverjanje pravic:**
```typescript
// src/hooks/usePermissions.ts
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  const { data: permissions } = useUserPermissions(user?.id);
  return permissions?.includes(permission) ?? false;
}

// Uporaba
const canViewAnalytics = usePermission('view_analytics');
```

### 3.4 Real-time Notifications (Prioriteta: NIZKA)
**Cilj:** Takojšnja obvestila v aplikaciji

**Tipi notifikacij:**
1. **Test poteče** - Prodajalec
2. **Novo naročilo QR kod** - Inventar
3. **Nov prevzem** - Šofer
4. **Stranka podpisala pogodbo** - Prodajalec

**Implementacija:**
```
src/components/
├── NotificationBell.tsx       # Ikona z badge
├── NotificationDropdown.tsx   # Seznam notifikacij
└── NotificationItem.tsx       # Posamezna notifikacija

src/hooks/
└── useNotifications.ts        # Supabase realtime
```

**Tabela:**
```sql
CREATE TABLE mat_tracker.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
  read BOOLEAN DEFAULT false,
  link TEXT, -- URL za klik
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Supabase Realtime:**
```typescript
// src/hooks/useNotifications.ts
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'mat_tracker',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Prikaži toast
      toast.info(payload.new.title);
      // Osveži query
      queryClient.invalidateQueries(['notifications']);
    }
  )
  .subscribe();
```

---

## Časovnica

```
TEDEN 1-2: Faza 1 (Error handling, osnovni testi)
    └── Error boundary, toast notifikacije, Vitest setup

TEDEN 3-4: Faza 2a (Dashboard analytics)
    └── Grafi, KPI kartice, prodajalec lestvica

TEDEN 5-6: Faza 2b (Auto reminders)
    └── Edge function, email templates, cron job

TEDEN 7-8: Faza 3a (Advanced map)
    └── OpenRouteService integracija, optimizacija poti

TEDEN 9-10: Faza 3b (Financial reporting)
    └── Prihodki, napovedi, Excel izvoz

TEDEN 11-12: Faza 3c (Roles & permissions)
    └── DB shema, admin UI, permission hook

TEDEN 13+: Faza 3d (Real-time notifications) + poliranje
    └── Supabase realtime, notification center
```

---

## Tehnične odločitve

| Odločitev | Izbira | Razlog |
|-----------|--------|--------|
| Grafi | Recharts | Že poznamo, React-native |
| Route optimization | OpenRouteService | Brezplačen tier, dobra dokumentacija |
| Testi | Vitest + RTL | Hiter, Vite integracija |
| Notifikacije | Supabase Realtime | Že imamo Supabase |
| PDF | jsPDF | Že uporabljamo |

---

## Datoteke dokumentacije

| Datoteka | Namen |
|----------|-------|
| `DEVELOPMENT_ROADMAP.md` | Ta datoteka - pregled načrta |
| `ADMIN_PANEL_FEATURES.md` | Podrobnosti admin funkcij |
| `ERROR_HANDLING.md` | Strategija ravnanja z napakami |
| `TESTING_STRATEGY.md` | Strategija testiranja |
| `CLAUDE.md` | Navodila za Claude (deploy) |
| `README.md` | Osnovna dokumentacija projekta |

---

*Posodobljeno: 2026-01-18*

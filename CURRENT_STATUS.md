# MAT TRACKER PRO - TRENUTNO STANJE
## Posodobljen načrt (15. januar 2026)

---

# POVZETEK

Aplikacija je v aktivnem razvoju. **Prodajalec del je večinoma končan**, medtem ko je **Inventar panel delno implementiran**. Spodaj je podroben pregled funkcionalnosti.

---

# 1. PRODAJALEC APLIKACIJA

## Implementirano (DONE)

| Funkcionalnost | Status | Lokacija |
|----------------|--------|----------|
| **Avtentikacija** | ✅ DONE | `src/pages/Auth.tsx` |
| **Dashboard** | ✅ DONE | `src/pages/ProdajalecDashboard.tsx` |
| QR skeniranje (html5-qrcode) | ✅ DONE | Dashboard |
| Aktivacija predpražnika (izbira tipa) | ✅ DONE | Dashboard |
| Daj na test (izbira podjetja/kontakta) | ✅ DONE | Dashboard |
| Podaljšanje testa (+7 dni) | ✅ DONE | Dashboard |
| Pobiranje (status dirty) | ✅ DONE | Dashboard |
| Podpis pogodbe (frekvenca) | ✅ DONE | Dashboard |
| Zahtevek za šoferja (waiting_driver) | ✅ DONE | Dashboard |
| **Kontakti stran** | ✅ DONE | `src/pages/Contacts.tsx` |
| Seznam podjetij s kontakti | ✅ DONE | Contacts |
| Iskanje po podjetjih | ✅ DONE | Contacts |
| Dodajanje podjetja/kontakta | ✅ DONE | Contacts |
| Zgodovina ciklov po podjetju | ✅ DONE | Contacts |
| Hitri klici (tel:, mailto:, maps) | ✅ DONE | Contacts |
| **Generiranje ponudb (PDF)** | ✅ DONE | Contacts |
| Najem ponudba (več sezon) | ✅ DONE | Contacts |
| Nakup ponudba | ✅ DONE | Contacts |
| Primerjalna ponudba | ✅ DONE | Contacts |
| Dodatna oprema ponudba | ✅ DONE | Contacts |
| **Naročanje QR kod** | ✅ DONE | `src/pages/OrderCodes.tsx` |
| Seznam naročil (status) | ✅ DONE | OrderCodes |
| Oddaja novega naročila | ✅ DONE | OrderCodes |

## Manjka (TODO)

| Funkcionalnost | Prioriteta | Opomba |
|----------------|------------|--------|
| Offline mode | LOW | Ni nujno, vedno online |
| Push notifikacije | LOW | Za opomnike testov |
| Email pošiljanje iz app | MEDIUM | BillionMails integracija |

---

# 2. INVENTAR PANEL

## Implementirano (DONE)

| Funkcionalnost | Status | Lokacija |
|----------------|--------|----------|
| **Dashboard** | ✅ DONE | `src/pages/inventar/InventarDashboard.tsx` |
| Statistika (QR kode, prodajalci) | ✅ DONE | Dashboard |
| Meni mreža (navigacija) | ✅ DONE | Dashboard |
| **Upravljanje računov** | ✅ DONE | `src/pages/inventar/AccountsManagement.tsx` |
| Seznam prodajalcev/inventar | ✅ DONE | AccountsManagement |
| Urejanje profilov | ✅ DONE | AccountsManagement |
| Deaktivacija uporabnikov | ✅ DONE | AccountsManagement |
| **Proste kode** | ✅ DONE | `src/pages/inventar/FreeCodes.tsx` |
| Bulk ustvarjanje QR kod | ✅ DONE | FreeCodes |
| Dodeljevanje prodajalcu | ✅ DONE | FreeCodes |
| **Pregled QR kod** | ✅ DONE | `src/pages/inventar/QROverview.tsx` |
| Vse kode po prodajalcu | ✅ DONE | QROverview |
| Status kod (pending/available/active) | ✅ DONE | QROverview |
| Podrobnosti aktivnih ciklov | ✅ DONE | QROverview |
| Excel izvoz | ✅ DONE | QROverview |
| **Tiskanje QR kod** | ✅ DONE | `src/pages/inventar/PrintQR.tsx` |
| Generiranje PDF (jsPDF) | ✅ DONE | PrintQR |
| Nastavljiva mreža (1-4 na vrstico) | ✅ DONE | PrintQR |
| Filter po datumu/obsegu | ✅ DONE | PrintQR |
| **Prevzemi (TesterRequests)** | ✅ DONE | `src/pages/inventar/TesterRequests.tsx` |
| Seznam ciklov waiting_driver | ✅ DONE | TesterRequests |
| Zaključevanje ciklov | ✅ DONE | TesterRequests |
| Avto reset QR kode na available | ✅ DONE | TesterRequests |
| **Zgodovina** | ✅ DONE | `src/pages/inventar/DeletionHistory.tsx` |
| Audit log | ✅ DONE | DeletionHistory |
| Excel izvoz | ✅ DONE | DeletionHistory |

## Manjka (TODO)

| Funkcionalnost | Prioriteta | Opomba |
|----------------|------------|--------|
| **Šoferski seznami** | HIGH | driver_pickups tabela obstaja |
| Ustvarjanje seznama | HIGH | Izbira več ciklov → seznam |
| PDF za šoferja | HIGH | Grupiranje po mestih |
| Označi kot pobrano | HIGH | Batch zaključevanje |
| **Poročila** | MEDIUM | Mesečna statistika |
| Grafi (recharts) | MEDIUM | Trend po mesecih |
| Excel/PDF izvoz | MEDIUM | |
| **Upravljanje naročil** | MEDIUM | orders tabela obstaja |
| Odobritev/zavrnitev | MEDIUM | |
| Avtomatska notifikacija | LOW | |
| **Pregled prodajalcev** | LOW | Podroben pogled enega |
| Opozorila (testi potečejo) | LOW | Real-time alerts |

---

# 3. BAZA PODATKOV (Supabase)

## Tabele - Implementirane

| Tabela | Status | Opomba |
|--------|--------|--------|
| `profiles` | ✅ DONE | Vloge: prodajalec, inventar, admin |
| `mat_types` | ✅ DONE | 15 tipov + cenik |
| `companies` | ✅ DONE | Podjetja strank |
| `contacts` | ✅ DONE | Kontaktne osebe |
| `qr_codes` | ✅ DONE | QR inventar |
| `cycles` | ✅ DONE | Življenjski cikel predpražnika |
| `cycle_history` | ✅ DONE | Audit log |
| `orders` | ✅ DONE | Naročila QR kod |
| `order_items` | ✅ DONE | Postavke naročil |
| `email_templates` | ✅ DONE | Email predloge |
| `sent_emails` | ✅ DONE | Poslani emaili |
| `offer_items` | ✅ DONE | Postavke ponudb |
| `driver_pickups` | ✅ DONE | Šoferski seznami |
| `driver_pickup_items` | ✅ DONE | Postavke seznamov |

## RLS Politike

| Pravilo | Status |
|---------|--------|
| Prodajalec vidi samo svoje | ✅ DONE |
| Inventar/Admin vidi vse | ✅ DONE |
| Ustvarjanje po owner_id | ✅ DONE |

---

# 4. INTEGRACIJE

| Integracija | Status | Opomba |
|-------------|--------|--------|
| **Supabase Auth** | ✅ DONE | Email/geslo |
| **QR skeniranje** | ✅ DONE | html5-qrcode |
| **QR generiranje** | ✅ DONE | qrcode.react |
| **PDF ponudbe** | ✅ DONE | jsPDF |
| **PDF QR nalepke** | ✅ DONE | jsPDF |
| **Excel izvoz** | ✅ DONE | xlsx |
| **BillionMails** | PARTIAL | Konfiguracija obstaja |
| Pošiljanje emailov | TODO | API integracija |

---

# 5. KOMPONENTE IN HOOKS

## Hooks (React Query)

| Hook | Status | Namen |
|------|--------|-------|
| `useProfiles` | ✅ | Vsi profili |
| `useProdajalecProfiles` | ✅ | Prodajalci + QR count |
| `useQRCodes` | ✅ | QR kode uporabnika |
| `useAvailableQRCodes` | ✅ | Proste kode |
| `useMatTypes` | ✅ | Tipi predpražnikov |
| `useCycles` | ✅ | Aktivni cikli |
| `useCycleHistory` | ✅ | Zgodovina ciklov |
| `useCreateCycle` | ✅ | Nov cikel |
| `useUpdateCycleStatus` | ✅ | Spremeni status |
| `usePutOnTest` | ✅ | Daj na test |
| `useSignContract` | ✅ | Podpiši pogodbo |
| `useExtendTest` | ✅ | Podaljšaj test |
| `useCompanies` | ✅ | Podjetja |
| `useCompanyContacts` | ✅ | Kontakti |
| `useOrders` | ✅ | Naročila |
| `useCreateOrder` | ✅ | Novo naročilo |
| `useOrderStats` | ✅ | Statistika naročil |
| `useInventarStats` | ✅ | Dashboard statistika |

## UI Komponente (shadcn/ui)

Nameščenih 50+ komponent:
- Button, Card, Dialog, Table, Select, Input, Tabs, Badge, Alert...
- Vsi v `src/components/ui/`

---

# 6. DEPLOYMENT

| Element | Vrednost |
|---------|----------|
| **Frontend URL** | https://matpro.ristov.xyz |
| **API URL** | https://api-matpro.ristov.xyz |
| **Server** | 148.230.109.77 |
| **Port (dev)** | 8084 |
| **Build** | `npm run build` → dist/ |

---

# 7. NASLEDNJI KORAKI (Prioritizirano)

## HIGH Priority

1. **Šoferski seznami** (Inventar)
   - [ ] Stran za ustvarjanje seznama
   - [ ] Izbira ciklov po lokaciji/prodajalcu
   - [ ] PDF generiranje z grupiranjem
   - [ ] Batch zaključevanje ciklov

2. **Email integracija** (BillionMails)
   - [ ] API konektor
   - [ ] Pošiljanje ponudb iz Contacts
   - [ ] Logging v sent_emails

## MEDIUM Priority

3. **Poročila** (Inventar)
   - [ ] Mesečna statistika stran
   - [ ] Grafi (recharts)
   - [ ] PDF/Excel izvoz

4. **Upravljanje naročil** (Inventar)
   - [ ] Seznam čakajočih
   - [ ] Odobritev/zavrnitev modal
   - [ ] Notifikacija prodajalcu

## LOW Priority

5. **Real-time alerts**
   - [ ] Opozorila za potekle teste
   - [ ] Notifikacije za nova naročila

6. **Optimizacije**
   - [ ] PWA manifest
   - [ ] Service worker (offline)

---

# 8. SPREMEMBE OD ORIGINALNEGA NAČRTA

## Dodano (ni bilo v načrtu)

| Funkcionalnost | Razlog |
|----------------|--------|
| Več sezon v najemni ponudbi | Poslovne zahteve |
| Dodatna oprema ponudba | Poslovne zahteve |
| Primerjalna ponudba | Poslovne zahteve |
| TesterRequests stran | Poenostavitev prevzemov |
| DeletionHistory | Audit potrebe |
| Kontakti s celotno zgodovino | CRM funkcionalnost |

## Odstranjeno/Preloženo

| Funkcionalnost | Razlog |
|----------------|--------|
| Offline mode | Ni kritično, vedno online |
| Push notifikacije | Lahko kasneje |
| vCard generiranje | Ni bilo potrebno |

## Spremenjeno

| Original | Novo | Razlog |
|----------|------|--------|
| Ločen pogled prodajalca | Integrirano v QROverview | Enostavneje |
| Zustand state | React Query only | Preprosteje, manj kode |

---

# 9. TEHNIČNI DOLG

| Element | Prioriteta | Opomba |
|---------|------------|--------|
| TypeScript strict mode | LOW | noImplicitAny je off |
| Test coverage | LOW | Ni testov |
| Error boundary | MEDIUM | Ni globalnega |
| Loading states | LOW | Nekateri manjkajo |

---

# 10. DATOTEČNA STRUKTURA

```
src/
├── components/
│   ├── ui/                    # shadcn komponente (50+)
│   ├── InventarSidebar.tsx    # Navigacija inventar
│   └── ProtectedRoute.tsx     # Role-based routing
│
├── contexts/
│   ├── AuthContext.tsx        # Avtentikacija
│   └── MockAuthContext.tsx    # Za testiranje
│
├── hooks/
│   ├── useAuth.ts
│   ├── useProfiles.ts
│   ├── useQRCodes.ts
│   ├── useCycles.ts
│   ├── useCompanyContacts.ts
│   ├── useOrders.ts
│   └── use*.ts                # Ostali hooks
│
├── pages/
│   ├── Auth.tsx               # Login
│   ├── Index.tsx              # Router
│   ├── ProdajalecDashboard.tsx
│   ├── Contacts.tsx
│   ├── OrderCodes.tsx
│   ├── NotFound.tsx
│   └── inventar/
│       ├── InventarDashboard.tsx
│       ├── AccountsManagement.tsx
│       ├── FreeCodes.tsx
│       ├── QROverview.tsx
│       ├── PrintQR.tsx
│       ├── TesterRequests.tsx
│       └── DeletionHistory.tsx
│
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
│
├── utils/
│   ├── priceList.ts           # Cenik + kalkulacije
│   └── postalCodes.ts         # SLO poštne številke
│
├── lib/
│   └── utils.ts               # cn() helper
│
├── App.tsx                    # Routing
├── main.tsx                   # Entry point
└── index.css                  # Global styles
```

---

**Zadnja posodobitev:** 15. januar 2026

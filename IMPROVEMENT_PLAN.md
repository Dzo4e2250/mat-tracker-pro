# Mat Tracker Pro - Ocena in Načrt Izboljšav

## Trenutna ocena: 6.5/10

### Kaj je dobro (kar dviguje oceno):
- **Tech stack**: React + TypeScript + Vite + Supabase + TailwindCSS - moderne, zanesljive tehnologije
- **Funkcionalnost**: Aplikacija je polno delujoča, pokriva vse poslovne potrebe
- **UI/UX**: Dober mobile-first pristop, intuitivni gumbi, PWA ready
- **Real-time**: Supabase omogoča real-time updates
- **Deployment**: Docker + nginx, CI/CD pripravljen

### Kaj je slabo (kar znižuje oceno):

#### 1. **Ogromne datoteke (KRITIČNO)**
```
Contacts.tsx     - 4958 vrstic  ❌ (max priporočeno ~300-500)
ProdajalecDashboard.tsx - 2313 vrstic ❌
SellerPage.tsx   - 1201 vrstic ⚠️ (že delno refaktorirano)
```

#### 2. **Pomanjkanje komentarjev**
- Ni JSDoc dokumentacije
- Ni opisov funkcij
- Novi developer bi se težko znašel

#### 3. **Mešanje odgovornosti**
- Contacts.tsx vsebuje: UI, business logic, API klice, state management, helpers - vse v eni datoteki

#### 4. **Ponavljajoča se koda**
- Podobni modali, podobne forme, podobni handleri
- Ni abstrakcije za pogoste vzorce

#### 5. **Pomanjkanje tipov**
- Veliko `any` tipov
- Tipi niso centralizirani

#### 6. **Ni testov**
- 0 unit testov
- 0 integration testov

---

## NAČRT IZBOLJŠAV

### FAZA 1: Dokumentacija (prioriteta VISOKA)
**Cilj:** Dodati komentarje za razumevanje kode

1. [ ] **Contacts.tsx** - dodati header komentar z opisom
2. [ ] **Contacts.tsx** - dokumentirati vse glavne funkcije (JSDoc)
3. [ ] **Contacts.tsx** - označiti sekcije (// ===== HOOKS ===== itd.)
4. [ ] **ProdajalecDashboard.tsx** - enako
5. [ ] **SellerPage.tsx** - enako
6. [ ] **Hooks** - dokumentirati vse custom hooks
7. [ ] Ustvariti **ARCHITECTURE.md** - pregled arhitekture

### FAZA 2: Refaktoring Contacts.tsx (prioriteta VISOKA)
**Cilj:** Razdeliti 4958 vrstic v manjše, obvladljive komponente

Predlagana struktura:
```
src/pages/contacts/
├── Contacts.tsx           # Glavni container (~200 vrstic)
├── components/
│   ├── ContactsList.tsx        # Seznam strank
│   ├── ContactCard.tsx         # Posamezna stranka
│   ├── ContactDetail.tsx       # Modal z detajli
│   ├── TodaySection.tsx        # "Danes" sekcija
│   ├── QuickNotes.tsx          # Hitri gumbi za opombe
│   ├── AddCompanyModal.tsx     # Modal za dodajanje
│   ├── EditAddressModal.tsx    # Modal za urejanje naslovov
│   ├── MeetingModal.tsx        # Modal za sestanek/ponudbo
│   ├── OfferModal.tsx          # Modal za ponudbe
│   └── FiltersBar.tsx          # Filtri in iskanje
├── hooks/
│   ├── useContacts.ts          # Logika za kontakte
│   ├── useTodayTasks.ts        # Logika za "Danes"
│   ├── useCompanyNotes.ts      # Logika za opombe
│   └── useRouteOptimization.ts # Logika za pot
├── utils/
│   ├── addressHelpers.ts       # Formatiranje naslovov
│   ├── icsGenerator.ts         # Generiranje .ics datotek
│   └── searchHelpers.ts        # Iskanje in filtriranje
└── types.ts                    # Vsi tipi za contacts
```

### FAZA 3: Tipi (prioriteta SREDNJA)
**Cilj:** Odstraniti `any` tipe, centralizirati definicije

1. [ ] Ustvariti `src/types/` mapo
2. [ ] Definirati: Company, Contact, Note, Cycle, etc.
3. [ ] Zamenjati vse `any` z pravimi tipi
4. [ ] Dodati Zod validacijo za API odgovore

### FAZA 4: Shared komponente (prioriteta SREDNJA)
**Cilj:** Abstrahirati ponavljajoče se vzorce

1. [ ] `<Modal>` - wrapper za vse modale
2. [ ] `<FormField>` - standardizirano polje
3. [ ] `<SearchInput>` - iskalno polje
4. [ ] `<StatusBadge>` - badge za statuse
5. [ ] `<AddressDisplay>` - prikaz naslova

### FAZA 5: Testi (prioriteta NIZKA za zdaj)
1. [ ] Setup Vitest
2. [ ] Unit testi za helper funkcije
3. [ ] Integration testi za hooks
4. [ ] E2E testi s Playwright

---

## KAKO NADALJEVATI

V naslednji seji Claude-a reci:

```
Preberi IMPROVEMENT_PLAN.md in začni s FAZO 1 - dokumentiranje
Contacts.tsx. Dodaj komentarje za vse glavne sekcije in funkcije.
```

ALI za refaktoring:

```
Preberi IMPROVEMENT_PLAN.md in začni s FAZO 2 - refaktoring
Contacts.tsx. Začni z ekstrakcijo TodaySection komponente.
```

---

## PRIORITETNI SEZNAM ZA NASLEDNJEGA RAZVIJALCA

Če prodaš aplikacijo, naj naslednji razvijalec najprej:

1. **Prebere ta dokument**
2. **Prebere ARCHITECTURE.md** (ko bo ustvarjen)
3. **Začne z Contacts.tsx** - to je srce aplikacije
4. **Razume Supabase shemo** - poglej `database/mat_tracker_schema.sql`
5. **Testira lokalno** - `npm run dev`

---

## OCENA PO FAZAH

| Faza | Trenutno | Po izboljšavi |
|------|----------|---------------|
| Dokumentacija | 3/10 | 8/10 |
| Arhitektura | 5/10 | 8/10 |
| Tipi | 4/10 | 9/10 |
| Testi | 0/10 | 7/10 |
| **SKUPAJ** | **6.5/10** | **8.5/10** |

---

*Ustvarjeno: 2026-01-18*
*Avtor: Claude (Opus 4.5)*

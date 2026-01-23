# Naslednji koraki - 2026-01-24

Načrt dela za naslednjo sejo.

---

## PRIORITETA 1: Contacts.tsx refaktoring

**Problem:** 3392 vrstic v eni datoteki - nemogoče vzdrževati.

### Koraki:

#### 1. Ustvari strukturo map
```
src/pages/contacts/
├── Contacts.tsx              # Glavni container (ostane, ampak manjši)
├── components/
│   ├── CompanyList.tsx       # Seznam podjetij s karticami
│   ├── CompanyFilters.tsx    # Filtri in iskanje
│   ├── CompanyCard.tsx       # Posamezna kartica podjetja
│   ├── AlphabetSidebar.tsx   # Abecedna navigacija
│   └── index.ts              # Barrel export
├── modals/
│   ├── AddCompanyModal.tsx
│   ├── EditCompanyModal.tsx
│   ├── CompanyDetailModal.tsx
│   ├── ReminderModal.tsx
│   ├── MeetingModal.tsx
│   └── index.ts
├── hooks/
│   ├── useContactsFilters.ts
│   ├── useContactsState.ts
│   └── index.ts
└── types.ts
```

#### 2. Izvleci po vrstnem redu
1. `types.ts` - vsi tipi iz Contacts.tsx
2. `useContactsFilters.ts` - filter logika
3. `CompanyFilters.tsx` - filter UI
4. `CompanyCard.tsx` - kartica komponenta
5. `CompanyList.tsx` - seznam
6. Modali po vrsti

---

## PRIORITETA 2: ProdajalecDashboard čiščenje

**Problem:** Duplikati funkcij in konstant.

### Koraki:

1. **Odstrani lokalne definicije** ki že obstajajo v utils:
   - `getTimeRemaining()` → uporabi iz `timeHelpers.ts`
   - `formatCountdown()` → uporabi iz `timeHelpers.ts`
   - `SLOVENIA_CENTER` → uporabi iz `constants.ts`
   - `DEFAULT_ZOOM` → uporabi iz `constants.ts`

2. **Preveri createCustomIcon()** - ali je še potrebna ali je v MapView

3. **Počisti importe** - odstrani neuporabljene

---

## PRIORITETA 3: TypeScript strict mode

### Koraki:

1. **Backup trenutnega tsconfig.json**

2. **Vklopi strožje opcije postopoma:**
```json
{
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

3. **Popravi napake** ki se pojavijo (pričakuj 50-100)

4. **Test** - `npm run build` mora uspeti

---

## Kontrolni seznam

- [ ] Contacts.tsx < 500 vrstic
- [ ] ProdajalecDashboard brez duplikatov
- [ ] tsconfig.json v strict mode
- [ ] `npm run build` uspe brez napak
- [ ] Aplikacija deluje enako kot prej

---

## Beležke

### Ukazi za preverjanje
```bash
# Preveri velikost datotek
wc -l src/pages/Contacts.tsx
wc -l src/pages/ProdajalecDashboard.tsx

# Build test
npm run build

# Dev server
npm run dev
```

### Če gre kaj narobe
- Git stash / revert
- Delaj po manjših commitih

---

*Ustvarjeno: 2026-01-23*

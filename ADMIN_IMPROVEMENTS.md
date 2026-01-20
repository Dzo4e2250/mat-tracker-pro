# Admin Panel - Načrt izboljšav

## Status: 2026-01-20

---

## NAREJENO

### Dashboard
- [x] Akcije za danes - sekcija Urgentno/Za danes z klikabilnimi karticami
- [x] Odstranjena redundantna sekcija "Na testu >20 dni"
- [x] Poenostavljene stat kartice (3 namesto 5)

### Navigacija
- [x] Analitika premaknjena pod Dashboard

### Cenik
- [x] Shrani gumb s potrditvenim dialogom
- [x] Vizualna označba neshranjenih sprememb (rumeno)
- [x] Opozorilo ob zapiranju strani z neshranjenimi spremembami
- [x] Tab "Vse cene" z enotnim pregledom
- [x] Iskanje po kodi/imenu/dimenzijah
- [x] Barvne oznake kategorij (MBW, ERM, Design, Zunanji)

---

## ZA NAREDITI

### FAZA 1 - Quick Wins (prioriteta: VISOKA)

#### 1. Konfiguracijski pragovi v bazo
**Effort:** 2h

Trenutno hardcodirano:
```typescript
const DIRTY_THRESHOLD = 10;  // InventarDashboard.tsx
const TEST_WARNING_DAYS = 20;  // useDashboardActions.ts
const TEST_CRITICAL_DAYS = 30; // useDashboardActions.ts
const PICKUP_OLD_DAYS = 3;     // useDashboardActions.ts
```

Rešitev:
- Dodaj v `price_settings` tabelo
- Ustvari hook `useSystemSettings()`
- Dodaj UI za urejanje v admin panel (nova sekcija "Sistemske nastavitve")

#### 2. Počisti neuporabljene datoteke
**Effort:** 1h

Datoteke v `/src/pages/inventar/` ki niso v routerju:
- `DirtyMats.tsx` - izbriši ali integriraj
- `DriverPickups.tsx` - izbriši ali integriraj
- `FreeCodes.tsx` - izbriši ali integriraj
- `TesterRequests.tsx` - izbriši ali integriraj

---

### FAZA 2 - Navigacija in UX (prioriteta: SREDNJA)

#### 3. Reorganiziraj meni v skupine
**Effort:** 3h

Trenutno:
```
Dashboard
Analitika
Prodajalci ▼
Cenik
Zemljevid
Prevzemi
Dostavljalci
Naročila
Računi
```

Predlog:
```
📊 PREGLED
  └─ Dashboard
  └─ Analitika

📦 OPERATIVA
  └─ Prodajalci ▼
  └─ Prevzemi
  └─ Zemljevid

⚙️ NASTAVITVE
  └─ Cenik
  └─ Dostavljalci
  └─ Računi
  └─ Naročila
```

#### 4. Poenostavi Prevzemi stran
**Effort:** 4h

Trenutno: 3 tabi (Za prevzem / Aktivni / Zaključeni)

Predlog:
- Ena tabela z filter dropdown-om za status
- Status chips inline: `Čaka | V teku | Zaključen`
- Inline akcije kjer mogoče (manj modal-ov)
- Sticky header z filtri

---

### FAZA 3 - Optimizacije (prioriteta: NIZKA)

#### 5. Real-time posodobitve
**Effort:** 6h

```typescript
// Supabase realtime subscription
supabase
  .channel('cycles-changes')
  .on('postgres_changes',
    { event: '*', schema: 'mat_tracker', table: 'cycles' },
    () => queryClient.invalidateQueries(['inventory'])
  )
  .subscribe();
```

Koristi:
- Dashboard se avtomatsko osveži ko se status spremeni
- Prevzemi se posodobijo v realnem času
- Ni potrebe po ročnem osveževanju

#### 6. Keyboard shortcuts
**Effort:** 4h

| Shortcut | Akcija |
|----------|--------|
| `G + D` | Pojdi na Dashboard |
| `G + P` | Pojdi na Prevzemi |
| `G + C` | Pojdi na Cenik |
| `G + Z` | Pojdi na Zemljevid |
| `/` | Fokus na iskanje |
| `N` | Nova akcija (kontekstualno) |
| `Esc` | Zapri modal |

Implementacija: `useHotkeys` hook ali custom rešitev

---

### FAZA 4 - Napredne funkcionalnosti (prioriteta: PRIHODNOST)

#### 7. Bulk operacije
**Effort:** 6h

- Checkbox za izbiro več vrstic
- Floating action bar: "Izbrano: 5 | Ustvari prevzem | Izbriši | Prekliči"
- Primeri:
  - Izberi več umazanih → ustvari skupen prevzem
  - Izberi več QR kod → batch sprememba statusa

#### 8. PDF poročila
**Effort:** 8h

- Mesečni pregled aktivnosti
- Primerjava obdobij (ta mesec vs. prejšnji)
- Statistika po prodajalcih
- Export v PDF z grafiko

#### 9. Notifikacije
**Effort:** 6h

- Browser push notifikacije za urgentne situacije
- Email digest (dnevni/tedenski pregled)
- In-app notification center

#### 10. Avtomatizacija
**Effort:** 10h

- Avtomatsko pošiljanje opomnikov strankam po X dnevih na testu
- Avtomatsko generiranje prevzemov ob določenih pogojih
- Scheduled jobs za periodične naloge

---

## PRIORITETNI VRSTNI RED

| # | Naloga | Effort | Impact | Prioriteta |
|---|--------|--------|--------|------------|
| 1 | Konfiguracijski pragovi | 2h | ⭐⭐ | VISOKA |
| 2 | Počisti datoteke | 1h | ⭐ | VISOKA |
| 3 | Reorganizacija menija | 3h | ⭐⭐⭐ | SREDNJA |
| 4 | Poenostavi Prevzemi | 4h | ⭐⭐ | SREDNJA |
| 5 | Real-time updates | 6h | ⭐⭐ | NIZKA |
| 6 | Keyboard shortcuts | 4h | ⭐ | NIZKA |
| 7 | Bulk operacije | 6h | ⭐⭐ | PRIHODNOST |
| 8 | PDF poročila | 8h | ⭐⭐ | PRIHODNOST |

---

## TEHNIČNI DOLG

- [ ] Odstrani `any` tipe (strogi TypeScript)
- [ ] Centraliziraj date formatting
- [ ] Dodaj error boundaries
- [ ] Optimiziraj query-je (batch fetching)
- [ ] Dodaj testi za kritične funkcije

---

*Zadnja posodobitev: 2026-01-20*

# Mat Tracker Pro - Načrt razvoja

## Trenutno stanje: 7.5/10

Aplikacija je funkcionalna in v produkciji. Ta dokument vsebuje načrt za izboljšave.

---

## Nedavno opravljeno

### 2026-01-22/23
- [x] Hierarhija podjetij (parent_company_id)
- [x] GPS Tracking (Moja pot) - TrackingView, useGpsTracking
- [x] Potni nalogi - TravelLogView, useTravelLog
- [x] Gumb "Pot" v zgornjem navbaru
- [x] Error boundary komponenta
- [x] Network status hook
- [x] Alphabet sidebar za kontakte
- [x] Izboljšani filtri v Contacts

### Refaktorirano
- [x] ProdajalecDashboard - modali izvlečeni v /modals/
- [x] MapView izvlečen v samostojno komponento
- [x] useCameraScanner hook izvlečen

---

## Tehnični dolg (KRITIČNO)

| Datoteka | Problem | Prioriteta |
|----------|---------|------------|
| `Contacts.tsx` | 3392 vrstic | **KRITIČNO** |
| `ProdajalecDashboard.tsx` | Duplikati funkcij | VISOKA |
| `SellerPage.tsx` | 1214 vrstic | SREDNJA |
| `ContractModal.tsx` | 1570 vrstic | SREDNJA |
| `tsconfig.json` | Loose mode | VISOKA |
| Testi | 0 testov | VISOKA |

---

## Naslednji koraki

### FAZA 1 - Čiščenje kode (ta teden)

1. **Refaktoriraj Contacts.tsx**
   - Izvleci: CompanyList, CompanyFilters, ContactModals
   - Uporabi vzorec iz ProdajalecDashboard

2. **Počisti ProdajalecDashboard**
   - Odstrani duplikate: getTimeRemaining, formatCountdown
   - Odstrani lokalne konstante: SLOVENIA_CENTER, DEFAULT_ZOOM

3. **TypeScript strict mode**
   - Vklopi: noImplicitAny, strictNullChecks
   - Popravi napake

### FAZA 2 - Stabilnost

4. **Dodaj teste**
   - Vitest + React Testing Library
   - Testi za: priceList.ts, postalCodes.ts
   - Integration testi za hooks

5. **Error tracking**
   - Implementiraj Sentry
   - Dokonči ErrorBoundary TODO

### FAZA 3 - Nove funkcije

6. **Push notifikacije**
   - Service worker
   - Notification permissions
   - Backend trigger za opomnike

7. **Offline podpora**
   - Service worker caching
   - IndexedDB za lokalne podatke
   - Sync queue

---

## Arhitektura

```
src/
├── components/       # UI komponente (48)
│   └── ui/           # shadcn/ui (45)
├── hooks/            # Data hooks (20+)
├── contexts/         # Auth context
├── integrations/     # Supabase
├── lib/              # Query client, utils
├── utils/            # Helpers
└── pages/
    ├── inventar/     # Admin (15 strani)
    ├── prodajalec/   # Salesperson portal
    │   ├── components/
    │   ├── hooks/
    │   └── utils/
    └── contacts/     # CRM
```

---

## Deployment

```bash
# Sync + build + deploy
rsync -avz --exclude 'node_modules' --exclude '.git' \
  -e "ssh -i ~/.ssh/id_ed25519" \
  /home/ristov/Applications/07-Web-Apps/mat-tracker-pro/ \
  root@148.230.109.77:/root/mat-tracker-pro/

ssh -i ~/.ssh/id_ed25519 root@148.230.109.77 \
  "cd /root/mat-tracker-pro && \
   docker build -t mat-tracker-pro . && \
   docker stop mat-tracker-pro && docker rm mat-tracker-pro && \
   docker run -d --name mat-tracker-pro \
     --network npm_npm_network -p 3000:80 mat-tracker-pro"
```

---

*Zadnja posodobitev: 2026-01-23*

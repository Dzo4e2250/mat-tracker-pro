# Mat Tracker Pro - Načrt razvoja

## Danes opravljeno (2026-01-22)

### Hierarhija podjetij
- [x] Dodano `parent_company_id` polje v companies tabelo
- [x] Migracija za hierarhijo podjetij
- [x] Prikaz hierarhije v CompanyCard (oznake matično/hčerinsko)
- [x] Izbira matičnega podjetja pri ustvarjanju/urejanju podjetja
- [x] ContractModal - izbira naslova za dostavo/račun iz hierarhije
- [x] Združevanje kontaktov iz celotne hierarhije v pogodbi

### GPS Tracking (Moja pot)
- [x] Tabela `gps_tracking_sessions` z RLS politikami
- [x] TrackingView komponenta
- [x] useGpsTracking hook
- [x] Gumb "Pot" v zgornjem navbaru (namesto logout)

### Ostale izboljšave
- [x] Error boundary komponenta
- [x] Network status hook
- [x] Alphabet sidebar za kontakte
- [x] Izboljšani filtri

---

## Naslednji koraki

### Prioriteta 1 - Kritično

#### Push notifikacije
- [ ] Service worker setup
- [ ] Notification permissions
- [ ] Backend trigger za opomnike
- [ ] UI za upravljanje notifikacij

#### Offline podpora
- [ ] Service worker caching strategija
- [ ] IndexedDB za lokalne podatke
- [ ] Sync queue za offline akcije
- [ ] UI indikator offline stanja

### Prioriteta 2 - Pomembno

#### Testi
- [ ] Setup Jest + React Testing Library
- [ ] Unit testi za `src/utils/priceList.ts`
- [ ] Unit testi za `src/utils/postalCodes.ts`
- [ ] Integration testi za hlavne hooks
- [ ] E2E testi za kritične user flows

#### TypeScript cleanup
- [ ] Odstrani vse `as any` (trenutno ~50+)
- [ ] Definiraj tipe za API responses
- [ ] Vklopi strict mode

#### Reporti in analytics
- [ ] Export kontaktov v CSV/Excel
- [ ] Export ponudb v PDF
- [ ] Dashboard z grafi (recharts)
- [ ] KPI tracking za prodajalce

### Prioriteta 3 - Nice to have

#### UX izboljšave
- [ ] Dark mode
- [ ] Keyboard shortcuts (Ctrl+K za search, etc.)
- [ ] Bulk operacije (izbriši več, uredi več)
- [ ] Fuzzy search
- [ ] Drag & drop za sortiranje

#### Integracije
- [ ] Google Calendar sync za opomnike
- [ ] Email integration (SMTP za direktno pošiljanje)
- [ ] e-Račun integracija

#### Mobile app
- [ ] React Native setup
- [ ] Shared business logic
- [ ] Native GPS tracking
- [ ] Native QR scanner

---

## Tehnični dolg

| Datoteka | Problem | Rešitev |
|----------|---------|---------|
| `ContractModal.tsx` | 1500+ vrstic | Razbij na manjše komponente |
| `Contacts.tsx` | 3300+ vrstic | Razbij na manjše komponente |
| `ProdajalecDashboard.tsx` | Veliko `as any` | Definiraj ustrezne tipe |
| Various | `console.log` v produkciji | Odstrani ali uporabi logger |

---

## Arhitekturne izboljšave

### Kratkoročno
1. **Centraliziran error handling** - že začeto z ErrorBoundary
2. **Loading states** - konsistenten pristop (skeleton loaders)
3. **Form validation** - zod ali yup schema validation

### Dolgoročno
1. **Monorepo** - če pride mobile app (Turborepo)
2. **API layer** - če Supabase postane omejitveni faktor
3. **Caching strategy** - Redis za session data

---

## Beležke

### Supabase
- Schema: `mat_tracker`
- Self-hosted na: `api-matpro.ristov.xyz`
- DB container: `supabase-db`

### Deploy
```bash
# Sync + build + deploy
rsync -avz --exclude 'node_modules' --exclude '.git' \
  -e "ssh -i ~/.ssh/id_ed25519" \
  /home/ristov/Applications/07-Web-Apps/mat-tracker-pro/ \
  root@148.230.109.77:/root/mat-tracker-pro/

ssh -i ~/.ssh/id_ed25519 root@148.230.109.77 \
  "cd /root/mat-tracker-pro && \
   docker build -t mat-tracker-pro . && \
   docker stop mat-tracker-pro && \
   docker rm mat-tracker-pro && \
   docker run -d --name mat-tracker-pro \
     --network npm_npm_network -p 3000:80 mat-tracker-pro"
```

### Migracije
```bash
# Pognati SQL migracijo
ssh -i ~/.ssh/id_ed25519 root@148.230.109.77 \
  "docker exec supabase-db psql -U postgres -d postgres -c \"<SQL>\""

# Reload PostgREST schema
ssh -i ~/.ssh/id_ed25519 root@148.230.109.77 \
  "docker restart supabase-rest"
```

---

*Zadnja posodobitev: 2026-01-22*

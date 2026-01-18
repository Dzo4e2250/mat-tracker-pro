# Mat Tracker Pro - Development Log

## Zadnja seja: 2026-01-18 (nadaljevanje)

### Dokumentacija (FAZA 1 iz IMPROVEMENT_PLAN.md)

1. **Contacts.tsx dokumentiran** (~5000 vrstic):
   - Dodan obsežen JSDoc header komentar z opisom datoteke
   - Dodani section markers za vse glavne sekcije:
     - `IMPORTS` - vse knjižnice
     - `TYPES & CONSTANTS` - tipi za ponudbe
     - `HELPER FUNCTIONS` - funkcije izven komponente
     - `GLAVNA KOMPONENTA` - začetek komponente
     - `HOOKS & NAVIGATION` - React hooks
     - `DATA FETCHING` - React Query hooks
     - `STATE` - stanje komponent
     - `QR KODA` - skeniranje vizitk
     - `OPOMNIKI` - reminder funkcije
     - `FILTRIRANJE IN SORTIRANJE` - logika za seznam
     - `OPOMBE (NOTES)` - CRM dnevnik
     - `"DANES" SEKCIJA` - današnji sestanki/roki
     - `CRUD OPERACIJE` - dodajanje/urejanje strank
     - `POMOŽNE FUNKCIJE` - formatiranje, naslovi
     - `IZBIRA IN IZVOZ KONTAKTOV` - vCard export
     - `POSLANE PONUDBE` - upravljanje ponudb
     - `KREIRANJE PONUDB` - najem/nakup/primerjava
     - `GENERIRANJE E-POŠTE` - HTML/tekst vsebina
     - `RENDER` - JSX vmesnik
   - Dodani JSDoc komentarji za ključne funkcije

---

## Seja: 2026-01-18 (popoldne)

### Kaj je bilo narejeno

1. **Dodana QR Kode navigacija** v InventarSidebar.tsx - dostop do upravljanja QR kod

2. **SellerPage.tsx izboljšave**:
   - Dodajanje novih QR kod z naključnimi kodami (PREFIX-XXXX format)
   - Brisanje prostih QR kod (hover delete button)
   - Primerjava "Naročeno vs Aktivirano" (aktivirano = total - available)
   - Generiranje PDF dokumentov za šoferja (dva tipa):
     - **Customer pickup**: Naslovi, kontakti, Google Maps povezave
     - **Warehouse pickup**: Preprosta tabela brez podatkov o stranki
   - "Čaka šoferja" sekcija z gumbom "Potrdi prevzem"
   - Zaključevanje prevzema sprosti QR kode nazaj na "available"

3. **Refaktoriranje SellerPage.tsx** (~1645 → ~1200 vrstic):
   - `src/pages/inventar/components/types.ts` - skupni tipi
   - `src/pages/inventar/components/SellerDirtyMatsCard.tsx` - umazane preproge
   - `src/pages/inventar/components/SellerWaitingDriverCard.tsx` - čaka šoferja
   - `src/pages/inventar/components/SellerLongTestCard.tsx` - dolgo na testu (20+ dni)
   - `src/pages/inventar/components/SellerQRCodesTab.tsx` - QR kode grid
   - `src/pages/inventar/components/index.ts` - barrel export

4. **README.md** - Zamenjana Lovable dokumentacija z lastnim opisom projekta

5. **GitHub** - Koda naložena na https://github.com/Dzo4e2250/mat-tracker-pro

### Kaj je še potrebno narediti

- [ ] **Deploy na strežnik** - rsync je padel, potrebno ponovno deployati:
  ```bash
  rsync -avz --exclude=node_modules --exclude=.git /home/ristov/Applications/07-Web-Apps/mat-tracker-pro/ root@ristov.xyz:/home/webapps/mat-tracker-pro/
  ssh root@ristov.xyz "cd /home/webapps/mat-tracker-pro && docker build -t mat-tracker-pro . && docker stop mat-tracker-pro && docker rm mat-tracker-pro && docker run -d -p 3000:80 --network npm_npm_network --name mat-tracker-pro mat-tracker-pro"
  ```

### Pomembne datoteke

| Datoteka | Namen |
|----------|-------|
| `src/pages/inventar/SellerPage.tsx` | Glavna stran prodajalca z vsemi funkcijami |
| `src/pages/inventar/components/` | Izvlečene komponente iz SellerPage |
| `src/hooks/useDriverPickups.ts` | Hook za upravljanje prevzemov |
| `src/hooks/useProfiles.ts` | Hook za profile in statistike |
| `supabase/functions/send-test-warning/` | Edge function za email opozorila |
| `src/components/InventarSidebar.tsx` | Navigacija admin panela |

### Življenjski cikel predpražnika

```
available → on_test → dirty → waiting_driver → completed → available
```

### Tipi šoferjev

1. **Pralnica (laundry driver)** - Dostavlja čiste predpražnike iz pralnice v skladišče
2. **Dostavljalec (delivery driver)** - Pobira predpražnike od strank ali iz skladišča prodajalca

### Tehnični stack

- React + TypeScript + Vite
- Supabase (PostgreSQL, Auth, Edge Functions)
- TanStack Query za state management
- shadcn/ui + Tailwind CSS
- Docker + nginx za deployment

### Git status

- Branch: `main`
- Zadnji commit: `73a44c2` - "Refactor SellerPage into smaller components and update README"
- Remote: https://github.com/Dzo4e2250/mat-tracker-pro

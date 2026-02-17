# Prodajalec Oblek - Roadmap gradnje

## Pregled

Vloga `prodajalec_oblek` (prodajalec oblacil) je namenjena prodajni ekipi, ki prodaja oblacila (delovna oblacila, uniforme, zastitna oprema). Za razliko od `prodajalec` (predpraznikov), ta vloga **nima** QR kod, ciklov testiranja, predpraznikov ali inventarja - ima pa lastne prodajne procese.

## Trenutno stanje (Faza 0 - DONE)

Vloga ze obstaja v sistemu z dostopom do:
- **Naloge** (Kanban tabla) - popolnoma delujoce
- **Stranke/CRM** (Contacts) - popolnoma delujoce
- **Potni nalog** (Travel Log) - popolnoma delujoce
- **GPS sledenje** - dostopno prek menija

### Kaj se ze deli s prodajalec predpraznikov:
| Modul | Status | Deljeno? |
|---|---|---|
| Tasks (Kanban) | Deluje | Da - ista tabela `tasks` |
| Contacts/CRM | Deluje | Da - iste tabele `companies`, `contacts`, `company_notes` |
| Travel Log | Deluje | Da - iste tabele `travel_logs`, `travel_log_entries` |
| GPS Tracking | Deluje | Da - ista tabela `gps_tracking_sessions` |
| Reminders | Deluje | Da - ista tabela `reminders` |
| Profil/Nastavitve | Deluje | Da |

---

## Faza 1 - Domaca stran + Katalog izdelkov
**Spec:** [01-home-katalog.md](./01-home-katalog.md)
**Prioriteta:** Visoka
**Ocena:** 3-5 dni

Prodajalec oblek potrebuje svojo domaco stran (HomeView), ki nadomesti predpraznikovo. Prikazuje:
- Pregled aktivnih ponudb / narocil
- Hitra statistika (stevilo strank, ponudb, narocil ta mesec)
- Opomniki za danes
- Zadnje aktivnosti

Poleg tega potrebuje **katalog izdelkov** (oblacila) - tabela z artikli, cenami, slikami.

### Datoteke za ustvariti:
- `src/pages/prodajalec/components/OblekHomeView.tsx`
- `src/hooks/useClothingProducts.ts`
- DB migracija: `clothing_products` tabela

---

## Faza 2 - Ponudbe za oblacila
**Spec:** [02-ponudbe.md](./02-ponudbe.md)
**Prioriteta:** Visoka
**Ocena:** 4-6 dni

Sistem za kreiranje, posiljanje in sledenje ponudb za oblacila:
- Izbira izdelkov iz kataloga
- Kalkulacija cen (po kosih, rabati za kolicine)
- Generiranje PDF ponudbe
- Email posiljanje
- Status tracking (poslano, ogledano, sprejeto, zavrnjeno)

### Datoteke za ustvariti:
- `src/pages/prodajalec/components/OblekOfferModal.tsx`
- `src/pages/prodajalec/components/OblekOfferPDF.tsx`
- `src/hooks/useClothingOffers.ts`
- DB migracija: `clothing_offers`, `clothing_offer_items` tabeli

---

## Faza 3 - Narocila in sledenje
**Spec:** [03-narocila.md](./03-narocila.md)
**Prioriteta:** Srednja
**Ocena:** 3-4 dni

Ko stranka sprejme ponudbo, se ta pretvori v narocilo:
- Narocilo z referenco na ponudbo
- Status: novo -> potrjeno -> v proizvodnji -> poslano -> dostavljeno
- Obvestila ob spremembi statusa
- Zgodovina narocil po stranki

### Datoteke za ustvariti:
- `src/pages/prodajalec/components/OblekOrdersView.tsx`
- `src/pages/prodajalec/components/OblekOrderDetailModal.tsx`
- `src/hooks/useClothingOrders.ts`
- DB migracija: `clothing_orders`, `clothing_order_items` tabeli

---

## Faza 4 - Statistika in analitika
**Spec:** [04-statistika.md](./04-statistika.md)
**Prioriteta:** Nizka
**Ocena:** 2-3 dni

Prilagojena statistika za prodajalca oblacil:
- Prihodki po mesecih (graf)
- Stevilo ponudb vs narocil (conversion rate)
- Top stranke po prihodku
- Primerjava z prejsnjim obdobjem

### Datoteke za ustvariti:
- `src/pages/prodajalec/components/OblekStatisticsView.tsx`
- `src/hooks/useClothingStats.ts`

---

## Faza 5 - Admin panel razsiritve
**Spec:** [05-admin-panel.md](./05-admin-panel.md)
**Prioriteta:** Nizka
**Ocena:** 2 dni

Razsiritve inventar/admin panela za pregled prodajalcev oblacil:
- Pregled vseh prodajalcev oblek in njihovih narocil
- Katalog upravljanje (CRUD za izdelke)
- Statistika na ravni podjetja

### Datoteke za ustvariti:
- `src/pages/inventar/ClothingSalesOverview.tsx`
- `src/pages/inventar/ClothingCatalogManagement.tsx`

---

## Arhitekturna nacela

### 1. Locitev od predpraznikov
Vsi oblacilni moduli so v lastnih datotekah s predpono `Oblek` ali `Clothing`. Ne spreminjamo obstojecih predpraznikovskih komponent.

### 2. Pogojno renderiranje v ProdajalecDashboard
Nove view-e dodajamo v ProdajalecDashboard.tsx z `activeRole` checkom:
```tsx
{view === 'oblekHome' && activeRole === 'prodajalec_oblek' && <OblekHomeView />}
```

### 3. Deljene komponente
Tasks, Contacts, Travel Log ostajajo skupni. Nove funkcionalnosti za oblacila NE smejo pokvariti obstojecih modulov.

### 4. DB schema
Nove tabele imajo predpono `clothing_` in so v shemi `mat_tracker`. FK na `profiles`, `companies`, `contacts` so deljeni.

### 5. ViewType razsiritev
ViewType se razsiri z novimi vrednostmi:
```ts
export type ViewType = 'home' | 'scan' | 'map' | 'history' | 'statistics'
  | 'oblekHome' | 'oblekOffers' | 'oblekOrders' | 'oblekStats';
```

---

## Diagram odvisnosti faz

```
Faza 0 (DONE) - Osnovna vloga + dostop do Tasks/Contacts/Travel
    |
    v
Faza 1 - Home + Katalog izdelkov
    |
    v
Faza 2 - Ponudbe (potrebuje katalog iz F1)
    |
    v
Faza 3 - Narocila (potrebuje ponudbe iz F2)
    |
    v
Faza 4 - Statistika (potrebuje podatke iz F2+F3)

Faza 5 - Admin panel (neodvisna, lahko kadarkoli po F1)
```

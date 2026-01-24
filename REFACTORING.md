# ProdajalecDashboard.tsx Refactoring Plan

## Povzetek problema

**Datoteka:** `src/pages/ProdajalecDashboard.tsx`
**Velikost:** 2636 vrstic
**Problem:** Prevelika datoteka z mešanico komponent, logike, modalov in duplikacije

---

## 1. Analiza trenutnega stanja

### 1.1 Ekstrahirane komponente (že obstajajo)

| Komponenta | Vrstice | Se uporablja? | Opomba |
|------------|---------|---------------|--------|
| `HomeView.tsx` | 242 | ❌ NE | Inline koda vrstice 827-1116 |
| `ScanView.tsx` | 158 | ❌ NE | Inline koda vrstice 1258-1368 |
| `MapView.tsx` | 205 | ⚠️ DELNO | Import obstaja, ampak TUDI inline koda 1134-1256 |
| `HistoryView.tsx` | 364 | ✅ DA | Uporablja se pravilno |
| `StatisticsView.tsx` | 57 | ✅ DA | Uporablja se pravilno |
| `TrackingView.tsx` | 363 | ✅ DA | Uporablja se pravilno |
| `TravelLogView.tsx` | 515 | ✅ DA | Uporablja se pravilno |

### 1.2 State - 30+ useState klicev

```
CAMERA STATE (6):
- cameraActive, cameraError, cameraLoading
- zoomLevel, maxZoom, zoomSupported

MODAL STATE (4):
- showModal, modalType, formData, selectedCycle

UI STATE (5):
- view, menuOpen, statusFilter
- expandedCompanies, dismissedAlerts

EDIT STATE (5):
- editingStartDate, newStartDate
- editingLocation, newLocationLat, newLocationLng

MAP STATE (3):
- mapEditMode, clickedMapLocation, showMatSelectModal

COMPANY STATE (4):
- showCompanySelectModal, selectedCompanyForTest
- showCompanyMatsModal, selectedCompanyForMats

OTHER (3+):
- scanInput, currentTime, taxLookupLoading, companySearch
```

### 1.3 Modal tipi (vrstice 1371-2421)

| Modal Type | Namen | Vrstice | Prioriteta izločitve |
|------------|-------|---------|---------------------|
| `selectType` | Izberi tip predpražnika | 1380-1398 | Nizka (majhna) |
| `matDetails` | Detajli predpražnika | 1400-1739 | **VISOKA** (340 vrstic!) |
| `putOnTest` | Daj na test forma | 1741-2108 | **VISOKA** (367 vrstic!) |
| `signContract` | Podpiši pogodbo | 2111-2139 | Srednja |
| `putOnTestSuccess` | Uspeh ekran | 2142-2186 | Nizka |
| `selectAvailableMat` | Izberi prost mat | 2188-2417 | Srednja |
| Map Select Modal | Za map edit mode | 2423-2496 | Nizka |

### 1.4 Duplikacije

#### KRITIČNO - Funkcije definirane 2x:
```typescript
// V ProdajalecDashboard.tsx (vrstice 590-643):
const getTimeRemaining = (testStartDate) => { ... }
const formatCountdown = (timeRemaining) => { ... }

// V utils/timeHelpers.ts (že obstaja!):
export function getTimeRemaining(testStartDate, currentTime) { ... }
export function formatCountdown(timeRemaining) { ... }
```

#### KRITIČNO - Konstante definirane 2x:
```typescript
// V ProdajalecDashboard.tsx (vrstice 29-30):
const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
const DEFAULT_ZOOM = 8;

// V utils/constants.ts (že obstaja!):
export const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
export const DEFAULT_ZOOM = 8;
```

#### KRITIČNO - createCustomIcon definiran 2x:
```typescript
// V ProdajalecDashboard.tsx (vrstice 33-50)
// V MapView.tsx (vrstice 13-30)
```

#### SREDNJE - MapClickHandler komponenta:
```typescript
// V ProdajalecDashboard.tsx (vrstice 52-60)
// V MapView.tsx (vrstice 33-40)
```

---

## 2. Plan refaktoriranja

### FAZA 1: Odstrani duplikate (NIZKO TVEGANJE)

**Cilj:** Odstraniti podvojeno kodo brez spreminjanja funkcionalnosti

1. **Odstrani lokalne verzije funkcij, uporabi utils:**
   - Izbriši `getTimeRemaining` in `formatCountdown` iz ProdajalecDashboard.tsx
   - Že importiraš iz `timeHelpers.ts` - samo uporabi!
   - **POZOR:** Lokalna verzija ne sprejema `currentTime` parametra, utils verzija ga zahteva

2. **Odstrani lokalne konstante:**
   - Izbriši `SLOVENIA_CENTER` in `DEFAULT_ZOOM` iz ProdajalecDashboard.tsx
   - Že importiraš iz `constants.ts`

3. **Premakni `createCustomIcon` v utils ali MapView:**
   - Definiraj samo enkrat
   - Exportaj če potrebno na več mestih

### FAZA 2: Uporabi že ekstrahirane komponente (SREDNJE TVEGANJE)

**Cilj:** Zamenjati inline kodo z že obstoječimi komponentami

1. **Uporabi HomeView.tsx namesto inline kode (vrstice 827-1116)**
   - Potrebne adaptacije:
     - HomeView potrebuje dodatne props za `dismissedAlerts` in akcije
     - Manjka "Ukrep za vse" gumb in `onOpenCompanyMatsModal`
     - Manjka sortiranje po urgentnosti

2. **Uporabi ScanView.tsx namesto inline kode (vrstice 1258-1368)**
   - Že ima vse potrebne props
   - Samo zamenjaj inline kodo z `<ScanView ... />`

3. **Uporabi MapView.tsx namesto inline kode (vrstice 1134-1256)**
   - MapView že obstaja in je importiran!
   - Inline koda ima nekaj razlik - preveri in sinhroniziraj

### FAZA 3: Ekstrahiraj modale (SREDNJE-VISOKO TVEGANJE)

**Cilj:** Zmanjšati ProdajalecDashboard za ~800 vrstic

Predlagana struktura:
```
src/pages/prodajalec/components/modals/
├── MatDetailsModal.tsx      (~340 vrstic)
├── PutOnTestModal.tsx       (~370 vrstic)
├── SignContractModal.tsx    (~30 vrstic)
├── PutOnTestSuccessModal.tsx (~50 vrstic)
├── SelectMatModal.tsx       (~230 vrstic)
└── index.ts
```

**Dependency problem:**
Modali potrebujejo dostop do:
- `selectedCycle`, `setSelectedCycle`
- `formData`, `setFormData`
- Mutation hooks (putOnTest, signContract, extendTest, itd.)
- `toast` za obvestila
- `companies` za izbiro podjetja

**Rešitev:** Props drilling ALI Context za shared state

### FAZA 4: Ekstrahiraj kamero logiko (NIZKO TVEGANJE)

**Cilj:** Očistiti camera-related kodo

Ustvari `useCameraScanner.ts` hook:
```typescript
export function useCameraScanner() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startCamera = async (onScanSuccess: (code: string) => void) => { ... };
  const stopCamera = async () => { ... };
  const applyZoom = async (newZoom: number) => { ... };

  return {
    cameraActive, cameraError, cameraLoading,
    zoomLevel, maxZoom, zoomSupported,
    startCamera, stopCamera, applyZoom
  };
}
```

### FAZA 5: Razmisli o Context (VISOKO TVEGANJE - OPCIJSKO)

Če bodo modal komponente potrebovale preveč props, razmisli o:

```typescript
// ProdajalecDashboardContext.tsx
interface DashboardContextType {
  selectedCycle: CycleWithRelations | null;
  setSelectedCycle: (cycle: CycleWithRelations | null) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
  // ... mutations, toast, etc.
}
```

**POZOR:** To je velik refactor in lahko povzroči težave. Razmisli samo če FAZA 3 postane preveč kompleksna.

---

## 3. Prioritetni vrstni red

| # | Faza | Tveganje | Prihranek vrstic | Čas |
|---|------|----------|------------------|-----|
| 1 | Odstrani duplikate | Nizko | ~100 | Hitra |
| 2 | Uporabi ScanView | Nizko | ~110 | Hitra |
| 3 | Uporabi MapView | Srednje | ~120 | Srednja |
| 4 | Ekstrahiraj kamero hook | Nizko | ~120 | Srednja |
| 5 | Uporabi HomeView | Srednje | ~290 | Srednja (potrebne adaptacije) |
| 6 | Ekstrahiraj MatDetailsModal | Srednje | ~340 | Srednja |
| 7 | Ekstrahiraj PutOnTestModal | Visoko | ~370 | Dolga (kompleksna forma) |
| 8 | Ekstrahiraj ostale modale | Srednje | ~300 | Srednja |

**Skupni potencialni prihranek: ~1750 vrstic (66% datoteke!)**

---

## 4. Testing strategija

### Pred vsako fazo:
1. Preveri da aplikacija deluje na test.ristov.xyz
2. Testiraj vse osnovne funkcionalnosti:
   - [ ] Prikaz home strani
   - [ ] Skeniranje QR kode (kamera + ročno)
   - [ ] Odpiranje detajlov predpražnika
   - [ ] Daj na test flow
   - [ ] Podaljšaj test
   - [ ] Pogodba podpisana
   - [ ] Poberi šofer
   - [ ] Zemljevid prikaz
   - [ ] Hamburger meni navigacija
   - [ ] Potni nalog

### Po vsaki fazi:
1. Deploy na test.ristov.xyz
2. Preveri VSE funkcionalnosti iz seznama
3. Šele nato nadaljuj z naslednjo fazo

---

## 5. Beležke za implementacijo

### HomeView adaptacije potrebne:
- Dodaj prop `dismissedAlerts` in `onDismissAlert`
- Dodaj prop `onOpenCompanyMatsModal` za "Ukrep za vse" gumb
- Dodaj sortiranje companyCycles po urgentnosti (trenutno manjka)
- Dodaj `animate-pulse-red` class za urgentne
- Dodaj možnost za prikaz companyAddress

### MapView vs inline koda razlike:
- Inline ima `mapEditMode` toggle gumb
- Inline ima `onMapClick` handler za edit mode
- MapView ima te funkcionalnosti - preveri da so enake

### Signature razlike v timeHelpers:
```typescript
// utils/timeHelpers.ts:
getTimeRemaining(testStartDate: string | null, currentTime: Date)

// Inline verzija:
getTimeRemaining(testStartDate: string | null)  // uporablja state currentTime
```
Pri uporabi utils verzije moraš dodati `currentTime` parameter!

---

## 6. Git strategija

```bash
# Ustvari feature branch za vsako fazo
git checkout -b refactor/phase-1-remove-duplicates
# ... naredi spremembe ...
git commit -m "refactor: remove duplicate functions and constants"

# Po testiranju na test.ristov.xyz
git checkout main
git merge refactor/phase-1-remove-duplicates
```

---

## 7. Rollback plan

Če pride do težav:
1. `git revert HEAD` za zadnji commit
2. Re-deploy staro verzijo
3. Analiziraj kaj je šlo narobe
4. Popravi in poskusi znova

---

---

## 8. Druge velike datoteke (za prihodnost)

Poleg ProdajalecDashboard.tsx so še druge datoteke, ki bi potrebovale refaktoring:

| Datoteka | Vrstice | Prioriteta |
|----------|---------|------------|
| `Contacts.tsx` | 3392 | **VISOKA** - največja datoteka! |
| `ContractModal.tsx` | 1570 | Srednja |
| `inventar/SellerPage.tsx` | 1214 | Srednja |
| `inventar/QRKode.tsx` | 963 | Nizka |
| `inventar/Prevzemi.tsx` | 885 | Nizka |

**Opomba:** Po končanem refaktoriranju ProdajalecDashboard.tsx razmisli o podobnem pristopu za Contacts.tsx.

---

## 9. Dodatne ugotovitve

### Neuporabljeni importi:
```typescript
// Vrstica 24 - HomeView in ScanView sta importirana ampak NISTA UPORABLJENA!
import { HomeView, ScanView, MapView, ... } from './prodajalec/components';
```
To potrjuje, da je bil refaktoring začet ampak nikoli dokončan.

### MapView anomalija:
MapView je:
1. Importiran (vrstica 24)
2. TUDI renderiran inline (vrstice 1134-1256)
3. Komponenta MapView.tsx obstaja in ima isto funkcionalnost

To pomeni da se MapView komponenta sploh ne uporablja, čeprav je importirana!

---

*Ustvarjeno: 2026-01-23*
*Avtor: Claude Code refactoring analysis*

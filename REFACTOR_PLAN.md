# Načrt refaktoriranja ProdajalecDashboard.tsx

## Trenutno stanje
- **2317 vrstic** v eni datoteki
- 5 view-ov: home, scan, map, history, statistics
- 6 tipov modalov: selectType, matDetails, putOnTest, signContract, putOnTestSuccess, selectAvailableMat
- Veliko skupnega stanja (25+ useState hookov)
- Camera logika (startCamera, stopCamera, applyZoom)
- Business logika (handleScan, getTimeRemaining, formatCountdown)

## Cilji refaktoriranja
1. Razdeliti view-e v ločene komponente
2. Ekstrahirati modale v ločene komponente
3. Ekstrahirati utility funkcije
4. Omogočiti lazy loading za view-e

## Nova struktura datotek

```
src/pages/prodajalec/
├── components/
│   ├── index.ts                    # Barrel export
│   ├── HomeView.tsx                # ~230 vrstic - prikaz ciklov
│   ├── ScanView.tsx                # ~120 vrstic - QR skeniranje
│   ├── MapView.tsx                 # ~140 vrstic - zemljevid
│   ├── HistoryView.tsx             # ~35 vrstic - zgodovina
│   ├── StatisticsView.tsx          # ~30 vrstic - statistika
│   ├── CycleDetailsModal.tsx       # Modal za detajle cikla
│   ├── PutOnTestModal.tsx          # Modal za dajanje na test
│   ├── SignContractModal.tsx       # Modal za podpis pogodbe
│   └── SelectMatModal.tsx          # Modal za izbiro predpražnika
├── hooks/
│   └── useCameraScanner.ts         # Camera logika
├── utils/
│   ├── constants.ts                # STATUSES, SLOVENIA_CENTER, itd.
│   └── timeHelpers.ts              # getTimeRemaining, formatCountdown
└── types.ts                        # Skupni tipi
```

## Faze implementacije

### Faza 1: Priprava (brez sprememb obnašanja)
1. Ustvariti mapo `src/pages/prodajalec/`
2. Ekstrahirati konstante v `utils/constants.ts`
3. Ekstrahirati časovne funkcije v `utils/timeHelpers.ts`
4. Ekstrahirati tipe v `types.ts`

### Faza 2: Ekstrahiranje view-ov
1. **HistoryView.tsx** - najmanjši, najlažji za začetek (~35 vrstic)
2. **StatisticsView.tsx** - majhen (~30 vrstic)
3. **MapView.tsx** - srednji (~140 vrstic)
4. **ScanView.tsx** - srednji (~120 vrstic) + useCameraScanner hook
5. **HomeView.tsx** - največji (~230 vrstic)

### Faza 3: Ekstrahiranje modalov
1. **CycleDetailsModal.tsx** - detajli cikla z akcijami
2. **PutOnTestModal.tsx** - forma za dajanje na test
3. **SignContractModal.tsx** - podpis pogodbe
4. **SelectMatModal.tsx** - izbira predpražnika

### Faza 4: Optimizacija
1. Lazy loading za view-e
2. Dodati Suspense fallbacke

## Skupno stanje (ostane v ProdajalecDashboard.tsx)
- `view` - trenutni view
- `selectedCycle` - izbrani cikel
- `showModal`, `modalType` - kontrola modalov
- `formData` - podatki forme

## Props za view komponente

```typescript
// HomeView props
interface HomeViewProps {
  cycles: CycleWithRelations[] | undefined;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  expandedCompanies: Set<string>;
  setExpandedCompanies: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCycleClick: (cycle: CycleWithRelations) => void;
}

// ScanView props
interface ScanViewProps {
  availableQRCodes: QRCode[];
  onScan: (code: string) => void;
}

// MapView props
interface MapViewProps {
  mapGroups: MapGroup[];
  loadingMap: boolean;
  onMarkerClick: (cycle: CycleWithRelations) => void;
}
```

## Preverjanje
Po vsaki fazi:
1. `npm run build` - preveri da ni TypeScript napak
2. Testiraj v brskalniku da vse deluje enako

## Ocena časa
- Faza 1: ~15 min
- Faza 2: ~45 min
- Faza 3: ~30 min
- Faza 4: ~15 min
- **Skupaj: ~2 uri**

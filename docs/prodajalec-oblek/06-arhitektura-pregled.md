# Arhitekturni pregled: Kaj ze deluje in kaj je deljeno

## Diagram sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth        │  │  Inventar    │  │   Prodajalec         │  │
│  │   Context     │  │  Panel       │  │   Dashboard          │  │
│  │              │  │              │  │                      │  │
│  │  AppRole:    │  │  admin only: │  │  DELJENO:            │  │
│  │  - admin     │  │  - Analitika │  │  - TasksView         │  │
│  │  - inventar  │  │  - Aktivnost │  │  - TravelLogView     │  │
│  │  - prodajalec│  │  - Racuni    │  │  - TrackingView      │  │
│  │  - prodajalec│  │              │  │  - Contacts (page)   │  │
│  │    _oblek    │  │  vsi:        │  │                      │  │
│  │              │  │  - Dashboard │  │  PREDPRAZNIKI ONLY:  │  │
│  │  activeRole  │  │  - Cenik     │  │  - HomeView          │  │
│  │  -> pogojni  │  │  - Zemljevid │  │  - ScanView          │  │
│  │     prikaz   │  │  - Prevzemi  │  │  - MapView           │  │
│  │              │  │  - Dostalj.  │  │  - HistoryView       │  │
│  │              │  │  - Narocila  │  │  - StatisticsView    │  │
│  └──────────────┘  └──────────────┘  │  - vsi modali za     │  │
│                                      │    cycle mgmt        │  │
│                                      │                      │  │
│                                      │  OBLEK ONLY (FUTURE):│  │
│                                      │  - OblekHomeView     │  │
│                                      │  - OblekCatalogView  │  │
│                                      │  - OblekOffersView   │  │
│                                      │  - OblekOrdersView   │  │
│                                      │  - OblekStatsView    │  │
│                                      └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (Self-hosted)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   mat_tracker schema                      │  │
│  │                                                          │  │
│  │  DELJENE TABELE:              PREDPRAZNIKI ONLY:         │  │
│  │  ┌─────────────┐             ┌─────────────┐            │  │
│  │  │ profiles    │             │ cycles      │            │  │
│  │  │ companies   │             │ qr_codes    │            │  │
│  │  │ contacts    │             │ mat_types   │            │  │
│  │  │ company_notes│            │ cycle_history│            │  │
│  │  │ tasks       │             │ orders      │            │  │
│  │  │ reminders   │             │ order_items │            │  │
│  │  │ travel_logs │             │ driver_*    │            │  │
│  │  │ travel_log_ │             │ email_*     │            │  │
│  │  │   entries   │             │ offer_items │            │  │
│  │  │ gps_tracking│             │ mat_prices  │            │  │
│  │  │   _sessions │             │ optibrush_* │            │  │
│  │  └─────────────┘             └─────────────┘            │  │
│  │                                                          │  │
│  │  OBLEK ONLY (FUTURE):                                    │  │
│  │  ┌─────────────────────┐                                 │  │
│  │  │ clothing_products   │                                 │  │
│  │  │ clothing_offers     │                                 │  │
│  │  │ clothing_offer_items│                                 │  │
│  │  │ clothing_orders     │                                 │  │
│  │  │ clothing_order_items│                                 │  │
│  │  │ clothing_order_     │                                 │  │
│  │  │   history           │                                 │  │
│  │  └─────────────────────┘                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Edge Functions:                                                │
│  - create-user (ze podpira prodajalec_oblek)                   │
│  - delete-user                                                  │
│  - update-user-password                                         │
│  - send-test-warning (predprazniki only)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hooks - pregled uporabe po vlogi

| Hook | Datoteka | prodajalec | prodajalec_oblek | Opomba |
|---|---|---|---|---|
| `useTasks` | hooks/useTasks.ts | Da | Da | Kanban tabla |
| `useTravelLog` | hooks/useTravelLog.ts | Da | Da | Potni nalog |
| `useGpsTracking` | hooks/useGpsTracking.ts | Da | Da | GPS sledenje |
| `useCompanyContacts` | hooks/useCompanyContacts.ts | Da | Da | CRM |
| `useCompanyNotes` | hooks/useCompanyNotes.ts | Da | Da | Aktivnosti |
| `useReminders` | hooks/useReminders.ts | Da | Da | Opomniki |
| `useProfiles` | hooks/useProfiles.ts | Da | Da | Profil |
| `useCycles` | hooks/useCycles.ts | Da | **Ne** | Predprazniki |
| `useQRCodes` | hooks/useQRCodes.ts | Da | **Ne** | QR kode |
| `useMapLocations` | hooks/useMapLocations.ts | Da | **Ne** | Zemljevid |
| `useMatTypes` | hooks/useMatTypes.ts | Da | **Ne** | Tipi predpraznikov |
| `useClothingProducts` | hooks/useClothingProducts.ts | Ne | **Da** | F1 - katalog |
| `useClothingOffers` | hooks/useClothingOffers.ts | Ne | **Da** | F2 - ponudbe |
| `useClothingOrders` | hooks/useClothingOrders.ts | Ne | **Da** | F3 - narocila |
| `useClothingStats` | hooks/useClothingStats.ts | Ne | **Da** | F4 - statistika |

---

## Komponente v ProdajalecDashboard - pregled

| Komponenta | prodajalec | prodajalec_oblek | Status |
|---|---|---|---|
| ProdajalecHeader | Da | Da | Delujoce |
| SideMenu | Da (full) | Da (omejen) | Delujoce, pogojni prikaz |
| ProdajalecBottomNav | Da (Home/Scan/Stranke) | Da (Naloge/Stranke/Potni nalog) | Delujoce, pogojni prikaz |
| TasksView | Da | Da | Delujoce |
| TravelLogView | Da | Da | Delujoce |
| TrackingView | Da | Da | Delujoce |
| HomeView | Da | **Ne** | Delujoce, skrito za oblek |
| ScanView | Da | **Ne** | Delujoce, skrito za oblek |
| MapView | Da | **Ne** | Delujoce, skrito za oblek |
| HistoryView | Da | **Ne** | Delujoce, skrito za oblek |
| StatisticsView | Da | **Ne** | Delujoce, skrito za oblek |
| OblekHomeView | Ne | **Da** | F1 - za zgraditi |
| OblekCatalogView | Ne | **Da** | F1 - za zgraditi |
| OblekOffersView | Ne | **Da** | F2 - za zgraditi |
| OblekOrdersView | Ne | **Da** | F3 - za zgraditi |
| OblekStatisticsView | Ne | **Da** | F4 - za zgraditi |

---

## Datotecna struktura - trenutna vs nacrtovana

```
src/
  pages/
    prodajalec/
      components/
        # OBSTOJECE (deljene)
        TasksView.tsx              ✅ deluje za oblek
        TravelLogView.tsx          ✅ deluje za oblek
        TrackingView.tsx           ✅ deluje za oblek
        TravelLogPopup.tsx         ✅ deluje za oblek
        ProdajalecHeader.tsx       ✅ deluje za oblek
        ProdajalecBottomNav.tsx    ✅ pogojni prikaz
        SideMenu.tsx               ✅ pogojni prikaz

        # OBSTOJECE (samo predprazniki)
        HomeView.tsx               ❌ skrito za oblek
        ScanView.tsx               ❌ skrito za oblek
        MapView.tsx                ❌ skrito za oblek
        HistoryView.tsx            ❌ skrito za oblek
        StatisticsView.tsx         ❌ skrito za oblek
        DirtyMatsView.tsx          ❌ skrito za oblek
        modals/*.tsx               ❌ skrito za oblek

        # NACRTOVANE (samo oblek) - ZA ZGRADITI
        OblekHomeView.tsx          📋 Faza 1
        OblekCatalogView.tsx       📋 Faza 1
        OblekProductDetailModal.tsx 📋 Faza 1
        OblekOffersView.tsx        📋 Faza 2
        OblekOfferModal.tsx        📋 Faza 2
        OblekOfferDetailModal.tsx  📋 Faza 2
        OblekOfferPDF.tsx          📋 Faza 2
        OblekOrdersView.tsx       📋 Faza 3
        OblekOrderDetailModal.tsx  📋 Faza 3
        OblekCreateOrderModal.tsx  📋 Faza 3
        OblekStatisticsView.tsx   📋 Faza 4
        stats/*.tsx                📋 Faza 4

  hooks/
    # OBSTOJECE (deljene)
    useTasks.ts                    ✅
    useTravelLog.ts                ✅
    useGpsTracking.ts              ✅
    useCompanyContacts.ts          ✅
    useCompanyNotes.ts             ✅
    useReminders.ts                ✅
    useProfiles.ts                 ✅

    # NACRTOVANE (samo oblek) - ZA ZGRADITI
    useClothingProducts.ts         📋 Faza 1
    useClothingOffers.ts           📋 Faza 2
    useClothingOrders.ts           📋 Faza 3
    useClothingStats.ts            📋 Faza 4

  pages/inventar/
    # NACRTOVANE (admin panel) - ZA ZGRADITI
    ClothingCatalogManagement.tsx  📋 Faza 5
    ClothingSalesOverview.tsx      📋 Faza 5
    clothing/*.tsx                 📋 Faza 5
```

---

## Konvencije poimenovanja

| Element | Konvencija | Primer |
|---|---|---|
| DB tabele | `clothing_` predpona | `clothing_products` |
| Komponente | `Oblek` predpona | `OblekHomeView` |
| Hooks | `useClothing` predpona | `useClothingProducts` |
| ViewType | `oblek` predpona | `oblekHome`, `oblekCatalog` |
| Route (admin) | `/inventar/` + opis | `/inventar/katalog-oblacil` |

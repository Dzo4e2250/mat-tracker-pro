# Faza 5: Admin panel razsiritve

## Cilj
Admin/inventar dobi pregled nad prodajalci oblacil in upravljanje kataloga izdelkov.

**Predpogoj:** Faza 1 (katalog). Ostale faze so opcijske - admin panel se gradi postopoma.

---

## 5.1 Katalog upravljanje (CRUD)

### Stran: ClothingCatalogManagement
**Datoteka:** `src/pages/inventar/ClothingCatalogManagement.tsx`
**Route:** `/inventar/katalog-oblacil`

Admin stran za upravljanje kataloga oblacil:

```
+--------------------------------------------------+
|  Katalog oblacil               [+ Nov izdelek]   |
+--------------------------------------------------+
|  [Isci...]          [Kategorija v] [Aktivni v]   |
+--------------------------------------------------+
|  Koda   | Naziv          | Kat.   | Cena  | Akt. |
|  JK-001 | Jakna Classic  | Jakne  | 45.00 |  Da  |  [Uredi] [x]
|  HL-003 | Hlace Worker   | Hlace  | 32.00 |  Da  |  [Uredi] [x]
|  PM-010 | Polo Basic     | Majice | 18.00 |  Ne  |  [Uredi] [x]
+--------------------------------------------------+
```

### Funkcionalnosti:
- Tabela vseh izdelkov (aktivni + neaktivni)
- Iskanje po imenu/kodi
- Filtriranje po kategoriji
- Ustvari/Uredi/Deaktiviraj
- Upload slike (Supabase Storage)
- Uvoz iz CSV/Excel (opcijsko)

### Urejanje modal:
- Vsa polja iz `clothing_products` tabele
- Predogled slike
- Validacija (koda unikatna, cena > 0)
- Nalaganje velikosti/barv kot tagi

---

## 5.2 Pregled prodajalcev oblacil

### Stran: ClothingSalesOverview
**Datoteka:** `src/pages/inventar/ClothingSalesOverview.tsx`
**Route:** `/inventar/prodajalci-oblacil`

Pregled vseh prodajalcev oblek in njihove uspesnosti:

```
+--------------------------------------------------+
|  Prodajalci oblacil                              |
+--------------------------------------------------+
|  ┌────────────────────────────────────────┐      |
|  │ Skupaj ponudbe: 120 | Narocila: 78    │      |
|  │ Skupaj prihodek: 156.000 E            │      |
|  └────────────────────────────────────────┘      |
+--------------------------------------------------+
|  Prodajalec      | Ponudbe | Narocila | Prihodek |
|  Ana Novak       |    45   |    28    | 34.500 E |
|  Marko Horvat    |    38   |    25    | 42.100 E |
|  Petra Kovac     |    37   |    25    | 29.400 E |
+--------------------------------------------------+
```

### Klik na prodajalca:
- Odpre detail stran (lahko reuse SellerPage vzorec)
- Seznam ponudb in narocil tega prodajalca
- Statistika in grafi

---

## 5.3 InventarSidebar razsiritve

Dodaj nove menijske tocke v `InventarSidebar.tsx`:

```tsx
// Pod obstojecimi elementi, dodaj sekcijo za oblacila
// Vidno samo admin-u (ali inventar + admin)

{ title: "Katalog oblacil", url: "/inventar/katalog-oblacil", icon: Shirt },
{ title: "Prodajalci oblacil", url: "/inventar/prodajalci-oblacil", icon: Users },
```

### Opcija A - Flat meni:
Dodaj kot posamezne elemente v menuItems array.

### Opcija B - Collapsible sekcija:
Dodaj kot collapsible "Oblacila" sekcijo (podobno kot "Prodajalci" za predpraznike).

---

## 5.4 Routing

Dodaj v `App.tsx`:

```tsx
const ClothingCatalogManagement = lazy(() => import("./pages/inventar/ClothingCatalogManagement"));
const ClothingSalesOverview = lazy(() => import("./pages/inventar/ClothingSalesOverview"));

<Route path="/inventar/katalog-oblacil" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <ClothingCatalogManagement />
  </ProtectedRoute>
} />
<Route path="/inventar/prodajalci-oblacil" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <ClothingSalesOverview />
  </ProtectedRoute>
} />
```

---

## 5.5 Seznam datotek

| Datoteka | Tip | Opis |
|---|---|---|
| `src/pages/inventar/ClothingCatalogManagement.tsx` | Nov | CRUD za katalog |
| `src/pages/inventar/ClothingSalesOverview.tsx` | Nov | Pregled prodajalcev |
| `src/pages/inventar/clothing/ProductEditModal.tsx` | Nov | Urejanje izdelka |
| `src/pages/inventar/clothing/ProductTable.tsx` | Nov | Tabela izdelkov |
| `src/pages/inventar/clothing/SalesPersonCard.tsx` | Nov | Kartica prodajalca |
| `src/components/InventarSidebar.tsx` | Edit | Dodaj menijske tocke |
| `src/App.tsx` | Edit | Dodaj route |

### Supabase Storage:
- Ustvari bucket `clothing-images` za slike izdelkov
- RLS: vsi berejo, admin/inventar pisejo

---

## 5.6 Dostop

| Stran | admin | inventar | prodajalec | prodajalec_oblek |
|---|---|---|---|---|
| Katalog upravljanje | Da | Ne | Ne | Ne |
| Pregled prodajalcev | Da | Ne | Ne | Ne |
| Katalog brskanje (F1) | - | - | - | Da (read-only) |

Katalog upravljanje je admin-only. Inventar vloga ga NE vidi (razen ce se odloci drugace).

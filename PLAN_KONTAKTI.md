# Načrt: Prenova strani Kontakti

## Cilj
Ustvariti centralno mesto za pregled vseh strank z avtomatsko sinhronizacijo iz predpražnikov (cycles) in možnostjo ročnega dodajanja.

---

## 1. Arhitektura podatkov

### Trenutno stanje
- Contacts.tsx uporablja ločeno tabelo `contacts` s poljem `seller_id`
- ProdajalecDashboard uporablja tabeli `companies` + `contacts` (povezano s `cycles`)
- **Problem**: Dve ločeni tabeli, ni sinhronizacije

### Nova arhitektura
Uporabimo obstoječe tabele `companies` in `contacts`:

```
companies (podjetja)
├── id, name, tax_number
├── address_street, address_postal, address_city
├── created_by (prodajalec ki je dodal)
└── notes

contacts (kontaktne osebe)
├── id, company_id (FK → companies)
├── first_name, last_name, email, phone
├── role, is_primary
└── created_by
```

**Sinhronizacija**: Ko prodajalec doda predpražnik na test:
- Podjetje se shrani v `companies`
- Kontakt se shrani v `contacts`
- Oboje z `created_by = user.id`

---

## 2. Funkcionalnosti

### 2.1 Seznam strank
- **Grupiranje**: Po statusu (aktivne/pretekle) ali abecedno
- **Prikaz na kartici**:
  - Ime podjetja (glavni naslov)
  - Kontaktna oseba + vloga
  - Telefon (klikljiv) + Email (klikljiv)
  - Naslov (ulica, pošta, kraj)
  - Število predpražnikov: "🔵 2 na testu | ✅ 1 podpisan"
  - Zadnja aktivnost: "Zadnji test: 15.1.2025"

### 2.2 Iskanje in filtri
- **Iskalno polje**: Išče po imenu podjetja, kontakta, telefonu
- **Filtri**:
  - Vsi | Z aktivnimi testi | Pretekli | Podpisane pogodbe
- **Sortiranje**: Po imenu / Po zadnji aktivnosti / Po številu predpražnikov

### 2.3 Hitri gumbi
- 📞 Klic (tel: link)
- 💬 SMS (sms: link)
- 📧 Email (mailto: link)
- 📍 Navigacija (Google Maps link z naslovom)

### 2.4 Podrobnosti stranke (ob kliku)
Modal ali nova stran z:
- Vsi podatki podjetja
- Seznam vseh kontaktnih oseb
- **Zgodovina predpražnikov**:
  - MBW1 (GEO-001) - Na testu od 10.1.2025
  - MBW2 (GEO-002) - Pogodba 5.1.2025
  - ERM10R (GEO-003) - Test končan 1.1.2025 (ni podpisal)
- Možnost urejanja/dodajanja kontaktov

### 2.5 Dodajanje novega kontakta
- Ročno dodajanje podjetja brez predpražnika
- Polja: ime, davčna, naslov, kontaktna oseba, telefon, email, opombe

---

## 3. Implementacija

### Faza 1: Prilagoditev hooks
```typescript
// useCompanyContacts.ts - nov hook
- fetchCompaniesWithContacts(userId) - vse stranke prodajalca
- getCompanyStats(companyId) - število predpražnikov po statusu
- getCompanyHistory(companyId) - zgodovina cycles
```

### Faza 2: Prenova Contacts.tsx
1. Zamenjaj vir podatkov na companies + contacts tabele
2. Dodaj iskalno polje
3. Dodaj filtre (tabs)
4. Posodobi kartice s statistiko predpražnikov
5. Dodaj hitri gumbi (klic, SMS, email, maps)

### Faza 3: Podrobnosti stranke
1. Modal z vsemi podatki
2. Seznam kontaktnih oseb (možnost več kontaktov na podjetje)
3. Zgodovina predpražnikov iz cycles tabele
4. Urejanje podatkov

### Faza 4: Sinhronizacija
- Preveri da ProdajalecDashboard pravilno shranjuje created_by
- Contacts.tsx bere companies WHERE created_by = user.id OR ima cycle s salesperson_id = user.id

---

## 4. UI Dizajn (minimalistično)

```
┌─────────────────────────────────────┐
│ 🔍 [Išči stranko...            ]    │
├─────────────────────────────────────┤
│ [Vse] [Aktivne] [Pretekle] [+ Dodaj]│
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏢 ABC d.o.o.           📞 💬 📧│ │
│ │ Janez Novak, direktor          │ │
│ │ 📍 Ljubljana                   │ │
│ │ 🔵 2 na testu                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏢 XYZ d.o.o.           📞 💬 📧│ │
│ │ Ana Horvat                     │ │
│ │ 📍 Maribor                     │ │
│ │ ✅ 1 pogodba                   │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 5. Zaporedje dela

1. ⬜ Ustvari `useCompanyContacts.ts` hook
2. ⬜ Posodobi Contacts.tsx - zamenjaj vir podatkov
3. ⬜ Dodaj iskanje
4. ⬜ Dodaj filtre (Vse/Aktivne/Pretekle)
5. ⬜ Posodobi kartice - statistika predpražnikov
6. ⬜ Dodaj hitri gumbi (klic, SMS, email)
7. ⬜ Modal za podrobnosti stranke
8. ⬜ Zgodovina predpražnikov v modalu
9. ⬜ Test in deploy

---

## Vprašanja za potrditev

1. Ali naj kontakti iz "starega" sistema (seller_id tabela) migriramo v novo strukturo?
2. Ali lahko en prodajalec vidi stranke drugega prodajalca, ali strogo ločeno?
3. Ali želiš možnost "deli stranko" z drugim prodajalcem?

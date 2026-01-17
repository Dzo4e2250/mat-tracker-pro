# Mat Tracker Pro

Interna aplikacija za sledenje in upravljanje predpražnikov (entry floor mats) za Lindstrom Group Slovenija.

## Namen aplikacije

Mat Tracker Pro omogoča popolno sledenje življenjskega cikla predpražnikov od skladišča do stranke in nazaj:

- **Inventar**: Pregled vseh QR kod, njihovih statusov in trenutnih lokacij
- **Prodajalci**: Upravljanje prodajalcev, njihovih QR kod in naročil
- **Prevzemi**: Organizacija prevzemov umazanih predpražnikov (šofer/lastna dostava)
- **Opozorila**: Avtomatska email opozorila za predolgo testiranje

## Življenjski cikel predpražnika

```
Prosta (available) → Na testu (on_test) → Umazana (dirty) → Čaka šoferja (waiting_driver) → Zaključena (completed) → Prosta
```

## Tehnologije

- **Frontend**: React, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Deployment**: Docker, nginx

## Zagon razvojnega okolja

```bash
# Namestitev odvisnosti
npm install

# Zagon razvojnega strežnika
npm run dev
```

## Spremenljivke okolja

Ustvari `.env` datoteko:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment (Docker)

```bash
# Build
docker build -t mat-tracker-pro .

# Run
docker run -d -p 3000:80 --network npm_npm_network --name mat-tracker-pro mat-tracker-pro
```

## Struktura projekta

```
src/
├── components/     # UI komponente
├── hooks/          # React hooks za Supabase
├── integrations/   # Supabase client in tipi
├── lib/            # Utility funkcije
└── pages/          # Strani aplikacije
    ├── inventar/   # Admin panel
    └── prodajalec/ # Prodajalec portal

supabase/
└── functions/      # Edge funkcije (email, user management)
```

## Lindstrom Group

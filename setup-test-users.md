# Dodajanje testnih uporabnikov

## Možnost 1: Ročno preko Supabase konzole

1. Pojdi na https://supabase.com/dashboard
2. Izberi projekt: **mkpaodlmkluabyqklbhx**
3. Pojdi na **Authentication** > **Users**
4. Dodaj uporabnike:

### Prodajalec
- Email: prodajalec@test.si
- Password: Test123!
- Avtomatsko potrdi email

### Inventar
- Email: inventar@test.si
- Password: Test123!
- Avtomatsko potrdi email

5. Po dodajanju uporabnikov pojdi na **Table Editor** > **user_roles**
6. Dodaj vloge:

```sql
-- Za prodajalca
INSERT INTO user_roles (user_id, role)
VALUES ('ID_PRODAJALCA', 'PRODAJALEC');

-- Za inventarja
INSERT INTO user_roles (user_id, role)
VALUES ('ID_INVENTARJA', 'INVENTAR');
```

## Možnost 2: SQL upit

Pojdi na **SQL Editor** in izvedi:

```sql
-- Najprej dodaj uporabnike v auth.users (to lahko narediš samo v konzoli)
-- Potem dodaj vloge:

-- Najdi user_id-je
SELECT id, email FROM auth.users WHERE email IN ('prodajalec@test.si', 'inventar@test.si');

-- Dodaj vloge (zamenjaj 'USER_ID' z dejanskimi ID-ji)
INSERT INTO user_roles (user_id, role)
VALUES
  ('PRODAJALEC_USER_ID', 'PRODAJALEC'),
  ('INVENTAR_USER_ID', 'INVENTAR');
```

## Preverjanje

Po dodajanju uporabnikov in vlog:
1. Pojdi na http://localhost:8084
2. Klikni na gumb "Prijava kot Prodajalec" ali "Prijava kot Inventar"
3. Uporabnik bi moral biti avtomatično prijavljen

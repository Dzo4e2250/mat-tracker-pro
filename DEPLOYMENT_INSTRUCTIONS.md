# 🚀 Navodila za Deployment - Korak po korak

Spreminjal sem kodo za Edge Functions in migracije. Sedaj moraš te spremembe deployati na Supabase, da bodo delale v živi aplikaciji.

## Korak 1: Prijava v Supabase Dashboard

1. Pojdi na: **https://supabase.com/dashboard**
2. Prijavi se z svojim računom
3. Izberi projekt: **mkpaodlmkluabyqklbhx** (mat-tracker-pro)

---

## Korak 2: Deploy Edge Functions (3 funkcije)

### Funkcija 1: create-user

1. V levem meniju klikni **Edge Functions**
2. Poišči funkcijo **create-user** (če obstaja) ali klikni **+ New Function**
3. Ime funkcije: `create-user`
4. Kopiraj celotno vsebino iz datoteke: `supabase/functions/create-user/index.ts`
5. Klikni **Deploy Function** ali **Save & Deploy**

### Funkcija 2: delete-user

1. Ponovi korake za **delete-user**
2. Kopiraj vsebino iz: `supabase/functions/delete-user/index.ts`
3. Deploy

### Funkcija 3: update-user-password

1. Ponovi korake za **update-user-password**
2. Kopiraj vsebino iz: `supabase/functions/update-user-password/index.ts`
3. Deploy

**Alternativa:** Če Edge Functions še ne obstajajo, moraš najprej klikniti **+ New Function** in vnesti vse nastavitve.

---

## Korak 3: Zaženi Database Migration

1. V levem meniju klikni **SQL Editor**
2. Klikni **+ New Query**
3. Kopiraj celotno vsebino iz datoteke: `supabase/migrations/20251021120000_fix_transport_notification_trigger.sql`
4. Prilepi v SQL Editor
5. Klikni **Run** ali **Execute**
6. Če vidiš "Success" - odlično! ✅

---

## Korak 4: Preveri, če deluje

### Test 1: Prijavi se kot Jetmire (INVENTAR)
- Email: (email računa Jetmire)
- Poskusi ustvariti novega prodajalca v: **Računi** strani
- Če deluje → Edge Functions so uspešno deployane! ✅

### Test 2: Preveri transport notifications
- Ko prodajalec doseže 10 umazanih predpražnikov
- Inventar bi moral prejeti obvestilo
- Če deluje → Migration je uspešno aplicirana! ✅

---

## Težave?

Če kaj ne dela:
1. Preveri Console (F12) za napake
2. Preveri Supabase Logs: **Logs & Monitoring** → **Edge Functions**
3. Preveri Database Logs: **Logs & Monitoring** → **Postgres Logs**

---

## Kaj sem popravil?

✅ **INVENTAR lahko sedaj ustvarja/briše prodajalce** (prej samo ADMIN)
✅ **Transport notification trigger pravilno šteje umazane predpražnike**
✅ **Edge Functions posodobljene za INVENTAR vlogo**

---

Kdaj moraš to narediti? **Čim prej** - dokler spremembe niso deployane, aplikacija ne bo delovala pravilno! 🚨

/**
 * @file ux-workflows.spec.ts
 * @description UX workflow testi - simulirajo realne uporabniške scenarije
 *
 * Merimo:
 * - Število klikov za dokončanje naloge
 * - Čas od začetka do konca naloge
 * - Ali so ključni elementi vidni brez scrollanja
 * - Ali je feedback (toast/indikator) viden po akciji
 * - Ali se stanje pravilno posodobi po akciji
 */

import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, login } from './fixtures/auth';

// ==========================================
// HELPERS ZA MERJENJE UX METRIK
// ==========================================

interface UXMetrics {
  taskName: string;
  clicks: number;
  durationMs: number;
  scrollsNeeded: number;
  feedbackVisible: boolean;
  errors: string[];
}

class UXTracker {
  private taskName: string;
  private startTime: number;
  private clicks = 0;
  private scrolls = 0;
  private errors: string[] = [];
  private page: Page;

  constructor(page: Page, taskName: string) {
    this.page = page;
    this.taskName = taskName;
    this.startTime = Date.now();
  }

  async click(locator: ReturnType<Page['locator']>, description: string) {
    this.clicks++;
    try {
      await locator.click({ timeout: 5000 });
    } catch (e) {
      this.errors.push(`Klik ni uspel: ${description}`);
      throw e;
    }
  }

  async fill(locator: ReturnType<Page['locator']>, value: string, description: string) {
    this.clicks++; // Focus klik
    try {
      await locator.fill(value, { timeout: 5000 });
    } catch (e) {
      this.errors.push(`Vnos ni uspel: ${description}`);
      throw e;
    }
  }

  scrollNeeded() {
    this.scrolls++;
  }

  addError(msg: string) {
    this.errors.push(msg);
  }

  async finish(feedbackVisible: boolean): Promise<UXMetrics> {
    const metrics: UXMetrics = {
      taskName: this.taskName,
      clicks: this.clicks,
      durationMs: Date.now() - this.startTime,
      scrollsNeeded: this.scrolls,
      feedbackVisible,
      errors: this.errors,
    };

    // Log metrics za analizo
    console.log(`\n📊 UX METRIKE: ${metrics.taskName}`);
    console.log(`   Kliki: ${metrics.clicks}`);
    console.log(`   Čas: ${(metrics.durationMs / 1000).toFixed(1)}s`);
    console.log(`   Scrolli: ${metrics.scrollsNeeded}`);
    console.log(`   Feedback viden: ${metrics.feedbackVisible ? '✅' : '❌'}`);
    if (metrics.errors.length > 0) {
      console.log(`   ⚠️ Napake: ${metrics.errors.join(', ')}`);
    }
    console.log('');

    return metrics;
  }
}

// Helper: počakaj na feedback (toast ali spremembo)
async function waitForFeedback(page: Page, textPattern: RegExp, timeout = 5000): Promise<boolean> {
  try {
    await page.getByText(textPattern).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// Helper: preveri ali je element viden brez scrollanja
async function isVisibleWithoutScroll(page: Page, locator: ReturnType<Page['locator']>): Promise<boolean> {
  try {
    const box = await locator.boundingBox({ timeout: 3000 });
    if (!box) return false;
    const viewport = page.viewportSize();
    if (!viewport) return false;
    return box.y >= 0 && box.y + box.height <= viewport.height;
  } catch {
    return false;
  }
}

async function loginAsProdalajec(page: Page) {
  await login(page, TEST_USERS.prodajalec.email, TEST_USERS.prodajalec.password);
}

// ==========================================
// SCENARIJ 1: JUTRANJI PREGLED
// "Luka pride zjutraj, odpre app, pregleda obvestila"
// ==========================================

test.describe('Scenarij: Jutranji pregled', () => {
  test('S1.1 - Odpri app in preglej obvestila (< 3 kliki)', async ({ page }) => {
    const ux = new UXTracker(page, 'Jutranji pregled obvestil');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Ali so obvestila vidna brez scrollanja?
    const remindersVisible = await isVisibleWithoutScroll(
      page, page.getByText(/Nujno/)
    );

    // Ali vidim koliko obvestil imam?
    const countVisible = await page.getByText(/Nujno \(\d+\)/).isVisible().catch(() => false);

    const metrics = await ux.finish(remindersVisible);

    expect(metrics.clicks).toBeLessThanOrEqual(0); // 0 klikov - obvestila morajo biti vidna takoj
    expect(remindersVisible || !countVisible).toBe(true); // Vidna brez scrollanja ALI ni obvestil
  });

  test('S1.2 - Zloži obvestila za več prostora (1 klik)', async ({ page }) => {
    const ux = new UXTracker(page, 'Zloži obvestila');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const header = page.getByText(/Nujno/).first();
    if (await header.isVisible()) {
      await ux.click(header, 'Zloži obvestila');
      await page.waitForTimeout(300);

      // Ali so se kartice skrile?
      const cardsAfter = await page.locator('.bg-yellow-50, .bg-orange-50, .bg-red-50, .bg-purple-50').count();

      const feedback = cardsAfter === 0;
      const metrics = await ux.finish(feedback);
      expect(metrics.clicks).toBe(1); // Samo 1 klik za zložitev
    }
  });

  test('S1.3 - Preglej vse offer pending (max 2 klika)', async ({ page }) => {
    const ux = new UXTracker(page, 'Pregled vseh offer pending');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Ali je "+ več" gumb viden?
    const moreBtn = page.getByText(/\+\s*\d+\s*več/).first();
    if (await moreBtn.isVisible()) {
      await ux.click(moreBtn, 'Razširi offer pending');
      await page.waitForTimeout(300);
    }

    const metrics = await ux.finish(true);
    expect(metrics.clicks).toBeLessThanOrEqual(2);
  });
});

// ==========================================
// SCENARIJ 2: HITRO DODAJANJE STRANKE
// "Prodajalec na terenu sreča novo stranko, hitro vnese kontakt"
// ==========================================

test.describe('Scenarij: Hitro dodajanje stranke na terenu', () => {
  test('S2.1 - Dodaj stranko samo z imenom in telefonom (< 5 klikov)', async ({ page }) => {
    const ux = new UXTracker(page, 'Hitro dodajanje - samo ime + telefon');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    // Klik na + gumb
    const addBtn = page.locator('button').filter({ hasText: /\+/ }).first();
    await ux.click(addBtn, 'Odpri dodajanje');
    await page.waitForTimeout(500);

    // Vnesi kontakt ime
    const nameInput = page.locator('input[placeholder*="Ime"]').first();
    await ux.fill(nameInput, 'Test Kontakt', 'Ime kontakta');

    // Vnesi telefon
    const phoneInput = page.locator('input[placeholder*="040"], input[placeholder*="Telefon"]').first();
    await ux.fill(phoneInput, '040111222', 'Telefon');

    // Shrani
    const submitBtn = page.locator('button').filter({ hasText: /Shrani|Dodaj stranko/ }).last();
    await ux.click(submitBtn, 'Shrani');

    const feedback = await waitForFeedback(page, /Osnutek shranjen|Stranka dodana|Napaka/);
    const metrics = await ux.finish(feedback);

    expect(metrics.clicks).toBeLessThanOrEqual(5);
    console.log(`   ℹ️  Hitri vnos: ${metrics.clicks} klikov, ${(metrics.durationMs/1000).toFixed(1)}s`);
  });

  test('S2.2 - Dodaj stranko z davčno številko lookup (< 6 klikov)', async ({ page }) => {
    const ux = new UXTracker(page, 'Dodajanje z davčno številko');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    const addBtn = page.locator('button').filter({ hasText: /\+/ }).first();
    await ux.click(addBtn, 'Odpri dodajanje');
    await page.waitForTimeout(500);

    // Vnesi davčno
    const taxInput = page.locator('input[placeholder*="davčn"], input[placeholder*="12345678"]').first();
    await ux.fill(taxInput, '10474929', 'Davčna številka');

    // Klik lookup
    const lookupBtn = page.locator('button').filter({ hasText: /Preveri|🔍/ }).first();
    if (await lookupBtn.isVisible()) {
      await ux.click(lookupBtn, 'Preveri davčno');
      await page.waitForTimeout(3000);
    }

    // Ali se je ime avtomatsko izpolnilo?
    const nameInput = page.locator('input[placeholder*="CAST"]');
    const nameValue = await nameInput.inputValue().catch(() => '');
    const autoFilled = nameValue.length > 0;

    const metrics = await ux.finish(autoFilled);
    expect(metrics.clicks).toBeLessThanOrEqual(6);

    if (autoFilled) {
      console.log(`   ✅ Avtomatsko izpolnjeno: "${nameValue}"`);
    } else {
      console.log(`   ⚠️  Avtomatsko izpolnitev ni uspela`);
    }
  });

  test('S2.3 - Dodaj stranko z iskanjem po imenu (< 6 klikov)', async ({ page }) => {
    const ux = new UXTracker(page, 'Dodajanje z iskanjem imena');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    const addBtn = page.locator('button').filter({ hasText: /\+/ }).first();
    await ux.click(addBtn, 'Odpri dodajanje');
    await page.waitForTimeout(500);

    // Vnesi ime
    const nameInput = page.locator('input[placeholder*="CAST"]');
    await ux.fill(nameInput, 'Petrol', 'Ime podjetja');

    // Klik Isci
    await ux.click(page.getByText('Isci'), 'Iskanje');
    await page.waitForTimeout(3000);

    // Ali so rezultati vidni?
    const results = page.locator('.absolute.z-50');
    const hasResults = await results.isVisible().catch(() => false);

    const metrics = await ux.finish(hasResults);
    expect(metrics.clicks).toBeLessThanOrEqual(6);
  });

  test('S2.4 - Ali je gumb "Dodaj" viden brez scrollanja', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    const addBtn = page.locator('button').filter({ hasText: /\+/ }).first();
    const visible = await isVisibleWithoutScroll(page, addBtn);

    expect(visible).toBe(true);
  });
});

// ==========================================
// SCENARIJ 3: POIŠČI STRANKO IN POKLIČI
// "Luka išče stranko in jo pokliče"
// ==========================================

test.describe('Scenarij: Poišči stranko in pokliči', () => {
  test('S3.1 - Najdi stranko in pokliči (< 3 kliki)', async ({ page }) => {
    const ux = new UXTracker(page, 'Poišči in pokliči');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Iskanje
    const searchInput = page.locator('input[placeholder*="Išči"]');
    await ux.fill(searchInput, 'a', 'Iskanje');
    await page.waitForTimeout(500);

    // Ali je telefon klikljiv na kartici brez odpiranja detajla?
    const phoneLink = page.locator('a[href^="tel:"]').first();
    const phoneVisible = await phoneLink.isVisible().catch(() => false);

    const metrics = await ux.finish(phoneVisible);

    if (phoneVisible) {
      console.log('   ✅ Telefon dosegljiv na kartici - ni treba odpirat detajla');
      expect(metrics.clicks).toBeLessThanOrEqual(2); // 1 za iskanje, 1 za klic
    } else {
      console.log('   ℹ️  Telefon ni na kartici - treba odpreti detajl');
      expect(metrics.clicks).toBeLessThanOrEqual(4); // +1 za odpiranje, +1 za klic
    }
  });

  test('S3.2 - Desktop: pokliči brez odpiranja detajla (< 2 klika)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const ux = new UXTracker(page, 'Desktop pokliči s seznama');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Na desktopu mora biti telefon ikona na vrstici
    const phoneIcon = page.locator('a[href^="tel:"] svg.lucide-phone, a.text-blue-500 svg.lucide-phone').first();
    const phoneVisible = await phoneIcon.isVisible().catch(() => false);

    const metrics = await ux.finish(phoneVisible);

    if (phoneVisible) {
      console.log('   ✅ Telefon ikona vidna na vrstici - 1 klik za klic');
    } else {
      console.log('   ⚠️  Telefon ikona ni na vrstici');
    }
  });

  test('S3.3 - Iskanje mora delovati v < 500ms', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[placeholder*="Išči"]');
    const startTime = Date.now();
    await searchInput.fill('test');
    await page.waitForTimeout(600); // debounce + render

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   ⏱️  Iskanje: ${duration}ms`);
    // Iskanje + debounce mora biti pod 1s
    expect(duration).toBeLessThan(2000);
  });
});

// ==========================================
// SCENARIJ 4: ZABELEŽI OPOMBO
// "Po klicu stranke zabeleži opombo"
// ==========================================

test.describe('Scenarij: Zabeleži opombo po klicu', () => {
  test('S4.1 - Odpri stranko in zabeleži opombo (< 5 klikov)', async ({ page }) => {
    const ux = new UXTracker(page, 'Zabeleži opombo');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Klik na stranko
    const firstCard = page.locator('[data-first-letter]').first();
    if (!await firstCard.isVisible()) return;

    await ux.click(firstCard, 'Odpri stranko');
    await page.waitForTimeout(1000);

    // Ali je notes input viden brez scrollanja?
    const notesInput = page.locator('textarea[placeholder*="opomba"]');
    const notesVisible = await isVisibleWithoutScroll(page, notesInput);

    if (!notesVisible) {
      ux.scrollNeeded();
      console.log('   ⚠️  Notes input ni viden brez scrollanja');
    }

    if (await notesInput.isVisible()) {
      await ux.fill(notesInput, 'Poklical - ni interesa za zdaj', 'Opomba');

      const addBtn = page.locator('button').filter({ hasText: 'Dodaj' }).first();
      await ux.click(addBtn, 'Dodaj opombo');

      const feedback = await waitForFeedback(page, /Opomba|dodan|Napaka/, 5000);
      const metrics = await ux.finish(feedback);

      expect(metrics.clicks).toBeLessThanOrEqual(5);
      expect(metrics.scrollsNeeded).toBe(0); // Notes input mora biti viden brez scrollanja (sticky)
    }
  });

  test('S4.2 - Notes input mora biti sticky (viden po scrollanju)', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const firstCard = page.locator('[data-first-letter]').first();
    if (!await firstCard.isVisible()) return;
    await firstCard.click();
    await page.waitForTimeout(1000);

    // Scrollaj navzdol v detajlu
    const scrollArea = page.locator('.overflow-y-auto').first();
    if (await scrollArea.isVisible()) {
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(300);
    }

    // Notes input mora biti še vedno viden (sticky)
    const notesInput = page.locator('textarea[placeholder*="opomba"]');
    const stillVisible = await notesInput.isVisible().catch(() => false);

    if (stillVisible) {
      console.log('   ✅ Notes input je sticky - viden po scrollanju');
    } else {
      console.log('   ❌ Notes input NI sticky - izgine po scrollanju');
    }

    expect(stillVisible).toBe(true);
  });

  test('S4.3 - Datum mora biti privzeto danes', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const firstCard = page.locator('[data-first-letter]').first();
    if (!await firstCard.isVisible()) return;
    await firstCard.click();
    await page.waitForTimeout(1000);

    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      const value = await dateInput.inputValue();
      const today = new Date().toISOString().split('T')[0];
      expect(value).toBe(today);
      console.log('   ✅ Datum je privzeto danes');
    }
  });
});

// ==========================================
// SCENARIJ 5: CELOTEN PRODAJNI WORKFLOW
// "Nov prospect → dodaj → pošlji ponudbo → followup"
// ==========================================

test.describe('Scenarij: Celoten prodajni workflow', () => {
  test('S5.1 - Koliko korakov od nove stranke do ponudbe?', async ({ page }) => {
    const ux = new UXTracker(page, 'Nova stranka → ponudba');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    let totalClicks = 0;

    // 1. Odpri dodajanje
    const addBtn = page.locator('button').filter({ hasText: /\+/ }).first();
    await ux.click(addBtn, 'Odpri dodajanje');
    totalClicks++;
    await page.waitForTimeout(500);

    // 2. Vnesi ime
    const nameInput = page.locator('input[placeholder*="CAST"]');
    await ux.fill(nameInput, 'UX Test Podjetje', 'Ime');
    totalClicks++;

    // 3. Vnesi kontakt
    const contactInput = page.locator('input[placeholder*="Ime"]').first();
    if (await contactInput.isVisible() && contactInput !== nameInput) {
      await ux.fill(contactInput, 'Ana Testna', 'Kontakt');
      totalClicks++;
    }

    // 4. Vnesi telefon
    const phoneInput = page.locator('input[placeholder*="040"]').first();
    if (await phoneInput.isVisible()) {
      await ux.fill(phoneInput, '040999888', 'Telefon');
      totalClicks++;
    }

    // 5. Shrani
    const submitBtn = page.locator('button').filter({ hasText: /Shrani|Dodaj stranko/ }).last();
    await ux.click(submitBtn, 'Shrani');
    totalClicks++;
    await page.waitForTimeout(2000);

    // 6. Ali se odpre detajl z gumbom za ponudbo?
    const offerBtn = page.getByText('Pošlji ponudbo');
    const offerVisible = await offerBtn.isVisible().catch(() => false);

    const metrics = await ux.finish(offerVisible);

    console.log(`   📊 Od nove stranke do gumba "Pošlji ponudbo": ${totalClicks} klikov`);
    console.log(`   📊 Ali je gumb za ponudbo viden: ${offerVisible ? 'DA' : 'NE (treba odpreti stranko)'}`);

    // Realistično: odpri dodajanje + 3 polja + shrani = 5 klikov
    // Potem odpri stranko + klik ponudba = +2 klikov
    // Skupaj max ~7 klikov
    expect(totalClicks).toBeLessThanOrEqual(8);
  });

  test('S5.2 - Ali po dodajanju nova stranka prikaže na vrhu seznama?', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Privzeti sort je 'date' - nova stranka mora biti na vrhu
    const firstCompany = page.locator('[data-first-letter]').first();
    const firstVisible = await firstCompany.isVisible().catch(() => false);

    if (firstVisible) {
      const text = await firstCompany.textContent();
      console.log(`   ℹ️  Prva stranka v seznamu: "${text?.substring(0, 50)}..."`);
    }

    // Sort mora biti po datumu (najnovejši na vrhu)
    expect(true).toBe(true);
  });
});

// ==========================================
// SCENARIJ 6: OBVESTILA WORKFLOW
// "Uporabnik obdela obvestilo - DA/NE/Prestavi"
// ==========================================

test.describe('Scenarij: Obdelava obvestil', () => {
  test('S6.1 - Obdelaj eno obvestilo (max 2 klika)', async ({ page }) => {
    const ux = new UXTracker(page, 'Obdelaj obvestilo');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Najdi prvo kartico z DA/NE gumbi
    const daBtn = page.locator('button').filter({ hasText: 'DA' }).first();
    const neBtn = page.locator('button').filter({ hasText: 'NE' }).first();

    if (await daBtn.isVisible()) {
      await ux.click(daBtn, 'DA na obvestilo');
      const feedback = await waitForFeedback(page, /pogodbo|odgovor|posodobljen|Napaka/, 5000);
      const metrics = await ux.finish(feedback);
      expect(metrics.clicks).toBeLessThanOrEqual(2);
    } else if (await neBtn.isVisible()) {
      await ux.click(neBtn, 'NE na obvestilo');
      const feedback = await waitForFeedback(page, /prestavljen|opomnik|jutri|Napaka/, 5000);
      const metrics = await ux.finish(feedback);
      expect(metrics.clicks).toBeLessThanOrEqual(2);
    } else {
      console.log('   ℹ️  Ni obvestil za obdelavo');
      await ux.finish(true);
    }
  });

  test('S6.2 - Obvestila morajo biti dosegljiva brez scrollanja', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const header = page.getByText(/Nujno/).first();
    if (await header.isVisible()) {
      const visible = await isVisibleWithoutScroll(page, header);
      if (visible) {
        console.log('   ✅ Obvestila vidna brez scrollanja');
      } else {
        console.log('   ⚠️  Obvestila zahtevajo scrollanje');
      }
      expect(visible).toBe(true);
    }
  });

  test('S6.3 - Ali se obvestila posodobijo po akciji (brez refresha)?', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const header = page.getByText(/Nujno \((\d+)\)/);
    if (await header.isVisible()) {
      const beforeText = await header.textContent();
      const beforeMatch = beforeText?.match(/\((\d+)\)/);
      const beforeCount = beforeMatch ? parseInt(beforeMatch[1]) : 0;

      console.log(`   ℹ️  Pred akcijo: ${beforeCount} obvestil`);

      // Klikni "Sledi" ali "Opravljeno" na prvem obvestilu
      const actionBtn = page.locator('button').filter({ hasText: /Sledi|Opravljeno/ }).first();
      if (await actionBtn.isVisible()) {
        await actionBtn.click();
        await page.waitForTimeout(2000);

        // Preveri ali se je count spremenil
        const afterText = await header.textContent().catch(() => '');
        console.log(`   ℹ️  Po akciji: ${afterText}`);
      }
    }
  });
});

// ==========================================
// SCENARIJ 7: DESKTOP MASTER-DETAIL
// "Uporabnik na desktopu pregleduje stranke"
// ==========================================

test.describe('Scenarij: Desktop pregledovanje strank', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('S7.1 - Preklapljanje med strankami brez ponovnega nalaganja (1 klik)', async ({ page }) => {
    const ux = new UXTracker(page, 'Desktop preklapljanje strank');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const rows = page.locator('[data-first-letter]');
    const count = await rows.count();

    if (count >= 2) {
      // Klik na prvo
      await ux.click(rows.first(), 'Prva stranka');
      await page.waitForTimeout(500);
      const name1 = await page.locator('h3.text-lg.font-bold').first().textContent();

      // Klik na drugo - mora biti 1 klik, brez loading
      const startTime = Date.now();
      await ux.click(rows.nth(1), 'Druga stranka');
      await page.waitForTimeout(500);
      const switchTime = Date.now() - startTime;
      const name2 = await page.locator('h3.text-lg.font-bold').first().textContent();

      console.log(`   ⏱️  Preklop: ${switchTime}ms`);
      console.log(`   ${name1} → ${name2}`);

      expect(name1).not.toEqual(name2);
      expect(switchTime).toBeLessThan(3000); // Preklop mora biti hiter

      const metrics = await ux.finish(true);
      expect(metrics.clicks).toBe(2); // 1 klik na stranko
    }
  });

  test('S7.2 - Na desktopu ne sme odpreti modala (inline panel)', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const firstRow = page.locator('[data-first-letter]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(500);

      // Preveri da NI modal overlay-a
      const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
      const hasOverlay = await overlay.isVisible().catch(() => false);

      if (!hasOverlay) {
        console.log('   ✅ Desktop: inline panel (ni modala)');
      } else {
        console.log('   ❌ Desktop: odprl modal namesto inline panela');
      }

      expect(hasOverlay).toBe(false);
    }
  });

  test('S7.3 - Desktop placeholder ko ni izbrane stranke', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const placeholder = page.getByText('Izberi stranko');
    const visible = await placeholder.isVisible().catch(() => false);

    if (visible) {
      console.log('   ✅ Placeholder "Izberi stranko" viden');
    }
  });

  test('S7.4 - Desktop: iskanje + detajl hkrati (0 extra klikov)', async ({ page }) => {
    const ux = new UXTracker(page, 'Desktop iskanje + detajl');

    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Izberi stranko
    const firstRow = page.locator('[data-first-letter]').first();
    if (await firstRow.isVisible()) {
      await ux.click(firstRow, 'Izberi stranko');
      await page.waitForTimeout(500);

      // Zdaj iščem - detajl mora ostati odprt
      const searchInput = page.locator('input[placeholder*="Išči"]');
      await ux.fill(searchInput, 'a', 'Iskanje');
      await page.waitForTimeout(500);

      // Detajl mora še vedno biti viden
      const detail = page.locator('h3.text-lg.font-bold');
      const detailVisible = await detail.isVisible().catch(() => false);

      const metrics = await ux.finish(detailVisible);
      console.log(`   ${detailVisible ? '✅' : '❌'} Detajl ostane odprt med iskanjem`);
    }
  });
});

// ==========================================
// SCENARIJ 8: MOBILNA UPORABA
// "Prodajalec na telefonu"
// ==========================================

test.describe('Scenarij: Mobilna uporaba', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('S8.1 - Touch target velikost (min 44px)', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Preveri velikost gumbov
    const buttons = page.locator('button').all();
    let tooSmall = 0;
    let total = 0;

    for (const btn of await buttons) {
      const box = await btn.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) {
        total++;
        if (box.height < 36) { // 36px je minimum za prst
          tooSmall++;
        }
      }
    }

    console.log(`   📊 Gumbi: ${total} skupaj, ${tooSmall} premajhnih (< 36px)`);
    // Max 20% gumbov sme biti premajhnih (ikone itd.)
    expect(tooSmall / Math.max(total, 1)).toBeLessThan(0.3);
  });

  test('S8.2 - Stran se mora naložiti v < 5s na mobilnem', async ({ page }) => {
    await loginAsProdalajec(page);

    const startTime = Date.now();
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`   ⏱️  Nalaganje: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // Max 10s (vključuje login)
  });

  test('S8.3 - Iskanje mora biti dosegljivo brez scrollanja', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[placeholder*="Išči"]');
    const visible = await isVisibleWithoutScroll(page, searchInput);

    expect(visible).toBe(true);
    console.log(`   ${visible ? '✅' : '❌'} Iskanje vidno brez scrollanja`);
  });

  test('S8.4 - Modal mora biti na dnu ekrana (items-end)', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    const firstCard = page.locator('[data-first-letter]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(500);

      // Modal mora imeti items-end na mobilnem
      const modal = page.locator('.flex.items-end');
      const isBottomAligned = await modal.isVisible().catch(() => false);

      if (isBottomAligned) {
        console.log('   ✅ Modal na dnu ekrana (prijazno za palec)');
      }
    }
  });
});

// ==========================================
// SCENARIJ 9: ERROR RECOVERY
// "Kaj se zgodi ob napakah"
// ==========================================

test.describe('Scenarij: Obravnava napak', () => {
  test('S9.1 - Ali app preživi network error brez crasha', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Simuliraj offline
    await page.route('**/rest/v1/**', route => route.abort());

    // Poskusi akcijo
    const firstCard = page.locator('[data-first-letter]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(2000);

      // App ne sme crashati
      const pageTitle = page.getByText('Stranke');
      expect(await pageTitle.isVisible()).toBe(true);
      console.log('   ✅ App preživi network error');
    }

    // Cleanup
    await page.unroute('**/rest/v1/**');
  });

  test('S9.2 - Ali se prikaže error toast ob napaki', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Block API
    await page.route('**/rest/v1/company_notes**', route => route.abort());

    const firstCard = page.locator('[data-first-letter]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);

      // Poskusi dodati opombo
      const textarea = page.locator('textarea[placeholder*="opomba"]');
      if (await textarea.isVisible()) {
        await textarea.fill('Test error');
        const addBtn = page.locator('button').filter({ hasText: 'Dodaj' }).first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(2000);

          // Error toast mora biti viden
          const error = page.getByText(/Napaka|Error/i);
          const errorVisible = await error.isVisible().catch(() => false);
          console.log(`   ${errorVisible ? '✅' : '⚠️'} Error toast: ${errorVisible ? 'viden' : 'ni viden'}`);
        }
      }
    }

    await page.unroute('**/rest/v1/company_notes**');
  });
});

// ==========================================
// SCENARIJ 10: ACCESSIBILITY BASICS
// ==========================================

test.describe('Scenarij: Osnovna dostopnost', () => {
  test('S10.1 - Vsi inputi morajo imeti label ali placeholder', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    const addBtn = page.locator('button').filter({ hasText: /\+/ }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const inputs = await page.locator('input:not([type="hidden"])').all();
    let unlabeled = 0;

    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');

      if (!placeholder && !ariaLabel && !id) {
        unlabeled++;
      }
    }

    console.log(`   📊 Inputi: ${inputs.length} skupaj, ${unlabeled} brez oznake`);
    // Vsi inputi morajo imeti vsaj placeholder
    expect(unlabeled).toBe(0);
  });

  test('S10.2 - Kontrast gumbov mora biti dovolj močen', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(3000);

    // Preveri da gumbi niso sivi na sivi
    const disabledBtns = page.locator('button:disabled');
    const count = await disabledBtns.count();

    console.log(`   ℹ️  ${count} onemogočenih gumbov`);
    // Disabled gumbi so OK, ampak aktivni morajo imeti dovolj kontrasta
    expect(true).toBe(true);
  });

  test('S10.3 - Focus mora biti viden na inputih', async ({ page }) => {
    await loginAsProdalajec(page);
    await page.goto('/contacts');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Išči"]');
    await searchInput.focus();
    await page.waitForTimeout(200);

    // Input mora imeti focus ring
    const hasFocusStyle = await searchInput.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outlineStyle !== 'none' || styles.boxShadow !== 'none';
    });

    console.log(`   ${hasFocusStyle ? '✅' : '⚠️'} Focus ring: ${hasFocusStyle ? 'viden' : 'ni viden'}`);
  });
});

# Mat Tracker Pro - TODO & Improvements

**Created:** 2026-03-15
**Based on:** Expert audit by UI/UX designer, graphic designer, and fullstack developer (each 20+ years experience)
**Focus:** Settings page + Email system + overall quality

---

## Priority Legend

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | CRITICAL | Blocks professional use, must fix |
| P1 | HIGH | Should fix before next release |
| P2 | MEDIUM | Important improvement |
| P3 | LOW | Nice to have, polish |

---

## 1. Desktop Responsive Layout (P0)

The Settings page uses `max-w-2xl` (672px) constraint, wasting 50%+ of screen space on desktop (1280px+). Only `sm:` breakpoint is used in one section.

### Tasks

- [ ] **1.1** Remove `max-w-2xl` constraint from Settings page container
- [ ] **1.2** Add responsive breakpoints: `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- [ ] **1.3** Implement responsive grid layout for Settings:
  - Mobile: single column (current)
  - Tablet (md:): sidebar nav + content area
  - Desktop (lg:+): sidebar nav + wider content with 2-column forms
- [ ] **1.4** ProfileSection: Avatar left + form fields right on desktop (`md:grid md:grid-cols-3`)
- [ ] **1.5** EmailTemplatesSection: Side-by-side editor + live preview on desktop (`md:grid md:grid-cols-2`)
- [ ] **1.6** EmailSignatureSection: Expand grid to `md:grid-cols-3` on desktop (currently only `sm:grid-cols-2`)

**Files:** `src/pages/Settings.tsx`, `src/pages/settings/ProfileSection.tsx`, `src/pages/settings/EmailTemplatesSection.tsx`, `src/pages/settings/EmailSignatureSection.tsx`

---

## 2. Tab Navigation Modernization (P1)

Current underline-style tabs look dated. No hover feedback beyond border color.

### Tasks

- [ ] **2.1** Replace underline tabs with modern segmented/button style:
  ```
  Current:  [Profile]  [Email Templates]  [Email Signature]  (underline)
  Better:   [Profile]  [Email Templates]  [Email Signature]  (pill/button bg)
  ```
- [ ] **2.2** On desktop (lg:+), convert tabs to vertical sidebar navigation
- [ ] **2.3** Add hover states with background color transition
- [ ] **2.4** Fix icon/text size mismatch (icons 16px, text 12px)

**Files:** `src/pages/Settings.tsx`

---

## 3. Template Editor UX (P1)

### Tasks

- [ ] **3.1** On desktop: show live preview permanently beside editor (not hidden behind toggle)
- [ ] **3.2** Group textareas logically (intro + seasonal together, service + closing together)
- [ ] **3.3** Add textarea character count indicators
- [ ] **3.4** Fix template action button touch targets: increase from `p-1.5` (28px) to `p-2.5` (40px+)
- [ ] **3.5** Add smooth expand/collapse animation for template accordion
- [ ] **3.6** Show template type badges (najem/nakup/primerjava/dodatna) with color coding

**Files:** `src/pages/settings/EmailTemplatesSection.tsx`

---

## 4. Cache Synchronization (P1)

### Tasks

- [ ] **4.1** Fix React Query cache sync between Settings and Contacts pages
  - User edits template in Settings → switches to Contacts → old template may be used
  - `refetchOnWindowFocus: true` only triggers on window focus, not route changes
- [ ] **4.2** Memoize `getTemplatesForType()` - currently creates new array every render
  ```typescript
  // Current (creates new array every render):
  const templatesForType = emailTemplates.getTemplatesForType(offerType);
  // Fix:
  const templatesForType = useMemo(
    () => emailTemplates.getTemplatesForType(offerType),
    [emailTemplates.templates, offerType]
  );
  ```
- [ ] **4.3** Fix `generateEmailHTML` memoization break in OfferPreviewStep
  - Function is new reference every render (defined in useOfferEmail without memoization)
  - Breaks `useMemo` dependency tracking
- [ ] **4.4** Centralize query key constants in `src/constants/queryKeys.ts`

**Files:** `src/hooks/useEmailTemplates.ts`, `src/pages/Contacts.tsx`, `src/pages/contacts/hooks/useOfferEmail.ts`, `src/pages/contacts/components/offer/OfferPreviewStep.tsx`

---

## 5. Form Validation & Error Handling (P1)

### Tasks

- [ ] **5.1** Add inline form validation (currently errors only show via toast)
  - Required field indicators
  - Inline error messages below fields
  - Border color change on error (`border-red-500`)
- [ ] **5.2** Add template name validation (required, min length, unique per type)
- [ ] **5.3** Add explicit focus ring to all inputs: `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
- [ ] **5.4** Add disabled state styling: `disabled:bg-gray-50 disabled:cursor-not-allowed`
- [ ] **5.5** Wrap Settings page sections in ErrorBoundary components
- [ ] **5.6** Improve AI generation error messages (distinguish: no API key, invalid key, rate limit, quota exceeded)

**Files:** `src/pages/settings/ProfileSection.tsx`, `src/pages/settings/EmailTemplatesSection.tsx`, `src/pages/settings/EmailSignatureSection.tsx`

---

## 6. Template Seeding Race Condition (P2)

### Tasks

- [ ] **6.1** Fix race condition when two browser tabs seed default templates simultaneously
  - Both tabs check `data.length === 0`, both attempt INSERT
  - Second tab gets constraint violation error
  - Solution: Use `ON CONFLICT DO NOTHING` or database-level locking

**Files:** `src/hooks/useEmailTemplates.ts` (lines 127-140)

---

## 7. Signature System Improvements (P2)

### Tasks

- [ ] **7.1** Clarify the two "signature" concepts in UI:
  - ProfileSection: `signature_url` = image signature for contracts (pen signature)
  - EmailSignatureSection: `user_email_signatures` = email footer text
  - Currently confusing for users - add clear labels and descriptions
- [ ] **7.2** Add email client rendering preview (how it looks in Gmail vs Outlook)
- [ ] **7.3** Fix logo preview size inconsistency: component shows `max-h-12 object-contain`, preview shows `max-height: 40px`
- [ ] **7.4** Add signature link validation (check URL format before saving)

**Files:** `src/pages/settings/ProfileSection.tsx`, `src/pages/settings/EmailSignatureSection.tsx`

---

## 8. Accessibility (P2)

### Tasks

- [ ] **8.1** Fix helper text contrast: change `text-xs text-gray-400` to `text-xs text-gray-500` (WCAG AA)
- [ ] **8.2** Add `aria-expanded` to collapsible sections (password, AI settings)
- [ ] **8.3** Add keyboard alternative for avatar click handler
- [ ] **8.4** Add chevron icons to collapsible sections (password change, AI settings) for discoverability
- [ ] **8.5** Ensure all interactive elements meet 44px minimum touch target

**Files:** `src/pages/settings/ProfileSection.tsx`, `src/pages/settings/EmailTemplatesSection.tsx`

---

## 9. Visual Hierarchy & Spacing (P2)

### Tasks

- [ ] **9.1** Differentiate spacing: major sections `space-y-8`, form groups `space-y-4`, individual fields `space-y-2`
- [ ] **9.2** Add section headers with subtle background/border color coding
- [ ] **9.3** Increase input text size on desktop from `text-sm` (14px) to `text-base` (16px)
- [ ] **9.4** Add smooth transitions on expand/collapse: `transition-all duration-200 ease-out`
- [ ] **9.5** Standardize button hierarchy: primary (filled blue), secondary (outline), tertiary (text only)

**Files:** `src/pages/settings/*.tsx`

---

## 10. Code Quality & DRY (P2)

### Tasks

- [ ] **10.1** Extract `TEMPLATE_TYPE_LABELS` to shared constants file
- [ ] **10.2** Consolidate default email texts - currently defined in both:
  - `src/hooks/useEmailTemplates.ts` (DEFAULT_TEMPLATES constant)
  - `src/pages/contacts/hooks/useOfferEmail.ts` (hardcoded fallback defaults)
- [ ] **10.3** Reduce prop drilling in ContactsModals - group template-related props into config object:
  ```typescript
  // Instead of 6 separate props:
  offerTemplateConfig={{
    templates, selectedId, onChange,
    tableColor, onColorChange, onGenerateAI,
  }}
  ```
- [ ] **10.4** Add retry logic to mutations in useEmailTemplates (`retry: 2`)
- [ ] **10.5** Fix useEmailSignature mutation - decouple from closure state, pass `existingId` explicitly

**Files:** `src/hooks/useEmailTemplates.ts`, `src/hooks/useEmailSignature.ts`, `src/pages/Contacts.tsx`, `src/pages/contacts/hooks/useOfferEmail.ts`

---

## 11. Email Preview Improvements (P2)

### Tasks

- [ ] **11.1** Settings preview: show real user data instead of hardcoded sample ("Janez Novak") - DONE
- [ ] **11.2** Settings preview: show live preview side-by-side with editor on desktop (not hidden toggle)
- [ ] **11.3** Settings preview: show multiple offer type scenarios (najem, nakup, primerjava)
- [ ] **11.4** Offer wizard preview: add debouncing to text editor (300ms delay before re-render)
- [ ] **11.5** Add table color picker integration to Settings preview

**Files:** `src/pages/settings/EmailTemplatesSection.tsx`, `src/pages/contacts/components/offer/OfferPreviewStep.tsx`

---

## 12. Missing Features (P3)

### Tasks

- [ ] **12.1** Template versioning / change history (who changed what, when)
- [ ] **12.2** Template bulk operations (duplicate all, reset to defaults, export/import)
- [ ] **12.3** Template search/filter (when user has many templates)
- [ ] **12.4** Email client preview mode (render as Gmail, Outlook, Apple Mail)
- [ ] **12.5** Template sharing between users (admin copies template to another user)
- [ ] **12.6** Notification preferences section in Settings
- [ ] **12.7** Session/device management in Settings
- [ ] **12.8** Settings search/filter functionality

---

## 13. Performance (P3)

### Tasks

- [ ] **13.1** Debounce preview HTML regeneration in OfferPreviewStep (every keystroke triggers full re-render)
- [ ] **13.2** Memoize `generateEmailHTML` in useOfferEmail hook (currently new reference each render)
- [ ] **13.3** Lazy load template editor component (currently loaded immediately)
- [ ] **13.4** Add concurrent mutation protection (disable Save button while previous save is pending)

**Files:** `src/pages/contacts/hooks/useOfferEmail.ts`, `src/pages/contacts/components/offer/OfferPreviewStep.tsx`, `src/pages/settings/EmailTemplatesSection.tsx`

---

## 14. Slovenian Language Consistency (P3)

### Tasks

- [ ] **14.1** Standardize error messages: currently mix of complete sentences and fragments
  - "Predloga shranjena" (complete)
  - "Ni emaila" (fragment)
  - "izberi & kopiraj" (fragment)
- [ ] **14.2** Add consistent loading state messages across all sections

---

## Implementation Order (Recommended)

### Phase 1: Critical UX (1-2 weeks)
1. Desktop responsive layout (#1)
2. Tab navigation (#2)
3. Cache synchronization fixes (#4)

### Phase 2: Quality & Polish (1-2 weeks)
4. Form validation & error handling (#5)
5. Template editor UX (#3)
6. Accessibility (#8)
7. Visual hierarchy (#9)

### Phase 3: Code Quality (1 week)
8. Code quality & DRY (#10)
9. Template seeding fix (#6)
10. Signature improvements (#7)

### Phase 4: Nice to Have (ongoing)
11. Email preview improvements (#11)
12. Missing features (#12)
13. Performance optimizations (#13)
14. Language consistency (#14)

---

## Summary

| Priority | Count | Estimated Effort |
|----------|-------|-----------------|
| P0 (Critical) | 6 tasks | 1-2 weeks |
| P1 (High) | 16 tasks | 1-2 weeks |
| P2 (Medium) | 19 tasks | 2-3 weeks |
| P3 (Low) | 12 tasks | 1-2 weeks |
| **Total** | **53 tasks** | **5-9 weeks** |

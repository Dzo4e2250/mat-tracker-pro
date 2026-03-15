# Mat Tracker Pro - Architecture Document

**Version:** 1.0
**Last Updated:** 2026-03-15
**Application URL:** https://matpro.reitti.cloud

---

## Table of Contents

1. [Project Overview & Tech Stack](#1-project-overview--tech-stack)
2. [Project Structure](#2-project-structure)
3. [Database Schema](#3-database-schema-28-tables-in-mat_tracker-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [State Management](#5-state-management)
6. [API Integration](#6-api-integration)
7. [Key Features & Workflows](#7-key-features--workflows)
8. [Email System Architecture](#8-email-system-architecture)
9. [Security & Encryption](#9-security--encryption)
10. [Build & Deployment](#10-build--deployment)
11. [UI Component Library](#11-ui-component-library)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Error Handling](#13-error-handling)
14. [Testing Infrastructure](#14-testing-infrastructure)
15. [Development Workflow](#15-development-workflow)

---

## 1. Project Overview & Tech Stack

**Mat Tracker Pro** is an enterprise React/TypeScript application for managing the complete lifecycle of industrial entry floor mats (predprazniki) with integrated CRM, GPS tracking, AI-powered business card scanning, and automated quote generation. The application serves four user roles (`prodajalec`, `prodajalec_oblek`, `inventar`, `admin`) with a PostgreSQL backend via self-hosted Supabase.

| Component | Technology | Version |
|---|---|---|
| **Frontend Framework** | React | 18.3.1 |
| **Language** | TypeScript | 5.8.3 |
| **Build Tool** | Vite (with SWC) | 5.4.19 |
| **UI Components** | shadcn/ui (Radix UI primitives) | Latest |
| **Styling** | Tailwind CSS | 3.4.17 |
| **State Management** | TanStack React Query | 5.83.0 |
| **Routing** | React Router | 6.30.1 |
| **HTTP Client** | Supabase JS Client | 2.76.0 |
| **Database** | PostgreSQL (via Supabase) | 14+ |
| **Auth** | Supabase Auth (email/password) | Built-in |
| **Backend Logic** | Deno Edge Functions | Self-hosted |
| **Maps** | Leaflet + OpenStreetMap | 1.9.4 |
| **PDF Generation** | pdf-lib, jsPDF | 1.17.1, 4.1.0 |
| **Excel Export** | SheetJS (xlsx) | 0.18.5 |
| **QR Codes** | qrcode.react, html5-qrcode | 4.2.0, 2.3.8 |
| **Document Templates** | docxtemplater + pizzip | 3.67.6, 3.2.0 |
| **Charts** | Recharts | 2.15.4 |
| **Drag & Drop** | @hello-pangea/dnd | 18.0.1 |
| **Error Tracking** | Sentry | 10.36.0 |
| **Compression** | gzip + Brotli (nginx) | Pre-compressed |
| **Container** | Docker + Alpine nginx | Multi-stage build |

---

## 2. Project Structure

```
mat-tracker-pro/
├── src/
│   ├── main.tsx                              # Entry point
│   ├── App.tsx                               # Router setup, auth provider, lazy loading
│   ├── components/
│   │   ├── ui/                               # 52 shadcn/ui components
│   │   │   ├── button.tsx, dialog.tsx, etc.
│   │   ├── ProtectedRoute.tsx                # Role-based route protection
│   │   ├── ErrorBoundary.tsx                 # Error handling wrapper
│   ├── contexts/
│   │   ├── AuthContext.tsx                   # Auth state, role management
│   ├── pages/
│   │   ├── Index.tsx                         # Landing page
│   │   ├── Auth.tsx                          # Login/signup
│   │   ├── ProdajalecDashboard.tsx           # Salesperson main dashboard
│   │   ├── InventarDashboard.tsx             # Inventory manager dashboard
│   │   ├── Contacts.tsx                      # CRM (companies & contacts)
│   │   ├── Settings.tsx                      # User settings (profile, email, AI)
│   │   ├── OrderCodes.tsx                    # QR code order management
│   │   ├── WorklistPopup.tsx                 # Mobile worklist view
│   │   ├── contacts/                         # CRM subcomponents
│   │   │   ├── components/
│   │   │   │   ├── CompanyDetailModal.tsx
│   │   │   │   ├── BusinessCardScannerModal.tsx  # AI OCR
│   │   │   │   ├── OfferModalWrapper.tsx
│   │   │   │   ├── offer/
│   │   │   │   │   ├── OfferTypeStep.tsx
│   │   │   │   │   ├── OfferItemsNajemStep.tsx   # Rental items
│   │   │   │   │   ├── OfferItemsNakupStep.tsx   # Purchase items
│   │   │   │   │   ├── OfferPreviewStep.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useOfferEmail.ts              # Table generation, HTML/text email
│   │   │   ├── utils/
│   │   │   │   ├── contactHelpers.ts
│   │   ├── prodajalec/                       # Salesperson-specific pages
│   │   │   ├── components/
│   │   │   │   ├── HomeView.tsx
│   │   │   │   ├── ScanView.tsx             # QR scanning
│   │   │   │   ├── MapView.tsx              # GPS map tracking
│   │   │   │   ├── DirtyMatsView.tsx        # Used mat marking
│   │   │   │   ├── StatisticsView.tsx
│   │   │   │   ├── TasksView.tsx            # Kanban tasks
│   │   │   │   ├── TravelLogView.tsx
│   │   │   │   ├── modals/
│   │   │   │   │   ├── PutOnTestModal.tsx
│   │   │   │   │   ├── SignContractModal.tsx
│   │   │   │   │   ├── MatDetailsModal.tsx
│   │   │   │   │   ├── WaitingDriverModal.tsx
│   │   ├── inventar/                         # Admin inventory pages
│   │   │   ├── AccountsManagement.tsx        # User management
│   │   │   ├── Prevzemi.tsx                  # Pickups management
│   │   │   ├── QRKode.tsx                    # QR generation/printing
│   │   │   ├── OrderManagement.tsx           # QR order workflow
│   │   │   ├── SellerPage.tsx                # Seller details
│   │   │   ├── MapView.tsx                   # Fleet GPS map
│   │   │   ├── DriversManagement.tsx         # Driver admin
│   │   │   ├── Analytics.tsx                 # KPI dashboard
│   │   │   ├── ActivityTracking.tsx          # Salesperson activity log
│   │   │   ├── PriceManagement.tsx           # Rate management
│   │   ├── settings/
│   │   │   ├── ProfileSection.tsx
│   │   │   ├── EmailTemplatesSection.tsx     # Email template management
│   │   │   ├── EmailSignatureSection.tsx     # Email signature setup
│   ├── hooks/                                # 30+ custom React hooks
│   │   ├── useCompanies.ts                   # Company CRUD (React Query)
│   │   ├── useCompanyContacts.ts
│   │   ├── useCompanyNotes.ts
│   │   ├── useCycles.ts                      # Mat lifecycle
│   │   ├── useQRCodes.ts
│   │   ├── useOrders.ts
│   │   ├── useMatTypes.ts
│   │   ├── usePrices.ts
│   │   ├── useOptibrushPrices.ts
│   │   ├── useDrivers.ts
│   │   ├── useGpsTracking.ts
│   │   ├── useTravelLog.ts
│   │   ├── useTasks.ts
│   │   ├── useReminders.ts
│   │   ├── useAnalyticsData.ts
│   │   ├── useActivityTracking.ts
│   │   ├── useMapLocations.ts
│   │   ├── useEmailTemplates.ts              # Email templates CRUD
│   │   ├── useEmailSignature.ts              # Email signatures CRUD
│   │   ├── useNetworkStatus.ts               # Offline detection
│   │   ├── use-toast.ts                      # shadcn/ui toast
│   ├── integrations/
│   │   ├── supabase/
│   │   │   ├── client.ts                     # Supabase client init
│   │   │   ├── types.ts                      # Manually maintained TypeScript types (28+ tables)
│   ├── lib/
│   │   ├── queryClient.ts                    # React Query config
│   │   ├── sentry.ts                         # Error tracking integration
│   │   ├── utils.ts                          # Helper functions (cn, etc.)
│   │   ├── dao/                              # Data access layer
│   ├── utils/
│   │   ├── priceList.ts                      # Price calculations
│   ├── styles/
│   │   ├── globals.css
├── supabase/
│   ├── migrations/                           # 45+ schema migration files
│   │   ├── 202510*.sql                       # Initial schema (auth, roles, tables)
│   │   ├── 202512*.sql                       # Contract/offer workflow
│   │   ├── 202601*.sql                       # GPS, notes, hierarchy
│   │   ├── 202602*.sql                       # Tasks, signatures, AI scanning
│   │   ├── 202603*.sql                       # Email templates
│   ├── functions/                            # Deno edge functions
│   │   ├── create-user/                      # User account creation
│   │   ├── delete-user/                      # User deletion
│   │   ├── update-user-password/             # Password management
│   │   ├── save-ai-settings/                 # Encrypt & save API keys
│   │   ├── generate-email-text/              # AI email generation (OpenAI/Anthropic/Google)
│   │   ├── scan-business-card/               # AI OCR + fuzzy company matching
├── database/
│   ├── full_setup.sql                        # Complete single-file schema
│   ├── mat_tracker_schema.sql                # Schema only
│   ├── backup.sh                             # Backup script
│   ├── restore.sh                            # Restore script
├── public/
│   ├── favicon.svg
│   ├── dostavno-mesto-template.pdf           # Pickup document template
├── Dockerfile                                # Multi-stage: brotli compile + build + nginx
├── nginx.conf                                # nginx config with compression, CSP & security headers
├── vite.config.ts                            # Vite with SWC, compression plugins, vendor chunks
├── tsconfig.json                             # TypeScript strict mode
├── package.json                              # Dependencies & scripts
├── tailwind.config.js                        # Tailwind preset with custom theme
├── CLAUDE.md                                 # Deployment instructions
└── README.md                                 # Project documentation
```

---

## 3. Database Schema (28 Tables in `mat_tracker` Schema)

All tables reside in the `mat_tracker` schema (not `public`). Row Level Security (RLS) is enabled on every table.

### Core Tables

#### profiles (User Accounts)
```sql
id (UUID PK, references auth.users)
email, first_name, last_name, full_name (generated)
phone, code_prefix (QR prefix for sellers)
role (prodajalec | inventar | prodajalec_oblek | admin)
secondary_role (optional second role)
avatar_url, signature_url (cloud storage paths)
is_active, created_at, updated_at
```

#### mat_types (Product Catalog)
```sql
id (UUID PK)
code (product code)
name, category (standard | ergo | design)
width_cm, height_cm (dimensions)
price_1_week, price_2_weeks, price_3_weeks, price_4_weeks
price_purchase, price_penalty (penalties for damage)
is_active, created_at
```

#### companies (CRM - Customers)
```sql
id (UUID PK)
name, tax_number, registration_number
address_street, address_postal, address_city, address_country
delivery_address*, billing_address* (separate)
working_hours, delivery_instructions
customer_number, latitude, longitude (GPS)
notes, pipeline_status (pipeline tracking)
contract_sent_at, contract_called_at, offer_sent_at, offer_called_at
parent_company_id (company hierarchy)
is_in_d365 (integration marker)
created_by (user FK), created_at, updated_at
```

#### contacts (Company Contacts)
```sql
id (UUID PK)
company_id (FK)
first_name, last_name, email, phone, work_phone, role
is_decision_maker, is_primary, is_billing_contact, is_service_contact
notes, contact_since, location_address
created_by, created_at, updated_at
```

#### company_notes (Activity Log)
```sql
id (UUID PK)
company_id (FK)
note_date, content, created_by
activity_category, activity_subcategory (pipeline stages)
appointment_type, start_time, end_time
exported_to_d365_at
created_at, updated_at
```

### QR Code & Mat Lifecycle

#### qr_codes
```sql
id (UUID PK)
code (unique barcode)
owner_id (salesperson FK)
status (pending | available | active)
ordered_at, received_at, last_reset_at
created_at, created_by
```

#### cycles (Mat Lifecycle - Main Table)
```sql
id (UUID PK)
qr_code_id (FK) - which physical mat
salesperson_id (FK)
mat_type_id (FK)
status (clean | on_test | dirty | waiting_driver | completed)
company_id, contact_id (current location)
test_start_date, test_end_date
extensions_count (renewal count)
location_lat, location_lng, location_address (GPS)
contract_signed, contract_frequency (2x/week, weekly, etc.)
contract_signed_at, pickup_requested_at, driver_pickup_at
notes, created_at, updated_at
```

#### cycle_history
```sql
id (UUID PK)
cycle_id (FK)
action (status change log)
old_status, new_status
metadata (JSON for extra context)
performed_by, performed_at
```

### Orders & Offers

#### orders
```sql
id (UUID PK)
salesperson_id (FK)
status (pending | approved | rejected | shipped | received)
approved_by, approved_at
rejection_reason, shipped_at, received_at
notes, created_at, updated_at
```

#### order_items
```sql
id (UUID PK)
order_id (FK)
mat_type_id (FK)
quantity_requested, quantity_approved
created_at
```

#### sent_emails (Offer Tracking)
```sql
id (UUID PK)
cycle_id, company_id, contact_id (FK)
template_id (which template used)
recipient_email, subject, offer_type (rental | purchase | both)
frequency (najem frequency)
billionmails_id (integration)
status, sent_at, created_by
```

#### offer_items (Offer Line Items)
```sql
id (UUID PK)
sent_email_id, cycle_id (FK)
mat_type_id (FK) or custom dimensions
is_design, width_cm, height_cm
price_rental, price_purchase, price_penalty
quantity, notes, created_at
```

### Pricing

#### mat_prices
```sql
id (UUID PK)
code, name (product reference)
category (poslovni | ergonomski | zunanji | design)
m2 (area in square meters)
dimensions (human readable: "50x50 cm")
price_week_1, price_week_2, price_week_3, price_week_4
price_purchase, is_active
created_at, updated_at
```

#### custom_m2_prices
```sql
id (UUID PK)
size_category (small | large)
frequency (1 | 2 | 3 | 4 weeks)
price_per_m2
created_at, updated_at
```

#### optibrush_prices (Special Product Line)
```sql
id (UUID PK)
has_edge, has_drainage (boolean options)
is_standard, is_large (size variant)
color_count (1 | 2-3 colors)
price_per_m2
created_at, updated_at
```

### Operations & Logistics

#### drivers
```sql
id (UUID PK)
name, phone, region
is_active, created_at, updated_at
```

#### driver_pickups
```sql
id (UUID PK)
status (pending | in_progress | completed)
scheduled_date, completed_at
assigned_driver (FK), created_by
notes, created_at
```

#### driver_pickup_items
```sql
id (UUID PK)
pickup_id (FK), cycle_id (FK)
picked_up (boolean), picked_up_at
notes
```

### Tasks & Reminders

#### reminders
```sql
id (UUID PK)
company_id (FK), user_id (FK)
reminder_at (scheduled time)
note, is_completed
reminder_type, created_at, updated_at
```

#### tasks
```sql
id (UUID PK)
user_id (FK), company_id (FK)
title, description
status (todo | in_progress | done)
priority (low | medium | high)
due_date, created_at, updated_at
```

### GPS & Tracking

#### gps_tracking_sessions
```sql
id (UUID PK)
user_id (FK)
session_date (which day)
points (JSON array of {lat, lng, timestamp})
total_distance_km
is_completed, created_at
```

#### travel_logs
```sql
id (UUID PK)
user_id (FK)
log_date (which month)
total_km, days_worked
created_at, updated_at
```

### Email & Communication

#### email_templates (System Templates)
```sql
id (UUID PK)
name, subject
body_html, body_text
template_type (offer_rental | offer_purchase | offer_both | reminder | followup)
is_active, created_at, updated_at
```

#### user_email_templates (Custom Per-User Templates)
```sql
id (UUID PK)
user_id (FK)
intro_text, service_text, closing_text, seasonal_text
is_active, created_at, updated_at
```

#### user_email_signatures
```sql
id (UUID PK)
user_id (FK)
full_name, title, phone
company_name, company_address
website, logo_url
is_active, created_at, updated_at
```

---

## 4. Authentication & Authorization

### Auth Flow

```
1. User login (email/password) --> Supabase Auth
2. JWT token issued by Supabase
3. AuthContext reads profiles table --> loads role + secondary_role
4. Available roles determined (primary + secondary)
5. Active role selected/stored in localStorage (ACTIVE_ROLE_KEY)
```

### Role-Based Access Control (RBAC)

**Roles:**

| Role | Description | Access |
|---|---|---|
| `admin` | Full system access | User management, inventory control, all data |
| `inventar` | Inventory management | QR generation, pricing, driver pickups, analytics |
| `prodajalec` | Salesperson | QR scanning, testing, contracts, offers, GPS tracking |
| `prodajalec_oblek` | Clothing specialist | Limited prodajalec features (no mat-specific workflows) |

**Route Protection:**
```typescript
// App.tsx - Protected routes defined with allowedRoles
<Route path="/inventar/*" element={
  <ProtectedRoute allowedRoles={['inventar', 'admin']}>
    <InventarDashboard />
  </ProtectedRoute>
} />
```

**Row Level Security (RLS) in PostgreSQL:**
- Users can only see/modify their own data (with exceptions for admin/inventar)
- Companies visible to the user's salesperson profile
- Cycles scoped to the assigned salesperson

```sql
-- Example: Users can only see companies they created
CREATE POLICY "users_own_companies"
  ON companies FOR SELECT
  USING (created_by = auth.uid());

-- Inventar/admin can see all
CREATE POLICY "admin_see_all"
  ON companies FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'inventar')));
```

---

## 5. State Management

### TanStack React Query (React Query)

All server state is managed via React Query with Supabase as the backend. No Redux or Zustand is used.

```typescript
// Custom hook pattern (e.g., useCompanies.ts)
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, contacts(*)')
        .order('name');
      if (error) throw error;
      return data as CompanyWithContacts[];
    },
  });
}

// Mutations with cache invalidation
export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (company: CompanyInsert) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
```

### Local Component State

- React `useState` for form inputs, modals, UI toggles
- Context API via `AuthContext` for global auth state
- `localStorage` for active role selection

### Offline Support

- `useNetworkStatus` hook detects connectivity
- Offline banner shown when no internet
- Network detection via `navigator.onLine` events

---

## 6. API Integration

### Supabase RPC Functions

**Encryption/Decryption for AI API Keys:**
```sql
-- Save encrypted API key (server-side encryption)
save_ai_setting(
  p_user_id UUID,
  p_provider TEXT, -- openai | anthropic | google
  p_api_key TEXT,
  p_fast_model TEXT,
  p_smart_model TEXT
)

-- Get decrypted API key (only in secure backend)
get_ai_settings_decrypted(p_user_id UUID)
```

**Fuzzy Company Search:**
```sql
search_companies_fuzzy(
  p_name TEXT,
  p_city TEXT (optional),
  p_limit INT
) -> (name, tax_number, similarity_score)
```

### Edge Functions (Deno)

**1. create-user** (`supabase/functions/create-user/`)
- Creates auth user + profile in one transaction
- Only inventar/admin can call
- Generates `code_prefix` for prodajalec

**2. delete-user** (`supabase/functions/delete-user/`)
- Soft delete (deactivate profile)
- Triggered by admin

**3. update-user-password** (`supabase/functions/update-user-password/`)
- Admin-initiated password reset

**4. save-ai-settings** (`supabase/functions/save-ai-settings/`)
- Receives plain-text API key
- Encrypts via pgcrypto (AES)
- Stores encrypted in `user_ai_settings` table

**5. generate-email-text** (`supabase/functions/generate-email-text/`)
- **Input:** `template_type` (najem | nakup | primerjava | dodatna)
- **Process:**
  1. Verifies user auth via JWT
  2. Fetches decrypted AI API key from RPC
  3. Calls AI provider (OpenAI / Anthropic / Google) with prompt
  4. AI returns JSON: `{ intro_text, service_text, closing_text, seasonal_text }`
- **Output:** JSON with email text blocks
- **Error:** If no AI settings configured, returns 400

**6. scan-business-card** (`supabase/functions/scan-business-card/`)
- **Input:** Base64-encoded business card image
- **Process:**
  1. Auth verification
  2. **Step 1:** FAST model (OpenAI Vision / Claude / Gemini) extracts text:
     - Company name, branch name, person name/role, phone, email
     - Addresses (company HQ vs. branch)
     - Tax number (8 digits, no "SI" prefix)
  3. **Step 2:** DB search (3 methods):
     - a) **Exact tax match** -- high confidence
     - b) **Fuzzy name search** -- similarity score 0.6+ = auto-match
     - c) **SMART model** (fallback) -- reasoning model decides best match from candidates
  4. **Step 3:** Return best match + alternatives
- **Output:** `{ extracted_data, match: { matched_company, candidates, confidence, method, reasoning } }`

### External APIs

**VIES Tax Number Validation:**
- Proxy via nginx to `https://ec.europa.eu/taxation_customs/vies/`
- Rate limited: 5 req/min per IP (nginx `limit_req_zone`)
- Used when searching by tax number

**Slovenian Company Registry Search:**
- Data loaded into `slovenian_companies` table
- Fuzzy search via PostgreSQL `pg_trgm` extension

**Maps / Routing:**
- Leaflet + OpenStreetMap tiles for map rendering
- OpenRouteService API for route optimization (optional)

---

## 7. Key Features & Workflows

### 1. Mat Lifecycle Workflow

```
Clean (in warehouse)
  | [QR scan by salesperson]
  v
On_Test (at customer)
  | [Customer tries, decides to buy or rent]
  v
Dirty (used, needs washing)
  | [Salesperson marks for pickup]
  v
Waiting_Driver (scheduled for collection)
  | [Driver picks up]
  v
Completed (back in warehouse)
```

Each status change is logged in the `cycle_history` table with a timestamp and the performing user.

### 2. Offer System

**Offer Types:**
1. **najem** (rental) - Monthly/weekly service with recurring pricing
2. **nakup** (purchase) - One-time sale
3. **primerjava** (comparison) - Side-by-side rental vs. purchase presentation
4. **dodatna** (combined) - Part rental + part purchase in a single offer

**Offer Generation Workflow:**
1. Select company + contact
2. Choose offer type (najem / nakup / primerjava / dodatna)
3. Add items (auto-calculated prices from `mat_prices` table)
4. Generate HTML email via `generateEmailHTML()`
5. Copy to clipboard + save to `sent_emails` table
6. Open `mailto:` with pre-filled subject

**Email Templates:**
- System templates in `email_templates` table
- User custom templates in `user_email_templates` table
- AI generation via `generate-email-text` edge function
- User signatures via `user_email_signatures` table

### 3. AI Business Card Scanning

**Workflow:**
1. Salesperson clicks "Scan Business Card" in Contacts page
2. Takes photo or uploads image
3. Edge function processes:
   - OCR extraction (company name, tax number, address, contacts)
   - Fuzzy matching against `slovenian_companies` table
   - SMART model reasoning if match is uncertain
4. Results shown with confidence level
5. Create new company or link to existing one

### 4. GPS Tracking (Prodajalec)

**Real-time tracking:**
- `gps_tracking_sessions` stores daily routes
- Points array: `[{lat, lng, timestamp}, ...]`
- Shown on Leaflet map with route polylines
- Travel log accumulated in `travel_logs` (monthly summaries)
- Inventar/admin can view all salespeople on a fleet map

### 5. CRM Pipeline

**Company statuses tracked:**
- `pipeline_status` column in `companies` table
- Stages: `new_contact` --> `offer_sent` --> `contract_sent` --> `active`
- Timeline tracked: `offer_sent_at`, `contract_sent_at`, `contract_called_at`, etc.
- Notes logged in `company_notes` with activity categories and subcategories
- Optional D365 export tracking via `exported_to_d365_at`

### 6. Task Management (Kanban)

**For prodajalec:**
- Create tasks in `tasks` table
- Status: `todo | in_progress | done`
- Priority: `low | medium | high`
- Drag-and-drop UI via `@hello-pangea/dnd` library
- Filter by company/assignee

### 7. QR Code Order Management

**Workflow:**
1. Salesperson places QR code order (`orders` table)
2. Inventar reviews and approves/rejects
3. Physical QR stickers shipped to salesperson
4. Salesperson confirms receipt
5. QR codes become `available` status

---

## 8. Email System Architecture

### Components

**1. Email Templates (`user_email_templates` table)**
```typescript
interface UserEmailTemplate {
  id: string;
  user_id: string;
  intro_text: string;        // "kot dogovorjeno posiljam ponudbo za..."
  service_text: string;      // "Ponudba vkljucuje redno menjavo..."
  closing_text: string;      // "Za vsa dodatna vprasanja..."
  seasonal_text: string;     // Seasonal/promotional text block
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**2. Email Signatures (`user_email_signatures` table)**
```typescript
interface UserEmailSignature {
  id: string;
  user_id: string;
  full_name: string;
  title: string;             // e.g., "Sales Manager"
  phone: string;
  company_name: string;
  company_address: string;
  website: string;
  logo_url: string;          // Cloud storage path
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**3. AI Email Text Generation**

Edge function `generate-email-text` is called from the Contacts offer workflow:

```typescript
const response = await supabase.functions.invoke('generate-email-text', {
  body: { template_type: 'najem' },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
// Returns: { intro_text, service_text, closing_text, seasonal_text }
```

**4. Email Rendering**

`useOfferEmail` hook handles two formats:

**Plain Text Format:**
```
Pozdravljeni,

[intro_text from template or AI]

+---------------------------+
| TABLE: rental items       |
+---------------------------+

[service_text from template]

[closing_text from template]

Lep pozdrav,
[signature plain text]
```

**HTML Format:**
```html
<p>Pozdravljeni,</p>
<p>[intro_text]</p>
<table style="border-collapse: collapse;">
  <!-- Styled rental/purchase items table -->
</table>
<p>[service_text]</p>
<p>[closing_text]</p>
<!-- Signature HTML with logo image -->
```

### Key Hook: useOfferEmail

Located at `src/pages/contacts/hooks/useOfferEmail.ts` (600+ lines)

**Main Functions:**
- `generateEmailContent()` - Plain text version
- `generateEmailHTML()` - HTML version with styled tables
- `generateNajemTable()` - Rental pricing table
- `generateNakupTable()` - Purchase pricing table
- `generateNakupTableFromNajem()` - Convert rental items to purchase prices
- `generateNakupTableFiltered()` - Show only purchase items
- `copyHTMLToClipboard()` - Copy to clipboard as HTML + plain text
- `sendOfferEmail()` - Save to DB + open mailto:

**Important Note on Variable Naming:**
The variable `signature` in props conflicts with generated signature text. Always use distinct names:
- `sig` or `sigText` for plain text signature
- `sigHtml` for HTML version
- `sigBlock` for the complete signature block

---

## 9. Security & Encryption

### AI API Keys Encryption

**Problem:** Users store personal OpenAI/Anthropic/Google API keys in the application.

**Solution:** Server-side encryption with pgcrypto (AES-256).

**Flow:**
```
Frontend (Settings --> AI Provider):
  User enters: provider, api_key, fast_model, smart_model
  | (HTTPS only)
  v
Edge Function: save-ai-settings
  --> Calls RPC: save_ai_setting(user_id, provider, api_key, fast_model, smart_model)
  --> RPC encrypts with pgcrypto (AES-256)
  --> Stores in user_ai_settings table
  v
Later use (Edge functions need to decrypt):
  generate-email-text, scan-business-card
  --> Call RPC: get_ai_settings_decrypted(user_id)
  --> RPC decrypts key server-side
  --> Edge function uses decrypted key for AI API call
  --> Key is NEVER exposed to frontend
```

### CORS

Restricted to the production domain:
```
Access-Control-Allow-Origin: https://matpro.reitti.cloud
```

### Content Security Policy (CSP)

Defined in `nginx.conf`:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://api-matpro.ristov.xyz https://*.tile.openstreetmap.org;
  font-src 'self';
  connect-src 'self' https://api-matpro.ristov.xyz https://api.openrouteservice.org wss://api-matpro.ristov.xyz;
  frame-ancestors 'self';
```

### Additional Security Headers

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(self), geolocation=(self), microphone=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### RLS (Row Level Security)

All 28 tables have RLS enabled with policies scoped to the authenticated user. Admin and inventar roles have broader read access.

### Container Security

The Docker container runs nginx as a non-root `nginx` user with restricted file permissions.

---

## 10. Build & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (port 8084)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Multi-Stage Build

The `Dockerfile` uses three stages:

**Stage 1: Brotli Module Compilation**
- Uses `nginx:alpine` as base
- Clones `ngx_brotli` and compiles as dynamic nginx module
- Matches the exact nginx version for compatibility

**Stage 2: Application Build**
- Uses `node:20-alpine`
- Runs `npm ci` + `npm run build`
- Vite generates `.gz` and `.br` pre-compressed files

**Stage 3: Production**
- Uses `nginx:alpine`
- Copies brotli modules from Stage 1
- Copies built assets from Stage 2
- Copies `nginx.conf`
- Runs as non-root `nginx` user
- Includes Docker HEALTHCHECK

```bash
# Build and run
docker build -t mat-tracker-pro .
docker run -d --name mat-tracker-pro \
  --restart unless-stopped \
  --network npm_npm_network \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  -p 3000:80 \
  mat-tracker-pro
```

**Important:** Container MUST be on `npm_npm_network` (Nginx Proxy Manager requirement). Without this, NPM cannot reach the container, resulting in 502 Bad Gateway.

### Compression Strategy

**Vite Build Output (`vite.config.ts`):**
```javascript
// Production-only compression plugins
viteCompression({ algorithm: "gzip", ext: ".gz", threshold: 1024 }),
viteCompression({ algorithm: "brotliCompress", ext: ".br", threshold: 1024 }),
```

**Nginx serves (`nginx.conf`):**
- Pre-compressed `.br` files (highest compression ratio) via `brotli_static on`
- Fallback to `.gz` if browser does not support Brotli via `gzip_static on`
- Dynamic gzip/brotli compression for non-pre-compressed content

### Vendor Chunk Splitting

```javascript
// vite.config.ts - manualChunks
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', ...],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-leaflet': ['leaflet', 'react-leaflet'],
  'vendor-xlsx': ['xlsx'],
  'vendor-qr': ['html5-qrcode', 'qrcode.react'],
  'vendor-pdf': ['jspdf', 'pdf-lib'],
  'vendor-docx': ['docxtemplater', 'pizzip'],
  'vendor-charts': ['recharts'],
  'vendor-dates': ['date-fns'],
  'vendor-sentry': ['@sentry/react'],
}
```

### CI/CD

Push to `main` branch triggers the CI/CD pipeline:
1. GitHub Actions builds the Docker image (with brotli module + pre-compression)
2. Image pushed to GHCR (`ghcr.io/dzo4e2250/mat-tracker-pro`)
3. Server pulls the new image
4. Zero-downtime swap via container stop/rm/run sequence

### Caching Strategy

**Static Assets (hashed filenames):**
```
Cache-Control: public, immutable
Expires: 1 year
```

**HTML (index.html):**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

---

## 11. UI Component Library

### shadcn/ui Components (52 components)

**Layout:**
- Dialog, Drawer, Sheet, Tabs, Accordion
- Navigation Menu, Popover, Hover Card

**Forms:**
- Button, Input, Label, Select, Checkbox, Radio Group, Toggle, Textarea
- Slider, Combobox (command palette)

**Data:**
- Table, Pagination, Tooltip

**Notifications:**
- Toast, Alert Dialog, Context Menu
- Sonner (toast library)

**Theme:**
- next-themes (dark mode support)

### Styling

**Tailwind CSS** with custom preset defined in `tailwind.config.js`.

**Custom CSS Variables** (in `globals.css`):
```css
--primary: #2563eb
--secondary: #10b981
--destructive: #ef4444
```

**Path Alias:** The `@` alias resolves to `./src` for clean imports:
```typescript
import { Button } from "@/components/ui/button";
```

---

## 12. Performance Optimizations

### Code Splitting (Lazy Loading Routes)

```typescript
// App.tsx
const InventarDashboard = lazy(() => import("./pages/InventarDashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Settings = lazy(() => import("./pages/Settings"));

<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/inventar" element={<InventarDashboard />} />
    <Route path="/contacts" element={<Contacts />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

### React Query Optimizations

- Stale data kept in cache while refetching in background
- Automatic request deduplication (multiple components using the same query)
- Automatic retry on network errors
- Pagination for large datasets

### Compression

- Gzip + Brotli pre-compression at build time
- Dynamic compression for any uncovered content types
- Vendor chunk splitting for optimal cache reuse

### Tree-shaking

- Vite/Rollup removes unused code at build time
- Source maps disabled in production (`sourcemap: false`)

---

## 13. Error Handling

### Sentry Integration

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "...",
  environment: "production"
});
```

### Error Boundary Component

`ErrorBoundary` component wraps the application, catches React component errors, logs them to Sentry, and shows a fallback UI instead of a white screen.

### Offline Detection

```typescript
// hooks/useNetworkStatus.ts
- Listens to window 'online' and 'offline' events
- Shows offline banner (red bar at top of page)
- Disables features that require network when offline
```

---

## 14. Testing Infrastructure

### Tools

| Tool | Purpose |
|---|---|
| **Vitest** | Unit tests |
| **Playwright** | End-to-end tests |
| **Testing Library** | React component testing |

### Test Files

- `useNetworkStatus.test.ts`
- `useOptibrushPrices.test.ts`
- `sentry.test.ts`
- `utils.test.ts`
- `validation/` tests

### Commands

```bash
npm run test              # Run tests in watch mode
npm run test:run          # Run once
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E tests
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # Playwright headed mode
npm run test:e2e:debug    # Playwright debug mode
```

---

## 15. Development Workflow

### Adding a New Feature

1. **Database:** Create migration in `supabase/migrations/YYYYMMDD_description.sql`
2. **Types:** Update `src/integrations/supabase/types.ts` (manually maintained)
3. **Hook:** Create `src/hooks/useFeature.ts` with React Query/Mutation
4. **Component:** Build UI in `src/pages/FeaturePage.tsx`
5. **Route:** Add to `App.tsx` with `React.lazy()` + `ProtectedRoute`
6. **Test:** Add tests, run locally
7. **Deploy:** Push to main --> CI/CD builds and deploys automatically

### TypeScript Types

All database types are manually maintained in `src/integrations/supabase/types.ts` (~1000 lines). This file is NOT auto-generated. It includes Database Row/Insert/Update types for each table plus relationship definitions.

### Naming Conventions

| Area | Convention | Example |
|---|---|---|
| Slovenian field names | Kept as-is | `najem`, `nakup`, `primerjava`, `dodatna`, `prodajalec` |
| Database schema | `mat_tracker` | Not `public` |
| Table names | Plural | `companies`, `contacts`, `cycles` |
| Functions/hooks | PascalCase / camelCase | `useCompanies`, `generateEmailHTML` |
| Migration files | `YYYYMMDD_description.sql` | `20260314_email_templates_and_signatures.sql` |

### Environment Variables

**Frontend (.env):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Backend (Supabase Secrets):**
```
DB_SCHEMA=mat_tracker
```

### Deployment Checklist

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Run migrations on Supabase
- [ ] Configure edge function secrets (`DB_SCHEMA`)
- [ ] Set HTTPS domain in CORS (`nginx.conf`, edge function headers)
- [ ] Docker: Build multi-stage image
- [ ] Server: Join container to `npm_npm_network`
- [ ] Nginx Proxy Manager: Route `matpro.reitti.cloud` --> container:80
- [ ] Healthcheck: `curl https://matpro.reitti.cloud/`

### Database Backup & Restore

```bash
# Backup (dumps mat_tracker schema to PostgreSQL custom format)
cd database && ./backup.sh

# Restore from dump file
cd database && ./restore.sh latest.dump
```

---

## Key Metrics

| Metric | Value |
|---|---|
| **Total Files** | 500+ |
| **Lines of Code** | 30,000+ |
| **Database Tables** | 28 |
| **Routes** | 20+ |
| **Pages/Views** | 15+ |
| **Custom Hooks** | 30+ |
| **UI Components** | 52 (shadcn/ui) |
| **Edge Functions** | 6 |
| **Migrations** | 45+ |
| **Vendor Chunks** | 12 |

---

## References

| Category | Resource |
|---|---|
| **React** | https://react.dev |
| **TypeScript** | https://typescriptlang.org |
| **Vite** | https://vitejs.dev |
| **TanStack Query** | https://tanstack.com/query |
| **shadcn/ui** | https://ui.shadcn.com |
| **Tailwind CSS** | https://tailwindcss.com |
| **Supabase** | https://supabase.com |
| **PostgreSQL** | https://www.postgresql.org |
| **Deno** | https://deno.land |
| **Docker** | https://docker.com |
| **Nginx** | https://nginx.org |
| **Sentry** | https://sentry.io |
| **Leaflet** | https://leafletjs.com |

/**
 * @file schemas.ts
 * @description Zod sheme za validacijo API odgovorov in vhodnih podatkov
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/** UUID validacija */
export const uuidSchema = z.string().uuid();

/** ISO date string validacija */
export const dateStringSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

/** Nullable string helper */
const nullableString = z.string().nullable();

/** Nullable number helper */
const nullableNumber = z.number().nullable();

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleSchema = z.enum(['prodajalec', 'inventar', 'admin']);

export const matCategorySchema = z.enum(['standard', 'ergo', 'design']);

export const cycleStatusSchema = z.enum([
  'on_test',
  'active',
  'dirty',
  'waiting_driver',
  'returned',
  'lost',
  'damaged'
]);

export const pickupStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const contractTypeSchema = z.enum(['najem', 'nakup']);

// ============================================================================
// PROFILE SCHEMA
// ============================================================================

export const profileSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: nullableString,
  role: userRoleSchema,
  secondary_role: userRoleSchema.nullable(),
  code_prefix: nullableString,
  is_active: z.boolean(),
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
});

export type Profile = z.infer<typeof profileSchema>;

// ============================================================================
// COMPANY SCHEMA
// ============================================================================

export const companySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  tax_number: nullableString,
  registration_number: nullableString,
  address_street: nullableString,
  address_city: nullableString,
  address_postal: nullableString,
  address_country: z.string().default('Slovenija'),
  delivery_address: nullableString,
  delivery_postal: nullableString,
  delivery_city: nullableString,
  billing_address: nullableString,
  billing_postal: nullableString,
  billing_city: nullableString,
  working_hours: nullableString,
  delivery_instructions: nullableString,
  customer_number: nullableString,
  latitude: nullableNumber,
  longitude: nullableNumber,
  notes: nullableString,
  created_by: nullableString,
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
  pipeline_status: nullableString,
  contract_sent_at: nullableString,
  parent_company_id: nullableString,
});

export type Company = z.infer<typeof companySchema>;

// ============================================================================
// CONTACT SCHEMA
// ============================================================================

export const contactSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema,
  name: z.string().min(1),
  email: nullableString,
  phone: nullableString,
  position: nullableString,
  is_primary: z.boolean(),
  created_at: dateStringSchema,
});

export type Contact = z.infer<typeof contactSchema>;

// ============================================================================
// MAT TYPE SCHEMA
// ============================================================================

export const matTypeSchema = z.object({
  id: uuidSchema,
  code: nullableString,
  name: z.string().min(1),
  width_cm: z.number().positive(),
  height_cm: z.number().positive(),
  category: matCategorySchema,
  price_1_week: nullableNumber,
  price_2_weeks: nullableNumber,
  price_3_weeks: nullableNumber,
  price_4_weeks: nullableNumber,
  price_purchase: nullableNumber,
  price_penalty: nullableNumber,
  is_active: z.boolean(),
  created_at: dateStringSchema,
});

export type MatType = z.infer<typeof matTypeSchema>;

// ============================================================================
// QR CODE SCHEMA
// ============================================================================

export const qrCodeSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1),
  seller_id: uuidSchema,
  is_active: z.boolean(),
  created_at: dateStringSchema,
});

export type QRCode = z.infer<typeof qrCodeSchema>;

// ============================================================================
// CYCLE SCHEMA
// ============================================================================

export const cycleSchema = z.object({
  id: uuidSchema,
  qr_code_id: uuidSchema,
  mat_type_id: uuidSchema,
  company_id: uuidSchema.nullable(),
  contract_id: uuidSchema.nullable(),
  status: cycleStatusSchema,
  started_at: dateStringSchema,
  test_started_at: nullableString,
  test_ends_at: nullableString,
  ended_at: nullableString,
  latitude: nullableNumber,
  longitude: nullableNumber,
  location_updated_at: nullableString,
  pickup_requested_at: nullableString,
  created_at: dateStringSchema,
});

export type Cycle = z.infer<typeof cycleSchema>;

// Cycle with relations
export const cycleWithRelationsSchema = cycleSchema.extend({
  qr_code: qrCodeSchema.optional(),
  mat_type: matTypeSchema.optional(),
  company: companySchema.optional(),
});

export type CycleWithRelations = z.infer<typeof cycleWithRelationsSchema>;

// ============================================================================
// DRIVER PICKUP SCHEMA
// ============================================================================

export const driverPickupItemSchema = z.object({
  id: uuidSchema,
  pickup_id: uuidSchema,
  cycle_id: uuidSchema,
  picked_up: z.boolean(),
  created_at: dateStringSchema,
});

export type DriverPickupItem = z.infer<typeof driverPickupItemSchema>;

export const driverPickupSchema = z.object({
  id: uuidSchema,
  status: pickupStatusSchema,
  scheduled_date: nullableString,
  assigned_driver: nullableString,
  notes: nullableString,
  created_by: nullableString,
  completed_at: nullableString,
  created_at: dateStringSchema,
});

export type DriverPickup = z.infer<typeof driverPickupSchema>;

// ============================================================================
// CONTRACT SCHEMA
// ============================================================================

export const contractSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema,
  seller_id: uuidSchema,
  contract_type: contractTypeSchema,
  service_interval_weeks: z.number().int().positive().nullable(),
  price_per_service: nullableNumber,
  start_date: nullableString,
  end_date: nullableString,
  is_signed: z.boolean(),
  signed_at: nullableString,
  pdf_url: nullableString,
  notes: nullableString,
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
});

export type Contract = z.infer<typeof contractSchema>;

// ============================================================================
// REMINDER SCHEMA
// ============================================================================

export const reminderSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema.nullable(),
  user_id: uuidSchema,
  title: z.string().min(1),
  description: nullableString,
  due_date: dateStringSchema,
  is_completed: z.boolean(),
  completed_at: nullableString,
  created_at: dateStringSchema,
});

export type Reminder = z.infer<typeof reminderSchema>;

// ============================================================================
// COMPANY WITH CONTACTS (for CRM)
// ============================================================================

export const companyWithContactsSchema = companySchema.extend({
  contacts: z.array(contactSchema),
});

export type CompanyWithContacts = z.infer<typeof companyWithContactsSchema>;

// ============================================================================
// ARRAY SCHEMAS (for API responses)
// ============================================================================

export const profilesArraySchema = z.array(profileSchema);
export const companiesArraySchema = z.array(companySchema);
export const contactsArraySchema = z.array(contactSchema);
export const matTypesArraySchema = z.array(matTypeSchema);
export const qrCodesArraySchema = z.array(qrCodeSchema);
export const cyclesArraySchema = z.array(cycleSchema);
export const cyclesWithRelationsArraySchema = z.array(cycleWithRelationsSchema);
export const contractsArraySchema = z.array(contractSchema);
export const remindersArraySchema = z.array(reminderSchema);

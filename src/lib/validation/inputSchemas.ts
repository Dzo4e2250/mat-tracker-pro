/**
 * @file inputSchemas.ts
 * @description Zod sheme za validacijo uporabniških vnosov (forme, mutacije)
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/** Slovenian phone number - flexible format */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s+\-()]{6,20}$/, 'Neveljavna telefonska številka')
  .or(z.literal(''))
  .optional()
  .nullable();

/** Slovenian tax number (davčna številka) */
export const taxNumberSchema = z
  .string()
  .regex(/^SI?\d{8}$/, 'Neveljavna davčna številka (format: SI12345678)')
  .or(z.literal(''))
  .optional()
  .nullable();

/** Slovenian postal code */
export const postalCodeSchema = z
  .string()
  .regex(/^\d{4}$/, 'Neveljavna poštna številka (4 števke)')
  .or(z.literal(''))
  .optional()
  .nullable();

/** Safe string - no script tags or dangerous characters */
export const safeStringSchema = z
  .string()
  .refine(
    (val) => !/<script|javascript:|on\w+=/i.test(val),
    'Neveljaven vnos - prepovedani znaki'
  );

/** Non-empty trimmed string */
export const requiredStringSchema = z
  .string()
  .min(1, 'Polje je obvezno')
  .transform((val) => val.trim());

// ============================================================================
// COMPANY INPUT SCHEMA
// ============================================================================

export const createCompanyInputSchema = z.object({
  name: requiredStringSchema.pipe(safeStringSchema),
  display_name: safeStringSchema.optional().nullable(),
  tax_number: taxNumberSchema,
  address_street: safeStringSchema.max(200).optional().nullable(),
  address_postal: postalCodeSchema,
  address_city: safeStringSchema.max(100).optional().nullable(),
  delivery_address: safeStringSchema.max(200).optional().nullable(),
  delivery_postal: postalCodeSchema,
  delivery_city: safeStringSchema.max(100).optional().nullable(),
  billing_address: safeStringSchema.max(200).optional().nullable(),
  billing_postal: postalCodeSchema,
  billing_city: safeStringSchema.max(100).optional().nullable(),
  working_hours: safeStringSchema.max(100).optional().nullable(),
  delivery_instructions: safeStringSchema.max(500).optional().nullable(),
  customer_number: safeStringSchema.max(50).optional().nullable(),
  notes: safeStringSchema.max(1000).optional().nullable(),
  pipeline_status: z.enum(['prospect', 'contacted', 'meeting', 'offer_sent', 'negotiation', 'won', 'lost']).optional().nullable(),
  parent_company_id: z.string().uuid().optional().nullable(),
});

export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

export const updateCompanyInputSchema = createCompanyInputSchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanyInputSchema>;

// ============================================================================
// CONTACT INPUT SCHEMA
// ============================================================================

export const createContactInputSchema = z.object({
  first_name: requiredStringSchema.pipe(safeStringSchema).pipe(z.string().max(100)),
  last_name: safeStringSchema.max(100).optional().default(''),
  phone: phoneSchema,
  email: z.string().email('Neveljaven email naslov').or(z.literal('')).optional().nullable(),
  role: safeStringSchema.max(100).optional().nullable(),
  is_primary: z.boolean().optional().default(false),
  is_billing_contact: z.boolean().optional().default(false),
  is_service_contact: z.boolean().optional().default(false),
  contact_since: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  location_address: safeStringSchema.max(200).optional().nullable(),
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = createContactInputSchema.partial();
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

// ============================================================================
// CYCLE INPUT SCHEMA
// ============================================================================

export const createCycleInputSchema = z.object({
  qr_code_id: z.string().uuid('Neveljavna QR koda'),
  mat_type_id: z.string().uuid('Neveljaven tip predpražnika'),
  company_id: z.string().uuid('Neveljavno podjetje').optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  status: z.enum(['on_test', 'active', 'dirty', 'waiting_driver', 'returned', 'lost', 'damaged']).default('on_test'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export type CreateCycleInput = z.infer<typeof createCycleInputSchema>;

export const updateCycleInputSchema = createCycleInputSchema.partial();
export type UpdateCycleInput = z.infer<typeof updateCycleInputSchema>;

// ============================================================================
// DRIVER PICKUP INPUT SCHEMA
// ============================================================================

export const createPickupInputSchema = z.object({
  cycle_ids: z.array(z.string().uuid()).min(1, 'Izberi vsaj en predpražnik'),
  assigned_driver: safeStringSchema.max(100).optional().nullable(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Neveljaven datum').optional().nullable(),
  notes: safeStringSchema.max(500).optional().nullable(),
});

export type CreatePickupInput = z.infer<typeof createPickupInputSchema>;

// ============================================================================
// CONTRACT INPUT SCHEMA
// ============================================================================

export const createContractInputSchema = z.object({
  company_id: z.string().uuid('Neveljavno podjetje'),
  contract_type: z.enum(['najem', 'nakup'], { errorMap: () => ({ message: 'Izberi tip pogodbe' }) }),
  service_interval_weeks: z.number().int().min(1).max(8).optional().nullable(),
  price_per_service: z.number().min(0).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: safeStringSchema.max(1000).optional().nullable(),
});

export type CreateContractInput = z.infer<typeof createContractInputSchema>;

// ============================================================================
// QR CODE INPUT SCHEMA
// ============================================================================

export const createQRCodesInputSchema = z.object({
  count: z.number().int().min(1).max(100, 'Največ 100 kod naenkrat'),
  prefix: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, 'Prefix lahko vsebuje samo velike črke in številke'),
});

export type CreateQRCodesInput = z.infer<typeof createQRCodesInputSchema>;

// ============================================================================
// REMINDER INPUT SCHEMA
// ============================================================================

export const createReminderInputSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  title: requiredStringSchema.pipe(safeStringSchema).pipe(z.string().max(200)),
  description: safeStringSchema.max(1000).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Neveljaven datum'),
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;

// ============================================================================
// LOGIN INPUT SCHEMA
// ============================================================================

export const loginInputSchema = z.object({
  email: z.string().email('Neveljaven email naslov'),
  password: z.string().min(6, 'Geslo mora imeti vsaj 6 znakov'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// ============================================================================
// SEARCH/FILTER SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const searchInputSchema = z.object({
  query: safeStringSchema.max(100).optional(),
  ...paginationSchema.shape,
});

export type SearchInput = z.infer<typeof searchInputSchema>;

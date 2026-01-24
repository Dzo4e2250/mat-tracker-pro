/**
 * @file validate.ts
 * @description Utility funkcije za validacijo API odgovorov z Zod
 */

import { z } from 'zod';

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationError {
  success: false;
  error: z.ZodError;
  data: null;
}

type SafeParseResult<T> = ValidationResult<T> | ValidationError;

/**
 * Varno parsira podatke z Zod shemo.
 * V primeru napake vrne null in logira napako (samo v dev načinu).
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T | null {
  const result = schema.safeParse(data);

  if (!result.success) {
    if (import.meta.env.DEV) {
      console.warn(
        `[Validation Error]${context ? ` ${context}:` : ''}`,
        result.error.flatten()
      );
    }
    return null;
  }

  return result.data;
}

/**
 * Parsira podatke z Zod shemo.
 * Vrne SafeParseResult z success/error informacijo.
 */
export function validateWithResult<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): SafeParseResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      data: null,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Parsira array podatkov in vrne samo veljavne elemente.
 * Neveljavni elementi so filtrirani in logirani.
 */
export function validateArray<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown[],
  context?: string
): T[] {
  const validItems: T[] = [];
  const invalidIndices: number[] = [];

  data.forEach((item, index) => {
    const result = itemSchema.safeParse(item);
    if (result.success) {
      validItems.push(result.data);
    } else {
      invalidIndices.push(index);
    }
  });

  if (invalidIndices.length > 0 && import.meta.env.DEV) {
    console.warn(
      `[Validation Warning]${context ? ` ${context}:` : ''} ${invalidIndices.length} invalid items at indices:`,
      invalidIndices
    );
  }

  return validItems;
}

/**
 * Strogo parsira podatke - vrže napako če validacija ne uspe.
 * Uporabi samo ko si 100% prepričan da so podatki veljavni.
 */
export function strictValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = errorMessage || 'Validation failed';
    throw new Error(`${message}: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Validira Supabase odgovor in vrne podatke ali null.
 * Avtomatsko handla Supabase error in null data.
 */
export function validateSupabaseResponse<T>(
  schema: z.ZodSchema<T>,
  response: { data: unknown; error: Error | null },
  context?: string
): T | null {
  if (response.error) {
    if (import.meta.env.DEV) {
      console.error(`[Supabase Error]${context ? ` ${context}:` : ''}`, response.error);
    }
    return null;
  }

  if (response.data === null) {
    return null;
  }

  return safeValidate(schema, response.data, context);
}

/**
 * Ustvari hook-friendly validator za React Query.
 * Vrne funkcijo ki jo lahko uporabiš v select opciji.
 */
export function createQueryValidator<T>(
  schema: z.ZodSchema<T>,
  context?: string
) {
  return (data: unknown): T | null => safeValidate(schema, data, context);
}

/**
 * @file index.ts
 * @description Data Access Layer - centraliziran pristop do baze
 *
 * Uporaba:
 * ```typescript
 * import { companyRepository, contactRepository, cycleRepository } from '@/lib/dao';
 *
 * // Namesto direktnih Supabase klicev:
 * const companies = await companyRepository.findByUserWithStats(userId);
 * const contact = await contactRepository.findWithCompany(contactId);
 * const cycles = await cycleRepository.findActiveBySalesperson(userId);
 * ```
 *
 * Prednosti:
 * - Type-safe operacije
 * - Enostavno mockanje v testih
 * - Centralizirana obravnava napak
 * - Možnost zamenjave baze brez spreminjanja poslovne logike
 */

// Base
export { BaseRepository, RepositoryError, type QueryOptions, type PaginatedResult } from './BaseRepository';

// Repositories
export { CompanyRepository, companyRepository, type CompanyWithRelations, type CompanySearchOptions } from './CompanyRepository';
export { ContactRepository, contactRepository, type ContactWithCompany, type CreateContactData } from './ContactRepository';
export { CycleRepository, cycleRepository, type CycleWithRelations, type CycleStatus, type CycleStats } from './CycleRepository';

/**
 * Factory za ustvarjanje custom repozitorijev
 *
 * @example
 * ```typescript
 * import { createRepository } from '@/lib/dao';
 * import type { MyEntity } from '@/types';
 *
 * const myRepository = createRepository<MyEntity>('my_table');
 * const items = await myRepository.findAll();
 * ```
 */
export function createRepository<T extends { id: string }>(tableName: string) {
  return new BaseRepository<T>(tableName);
}

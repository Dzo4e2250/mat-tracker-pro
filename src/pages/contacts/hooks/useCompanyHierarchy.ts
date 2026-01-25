/**
 * @file useCompanyHierarchy.ts
 * @description Hook za izračun hierarhije podjetij (parent/child relacije)
 */

import { useMemo } from 'react';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

export interface HierarchyInfo {
  parentCompany?: { id: string; name: string; display_name?: string };
  childrenCount: number;
}

export function useCompanyHierarchy(companies: CompanyWithContacts[] | undefined) {
  return useMemo(() => {
    if (!companies) return new Map<string, HierarchyInfo>();

    const childrenCountMap = new Map<string, number>();
    companies.forEach(company => {
      if (company.parent_company_id) {
        const count = childrenCountMap.get(company.parent_company_id) || 0;
        childrenCountMap.set(company.parent_company_id, count + 1);
      }
    });

    const hierarchyMap = new Map<string, HierarchyInfo>();
    companies.forEach(company => {
      const parentCompany = company.parent_company_id
        ? companies.find(c => c.id === company.parent_company_id)
        : undefined;

      hierarchyMap.set(company.id, {
        parentCompany: parentCompany ? {
          id: parentCompany.id,
          name: parentCompany.name,
          display_name: parentCompany.display_name || undefined,
        } : undefined,
        childrenCount: childrenCountMap.get(company.id) || 0,
      });
    });

    return hierarchyMap;
  }, [companies]);
}

/**
 * @file useContactsFilters.ts
 * @description Hook za filtriranje, sortiranje in iskanje strank
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { FilterType, SortByType, PeriodFilterType, isTestOverdue } from '../types';

interface UseContactsFiltersProps {
  companies: CompanyWithContacts[] | undefined;
  noInterestCompanyIds: Set<string> | undefined;
}

interface UseContactsFiltersReturn {
  // State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortByType;
  setSortBy: (sort: SortByType) => void;
  periodFilter: PeriodFilterType;
  setPeriodFilter: (filter: PeriodFilterType) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  hideNoInterest: boolean;
  setHideNoInterest: (hide: boolean) => void;

  // Recent companies
  recentCompanyIds: string[];
  addToRecent: (companyId: string) => void;

  // Filtered results
  filteredCompanies: CompanyWithContacts[];

  // Alphabet navigation
  availableLetters: Set<string>;
  scrollToLetter: (letter: string) => void;
  getCompanyFirstLetter: (company: CompanyWithContacts) => string;
  firstCompanyForLetter: Map<string, string>;
}

export function useContactsFilters({
  companies,
  noInterestCompanyIds,
}: UseContactsFiltersProps): UseContactsFiltersReturn {
  // Filter state - debounced search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const [sortBy, setSortBy] = useState<SortByType>('name');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filter, setFilter] = useState<FilterType>('all');
  const [hideNoInterest, setHideNoInterest] = useState(true);

  // Recent companies (stored in localStorage)
  const [recentCompanyIds, setRecentCompanyIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recentCompanies');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Add company to recent when selected
  const addToRecent = useCallback((companyId: string) => {
    setRecentCompanyIds(prev => {
      const filtered = prev.filter(id => id !== companyId);
      const updated = [companyId, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem('recentCompanies', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Filtrira in sortira seznam podjetij
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];

    let filtered = [...companies];

    // Search filter - searches name, display_name, tax_number, city, address, phone
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(c => {
        // Company fields
        const matchesCompany =
          c.name.toLowerCase().includes(query) ||
          c.display_name?.toLowerCase().includes(query) ||
          c.tax_number?.toLowerCase().includes(query) ||
          c.address_city?.toLowerCase().includes(query) ||
          c.address_street?.toLowerCase().includes(query) ||
          (c as any).delivery_city?.toLowerCase().includes(query) ||
          (c as any).delivery_address?.toLowerCase().includes(query);

        // Contact fields
        const matchesContact = c.contacts?.some(contact =>
          `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.replace(/\s/g, '').includes(query.replace(/\s/g, ''))
        );

        return matchesCompany || matchesContact;
      });
    }

    // "Ni interesa" filter - skrij podjetja z to opombo
    if (hideNoInterest && noInterestCompanyIds && noInterestCompanyIds.size > 0) {
      filtered = filtered.filter(c => !noInterestCompanyIds.has(c.id));
    }

    // Period filter - based on contact_since field
    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date | null = null;

      switch (periodFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(c => {
        const contactsWithDate = c.contacts?.filter(contact => (contact as any).contact_since) || [];

        if (contactsWithDate.length > 0) {
          return contactsWithDate.some(contact => {
            const contactDate = new Date((contact as any).contact_since);
            if (endDate) {
              return contactDate >= startDate && contactDate <= endDate;
            }
            return contactDate >= startDate;
          });
        } else {
          const companyCreatedAt = new Date(c.created_at);
          if (endDate) {
            return companyCreatedAt >= startDate && companyCreatedAt <= endDate;
          }
          return companyCreatedAt >= startDate;
        }
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => (c.pipeline_status || 'new') === statusFilter);
    }

    // Existing contract filter
    if (filter !== 'all') {
      filtered = filtered.filter(company => {
        const hasSignedContract = company.cycles?.some((c: any) => c.contract_signed);
        const hasActiveCycle = company.cycles?.some((c: any) => c.status === 'on_test' || c.status === 'clean');
        const hasOverdueCycle = company.cycles?.some((c: any) => isTestOverdue(c));

        switch (filter) {
          case 'active':
            return hasActiveCycle;
          case 'signed':
            return hasSignedContract;
          case 'inactive':
            return !hasActiveCycle && !hasSignedContract;
          case 'overdue':
            return hasOverdueCycle;
          default:
            return true;
        }
      });
    }

    // Sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'sl'));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'status':
        const statusOrder = ['contract_signed', 'contract_sent', 'offer_sent', 'contacted', 'new'];
        filtered.sort((a, b) => {
          const aStatus = a.pipeline_status || 'new';
          const bStatus = b.pipeline_status || 'new';
          return statusOrder.indexOf(aStatus) - statusOrder.indexOf(bStatus);
        });
        break;
    }

    // Put recent companies at the top (only when not searching)
    if (!debouncedSearch && recentCompanyIds.length > 0) {
      const recent: CompanyWithContacts[] = [];
      const rest: CompanyWithContacts[] = [];

      filtered.forEach(company => {
        if (recentCompanyIds.includes(company.id)) {
          recent.push(company);
        } else {
          rest.push(company);
        }
      });

      recent.sort((a, b) => recentCompanyIds.indexOf(a.id) - recentCompanyIds.indexOf(b.id));

      return [...recent, ...rest];
    }

    return filtered;
  }, [companies, debouncedSearch, hideNoInterest, noInterestCompanyIds, periodFilter, statusFilter, filter, sortBy, recentCompanyIds]);

  // Pomožna funkcija za določitev prve črke podjetja
  const getCompanyFirstLetter = useCallback((company: CompanyWithContacts): string => {
    const name = (company.display_name || company.name || '').trim().toUpperCase();
    if (!name) return '#';
    const firstChar = name.charAt(0);
    if (firstChar === 'Č') return 'Č';
    if (firstChar === 'Š') return 'Š';
    if (firstChar === 'Ž') return 'Ž';
    if (!/[A-ZČŠŽ]/.test(firstChar)) return '#';
    return firstChar;
  }, []);

  // Abecedna navigacija - dostopne črke
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    filteredCompanies.forEach(company => {
      letters.add(getCompanyFirstLetter(company));
    });
    return letters;
  }, [filteredCompanies, getCompanyFirstLetter]);

  // Scroll to letter
  const scrollToLetter = useCallback((letter: string) => {
    const element = document.querySelector(`[data-first-letter="${letter}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Določi katera podjetja so prva za svojo črko
  const firstCompanyForLetter = useMemo(() => {
    const map = new Map<string, string>();
    filteredCompanies.forEach(company => {
      const letter = getCompanyFirstLetter(company);
      if (!map.has(letter)) {
        map.set(letter, company.id);
      }
    });
    return map;
  }, [filteredCompanies, getCompanyFirstLetter]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    periodFilter,
    setPeriodFilter,
    statusFilter,
    setStatusFilter,
    filter,
    setFilter,
    hideNoInterest,
    setHideNoInterest,

    // Recent companies
    recentCompanyIds,
    addToRecent,

    // Filtered results
    filteredCompanies,

    // Alphabet navigation
    availableLetters,
    scrollToLetter,
    getCompanyFirstLetter,
    firstCompanyForLetter,
  };
}

export default useContactsFilters;

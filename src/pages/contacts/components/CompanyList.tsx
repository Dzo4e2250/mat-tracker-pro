/**
 * @file CompanyList.tsx
 * @description Seznam podjetij z kartami
 */

import CompanyCard from './CompanyCard';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface HierarchyInfo {
  parentCompany?: { id: string; name: string; display_name?: string };
  childrenCount: number;
}

interface CompanyListProps {
  companies: CompanyWithContacts[];
  isLoading: boolean;
  searchQuery: string;
  recentCompanyIds: string[];
  selectionMode: boolean;
  selectedContacts: Set<string>;
  companiesWithReminders: Set<string>;
  companyHierarchy: Map<string, HierarchyInfo>;
  getCompanyFirstLetter: (company: CompanyWithContacts) => string;
  firstCompanyForLetter: Map<string, string>;
  onCompanyClick: (company: CompanyWithContacts) => void;
  onContactToggle: (contactId: string) => void;
  onAddReminder: (companyId: string) => void;
}

export function CompanyList({
  companies,
  isLoading,
  searchQuery,
  recentCompanyIds,
  selectionMode,
  selectedContacts,
  companiesWithReminders,
  companyHierarchy,
  getCompanyFirstLetter,
  firstCompanyForLetter,
  onCompanyClick,
  onContactToggle,
  onAddReminder,
}: CompanyListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Nalagam...</div>;
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchQuery ? 'Ni rezultatov iskanja' : 'Ni strank'}
      </div>
    );
  }

  return (
    <div className="space-y-3 pr-6">
      {companies.map(company => {
        const letter = getCompanyFirstLetter(company);
        const isFirstForLetter = firstCompanyForLetter.get(letter) === company.id;
        return (
          <div key={company.id} data-first-letter={isFirstForLetter ? letter : undefined}>
            <CompanyCard
              company={company}
              isRecent={recentCompanyIds.includes(company.id)}
              showRecentBadge={!searchQuery}
              selectionMode={selectionMode}
              selectedContacts={selectedContacts}
              hasReminder={companiesWithReminders.has(company.id)}
              hierarchyInfo={companyHierarchy.get(company.id)}
              onCompanyClick={() => onCompanyClick(company)}
              onContactToggle={onContactToggle}
              onAddReminder={() => onAddReminder(company.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * @file CompanyListRow.tsx
 * @description Kompaktna vrstica za desktop seznam strank (master-detail levi panel)
 */

import { memo } from 'react';
import { Phone, Bell, BellRing, User } from 'lucide-react';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface CompanyListRowProps {
  company: CompanyWithContacts;
  isSelected: boolean;
  hasReminder?: boolean;
  onClick: () => void;
}

function isTestOverdue(cycle: { status: string; test_start_date: string | null; contract_signed: boolean }): boolean {
  if (cycle.status !== 'on_test' || !cycle.test_start_date || cycle.contract_signed) return false;
  const start = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 14;
}

export default memo(function CompanyListRow({
  company,
  isSelected,
  hasReminder = false,
  onClick,
}: CompanyListRowProps) {
  const primaryContact = company.contacts.find(c => c.is_primary) || company.contacts[0];
  const hasOverdue = company.cycles?.some(c => isTestOverdue(c));
  const isOsnutek = company.pipeline_status === 'osnutek';

  const displayName = isOsnutek && primaryContact
    ? `${primaryContact.first_name} ${primaryContact.last_name}`
    : company.display_name || company.name;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-100 transition-colors ${
        isSelected
          ? 'bg-blue-50 border-l-3 border-l-blue-500'
          : 'hover:bg-gray-50'
      } ${hasOverdue ? 'border-l-3 border-l-red-400' : ''}`}
    >
      {/* Status indikator */}
      <div className="flex-shrink-0">
        {isOsnutek ? (
          <User size={16} className="text-amber-500" />
        ) : (
          <div className={`w-2.5 h-2.5 rounded-full ${
            company.cycleStats.signed > 0 ? 'bg-green-500' :
            company.cycleStats.onTest > 0 ? 'bg-blue-500' :
            company.cycleStats.offerSent ? 'bg-yellow-500' :
            'bg-gray-300'
          }`} />
        )}
      </div>

      {/* Ime in kontakt */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {displayName}
        </div>
        {primaryContact && !isOsnutek && (
          <div className="text-xs text-gray-500 truncate">
            {primaryContact.first_name} {primaryContact.last_name}
            {primaryContact.role ? ` · ${primaryContact.role}` : ''}
          </div>
        )}
        {isOsnutek && company.name && !company.name.startsWith('Osnutek:') && (
          <div className="text-xs text-gray-500 truncate">{company.name}</div>
        )}
      </div>

      {/* Telefon */}
      {primaryContact?.phone && (
        <a
          href={`tel:${primaryContact.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 text-blue-500 hover:text-blue-700 p-1"
          title={primaryContact.phone}
        >
          <Phone size={14} />
        </a>
      )}

      {/* Statusi */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {company.cycleStats.onTest > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
            {company.cycleStats.onTest}
          </span>
        )}
        {company.cycleStats.signed > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
            {company.cycleStats.signed}
          </span>
        )}
        {company.cycleStats.offerSent && (
          <span className="text-xs text-yellow-600">📨</span>
        )}
        {hasOverdue && (
          <span className="text-xs text-red-500 font-bold">!</span>
        )}
      </div>

      {/* Opomnik */}
      {hasReminder && (
        <BellRing size={14} className="flex-shrink-0 text-amber-500" />
      )}
    </div>
  );
});

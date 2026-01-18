/**
 * @file UrgentReminders.tsx
 * @description Rdeče/oranžne kartice z nujnimi opravili
 */

import { AlertTriangle, Clock, Check, Bell } from 'lucide-react';

// Tip za opomnik
interface Reminder {
  id: string;
  reminder_at: string;
  note?: string;
  company?: {
    id: string;
    name: string;
  };
}

// Tip za podjetje s čakajočo pogodbo
interface ContractPendingCompany {
  id: string;
  name: string;
  display_name?: string;
  contract_sent_at?: string;
}

interface UrgentRemindersProps {
  dueReminders?: Reminder[];
  contractPendingCompanies?: ContractPendingCompany[];
  onOpenCompany: (companyId: string) => void;
  onCompleteReminder: (reminderId: string) => void;
  onAddReminder: (companyId: string) => void;
}

/**
 * Prikazuje nujne opravila:
 * - Rdeče kartice: Opomniki ki so zapadli
 * - Oranžne kartice: Pogodbe poslane pred več kot 3 dni brez odgovora
 */
export default function UrgentReminders({
  dueReminders,
  contractPendingCompanies,
  onOpenCompany,
  onCompleteReminder,
  onAddReminder,
}: UrgentRemindersProps) {
  // Ne prikaži če ni podatkov
  const hasReminders = dueReminders && dueReminders.length > 0;
  const hasPending = contractPendingCompanies && contractPendingCompanies.length > 0;

  if (!hasReminders && !hasPending) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-red-700 flex items-center gap-2">
        <AlertTriangle size={16} />
        Nujno - Zahteva pozornost
      </h3>

      {/* Due reminders - rdeče */}
      {dueReminders?.map(reminder => (
        <div
          key={reminder.id}
          className="bg-red-50 border-2 border-red-300 rounded-lg p-3 flex items-center justify-between"
        >
          <div className="flex-1">
            <p className="font-medium text-red-800">{reminder.company?.name || 'Neznana stranka'}</p>
            {reminder.note && <p className="text-sm text-red-600">{reminder.note}</p>}
            <p className="text-xs text-red-500 mt-1">
              <Clock size={12} className="inline mr-1" />
              {new Date(reminder.reminder_at).toLocaleString('sl-SI', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => reminder.company && onOpenCompany(reminder.company.id)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium"
            >
              Odpri
            </button>
            <button
              onClick={() => onCompleteReminder(reminder.id)}
              className="px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg text-sm"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      ))}

      {/* Contract pending - oranžne */}
      {contractPendingCompanies?.map(company => (
        <div
          key={`contract-${company.id}`}
          className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 flex items-center justify-between"
        >
          <div className="flex-1">
            <p className="font-medium text-orange-800">{company.display_name || company.name}</p>
            <p className="text-sm text-orange-600">
              Pogodba poslana {company.contract_sent_at ?
                new Date(company.contract_sent_at).toLocaleDateString('sl-SI') : 'pred več kot 3 dni'
              } - ni odgovora
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenCompany(company.id)}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium"
            >
              Pokliči
            </button>
            <button
              onClick={() => onAddReminder(company.id)}
              className="px-3 py-1.5 bg-white border border-orange-300 text-orange-600 rounded-lg text-sm"
            >
              <Bell size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

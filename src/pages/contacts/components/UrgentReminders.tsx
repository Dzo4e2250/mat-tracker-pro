/**
 * @file UrgentReminders.tsx
 * @description Rdeče/oranžne kartice z nujnimi opravili
 */

import { useState } from 'react';
import { AlertTriangle, Clock, Check, Bell, CalendarPlus, ChevronDown } from 'lucide-react';

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
  onPostponeReminder?: (reminderId: string, newDate: Date) => void;
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
  onPostponeReminder,
}: UrgentRemindersProps) {
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);

  // Ne prikaži če ni podatkov
  const hasReminders = dueReminders && dueReminders.length > 0;
  const hasPending = contractPendingCompanies && contractPendingCompanies.length > 0;

  if (!hasReminders && !hasPending) {
    return null;
  }

  // Helper za prestavitev datuma
  const handlePostpone = (reminderId: string, days: number) => {
    if (!onPostponeReminder) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(9, 0, 0, 0); // Nastavi na 9:00
    onPostponeReminder(reminderId, newDate);
    setExpandedReminderId(null);
  };

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
          className="bg-red-50 border-2 border-red-300 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-800 truncate">{reminder.company?.name || 'Neznana stranka'}</p>
              {reminder.note && <p className="text-sm text-red-600 truncate">{reminder.note}</p>}
              <p className="text-xs text-red-500 mt-1">
                <Clock size={12} className="inline mr-1" />
                {new Date(reminder.reminder_at).toLocaleString('sl-SI', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex gap-1.5 ml-2">
              {/* Gumb za prestavitev */}
              {onPostponeReminder && (
                <button
                  onClick={() => setExpandedReminderId(expandedReminderId === reminder.id ? null : reminder.id)}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    expandedReminderId === reminder.id
                      ? 'bg-red-200 text-red-700'
                      : 'bg-white border border-red-300 text-red-600 hover:bg-red-100'
                  }`}
                  title="Prestavi"
                >
                  <CalendarPlus size={16} />
                </button>
              )}
              {/* Gumb za opravljeno */}
              <button
                onClick={() => onCompleteReminder(reminder.id)}
                className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                title="Označi kot opravljeno"
              >
                <Check size={16} />
              </button>
              {/* Gumb za odpri */}
              <button
                onClick={() => reminder.company && onOpenCompany(reminder.company.id)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Odpri
              </button>
            </div>
          </div>

          {/* Razširjen meni za prestavitev */}
          {expandedReminderId === reminder.id && onPostponeReminder && (
            <div className="mt-3 pt-3 border-t border-red-200 flex flex-wrap gap-2">
              <span className="text-xs text-red-600 w-full mb-1">Prestavi na:</span>
              <button
                onClick={() => handlePostpone(reminder.id, 0)}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
              >
                Danes 9:00
              </button>
              <button
                onClick={() => handlePostpone(reminder.id, 1)}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
              >
                Jutri
              </button>
              <button
                onClick={() => handlePostpone(reminder.id, 2)}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
              >
                Čez 2 dni
              </button>
              <button
                onClick={() => handlePostpone(reminder.id, 7)}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100"
              >
                Čez teden
              </button>
            </div>
          )}
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

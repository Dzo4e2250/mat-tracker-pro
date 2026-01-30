/**
 * @file UrgentReminders.tsx
 * @description Kartice z nujnimi opravili - sledenje ponudbam in pogodbam
 *
 * Barve:
 * - 🔴 Rdeče: Generični zapadli opomniki
 * - 🟣 Vijolične: Contract follow-up (Ali si dobil pogodbo?)
 * - 🟡 Rumene: Offer follow-up (Ali si dobil odgovor na ponudbo?)
 * - 🟠 Oranžne: Potrebna akcija - pokliči stranko
 */

import { useState } from 'react';
import {
  AlertTriangle, Clock, Check, CalendarPlus, Phone, FileCheck,
  ThumbsUp, ThumbsDown, FileText, X, Hourglass, Mail
} from 'lucide-react';

// Tip za opomnik
interface Reminder {
  id: string;
  reminder_at: string;
  note?: string;
  reminder_type?: string;
  company_id?: string;
  company?: {
    id: string;
    name: string;
  };
}

// Tip za podjetje s čakajočo pogodbo
interface PendingCompany {
  id: string;
  name: string;
  display_name?: string;
  contract_sent_at?: string;
  contract_called_at?: string;
  offer_sent_at?: string;
  offer_called_at?: string;
}

interface UrgentRemindersProps {
  dueReminders?: Reminder[];
  contractPendingCompanies?: PendingCompany[];
  offerPendingCompanies?: PendingCompany[];
  onOpenCompany: (companyId: string) => void;
  onCompleteReminder: (reminderId: string) => void;
  onAddReminder: (companyId: string) => void;
  onPostponeReminder?: (reminderId: string, newDate: Date) => void;

  // Contract workflow handlers
  onMarkContractCalled?: (companyId: string) => void;
  onMarkContractReceived?: (companyId: string, reminderId?: string) => void;
  onPostponeContractFollowup?: (reminderId: string) => void;

  // Offer workflow handlers
  onOfferResponseContract?: (companyId: string, reminderId?: string) => void;
  onOfferResponseNeedsTime?: (companyId: string, reminderId?: string) => void;
  onOfferResponseNoInterest?: (companyId: string, reminderId?: string) => void;
  onOfferNoResponse?: (companyId: string, reminderId: string, reminderType: string) => void;
  onMarkOfferCalled?: (companyId: string, reminderId?: string) => void;
  onOfferCallNotReachable?: (companyId: string, reminderId: string) => void;
  onCreateOfferFollowup?: (companyId: string) => void;
  onSendFollowupEmail?: (companyId: string, reminderId: string, templateType: 'short' | 'friendly', reminderType: string) => void;
}

export default function UrgentReminders({
  dueReminders,
  contractPendingCompanies,
  offerPendingCompanies,
  onOpenCompany,
  onCompleteReminder,
  onPostponeReminder,
  onMarkContractCalled,
  onMarkContractReceived,
  onPostponeContractFollowup,
  onOfferResponseContract,
  onOfferResponseNeedsTime,
  onOfferResponseNoInterest,
  onOfferNoResponse,
  onMarkOfferCalled,
  onOfferCallNotReachable,
  onCreateOfferFollowup,
  onSendFollowupEmail,
}: UrgentRemindersProps) {
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);

  // Kategoriziraj opomnike po tipu
  const contractFollowupReminders = dueReminders?.filter(r => r.reminder_type === 'contract_followup') || [];
  const offerFollowupReminders = dueReminders?.filter(r =>
    r.reminder_type === 'offer_followup_1' || r.reminder_type === 'offer_followup_2'
  ) || [];
  const offerCallReminders = dueReminders?.filter(r => r.reminder_type === 'offer_call') || [];
  const regularReminders = dueReminders?.filter(r =>
    !r.reminder_type ||
    !['contract_followup', 'offer_followup_1', 'offer_followup_2', 'offer_call'].includes(r.reminder_type)
  ) || [];

  // Filtriraj pending podjetja
  const uncalledContractCompanies = contractPendingCompanies?.filter(c => !c.contract_called_at) || [];
  const pendingOfferCompanies = offerPendingCompanies || [];

  // Ne prikaži če ni podatkov
  const hasAnyContent =
    regularReminders.length > 0 ||
    contractFollowupReminders.length > 0 ||
    offerFollowupReminders.length > 0 ||
    offerCallReminders.length > 0 ||
    uncalledContractCompanies.length > 0 ||
    pendingOfferCompanies.length > 0;

  if (!hasAnyContent) {
    return null;
  }

  // Helper za prestavitev datuma
  const handlePostpone = (reminderId: string, days: number) => {
    if (!onPostponeReminder) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    newDate.setHours(9, 0, 0, 0);
    onPostponeReminder(reminderId, newDate);
    setExpandedReminderId(null);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-red-700 flex items-center gap-2">
        <AlertTriangle size={16} />
        Nujno - Zahteva pozornost
      </h3>

      {/* ========== OFFER CALL REMINDERS - ORANŽNE ========== */}
      {/* Poenostavljen flow: DA = poklical in dobil odgovor, NE = ni dosegljiv */}
      {offerCallReminders.map(reminder => (
        <div
          key={reminder.id}
          className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-orange-600" />
                <p className="font-medium text-orange-800 truncate">{reminder.company?.name || 'Neznana stranka'}</p>
              </div>
              <p className="text-sm text-orange-600">{reminder.note || 'Pokliči stranko glede ponudbe'}</p>
              <p className="text-xs text-orange-500 mt-1">
                <Clock size={12} className="inline mr-1" />
                {new Date(reminder.reminder_at).toLocaleString('sl-SI', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex gap-1.5 ml-2">
              {/* DA - poklical in dobil odgovor, odpri podjetje */}
              <button
                onClick={() => {
                  if (reminder.company) {
                    onOpenCompany(reminder.company.id);
                    onCompleteReminder(reminder.id);
                  }
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                title="Poklical - odpri podjetje za vnos rezultata"
              >
                <ThumbsUp size={16} />
                DA
              </button>
              {/* NE - ni dosegljiv, prestavi na jutri */}
              <button
                onClick={() => {
                  if (onPostponeReminder) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    onPostponeReminder(reminder.id, tomorrow);
                  }
                }}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-1"
                title="Ni dosegljiv - prestavi na jutri"
              >
                <ThumbsDown size={16} />
                NE
              </button>
              {/* Odpri */}
              <button
                onClick={() => reminder.company && onOpenCompany(reminder.company.id)}
                className="px-3 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100"
              >
                Odpri
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ========== OFFER FOLLOWUP REMINDERS - RUMENE ========== */}
      {/* Poenostavljen flow kot pri pogodbah: DA = odpri podjetje, NE = prestavi na jutri */}
      {offerFollowupReminders.map(reminder => (
        <div
          key={reminder.id}
          className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-yellow-600" />
                <p className="font-medium text-yellow-800 truncate">{reminder.company?.name || 'Neznana stranka'}</p>
              </div>
              <p className="text-sm text-yellow-700">{reminder.note || 'Ali si dobil odgovor na ponudbo?'}</p>
              <p className="text-xs text-yellow-600 mt-1">
                <Clock size={12} className="inline mr-1" />
                {new Date(reminder.reminder_at).toLocaleString('sl-SI', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex gap-1.5 ml-2">
              {/* DA - odpre podjetje kjer izbereš rezultat */}
              <button
                onClick={() => {
                  if (reminder.company) {
                    onOpenCompany(reminder.company.id);
                    // Zaključi opomnik ker ga bomo obdelali v podjetju
                    onCompleteReminder(reminder.id);
                  }
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                title="Dobil sem odgovor - odpri podjetje"
              >
                <ThumbsUp size={16} />
                DA
              </button>
              {/* NE - prestavi na jutri */}
              <button
                onClick={() => {
                  if (onPostponeReminder) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    onPostponeReminder(reminder.id, tomorrow);
                  }
                }}
                className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 flex items-center gap-1"
                title="Ni odgovora - prestavi na jutri"
              >
                <ThumbsDown size={16} />
                NE
              </button>
              {/* Odpri */}
              <button
                onClick={() => reminder.company && onOpenCompany(reminder.company.id)}
                className="px-3 py-2 bg-white border border-yellow-400 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100"
              >
                Odpri
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ========== OFFER PENDING COMPANIES - RUMENE ZAČETNE ========== */}
      {pendingOfferCompanies.map(company => (
        <div
          key={`offer-pending-${company.id}`}
          className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-yellow-600" />
                <p className="font-medium text-yellow-800 truncate">{company.display_name || company.name}</p>
              </div>
              <p className="text-sm text-yellow-700">
                Ponudba poslana {company.offer_sent_at
                  ? new Date(company.offer_sent_at).toLocaleDateString('sl-SI')
                  : 'pred 2+ dnevi'
                } - ni odgovora
              </p>
            </div>
            <div className="flex gap-2">
              {/* Ustvari follow-up opomnik */}
              {onCreateOfferFollowup && (
                <button
                  onClick={() => onCreateOfferFollowup(company.id)}
                  className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"
                  title="Ustvari opomnik za sledenje ponudbi"
                >
                  Sledi
                </button>
              )}
              {/* Odpri */}
              <button
                onClick={() => onOpenCompany(company.id)}
                className="px-3 py-1.5 bg-white border border-yellow-400 text-yellow-700 rounded-lg text-sm hover:bg-yellow-100"
              >
                Odpri
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ========== CONTRACT FOLLOWUP REMINDERS - VIJOLIČNE ========== */}
      {contractFollowupReminders.map(reminder => (
        <div
          key={reminder.id}
          className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-purple-800 truncate">{reminder.company?.name || 'Neznana stranka'}</p>
              <p className="text-sm text-purple-600">{reminder.note || 'Ali si dobil podpisano pogodbo?'}</p>
              <p className="text-xs text-purple-500 mt-1">
                <Clock size={12} className="inline mr-1" />
                {new Date(reminder.reminder_at).toLocaleString('sl-SI', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex gap-1.5 ml-2">
              {onMarkContractReceived && (
                <button
                  onClick={() => onMarkContractReceived(reminder.company?.id || reminder.company_id || '', reminder.id)}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                  title="Pogodba prejeta"
                >
                  <ThumbsUp size={16} />
                  DA
                </button>
              )}
              {onPostponeContractFollowup && (
                <button
                  onClick={() => onPostponeContractFollowup(reminder.id)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-1"
                  title="Prestavi na jutri"
                >
                  <ThumbsDown size={16} />
                  NE
                </button>
              )}
              <button
                onClick={() => reminder.company && onOpenCompany(reminder.company.id)}
                className="px-3 py-2 bg-white border border-purple-300 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100"
              >
                Odpri
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ========== CONTRACT PENDING COMPANIES - ORANŽNE ========== */}
      {uncalledContractCompanies.map(company => (
        <div
          key={`contract-${company.id}`}
          className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-orange-800 truncate">{company.display_name || company.name}</p>
              <p className="text-sm text-orange-600">
                Pogodba poslana {company.contract_sent_at
                  ? new Date(company.contract_sent_at).toLocaleDateString('sl-SI')
                  : 'pred več kot 3 dni'
                } - ni odgovora
              </p>
            </div>
            <div className="flex gap-2">
              {onMarkContractCalled && (
                <button
                  onClick={() => onMarkContractCalled(company.id)}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-orange-700"
                  title="Označi kot poklicano"
                >
                  <Phone size={14} />
                  Poklical
                </button>
              )}
              {onMarkContractReceived && (
                <button
                  onClick={() => onMarkContractReceived(company.id)}
                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-green-600"
                  title="Pogodba že prejeta"
                >
                  <FileCheck size={14} />
                  Prejeto
                </button>
              )}
              <button
                onClick={() => onOpenCompany(company.id)}
                className="px-3 py-1.5 bg-white border border-orange-300 text-orange-600 rounded-lg text-sm hover:bg-orange-100"
              >
                Odpri
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ========== REGULAR REMINDERS - RDEČE ========== */}
      {regularReminders.map(reminder => (
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
              <button
                onClick={() => onCompleteReminder(reminder.id)}
                className="p-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                title="Označi kot opravljeno"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => reminder.company && onOpenCompany(reminder.company.id)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Odpri
              </button>
            </div>
          </div>

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
    </div>
  );
}

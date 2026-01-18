/**
 * @file ExistingCompanyModal.tsx
 * @description Modal za opozorilo, ko podjetje že obstaja (npr. pri QR skeniranju)
 */

import { Building2, X, Users, Plus } from 'lucide-react';

// Tip za kontakt
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  role?: string;
}

// Tip za podjetje
interface Company {
  id: string;
  name: string;
  tax_number?: string;
  contacts?: Contact[];
}

// Podatki iz vCard
interface PendingContactData {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole?: string;
}

interface ExistingCompanyModalProps {
  company: Company;
  pendingContact: PendingContactData;
  isLoading: boolean;
  onAddToExisting: () => void;
  onCreateNewAnyway: () => void;
  onClose: () => void;
}

/**
 * Modal ko najdemo obstoječe podjetje
 * - Prikaže podatke o obstoječem podjetju
 * - Prikaže podatke o novem kontaktu iz vCard
 * - Ponudi opcije: dodaj kontakt / ustvari novo podjetje / prekliči
 */
export default function ExistingCompanyModal({
  company,
  pendingContact,
  isLoading,
  onAddToExisting,
  onCreateNewAnyway,
  onClose,
}: ExistingCompanyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-orange-50 flex items-center justify-between">
          <h3 className="font-bold text-orange-800 flex items-center gap-2">
            <Building2 size={20} />
            Podjetje že obstaja!
          </h3>
          <button onClick={onClose} className="p-1 text-orange-800 hover:text-orange-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Najdeno obstoječe podjetje:</p>
            <p className="font-bold text-lg">{company.name}</p>
            {company.tax_number && (
              <p className="text-sm text-gray-500">ID za DDV: {company.tax_number}</p>
            )}
            {company.contacts && company.contacts.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Obstoječi kontakti: {company.contacts.map(c => `${c.first_name} ${c.last_name}`).join(', ')}
              </p>
            )}
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Nov kontakt iz vCard:</p>
            <p className="font-medium">{pendingContact.contactName || 'Brez imena'}</p>
            {pendingContact.contactEmail && (
              <p className="text-sm text-gray-600">{pendingContact.contactEmail}</p>
            )}
            {pendingContact.contactPhone && (
              <p className="text-sm text-gray-600">{pendingContact.contactPhone}</p>
            )}
            {pendingContact.contactRole && (
              <p className="text-sm text-gray-500">{pendingContact.contactRole}</p>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Kaj želite storiti?
          </p>

          <div className="space-y-2">
            <button
              onClick={onAddToExisting}
              disabled={isLoading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Users size={18} />
              {isLoading ? 'Dodajam...' : 'Dodaj kontakt k obstoječemu podjetju'}
            </button>

            <button
              onClick={onCreateNewAnyway}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Plus size={18} />
              Ustvari novo podjetje vseeno
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              Prekliči
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

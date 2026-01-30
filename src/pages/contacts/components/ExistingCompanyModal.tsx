/**
 * @file ExistingCompanyModal.tsx
 * @description Modal za opozorilo, ko podjetje že obstaja - z možnostjo izbire obstoječega kontakta
 */

import { useState } from 'react';
import { Building2, X, Users, Plus, Check, Building, User } from 'lucide-react';

// Tip za kontakt
interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  is_decision_maker?: boolean;
}

// Tip za matično podjetje
interface ParentCompany {
  id: string;
  name: string;
  display_name?: string | null;
  tax_number?: string | null;
}

// Tip za podjetje
interface Company {
  id: string;
  name: string;
  display_name?: string | null;
  tax_number?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_postal?: string | null;
  parent_company_id?: string | null;
  parent_company?: ParentCompany | null;
  contacts?: Contact[];
}

interface ExistingCompanyModalProps {
  company: Company;
  isLoading: boolean;
  onSelectExistingContact: (contact: Contact) => void;
  onAddNewContact: () => void;
  onClose: () => void;
}

/**
 * Modal ko najdemo obstoječe podjetje
 * - Prikaže podatke o obstoječem podjetju
 * - Prikaže seznam obstoječih kontaktov za izbiro
 * - Omogoča dodajanje novega kontakta
 */
export default function ExistingCompanyModal({
  company,
  isLoading,
  onSelectExistingContact,
  onAddNewContact,
  onClose,
}: ExistingCompanyModalProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    // Privzeto izberi prvega kontakta ali decision makerja
    company.contacts?.find(c => c.is_decision_maker)?.id || company.contacts?.[0]?.id || null
  );

  const contacts = company.contacts || [];
  const hasContacts = contacts.length > 0;
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const handleConfirm = () => {
    if (selectedContact) {
      onSelectExistingContact(selectedContact);
    }
  };

  const formatContactName = (contact: Contact) => {
    const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    return name || 'Brez imena';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b bg-blue-50 flex items-center justify-between">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            <Building2 size={20} />
            Podjetje najdeno v bazi
          </h3>
          <button onClick={onClose} className="p-1 text-blue-800 hover:text-blue-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Podatki o podjetju */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-bold text-lg">{company.display_name || company.name}</p>
            {company.display_name && company.name !== company.display_name && (
              <p className="text-sm text-gray-500">{company.name}</p>
            )}
            {company.tax_number && (
              <p className="text-sm text-gray-500">ID za DDV: SI{company.tax_number}</p>
            )}
            {company.address_street && (
              <p className="text-sm text-gray-500 mt-1">
                {company.address_street}, {company.address_postal} {company.address_city}
              </p>
            )}
          </div>

          {/* Matično podjetje */}
          {company.parent_company && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 mb-1 flex items-center gap-1">
                <Building size={14} />
                Matično podjetje:
              </p>
              <p className="font-medium text-purple-800">
                {company.parent_company.display_name || company.parent_company.name}
              </p>
              {company.parent_company.tax_number && (
                <p className="text-xs text-purple-600">
                  ID za DDV: SI{company.parent_company.tax_number}
                </p>
              )}
            </div>
          )}

          {/* Seznam kontaktov za izbiro */}
          {hasContacts ? (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <Users size={14} />
                Izberi kontaktno osebo ({contacts.length}):
              </p>
              <div className="space-y-2">
                {contacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedContactId === contact.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          {formatContactName(contact)}
                          {contact.is_decision_maker && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                              Odločevalec
                            </span>
                          )}
                        </p>
                        {contact.role && (
                          <p className="text-sm text-gray-500">{contact.role}</p>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          {contact.email && <span className="mr-3">{contact.email}</span>}
                          {contact.phone && <span>{contact.phone}</span>}
                        </div>
                      </div>
                      {selectedContactId === contact.id && (
                        <Check size={20} className="text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                To podjetje nima shranjenih kontaktov.
              </p>
            </div>
          )}
        </div>

        {/* Gumbi */}
        <div className="p-4 border-t bg-gray-50 space-y-2">
          {hasContacts && selectedContact && (
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <User size={18} />
              {isLoading ? 'Dodajam...' : `Uporabi ${formatContactName(selectedContact)}`}
            </button>
          )}

          <button
            onClick={onAddNewContact}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <Plus size={18} />
            Dodaj nov kontakt k temu podjetju
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
  );
}

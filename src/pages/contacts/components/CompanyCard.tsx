/**
 * @file CompanyCard.tsx
 * @description Kartica posamezne stranke v seznamu
 */

import { Building2, MapPin, ChevronRight, Phone, Mail, Bell, ChevronDown, Check, User, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Tip za kontakt
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  role?: string;
  is_primary?: boolean;
}

// Tip za cikel
interface Cycle {
  status: string;
  test_start_date?: string;
  contract_signed?: boolean;
}

// Tip za podjetje
interface Company {
  id: string;
  name: string;
  display_name?: string;
  address_city?: string;
  address_postal?: string;
  address_street?: string;
  delivery_address?: string;
  delivery_postal?: string;
  delivery_city?: string;
  pipeline_status?: string;
  contacts: Contact[];
  cycles?: Cycle[];
  cycleStats: {
    total: number;
    onTest: number;
    signed: number;
  };
}

interface CompanyCardProps {
  company: Company;
  isRecent: boolean;
  showRecentBadge: boolean;
  selectionMode: boolean;
  selectedContacts: Set<string>;
  onCompanyClick: () => void;
  onContactToggle: (contactId: string) => void;
  onAddReminder: () => void;
}

/**
 * Generira vCard string za kontakt
 */
const generateVCard = (contact: Contact, companyName?: string): string => {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${contact.last_name || ''};${contact.first_name};;;`,
    `FN:${contact.first_name} ${contact.last_name || ''}`.trim(),
  ];

  if (companyName) {
    lines.push(`ORG:${companyName}`);
  }
  if (contact.role) {
    lines.push(`TITLE:${contact.role}`);
  }
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL:${contact.phone}`);
  }
  if (contact.email) {
    lines.push(`EMAIL:${contact.email}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
};

/**
 * Prenese vCard datoteko
 */
const downloadVCard = (contact: Contact, companyName?: string) => {
  const vcard = generateVCard(contact, companyName);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${contact.first_name}_${contact.last_name || 'kontakt'}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Preveri ali je cikel v zamudi (test traja več kot 14 dni)
 */
const isTestOverdue = (cycle: Cycle): boolean => {
  if (cycle.status !== 'on_test' || !cycle.test_start_date) return false;
  const testStart = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - testStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 14;
};

/**
 * Vrni število dni zamude
 */
const getDaysOverdue = (cycle: Cycle): number => {
  if (cycle.status !== 'on_test' || !cycle.test_start_date) return 0;
  const testStart = new Date(cycle.test_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - testStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff - 14);
};

/**
 * Kartica stranke z:
 * - Imenom in osnovnimi podatki
 * - Badge-i za "Nedavno" in "Zamuja"
 * - Statistiko ciklov
 * - Quick actions (klic, email, pot, opomnik)
 * - Selection mode za izbiro kontaktov
 */
export default function CompanyCard({
  company,
  isRecent,
  showRecentBadge,
  selectionMode,
  selectedContacts,
  onCompanyClick,
  onContactToggle,
  onAddReminder,
}: CompanyCardProps) {
  // Izračunaj podatke
  const primaryContact = company.contacts.find(c => c.is_primary) || company.contacts[0];
  const overdueCycle = company.cycles?.find((c) => isTestOverdue(c));
  const daysOverdue = overdueCycle ? getDaysOverdue(overdueCycle) : 0;

  // Naslovi
  const address = [company.address_city, company.address_postal].filter(Boolean).join(', ') || null;

  // Google Maps URL - uporabi delivery naslov če obstaja
  const hasDeliveryAddress = company.delivery_address || company.delivery_postal || company.delivery_city;
  const addressParts = hasDeliveryAddress
    ? [company.delivery_address, company.delivery_postal, company.delivery_city].filter(Boolean)
    : [company.address_street, company.address_postal, company.address_city].filter(Boolean);
  const mapsUrl = addressParts.length > 0
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(', '))}`
    : null;

  return (
    <div
      className={`bg-white rounded-lg shadow overflow-hidden ${overdueCycle ? 'border-2 border-red-400' : ''} ${isRecent && showRecentBadge ? 'ring-2 ring-blue-200' : ''}`}
    >
      {/* Main card - clickable */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => {
          if (!selectionMode) {
            onCompanyClick();
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Za osnutke: kontaktna oseba kot glavni naslov */}
            {company.pipeline_status === 'osnutek' && primaryContact ? (
              <>
                <div className="font-bold text-lg flex items-center gap-2 flex-wrap">
                  <User size={18} className="text-amber-500" />
                  {primaryContact.first_name} {primaryContact.last_name}
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-300">
                    Osnutek
                  </span>
                  {isRecent && showRecentBadge && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      Nedavno
                    </span>
                  )}
                </div>
                {/* Lokacija/podjetje pod imenom kontakta */}
                {(company.display_name || !company.name.startsWith('Osnutek:')) && (
                  <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Building2 size={14} className="text-gray-400" />
                    {company.display_name || company.name}
                    {primaryContact.role && <span className="text-gray-400"> • {primaryContact.role}</span>}
                  </div>
                )}
                {!company.display_name && company.name.startsWith('Osnutek:') && primaryContact.role && (
                  <div className="text-sm text-gray-600 mt-1">
                    {primaryContact.role}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Normalen prikaz za ostale stranke */}
                <div className="font-bold text-lg flex items-center gap-2 flex-wrap">
                  <Building2 size={18} className="text-gray-400" />
                  {company.display_name || company.name}
                  {company.pipeline_status === 'osnutek' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-300">
                      Osnutek
                    </span>
                  )}
                  {isRecent && showRecentBadge && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      Nedavno
                    </span>
                  )}
                  {overdueCycle && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                      {daysOverdue > 0 ? `${daysOverdue} dni zamude` : 'Zamuja'}
                    </span>
                  )}
                </div>
                {!selectionMode && primaryContact && (
                  <div className="text-sm text-gray-600 mt-1">
                    {primaryContact.first_name} {primaryContact.last_name}
                    {primaryContact.role && <span className="text-gray-400"> • {primaryContact.role}</span>}
                  </div>
                )}
              </>
            )}
            {address && (
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MapPin size={14} />
                {address}
              </div>
            )}
          </div>
          {!selectionMode && <ChevronRight size={20} className="text-gray-400" />}
        </div>

        {/* Selection mode - show all contacts with checkboxes */}
        {selectionMode && company.contacts.length > 0 && (
          <div className="mt-3 space-y-2">
            {company.contacts.map(contact => (
              <label
                key={contact.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onContactToggle(contact.id);
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedContacts.has(contact.id)
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {selectedContacts.has(contact.id) && <Check size={14} />}
                </button>
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {contact.first_name} {contact.last_name}
                    {contact.role && <span className="text-gray-400 font-normal"> • {contact.role}</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {contact.phone && <span className="mr-3">{contact.phone}</span>}
                    {contact.email && <span>{contact.email}</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Stats - only show when not in selection mode */}
        {!selectionMode && company.cycleStats.total > 0 && (
          <div className="flex gap-3 mt-3 text-sm">
            {company.cycleStats.onTest > 0 && (
              <span className="text-blue-600">🔵 {company.cycleStats.onTest} na testu</span>
            )}
            {company.cycleStats.signed > 0 && (
              <span className="text-green-600">✅ {company.cycleStats.signed} pogodb</span>
            )}
          </div>
        )}
      </div>

      {/* Quick actions - Klic, Email, Zemljevid */}
      {!selectionMode && company.contacts.length > 0 && (
        <div className="border-t flex divide-x">
          {/* Klic */}
          {company.contacts.some(c => c.phone) && (
            company.contacts.filter(c => c.phone).length === 1 ? (
              <a
                href={`tel:${company.contacts.find(c => c.phone)?.phone}`}
                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-blue-600 hover:bg-blue-50"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone size={16} />
                <span className="text-sm">Klic</span>
              </a>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="flex-1 py-2.5 flex items-center justify-center gap-1 text-blue-600 hover:bg-blue-50">
                    <Phone size={16} />
                    <span className="text-sm">Klic</span>
                    <ChevronDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {company.contacts.filter(c => c.phone).map(contact => (
                    <DropdownMenuItem key={contact.id} asChild>
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2">
                        <Phone size={14} />
                        <span>{contact.first_name} {contact.last_name}</span>
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
          {/* Shrani v telefon */}
          {company.contacts.length === 1 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadVCard(company.contacts[0], company.display_name || company.name);
              }}
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-green-600 hover:bg-green-50"
            >
              <UserPlus size={16} />
              <span className="text-sm">Shrani</span>
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="flex-1 py-2.5 flex items-center justify-center gap-1 text-green-600 hover:bg-green-50">
                  <UserPlus size={16} />
                  <span className="text-sm">Shrani</span>
                  <ChevronDown size={12} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {company.contacts.map(contact => (
                  <DropdownMenuItem
                    key={contact.id}
                    onClick={() => downloadVCard(contact, company.display_name || company.name)}
                  >
                    <UserPlus size={14} className="mr-2" />
                    <span>{contact.first_name} {contact.last_name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Email */}
          {company.contacts.some(c => c.email) && (
            company.contacts.filter(c => c.email).length === 1 ? (
              <a
                href={`mailto:${company.contacts.find(c => c.email)?.email}`}
                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-purple-600 hover:bg-purple-50"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail size={16} />
                <span className="text-sm">Email</span>
              </a>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="flex-1 py-2.5 flex items-center justify-center gap-1 text-purple-600 hover:bg-purple-50">
                    <Mail size={16} />
                    <span className="text-sm">Email</span>
                    <ChevronDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {company.contacts.filter(c => c.email).map(contact => (
                    <DropdownMenuItem key={contact.id} asChild>
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2">
                        <Mail size={14} />
                        <span>{contact.first_name} {contact.last_name}</span>
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
          {/* Zemljevid */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-orange-600 hover:bg-orange-50"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin size={16} />
              <span className="text-sm">Pot</span>
            </a>
          )}
          {/* Opomnik */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddReminder();
            }}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-amber-600 hover:bg-amber-50"
          >
            <Bell size={16} />
            <span className="text-sm">Opomni</span>
          </button>
        </div>
      )}
    </div>
  );
}

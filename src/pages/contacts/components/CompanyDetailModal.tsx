/**
 * @file CompanyDetailModal.tsx
 * @description Modal za prikaz podrobnosti podjetja
 * - Osnovni podatki podjetja
 * - Opombe (notes)
 * - Statistika ciklov
 * - Kontaktne osebe
 * - Zgodovina predpražnikov
 * - Poslane ponudbe
 * - Hitre akcije
 */

import React from 'react';
import {
  X, StickyNote, Plus, Trash2, User, Phone, Mail, Calendar,
  Package, Clock, CheckCircle, FileText, Euro, MapPin, Camera,
  Pencil, FileSignature, Check, GitBranch, Building2, ChevronDown
} from 'lucide-react';
import {
  D365_ACTIVITY_CATEGORIES,
  D365_SUBCATEGORIES,
  D365_APPOINTMENT_TYPES,
} from '@/pages/contacts/hooks/useCompanyNotes';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  work_phone?: string;
  email?: string;
  role?: string;
  is_primary?: boolean;
  location_address?: string;
  contact_since?: string;
}

interface Company {
  id: string;
  name: string;
  display_name?: string;
  tax_number?: string;
  address_street?: string;
  address_postal?: string;
  address_city?: string;
  delivery_address?: string;
  delivery_postal?: string;
  delivery_city?: string;
  contacts: Contact[];
  cycleStats: {
    total: number;
    onTest: number;
    signed: number;
  };
  is_in_d365?: boolean;
}

interface CompanyNote {
  id: string;
  note_date: string;
  content: string;
  created_at: string;
  activity_category?: string | null;
  activity_subcategory?: string | null;
  appointment_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

interface Cycle {
  id: string;
  status: string;
  created_at: string;
  test_end_date?: string;
  contract_signed?: boolean;
  notes?: string;
  mat_type?: { name: string };
  qr_code?: { code: string };
}

interface SentOffer {
  id: string;
  offer_type: string;
  frequency?: string;
  sent_at: string;
  recipient_email?: string;
  items?: { notes?: string }[];
}

interface SavedContract {
  offer_id: string;
  generated_at: string;
}

interface HierarchyCompany {
  id: string;
  name: string;
  display_name?: string;
}

interface CompanyDetailModalProps {
  company: Company;
  companyNotes: CompanyNote[] | undefined;
  isLoadingNotes: boolean;
  companyDetails: { cycles: Cycle[] } | undefined;
  isLoadingDetails: boolean;
  sentOffers: SentOffer[];
  loadingSentOffers: boolean;
  savedContracts: SavedContract[];
  newNoteDate: string;
  newNoteContent: string;
  isAddingNote: boolean;
  googleMapsUrl: string | null;
  parentCompany?: HierarchyCompany;
  childCompanies?: HierarchyCompany[];
  onNewNoteDateChange: (date: string) => void;
  onNewNoteContentChange: (content: string) => void;
  onClose: () => void;
  onEditAddress: () => void;
  onQuickNote: (content: string) => void;
  onAddNote: () => void;
  onEditNote: (noteId: string, content: string, noteDate: string, d365Fields?: {
    activityCategory: string | null;
    activitySubcategory: string | null;
    appointmentType: string | null;
    startTime: string | null;
    endTime: string | null;
  }) => void;
  onDeleteNote: (noteId: string) => void;
  onShowAddContact: () => void;
  onShowMeeting: (type: 'ponudba' | 'sestanek' | 'izris') => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onOpenOffer: () => void;
  onViewOffer: (offer: SentOffer) => void;
  onDeleteSentOffer: (offerId: string) => void;
  onNavigateToSeller: () => void;
  onDeleteCompany?: () => void;
  onContractSent?: () => void;
  onSelectCompany?: (companyId: string) => void;
  onToggleD365?: (isInD365: boolean) => void;
  // D365 fields for adding notes
  d365Category?: string;
  d365Subcategory?: string;
  d365AppointmentType?: string;
  d365StartTime?: string;
  d365EndTime?: string;
  onD365CategoryChange?: (value: string) => void;
  onD365SubcategoryChange?: (value: string) => void;
  onD365AppointmentTypeChange?: (value: string) => void;
  onD365StartTimeChange?: (value: string) => void;
  onD365EndTimeChange?: (value: string) => void;
}

export default function CompanyDetailModal({
  company,
  companyNotes,
  isLoadingNotes,
  companyDetails,
  isLoadingDetails,
  sentOffers,
  loadingSentOffers,
  savedContracts,
  newNoteDate,
  newNoteContent,
  isAddingNote,
  googleMapsUrl,
  parentCompany,
  childCompanies,
  onNewNoteDateChange,
  onNewNoteContentChange,
  onClose,
  onEditAddress,
  onQuickNote,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onShowAddContact,
  onShowMeeting,
  onEditContact,
  onDeleteContact,
  onOpenOffer,
  onViewOffer,
  onDeleteSentOffer,
  onNavigateToSeller,
  onDeleteCompany,
  onContractSent,
  onSelectCompany,
  onToggleD365,
  d365Category,
  d365Subcategory,
  d365AppointmentType,
  d365StartTime,
  d365EndTime,
  onD365CategoryChange,
  onD365SubcategoryChange,
  onD365AppointmentTypeChange,
  onD365StartTimeChange,
  onD365EndTimeChange,
}: CompanyDetailModalProps) {
  // State za urejanje opombe
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState('');
  const [editingDate, setEditingDate] = React.useState('');
  // D365 fields expanded state
  const [showD365Fields, setShowD365Fields] = React.useState(false);
  // D365 fields for editing existing notes
  const [editingD365Category, setEditingD365Category] = React.useState('');
  const [editingD365Subcategory, setEditingD365Subcategory] = React.useState('');
  const [editingD365AppointmentType, setEditingD365AppointmentType] = React.useState('');
  const [editingD365StartTime, setEditingD365StartTime] = React.useState('');
  const [editingD365EndTime, setEditingD365EndTime] = React.useState('');
  const [showEditD365Fields, setShowEditD365Fields] = React.useState(false);

  // Extract time (HH:MM) from a timestamp string like "2026-01-30T09:00:00"
  const extractTime = (timestamp: string | null | undefined, defaultTime: string): string => {
    if (!timestamp) return defaultTime;
    // Try to extract HH:MM from ISO timestamp
    const match = timestamp.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    // If it's already just a time (HH:MM), return it
    if (/^\d{2}:\d{2}$/.test(timestamp)) return timestamp;
    return defaultTime;
  };

  const startEditing = (note: CompanyNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditingDate(note.note_date);
    // Load D365 fields
    setEditingD365Category(note.activity_category || '');
    setEditingD365Subcategory(note.activity_subcategory || '');
    setEditingD365AppointmentType(note.appointment_type || 'face_to_face');
    setEditingD365StartTime(extractTime(note.start_time, '09:00'));
    setEditingD365EndTime(extractTime(note.end_time, '09:30'));
    // Show D365 fields if note has any D365 data
    setShowEditD365Fields(!!(note.activity_category || note.activity_subcategory));
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent('');
    setEditingDate('');
    setEditingD365Category('');
    setEditingD365Subcategory('');
    setEditingD365AppointmentType('');
    setEditingD365StartTime('');
    setEditingD365EndTime('');
    setShowEditD365Fields(false);
  };

  const saveEditing = () => {
    if (editingNoteId && editingContent.trim()) {
      onEditNote(editingNoteId, editingContent.trim(), editingDate, {
        activityCategory: editingD365Category || null,
        activitySubcategory: editingD365Subcategory || null,
        appointmentType: editingD365AppointmentType || null,
        startTime: editingD365StartTime || null,
        endTime: editingD365EndTime || null,
      });
      cancelEditing();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">{company.display_name || company.name}</h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Company Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                {company.tax_number && (
                  <div className="text-sm">
                    <span className="text-gray-500">Davčna:</span> {company.tax_number}
                  </div>
                )}

                {/* Sedež podjetja */}
                {company.address_street && (
                  <div className="text-sm">
                    <span className="text-gray-500">
                      {company.delivery_address ? 'Sedež:' : 'Naslov:'}
                    </span> {company.address_street}
                  </div>
                )}
                {(company.address_postal || company.address_city) && !company.delivery_address && (
                  <div className="text-sm">
                    <span className="text-gray-500">Pošta:</span> {company.address_postal} {company.address_city}
                  </div>
                )}
                {(company.address_postal || company.address_city) && company.delivery_address && (
                  <div className="text-sm text-gray-400 ml-4">
                    {company.address_postal} {company.address_city}
                  </div>
                )}

                {/* Naslov poslovalnice */}
                {company.delivery_address && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-sm">
                      <span className="text-amber-600 font-medium">Poslovalnica:</span> {company.delivery_address}
                    </div>
                    {(company.delivery_postal || company.delivery_city) && (
                      <div className="text-sm text-gray-500 ml-4">
                        {company.delivery_postal} {company.delivery_city}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Edit address button */}
              <button
                onClick={onEditAddress}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                title="Uredi naslove"
              >
                <Pencil size={16} />
              </button>
            </div>

            {/* D365 CRM Status */}
            {onToggleD365 && (
              <div className="pt-2 mt-2 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={company.is_in_d365 || false}
                    onChange={(e) => onToggleD365(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Je v D365 CRM</span>
                  {company.is_in_d365 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ V CRM</span>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Hierarhija podjetja */}
          {(parentCompany || (childCompanies && childCompanies.length > 0)) && (
            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-sm text-purple-700 flex items-center gap-2">
                <GitBranch size={16} />
                Hierarhija podjetja
              </h4>

              {/* Matično podjetje */}
              {parentCompany && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Matično:</span>
                  <button
                    onClick={() => onSelectCompany?.(parentCompany.id)}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Building2 size={14} />
                    {parentCompany.display_name || parentCompany.name}
                  </button>
                </div>
              )}

              {/* Hčerinska podjetja */}
              {childCompanies && childCompanies.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Podružnice ({childCompanies.length}):</span>
                  <div className="space-y-1 pl-2 border-l-2 border-purple-200">
                    {childCompanies.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onSelectCompany?.(child.id)}
                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 hover:underline"
                      >
                        <GitBranch size={12} />
                        {child.display_name || child.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dated Notes Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <StickyNote size={18} className="text-yellow-500" />
                Opombe
              </h4>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => onQuickNote('Klical - ni dvignil')}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-medium"
              >
                Klical - ni dvignil
              </button>
              <button
                onClick={() => onQuickNote('Ni interesa')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-xs font-medium"
              >
                Ni interesa
              </button>
              <button
                onClick={() => onShowMeeting('ponudba')}
                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-full text-xs font-medium"
              >
                Pošlji ponudbo do...
              </button>
              <button
                onClick={() => onShowMeeting('izris')}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-full text-xs font-medium"
              >
                Pošlji izris do...
              </button>
              <button
                onClick={() => onShowMeeting('sestanek')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-medium"
              >
                Dogovorjen sestanek...
              </button>
              {onContractSent && (
                <button
                  onClick={onContractSent}
                  className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-full text-xs font-medium"
                >
                  📄 Čakam na pogodbo/aneks
                </button>
              )}
            </div>

            {/* Add new note */}
            <div className="bg-yellow-50 rounded-lg p-3 mb-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => onNewNoteDateChange(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                />
                <button
                  onClick={onAddNote}
                  disabled={!newNoteContent.trim() || isAddingNote}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm disabled:bg-gray-300 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Dodaj
                </button>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => onNewNoteContentChange(e.target.value)}
                placeholder="Prosta opomba..."
                className="w-full p-2 border rounded text-sm"
                rows={2}
              />

              {/* D365 Fields - only show when company is in D365 */}
              {company.is_in_d365 && onD365CategoryChange && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowD365Fields(!showD365Fields)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <ChevronDown size={14} className={`transform transition-transform ${showD365Fields ? 'rotate-180' : ''}`} />
                    D365 polja {d365Category ? '✓' : ''}
                  </button>

                  {showD365Fields && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg space-y-2">
                      <p className="text-xs text-blue-700 font-medium mb-2">Za izvoz v Dynamics 365:</p>

                      {/* Category */}
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Kategorija</label>
                        <select
                          value={d365Category || ''}
                          onChange={(e) => onD365CategoryChange(e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                        >
                          <option value="">-- Izberi --</option>
                          {D365_ACTIVITY_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subcategory */}
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Podkategorija</label>
                        <select
                          value={d365Subcategory || ''}
                          onChange={(e) => onD365SubcategoryChange?.(e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                        >
                          <option value="">-- Izberi --</option>
                          {D365_SUBCATEGORIES.map(sub => (
                            <option key={sub.value} value={sub.value}>{sub.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Appointment Type */}
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Tip sestanka</label>
                        <select
                          value={d365AppointmentType || 'face_to_face'}
                          onChange={(e) => onD365AppointmentTypeChange?.(e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                        >
                          {D365_APPOINTMENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Time range */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-600 block mb-1">Začetek</label>
                          <input
                            type="time"
                            value={d365StartTime || '09:00'}
                            onChange={(e) => onD365StartTimeChange?.(e.target.value)}
                            className="w-full px-2 py-1.5 border rounded text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-600 block mb-1">Konec</label>
                          <input
                            type="time"
                            value={d365EndTime || '09:30'}
                            onChange={(e) => onD365EndTimeChange?.(e.target.value)}
                            className="w-full px-2 py-1.5 border rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes list */}
            {isLoadingNotes ? (
              <div className="text-center py-2 text-gray-500 text-sm">Nalagam opombe...</div>
            ) : companyNotes && companyNotes.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {companyNotes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3 relative group">
                    {editingNoteId === note.id ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={editingDate}
                            onChange={(e) => setEditingDate(e.target.value)}
                            className="px-2 py-1 border rounded text-sm flex-1"
                          />
                          <button
                            onClick={saveEditing}
                            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                            title="Shrani"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            title="Prekliči"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                          rows={3}
                          autoFocus
                        />

                        {/* D365 Fields for editing - only show when company is in D365 */}
                        {company.is_in_d365 && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => setShowEditD365Fields(!showEditD365Fields)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <ChevronDown size={14} className={`transform transition-transform ${showEditD365Fields ? 'rotate-180' : ''}`} />
                              D365 polja {editingD365Category ? '✓' : ''}
                            </button>

                            {showEditD365Fields && (
                              <div className="mt-2 p-2 bg-blue-50 rounded-lg space-y-2">
                                {/* Category */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Kategorija</label>
                                  <select
                                    value={editingD365Category}
                                    onChange={(e) => setEditingD365Category(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                                  >
                                    <option value="">-- Izberi --</option>
                                    {D365_ACTIVITY_CATEGORIES.map(cat => (
                                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Subcategory */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Podkategorija</label>
                                  <select
                                    value={editingD365Subcategory}
                                    onChange={(e) => setEditingD365Subcategory(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                                  >
                                    <option value="">-- Izberi --</option>
                                    {D365_SUBCATEGORIES.map(sub => (
                                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Appointment Type */}
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">Tip sestanka</label>
                                  <select
                                    value={editingD365AppointmentType}
                                    onChange={(e) => setEditingD365AppointmentType(e.target.value)}
                                    className="w-full px-2 py-1.5 border rounded text-sm bg-white"
                                  >
                                    {D365_APPOINTMENT_TYPES.map(type => (
                                      <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Time range */}
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="text-xs text-gray-600 block mb-1">Začetek</label>
                                    <input
                                      type="time"
                                      value={editingD365StartTime}
                                      onChange={(e) => setEditingD365StartTime(e.target.value)}
                                      className="w-full px-2 py-1.5 border rounded text-sm"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-xs text-gray-600 block mb-1">Konec</label>
                                    <input
                                      type="time"
                                      value={editingD365EndTime}
                                      onChange={(e) => setEditingD365EndTime(e.target.value)}
                                      className="w-full px-2 py-1.5 border rounded text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        <div className="flex items-start justify-between">
                          <div className="text-xs text-gray-500 font-medium mb-1">
                            {new Date(note.note_date).toLocaleDateString('sl-SI', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            <span className="text-gray-400 ml-2">
                              {new Date(note.created_at).toLocaleTimeString('sl-SI', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(note)}
                              className="text-blue-400 hover:text-blue-600 p-1"
                              title="Uredi"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteNote(note.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                              title="Izbriši"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</div>
                        {/* D365 indicator badge */}
                        {note.activity_category && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              D365 ✓
                            </span>
                            <span className="text-xs text-gray-400">
                              {D365_ACTIVITY_CATEGORIES.find(c => c.value === note.activity_category)?.label || note.activity_category}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-2">Ni opomb</p>
            )}
          </div>

          {/* Stats */}
          {company.cycleStats.total > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{company.cycleStats.onTest}</div>
                <div className="text-xs text-gray-500">Na testu</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xl font-bold text-green-600">{company.cycleStats.signed}</div>
                <div className="text-xs text-gray-500">Pogodb</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xl font-bold text-gray-600">{company.cycleStats.total}</div>
                <div className="text-xs text-gray-500">Skupaj</div>
              </div>
            </div>
          )}

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Kontaktne osebe</h4>
              <button
                onClick={onShowAddContact}
                className="text-sm text-blue-500 flex items-center gap-1"
              >
                <Plus size={16} /> Dodaj
              </button>
            </div>

            {company.contacts.length === 0 ? (
              <p className="text-gray-500 text-sm">Ni kontaktnih oseb</p>
            ) : (
              <div className="space-y-2">
                {company.contacts.map(contact => (
                  <div key={contact.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          {contact.first_name} {contact.last_name}
                          {contact.is_primary && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Glavni</span>
                          )}
                        </div>
                        {contact.role && (
                          <div className="text-sm text-gray-500">{contact.role}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditContact(contact)}
                          className="text-blue-500 p-1 hover:text-blue-700"
                          title="Uredi kontakt"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteContact(contact.id)}
                          className="text-red-500 p-1 hover:text-red-700"
                          title="Izbriši kontakt"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-sm text-blue-600"
                          title="Mobilni telefon"
                        >
                          <Phone size={14} /> {contact.phone}
                        </a>
                      )}
                      {contact.work_phone && (
                        <a
                          href={`tel:${contact.work_phone}`}
                          className="flex items-center gap-1 text-sm text-green-600"
                          title="Službeni telefon"
                        >
                          <Building2 size={14} /> {contact.work_phone}
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-sm text-purple-600"
                        >
                          <Mail size={14} /> {contact.email}
                        </a>
                      )}
                    </div>
                    {contact.contact_since && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        Kontakt od: {new Date(contact.contact_since).toLocaleDateString('sl-SI')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cycles History */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package size={18} className="text-gray-400" />
              Zgodovina predpražnikov
            </h4>

            {isLoadingDetails ? (
              <div className="text-center py-4 text-gray-500 text-sm">Nalagam...</div>
            ) : !companyDetails?.cycles || companyDetails.cycles.length === 0 ? (
              <p className="text-gray-500 text-sm">Ni zgodovine predpražnikov</p>
            ) : (
              <div className="space-y-2">
                {companyDetails.cycles.map((cycle) => {
                  const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
                    on_test: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Na testu' },
                    completed: { icon: CheckCircle, color: 'text-gray-600 bg-gray-100', label: 'Zaključen' },
                    clean: { icon: Package, color: 'text-green-600 bg-green-50', label: 'Čist' },
                  };
                  const status = statusConfig[cycle.status] || statusConfig.clean;
                  const StatusIcon = status.icon;

                  return (
                    <div key={cycle.id} className={`rounded-lg p-3 ${status.color.split(' ')[1]}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {cycle.mat_type?.name || 'Predpražnik'}
                            <span className="text-xs text-gray-500">
                              ({cycle.qr_code?.code || 'N/A'})
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(cycle.created_at).toLocaleDateString('sl-SI')}
                            {cycle.test_end_date && (
                              <span className="text-gray-400">
                                {' → '}{new Date(cycle.test_end_date).toLocaleDateString('sl-SI')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                          {cycle.contract_signed && (
                            <span className="ml-1">✅</span>
                          )}
                        </div>
                      </div>
                      {cycle.notes && (
                        <div className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                          <FileText size={12} className="mt-0.5 flex-shrink-0" />
                          {cycle.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sent Offers */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText size={18} className="text-gray-400" />
              Poslane ponudbe
            </h4>

            {loadingSentOffers ? (
              <div className="text-center py-4 text-gray-500 text-sm">Nalagam...</div>
            ) : sentOffers.length === 0 ? (
              <p className="text-gray-500 text-sm">Ni poslanih ponudb</p>
            ) : (
              <div className="space-y-2">
                {sentOffers.map((offer) => {
                  const offerTypeLabel = offer.offer_type === 'rental' ? 'Najem' :
                    offer.offer_type === 'purchase' ? 'Nakup' : 'Najem + Nakup';
                  const frequencyLabel = offer.frequency ? `${offer.frequency} ${offer.frequency === '1' ? 'teden' : 'tedna'}` : '';
                  const hasContract = savedContracts.some(c => c.offer_id === offer.id);

                  return (
                    <div key={offer.id} className={`rounded-lg p-3 ${hasContract ? 'bg-green-50 border border-green-200' : 'bg-purple-50'}`}>
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => onViewOffer(offer)}
                        >
                          <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              offer.offer_type === 'rental' ? 'bg-blue-100 text-blue-700' :
                              offer.offer_type === 'purchase' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {offerTypeLabel}
                            </span>
                            {frequencyLabel && <span className="text-gray-500 text-xs">{frequencyLabel}</span>}
                            {hasContract && (
                              <span className="px-2 py-0.5 rounded text-xs bg-green-500 text-white flex items-center gap-1">
                                <FileSignature size={10} />
                                Pogodba
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(offer.sent_at).toLocaleDateString('sl-SI')}
                            <span className="text-gray-400 ml-2">{offer.recipient_email}</span>
                          </div>
                          {offer.items && offer.items.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {offer.items.length} artikel{offer.items.length > 1 ? 'ov' : ''}
                              {offer.items.map((item) => item.notes).filter(Boolean).slice(0, 2).join(', ') && (
                                <span className="text-gray-400"> • {offer.items.map((item) => item.notes).filter(Boolean).slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                          )}
                          {hasContract && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <FileSignature size={12} />
                              Pogodba generirana {new Date(savedContracts.find(c => c.offer_id === offer.id)?.generated_at || '').toLocaleDateString('sl-SI')}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSentOffer(offer.id);
                          }}
                          className="text-red-500 p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={onOpenOffer}
              className="w-full py-3 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
            >
              <Euro size={18} /> Pošlji ponudbo
            </button>
            <div className="grid grid-cols-2 gap-2">
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center gap-2"
                >
                  <MapPin size={18} /> Navigacija
                </a>
              )}
              <button
                onClick={onNavigateToSeller}
                className="py-3 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center gap-2"
              >
                <Camera size={18} /> Dodaj predpražnik
              </button>
            </div>
          </div>

          {/* Delete Company */}
          {onDeleteCompany && (
            <div className="pt-4 border-t">
              <button
                onClick={onDeleteCompany}
                className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <Trash2 size={18} /> Izbriši stranko
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

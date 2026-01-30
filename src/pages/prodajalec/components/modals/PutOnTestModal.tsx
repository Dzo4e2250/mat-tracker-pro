/**
 * @file PutOnTestModal.tsx
 * @description Modal za dajanje predpražnika na test
 */

import { MapPin, Users, X, AlertTriangle, FileCheck, Package } from 'lucide-react';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { getCityByPostalCode } from '@/utils/postalCodes';

interface CycleHistoryItem {
  id: string;
  notes: string | null;
  status: string;
  test_start_date: string | null;
  salesperson?: {
    first_name: string;
    last_name: string;
  };
}

interface PutOnTestModalProps {
  formData: any;
  setFormData: (data: any) => void;
  companies: CompanyWithContacts[] | undefined;
  companyHistoryData: CycleHistoryItem[] | undefined;
  taxLookupLoading: boolean;
  isPending: boolean;
  onTaxLookup: () => Promise<void>;
  onPutOnTest: () => Promise<void>;
  onOpenCompanySelect: () => void;
  onClearCompany: () => void;
  onBack: () => void;
}

export default function PutOnTestModal({
  formData,
  setFormData,
  companies,
  companyHistoryData,
  taxLookupLoading,
  isPending,
  onTaxLookup,
  onPutOnTest,
  onOpenCompanySelect,
  onClearCompany,
  onBack,
}: PutOnTestModalProps) {
  const selectedCompany = companies?.find(c => c.id === formData.companyId);
  const contacts = selectedCompany?.contacts || [];

  // Check for existing tests and signed contract
  const hasSignedContract = selectedCompany?.contract_signed === true;
  const activeTestsCount = selectedCompany?.cycleStats?.onTest || 0;
  const hasActiveTests = activeTestsCount > 0;
  const showWarning = hasSignedContract || hasActiveTests;

  // Get active test details from history
  const activeTests = companyHistoryData?.filter(c => c.status === 'on_test') || [];

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Daj na test</h3>
      <div className="space-y-3">
        {/* Company selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Podjetje</label>
          {formData.companyId ? (
            // Selected company display
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-blue-900">
                    {selectedCompany?.display_name || selectedCompany?.name || formData.clientName}
                  </div>
                  {selectedCompany?.address_city && (
                    <div className="text-xs text-blue-700 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} />
                      {selectedCompany.address_city}
                      {selectedCompany.tax_number && <span className="text-blue-500 ml-2">{selectedCompany.tax_number}</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClearCompany}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            // Button to open company select modal
            <button
              type="button"
              onClick={onOpenCompanySelect}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Users size={18} />
              Izberi obstoječe podjetje
            </button>
          )}
          {!formData.companyId && (
            <p className="text-xs text-gray-500 mt-1 text-center">ali pusti prazno za novo podjetje</p>
          )}
        </div>

        {/* WARNING: Existing tests or signed contract */}
        {formData.companyId && showWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-bold">
              <AlertTriangle size={20} className="text-red-600" />
              POZOR - Obstoječi podatki!
            </div>

            {hasSignedContract && (
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-red-200">
                <FileCheck size={18} className="text-green-600" />
                <span className="text-sm">
                  <span className="font-medium text-green-700">Pogodba podpisana</span>
                  {selectedCompany?.contract_signed_at && (
                    <span className="text-gray-500 ml-1">
                      ({new Date(selectedCompany.contract_signed_at).toLocaleDateString('sl-SI')})
                    </span>
                  )}
                </span>
              </div>
            )}

            {hasActiveTests && (
              <div className="bg-white p-2 rounded border border-red-200 space-y-1">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {activeTestsCount} {activeTestsCount === 1 ? 'predpražnik' : activeTestsCount < 5 ? 'predpražniki' : 'predpražnikov'} na testu
                  </span>
                </div>
                {activeTests.length > 0 && (
                  <div className="text-xs text-gray-600 pl-6 space-y-0.5">
                    {activeTests.slice(0, 3).map((test) => (
                      <div key={test.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        <span>
                          Od {test.test_start_date ? new Date(test.test_start_date).toLocaleDateString('sl-SI') : 'neznan datum'}
                          {test.salesperson && ` (${test.salesperson.first_name})`}
                        </span>
                      </div>
                    ))}
                    {activeTests.length > 3 && (
                      <div className="text-gray-400">... in {activeTests.length - 3} več</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-red-600 font-medium pt-1 border-t border-red-200">
              Ali res želiš dodati nov test predpražnik?
            </div>
          </div>
        )}

        {/* Show existing contacts when company is selected */}
        {formData.companyId && contacts.length > 0 && (
          <div className="bg-green-50 p-3 rounded-lg space-y-3">
            <h4 className="font-medium text-sm text-green-700">Obstoječi kontakti</h4>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                    formData.contactId === contact.id
                      ? 'bg-green-100 border-green-500'
                      : 'bg-white border-gray-200 hover:border-green-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="existingContact"
                    checked={formData.contactId === contact.id}
                    onChange={() => setFormData({
                      ...formData,
                      contactId: contact.id,
                      useExistingContact: true,
                    })}
                    className="text-green-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {contact.first_name} {contact.last_name}
                      {contact.role && <span className="text-gray-500 font-normal"> ({contact.role})</span>}
                    </div>
                    {contact.phone && (
                      <div className="text-xs text-gray-600">📞 {contact.phone}</div>
                    )}
                    {contact.email && (
                      <div className="text-xs text-gray-600">✉️ {contact.email}</div>
                    )}
                  </div>
                </label>
              ))}
              <label
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                  formData.contactId === 'new'
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="existingContact"
                  checked={formData.contactId === 'new'}
                  onChange={() => setFormData({
                    ...formData,
                    contactId: 'new',
                    useExistingContact: false,
                  })}
                  className="text-blue-600"
                />
                <div className="font-medium text-sm text-blue-700">+ Dodaj nov kontakt</div>
              </label>
            </div>
          </div>
        )}

        {/* Show no contacts message */}
        {formData.companyId && contacts.length === 0 && (
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-700">Podjetje nima shranjenih kontaktov.</p>
          </div>
        )}

        {/* Show previous cycle notes for this company */}
        {formData.companyId && companyHistoryData && companyHistoryData.length > 0 && (
          <div className="bg-amber-50 p-3 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-amber-700 flex items-center gap-2">
              📝 Zgodovina in zapiski
              <span className="text-xs font-normal text-amber-600">({companyHistoryData.length})</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {companyHistoryData.filter(c => c.notes).map((cycle) => (
                <div key={cycle.id} className="bg-white p-2 rounded border border-amber-200 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      cycle.status === 'dirty' ? 'bg-red-100 text-red-700' :
                      cycle.status === 'completed' ? 'bg-green-100 text-green-700' :
                      cycle.status === 'on_test' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {cycle.status === 'dirty' ? 'Neuspel' :
                       cycle.status === 'completed' ? 'Zaključen' :
                       cycle.status === 'on_test' ? 'Na testu' :
                       cycle.status}
                    </span>
                    {cycle.salesperson && (
                      <span className="text-xs text-gray-500">
                        {cycle.salesperson.first_name} {cycle.salesperson.last_name}
                      </span>
                    )}
                    {cycle.test_start_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(cycle.test_start_date).toLocaleDateString('sl-SI')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{cycle.notes}</p>
                </div>
              ))}
              {companyHistoryData.filter(c => c.notes).length === 0 && (
                <p className="text-xs text-amber-600 italic">Ni zapiskov iz prejšnjih poskusov.</p>
              )}
            </div>
          </div>
        )}

        {/* Show new contact form when: 1) new company OR 2) existing company but "new contact" selected */}
        {(!formData.companyId || formData.contactId === 'new') && (
          <>
            {/* Only show company fields when creating new company */}
            {!formData.companyId && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Novo podjetje</h4>

              <div>
                <label className="block text-sm font-medium mb-1">Davčna številka</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="12345678"
                    value={formData.taxNumber || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^SI/i, '').replace(/\s/g, '');
                      setFormData({ ...formData, taxNumber: value });
                      if (/^\d{8}$/.test(value) && !taxLookupLoading) {
                        setTimeout(() => onTaxLookup(), 100);
                      }
                    }}
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={onTaxLookup}
                    disabled={taxLookupLoading || !formData.taxNumber}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300"
                  >
                    {taxLookupLoading ? '...' : 'Izpolni'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Vnesi 8 števk → avtomatsko izpolni</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ime podjetja *</label>
                <input
                  type="text"
                  placeholder="ABC d.o.o."
                  value={formData.clientName || ''}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ime na lokaciji</label>
                <input
                  type="text"
                  placeholder="Hotel Draš (opcijsko)"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Če se razlikuje od uradnega imena</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ulica in hišna številka</label>
                <input
                  type="text"
                  placeholder="Slovenska cesta 1"
                  value={formData.addressStreet || ''}
                  onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Pošta</label>
                  <input
                    type="text"
                    placeholder="1000"
                    value={formData.addressPostal || ''}
                    onChange={(e) => {
                      const postal = e.target.value;
                      const city = getCityByPostalCode(postal);
                      setFormData({
                        ...formData,
                        addressPostal: postal,
                        ...(city && { addressCity: city })
                      });
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Kraj</label>
                  <input
                    type="text"
                    placeholder="Ljubljana"
                    value={formData.addressCity || ''}
                    onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg space-y-3">
              <h4 className="font-medium text-sm text-blue-700">
                {formData.companyId ? 'Nov kontakt' : 'Kontaktna oseba'}
              </h4>

              <div>
                <label className="block text-sm font-medium mb-1">Ime in priimek</label>
                <input
                  type="text"
                  placeholder="Janez Novak"
                  value={formData.contactPerson || ''}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Telefon</label>
                  <input
                    type="tel"
                    placeholder="041 123 456"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vloga</label>
                  <select
                    value={formData.contactRole || ''}
                    onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Izberi...</option>
                    <option value="Vodja nabave">Vodja nabave</option>
                    <option value="Direktor">Direktor</option>
                    <option value="Lastnik">Lastnik</option>
                    <option value="Tajnica">Tajnica</option>
                    <option value="Drugo">Drugo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  placeholder="kontakt@podjetje.si"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isDecisionMaker || false}
                  onChange={(e) => setFormData({ ...formData, isDecisionMaker: e.target.checked })}
                  className="rounded"
                />
                Je odločevalna oseba
              </label>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Opombe</label>
          <textarea
            placeholder="Dodatne opombe..."
            value={formData.comment || ''}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      </div>

      <button
        onClick={onPutOnTest}
        disabled={(!formData.companyId && !formData.clientName) || isPending}
        className="w-full bg-blue-500 text-white py-2 rounded mt-4 disabled:bg-gray-300"
      >
        {isPending ? 'Shranjevanje...' : 'Potrdi'}
      </button>
      <button
        onClick={onBack}
        className="w-full mt-2 py-2 border rounded"
      >
        Nazaj
      </button>
    </div>
  );
}

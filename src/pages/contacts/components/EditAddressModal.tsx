/**
 * @file EditAddressModal.tsx
 * @description Modal za urejanje podjetja - ime, naslov, poslovalnica in hierarhija
 */

import { X, Building2, MapPin, GitBranch } from 'lucide-react';
import { getCityByPostalCode } from '@/utils/postalCodes';

// Form data za urejanje podjetja
export interface EditAddressFormData {
  companyName?: string;
  displayName?: string;
  taxNumber?: string;
  addressStreet?: string;
  addressPostal?: string;
  addressCity?: string;
  hasDifferentDeliveryAddress?: boolean;
  deliveryAddress?: string;
  deliveryPostal?: string;
  deliveryCity?: string;
  parentCompanyId?: string | null;
}

// Tip za izbiro matičnega podjetja
interface ParentCompanyOption {
  id: string;
  name: string;
  display_name?: string;
}

interface EditAddressModalProps {
  formData: EditAddressFormData;
  onFormDataChange: (data: EditAddressFormData) => void;
  onSave: () => void;
  onClose: () => void;
  showCompanyFields?: boolean; // Za prikaz polj za urejanje imena podjetja
  taxLookupLoading?: boolean;
  onTaxLookup?: () => void;
  availableParentCompanies?: ParentCompanyOption[]; // Seznam podjetij za izbiro matičnega
  currentCompanyId?: string; // ID trenutnega podjetja (da ga izključimo iz seznama)
}

/**
 * Modal za urejanje podjetja
 * - Ime podjetja (za osnutke)
 * - Sedež podjetja (registrirani naslov)
 * - Poslovalnica (opcijski drugi naslov za dostavo)
 */
export default function EditAddressModal({
  formData,
  onFormDataChange,
  onSave,
  onClose,
  showCompanyFields = false,
  taxLookupLoading = false,
  onTaxLookup,
  availableParentCompanies = [],
  currentCompanyId,
}: EditAddressModalProps) {

  const handlePostalChange = (postal: string, isDelivery: boolean = false) => {
    const city = getCityByPostalCode(postal);
    if (isDelivery) {
      onFormDataChange({
        ...formData,
        deliveryPostal: postal,
        ...(city && { deliveryCity: city })
      });
    } else {
      onFormDataChange({
        ...formData,
        addressPostal: postal,
        ...(city && { addressCity: city })
      });
    }
  };

  // Preveri če je osnutek (ime se začne z "Osnutek:")
  const isOsnutek = formData.companyName?.startsWith('Osnutek:') || formData.displayName?.startsWith('Osnutek:');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">{showCompanyFields || isOsnutek ? 'Uredi podjetje' : 'Uredi naslove'}</h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Podatki podjetja - vedno prikazani */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm text-blue-700 flex items-center gap-2">
              <Building2 size={16} />
              Podatki podjetja
            </h4>
            {isOsnutek && (
              <p className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                To je osnutek. Dopolnite ime podjetja, da ga pretvorite v pravo stranko.
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Davčna številka</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.taxNumber || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^SI/i, '').replace(/\s/g, '');
                      onFormDataChange({ ...formData, taxNumber: value });
                      // Avtomatsko poišči ko je 8 števk
                      if (/^\d{8}$/.test(value) && !taxLookupLoading && onTaxLookup) {
                        setTimeout(() => onTaxLookup(), 100);
                      }
                    }}
                    className="flex-1 p-3 border rounded-lg"
                    placeholder="12345678"
                  />
                  {onTaxLookup && (
                    <button
                      type="button"
                      onClick={onTaxLookup}
                      disabled={taxLookupLoading || !formData.taxNumber}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:bg-gray-300"
                    >
                      {taxLookupLoading ? '...' : 'Izpolni'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Vnesi davčno in klikni "Izpolni" za avtomatsko izpolnitev</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Uradno ime podjetja</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => onFormDataChange({ ...formData, companyName: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="npr. PODJETJE d.o.o."
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Prikazno ime (opcijsko)</label>
                <input
                  type="text"
                  value={formData.displayName || ''}
                  onChange={(e) => onFormDataChange({ ...formData, displayName: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="npr. Gostilna Pri Franciju"
                />
                <p className="text-xs text-gray-400 mt-1">Krajše ime za lažje iskanje</p>
              </div>
            </div>
          </div>

          {/* Hierarhija podjetja */}
          {availableParentCompanies.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-3 space-y-3">
              <h4 className="font-medium text-sm text-purple-700 flex items-center gap-2">
                <GitBranch size={16} />
                Hierarhija podjetja
              </h4>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Matično podjetje</label>
                <select
                  value={formData.parentCompanyId || ''}
                  onChange={(e) => onFormDataChange({ ...formData, parentCompanyId: e.target.value || null })}
                  className="w-full p-3 border rounded-lg bg-white"
                >
                  <option value="">Brez matičnega podjetja</option>
                  {availableParentCompanies
                    .filter(c => c.id !== currentCompanyId) // Izključi samega sebe
                    .map(company => (
                      <option key={company.id} value={company.id}>
                        {company.display_name || company.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Izberi matično podjetje če je to hčerinsko podjetje / podružnica
                </p>
              </div>
            </div>
          )}

          {/* Sedež podjetja */}
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Sedež podjetja (registrirani naslov)
            </h4>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.addressStreet || ''}
                onChange={(e) => onFormDataChange({ ...formData, addressStreet: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="Ulica in hišna številka"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={formData.addressPostal || ''}
                  onChange={(e) => handlePostalChange(e.target.value, false)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Pošta"
                />
                <input
                  type="text"
                  value={formData.addressCity || ''}
                  onChange={(e) => onFormDataChange({ ...formData, addressCity: e.target.value })}
                  className="col-span-2 w-full p-3 border rounded-lg"
                  placeholder="Kraj"
                />
              </div>
            </div>
          </div>

          {/* Naslov poslovalnice */}
          <div className="bg-amber-50 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasDifferentDeliveryAddress || false}
                onChange={(e) => onFormDataChange({ ...formData, hasDifferentDeliveryAddress: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Poslovalnica na drugem naslovu</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">Naslov kamor gre šofer po predpražnike</p>

            {formData.hasDifferentDeliveryAddress && (
              <div className="mt-3 space-y-3 pl-6 border-l-2 border-amber-300">
                <input
                  type="text"
                  value={formData.deliveryAddress || ''}
                  onChange={(e) => onFormDataChange({ ...formData, deliveryAddress: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Ulica poslovalnice"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.deliveryPostal || ''}
                    onChange={(e) => handlePostalChange(e.target.value, true)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Pošta"
                  />
                  <input
                    type="text"
                    value={formData.deliveryCity || ''}
                    onChange={(e) => onFormDataChange({ ...formData, deliveryCity: e.target.value })}
                    className="col-span-2 w-full p-3 border rounded-lg"
                    placeholder="Kraj"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onSave}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
          >
            Shrani naslove
          </button>
        </div>
      </div>
    </div>
  );
}

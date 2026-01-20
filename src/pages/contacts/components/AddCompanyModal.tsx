/**
 * @file AddCompanyModal.tsx
 * @description Modal za dodajanje nove stranke (podjetja) s kontaktno osebo
 */

import { X, QrCode } from 'lucide-react';
import { getCityByPostalCode } from '@/utils/postalCodes';

// Form data za novo stranko
export interface AddCompanyFormData {
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
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface AddCompanyModalProps {
  formData: AddCompanyFormData;
  onFormDataChange: (data: AddCompanyFormData) => void;
  taxLookupLoading: boolean;
  onTaxLookup: () => void;
  isLoading: boolean;
  onSubmit: () => void;
  onOpenQRScanner: () => void;
  onClose: () => void;
}

/**
 * Modal za dodajanje stranke
 * - Podjetje (ime, davčna, naslov)
 * - Poslovalnica (opcijski drugi naslov)
 * - Kontaktna oseba
 * - QR skener gumb
 */
export default function AddCompanyModal({
  formData,
  onFormDataChange,
  taxLookupLoading,
  onTaxLookup,
  isLoading,
  onSubmit,
  onOpenQRScanner,
  onClose,
}: AddCompanyModalProps) {

  const updateField = (field: keyof AddCompanyFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Dodaj stranko</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQRScanner}
              className="p-2 bg-purple-100 text-purple-600 rounded-lg flex items-center gap-1"
              title="Skeniraj QR kodo vizitke"
            >
              <QrCode size={20} />
            </button>
            <button onClick={onClose} className="p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Navodilo za hiter vnos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Hiter vnos:</strong> Vnesi samo kar veš - ime lokacije in/ali kontakt s telefonom. Dopolniš lahko kasneje.
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ime podjetja</label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => updateField('companyName', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="ABC d.o.o. (če veš)"
            />
            <p className="text-xs text-gray-500 mt-1">Če ne veš, pusti prazno - shrani se kot osnutek</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ime na lokaciji</label>
            <input
              type="text"
              value={formData.displayName || ''}
              onChange={(e) => updateField('displayName', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Hotel Lipa, Gostilna pri Marici..."
            />
            <p className="text-xs text-gray-500 mt-1">Ime poslovalnice, lokala, hotela...</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Davčna številka</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.taxNumber || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/^SI/i, '').replace(/\s/g, '');
                  updateField('taxNumber', value);
                  // Avtomatsko poišči ko je 8 števk
                  if (/^\d{8}$/.test(value) && !taxLookupLoading) {
                    setTimeout(() => onTaxLookup(), 100);
                  }
                }}
                className="flex-1 p-3 border rounded-lg"
                placeholder="12345678"
              />
              <button
                type="button"
                onClick={onTaxLookup}
                disabled={taxLookupLoading || !formData.taxNumber}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:bg-gray-300"
              >
                {taxLookupLoading ? '...' : 'Izpolni'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Avtomatsko izpolni ali klikni "Izpolni"</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ulica</label>
            <input
              type="text"
              value={formData.addressStreet || ''}
              onChange={(e) => updateField('addressStreet', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Slovenska cesta 1"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Pošta</label>
              <input
                type="text"
                value={formData.addressPostal || ''}
                onChange={(e) => handlePostalChange(e.target.value, false)}
                className="w-full p-3 border rounded-lg"
                placeholder="1000"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Kraj</label>
              <input
                type="text"
                value={formData.addressCity || ''}
                onChange={(e) => updateField('addressCity', e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Ljubljana"
              />
            </div>
          </div>

          {/* Naslov poslovalnice */}
          <div className="bg-amber-50 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasDifferentDeliveryAddress || false}
                onChange={(e) => updateField('hasDifferentDeliveryAddress', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Poslovalnica na drugem naslovu</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">Obkljukaj če se naslov dostave razlikuje od sedeža podjetja</p>

            {formData.hasDifferentDeliveryAddress && (
              <div className="mt-3 space-y-3 pl-6 border-l-2 border-amber-300">
                <div>
                  <label className="block text-sm font-medium mb-1">Ulica poslovalnice</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress || ''}
                    onChange={(e) => updateField('deliveryAddress', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Industrijska cesta 5"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pošta</label>
                    <input
                      type="text"
                      value={formData.deliveryPostal || ''}
                      onChange={(e) => handlePostalChange(e.target.value, true)}
                      className="w-full p-3 border rounded-lg"
                      placeholder="1000"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Kraj</label>
                    <input
                      type="text"
                      value={formData.deliveryCity || ''}
                      onChange={(e) => updateField('deliveryCity', e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Ljubljana"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Kontaktna oseba</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ime in priimek</label>
                <input
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => updateField('contactName', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Janez Novak"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vloga</label>
                <input
                  type="text"
                  value={formData.contactRole || ''}
                  onChange={(e) => updateField('contactRole', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Direktor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.contactPhone || ''}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="040 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="janez@podjetje.si"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300"
          >
            {isLoading ? 'Shranjujem...' : 'Dodaj stranko'}
          </button>
        </div>
      </div>
    </div>
  );
}

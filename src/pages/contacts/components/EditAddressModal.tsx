/**
 * @file EditAddressModal.tsx
 * @description Modal za urejanje naslova podjetja in poslovalnice
 */

import { X } from 'lucide-react';
import { getCityByPostalCode } from '@/utils/postalCodes';

// Form data za urejanje naslovov
export interface EditAddressFormData {
  addressStreet?: string;
  addressPostal?: string;
  addressCity?: string;
  hasDifferentDeliveryAddress?: boolean;
  deliveryAddress?: string;
  deliveryPostal?: string;
  deliveryCity?: string;
}

interface EditAddressModalProps {
  formData: EditAddressFormData;
  onFormDataChange: (data: EditAddressFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Modal za urejanje naslovov
 * - Sedež podjetja (registrirani naslov)
 * - Poslovalnica (opcijski drugi naslov za dostavo)
 */
export default function EditAddressModal({
  formData,
  onFormDataChange,
  onSave,
  onClose,
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Uredi naslove</h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Sedež podjetja */}
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Sedež podjetja (registrirani naslov)</h4>
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

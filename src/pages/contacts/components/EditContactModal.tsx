/**
 * @file EditContactModal.tsx
 * @description Modal za urejanje obstoječega kontakta
 */

import { X } from 'lucide-react';

// Form data za urejanje kontakta
export interface EditContactFormData {
  first_name?: string;
  last_name?: string;
  role?: string;
  phone?: string;
  work_phone?: string;
  email?: string;
  contact_since?: string;
  is_primary?: boolean;
  location_address?: string;
}

interface EditContactModalProps {
  formData: EditContactFormData;
  onFormDataChange: (data: EditContactFormData) => void;
  isLoading: boolean;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Modal za urejanje kontakta
 * - Ime, priimek, vloga
 * - Telefon, email
 * - Datum kontakta, glavna oseba
 * - Opcijska lokacija
 */
export default function EditContactModal({
  formData,
  onFormDataChange,
  isLoading,
  onSave,
  onClose,
}: EditContactModalProps) {

  const updateField = (field: keyof EditContactFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Uredi kontakt</h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ime *</label>
              <input
                type="text"
                value={formData.first_name || ''}
                onChange={(e) => updateField('first_name', e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Ana"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priimek</label>
              <input
                type="text"
                value={formData.last_name || ''}
                onChange={(e) => updateField('last_name', e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Horvat"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vloga</label>
            <input
              type="text"
              value={formData.role || ''}
              onChange={(e) => updateField('role', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Vodja nabave"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mobilni telefon</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="040 123 456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Službeni telefon</label>
            <input
              type="tel"
              value={formData.work_phone || ''}
              onChange={(e) => updateField('work_phone', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="01 234 56 78"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="ana@podjetje.si"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kontakt od</label>
            <input
              type="date"
              value={formData.contact_since || ''}
              onChange={(e) => updateField('contact_since', e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Od kdaj imate ta kontakt</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_primary || false}
                onChange={(e) => updateField('is_primary', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Glavni kontakt</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Druga lokacija (poslovalnica)</label>
            <input
              type="text"
              value={formData.location_address || ''}
              onChange={(e) => updateField('location_address', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Naslov poslovalnice (opcijsko)"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              Prekliči
            </button>
            <button
              onClick={onSave}
              disabled={isLoading}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300"
            >
              {isLoading ? 'Shranjujem...' : 'Shrani'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @file AddContactModal.tsx
 * @description Modal za dodajanje novega kontakta k obstoječemu podjetju
 */

import { X } from 'lucide-react';

// Form data za nov kontakt
export interface AddContactFormData {
  newContactName?: string;
  newContactRole?: string;
  newContactPhone?: string;
  newContactWorkPhone?: string;
  newContactEmail?: string;
  newContactSince?: string;
  hasDifferentLocation?: boolean;
  newContactLocation?: string;
}

interface AddContactModalProps {
  formData: AddContactFormData;
  onFormDataChange: (data: AddContactFormData) => void;
  isLoading: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Modal za dodajanje kontakta
 * - Ime, vloga, telefon, email
 * - Datum "kontakt od" za segmentacijo
 * - Opcijska druga lokacija
 */
export default function AddContactModal({
  formData,
  onFormDataChange,
  isLoading,
  onSubmit,
  onClose,
}: AddContactModalProps) {

  const updateField = (field: keyof AddContactFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Dodaj kontakt</h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Ime in priimek *</label>
            <input
              type="text"
              value={formData.newContactName || ''}
              onChange={(e) => updateField('newContactName', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Ana Horvat"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vloga</label>
            <input
              type="text"
              value={formData.newContactRole || ''}
              onChange={(e) => updateField('newContactRole', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Vodja nabave"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mobilni telefon</label>
            <input
              type="tel"
              value={formData.newContactPhone || ''}
              onChange={(e) => updateField('newContactPhone', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="040 123 456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Službeni telefon</label>
            <input
              type="tel"
              value={formData.newContactWorkPhone || ''}
              onChange={(e) => updateField('newContactWorkPhone', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="01 234 56 78"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.newContactEmail || ''}
              onChange={(e) => updateField('newContactEmail', e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="ana@podjetje.si"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kontakt od</label>
            <input
              type="date"
              value={formData.newContactSince || ''}
              onChange={(e) => updateField('newContactSince', e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Od kdaj imate ta kontakt (za segmentacijo)</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasDifferentLocation || false}
                onChange={(e) => updateField('hasDifferentLocation', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Druga lokacija (poslovalnica)</span>
            </label>
            {formData.hasDifferentLocation && (
              <input
                type="text"
                placeholder="Naslov poslovalnice"
                value={formData.newContactLocation || ''}
                onChange={(e) => updateField('newContactLocation', e.target.value)}
                className="w-full p-3 border rounded-lg mt-2"
              />
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300"
          >
            {isLoading ? 'Shranjujem...' : 'Dodaj kontakt'}
          </button>
        </div>
      </div>
    </div>
  );
}

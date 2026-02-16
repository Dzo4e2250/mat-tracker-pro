/**
 * @file DeliveryInfoModal.tsx
 * @description Modal za pripravo in generiranje PDF dokumenta "Informacija o dostavnem mestu"
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Truck, FileText, Image, ClipboardPaste } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  useDeliveryInfoForm,
  useDeliveryInfoPdf,
  type DeliveryInfoModalProps,
} from './deliveryInfo';

export default function DeliveryInfoModal({
  isOpen,
  onClose,
  company,
  contacts = [],
}: DeliveryInfoModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    formData,
    sortedContacts,
    updateField,
    handlePostalChange,
    handleContactChange,
    clearSecondaryContact,
    addImage,
    removeImage,
    getInputClass,
    filledCount,
    totalCount,
  } = useDeliveryInfoForm({
    isOpen,
    company,
    contacts,
  });

  const { generatePdf, downloadPdf, generateFileName } = useDeliveryInfoPdf();

  // Handle clipboard paste for images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();

    imageItems.forEach(item => {
      const blob = item.getAsFile();
      if (!blob) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          addImage(dataUrl);
        }
      };
      reader.readAsDataURL(blob);
    });
  }, [addImage]);

  // Add paste event listener when modal is open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isOpen, handlePaste]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await generatePdf(formData);
      const fileName = generateFileName(formData.companyName);
      downloadPdf(pdfBlob, fileName);

      toast({ description: 'PDF dokument uspešno generiran!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ description: 'Napaka pri generiranju PDF dokumenta.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = (field: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm transition-colors ${getInputClass(field as any)}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-blue-600 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Truck size={20} />
            Informacija o dostavnem mestu
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Status bar */}
        <div className="px-4 py-3 bg-gray-100 border-b flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-400"></span>
              Izpolnjeno
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-300"></span>
              Prazno
            </span>
          </div>
          <div className="text-sm font-medium">
            {filledCount === totalCount ? (
              <span className="text-green-600">Vsa obvezna polja izpolnjena</span>
            ) : (
              <span className="text-gray-600">Izpolnjeno {filledCount}/{totalCount} obveznih polj</span>
            )}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Prodajni zastopnik */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700">Prodajni zastopnik</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ime in priimek *</label>
                <input
                  type="text"
                  value={formData.salesRep}
                  onChange={(e) => updateField('salesRep', e.target.value)}
                  className={inputClass('salesRep')}
                  placeholder="Prodajni zastopnik..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input
                  type="text"
                  value={formData.salesRepPhone}
                  onChange={(e) => updateField('salesRepPhone', e.target.value)}
                  className={inputClass('salesRepPhone')}
                  placeholder="Telefonska številka..."
                />
              </div>
            </div>
          </div>

          {/* Dostavno mesto */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700">Dostavno mesto</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Šifra stranke (DC number)</label>
                  <input
                    type="text"
                    value={formData.customerNumber}
                    onChange={(e) => updateField('customerNumber', e.target.value)}
                    className={inputClass('customerNumber')}
                    placeholder="DC-XXXXX..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Naziv podjetja *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    className={inputClass('companyName')}
                    placeholder="Ime podjetja..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Naslov *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className={inputClass('address')}
                  placeholder="Ulica in hišna številka..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Poštna številka</label>
                  <input
                    type="text"
                    value={formData.postal}
                    onChange={(e) => handlePostalChange(e.target.value)}
                    className={inputClass('postal')}
                    placeholder="1000"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kraj</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className={inputClass('city')}
                    placeholder="Ljubljana..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kontaktna oseba */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700">Kontaktna oseba za lokacijo</h4>
            {sortedContacts.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Izberi iz seznama</label>
                <select
                  value={formData.contactId || ''}
                  onChange={(e) => handleContactChange(e.target.value, true)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Izberi kontakt --</option>
                  {sortedContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.is_primary ? ' (primarna)' : ''}
                      {contact.is_billing_contact ? ' (računi)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ime in priimek *</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => updateField('contactName', e.target.value)}
                  className={inputClass('contactName')}
                  placeholder="Kontaktna oseba..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon *</label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className={inputClass('contactPhone')}
                  placeholder="Telefonska številka..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={formData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className={inputClass('contactEmail')}
                  placeholder="email@podjetje.si"
                />
              </div>
            </div>
          </div>

          {/* Kontakt za račune (opcijsko) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-blue-700">Kontakt za račune/plačila (opcijsko)</h4>
              {formData.secondaryContactName && (
                <button
                  type="button"
                  onClick={clearSecondaryContact}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Počisti
                </button>
              )}
            </div>
            {sortedContacts.length > 1 && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Izberi iz seznama</label>
                <select
                  value={formData.secondaryContactId || ''}
                  onChange={(e) => e.target.value ? handleContactChange(e.target.value, false) : clearSecondaryContact()}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">-- Brez --</option>
                  {sortedContacts
                    .filter(c => c.id !== formData.contactId)
                    .map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ime in priimek</label>
                <input
                  type="text"
                  value={formData.secondaryContactName || ''}
                  onChange={(e) => updateField('secondaryContactName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Kontaktna oseba..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input
                  type="text"
                  value={formData.secondaryContactPhone || ''}
                  onChange={(e) => updateField('secondaryContactPhone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Telefonska številka..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={formData.secondaryContactEmail || ''}
                  onChange={(e) => updateField('secondaryContactEmail', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="email@podjetje.si"
                />
              </div>
            </div>
          </div>

          {/* Predpražniki */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700">Predpražniki</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Popust (%)</label>
                <input
                  type="text"
                  value={formData.discount}
                  onChange={(e) => updateField('discount', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="npr. 10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ima fazo?</label>
                <button
                  type="button"
                  onClick={() => updateField('hasPhase', !formData.hasPhase)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.hasPhase
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {formData.hasPhase ? 'DA' : 'NE'}
                </button>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Možnosti za razširitev</label>
              <textarea
                value={formData.expansionNotes}
                onChange={(e) => updateField('expansionNotes', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Možnosti za dodatne predpražnike..."
              />
            </div>
          </div>

          {/* Lokacija in opombe */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700">Lokacija in opombe</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mesto namestitve predpražnika</label>
                <textarea
                  value={formData.locationDescription}
                  onChange={(e) => updateField('locationDescription', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Opis lokacije kjer se predpražnik namesti..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dodatne opombe za voznika</label>
                <textarea
                  value={formData.driverNotes}
                  onChange={(e) => updateField('driverNotes', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Kje parkirati, kdaj je dostop, posebnosti..."
                />
              </div>
            </div>
          </div>

          {/* Slike lokacije */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-blue-700 flex items-center gap-2">
              <Image size={18} />
              Slike lokacije
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Uporabi <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+V</kbd> za prilepitev screenshota iz Google Maps ali drugega vira
            </p>

            {formData.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {formData.images.map((src, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={src}
                      alt={`Lokacija ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                      onClick={() => window.open(src, '_blank')}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Odstrani"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-white">
              <ClipboardPaste size={32} className="mx-auto mb-2 text-blue-400" />
              <p className="text-sm text-gray-500">Pritisni Ctrl+V za prilepitev slike</p>
              <p className="text-xs text-gray-400 mt-1">ali povleci sliko sem</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Prekliči
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || filledCount < totalCount}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <FileText size={18} />
            {isGenerating ? 'Generiram...' : 'Generiraj PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

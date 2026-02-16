/**
 * @file DeliveryInfoModal.tsx
 * @description Modal za generiranje "Informacija o dostavnem mestu" PDF dokumenta za šoferja
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileDown, Trash2, Image, MapPin, User, Phone, Mail, Building2, Clipboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateDeliveryInfoPdf } from './useDeliveryInfoPdf';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  work_phone?: string;
  email?: string;
  role?: string;
  is_primary?: boolean;
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
}

interface DeliveryInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
}

export function DeliveryInfoModal({ isOpen, onClose, company }: DeliveryInfoModalProps) {
  const { profile } = useAuth();
  const imageDropRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [secondaryContactId, setSecondaryContactId] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [hasPhase, setHasPhase] = useState<boolean>(false);
  const [expansionNotes, setExpansionNotes] = useState<string>('');
  const [locationDescription, setLocationDescription] = useState<string>('');
  const [driverNotes, setDriverNotes] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Get selected contact details
  const selectedContact = company.contacts.find(c => c.id === selectedContactId);
  const secondaryContact = company.contacts.find(c => c.id === secondaryContactId);

  // Set default contact on open
  useEffect(() => {
    if (isOpen && company.contacts.length > 0) {
      const primaryContact = company.contacts.find(c => c.is_primary) || company.contacts[0];
      setSelectedContactId(primaryContact.id);
    }
  }, [isOpen, company.contacts]);

  // Handle paste for images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setImages(prev => [...prev, dataUrl]);
          };
          reader.readAsDataURL(blob);
        }
        e.preventDefault();
        break;
      }
    }
  }, []);

  // Add paste listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isOpen, handlePaste]);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const salesRep = profile ? `${profile.first_name} ${profile.last_name}` : '';
      const salesRepPhone = profile?.phone || '';

      const formData = {
        salesRep,
        salesRepPhone,
        customerNumber: company.id.slice(0, 8).toUpperCase(),
        companyName: company.display_name || company.name,
        address: company.delivery_address || company.address_street || '',
        postal: company.delivery_postal || company.address_postal || '',
        city: company.delivery_city || company.address_city || '',
        contactName: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : '',
        contactPhone: selectedContact?.phone || selectedContact?.work_phone || '',
        contactEmail: selectedContact?.email || '',
        secondaryContactName: secondaryContact ? `${secondaryContact.first_name} ${secondaryContact.last_name}` : '',
        secondaryContactPhone: secondaryContact?.phone || secondaryContact?.work_phone || '',
        secondaryContactEmail: secondaryContact?.email || '',
        discount,
        hasPhase,
        expansionNotes,
        locationDescription,
        driverNotes,
        images,
      };

      const pdfBlob = await generateDeliveryInfoPdf(formData);

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dostavno-mesto-${company.display_name || company.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
          <div className="flex items-center gap-2">
            <MapPin size={20} />
            <h2 className="text-lg font-semibold">Informacija o dostavnem mestu</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Company info (readonly) */}
          <div className="bg-gray-50 p-3 rounded space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 size={16} />
              <span className="font-medium">{company.display_name || company.name}</span>
            </div>
            <div className="text-sm text-gray-500">
              {company.delivery_address || company.address_street}, {company.delivery_postal || company.address_postal} {company.delivery_city || company.address_city}
            </div>
          </div>

          {/* Primary contact dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" />
              Kontaktna oseba za lokacijo
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Izberi kontakt --</option>
              {company.contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name} {contact.role ? `(${contact.role})` : ''}
                </option>
              ))}
            </select>
            {selectedContact && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Phone size={14} />
                  <span>{selectedContact.phone || selectedContact.work_phone || '-'}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Mail size={14} />
                  <span>{selectedContact.email || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Secondary contact for billing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kontakt za račune/plačila (opcijsko)
            </label>
            <select
              value={secondaryContactId}
              onChange={(e) => setSecondaryContactId(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Brez --</option>
              {company.contacts.filter(c => c.id !== selectedContactId).map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name} {contact.role ? `(${contact.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Discount and phase */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Popust (%)</label>
              <input
                type="text"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="npr. 10"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faza</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={hasPhase}
                    onChange={() => setHasPhase(true)}
                    className="text-blue-600"
                  />
                  DA
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!hasPhase}
                    onChange={() => setHasPhase(false)}
                    className="text-blue-600"
                  />
                  NE
                </label>
              </div>
            </div>
          </div>

          {/* Expansion notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Možnosti za razširitev
            </label>
            <textarea
              value={expansionNotes}
              onChange={(e) => setExpansionNotes(e.target.value)}
              placeholder="Kje so možnosti za razširitev iste linije izdelkov znotraj podjetja?"
              rows={2}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={14} className="inline mr-1" />
              Mesto namestitve predpražnika (natančen opis)
            </label>
            <textarea
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="Predpražnik je nameščen pri glavnem vhodu v stavbo, desno od vrat..."
              rows={3}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Driver notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dodatne opombe za voznika
            </label>
            <textarea
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              placeholder="Dostava možna samo med 8:00 in 14:00, koda za vrata: 1234..."
              rows={2}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Image paste area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Image size={14} className="inline mr-1" />
              Slike lokacije (Ctrl+V za paste)
            </label>
            <div
              ref={imageDropRef}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[120px] bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {images.length === 0 ? (
                <div className="text-center text-gray-500">
                  <Clipboard size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Pritisni Ctrl+V za prilepitev screenshot-a</p>
                  <p className="text-xs text-gray-400 mt-1">Lahko prilepiš več slik</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Slika ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border rounded text-gray-700 hover:bg-gray-50"
          >
            Prekliči
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedContactId}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileDown size={20} />
            {generating ? 'Generiram...' : 'Prenesi PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeliveryInfoModal;

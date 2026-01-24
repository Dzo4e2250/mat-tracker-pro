/**
 * @file ContractModal.tsx
 * @description Modal za pripravo in generiranje pogodbe
 * @refactored 2026-01-24: Ekstrahirani tipi, hooks in komponente
 */

import { useState, useEffect } from 'react';
import { X, FileSignature, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import {
  useContractForm,
  useContractPdf,
  ConfirmSendStep,
  ItemsTable,
  type ContractModalProps,
  type ModalStep,
} from './contract';

export default function ContractModal({
  isOpen,
  onClose,
  company,
  offer,
  onContractSaved,
  parentCompany,
  childCompanies,
}: ContractModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<ModalStep>('edit');
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const {
    formData,
    allContacts,
    updateField,
    handlePostalChange,
    updateItem,
    addItem,
    removeItem,
    handleContactChange,
    handleAddressSourceChange,
    getInputClass,
    filledCount,
    totalCount,
  } = useContractForm({
    isOpen,
    company,
    offer,
    parentCompany,
    childCompanies,
  });

  const { generatePdf, downloadPdf, generateFileName } = useContractPdf();

  useEffect(() => {
    if (isOpen) {
      setStep('edit');
      setGeneratedPdfBlob(null);
      setPdfFileName('');
    }
  }, [isOpen]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await generatePdf(formData, parentCompany);
      const fileName = generateFileName(formData.companyName);

      setGeneratedPdfBlob(pdfBlob);
      setPdfFileName(fileName);
      downloadPdf(pdfBlob, fileName);

      toast({ description: 'PDF pogodba uspesno generirana!' });

      if (onContractSaved) {
        onContractSaved({
          offer_id: offer.id,
          generated_at: new Date().toISOString(),
        });
      }

      setStep('confirm-send');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ description: 'Napaka pri generiranju PDF dokumenta.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToClient = async () => {
    const subject = encodeURIComponent(`Pogodba - ${formData.companyName}`);
    const body = encodeURIComponent(
      `Pozdravljeni,\n\nkot obljubljeno, vam v priponki pošiljam pripravljeno pogodbo.\n\nProsim vas, da si pogodbo ogledate in preberete. Če se z vsebino strinjate, nam prosim vrnite podpisan in žigosan izvod na ta elektronski naslov (skenirano).\n\nZa vsa morebitna dodatna vprašanja ali pojasnila sem vam z veseljem na voljo.\n\nLep pozdrav,`
    );

    if (company?.id) {
      try {
        await supabase
          .from('companies')
          .update({
            pipeline_status: 'contract_sent',
            contract_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', company.id);
      } catch (error) {
        console.error('Error updating pipeline status:', error);
      }
    }

    window.location.href = `mailto:${formData.billingContactEmail}?subject=${subject}&body=${body}`;
    toast({ description: 'Email odpert - prilozi PDF dokument iz Prenosi mape!' });
    onClose();
  };

  const handleDownloadAgain = () => {
    if (generatedPdfBlob) {
      downloadPdf(generatedPdfBlob, pdfFileName);
    }
  };

  if (!isOpen) return null;

  if (step === 'confirm-send') {
    return (
      <ConfirmSendStep
        onSendToClient={handleSendToClient}
        onDownloadAgain={handleDownloadAgain}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-purple-600 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <FileSignature size={20} />
            Pripravi pogodbo - Lindstrom predloga
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-purple-500 rounded">
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
              <span className="w-3 h-3 rounded bg-orange-300"></span>
              Manjka
            </span>
          </div>
          <div className="text-sm font-medium">
            {filledCount === totalCount ? (
              <span className="text-green-600">Vsa obvezna polja izpolnjena</span>
            ) : (
              <span className="text-orange-600">Izpolnjeno {filledCount}/{totalCount} obveznih polj</span>
            )}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Company data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Podatki stranke</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stranka *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className={getInputClass(formData.companyName)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">St. stranke</label>
                <input
                  type="text"
                  value={formData.customerNumber}
                  onChange={(e) => updateField('customerNumber', e.target.value)}
                  className={getInputClass(formData.customerNumber)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Davcna stevilka *</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => updateField('taxNumber', e.target.value)}
                  className={getInputClass(formData.taxNumber)}
                />
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-purple-700">Naslov za dostavo</h4>
              {parentCompany && (
                <select
                  value={formData.deliveryAddressSource}
                  onChange={(e) => handleAddressSourceChange('delivery', e.target.value as 'current' | 'parent')}
                  className="text-sm px-2 py-1 border rounded-lg bg-white"
                >
                  <option value="current">{company?.display_name || company?.name} (hčerinsko)</option>
                  <option value="parent">{parentCompany.name} (matično)</option>
                </select>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Ulica</label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => updateField('deliveryAddress', e.target.value)}
                  className={getInputClass(formData.deliveryAddress)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Posta</label>
                  <input
                    type="text"
                    value={formData.deliveryPostal}
                    onChange={(e) => handlePostalChange('deliveryPostal', 'deliveryCity', e.target.value)}
                    className={getInputClass(formData.deliveryPostal)}
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kraj</label>
                  <input
                    type="text"
                    value={formData.deliveryCity}
                    onChange={(e) => updateField('deliveryCity', e.target.value)}
                    className={getInputClass(formData.deliveryCity)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-purple-700">Naslov za račun</h4>
              {parentCompany ? (
                <select
                  value={formData.billingAddressSource}
                  onChange={(e) => handleAddressSourceChange('billing', e.target.value as 'current' | 'parent')}
                  className="text-sm px-2 py-1 border rounded-lg bg-white"
                >
                  <option value="parent">{parentCompany.name} (matično)</option>
                  <option value="current">{company?.display_name || company?.name} (hčerinsko)</option>
                </select>
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.useSameAsBilling}
                    onChange={(e) => updateField('useSameAsBilling', e.target.checked)}
                    className="rounded"
                  />
                  Enak kot za dostavo
                </label>
              )}
            </div>
            {(parentCompany || !formData.useSameAsBilling) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Ulica</label>
                  <input
                    type="text"
                    value={formData.billingAddress}
                    onChange={(e) => updateField('billingAddress', e.target.value)}
                    className={getInputClass(formData.billingAddress)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Posta</label>
                    <input
                      type="text"
                      value={formData.billingPostal}
                      onChange={(e) => handlePostalChange('billingPostal', 'billingCity', e.target.value)}
                      className={getInputClass(formData.billingPostal)}
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kraj</label>
                    <input
                      type="text"
                      value={formData.billingCity}
                      onChange={(e) => updateField('billingCity', e.target.value)}
                      className={getInputClass(formData.billingCity)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Kontaktne osebe</h4>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Kontaktna oseba za obracun</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={formData.billingContactId}
                  onChange={(e) => handleContactChange('billing', e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Izberi...</option>
                  {allContacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}{c.companyLabel ? ` (${c.companyLabel})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.billingContactName}
                  onChange={(e) => updateField('billingContactName', e.target.value)}
                  placeholder="Ime"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={formData.billingContactPhone}
                  onChange={(e) => updateField('billingContactPhone', e.target.value)}
                  placeholder="Telefon"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) => updateField('billingContactEmail', e.target.value)}
                  placeholder="Email"
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs text-gray-500">Kontaktna oseba za storitev</label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={formData.useSameAsService}
                    onChange={(e) => {
                      updateField('useSameAsService', e.target.checked);
                      if (e.target.checked) {
                        handleContactChange('service', formData.billingContactId);
                      }
                    }}
                    className="rounded"
                  />
                  Enaka kot za obracun
                </label>
              </div>
              {!formData.useSameAsService && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={formData.serviceContactId}
                    onChange={(e) => handleContactChange('service', e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Izberi...</option>
                    {allContacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}{c.companyLabel ? ` (${c.companyLabel})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.serviceContactName}
                    onChange={(e) => updateField('serviceContactName', e.target.value)}
                    placeholder="Ime"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={formData.serviceContactPhone}
                    onChange={(e) => updateField('serviceContactPhone', e.target.value)}
                    placeholder="Telefon"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    value={formData.serviceContactEmail}
                    onChange={(e) => updateField('serviceContactEmail', e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contract type */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Tip pogodbe</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="contractType"
                  checked={formData.contractType === 'new'}
                  onChange={() => updateField('contractType', 'new')}
                  className="w-4 h-4"
                />
                <span>Nova pogodba</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="contractType"
                  checked={formData.contractType === 'renewal'}
                  onChange={() => updateField('contractType', 'renewal')}
                  className="w-4 h-4"
                />
                <span>Obnovitev pogodbe / Aneks</span>
              </label>
            </div>
          </div>

          {/* Items table */}
          <ItemsTable
            items={formData.items}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />

          {/* Additional data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Dodatni podatki</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pricetek opravljanja storitve</label>
                <input
                  type="date"
                  value={formData.serviceStartDate}
                  onChange={(e) => updateField('serviceStartDate', e.target.value)}
                  className={getInputClass(formData.serviceStartDate)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Delovni cas</label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => updateField('workingHours', e.target.value)}
                  placeholder="npr. Pon-Pet 8:00-16:00"
                  className={getInputClass(formData.workingHours)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Navodila za dostavo</label>
                <textarea
                  value={formData.deliveryInstructions}
                  onChange={(e) => updateField('deliveryInstructions', e.target.value)}
                  rows={2}
                  className={getInputClass(formData.deliveryInstructions)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Koda (vrata)</label>
                <input
                  type="text"
                  value={formData.doorCode}
                  onChange={(e) => updateField('doorCode', e.target.value)}
                  className={getInputClass(formData.doorCode)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kljuc</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasKey"
                      checked={formData.hasKey === 'yes'}
                      onChange={() => updateField('hasKey', 'yes')}
                    />
                    Da
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hasKey"
                      checked={formData.hasKey === 'no'}
                      onChange={() => updateField('hasKey', 'no')}
                    />
                    Ne
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Dodatne informacije</label>
                <textarea
                  value={formData.additionalInfo}
                  onChange={(e) => updateField('additionalInfo', e.target.value)}
                  rows={2}
                  className={getInputClass(formData.additionalInfo)}
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold mb-3 text-purple-700">Nacini placila</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.paperInvoice}
                  onChange={(e) => updateField('paperInvoice', e.target.checked)}
                />
                Papirnat racun
              </label>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bancno nakazilo</label>
                <input
                  type="text"
                  value={formData.bankTransfer}
                  onChange={(e) => updateField('bankTransfer', e.target.value)}
                  className={getInputClass(formData.bankTransfer)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">eRacun</label>
                <input
                  type="text"
                  value={formData.eInvoice}
                  onChange={(e) => updateField('eInvoice', e.target.value)}
                  className={getInputClass(formData.eInvoice)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={formData.emailInvoice}
                  onChange={(e) => updateField('emailInvoice', e.target.value)}
                  className={getInputClass(formData.emailInvoice)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Referencna stevilka</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => updateField('referenceNumber', e.target.value)}
                  className={getInputClass(formData.referenceNumber)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border rounded-lg text-gray-600"
          >
            Preklici
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileText size={18} />
            {isGenerating ? 'Generiram...' : 'Koncaj in generiraj PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

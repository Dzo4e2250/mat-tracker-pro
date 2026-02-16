/**
 * @file OfferModalWrapper.tsx
 * @description Wrapper komponenta za offer modal wizard
 * Enkapsulira celoten offer UI (type → items → preview) in inline callback funkcije
 */

import { lazy, Suspense, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';
import { useToast } from '@/hooks/use-toast';
import {
  getRentalPrice, getPurchasePrice, getReplacementCost, getPriceByCode,
  STANDARD_TYPES, DESIGN_SIZES, calculateM2FromDimensions, calculateCustomPrice, calculateCustomPurchasePrice,
  FrequencyKey
} from '@/utils/priceList';
import { useMatPrices } from '@/hooks/usePrices';
import { type OfferItem, WEEKS } from '@/pages/contacts/types';
import { getPrimaryContact } from '@/pages/contacts/utils';

// Lazy loaded Offer komponente
const OfferTypeStep = lazy(() => import('@/pages/contacts/components/offer/OfferTypeStep'));
const OfferItemsNakupStep = lazy(() => import('@/pages/contacts/components/offer/OfferItemsNakupStep'));
const OfferItemsNajemStep = lazy(() => import('@/pages/contacts/components/offer/OfferItemsNajemStep'));
const OfferPreviewStep = lazy(() => import('@/pages/contacts/components/offer/OfferPreviewStep'));

export interface OfferModalWrapperProps {
  // Company
  selectedCompany: CompanyWithContacts;

  // Modal state
  onClose: () => void;

  // Offer state from useOfferState hook
  offerType: 'najem' | 'nakup' | 'primerjava' | 'dodatna';
  setOfferType: (type: 'najem' | 'nakup' | 'primerjava' | 'dodatna') => void;
  offerFrequency: string;
  offerStep: 'type' | 'items-nakup' | 'items-najem' | 'preview';
  setOfferStep: (step: 'type' | 'items-nakup' | 'items-najem' | 'preview') => void;
  hasNajem: boolean;
  hasNakup: boolean;
  offerItemsNakup: OfferItem[];
  offerItemsNajem: OfferItem[];

  // Price settings from admin panel
  designPurchasePricePerM2: number;
  specialShapeMultiplier: number;

  // Offer actions from useOfferState hook
  updateNajemPricesForFrequency: (frequency: string) => void;
  addCustomOfferItem: (category: 'nakup' | 'najem') => void;
  removeOfferItem: (id: string, category: 'nakup' | 'najem') => void;
  updateOfferItem: (id: string, updates: Partial<OfferItem>, category: 'nakup' | 'najem') => void;
  handleItemTypeChange: (id: string, type: 'standard' | 'design' | 'custom', category: 'nakup' | 'najem') => void;
  handleDesignSizeSelect: (id: string, code: string, category: 'nakup' | 'najem') => void;
  handleCustomDimensionsChange: (id: string, dims: string, category: 'nakup' | 'najem') => void;
  handleSpecialShapeChange: (id: string, specialShape: boolean, category: 'nakup' | 'najem') => void;
  handlePriceChange: (id: string, price: number, category: 'nakup' | 'najem') => void;
  handleDiscountChange: (id: string, discount: number, category: 'nakup' | 'najem') => void;
  handleSeasonalToggle: (id: string, enabled: boolean) => void;
  handleSeasonalFrequencyChange: (id: string, frequency: string) => void;
  handleSeasonalPriceChange: (id: string, price: number) => void;
  handleSeasonalDiscountChange: (id: string, discount: number) => void;
  handleNormalFrequencyChange: (id: string, frequency: string) => void;
  handleNormalPriceChange: (id: string, price: number) => void;
  handleNormalDiscountChange: (id: string, discount: number) => void;
  handleFrequencyOverride: (id: string, frequency: string | undefined) => void;
  calculateOfferTotals: (category: 'nakup' | 'najem') => { subtotal: number; discount: number; total: number };

  // Email generation from useOfferEmail hook
  generateEmailHTML: () => string;
  copyHTMLToClipboard: () => void;

  // Save offer from useSentOffers hook
  saveOfferToDatabase: (subject: string, email: string) => Promise<boolean>;
}

export function OfferModalWrapper({
  selectedCompany,
  onClose,
  offerType,
  setOfferType,
  offerFrequency,
  offerStep,
  setOfferStep,
  hasNajem,
  hasNakup,
  offerItemsNakup,
  offerItemsNajem,
  designPurchasePricePerM2,
  specialShapeMultiplier,
  updateNajemPricesForFrequency,
  addCustomOfferItem,
  removeOfferItem,
  updateOfferItem,
  handleItemTypeChange,
  handleDesignSizeSelect,
  handleCustomDimensionsChange,
  handleSpecialShapeChange,
  handlePriceChange,
  handleDiscountChange,
  handleSeasonalToggle,
  handleSeasonalFrequencyChange,
  handleSeasonalPriceChange,
  handleSeasonalDiscountChange,
  handleNormalFrequencyChange,
  handleNormalPriceChange,
  handleNormalDiscountChange,
  handleFrequencyOverride,
  calculateOfferTotals,
  generateEmailHTML,
  copyHTMLToClipboard,
  saveOfferToDatabase,
}: OfferModalWrapperProps) {
  const { toast } = useToast();
  const { data: matPrices } = useMatPrices();

  // Povračilo (replacement cost) za custom = odkup cena iz DESIGN-100x100 (1m² = 90.30€/m²)
  const customReplacementPricePerM2 = useMemo(() => {
    const design100x100 = matPrices?.find(p => p.code === 'DESIGN-100x100');
    return design100x100?.price_purchase || 90.30;
  }, [matPrices]);

  const calcCustomReplacementCost = useCallback((m2: number): number => {
    if (m2 <= 0) return 0;
    return Math.round(m2 * customReplacementPricePerM2 * 100) / 100;
  }, [customReplacementPricePerM2]);

  // ============================================================================
  // NAJEM STEP CALLBACKS - encapsulated inline handlers
  // ============================================================================

  const handleStandardSelect = useCallback((itemId: string, code: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    const priceInfo = getPriceByCode(code);
    const price = item?.purpose === 'nakup'
      ? getPurchasePrice(code)
      : getRentalPrice(code, offerFrequency as FrequencyKey);
    updateOfferItem(itemId, {
      code,
      size: priceInfo?.dimensions || '',
      m2: priceInfo?.m2,
      pricePerUnit: price,
      replacementCost: item?.purpose !== 'nakup' ? getReplacementCost(code) : 0,
      name: 'predpražnik'
    }, 'najem');
  }, [offerItemsNajem, offerFrequency, updateOfferItem]);

  const handleDesignSelect = useCallback((itemId: string, code: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    const designSize = DESIGN_SIZES.find(d => d.code === code);
    const m2 = designSize ? calculateM2FromDimensions(designSize.dimensions) : 0;

    // First check PRICE_LIST for predefined design sizes
    const priceInfo = getPriceByCode(code);

    let price: number;
    let replacementCost: number;

    // Za nakup VEDNO uporabi m² × 165 €/m² (nova izdelava)
    if (item?.purpose === 'nakup') {
      price = calculateCustomPurchasePrice(m2);
      replacementCost = 0;
    } else if (priceInfo) {
      // Najem: uporabi cene iz PRICE_LIST
      price = priceInfo.prices[offerFrequency as FrequencyKey] || 0;
      replacementCost = priceInfo.odkup;
    } else {
      // Najem: fall back to m² calculation for non-standard sizes
      price = calculateCustomPrice(m2, offerFrequency as FrequencyKey);
      replacementCost = calcCustomReplacementCost(m2); // Povračilo = 90.30€/m²
    }

    updateOfferItem(itemId, {
      code,
      size: designSize?.dimensions || '',
      m2,
      pricePerUnit: price,
      replacementCost,
      name: 'predpražnik po meri'
    }, 'najem');
  }, [offerItemsNajem, offerFrequency, updateOfferItem, calcCustomReplacementCost]);

  const handleNajemCustomDimensionsChange = useCallback((itemId: string, dims: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    const m2 = calculateM2FromDimensions(dims);
    const price = item?.purpose === 'nakup'
      ? calculateCustomPurchasePrice(m2)
      : calculateCustomPrice(m2, offerFrequency as FrequencyKey);
    updateOfferItem(itemId, {
      size: dims,
      m2: m2 || undefined,
      pricePerUnit: price,
      code: m2 > 0 ? `CUSTOM-${dims.replace('*', 'x')}` : '',
      replacementCost: item?.purpose !== 'nakup' ? calcCustomReplacementCost(m2) : 0, // Povračilo = 90.30€/m²
      name: 'predpražnik po meri'
    }, 'najem');
  }, [offerItemsNajem, offerFrequency, updateOfferItem, calcCustomReplacementCost]);

  const handlePurposeChange = useCallback((itemId: string, newPurpose: 'najem' | 'nakup') => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;

    let newPrice = item.pricePerUnit;
    let newItemType = item.itemType;
    let newCode = item.code;
    let newSize = item.size;
    let newM2 = item.m2;
    let newName = item.name;

    if (newPurpose === 'nakup' && item.itemType === 'standard') {
      newItemType = 'design';
      newCode = '';
      newSize = '';
      newM2 = undefined;
      newPrice = 0;
      newName = 'predpražnik po meri';
    } else if (item.code) {
      if (item.itemType === 'standard') {
        newPrice = newPurpose === 'nakup'
          ? getPurchasePrice(item.code)
          : getRentalPrice(item.code, offerFrequency as FrequencyKey);
      } else if (item.itemType === 'design') {
        // Za nakup VEDNO uporabi m² × 165 €/m²
        if (newPurpose === 'nakup' && item.m2) {
          newPrice = calculateCustomPurchasePrice(item.m2);
        } else {
          // Za najem uporabi cene iz PRICE_LIST
          const priceInfo = getPriceByCode(item.code);
          if (priceInfo) {
            newPrice = priceInfo.prices[offerFrequency as FrequencyKey] || 0;
          } else if (item.m2) {
            newPrice = calculateCustomPrice(item.m2, offerFrequency as FrequencyKey);
          }
        }
      } else if (item.m2) {
        // Custom items - use m² calculation
        newPrice = newPurpose === 'nakup'
          ? calculateCustomPurchasePrice(item.m2)
          : calculateCustomPrice(item.m2, offerFrequency as FrequencyKey);
      }
    }

    // Calculate replacement cost
    let replacementCost = 0;
    if (newPurpose !== 'nakup') {
      const priceInfo = item.code ? getPriceByCode(item.code) : null;
      if (priceInfo) {
        replacementCost = priceInfo.odkup;
      } else if (item.m2) {
        replacementCost = calcCustomReplacementCost(item.m2); // Povračilo = 90.30€/m²
      } else {
        replacementCost = getReplacementCost(item.code);
      }
    }

    updateOfferItem(itemId, {
      purpose: newPurpose,
      itemType: newItemType,
      code: newCode,
      size: newSize,
      m2: newM2,
      name: newName,
      pricePerUnit: newPrice,
      replacementCost,
      discount: newPurpose === 'nakup' ? 0 : item.discount,
      originalPrice: newPurpose === 'nakup' ? undefined : item.originalPrice
    }, 'najem');
  }, [offerItemsNajem, offerFrequency, updateOfferItem, calcCustomReplacementCost]);

  // ============================================================================
  // PREVIEW STEP CALLBACKS
  // ============================================================================

  const handleSaveOffer = useCallback(async () => {
    const primaryContact = getPrimaryContact(selectedCompany);
    const email = primaryContact?.email || '';
    const companyName = selectedCompany.name || '';

    let subject = 'Ponudba za predpražnike';
    if (offerType === 'primerjava') {
      // Check if it's 2x najem (dimension comparison) vs najem+nakup
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
      if (hasNajemItems && !hasNakupItems) {
        subject = `Ponudba za najem predpražnikov - ${companyName}`;
      } else {
        subject = `Ponudba za nakup in najem predpražnikov - ${companyName}`;
      }
    } else if (offerType === 'dodatna') {
      const hasNajemItems = offerItemsNajem.some(i => i.purpose !== 'nakup');
      const hasNakupItems = offerItemsNajem.some(i => i.purpose === 'nakup');
      if (hasNajemItems && hasNakupItems) subject = `Ponudba za najem in nakup predpražnikov - ${companyName}`;
      else if (hasNajemItems) subject = `Ponudba za najem predpražnikov - ${companyName}`;
      else if (hasNakupItems) subject = `Ponudba za nakup predpražnikov - ${companyName}`;
    } else if (offerType === 'nakup') {
      subject = `Ponudba za nakup predpražnikov - ${companyName}`;
    } else if (offerType === 'najem') {
      subject = `Ponudba za najem predpražnikov - ${companyName}`;
    }

    const saved = await saveOfferToDatabase(subject, email);
    if (saved) {
      toast({ description: '📧 Ponudba shranjena - opomnik čez 2 dni' });
    }
  }, [selectedCompany, offerType, offerItemsNajem, saveOfferToDatabase, toast]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Ponudba - {selectedCompany.name}</h3>
          <button onClick={onClose} className="p-1">
            <X size={24} />
          </button>
        </div>

        <Suspense fallback={<div className="p-4 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
          <div className="p-4 space-y-4">
            {/* Step 1: Select offer type */}
            {offerStep === 'type' && (
              <OfferTypeStep
                offerType={offerType}
                offerFrequency={offerFrequency}
                hasNajem={hasNajem}
                onTypeChange={setOfferType}
                onFrequencyChange={updateNajemPricesForFrequency}
                onNext={() => {
                  if (offerType === 'primerjava' || offerType === 'dodatna') setOfferStep('items-najem');
                  else if (hasNakup) setOfferStep('items-nakup');
                  else if (hasNajem) setOfferStep('items-najem');
                }}
              />
            )}

            {/* Step 2a: Configure NAKUP items - brez popustov, cena vedno m² × 165€ */}
            {offerStep === 'items-nakup' && (
              <OfferItemsNakupStep
                items={offerItemsNakup}
                hasNajem={hasNajem}
                totals={calculateOfferTotals('nakup')}
                designPurchasePricePerM2={designPurchasePricePerM2}
                specialShapeMultiplier={specialShapeMultiplier}
                onItemTypeChange={(id, type) => handleItemTypeChange(id, type, 'nakup')}
                onDesignSizeSelect={(id, code) => handleDesignSizeSelect(id, code, 'nakup')}
                onCustomDimensionsChange={(id, dims) => handleCustomDimensionsChange(id, dims, 'nakup')}
                onSpecialShapeChange={(id, specialShape) => handleSpecialShapeChange(id, specialShape, 'nakup')}
                onQuantityChange={(id, qty) => updateOfferItem(id, { quantity: qty }, 'nakup')}
                onCustomizedChange={(id, customized) => updateOfferItem(id, { customized }, 'nakup')}
                onOptibrushChange={(id, updates) => updateOfferItem(id, updates, 'nakup')}
                onAddItem={() => addCustomOfferItem('nakup')}
                onRemoveItem={(id) => removeOfferItem(id, 'nakup')}
                onBack={() => setOfferStep('type')}
                onNext={() => hasNajem ? setOfferStep('items-najem') : setOfferStep('preview')}
              />
            )}

            {/* Step 2b: Configure NAJEM items */}
            {offerStep === 'items-najem' && (
              <OfferItemsNajemStep
                items={offerItemsNajem}
                offerType={offerType}
                offerFrequency={offerFrequency}
                standardTypes={STANDARD_TYPES}
                designSizes={DESIGN_SIZES}
                weeks={WEEKS}
                onItemTypeChange={(itemId, type) => handleItemTypeChange(itemId, type, 'najem')}
                onStandardSelect={handleStandardSelect}
                onDesignSelect={handleDesignSelect}
                onCustomDimensionsChange={handleNajemCustomDimensionsChange}
                onSpecialShapeChange={(id, specialShape) => handleSpecialShapeChange(id, specialShape, 'najem')}
                onPurposeChange={handlePurposeChange}
                onQuantityChange={(itemId, quantity) => updateOfferItem(itemId, { quantity }, 'najem')}
                onPriceChange={(itemId, price) => handlePriceChange(itemId, price, 'najem')}
                onDiscountChange={(itemId, discount) => handleDiscountChange(itemId, discount, 'najem')}
                onReplacementCostChange={(itemId, cost) => updateOfferItem(itemId, { replacementCost: cost }, 'najem')}
                onCustomizedChange={(itemId, customized) => updateOfferItem(itemId, { customized }, 'najem')}
                onFrequencyOverride={handleFrequencyOverride}
                onSeasonalToggle={handleSeasonalToggle}
                onOptibrushChange={(id, updates) => updateOfferItem(id, updates, 'najem')}
                onNormalFrequencyChange={handleNormalFrequencyChange}
                onNormalPriceChange={handleNormalPriceChange}
                onNormalDiscountChange={handleNormalDiscountChange}
                onNormalFromWeekChange={(itemId, week) => updateOfferItem(itemId, { normalFromWeek: week }, 'najem')}
                onNormalToWeekChange={(itemId, week) => updateOfferItem(itemId, { normalToWeek: week }, 'najem')}
                onSeasonalFrequencyChange={handleSeasonalFrequencyChange}
                onSeasonalPriceChange={handleSeasonalPriceChange}
                onSeasonalDiscountChange={handleSeasonalDiscountChange}
                onSeasonalFromWeekChange={(itemId, week) => updateOfferItem(itemId, { seasonalFromWeek: week }, 'najem')}
                onSeasonalToWeekChange={(itemId, week) => updateOfferItem(itemId, { seasonalToWeek: week }, 'najem')}
                onAddItem={() => addCustomOfferItem('najem')}
                onRemoveItem={(itemId) => removeOfferItem(itemId, 'najem')}
                onBack={() => setOfferStep('type')}
                onNext={() => setOfferStep('preview')}
                calculateTotals={() => calculateOfferTotals('najem')}
              />
            )}

            {/* Step 3: Preview and send */}
            {offerStep === 'preview' && (
              <OfferPreviewStep
                company={selectedCompany}
                offerType={offerType}
                hasNajem={hasNajem}
                hasNakup={hasNakup}
                hasNajemItems={offerItemsNajem.some(i => i.purpose !== 'nakup')}
                hasNakupItems={offerItemsNajem.some(i => i.purpose === 'nakup')}
                emailHtml={generateEmailHTML()}
                primaryEmail={getPrimaryContact(selectedCompany)?.email || ''}
                onCopyEmail={(email) => {
                  navigator.clipboard.writeText(email);
                  toast({ description: `✅ Email kopiran: ${email}` });
                }}
                onCopySubject={(subject) => {
                  navigator.clipboard.writeText(subject);
                  toast({ description: '✅ Zadeva kopirana' });
                }}
                onCopyHtml={copyHTMLToClipboard}
                onSaveOffer={handleSaveOffer}
                onBack={() => {
                  if (hasNajem) setOfferStep('items-najem');
                  else if (hasNakup) setOfferStep('items-nakup');
                }}
                onClose={onClose}
              />
            )}
          </div>
        </Suspense>
      </div>
    </div>
  );
}

export default OfferModalWrapper;

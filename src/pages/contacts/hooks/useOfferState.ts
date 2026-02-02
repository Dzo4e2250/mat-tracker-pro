/**
 * @file useOfferState.ts
 * @description Hook za upravljanje stanja in logike ponudb
 */

import { useState, useCallback, useMemo } from 'react';
import {
  getRentalPrice, getPurchasePrice, getReplacementCost, getPriceByCode,
  DESIGN_SIZES, calculateM2FromDimensions, calculateCustomPrice, calculateCustomPurchasePrice,
  FrequencyKey
} from '@/utils/priceList';
import { usePriceSettings } from '@/hooks/usePrices';
import { OfferItem, ItemType } from '../types';

type OfferType = 'najem' | 'nakup' | 'primerjava' | 'dodatna';
type OfferStep = 'type' | 'items-nakup' | 'items-najem' | 'preview';

const createDefaultItem = (type: 'nakup' | 'najem'): OfferItem => ({
  id: '1',
  // Za nakup privzeto 'design', za najem 'standard'
  itemType: type === 'nakup' ? 'design' : 'standard',
  code: '',
  name: type === 'nakup' ? 'Predpražnik po meri' : 'Predpražnik',
  size: '',
  customized: false,
  quantity: 1,
  pricePerUnit: 0,
  ...(type === 'najem' && { replacementCost: 0, seasonal: false }),
});

interface UseOfferStateReturn {
  // Modal state
  showOfferModal: boolean;
  setShowOfferModal: (show: boolean) => void;

  // Offer configuration
  offerType: OfferType;
  setOfferType: (type: OfferType) => void;
  offerFrequency: string;
  offerStep: OfferStep;
  setOfferStep: (step: OfferStep) => void;

  // Computed helpers
  hasNajem: boolean;
  hasNakup: boolean;

  // Items
  offerItemsNakup: OfferItem[];
  offerItemsNajem: OfferItem[];

  // Actions
  openOfferModal: () => void;
  updateNajemPricesForFrequency: (frequency: string) => void;
  addCustomOfferItem: (type: 'nakup' | 'najem') => void;
  removeOfferItem: (id: string, type: 'nakup' | 'najem') => void;
  updateOfferItem: (id: string, updates: Partial<OfferItem>, type: 'nakup' | 'najem') => void;

  // Item type handlers
  handleItemTypeChange: (itemId: string, newItemType: ItemType, offerType: 'nakup' | 'najem') => void;
  handleStandardCodeSelect: (itemId: string, code: string, offerType: 'nakup' | 'najem') => void;
  handleDesignSizeSelect: (itemId: string, designCode: string, offerType: 'nakup' | 'najem') => void;
  handleCustomDimensionsChange: (itemId: string, dimensions: string, offerType: 'nakup' | 'najem') => void;
  handleSpecialShapeChange: (itemId: string, specialShape: boolean, offerType: 'nakup' | 'najem') => void;

  // Price handlers
  handlePriceChange: (itemId: string, newPrice: number, offerType: 'nakup' | 'najem') => void;
  handleDiscountChange: (itemId: string, discount: number, offerType: 'nakup' | 'najem') => void;

  // Seasonal handlers
  handleSeasonalToggle: (itemId: string, enabled: boolean) => void;
  handleSeasonalFrequencyChange: (itemId: string, newFrequency: string) => void;
  handleSeasonalPriceChange: (itemId: string, newPrice: number) => void;
  handleSeasonalDiscountChange: (itemId: string, discount: number) => void;
  handleNormalFrequencyChange: (itemId: string, newFrequency: string) => void;
  handleNormalPriceChange: (itemId: string, newPrice: number) => void;
  handleNormalDiscountChange: (itemId: string, discount: number) => void;

  // Calculations
  calculateOfferTotals: (type: 'nakup' | 'najem') => {
    totalItems: number;
    totalPrice?: number;
    weeklyTotal?: number;
    fourWeekTotal?: number;
    frequency?: string;
  };
}

export function useOfferState(): UseOfferStateReturn {
  // Modal state
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Offer configuration
  const [offerType, setOfferType] = useState<OfferType>('najem');
  const [offerFrequency, setOfferFrequency] = useState<string>('2');
  const [offerStep, setOfferStep] = useState<OfferStep>('type');

  // Price settings from admin panel
  const { data: priceSettings } = usePriceSettings();
  const specialShapeMultiplier = priceSettings?.special_shape_multiplier || 1.5;

  // Items
  const [offerItemsNakup, setOfferItemsNakup] = useState<OfferItem[]>([createDefaultItem('nakup')]);
  const [offerItemsNajem, setOfferItemsNajem] = useState<OfferItem[]>([createDefaultItem('najem')]);

  // Computed helpers
  const hasNajem = offerType === 'najem' || offerType === 'primerjava' || offerType === 'dodatna';
  const hasNakup = offerType === 'nakup' || offerType === 'primerjava' || offerType === 'dodatna';

  // Open offer modal and reset state
  const openOfferModal = useCallback(() => {
    setOfferType('najem');
    setOfferFrequency('2');
    setOfferItemsNakup([createDefaultItem('nakup')]);
    setOfferItemsNajem([createDefaultItem('najem')]);
    setOfferStep('type');
    setShowOfferModal(true);
  }, []);

  // Update najem prices when frequency changes
  const updateNajemPricesForFrequency = useCallback((newFrequency: string) => {
    setOfferFrequency(newFrequency);
    setOfferItemsNajem(prev => prev.map(item => {
      if (!item.code) return item;
      let newPrice: number;

      // First try to get price from PRICE_LIST (works for standard AND design items)
      const priceInfo = getPriceByCode(item.code);
      if (priceInfo) {
        newPrice = priceInfo.prices[newFrequency as FrequencyKey] || item.pricePerUnit;
      } else if (item.itemType === 'custom' && item.m2) {
        // Fall back to custom m² calculation for truly custom sizes
        newPrice = calculateCustomPrice(item.m2, newFrequency as FrequencyKey);
      } else {
        newPrice = item.pricePerUnit;
      }

      return {
        ...item,
        pricePerUnit: newPrice,
        originalPrice: newPrice,
        discount: 0,
      };
    }));
  }, []);

  const addCustomOfferItem = useCallback((type: 'nakup' | 'najem') => {
    const newItem: OfferItem = {
      id: Date.now().toString(),
      // Za nakup privzeto 'design', za najem 'standard'
      itemType: type === 'nakup' ? 'design' : 'standard',
      code: '',
      name: type === 'nakup' ? 'Predpražnik po meri' : 'Predpražnik',
      size: '',
      customized: false,
      quantity: 1,
      pricePerUnit: 0,
      ...(type === 'najem' && { replacementCost: 0, seasonal: false }),
    };
    if (type === 'nakup') {
      setOfferItemsNakup(prev => [...prev, newItem]);
    } else {
      setOfferItemsNajem(prev => [...prev, newItem]);
    }
  }, []);

  const removeOfferItem = useCallback((id: string, type: 'nakup' | 'najem') => {
    if (type === 'nakup') {
      setOfferItemsNakup(prev => prev.filter(item => item.id !== id));
    } else {
      setOfferItemsNajem(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const updateOfferItem = useCallback((id: string, updates: Partial<OfferItem>, type: 'nakup' | 'najem') => {
    if (type === 'nakup') {
      setOfferItemsNakup(prev => prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    } else {
      setOfferItemsNajem(prev => prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    }
  }, []);

  const handleItemTypeChange = useCallback((itemId: string, newItemType: ItemType, type: 'nakup' | 'najem') => {
    const updates: Partial<OfferItem> = { itemType: newItemType, code: '', size: '', m2: 0, pricePerUnit: 0, replacementCost: 0 };
    updateOfferItem(itemId, updates, type);
  }, [updateOfferItem]);

  const handleStandardCodeSelect = useCallback((itemId: string, code: string, type: 'nakup' | 'najem') => {
    const priceInfo = getPriceByCode(code);
    if (!priceInfo) return;
    const basePrice = type === 'nakup' ? priceInfo.odkup : priceInfo.prices[offerFrequency as FrequencyKey] || 0;
    const updates: Partial<OfferItem> = {
      code, size: priceInfo.dimensions, m2: priceInfo.m2, pricePerUnit: basePrice, originalPrice: basePrice, discount: 0,
      replacementCost: type === 'najem' ? priceInfo.odkup : 0,
    };
    updateOfferItem(itemId, updates, type);
  }, [offerFrequency, updateOfferItem]);

  const handleDesignSizeSelect = useCallback((itemId: string, designCode: string, type: 'nakup' | 'najem') => {
    const designSize = DESIGN_SIZES.find(d => d.code === designCode);
    if (!designSize) return;

    // First check if price exists in PRICE_LIST
    const priceInfo = getPriceByCode(designCode);
    const m2 = calculateM2FromDimensions(designSize.dimensions);

    let basePrice: number;
    let replacementCost: number;

    // Za nakup VEDNO uporabi m² × 165 €/m² (nova izdelava)
    // Za najem uporabi cene iz cenika, odkup pa kot replacement cost
    if (type === 'nakup') {
      basePrice = calculateCustomPurchasePrice(m2);
      replacementCost = 0;
    } else if (priceInfo) {
      // Najem: uporabi cene iz PRICE_LIST
      basePrice = priceInfo.prices[offerFrequency as FrequencyKey] || 0;
      replacementCost = priceInfo.odkup;
    } else {
      // Najem: fall back to m² calculation for non-standard sizes
      basePrice = calculateCustomPrice(m2, offerFrequency as FrequencyKey);
      replacementCost = calculateCustomPurchasePrice(m2);
    }

    const updates: Partial<OfferItem> = {
      code: designCode,
      size: designSize.dimensions,
      m2,
      pricePerUnit: basePrice,
      originalPrice: basePrice,
      discount: 0,
      replacementCost,
      name: 'predpražnik po meri'
    };
    updateOfferItem(itemId, updates, type);
  }, [offerFrequency, updateOfferItem]);

  const handleCustomDimensionsChange = useCallback((itemId: string, dimensions: string, type: 'nakup' | 'najem') => {
    const items = type === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const item = items.find(i => i.id === itemId);
    const specialShape = item?.specialShape ?? false;
    const multiplier = specialShape ? specialShapeMultiplier : 1;

    const m2 = calculateM2FromDimensions(dimensions);
    const basePrice = type === 'nakup'
      ? calculateCustomPurchasePrice(m2) * multiplier
      : calculateCustomPrice(m2, offerFrequency as FrequencyKey) * multiplier;
    const replacementCost = type === 'najem' ? calculateCustomPurchasePrice(m2) * multiplier : 0;
    updateOfferItem(itemId, { code: 'CUSTOM', size: dimensions, m2, pricePerUnit: basePrice, originalPrice: basePrice, discount: 0, replacementCost }, type);
  }, [offerFrequency, offerItemsNakup, offerItemsNajem, specialShapeMultiplier, updateOfferItem]);

  const handleSpecialShapeChange = useCallback((itemId: string, specialShape: boolean, type: 'nakup' | 'najem') => {
    const items = type === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const item = items.find(i => i.id === itemId);
    if (!item || !item.m2) return;

    const multiplier = specialShape ? specialShapeMultiplier : 1;
    const basePrice = type === 'nakup'
      ? calculateCustomPurchasePrice(item.m2) * multiplier
      : calculateCustomPrice(item.m2, offerFrequency as FrequencyKey) * multiplier;
    const replacementCost = type === 'najem' ? calculateCustomPurchasePrice(item.m2) * multiplier : 0;

    updateOfferItem(itemId, {
      specialShape,
      pricePerUnit: basePrice,
      originalPrice: basePrice,
      discount: 0,
      replacementCost
    }, type);
  }, [offerFrequency, offerItemsNakup, offerItemsNajem, specialShapeMultiplier, updateOfferItem]);

  const handlePriceChange = useCallback((itemId: string, newPrice: number, type: 'nakup' | 'najem') => {
    const items = type === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.originalPrice || item.pricePerUnit;
    const discount = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
    updateOfferItem(itemId, {
      pricePerUnit: newPrice,
      discount: discount > 0 ? discount : 0,
      originalPrice: item.originalPrice || originalPrice
    }, type);
  }, [offerItemsNakup, offerItemsNajem, updateOfferItem]);

  const handleDiscountChange = useCallback((itemId: string, discount: number, type: 'nakup' | 'najem') => {
    const items = type === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.originalPrice || (item.discount === 0 ? item.pricePerUnit : item.pricePerUnit);

    if (!discount || discount === 0) {
      updateOfferItem(itemId, {
        pricePerUnit: originalPrice,
        discount: 0,
        originalPrice: originalPrice
      }, type);
      return;
    }

    const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
    updateOfferItem(itemId, {
      pricePerUnit: newPrice,
      discount,
      originalPrice: originalPrice
    }, type);
  }, [offerItemsNakup, offerItemsNajem, updateOfferItem]);

  const handleSeasonalToggle = useCallback((itemId: string, enabled: boolean) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    if (enabled) {
      let normalBasePrice = 0;
      let seasonalBasePrice = 0;

      // First try PRICE_LIST (works for standard AND predefined design sizes)
      const priceData = getPriceByCode(item.code);
      if (priceData) {
        normalBasePrice = priceData.prices['4'];
        seasonalBasePrice = priceData.prices['1'];
      } else if (item.itemType === 'custom' && item.m2) {
        // Fall back to m² calculation for custom sizes
        normalBasePrice = calculateCustomPrice(item.m2, '4');
        seasonalBasePrice = calculateCustomPrice(item.m2, '1');
      }
      updateOfferItem(itemId, {
        seasonal: true,
        normalFromWeek: 13,
        normalToWeek: 44,
        normalFrequency: '4',
        normalPrice: normalBasePrice,
        normalOriginalPrice: normalBasePrice,
        normalDiscount: 0,
        seasonalFromWeek: 45,
        seasonalToWeek: 12,
        seasonalFrequency: '1',
        seasonalPrice: seasonalBasePrice,
        seasonalOriginalPrice: seasonalBasePrice,
        seasonalDiscount: 0
      }, 'najem');
    } else {
      updateOfferItem(itemId, {
        seasonal: false,
        normalFromWeek: undefined,
        normalToWeek: undefined,
        normalFrequency: undefined,
        normalPrice: undefined,
        normalOriginalPrice: undefined,
        normalDiscount: undefined,
        seasonalFromWeek: undefined,
        seasonalToWeek: undefined,
        seasonalFrequency: undefined,
        seasonalPrice: undefined,
        seasonalOriginalPrice: undefined,
        seasonalDiscount: undefined
      }, 'najem');
    }
  }, [offerItemsNajem, updateOfferItem]);

  const handleSeasonalFrequencyChange = useCallback((itemId: string, newFrequency: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    let seasonalBasePrice = 0;

    // First try PRICE_LIST (works for standard AND predefined design sizes)
    const priceData = getPriceByCode(item.code);
    if (priceData) {
      seasonalBasePrice = priceData.prices[newFrequency as FrequencyKey] || priceData.prices['1'];
    } else if (item.itemType === 'custom' && item.m2) {
      // Fall back to m² calculation for custom sizes
      seasonalBasePrice = calculateCustomPrice(item.m2, newFrequency as FrequencyKey);
    }

    updateOfferItem(itemId, { seasonalFrequency: newFrequency, seasonalPrice: seasonalBasePrice, seasonalOriginalPrice: seasonalBasePrice, seasonalDiscount: 0 }, 'najem');
  }, [offerItemsNajem, updateOfferItem]);

  const handleSeasonalPriceChange = useCallback((itemId: string, newPrice: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.seasonalOriginalPrice || newPrice;
    const discount = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
    updateOfferItem(itemId, {
      seasonalPrice: newPrice,
      seasonalDiscount: discount > 0 ? discount : 0,
      seasonalOriginalPrice: item.seasonalOriginalPrice || originalPrice
    }, 'najem');
  }, [offerItemsNajem, updateOfferItem]);

  const handleSeasonalDiscountChange = useCallback((itemId: string, discount: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.seasonalOriginalPrice || item.seasonalPrice || 0;

    if (!discount || discount === 0) {
      updateOfferItem(itemId, {
        seasonalPrice: originalPrice,
        seasonalDiscount: 0,
        seasonalOriginalPrice: originalPrice
      }, 'najem');
      return;
    }

    const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
    updateOfferItem(itemId, {
      seasonalPrice: newPrice,
      seasonalDiscount: discount,
      seasonalOriginalPrice: originalPrice
    }, 'najem');
  }, [offerItemsNajem, updateOfferItem]);

  const handleNormalFrequencyChange = useCallback((itemId: string, newFrequency: string) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    let normalBasePrice = 0;

    // First try PRICE_LIST (works for standard AND predefined design sizes)
    const priceData = getPriceByCode(item.code);
    if (priceData) {
      normalBasePrice = priceData.prices[newFrequency as FrequencyKey] || priceData.prices['1'];
    } else if (item.itemType === 'custom' && item.m2) {
      // Fall back to m² calculation for custom sizes
      normalBasePrice = calculateCustomPrice(item.m2, newFrequency as FrequencyKey);
    }

    updateOfferItem(itemId, { normalFrequency: newFrequency, normalPrice: normalBasePrice, normalOriginalPrice: normalBasePrice, normalDiscount: 0 }, 'najem');
  }, [offerItemsNajem, updateOfferItem]);

  const handleNormalPriceChange = useCallback((itemId: string, newPrice: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.normalOriginalPrice || newPrice;
    const discount = originalPrice > 0 ? Math.round((1 - newPrice / originalPrice) * 100) : 0;
    updateOfferItem(itemId, {
      normalPrice: newPrice,
      normalDiscount: discount > 0 ? discount : 0,
      normalOriginalPrice: item.normalOriginalPrice || originalPrice
    }, 'najem');
  }, [offerItemsNajem, updateOfferItem]);

  const handleNormalDiscountChange = useCallback((itemId: string, discount: number) => {
    const item = offerItemsNajem.find(i => i.id === itemId);
    if (!item) return;
    const originalPrice = item.normalOriginalPrice || item.normalPrice || 0;

    if (!discount || discount === 0) {
      updateOfferItem(itemId, {
        normalPrice: originalPrice,
        normalDiscount: 0,
        normalOriginalPrice: originalPrice
      }, 'najem');
      return;
    }

    const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
    updateOfferItem(itemId, {
      normalPrice: newPrice,
      normalDiscount: discount,
      normalOriginalPrice: originalPrice
    }, 'najem');
  }, [offerItemsNajem, updateOfferItem]);

  const calculateOfferTotals = useCallback((type: 'nakup' | 'najem') => {
    const items = type === 'nakup' ? offerItemsNakup : offerItemsNajem;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (type === 'nakup') {
      const totalPrice = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
      return { totalItems, totalPrice };
    } else {
      const weeklyTotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
      const fourWeekTotal = weeklyTotal * 4;
      return { totalItems, weeklyTotal, fourWeekTotal, frequency: offerFrequency };
    }
  }, [offerItemsNakup, offerItemsNajem, offerFrequency]);

  return {
    showOfferModal,
    setShowOfferModal,
    offerType,
    setOfferType,
    offerFrequency,
    offerStep,
    setOfferStep,
    hasNajem,
    hasNakup,
    offerItemsNakup,
    offerItemsNajem,
    openOfferModal,
    updateNajemPricesForFrequency,
    addCustomOfferItem,
    removeOfferItem,
    updateOfferItem,
    handleItemTypeChange,
    handleStandardCodeSelect,
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
    calculateOfferTotals,
  };
}

export default useOfferState;

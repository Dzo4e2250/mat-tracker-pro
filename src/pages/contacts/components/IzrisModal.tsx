/**
 * @file IzrisModal.tsx
 * @description Modal za pripravo izrisa predpražnika
 */

import { useState, useMemo } from 'react';
import { X, Palette, Package, RotateCcw, Image, Check } from 'lucide-react';
import {
  SUPPLIERS,
  getSupplier,
  MBW_SIZES,
  getTitlePrefix,
  type Supplier,
  type OrderType,
  type ColorCategory,
} from '@/data/supplierColors';
import { getTemplates, type MatType, type Orientation, type TemplateImage } from '@/data/izrisTemplates';

interface IzrisModalProps {
  companyName: string;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IzrisData) => void;
}

export interface IzrisData {
  supplier: Supplier;
  orderType: OrderType;
  backgroundColorCode: string;
  backgroundColorName: string;
  logoColorCode: string;
  logoColorName: string;
  isDesignerChoice: boolean;
  matType: MatType;
  mbwCode?: string;
  width: number;
  height: number;
  orientation: Orientation;
  selectedTemplate: TemplateImage | null;
  titlePrefix: string;
  companyName: string;
  companyId: string;
}

export function IzrisModal({
  companyName,
  companyId,
  isOpen,
  onClose,
  onSubmit,
}: IzrisModalProps) {
  // Form state
  const [supplier, setSupplier] = useState<Supplier>('mount_will');
  const [orderType, setOrderType] = useState<OrderType>('najem');
  const [bgCategory, setBgCategory] = useState<string>('');
  const [bgColor, setBgColor] = useState<string>('');
  const [logoCategory, setLogoCategory] = useState<string>('');
  const [logoColor, setLogoColor] = useState<string>('');
  const [isDesignerChoice, setIsDesignerChoice] = useState(false);
  const [matType, setMatType] = useState<MatType>('custom');
  const [mbwCode, setMbwCode] = useState<string>('');
  const [customWidth, setCustomWidth] = useState<string>('85');
  const [customHeight, setCustomHeight] = useState<string>('150');
  const [orientation, setOrientation] = useState<Orientation>('portret');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateImage | null>(null);

  // Get current supplier config
  const supplierConfig = useMemo(() => getSupplier(supplier), [supplier]);

  // Get available templates based on mat type and orientation
  const availableTemplates = useMemo(() => {
    return getTemplates(matType, orientation);
  }, [matType, orientation]);

  // Reset template when mat type or orientation changes
  const handleMatTypeChange = (newMatType: MatType, newMbwCode?: string) => {
    setMatType(newMatType);
    if (newMbwCode) {
      setMbwCode(newMbwCode);
      const mbwSize = MBW_SIZES.find(s => s.code === newMbwCode);
      if (mbwSize) {
        setCustomWidth(String(mbwSize.width));
        setCustomHeight(String(mbwSize.height));
      }
    }
    setSelectedTemplate(null);
  };

  const handleOrientationChange = (newOrientation: Orientation) => {
    setOrientation(newOrientation);
    setSelectedTemplate(null);
  };

  // Handle supplier change
  const handleSupplierChange = (newSupplier: Supplier) => {
    setSupplier(newSupplier);
    const config = getSupplier(newSupplier);
    if (config) {
      setOrderType(config.defaultOrderType);
    }
    // Reset colors
    setBgCategory('');
    setBgColor('');
    setLogoCategory('');
    setLogoColor('');
  };

  // Get dimensions string
  const getDimensionsString = () => {
    const w = String(parseInt(customWidth) || 0).padStart(3, '0');
    const h = String(parseInt(customHeight) || 0).padStart(3, '0');
    return `${w}x${h}`;
  };

  // Get title for Kanban
  const getTitle = () => {
    const prefix = getTitlePrefix(orderType);
    return `${prefix}-${companyName}-${getDimensionsString()}`;
  };

  // Handle submit
  const handleSubmit = () => {
    if (!selectedTemplate) {
      alert('Prosim izberi sliko pozicije');
      return;
    }

    const bgColorOption = supplierConfig?.hasCategories
      ? supplierConfig.categories?.flatMap(c => c.colors).find(c => c.code === bgColor)
      : { code: bgColor, name: bgColor };

    const logoColorOption = isDesignerChoice
      ? { code: 'DC', name: 'Designer Choice' }
      : supplierConfig?.hasCategories
        ? supplierConfig.categories?.flatMap(c => c.colors).find(c => c.code === logoColor)
        : { code: logoColor, name: logoColor };

    onSubmit({
      supplier,
      orderType,
      backgroundColorCode: bgColorOption?.code || bgColor,
      backgroundColorName: bgColorOption?.name || bgColor,
      logoColorCode: logoColorOption?.code || logoColor,
      logoColorName: logoColorOption?.name || logoColor,
      isDesignerChoice,
      matType,
      mbwCode: matType !== 'custom' ? mbwCode : undefined,
      width: parseInt(customWidth) || 0,
      height: parseInt(customHeight) || 0,
      orientation,
      selectedTemplate,
      titlePrefix: getTitlePrefix(orderType),
      companyName,
      companyId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-amber-50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="text-amber-600" size={20} />
            Pripravi izris - {companyName}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-amber-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Dobavitelj */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">1. Dobavitelj</label>
            <div className="flex gap-2">
              {SUPPLIERS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSupplierChange(s.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    supplier === s.id
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Najem/Nakup (samo za Mount Will) */}
          {supplierConfig?.orderTypes.length === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">2. Vrsta</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('najem')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    orderType === 'najem'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Najem (DESIGN)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('nakup')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    orderType === 'nakup'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Nakup (PROMO)
                </button>
              </div>
            </div>
          )}

          {/* Auto-set message for EMCO/Kleen-Tex */}
          {supplierConfig?.orderTypes.length === 1 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <span className="font-medium">
                {orderType === 'najem' ? '📘 DESIGN (Najem)' : '📗 PROMO (Nakup)'}
              </span>
              {' - avtomatsko nastavljeno za {supplierConfig.name}'}
            </div>
          )}

          {/* 3. Barva ozadja */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Barva ozadja
            </label>
            {supplierConfig?.hasCategories ? (
              <div className="space-y-2">
                {/* Category selector */}
                <select
                  value={bgCategory}
                  onChange={(e) => {
                    setBgCategory(e.target.value);
                    setBgColor('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Izberi kategorijo...</option>
                  {supplierConfig.categories?.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {/* Color selector */}
                {bgCategory && (
                  <select
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Izberi barvo...</option>
                    {supplierConfig.categories
                      ?.find(c => c.name === bgCategory)
                      ?.colors.map(color => (
                        <option key={color.code} value={color.code}>
                          {color.code} - {color.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            ) : (
              <select
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Izberi številko...</option>
                {supplierConfig?.colors?.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Barva logotipa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              4. Barva logotipa
            </label>
            {/* Designer choice checkbox */}
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDesignerChoice}
                onChange={(e) => setIsDesignerChoice(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Designer choice</span>
            </label>

            {!isDesignerChoice && (
              supplierConfig?.hasCategories ? (
                <div className="space-y-2">
                  <select
                    value={logoCategory}
                    onChange={(e) => {
                      setLogoCategory(e.target.value);
                      setLogoColor('');
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Izberi kategorijo...</option>
                    {supplierConfig.categories?.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  {logoCategory && (
                    <select
                      value={logoColor}
                      onChange={(e) => setLogoColor(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Izberi barvo...</option>
                      {supplierConfig.categories
                        ?.find(c => c.name === logoCategory)
                        ?.colors.map(color => (
                          <option key={color.code} value={color.code}>
                            {color.code} - {color.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              ) : (
                <select
                  value={logoColor}
                  onChange={(e) => setLogoColor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Izberi številko...</option>
                  {supplierConfig?.colors?.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              )
            )}
          </div>

          {/* 5. Dimenzije predpražnika */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package size={16} className="inline mr-1" />
              5. Dimenzije predpražnika (cm)
            </label>
            <div className="flex gap-3">
              <div>
                <label className="text-xs text-gray-500">Širina</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-24 px-3 py-2 border rounded-lg"
                  placeholder="85"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Dolžina</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-24 px-3 py-2 border rounded-lg"
                  placeholder="150"
                />
              </div>
            </div>
          </div>

          {/* 6. Orientacija */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <RotateCcw size={16} className="inline mr-1" />
              6. Orientacija
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleOrientationChange('portret')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  orientation === 'portret'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                📱 Portret
              </button>
              <button
                type="button"
                onClick={() => handleOrientationChange('landscape')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  orientation === 'landscape'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                🖥️ Landscape
              </button>
            </div>
          </div>

          {/* 7. Izbira slike pozicije */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image size={16} className="inline mr-1" />
              7. Izberi pozicijo logotipa
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableTemplates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-amber-500 ring-2 ring-amber-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={template.path}
                    alt={template.label}
                    className="w-full h-24 object-contain bg-gray-50"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                    {template.label}
                  </div>
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-1">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Predogled naslova:</h4>
            <code className="block bg-white px-3 py-2 rounded border text-lg font-mono">
              {getTitle()}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            Prekliči
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedTemplate}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Ustvari izris
          </button>
        </div>
      </div>
    </div>
  );
}

export default IzrisModal;

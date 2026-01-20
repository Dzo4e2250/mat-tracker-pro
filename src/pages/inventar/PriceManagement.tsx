/**
 * @file PriceManagement.tsx
 * @description Upravljanje cenika - Admin panel
 */

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Percent, Save, RefreshCw, AlertTriangle, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useMatPrices,
  useOptibrushPricesFromDB,
  useCustomM2Prices,
  usePriceSettings,
  useUpdateMatPrice,
  useUpdateOptibrushPrice,
  useUpdateCustomM2Price,
  useUpdatePriceSetting,
  useBulkPriceIncrease,
  MatPrice,
  OptibrushPrice,
  CustomM2Price,
} from '@/hooks/usePrices';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TabType = 'vse' | 'poslovni' | 'ergonomski' | 'zunanji' | 'design' | 'optibrush' | 'custom_m2';

// Kategorije za prikaz
const CATEGORY_LABELS: Record<string, string> = {
  poslovni: 'MBW',
  ergonomski: 'ERM',
  zunanji: 'Zunanji',
  design: 'Design',
};

// Tipi za pending spremembe
interface PendingMatChange {
  id: string;
  field: string;
  oldValue: number;
  newValue: number;
}

interface PendingOptibrushChange {
  id: string;
  oldValue: number;
  newValue: number;
}

interface PendingCustomM2Change {
  id: string;
  oldValue: number;
  newValue: number;
}

interface PendingSettingChange {
  key: string;
  oldValue: number;
  newValue: number;
}

export default function PriceManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('vse');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkPercentage, setBulkPercentage] = useState<string>('');
  const [priceType, setPriceType] = useState<'all' | 'rental' | 'purchase'>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pending changes
  const [pendingMatChanges, setPendingMatChanges] = useState<Map<string, PendingMatChange>>(new Map());
  const [pendingOptibrushChanges, setPendingOptibrushChanges] = useState<Map<string, PendingOptibrushChange>>(new Map());
  const [pendingCustomM2Changes, setPendingCustomM2Changes] = useState<Map<string, PendingCustomM2Change>>(new Map());
  const [pendingSettingChanges, setPendingSettingChanges] = useState<Map<string, PendingSettingChange>>(new Map());

  // Fetch data
  const { data: matPrices, isLoading: loadingMat } = useMatPrices();
  const { data: optibrushPrices, isLoading: loadingOptibrush } = useOptibrushPricesFromDB();
  const { data: customM2Prices, isLoading: loadingCustom } = useCustomM2Prices();
  const { data: settings } = usePriceSettings();

  // Mutations
  const updateMatPrice = useUpdateMatPrice();
  const updateOptibrushPrice = useUpdateOptibrushPrice();
  const updateCustomM2Price = useUpdateCustomM2Price();
  const updatePriceSetting = useUpdatePriceSetting();
  const bulkIncrease = useBulkPriceIncrease();

  const isLoading = loadingMat || loadingOptibrush || loadingCustom;

  // Število vseh pending sprememb
  const totalPendingChanges = useMemo(() => {
    return pendingMatChanges.size + pendingOptibrushChanges.size + pendingCustomM2Changes.size + pendingSettingChanges.size;
  }, [pendingMatChanges, pendingOptibrushChanges, pendingCustomM2Changes, pendingSettingChanges]);

  const hasUnsavedChanges = totalPendingChanges > 0;

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'vse', label: 'Vse cene' },
    { key: 'poslovni', label: 'MBW' },
    { key: 'ergonomski', label: 'ERM' },
    { key: 'zunanji', label: 'Zunanji' },
    { key: 'design', label: 'Design' },
    { key: 'optibrush', label: 'Optibrush' },
    { key: 'custom_m2', label: 'Custom m²' },
  ];

  // Filtrirane cene za "vse" tab
  const filteredAllPrices = useMemo(() => {
    if (!matPrices) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matPrices;
    return matPrices.filter(p =>
      p.code.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.dimensions.toLowerCase().includes(query) ||
      CATEGORY_LABELS[p.category]?.toLowerCase().includes(query)
    );
  }, [matPrices, searchQuery]);

  const handleBulkIncrease = async () => {
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct === 0) {
      toast({ title: 'Napaka', description: 'Vnesi veljaven odstotek', variant: 'destructive' });
      return;
    }

    try {
      await bulkIncrease.mutateAsync({
        category: activeTab,
        percentage: pct,
        priceType: activeTab === 'optibrush' || activeTab === 'custom_m2' ? undefined : priceType,
      });
      toast({
        title: 'Uspešno',
        description: `Cene ${activeTab} so bile povišane za ${pct}%`,
      });
      setBulkPercentage('');
      // Počisti pending changes za to kategorijo
      if (['poslovni', 'ergonomski', 'zunanji', 'design'].includes(activeTab)) {
        setPendingMatChanges(new Map());
      } else if (activeTab === 'optibrush') {
        setPendingOptibrushChanges(new Map());
      } else {
        setPendingCustomM2Changes(new Map());
      }
    } catch (err) {
      toast({ title: 'Napaka', description: 'Napaka pri posodabljanju cen', variant: 'destructive' });
    }
  };

  // Handlers za pending changes
  const handleMatPriceChange = (id: string, field: string, oldValue: number, newValue: number) => {
    const key = `${id}-${field}`;
    setPendingMatChanges(prev => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(key);
      } else {
        next.set(key, { id, field, oldValue, newValue });
      }
      return next;
    });
  };

  const handleOptibrushPriceChange = (id: string, oldValue: number, newValue: number) => {
    setPendingOptibrushChanges(prev => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(id);
      } else {
        next.set(id, { id, oldValue, newValue });
      }
      return next;
    });
  };

  const handleCustomM2PriceChange = (id: string, oldValue: number, newValue: number) => {
    setPendingCustomM2Changes(prev => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(id);
      } else {
        next.set(id, { id, oldValue, newValue });
      }
      return next;
    });
  };

  const handleSettingChange = (key: string, oldValue: number, newValue: number) => {
    setPendingSettingChanges(prev => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(key);
      } else {
        next.set(key, { key, oldValue, newValue });
      }
      return next;
    });
  };

  // Shrani vse spremembe
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Shrani mat cene
      for (const change of pendingMatChanges.values()) {
        await updateMatPrice.mutateAsync({ id: change.id, updates: { [change.field]: change.newValue } });
      }

      // Shrani optibrush cene
      for (const change of pendingOptibrushChanges.values()) {
        await updateOptibrushPrice.mutateAsync({ id: change.id, price_per_m2: change.newValue });
      }

      // Shrani custom m² cene
      for (const change of pendingCustomM2Changes.values()) {
        await updateCustomM2Price.mutateAsync({ id: change.id, price_per_m2: change.newValue });
      }

      // Shrani nastavitve
      for (const change of pendingSettingChanges.values()) {
        await updatePriceSetting.mutateAsync({ key: change.key, value: change.newValue });
      }

      // Počisti vse pending changes
      setPendingMatChanges(new Map());
      setPendingOptibrushChanges(new Map());
      setPendingCustomM2Changes(new Map());
      setPendingSettingChanges(new Map());

      toast({ title: 'Shranjeno', description: `${totalPendingChanges} sprememb uspešno shranjenih` });
    } catch (err) {
      toast({ title: 'Napaka', description: 'Napaka pri shranjevanju sprememb', variant: 'destructive' });
    } finally {
      setIsSaving(false);
      setShowConfirmDialog(false);
    }
  };

  // Prekliči vse spremembe
  const handleDiscardChanges = () => {
    setPendingMatChanges(new Map());
    setPendingOptibrushChanges(new Map());
    setPendingCustomM2Changes(new Map());
    setPendingSettingChanges(new Map());
    toast({ title: 'Preklicano', description: 'Spremembe so bile preklicane' });
  };

  const filteredMatPrices = matPrices?.filter(p => p.category === activeTab) || [];

  const getOptibrushLabel = (p: OptibrushPrice): string => {
    const parts: string[] = [];
    parts.push(p.has_edge ? 'Z robom' : 'Brez roba');
    parts.push(p.has_drainage ? 'z drenažnimi' : 'brez drenažnih');
    if (p.is_standard) parts.push('standard');
    else parts.push(p.is_large ? '>7.5m²' : '≤7.5m²');
    parts.push(p.color_count === '1' ? '1 barva' : '2-3 barve');
    return parts.join(', ');
  };

  const getCustomM2Label = (p: CustomM2Price): string => {
    const size = p.size_category === 'small' ? '≤2 m²' : '>2 m²';
    const freq = `${p.frequency} ${p.frequency === '1' ? 'teden' : 'tedni'}`;
    return `${size}, ${freq}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/inventar')} className="p-2 hover:bg-gray-100 rounded">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold">Upravljanje cenika</h1>
          </div>

          {/* Save/Discard buttons */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <>
                <span className="text-sm text-orange-600 flex items-center gap-1">
                  <AlertTriangle size={16} />
                  {totalPendingChanges} neshranjenih sprememb
                </span>
                <button
                  onClick={handleDiscardChanges}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Prekliči
                </button>
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Shrani
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 bg-white p-1 rounded-lg shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar - only for "vse" tab */}
        {activeTab === 'vse' && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Išči po kodi, imenu, dimenzijah..."
                className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-2">
                Najdeno {filteredAllPrices.length} od {matPrices?.length || 0} cen
              </p>
            )}
          </div>
        )}

        {/* Bulk increase - not for "vse" tab */}
        {activeTab !== 'vse' && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Percent size={18} className="text-blue-500" />
              <span className="font-medium">Hitro povišanje cen</span>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Odstotek %</label>
                <input
                  type="number"
                  step="0.1"
                  value={bulkPercentage}
                  onChange={e => setBulkPercentage(e.target.value)}
                  className="w-24 p-2 border rounded text-sm"
                  placeholder="5"
                />
              </div>
              {activeTab !== 'optibrush' && activeTab !== 'custom_m2' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tip cen</label>
                  <select
                    value={priceType}
                    onChange={e => setPriceType(e.target.value as 'all' | 'rental' | 'purchase')}
                    className="p-2 border rounded text-sm"
                  >
                    <option value="all">Vse</option>
                    <option value="rental">Samo najem</option>
                    <option value="purchase">Samo nakup</option>
                  </select>
                </div>
              )}
              <button
                onClick={handleBulkIncrease}
                disabled={bulkIncrease.isPending || !bulkPercentage}
                className="px-4 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 flex items-center gap-2"
              >
                {bulkIncrease.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Percent size={16} />}
                Uporabi
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Pozitivna vrednost poviša cene, negativna zniža (npr. -5 za 5% znižanje)
            </p>
          </div>
        )}

        {/* Price table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Nalagam cene...</div>
          ) : (
            <>
              {/* All prices - unified view */}
              {activeTab === 'vse' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Kategorija</th>
                        <th className="px-3 py-2 text-left">Koda</th>
                        <th className="px-3 py-2 text-left">Dimenzije</th>
                        <th className="px-3 py-2 text-right">1 ted</th>
                        <th className="px-3 py-2 text-right">2 ted</th>
                        <th className="px-3 py-2 text-right">3 ted</th>
                        <th className="px-3 py-2 text-right">4 ted</th>
                        <th className="px-3 py-2 text-right">Nakup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllPrices.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                            {searchQuery ? 'Ni rezultatov za iskanje' : 'Ni cen'}
                          </td>
                        </tr>
                      ) : (
                        filteredAllPrices.map(price => (
                          <AllPricesRow
                            key={price.id}
                            price={price}
                            categoryLabel={CATEGORY_LABELS[price.category] || price.category}
                            pendingChanges={pendingMatChanges}
                            onChange={handleMatPriceChange}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mat prices (MBW, ERM, Design) - individual categories */}
              {['poslovni', 'ergonomski', 'zunanji', 'design'].includes(activeTab) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Koda</th>
                        <th className="px-3 py-2 text-left">Dimenzije</th>
                        <th className="px-3 py-2 text-right">1 ted</th>
                        <th className="px-3 py-2 text-right">2 ted</th>
                        <th className="px-3 py-2 text-right">3 ted</th>
                        <th className="px-3 py-2 text-right">4 ted</th>
                        <th className="px-3 py-2 text-right">Nakup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatPrices.map(price => (
                        <MatPriceRow
                          key={price.id}
                          price={price}
                          pendingChanges={pendingMatChanges}
                          onChange={handleMatPriceChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Optibrush prices */}
              {activeTab === 'optibrush' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Konfiguracija</th>
                        <th className="px-3 py-2 text-right">€/m²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optibrushPrices?.map(price => {
                        const pending = pendingOptibrushChanges.get(price.id);
                        const currentValue = pending?.newValue ?? price.price_per_m2;
                        const isChanged = pending !== undefined;

                        return (
                          <tr key={price.id} className={`border-t hover:bg-gray-50 ${isChanged ? 'bg-yellow-50' : ''}`}>
                            <td className="px-3 py-2">{getOptibrushLabel(price)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={currentValue}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    handleOptibrushPriceChange(price.id, price.price_per_m2, val);
                                  }
                                }}
                                className={`w-24 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Custom m² prices */}
              {activeTab === 'custom_m2' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Kategorija</th>
                        <th className="px-3 py-2 text-right">€/m²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customM2Prices?.map(price => {
                        const pending = pendingCustomM2Changes.get(price.id);
                        const currentValue = pending?.newValue ?? price.price_per_m2;
                        const isChanged = pending !== undefined;

                        return (
                          <tr key={price.id} className={`border-t hover:bg-gray-50 ${isChanged ? 'bg-yellow-50' : ''}`}>
                            <td className="px-3 py-2">{getCustomM2Label(price)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={currentValue}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    handleCustomM2PriceChange(price.id, price.price_per_m2, val);
                                  }
                                }}
                                className={`w-24 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Settings - editable */}
        {settings && (
          <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
            <div className="font-medium text-gray-800 mb-3">Splošne nastavitve</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <SettingInput
                label="Posebne oblike najem"
                settingKey="special_shape_multiplier"
                value={settings.special_shape_multiplier || 1.5}
                isPercentage
                pendingChanges={pendingSettingChanges}
                onChange={handleSettingChange}
              />
              <SettingInput
                label="Posebne oblike Optibrush"
                settingKey="optibrush_special_shape_multiplier"
                value={settings.optibrush_special_shape_multiplier || 1.3}
                isPercentage
                pendingChanges={pendingSettingChanges}
                onChange={handleSettingChange}
              />
              <SettingInput
                label="Design nakup"
                settingKey="design_purchase_price_per_m2"
                value={settings.design_purchase_price_per_m2 || 165}
                suffix="€/m²"
                pendingChanges={pendingSettingChanges}
                onChange={handleSettingChange}
              />
              <SettingInput
                label="Optibrush prag velikosti"
                settingKey="optibrush_m2_threshold"
                value={settings.optibrush_m2_threshold || 7.5}
                suffix="m²"
                pendingChanges={pendingSettingChanges}
                onChange={handleSettingChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shrani spremembe?</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite shraniti {totalPendingChanges} sprememb cenika?
              Te spremembe bodo takoj vidne v sistemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  Shranjujem...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Da, shrani
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Mat price row component
function MatPriceRow({
  price,
  pendingChanges,
  onChange,
}: {
  price: MatPrice;
  pendingChanges: Map<string, PendingMatChange>;
  onChange: (id: string, field: string, oldValue: number, newValue: number) => void;
}) {
  const fields = ['price_week_1', 'price_week_2', 'price_week_3', 'price_week_4', 'price_purchase'] as const;

  const getValue = (field: string) => {
    const key = `${price.id}-${field}`;
    const pending = pendingChanges.get(key);
    return pending?.newValue ?? (price[field as keyof MatPrice] as number);
  };

  const isFieldChanged = (field: string) => {
    const key = `${price.id}-${field}`;
    return pendingChanges.has(key);
  };

  const hasAnyChange = fields.some(f => isFieldChanged(f));

  return (
    <tr className={`border-t hover:bg-gray-50 ${hasAnyChange ? 'bg-yellow-50' : ''}`}>
      <td className="px-3 py-2 font-medium">{price.code}</td>
      <td className="px-3 py-2 text-gray-500">{price.dimensions}</td>
      {fields.map(field => {
        const isChanged = isFieldChanged(field);
        const originalValue = price[field as keyof MatPrice] as number;

        return (
          <td key={field} className="px-3 py-2">
            <input
              type="number"
              step="0.01"
              value={getValue(field)}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange(price.id, field, originalValue, val);
                }
              }}
              className={`w-20 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
          </td>
        );
      })}
    </tr>
  );
}

// All prices row component (for unified view)
function AllPricesRow({
  price,
  categoryLabel,
  pendingChanges,
  onChange,
}: {
  price: MatPrice;
  categoryLabel: string;
  pendingChanges: Map<string, PendingMatChange>;
  onChange: (id: string, field: string, oldValue: number, newValue: number) => void;
}) {
  const fields = ['price_week_1', 'price_week_2', 'price_week_3', 'price_week_4', 'price_purchase'] as const;

  const getValue = (field: string) => {
    const key = `${price.id}-${field}`;
    const pending = pendingChanges.get(key);
    return pending?.newValue ?? (price[field as keyof MatPrice] as number);
  };

  const isFieldChanged = (field: string) => {
    const key = `${price.id}-${field}`;
    return pendingChanges.has(key);
  };

  const hasAnyChange = fields.some(f => isFieldChanged(f));

  // Barva za kategorijo
  const categoryColors: Record<string, string> = {
    MBW: 'bg-blue-100 text-blue-800',
    ERM: 'bg-green-100 text-green-800',
    Zunanji: 'bg-purple-100 text-purple-800',
    Design: 'bg-pink-100 text-pink-800',
  };

  return (
    <tr className={`border-t hover:bg-gray-50 ${hasAnyChange ? 'bg-yellow-50' : ''}`}>
      <td className="px-3 py-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[categoryLabel] || 'bg-gray-100 text-gray-800'}`}>
          {categoryLabel}
        </span>
      </td>
      <td className="px-3 py-2 font-medium font-mono">{price.code}</td>
      <td className="px-3 py-2 text-gray-500">{price.dimensions}</td>
      {fields.map(field => {
        const isChanged = isFieldChanged(field);
        const originalValue = price[field as keyof MatPrice] as number;

        return (
          <td key={field} className="px-3 py-2">
            <input
              type="number"
              step="0.01"
              value={getValue(field)}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange(price.id, field, originalValue, val);
                }
              }}
              className={`w-20 p-1 border rounded text-right ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
            />
          </td>
        );
      })}
    </tr>
  );
}

// Setting input component
function SettingInput({
  label,
  settingKey,
  value,
  suffix,
  isPercentage,
  pendingChanges,
  onChange,
}: {
  label: string;
  settingKey: string;
  value: number;
  suffix?: string;
  isPercentage?: boolean;
  pendingChanges: Map<string, PendingSettingChange>;
  onChange: (key: string, oldValue: number, newValue: number) => void;
}) {
  const pending = pendingChanges.get(settingKey);
  const isChanged = pending !== undefined;

  // Za odstotke: prikaži kot % (npr. 1.5 -> 50%), shrani kot množitelj
  const displayValue = isPercentage ? (value - 1) * 100 : value;
  const currentDisplayValue = pending
    ? (isPercentage ? (pending.newValue - 1) * 100 : pending.newValue)
    : displayValue;

  const handleChange = (inputVal: string) => {
    const numVal = parseFloat(inputVal);
    if (isNaN(numVal)) return;

    const saveValue = isPercentage ? 1 + numVal / 100 : numVal;
    onChange(settingKey, value, saveValue);
  };

  return (
    <div className={`flex items-center justify-between gap-2 p-2 rounded ${isChanged ? 'bg-yellow-50' : 'bg-gray-50'}`}>
      <label className="text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        {isPercentage && <span className="text-gray-400">+</span>}
        <input
          type="number"
          step={isPercentage ? '1' : '0.01'}
          value={currentDisplayValue}
          onChange={e => handleChange(e.target.value)}
          className={`w-20 p-1 border rounded text-right text-sm ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
        />
        <span className="text-gray-500 text-sm w-12">{isPercentage ? '%' : suffix}</span>
      </div>
    </div>
  );
}

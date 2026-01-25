/**
 * @file PriceManagement.tsx
 * @description Upravljanje cenika - Admin panel
 */

import { useState, useMemo } from 'react';
import { ArrowLeft, Percent, Save, RefreshCw, AlertTriangle, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useMatPrices,
  useOptibrushPricesFromDB,
  useCustomM2Prices,
  usePriceSettings,
  useBulkPriceIncrease,
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

import {
  usePriceChanges,
  TABS,
  CATEGORY_LABELS,
  MatPriceRow,
  AllPricesRow,
  SettingsPanel,
  OptibrushTable,
  CustomM2Table,
  type TabType,
} from './prices';

export default function PriceManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('vse');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkPercentage, setBulkPercentage] = useState<string>('');
  const [priceType, setPriceType] = useState<'all' | 'rental' | 'purchase'>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Price changes hook
  const priceChanges = usePriceChanges();

  // Fetch data
  const { data: matPrices, isLoading: loadingMat } = useMatPrices();
  const { data: optibrushPrices, isLoading: loadingOptibrush } = useOptibrushPricesFromDB();
  const { data: customM2Prices, isLoading: loadingCustom } = useCustomM2Prices();
  const { data: settings } = usePriceSettings();
  const bulkIncrease = useBulkPriceIncrease();

  const isLoading = loadingMat || loadingOptibrush || loadingCustom;

  // Filtered prices for "vse" tab
  const filteredAllPrices = useMemo(() => {
    if (!matPrices) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matPrices;
    return matPrices.filter(
      (p) =>
        p.code.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.dimensions.toLowerCase().includes(query) ||
        CATEGORY_LABELS[p.category]?.toLowerCase().includes(query)
    );
  }, [matPrices, searchQuery]);

  const filteredMatPrices = matPrices?.filter((p) => p.category === activeTab) || [];

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
      priceChanges.clearCategoryChanges(activeTab);
    } catch (err) {
      toast({ title: 'Napaka', description: 'Napaka pri posodabljanju cen', variant: 'destructive' });
    }
  };

  const handleSaveAndClose = async () => {
    await priceChanges.handleSaveAll();
    setShowConfirmDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventar')}
              className="p-2 hover:bg-gray-100 rounded"
              aria-label="Nazaj na inventar"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold">Upravljanje cenika</h1>
          </div>

          {/* Save/Discard buttons */}
          <div className="flex items-center gap-2">
            {priceChanges.hasUnsavedChanges && (
              <>
                <span className="text-sm text-orange-600 flex items-center gap-1">
                  <AlertTriangle size={16} />
                  {priceChanges.totalPendingChanges} neshranjenih sprememb
                </span>
                <button
                  onClick={priceChanges.handleDiscardChanges}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Prekliči
                </button>
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={priceChanges.isSaving}
                  className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                >
                  {priceChanges.isSaving ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
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
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Išči po kodi, imenu, dimenzijah..."
                className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Počisti iskanje"
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
                  onChange={(e) => setBulkPercentage(e.target.value)}
                  className="w-24 p-2 border rounded text-sm"
                  placeholder="5"
                />
              </div>
              {activeTab !== 'optibrush' && activeTab !== 'custom_m2' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tip cen</label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value as 'all' | 'rental' | 'purchase')}
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
                {bulkIncrease.isPending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Percent size={16} />
                )}
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
                        filteredAllPrices.map((price) => (
                          <AllPricesRow
                            key={price.id}
                            price={price}
                            categoryLabel={CATEGORY_LABELS[price.category] || price.category}
                            pendingChanges={priceChanges.pendingMatChanges}
                            onChange={priceChanges.handleMatPriceChange}
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
                      {filteredMatPrices.map((price) => (
                        <MatPriceRow
                          key={price.id}
                          price={price}
                          pendingChanges={priceChanges.pendingMatChanges}
                          onChange={priceChanges.handleMatPriceChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Optibrush prices */}
              {activeTab === 'optibrush' && (
                <OptibrushTable
                  prices={optibrushPrices}
                  pendingChanges={priceChanges.pendingOptibrushChanges}
                  onChange={priceChanges.handleOptibrushPriceChange}
                />
              )}

              {/* Custom m² prices */}
              {activeTab === 'custom_m2' && (
                <CustomM2Table
                  prices={customM2Prices}
                  pendingChanges={priceChanges.pendingCustomM2Changes}
                  onChange={priceChanges.handleCustomM2PriceChange}
                />
              )}
            </>
          )}
        </div>

        {/* Settings */}
        {settings && (
          <SettingsPanel
            settings={settings}
            pendingChanges={priceChanges.pendingSettingChanges}
            onChange={priceChanges.handleSettingChange}
          />
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shrani spremembe?</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite shraniti {priceChanges.totalPendingChanges} sprememb
              cenika? Te spremembe bodo takoj vidne v sistemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={priceChanges.isSaving}>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveAndClose}
              disabled={priceChanges.isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {priceChanges.isSaving ? (
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

/**
 * @file PriceManagement.tsx
 * @description Upravljanje cenika - Admin panel
 * Poenostavljena verzija z 2 zavihkoma: NAJEM in NAKUP
 */

import { useState } from 'react';
import { ArrowLeft, Save, RefreshCw, AlertTriangle } from 'lucide-react';
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
  NajemTab,
  NakupTab,
  type TabType,
} from './prices';

export default function PriceManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('najem');
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

  const handleBulkIncrease = async (percentage: number) => {
    try {
      // Apply to all mat categories for najem
      await bulkIncrease.mutateAsync({
        category: 'vse' as any,
        percentage,
        priceType: 'all',
      });
      toast({
        title: 'Uspešno',
        description: `Vse najem cene so bile spremenjene za ${percentage}%`,
      });
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
        {/* Tabs - samo 2: NAJEM in NAKUP */}
        <div className="flex gap-1 mb-4 bg-white p-1 rounded-lg shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 rounded text-sm font-bold transition-colors ${
                activeTab === tab.key
                  ? tab.key === 'najem'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Nalagam cene...
          </div>
        ) : (
          <>
            {activeTab === 'najem' && (
              <NajemTab
                matPrices={matPrices}
                customM2Prices={customM2Prices}
                settings={settings}
                pendingMatChanges={priceChanges.pendingMatChanges}
                pendingCustomM2Changes={priceChanges.pendingCustomM2Changes}
                pendingSettingChanges={priceChanges.pendingSettingChanges}
                onMatPriceChange={priceChanges.handleMatPriceChange}
                onCustomM2PriceChange={priceChanges.handleCustomM2PriceChange}
                onSettingChange={priceChanges.handleSettingChange}
                onBulkIncrease={handleBulkIncrease}
                isBulkLoading={bulkIncrease.isPending}
              />
            )}

            {activeTab === 'nakup' && (
              <NakupTab
                optibrushPrices={optibrushPrices}
                settings={settings}
                pendingOptibrushChanges={priceChanges.pendingOptibrushChanges}
                pendingSettingChanges={priceChanges.pendingSettingChanges}
                onOptibrushPriceChange={priceChanges.handleOptibrushPriceChange}
                onSettingChange={priceChanges.handleSettingChange}
              />
            )}
          </>
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

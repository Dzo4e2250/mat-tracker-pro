import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  useUpdateMatPrice,
  useUpdateOptibrushPrice,
  useUpdateCustomM2Price,
  useUpdatePriceSetting,
} from '@/hooks/usePrices';

export interface PendingMatChange {
  id: string;
  field: string;
  oldValue: number;
  newValue: number;
}

export interface PendingOptibrushChange {
  id: string;
  oldValue: number;
  newValue: number;
}

export interface PendingCustomM2Change {
  id: string;
  oldValue: number;
  newValue: number;
}

export interface PendingSettingChange {
  key: string;
  oldValue: number;
  newValue: number;
}

export function usePriceChanges() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Pending changes maps
  const [pendingMatChanges, setPendingMatChanges] = useState<
    Map<string, PendingMatChange>
  >(new Map());
  const [pendingOptibrushChanges, setPendingOptibrushChanges] = useState<
    Map<string, PendingOptibrushChange>
  >(new Map());
  const [pendingCustomM2Changes, setPendingCustomM2Changes] = useState<
    Map<string, PendingCustomM2Change>
  >(new Map());
  const [pendingSettingChanges, setPendingSettingChanges] = useState<
    Map<string, PendingSettingChange>
  >(new Map());

  // Mutations
  const updateMatPrice = useUpdateMatPrice();
  const updateOptibrushPrice = useUpdateOptibrushPrice();
  const updateCustomM2Price = useUpdateCustomM2Price();
  const updatePriceSetting = useUpdatePriceSetting();

  // Count total pending changes
  const totalPendingChanges = useMemo(() => {
    return (
      pendingMatChanges.size +
      pendingOptibrushChanges.size +
      pendingCustomM2Changes.size +
      pendingSettingChanges.size
    );
  }, [
    pendingMatChanges,
    pendingOptibrushChanges,
    pendingCustomM2Changes,
    pendingSettingChanges,
  ]);

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

  // Handlers for pending changes
  const handleMatPriceChange = (
    id: string,
    field: string,
    oldValue: number,
    newValue: number
  ) => {
    const key = `${id}-${field}`;
    setPendingMatChanges((prev) => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(key);
      } else {
        next.set(key, { id, field, oldValue, newValue });
      }
      return next;
    });
  };

  const handleOptibrushPriceChange = (
    id: string,
    oldValue: number,
    newValue: number
  ) => {
    setPendingOptibrushChanges((prev) => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(id);
      } else {
        next.set(id, { id, oldValue, newValue });
      }
      return next;
    });
  };

  const handleCustomM2PriceChange = (
    id: string,
    oldValue: number,
    newValue: number
  ) => {
    setPendingCustomM2Changes((prev) => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(id);
      } else {
        next.set(id, { id, oldValue, newValue });
      }
      return next;
    });
  };

  const handleSettingChange = (
    key: string,
    oldValue: number,
    newValue: number
  ) => {
    setPendingSettingChanges((prev) => {
      const next = new Map(prev);
      if (newValue === oldValue) {
        next.delete(key);
      } else {
        next.set(key, { key, oldValue, newValue });
      }
      return next;
    });
  };

  // Save all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Save mat prices
      for (const change of pendingMatChanges.values()) {
        await updateMatPrice.mutateAsync({
          id: change.id,
          updates: { [change.field]: change.newValue },
        });
      }

      // Save optibrush prices
      for (const change of pendingOptibrushChanges.values()) {
        await updateOptibrushPrice.mutateAsync({
          id: change.id,
          price_per_m2: change.newValue,
        });
      }

      // Save custom m² prices
      for (const change of pendingCustomM2Changes.values()) {
        await updateCustomM2Price.mutateAsync({
          id: change.id,
          price_per_m2: change.newValue,
        });
      }

      // Save settings
      for (const change of pendingSettingChanges.values()) {
        await updatePriceSetting.mutateAsync({
          key: change.key,
          value: change.newValue,
        });
      }

      // Clear all pending changes
      setPendingMatChanges(new Map());
      setPendingOptibrushChanges(new Map());
      setPendingCustomM2Changes(new Map());
      setPendingSettingChanges(new Map());

      toast({
        title: 'Shranjeno',
        description: `${totalPendingChanges} sprememb uspešno shranjenih`,
      });
    } catch (err) {
      toast({
        title: 'Napaka',
        description: 'Napaka pri shranjevanju sprememb',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all changes
  const handleDiscardChanges = () => {
    setPendingMatChanges(new Map());
    setPendingOptibrushChanges(new Map());
    setPendingCustomM2Changes(new Map());
    setPendingSettingChanges(new Map());
    toast({ title: 'Preklicano', description: 'Spremembe so bile preklicane' });
  };

  // Clear changes for specific category
  const clearCategoryChanges = (category: string) => {
    if (['poslovni', 'ergonomski', 'zunanji', 'design'].includes(category)) {
      setPendingMatChanges(new Map());
    } else if (category === 'optibrush') {
      setPendingOptibrushChanges(new Map());
    } else {
      setPendingCustomM2Changes(new Map());
    }
  };

  return {
    pendingMatChanges,
    pendingOptibrushChanges,
    pendingCustomM2Changes,
    pendingSettingChanges,
    totalPendingChanges,
    hasUnsavedChanges,
    isSaving,
    handleMatPriceChange,
    handleOptibrushPriceChange,
    handleCustomM2PriceChange,
    handleSettingChange,
    handleSaveAll,
    handleDiscardChanges,
    clearCategoryChanges,
  };
}

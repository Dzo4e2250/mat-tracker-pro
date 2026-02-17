/**
 * @file useConfirmDialog.tsx
 * @description Promise-based confirm dialog hook using AlertDialog.
 * Drop-in replacement for window.confirm() with proper UI.
 */

import { useState, useCallback, useRef } from 'react';
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

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalizedOpts = typeof opts === 'string' ? { description: opts } : opts;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOptions(normalizedOpts);
    });
  }, []);

  const handleResult = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const ConfirmDialog = options ? (
    <AlertDialog open onOpenChange={(open) => { if (!open) handleResult(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title || 'Potrditev'}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {options.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleResult(false)}>
            {options.cancelLabel || 'Prekliči'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleResult(true)}
            className={options.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {options.confirmLabel || 'Potrdi'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  return { confirm, ConfirmDialog };
}

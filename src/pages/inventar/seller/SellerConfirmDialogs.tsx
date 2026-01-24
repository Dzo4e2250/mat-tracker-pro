/**
 * @file SellerConfirmDialogs.tsx
 * @description Potrditveni dialogi za SellerPage
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import type { DirtyMat } from '../components/types';

interface SellerConfirmDialogsProps {
  // Self delivery
  confirmSelfDelivery: string[] | null;
  setConfirmSelfDelivery: (value: string[] | null) => void;
  onConfirmSelfDelivery: (cycleIds: string[]) => void;
  isSelfDeliveryPending: boolean;

  // Create pickup
  confirmCreatePickup: DirtyMat[] | null;
  setConfirmCreatePickup: (value: DirtyMat[] | null) => void;
  onConfirmCreatePickup: (mats: DirtyMat[]) => void;
  isCreatePickupPending: boolean;

  // Complete pickup
  confirmCompletePickup: string[] | null;
  setConfirmCompletePickup: (value: string[] | null) => void;
  onConfirmCompletePickup: (cycleIds: string[]) => void;
  isCompletePickupPending: boolean;

  // Delete code
  confirmDeleteCode: string | null;
  setConfirmDeleteCode: (value: string | null) => void;
  onConfirmDeleteCode: (codeId: string) => void;
  isDeleteCodePending: boolean;
}

export function SellerConfirmDialogs({
  confirmSelfDelivery,
  setConfirmSelfDelivery,
  onConfirmSelfDelivery,
  isSelfDeliveryPending,
  confirmCreatePickup,
  setConfirmCreatePickup,
  onConfirmCreatePickup,
  isCreatePickupPending,
  confirmCompletePickup,
  setConfirmCompletePickup,
  onConfirmCompletePickup,
  isCompletePickupPending,
  confirmDeleteCode,
  setConfirmDeleteCode,
  onConfirmDeleteCode,
  isDeleteCodePending,
}: SellerConfirmDialogsProps) {
  return (
    <>
      {/* Self-delivery Confirmation */}
      <AlertDialog open={!!confirmSelfDelivery} onOpenChange={() => setConfirmSelfDelivery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrdi lastno dostavo</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da bo prodajalec sam dostavil {confirmSelfDelivery?.length} predpražnik(ov)?
              QR kode bodo postale spet proste za uporabo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmSelfDelivery && onConfirmSelfDelivery(confirmSelfDelivery)}
              disabled={isSelfDeliveryPending}
            >
              {isSelfDeliveryPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Potrdi lastno dostavo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Pickup Confirmation */}
      <AlertDialog open={!!confirmCreatePickup} onOpenChange={() => setConfirmCreatePickup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ustvari nalog za dostavljalca</AlertDialogTitle>
            <AlertDialogDescription>
              Ali želite ustvariti nalog za prevzem {confirmCreatePickup?.length} predpražnik(ov)?
              Po potrditvi se bo odprl dokument za dostavljalca z naslovi in kontakti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCreatePickup && onConfirmCreatePickup(confirmCreatePickup)}
              disabled={isCreatePickupPending}
            >
              {isCreatePickupPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ustvari nalog
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Pickup Confirmation */}
      <AlertDialog open={!!confirmCompletePickup} onOpenChange={() => setConfirmCompletePickup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrdi prevzem</AlertDialogTitle>
            <AlertDialogDescription>
              Ali potrjujete, da je šofer pobral {confirmCompletePickup?.length} predpražnik(ov)?
              QR kode bodo sproščene in na voljo za ponovno uporabo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmCompletePickup && onConfirmCompletePickup(confirmCompletePickup)}
              disabled={isCompletePickupPending}
            >
              {isCompletePickupPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Potrdi prevzem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Code Confirmation */}
      <AlertDialog open={!!confirmDeleteCode} onOpenChange={() => setConfirmDeleteCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši QR kodo</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite izbrisati to QR kodo? Ta akcija je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDeleteCode && onConfirmDeleteCode(confirmDeleteCode)}
              disabled={isDeleteCodePending}
            >
              {isDeleteCodePending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

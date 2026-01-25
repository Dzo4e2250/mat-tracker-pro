/**
 * @file DeactivateUserDialog.tsx
 * @description Dialog za deaktivacijo uporabnika
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
import type { Profile } from "@/integrations/supabase/types";

interface DeactivateUserDialogProps {
  user: Profile | null;
  onClose: () => void;
  onConfirm: () => void;
}

function getFullName(user: Profile): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}

export function DeactivateUserDialog({
  user,
  onClose,
  onConfirm,
}: DeactivateUserDialogProps) {
  return (
    <AlertDialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deaktiviraj uporabnika?</AlertDialogTitle>
          <AlertDialogDescription>
            Ali ste prepričani, da želite deaktivirati uporabnika{" "}
            <strong>{user ? getFullName(user) : ""}</strong> ({user?.email})?
            Uporabnik se ne bo mogel več prijaviti.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Prekliči</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Deaktiviraj
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

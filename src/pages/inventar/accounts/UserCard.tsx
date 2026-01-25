/**
 * @file UserCard.tsx
 * @description Kartica uporabnika z možnostjo urejanja
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2 } from "lucide-react";
import type { Profile } from "@/integrations/supabase/types";

interface EditState {
  firstName: string;
  lastName: string;
  prefix: string;
  hasSecondaryRole: boolean;
}

interface UserCardProps {
  user: Profile;
  showPrefix: boolean;
  isEditing: boolean;
  editState: EditState;
  onEditStateChange: (state: Partial<EditState>) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isSaving: boolean;
}

function getFullName(user: Profile): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}

export function UserCard({
  user,
  showPrefix,
  isEditing,
  editState,
  onEditStateChange,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  isSaving,
}: UserCardProps) {
  if (isEditing) {
    return (
      <div className="border rounded-lg p-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ime</label>
              <Input
                type="text"
                value={editState.firstName}
                onChange={(e) => onEditStateChange({ firstName: e.target.value })}
                placeholder="Ime"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priimek</label>
              <Input
                type="text"
                value={editState.lastName}
                onChange={(e) => onEditStateChange({ lastName: e.target.value })}
                placeholder="Priimek"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email (samo za ogled)</label>
            <Input type="email" value={user.email} disabled />
          </div>
          {showPrefix && (
            <div>
              <label className="text-sm font-medium">QR Predpona</label>
              <Input
                type="text"
                value={editState.prefix}
                onChange={(e) => onEditStateChange({ prefix: e.target.value.toUpperCase() })}
                placeholder="npr. GEO"
              />
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`secondary-role-${user.id}`}
              checked={editState.hasSecondaryRole}
              onCheckedChange={(checked) => onEditStateChange({ hasSecondaryRole: checked === true })}
            />
            <label
              htmlFor={`secondary-role-${user.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {user.role === 'inventar' ? 'Tudi dostop do Prodajalec panela' : 'Tudi dostop do Inventar panela'}
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Shrani
            </Button>
            <Button variant="outline" onClick={onCancel}>Prekliči</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">
            {getFullName(user)}
            {user.secondary_role && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                +{user.secondary_role === 'prodajalec' ? 'Prodajalec' : 'Inventar'}
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {showPrefix && user.code_prefix && (
            <p className="text-sm text-muted-foreground">QR: {user.code_prefix}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onStartEdit}>
            Uredi
          </Button>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Izbriši uporabnika"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

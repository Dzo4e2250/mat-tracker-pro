/**
 * @file CreateUserForm.tsx
 * @description Obrazec za ustvarjanje novega uporabnika
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CreateUserFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  firstName: string;
  onFirstNameChange: (value: string) => void;
  lastName: string;
  onLastNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  prefix?: string;
  onPrefixChange?: (value: string) => void;
  showPrefix?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}

export function CreateUserForm({
  isOpen,
  onOpenChange,
  title,
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  prefix,
  onPrefixChange,
  showPrefix = false,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: CreateUserFormProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ime *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                  placeholder="Ime"
                />
              </div>
              <div className="space-y-2">
                <Label>Priimek *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                  placeholder="Priimek"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Geslo *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Najmanj 6 znakov"
              />
            </div>
            {showPrefix && onPrefixChange && (
              <div className="space-y-2">
                <Label>QR Predpona *</Label>
                <Input
                  value={prefix || ''}
                  onChange={(e) => onPrefixChange(e.target.value.toUpperCase())}
                  placeholder="npr. GEO, STAN, RIST"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Unikatna predpona za QR kode tega prodajalca (npr. GEO-001, STAN-001)
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={onSubmit} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Prekliči
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

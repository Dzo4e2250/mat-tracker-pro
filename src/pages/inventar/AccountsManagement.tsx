/**
 * @file AccountsManagement.tsx
 * @description Stran za upravljanje uporabniških računov
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
import {
  useProfilesByRole,
  useUpdateProfile,
  useDeactivateProfile,
  useCreateUser,
} from "@/hooks/useProfiles";
import type { Profile } from "@/integrations/supabase/types";
import { UserCard, CreateUserForm, DeactivateUserDialog } from "./accounts";

export default function AccountsManagement() {
  const { data: inventarUsers = [], isLoading: loadingInventar } = useProfilesByRole('inventar');
  const { data: prodajalecUsers = [], isLoading: loadingProdajalec } = useProfilesByRole('prodajalec');

  const updateProfile = useUpdateProfile();
  const deactivateProfile = useDeactivateProfile();
  const createUser = useCreateUser();
  const { toast } = useToast();

  // Edit state
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<string | null>(null);
  const [editState, setEditState] = useState({
    firstName: "",
    lastName: "",
    prefix: "",
    hasSecondaryRole: false,
  });
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);

  // Create user state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState<'inventar' | 'prodajalec'>('prodajalec');
  const [createState, setCreateState] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    prefix: "",
  });

  const loading = loadingInventar || loadingProdajalec;

  const resetCreateForm = () => {
    setCreateState({ email: "", password: "", firstName: "", lastName: "", prefix: "" });
    setIsCreateOpen(false);
  };

  const handleCreateUser = async () => {
    const { email, password, firstName, lastName, prefix } = createState;
    if (!email || !password || !firstName || !lastName) {
      toast({ title: "Manjkajo podatki", description: "Izpolnite vsa obvezna polja.", variant: "destructive" });
      return;
    }
    if (newRole === 'prodajalec' && !prefix) {
      toast({ title: "Manjka QR predpona", description: "Za prodajalca je QR predpona obvezna.", variant: "destructive" });
      return;
    }

    try {
      await createUser.mutateAsync({
        email,
        password,
        firstName,
        lastName,
        role: newRole,
        codePrefix: prefix || undefined,
      });
      toast({ title: "Uspeh", description: `Uporabnik ${firstName} ${lastName} je bil ustvarjen.` });
      resetCreateForm();
    } catch (error: any) {
      toast({ title: "Napaka", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const updates: Record<string, any> = {
        first_name: editState.firstName,
        last_name: editState.lastName,
      };
      if (editState.prefix) updates.code_prefix = editState.prefix.toUpperCase();

      if (editingUserRole === 'inventar' || editingUserRole === 'admin') {
        updates.secondary_role = editState.hasSecondaryRole ? 'prodajalec' : null;
      } else if (editingUserRole === 'prodajalec') {
        updates.secondary_role = editState.hasSecondaryRole ? 'inventar' : null;
      } else {
        updates.secondary_role = editState.hasSecondaryRole ? 'prodajalec' : null;
      }

      await updateProfile.mutateAsync({ id: userId, updates });
      toast({ title: "Uspešno posodobljeno", description: "Podatki uporabnika so bili posodobljeni." });
      cancelEdit();
    } catch (error: any) {
      toast({ title: "Napaka pri posodabljanju", description: error.message, variant: "destructive" });
    }
  };

  const startEditUser = (user: Profile) => {
    setEditingUser(user.id);
    setEditingUserRole(user.role);
    setEditState({
      firstName: user.first_name,
      lastName: user.last_name,
      prefix: user.code_prefix || "",
      hasSecondaryRole: !!user.secondary_role,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditingUserRole(null);
    setEditState({ firstName: "", lastName: "", prefix: "", hasSecondaryRole: false });
  };

  const handleDeactivateUser = async () => {
    if (!deletingUser) return;
    try {
      await deactivateProfile.mutateAsync(deletingUser.id);
      toast({ title: "Uspešno deaktivirano", description: "Uporabnik je bil deaktiviran." });
      setDeletingUser(null);
    } catch (error: any) {
      toast({ title: "Napaka pri deaktivaciji", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <InventarSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Upravljanje računov</h1>

            <Tabs defaultValue="inventar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inventar">Inventar računi</TabsTrigger>
                <TabsTrigger value="prodajalec">Prodajalec računi</TabsTrigger>
              </TabsList>

              <TabsContent value="inventar" className="space-y-6">
                <CreateUserForm
                  isOpen={isCreateOpen && newRole === 'inventar'}
                  onOpenChange={(open) => { setIsCreateOpen(open); if (open) setNewRole('inventar'); }}
                  title="Ustvari novega inventar uporabnika"
                  firstName={createState.firstName}
                  onFirstNameChange={(v) => setCreateState(s => ({ ...s, firstName: v }))}
                  lastName={createState.lastName}
                  onLastNameChange={(v) => setCreateState(s => ({ ...s, lastName: v }))}
                  email={createState.email}
                  onEmailChange={(v) => setCreateState(s => ({ ...s, email: v }))}
                  password={createState.password}
                  onPasswordChange={(v) => setCreateState(s => ({ ...s, password: v }))}
                  onSubmit={handleCreateUser}
                  onCancel={resetCreateForm}
                  isPending={createUser.isPending}
                  submitLabel="Ustvari uporabnika"
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Obstoječi INVENTAR uporabniki</CardTitle>
                    <CardDescription>Seznam vseh inventar uporabnikov</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inventarUsers.length === 0 ? (
                      <p className="text-muted-foreground">Ni inventar uporabnikov</p>
                    ) : (
                      <div className="space-y-4">
                        {inventarUsers.map((user) => (
                          <UserCard
                            key={user.id}
                            user={user}
                            showPrefix={false}
                            isEditing={editingUser === user.id}
                            editState={editState}
                            onEditStateChange={(changes) => setEditState(s => ({ ...s, ...changes }))}
                            onStartEdit={() => startEditUser(user)}
                            onSave={() => handleUpdateUser(user.id)}
                            onCancel={cancelEdit}
                            onDelete={() => setDeletingUser(user)}
                            isSaving={updateProfile.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prodajalec" className="space-y-6">
                <CreateUserForm
                  isOpen={isCreateOpen && newRole === 'prodajalec'}
                  onOpenChange={(open) => { setIsCreateOpen(open); if (open) setNewRole('prodajalec'); }}
                  title="Ustvari novega prodajalca"
                  firstName={createState.firstName}
                  onFirstNameChange={(v) => setCreateState(s => ({ ...s, firstName: v }))}
                  lastName={createState.lastName}
                  onLastNameChange={(v) => setCreateState(s => ({ ...s, lastName: v }))}
                  email={createState.email}
                  onEmailChange={(v) => setCreateState(s => ({ ...s, email: v }))}
                  password={createState.password}
                  onPasswordChange={(v) => setCreateState(s => ({ ...s, password: v }))}
                  prefix={createState.prefix}
                  onPrefixChange={(v) => setCreateState(s => ({ ...s, prefix: v }))}
                  showPrefix
                  onSubmit={handleCreateUser}
                  onCancel={resetCreateForm}
                  isPending={createUser.isPending}
                  submitLabel="Ustvari prodajalca"
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Obstoječi PRODAJALEC uporabniki</CardTitle>
                    <CardDescription>Seznam vseh prodajalcev</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {prodajalecUsers.length === 0 ? (
                      <p className="text-muted-foreground">Ni prodajalec uporabnikov</p>
                    ) : (
                      <div className="space-y-4">
                        {prodajalecUsers.map((user) => (
                          <UserCard
                            key={user.id}
                            user={user}
                            showPrefix
                            isEditing={editingUser === user.id}
                            editState={editState}
                            onEditStateChange={(changes) => setEditState(s => ({ ...s, ...changes }))}
                            onStartEdit={() => startEditUser(user)}
                            onSave={() => handleUpdateUser(user.id)}
                            onCancel={cancelEdit}
                            onDelete={() => setDeletingUser(user)}
                            isSaving={updateProfile.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <DeactivateUserDialog
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeactivateUser}
      />
    </SidebarProvider>
  );
}

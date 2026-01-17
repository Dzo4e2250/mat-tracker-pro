import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InventarSidebar } from "@/components/InventarSidebar";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useProfilesByRole,
  useUpdateProfile,
  useDeactivateProfile,
  useCreateUser,
  type ProfileWithQRCount,
} from "@/hooks/useProfiles";
import type { Profile } from "@/integrations/supabase/types";

type UserRole = 'inventar' | 'prodajalec';

export default function AccountsManagement() {
  const { data: inventarUsers = [], isLoading: loadingInventar } = useProfilesByRole('inventar');
  const { data: prodajalecUsers = [], isLoading: loadingProdajalec } = useProfilesByRole('prodajalec');

  const updateProfile = useUpdateProfile();
  const deactivateProfile = useDeactivateProfile();
  const createUser = useCreateUser();

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const { toast } = useToast();

  // State for create user form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPrefix, setNewPrefix] = useState("");
  const [newRole, setNewRole] = useState<'inventar' | 'prodajalec'>('prodajalec');

  const loading = loadingInventar || loadingProdajalec;

  const resetCreateForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFirstName("");
    setNewLastName("");
    setNewPrefix("");
    setNewRole('prodajalec');
    setIsCreateOpen(false);
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newFirstName || !newLastName) {
      toast({
        title: "Manjkajo podatki",
        description: "Izpolnite vsa obvezna polja.",
        variant: "destructive",
      });
      return;
    }

    if (newRole === 'prodajalec' && !newPrefix) {
      toast({
        title: "Manjka QR predpona",
        description: "Za prodajalca je QR predpona obvezna.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUser.mutateAsync({
        email: newEmail,
        password: newPassword,
        firstName: newFirstName,
        lastName: newLastName,
        role: newRole,
        codePrefix: newPrefix || undefined,
      });

      toast({
        title: "Uspeh",
        description: `Uporabnik ${newFirstName} ${newLastName} je bil ustvarjen.`,
      });

      resetCreateForm();
    } catch (error: any) {
      toast({
        title: "Napaka",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const updates: Partial<Profile> = {};

      if (editFirstName) {
        updates.first_name = editFirstName;
      }
      if (editLastName) {
        updates.last_name = editLastName;
      }
      if (editPrefix) {
        updates.code_prefix = editPrefix.toUpperCase();
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "Ni sprememb",
          description: "Niste spremenili nobenih podatkov.",
        });
        return;
      }

      await updateProfile.mutateAsync({ id: userId, updates });

      toast({
        title: "Uspešno posodobljeno",
        description: "Podatki uporabnika so bili posodobljeni.",
      });

      setEditingUser(null);
      setEditFirstName("");
      setEditLastName("");
      setEditPrefix("");
    } catch (error: any) {
      toast({
        title: "Napaka pri posodabljanju",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditUser = (user: Profile) => {
    setEditingUser(user.id);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditPrefix(user.code_prefix || "");
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditFirstName("");
    setEditLastName("");
    setEditPrefix("");
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await deactivateProfile.mutateAsync(userId);

      toast({
        title: "Uspešno deaktivirano",
        description: "Uporabnik je bil deaktiviran.",
      });

      setDeletingUser(null);
    } catch (error: any) {
      toast({
        title: "Napaka pri deaktivaciji",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFullName = (user: Profile) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.email;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderUserCard = (user: Profile, showPrefix: boolean = false) => (
    <div key={user.id} className="border rounded-lg p-4">
      {editingUser === user.id ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ime</label>
              <Input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Ime"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priimek</label>
              <Input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
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
                value={editPrefix}
                onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                placeholder="npr. GEO"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => handleUpdateUser(user.id)}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Shrani
            </Button>
            <Button variant="outline" onClick={cancelEdit}>Prekliči</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">{getFullName(user)}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {showPrefix && user.code_prefix && (
              <p className="text-sm text-muted-foreground">QR: {user.code_prefix}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => startEditUser(user)}>
              Uredi
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setDeletingUser(user)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

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
                {/* Create new inventar user */}
                <Collapsible open={isCreateOpen && newRole === 'inventar'} onOpenChange={(open) => {
                  setIsCreateOpen(open);
                  if (open) setNewRole('inventar');
                }}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Ustvari novega inventar uporabnika</CardTitle>
                          </div>
                          {isCreateOpen && newRole === 'inventar' ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="inv-firstname">Ime *</Label>
                            <Input
                              id="inv-firstname"
                              value={newFirstName}
                              onChange={(e) => setNewFirstName(e.target.value)}
                              placeholder="Ime"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="inv-lastname">Priimek *</Label>
                            <Input
                              id="inv-lastname"
                              value={newLastName}
                              onChange={(e) => setNewLastName(e.target.value)}
                              placeholder="Priimek"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-email">Email *</Label>
                          <Input
                            id="inv-email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-password">Geslo *</Label>
                          <Input
                            id="inv-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Najmanj 6 znakov"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateUser} disabled={createUser.isPending}>
                            {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ustvari uporabnika
                          </Button>
                          <Button variant="outline" onClick={resetCreateForm}>
                            Prekliči
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

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
                        {inventarUsers.map((user) => renderUserCard(user, false))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prodajalec" className="space-y-6">
                {/* Create new prodajalec user */}
                <Collapsible open={isCreateOpen && newRole === 'prodajalec'} onOpenChange={(open) => {
                  setIsCreateOpen(open);
                  if (open) setNewRole('prodajalec');
                }}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Ustvari novega prodajalca</CardTitle>
                          </div>
                          {isCreateOpen && newRole === 'prodajalec' ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="prod-firstname">Ime *</Label>
                            <Input
                              id="prod-firstname"
                              value={newFirstName}
                              onChange={(e) => setNewFirstName(e.target.value)}
                              placeholder="Ime"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="prod-lastname">Priimek *</Label>
                            <Input
                              id="prod-lastname"
                              value={newLastName}
                              onChange={(e) => setNewLastName(e.target.value)}
                              placeholder="Priimek"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prod-email">Email *</Label>
                          <Input
                            id="prod-email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prod-password">Geslo *</Label>
                          <Input
                            id="prod-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Najmanj 6 znakov"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prod-prefix">QR Predpona *</Label>
                          <Input
                            id="prod-prefix"
                            value={newPrefix}
                            onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                            placeholder="npr. GEO, STAN, RIST"
                            maxLength={10}
                          />
                          <p className="text-xs text-muted-foreground">
                            Unikatna predpona za QR kode tega prodajalca (npr. GEO-001, STAN-001)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateUser} disabled={createUser.isPending}>
                            {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ustvari prodajalca
                          </Button>
                          <Button variant="outline" onClick={resetCreateForm}>
                            Prekliči
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

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
                        {prodajalecUsers.map((user) => renderUserCard(user, true))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktiviraj uporabnika?</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite deaktivirati uporabnika{" "}
              <strong>{deletingUser ? getFullName(deletingUser) : ""}</strong> ({deletingUser?.email})?
              Uporabnik se ne bo mogel več prijaviti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeactivateUser(deletingUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deaktiviraj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

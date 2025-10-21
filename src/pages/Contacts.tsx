import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Mail, Phone, Building2, Home, Camera, Clipboard, Pencil, Trash2, CalendarIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  company_name: string;
  contact_person: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  tax_number: string | null;
  first_contact_date: string;
  comment: string | null;
}

export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const [filterDate, setFilterDate] = useState<Date | undefined>();

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('seller_id', user?.id)
        .order('first_contact_date', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast.error('Napaka pri nalaganju kontaktov');
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedContacts = contacts
    .filter(contact => {
      if (!filterDate) return true;
      const contactDate = new Date(contact.first_contact_date);
      return (
        contactDate.getDate() === filterDate.getDate() &&
        contactDate.getMonth() === filterDate.getMonth() &&
        contactDate.getFullYear() === filterDate.getFullYear()
      );
    })
    .reduce((acc, contact) => {
      const date = format(new Date(contact.first_contact_date), 'd. MMMM yyyy', { locale: sl });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(contact);
      return acc;
    }, {} as Record<string, Contact[]>);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData(contact);
  };

  const handleDelete = (contact: Contact) => {
    setDeletingContact(contact);
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          contact_role: formData.contact_role,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          tax_number: formData.tax_number,
          comment: formData.comment,
        })
        .eq('id', editingContact.id);

      if (error) throw error;

      toast.success('Kontakt uspešno posodobljen');
      setEditingContact(null);
      setFormData({});
      fetchContacts();
    } catch (error: any) {
      toast.error('Napaka pri posodabljanju kontakta');
      console.error('Error updating contact:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deletingContact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', deletingContact.id);

      if (error) throw error;

      toast.success('Kontakt uspešno izbrisan');
      setDeletingContact(null);
      fetchContacts();
    } catch (error: any) {
      toast.error('Napaka pri brisanju kontakta');
      console.error('Error deleting contact:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/prodajalec')} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazaj
            </Button>
          <h1 className="text-3xl font-bold">Kontakti</h1>
          <p className="text-muted-foreground">Pregled vseh strank s testi</p>
          
          {/* Date Filter */}
          <div className="mt-4">
            <Label className="mb-2 block">Filtriraj po datumu</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filterDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, "d. MMMM yyyy", { locale: sl }) : "Izberi datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {filterDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterDate(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

          {loading ? (
            <div className="text-center py-8">Nalagam kontakte...</div>
          ) : Object.keys(groupedContacts).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nimate še nobenih kontaktov
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedContacts).map(([date, dateContacts]) => (
                <div key={date}>
                  <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{date}</h2>
                  <div className="grid gap-4">
                  {dateContacts.map((contact) => (
                    <Card key={contact.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <Building2 className="h-5 w-5" />
                              {contact.company_name}
                            </CardTitle>
                            {contact.contact_person && (
                              <CardDescription>
                                {contact.contact_person}
                                {contact.contact_role && ` - ${contact.contact_role}`}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contact)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(contact)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 text-sm">
                          {contact.contact_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${contact.contact_phone}`} className="hover:underline">
                                {contact.contact_phone}
                              </a>
                            </div>
                          )}
                          {contact.contact_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a href={`mailto:${contact.contact_email}`} className="hover:underline">
                                {contact.contact_email}
                              </a>
                            </div>
                          )}
                          {contact.tax_number && (
                            <div className="text-muted-foreground">
                              Davčna št: {contact.tax_number}
                            </div>
                          )}
                          {contact.comment && (
                            <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                              {contact.comment}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uredi kontakt</DialogTitle>
            <DialogDescription>Spremeni podatke kontakta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="company_name">Podjetje *</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_person">Kontaktna oseba</Label>
              <Input
                id="contact_person"
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_role">Vloga</Label>
              <Input
                id="contact_role"
                value={formData.contact_role || ''}
                onChange={(e) => setFormData({ ...formData, contact_role: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Telefon</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_email">E-pošta</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tax_number">Davčna številka</Label>
              <Input
                id="tax_number"
                value={formData.tax_number || ''}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="comment">Opombe</Label>
              <Textarea
                id="comment"
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Prekliči
            </Button>
            <Button onClick={handleSaveEdit}>
              Shrani
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingContact} onOpenChange={() => setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potrditev brisanja</AlertDialogTitle>
            <AlertDialogDescription>
              Ali ste prepričani, da želite izbrisati kontakt "{deletingContact?.company_name}"? Tega dejanja ni mogoče razveljaviti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Prekliči</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button 
            onClick={() => navigate('/prodajalec')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Home className="h-6 w-6" />
            <span className="text-xs">Domov</span>
          </button>
          
          <button 
            onClick={() => navigate('/prodajalec')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">Skeniraj</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 text-primary">
            <Clipboard className="h-6 w-6" />
            <span className="text-xs">Kontakti</span>
          </button>
        </div>
      </div>
    </div>
  );
}

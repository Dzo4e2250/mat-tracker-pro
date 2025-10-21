import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, Building2, Home, Camera, Clipboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';

interface Contact {
  id: string;
  company_name: string;
  contact_person: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  tax_number: string | null;
  first_contact_date: string;
}

export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

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

  const groupedContacts = contacts.reduce((acc, contact) => {
    const date = format(new Date(contact.first_contact_date), 'MMMM yyyy', { locale: sl });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

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

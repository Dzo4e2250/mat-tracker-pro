/**
 * @file useContactSelection.ts
 * @description Hook za izbiro in izvoz kontaktov (vCard format)
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface UseContactSelectionProps {
  companies: CompanyWithContacts[] | undefined;
  deleteContact: { mutateAsync: (id: string) => Promise<void> };
}

export function useContactSelection({ companies, deleteContact }: UseContactSelectionProps) {
  const { toast } = useToast();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  /** Preklopi izbiro kontakta za izvoz/brisanje */
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const selectAllContacts = useCallback(() => {
    const allContactIds = new Set<string>();
    companies?.forEach(company => {
      company.contacts.forEach(contact => {
        allContactIds.add(contact.id);
      });
    });
    setSelectedContacts(allContactIds);
  }, [companies]);

  const deselectAllContacts = useCallback(() => {
    setSelectedContacts(new Set());
  }, []);

  const getAllContactsCount = useCallback(() => {
    let count = 0;
    companies?.forEach(company => {
      count += company.contacts.length;
    });
    return count;
  }, [companies]);

  // Generate vCard format for a contact
  const generateVCard = useCallback((contact: any, company: CompanyWithContacts) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${contact.last_name || ''};${contact.first_name || ''};;;`,
      `FN:${contact.first_name || ''} ${contact.last_name || ''}`,
      `ORG:${company.name || ''}`,
    ];
    if (contact.role) lines.push(`TITLE:${contact.role}`);
    if (contact.phone) lines.push(`TEL;TYPE=WORK,VOICE:${contact.phone}`);
    if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
    if (company.address_street || company.address_city || company.address_postal) {
      lines.push(`ADR;TYPE=WORK:;;${company.address_street || ''};${company.address_city || ''};;${company.address_postal || ''};Slovenia`);
    }
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }, []);

  // Export selected contacts as vCard file
  const exportSelectedContacts = useCallback(() => {
    if (selectedContacts.size === 0) {
      toast({ description: 'Najprej izberi kontakte za izvoz', variant: 'destructive' });
      return;
    }

    const vCards: string[] = [];
    companies?.forEach(company => {
      company.contacts.forEach(contact => {
        if (selectedContacts.has(contact.id)) {
          vCards.push(generateVCard(contact, company));
        }
      });
    });

    const blob = new Blob([vCards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontakti-${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ description: `✅ Izvoženih ${selectedContacts.size} kontaktov` });
    setSelectionMode(false);
    setSelectedContacts(new Set());
  }, [selectedContacts, companies, generateVCard, toast]);

  // Export all contacts
  const exportAllContacts = useCallback(() => {
    const vCards: string[] = [];
    companies?.forEach(company => {
      company.contacts.forEach(contact => {
        vCards.push(generateVCard(contact, company));
      });
    });

    if (vCards.length === 0) {
      toast({ description: 'Ni kontaktov za izvoz', variant: 'destructive' });
      return;
    }

    const blob = new Blob([vCards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vsi-kontakti-${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ description: `✅ Izvoženih ${vCards.length} kontaktov` });
  }, [companies, generateVCard, toast]);

  // Delete selected contacts
  const deleteSelectedContacts = useCallback(async () => {
    if (selectedContacts.size === 0) {
      toast({ description: 'Najprej izberi kontakte za brisanje', variant: 'destructive' });
      return;
    }

    if (!confirm(`Ali res želiš izbrisati ${selectedContacts.size} kontaktov?`)) {
      return;
    }

    let deletedCount = 0;
    for (const contactId of selectedContacts) {
      try {
        await deleteContact.mutateAsync(contactId);
        deletedCount++;
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }

    toast({ description: `✅ Izbrisanih ${deletedCount} kontaktov` });
    setSelectionMode(false);
    setSelectedContacts(new Set());
  }, [selectedContacts, deleteContact, toast]);

  return {
    // State
    selectionMode,
    setSelectionMode,
    selectedContacts,
    setSelectedContacts,
    // Actions
    toggleContactSelection,
    selectAllContacts,
    deselectAllContacts,
    getAllContactsCount,
    exportSelectedContacts,
    exportAllContacts,
    deleteSelectedContacts,
  };
}

export default useContactSelection;

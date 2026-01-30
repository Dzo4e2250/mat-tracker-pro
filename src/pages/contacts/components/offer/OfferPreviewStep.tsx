/**
 * @file OfferPreviewStep.tsx
 * @description Korak 3: Predogled in pošiljanje ponudbe
 *
 * SECURITY NOTE: This component uses dangerouslySetInnerHTML to render
 * the email preview. The HTML is generated internally by generateEmailHTML()
 * and does not contain user-provided content that could lead to XSS.
 */

import { FileText, Download, Mail, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OfferType } from './types';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface Company {
  name: string;
  contacts: Contact[];
}

interface OfferPreviewStepProps {
  company: Company;
  offerType: OfferType;
  hasNajem: boolean;
  hasNakup: boolean;
  hasNajemItems: boolean;
  hasNakupItems: boolean;
  emailHtml: string;
  primaryEmail: string;
  onCopyEmail: (email: string) => void;
  onCopySubject: (subject: string) => void;
  onCopyHtml: () => void;
  onSaveOffer: () => void;
  onBack: () => void;
  onClose: () => void;
}

/**
 * Korak za predogled ponudbe
 * - HTML predogled
 * - Kopiranje emaila in zadeve
 * - Shranjevanje ponudbe
 */
export default function OfferPreviewStep({
  company,
  offerType,
  hasNajem,
  hasNakup,
  hasNajemItems,
  hasNakupItems,
  emailHtml,
  primaryEmail,
  onCopyEmail,
  onCopySubject,
  onCopyHtml,
  onSaveOffer,
  onBack,
  onClose,
}: OfferPreviewStepProps) {

  const getSubject = () => {
    const companyName = company?.name || '';
    if (offerType === 'primerjava') {
      // Check if it's 2x najem (dimension comparison) vs najem+nakup
      if (hasNajemItems && !hasNakupItems) {
        return `Ponudba za najem predpražnikov - ${companyName}`;
      }
      return `Ponudba za nakup in najem predpražnikov - ${companyName}`;
    } else if (offerType === 'dodatna') {
      if (hasNajemItems && hasNakupItems) return `Ponudba za najem in nakup predpražnikov - ${companyName}`;
      else if (hasNajemItems) return `Ponudba za najem predpražnikov - ${companyName}`;
      else if (hasNakupItems) return `Ponudba za nakup predpražnikov - ${companyName}`;
    } else if (offerType === 'nakup') {
      return `Ponudba za nakup predpražnikov - ${companyName}`;
    }
    return `Ponudba za najem predpražnikov - ${companyName}`;
  };

  const getSubjectLabel = () => {
    if (offerType === 'primerjava') {
      if (hasNajemItems && !hasNakupItems) return 'najem';
      return 'nakup in najem';
    }
    if (offerType === 'dodatna') return 'nakup in najem';
    if (offerType === 'nakup') return 'nakup';
    return 'najem';
  };

  const contactsWithEmail = company?.contacts?.filter(c => c.email) || [];

  return (
    <div className="space-y-4">
      {/* HTML Preview - content is generated internally, not from user input */}
      <div className="bg-white border rounded-lg p-4 max-h-[40vh] overflow-y-auto">
        <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
      </div>

      {/* Email info - copyable */}
      <div className="bg-blue-50 p-3 rounded-lg space-y-2">
        {contactsWithEmail.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-1 rounded">
                <span className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Za:</span>
                  <span>{primaryEmail || 'Ni emaila'}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </span>
                <span className="text-xs text-blue-600">izberi & kopiraj</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {contactsWithEmail.map(contact => (
                <DropdownMenuItem
                  key={contact.id}
                  onClick={() => onCopyEmail(contact.email || '')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Mail size={14} />
                  <span className="font-medium">{contact.first_name} {contact.last_name}</span>
                  <span className="text-gray-400 text-xs">{contact.email}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-1 rounded"
            onClick={() => onCopyEmail(primaryEmail)}
          >
            <span><span className="text-gray-500 text-sm">Za:</span> {primaryEmail || 'Ni emaila'}</span>
            <span className="text-xs text-blue-600">kopiraj</span>
          </div>
        )}
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-1 rounded text-sm"
          onClick={() => onCopySubject(getSubject())}
        >
          <span className="truncate">
            <span className="text-gray-500">Zadeva:</span> Ponudba za {getSubjectLabel()}...
          </span>
          <span className="text-xs text-blue-600 ml-2">kopiraj</span>
        </div>
      </div>

      {/* Primary action: Copy HTML */}
      <button
        onClick={onCopyHtml}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2"
      >
        <FileText size={20} />
        Kopiraj vsebino
      </button>

      {/* Save offer button */}
      <button
        onClick={onSaveOffer}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      >
        <Download size={18} />
        Shrani ponudbo
      </button>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 border rounded text-sm"
        >
          ← Uredi
        </button>
        <button onClick={onClose} className="flex-1 py-2 border rounded text-sm">
          Zapri
        </button>
      </div>
    </div>
  );
}

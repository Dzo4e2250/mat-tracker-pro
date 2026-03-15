/**
 * @file OfferPreviewStep.tsx
 * @description Korak 3: Predogled in pošiljanje ponudbe
 * - Template selector dropdown
 * - Compact EmailBlockCanvas for inline text editing with DnD
 * - Table color picker
 * - Live-updating HTML preview
 *
 * SECURITY NOTE: This component uses dangerouslySetInnerHTML to render
 * the email preview. The HTML is generated internally by generateEmailHTML()
 * and does not contain user-provided content that could lead to XSS.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { FileText, Download, Mail, ChevronDown, Palette, Sparkles, Loader2, PenLine, Snowflake, Table, HandMetal, User, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OfferType } from './types';
import type { UserEmailTemplate } from '@/integrations/supabase/types';
import type { TextOverrides, TableSection } from '@/pages/contacts/hooks/useOfferEmail';
import { DEFAULT_TABLE_COLOR, formatWeeks } from '@/pages/contacts/hooks/useOfferEmail';
import type { FrequencyKey } from '@/utils/priceList';
import EmailBlockCanvas, { type BlockDef } from '@/components/EmailBlockCanvas';

const PRESET_COLORS = [
  { color: '#1e3a5f', label: 'Navy' },
  { color: '#2d5a3f', label: 'Zelena' },
  { color: '#8b1a1a', label: 'Rdeča' },
  { color: '#4a4a4a', label: 'Siva' },
  { color: '#1a5276', label: 'Modra' },
  { color: '#1a1a1a', label: 'Črna' },
];

const DEFAULT_BLOCK_ORDER = ['intro', 'seasonal', 'tables', 'service', 'closing'];

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

const FREQUENCY_OPTIONS: { value: FrequencyKey; label: string }[] = [
  { value: '1', label: '1 teden' },
  { value: '2', label: '2 tedna' },
  { value: '3', label: '3 tedne' },
  { value: '4', label: '4 tedne' },
];

interface OfferPreviewStepProps {
  company: Company;
  offerType: OfferType;
  offerFrequency: string;
  hasNajem: boolean;
  hasNakup: boolean;
  hasNajemItems: boolean;
  hasNakupItems: boolean;
  primaryEmail: string;
  onCopyEmail: (email: string) => void;
  onCopySubject: (subject: string) => void;
  onCopyHtml: (overrides?: TextOverrides) => void;
  onSaveOffer: () => void;
  onBack: () => void;
  onClose: () => void;
  // New props for template selection and live editing
  templates: UserEmailTemplate[];
  selectedTemplateId: string | null;
  onTemplateChange: (templateId: string) => void;
  tableColor: string;
  onTableColorChange: (color: string) => void;
  generateEmailHTML: (overrides?: TextOverrides) => string;
  onGenerateAI?: (templateType: string) => Promise<{ intro_text: string; service_text: string; closing_text: string; seasonal_text: string } | null>;
}

// Build compact BlockDef array for offer wizard
function buildOfferBlocks(
  offerType: OfferType,
  introText: string,
  seasonalText: string,
  serviceText: string,
  closingText: string,
  blockOrder?: string[] | null,
): BlockDef[] {
  const showSeasonal = offerType === 'najem' || offerType === 'primerjava' || offerType === 'dodatna';

  const blockMap: Record<string, BlockDef> = {
    greeting: {
      id: 'greeting', type: 'fixed', label: 'Pozdravljeni,', icon: Mail,
      text: 'Pozdravljeni,', visible: true, color: 'gray',
    },
    intro: {
      id: 'intro', type: 'editable', label: 'Uvodno besedilo', icon: PenLine,
      text: introText, placeholder: 'kot dogovorjeno pošiljam ponudbo...', visible: true, color: 'blue',
    },
    seasonal: {
      id: 'seasonal', type: 'editable', label: 'Sezonsko besedilo', icon: Snowflake,
      text: seasonalText, placeholder: 'Ponudba vključuje sezonsko prilagoditev...',
      visible: showSeasonal, color: 'amber',
    },
    tables: {
      id: 'tables', type: 'auto', label: 'Tabele ponudbe', icon: Table,
      text: '', visible: true, color: 'green',
    },
    service: {
      id: 'service', type: 'editable', label: 'Opis storitve', icon: PenLine,
      text: serviceText, placeholder: 'Ponudba vključuje redno menjavo...', visible: true, color: 'blue',
    },
    closing: {
      id: 'closing', type: 'editable', label: 'Zaključno besedilo', icon: PenLine,
      text: closingText, placeholder: 'Za vsa dodatna vprašanja sem vam na voljo.',
      visible: true, color: 'blue',
    },
    signoff: {
      id: 'signoff', type: 'fixed', label: 'Lep pozdrav,', icon: HandMetal,
      text: 'Lep pozdrav,', visible: true, color: 'gray',
    },
    signature: {
      id: 'signature', type: 'auto', label: 'Podpis', icon: User,
      text: '', visible: true, color: 'gray',
    },
  };

  const order = blockOrder || DEFAULT_BLOCK_ORDER;
  const middleBlocks = order.map(id => blockMap[id]).filter(Boolean);
  return [blockMap.greeting, ...middleBlocks, blockMap.signoff, blockMap.signature];
}

/**
 * Korak za predogled ponudbe
 * - Template selector
 * - Compact block canvas with DnD
 * - Color picker
 * - HTML predogled
 * - Kopiranje emaila in zadeve
 * - Shranjevanje ponudbe
 */
export default function OfferPreviewStep({
  company,
  offerType,
  offerFrequency,
  hasNajem,
  hasNakup,
  hasNajemItems,
  hasNakupItems,
  primaryEmail,
  onCopyEmail,
  onCopySubject,
  onCopyHtml,
  onSaveOffer,
  onBack,
  onClose,
  templates,
  selectedTemplateId,
  onTemplateChange,
  tableColor,
  onTableColorChange,
  generateEmailHTML,
  onGenerateAI,
}: OfferPreviewStepProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Text overrides state - initialized from selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const [introText, setIntroText] = useState(selectedTemplate?.intro_text || '');
  const [serviceText, setServiceText] = useState(selectedTemplate?.service_text || '');
  const [closingText, setClosingText] = useState(selectedTemplate?.closing_text || '');
  const [seasonalText, setSeasonalText] = useState(selectedTemplate?.seasonal_text || '');
  const [frequencyLabel, setFrequencyLabel] = useState('');
  const [blockOrder, setBlockOrder] = useState<string[]>(selectedTemplate?.block_order || DEFAULT_BLOCK_ORDER);
  const [hasEdited, setHasEdited] = useState(false);
  const [tableSections, setTableSections] = useState<TableSection[]>([]);

  // Sync local state when parent changes selectedTemplateId
  useEffect(() => {
    const tpl = templates.find(t => t.id === selectedTemplateId) || templates[0];
    if (tpl && !hasEdited) {
      setIntroText(tpl.intro_text || '');
      setServiceText(tpl.service_text || '');
      setClosingText(tpl.closing_text || '');
      setSeasonalText(tpl.seasonal_text || '');
      setBlockOrder(tpl.block_order || DEFAULT_BLOCK_ORDER);
      setFrequencyLabel('');
    }
  }, [selectedTemplateId, templates]);

  // Build text overrides only if user has edited
  const textOverrides: TextOverrides | undefined = useMemo(() => {
    const freqTrimmed = frequencyLabel.trim();
    const hasSections = tableSections.length > 0;
    if (hasEdited || hasSections) {
      return {
        ...(hasEdited ? { introText, serviceText, closingText, seasonalText, blockOrder } : {}),
        ...(freqTrimmed ? { frequencyLabel: freqTrimmed } : {}),
        ...(hasSections ? { tableSections } : {}),
      };
    }
    if (freqTrimmed) {
      return { frequencyLabel: freqTrimmed };
    }
    return undefined;
  }, [hasEdited, introText, serviceText, closingText, seasonalText, frequencyLabel, blockOrder, tableSections]);

  // Generate live preview HTML
  const emailHtml = useMemo(
    () => generateEmailHTML(textOverrides),
    [generateEmailHTML, textOverrides]
  );

  // Handle template change - reset text fields
  const handleTemplateChange = (templateId: string) => {
    onTemplateChange(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setIntroText(tpl.intro_text || '');
      setServiceText(tpl.service_text || '');
      setClosingText(tpl.closing_text || '');
      setSeasonalText(tpl.seasonal_text || '');
      setBlockOrder(tpl.block_order || DEFAULT_BLOCK_ORDER);
      setFrequencyLabel('');
      setHasEdited(false);
    }
  };

  // Block canvas handlers
  const handleBlockTextChange = useCallback((blockId: string, text: string) => {
    setHasEdited(true);
    switch (blockId) {
      case 'intro': setIntroText(text); break;
      case 'seasonal': setSeasonalText(text); break;
      case 'service': setServiceText(text); break;
      case 'closing': setClosingText(text); break;
    }
  }, []);

  const handleBlocksReorder = useCallback((newOrder: string[]) => {
    const reorderableIds = newOrder.filter(id => !['greeting', 'signoff', 'signature'].includes(id));
    setBlockOrder(reorderableIds);
    setHasEdited(true);
  }, []);

  const blocks = useMemo(
    () => buildOfferBlocks(offerType, introText, seasonalText, serviceText, closingText, blockOrder),
    [offerType, introText, seasonalText, serviceText, closingText, blockOrder]
  );

  const showSeasonalField = offerType === 'najem' || offerType === 'primerjava' || offerType === 'dodatna';

  const getSubject = () => {
    const companyName = company?.name || '';
    if (offerType === 'primerjava') {
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
    <div className="space-y-3">
      {/* Template selector */}
      {templates.length > 1 && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Predloga</label>
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm bg-white"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.is_default ? ' (privzeta)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Compact Block Canvas + Frequency label (collapsible) */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-500 hover:text-blue-600 list-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1.5">
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            Struktura emaila
          </span>
          {hasEdited && <span className="text-amber-600">(spremenjeno)</span>}
        </summary>
        <div className="mt-1.5 space-y-3">
          <EmailBlockCanvas
            blocks={blocks}
            onBlockTextChange={handleBlockTextChange}
            onBlocksReorder={handleBlocksReorder}
            compact={true}
          />
          {showSeasonalField && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Frekvenca menjave (tekst v tabeli)</label>
              <input
                type="text"
                value={frequencyLabel}
                onChange={(e) => setFrequencyLabel(e.target.value)}
                className="w-full p-2 border rounded text-xs"
                placeholder="avtomatsko (npr. 2 tedna, 4 tedne)"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Pusti prazno za avtomatsko sklanjatev</p>
            </div>
          )}
        </div>
      </details>

      {/* Table sections - frequency comparison (collapsible, najem-based types only) */}
      {showSeasonalField && (
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-500 hover:text-blue-600 list-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5">
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              Primerjava frekvenc
            </span>
            {tableSections.length > 0 && (
              <span className="text-blue-600">{tableSections.length} {tableSections.length === 1 ? 'tabela' : tableSections.length === 2 ? 'tabeli' : 'tabele'}</span>
            )}
          </summary>
          <div className="mt-2 space-y-2">
            {tableSections.map((section, idx) => (
              <div key={section.id} className="border rounded-lg p-2 space-y-1.5 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={section.label}
                    onChange={(e) => {
                      const updated = [...tableSections];
                      updated[idx] = { ...section, label: e.target.value };
                      setTableSections(updated);
                    }}
                    className="flex-1 p-1.5 border rounded text-xs"
                    placeholder={`Opcija ${idx + 1}`}
                  />
                  <button
                    onClick={() => setTableSections(tableSections.filter((_, i) => i !== idx))}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Odstrani"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Frekvenca:</span>
                  <select
                    value={section.frequency}
                    onChange={(e) => {
                      const updated = [...tableSections];
                      const newFreq = e.target.value as FrequencyKey;
                      updated[idx] = { ...section, frequency: newFreq, label: section.label.replace(/Menjava .+/, `Menjava ${formatWeeks(newFreq)}`) };
                      setTableSections(updated);
                    }}
                    className="p-1 border rounded text-xs bg-white"
                  >
                    {FREQUENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const usedFreqs = tableSections.map(s => s.frequency);
                const availableFreq = FREQUENCY_OPTIONS.find(o => !usedFreqs.includes(o.value))?.value || '4';
                const nextIdx = tableSections.length;
                const freq = offerFrequency as FrequencyKey;
                if (tableSections.length === 0) {
                  const nextFreq = freq === '1' ? '2' : freq === '2' ? '4' : freq === '4' ? '1' : '2';
                  setTableSections([
                    { id: 'section-0', label: `Opcija 1: Menjava ${formatWeeks(freq)}`, frequency: freq },
                    { id: 'section-1', label: `Opcija 2: Menjava ${formatWeeks(nextFreq)}`, frequency: nextFreq as FrequencyKey },
                  ]);
                } else {
                  setTableSections([...tableSections, {
                    id: `section-${Date.now()}`,
                    label: `Opcija ${nextIdx + 1}: Menjava ${formatWeeks(availableFreq)}`,
                    frequency: availableFreq as FrequencyKey,
                  }]);
                }
              }}
              className="w-full py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              {tableSections.length === 0 ? 'Dodaj primerjalno tabelo' : 'Dodaj tabelo'}
            </button>
          </div>
        </details>
      )}

      {/* AI Generate button */}
      {onGenerateAI && (
        <button
          onClick={async () => {
            setIsGeneratingAI(true);
            try {
              const result = await onGenerateAI(offerType);
              if (result) {
                setIntroText(result.intro_text);
                setServiceText(result.service_text);
                setClosingText(result.closing_text);
                setSeasonalText(result.seasonal_text);
                setHasEdited(true);
              }
            } finally {
              setIsGeneratingAI(false);
            }
          }}
          disabled={isGeneratingAI}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs hover:bg-indigo-100 disabled:opacity-50"
        >
          {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Generiraj z AI
        </button>
      )}

      {/* Color picker */}
      <div>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600"
        >
          <Palette size={14} />
          <span>Barva tabele</span>
          <span
            className="inline-block w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: tableColor }}
          />
        </button>

        {showColorPicker && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {PRESET_COLORS.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => onTableColorChange(color)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  tableColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={label}
              />
            ))}
            <input
              type="color"
              value={tableColor}
              onChange={(e) => onTableColorChange(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200"
              title="Izberi barvo"
            />
          </div>
        )}
      </div>

      {/* HTML Preview - content is generated internally, not from user input */}
      <div className="bg-white border rounded-lg p-4 max-h-[50vh] overflow-y-auto">
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
        onClick={() => onCopyHtml(textOverrides)}
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
          &larr; Uredi
        </button>
        <button onClick={onClose} className="flex-1 py-2 border rounded text-sm">
          Zapri
        </button>
      </div>
    </div>
  );
}

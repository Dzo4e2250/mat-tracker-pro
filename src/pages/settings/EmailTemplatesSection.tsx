/**
 * @file EmailTemplatesSection.tsx
 * @description Seznam email predlog z vizualnim block canvas urejevalnikom.
 * Obstoječe privzete + lastne predloge.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, Loader2, Sparkles, ChevronRight, Check, Eye, Mail, PenLine, Snowflake, Table, HandMetal, User } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useEmailSignature } from '@/hooks/useEmailSignature';
import type { UserEmailTemplate, UserEmailSignature } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_TABLE_COLOR } from '@/pages/contacts/hooks/useOfferEmail';
import EmailBlockCanvas, { type BlockDef } from '@/components/EmailBlockCanvas';

// HTML escape utility to prevent XSS in preview
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  najem: 'Najem',
  nakup: 'Nakup',
  primerjava: 'Primerjava (najem + nakup)',
  dodatna: 'Dodatna ponudba',
  custom: 'Lastna predloga',
};

const TEMPLATE_TYPES = ['najem', 'nakup', 'primerjava', 'dodatna'] as const;

const DEFAULT_BLOCK_ORDER = ['intro', 'seasonal', 'tables', 'service', 'closing'];

// Generates a preview HTML that mirrors the actual email structure from useOfferEmail
// Now supports block ordering
function generatePreviewHTML(
  introText: string, serviceText: string, closingText: string, seasonalText: string,
  templateType: string, sig?: UserEmailSignature | null, blockOrder?: string[] | null
): string {
  const c = DEFAULT_TABLE_COLOR;
  const b = `border: 1px solid ${c}; padding: 8px;`;
  const hdr = `background-color: ${c}; color: #ffffff;`;

  // --- NAJEM table (9 columns) ---
  const najemRow = `<tr><td style="${b}">STD-85x150</td><td style="${b}">predpražnik</td><td style="${b}">85x150</td><td style="${b}">ne</td><td style="${b} text-align: center;">2</td><td style="${b}">4 tedne</td><td style="${b}">-</td><td style="${b} text-align: right;">3.50 €</td><td style="${b} text-align: right;">68.00 €</td></tr>`
    + `<tr><td style="${b}">STD-115x175</td><td style="${b}">predpražnik</td><td style="${b}">115x175</td><td style="${b}">ne</td><td style="${b} text-align: center;">1</td><td style="${b}">4 tedne</td><td style="${b}">-</td><td style="${b} text-align: right;">5.20 €</td><td style="${b} text-align: right;">95.00 €</td></tr>`;
  const najemTable = `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;">`
    + `<thead><tr style="${hdr}"><th colspan="2" style="${b} text-align: left;">Artikli za najem</th><th colspan="7" style="${b} text-align: center;">Opis, količina, cena</th></tr>`
    + `<tr style="${hdr}"><th style="${b}">Koda</th><th style="${b}">Naziv</th><th style="${b}">Velikost</th><th style="${b}">Kupcu prilagojen izdelek</th><th style="${b}">Količina</th><th style="${b}">Frekvenca menjave</th><th style="${b}">Obdobje</th><th style="${b}">Cena/teden/kos<br/><em>NAJEM</em></th><th style="${b}">Povračilo<br/><em>(primer uničenja ali izgube) / kos</em></th></tr></thead>`
    + `<tbody>${najemRow}</tbody></table>`
    + `<p style="font-size: 11px; color: #0066cc; margin: 5px 0;">Cene ne vključujejo DDV</p>`
    + `<p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> 3 KOS</p>`
    + `<p style="font-size: 12px; margin: 5px 0;"><strong>Frekvenca menjave:</strong> 4 TEDNE</p>`
    + `<p style="font-size: 12px; margin: 5px 0;"><strong>4-tedenski obračun:</strong> 49.20 €</p>`;

  // --- NAKUP table (6 columns) ---
  const nakupRow = `<tr><td style="${b}">DESIGN-85x150</td><td style="${b}">predpražnik po meri</td><td style="${b}">85x150</td><td style="${b}">da</td><td style="${b} text-align: center;">2</td><td style="${b} text-align: right;">209.63 €</td></tr>`
    + `<tr><td style="${b}">DESIGN-115x175</td><td style="${b}">predpražnik po meri</td><td style="${b}">115x175</td><td style="${b}">da</td><td style="${b} text-align: center;">1</td><td style="${b} text-align: right;">331.89 €</td></tr>`;
  const nakupTable = `<table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 10px;">`
    + `<thead><tr style="${hdr}"><th colspan="2" style="${b} text-align: left;">Artikel</th><th colspan="4" style="${b} text-align: center;">Opis, količina, cena</th></tr>`
    + `<tr style="${hdr}"><th style="${b}">Koda</th><th style="${b}">Naziv</th><th style="${b}">Velikost</th><th style="${b}">Kupcu prilagojen izdelek</th><th style="${b}">Količina</th><th style="${b}">Cena/kos<br/><em>NAKUP</em></th></tr></thead>`
    + `<tbody>${nakupRow}</tbody></table>`
    + `<p style="font-size: 11px; color: #0066cc; margin: 5px 0;">Cene ne vključujejo DDV</p>`
    + `<p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Število predpražnikov:</strong> 3 KOS</p>`
    + `<p style="font-size: 12px; margin: 5px 0;"><strong>Cena:</strong> 751.15 €</p>`;

  // Signature
  let sigBlock = `<p style="margin-top: 20px;">Lep pozdrav,</p>`;
  if (sig?.is_active) {
    const parts: string[] = [];
    parts.push(`<div style="border-top: 2px solid ${c}; padding-top: 10px; margin-top: 10px; font-family: Arial, sans-serif; font-size: 13px;">`);
    if (sig.full_name) parts.push(`<p style="margin: 0; font-weight: bold; color: ${c};">${escapeHtml(sig.full_name)}</p>`);
    if (sig.title) parts.push(`<p style="margin: 2px 0; color: #666;">${escapeHtml(sig.title)}</p>`);
    if (sig.phone) parts.push(`<p style="margin: 2px 0;">Tel: ${escapeHtml(sig.phone)}</p>`);
    if (sig.company_name) parts.push(`<p style="margin: 8px 0 2px; font-weight: bold;">${escapeHtml(sig.company_name)}</p>`);
    if (sig.company_address) parts.push(`<p style="margin: 2px 0; color: #666;">${escapeHtml(sig.company_address)}</p>`);
    if (sig.website) parts.push(`<p style="margin: 2px 0;"><a href="${escapeHtml(sig.website)}" style="color: #0066cc;">${escapeHtml(sig.website)}</a></p>`);
    parts.push('</div>');
    sigBlock += parts.join('');
  }

  const showSeasonal = templateType === 'najem' || templateType === 'primerjava' || templateType === 'dodatna';

  // Block renderers for ordered rendering
  const blockRenderers: Record<string, () => string> = {
    intro: () => introText ? `<p>${escapeHtml(introText)}</p>` : '',
    seasonal: () => showSeasonal && seasonalText ? `<p>${escapeHtml(seasonalText)}</p>` : '',
    tables: () => {
      if (templateType === 'nakup') return nakupTable;
      if (templateType === 'primerjava') {
        return `<h3 style="color: ${c};">1. Opcija: Najem in vzdrževanje</h3>`
          + `<p>Vključuje redno menjavo in čiščenje.</p>`
          + najemTable
          + `<h3 style="color: ${c}; margin-top: 30px;">2. Opcija: Nakup predpražnikov</h3>`
          + `<p>Enkraten strošek nakupa predpražnikov v trajno last.</p>`
          + nakupTable;
      }
      return najemTable;
    },
    service: () => serviceText ? `<p>${escapeHtml(serviceText)}</p>` : '',
    closing: () => closingText ? `<p>${escapeHtml(closingText)}</p>` : '',
  };

  const order = blockOrder || DEFAULT_BLOCK_ORDER;
  const body = order.map(id => blockRenderers[id]?.() || '').join('');
  return `<p>Pozdravljeni,</p>${body}${sigBlock}`;
}

const TEMPLATE_TYPE_COLORS: Record<string, string> = {
  najem: 'bg-blue-100 text-blue-700',
  nakup: 'bg-green-100 text-green-700',
  primerjava: 'bg-purple-100 text-purple-700',
  dodatna: 'bg-amber-100 text-amber-700',
  custom: 'bg-gray-100 text-gray-700',
};

// Build BlockDef array from template data
function buildBlocks(
  templateType: string,
  introText: string,
  seasonalText: string,
  serviceText: string,
  closingText: string,
  blockOrder?: string[] | null,
  sig?: UserEmailSignature | null,
): BlockDef[] {
  const showSeasonal = templateType === 'najem' || templateType === 'primerjava' || templateType === 'dodatna';

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
      text: sig?.is_active ? (sig.full_name || '') : '', visible: true, color: 'gray',
    },
  };

  // Middle reorderable blocks
  const order = blockOrder || DEFAULT_BLOCK_ORDER;
  const middleBlocks = order.map(id => blockMap[id]).filter(Boolean);

  return [blockMap.greeting, ...middleBlocks, blockMap.signoff, blockMap.signature];
}

interface TemplateEditorProps {
  template: UserEmailTemplate;
  onSave: (updates: Partial<UserEmailTemplate>) => Promise<void>;
  onCancel: () => void;
  onGenerateAI: (templateType: string, customPrompt?: string) => Promise<{ intro_text: string; service_text: string; closing_text: string; seasonal_text: string } | null>;
  isGenerating: boolean;
  signature?: UserEmailSignature | null;
  onPreviewUpdate?: (html: string) => void;
}

function TemplateEditor({ template, onSave, onCancel, onGenerateAI, isGenerating, signature: sig, onPreviewUpdate }: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [introText, setIntroText] = useState(template.intro_text);
  const [serviceText, setServiceText] = useState(template.service_text);
  const [closingText, setClosingText] = useState(template.closing_text);
  const [seasonalText, setSeasonalText] = useState(template.seasonal_text || '');
  const [blockOrder, setBlockOrder] = useState<string[]>(template.block_order || DEFAULT_BLOCK_ORDER);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when template prop changes
  useEffect(() => {
    setName(template.name);
    setIntroText(template.intro_text);
    setServiceText(template.service_text);
    setClosingText(template.closing_text);
    setSeasonalText(template.seasonal_text || '');
    setBlockOrder(template.block_order || DEFAULT_BLOCK_ORDER);
    setActiveBlockId(null);
  }, [template.id]);

  const blocks = useMemo(
    () => buildBlocks(template.template_type, introText, seasonalText, serviceText, closingText, blockOrder, sig),
    [template.template_type, introText, seasonalText, serviceText, closingText, blockOrder, sig]
  );

  const previewHtml = useMemo(
    () => generatePreviewHTML(introText, serviceText, closingText, seasonalText, template.template_type, sig, blockOrder),
    [introText, serviceText, closingText, seasonalText, template.template_type, sig, blockOrder]
  );

  const handleBlockTextChange = useCallback((blockId: string, text: string) => {
    switch (blockId) {
      case 'intro': setIntroText(text); break;
      case 'seasonal': setSeasonalText(text); break;
      case 'service': setServiceText(text); break;
      case 'closing': setClosingText(text); break;
    }
  }, []);

  const handleBlocksReorder = useCallback((newOrder: string[]) => {
    // Extract only the reorderable block IDs (exclude greeting, signoff, signature)
    const reorderableIds = newOrder.filter(id => !['greeting', 'signoff', 'signature'].includes(id));
    setBlockOrder(reorderableIds);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        intro_text: introText,
        service_text: serviceText,
        closing_text: closingText,
        seasonal_text: seasonalText || null,
        block_order: blockOrder,
      });
      toast.success('Predloga shranjena');
    } catch {
      toast.error('Napaka pri shranjevanju');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    const result = await onGenerateAI(template.template_type, customPrompt || undefined);
    if (result) {
      setIntroText(result.intro_text);
      setServiceText(result.service_text);
      setClosingText(result.closing_text);
      setSeasonalText(result.seasonal_text);
      toast.success('Besedilo generirano z AI');
    }
  };

  // Send live preview to parent's persistent panel on desktop
  useEffect(() => {
    onPreviewUpdate?.(previewHtml);
  }, [previewHtml, onPreviewUpdate]);

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block font-medium">Ime predloge</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm"
            placeholder="Ime predloge"
          />
        </div>

        {/* Block Canvas */}
        <EmailBlockCanvas
          blocks={blocks}
          onBlockTextChange={handleBlockTextChange}
          onBlocksReorder={handleBlocksReorder}
          activeBlockId={activeBlockId}
          onActiveBlockChange={setActiveBlockId}
        />

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Navodila za AI (opcijsko)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={2}
            className="w-full p-2 border rounded-lg text-sm resize-none"
            placeholder='npr. "Fokus na zimsko sezono" ali "Krajši, bolj direktni ton"'
          />
        </div>

        <div className="flex gap-2 pt-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generiraj z AI
          </button>
          <div className="flex-1" />
          <button onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Shrani
          </button>
        </div>

        {/* Mobile/tablet preview (lg+ uses the persistent right panel) */}
        <div className="lg:hidden mt-4">
          <label className="text-sm text-gray-600 mb-2 block font-medium">Predogled emaila</label>
          <div className="bg-white border rounded-lg p-3 max-h-[300px] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmailTemplatesSectionProps {
  userId: string;
}

export default function EmailTemplatesSection({ userId }: EmailTemplatesSectionProps) {
  const { templates, isLoading, isFallback, getTemplatesForType, createTemplate, updateTemplate, deleteTemplate } = useEmailTemplates(userId);
  const { signature: userSignature } = useEmailSignature(userId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['najem']));
  const [isGenerating, setIsGenerating] = useState(false);
  const [creatingType, setCreatingType] = useState<string | null>(null);
  const [liveEditorPreviewHtml, setLiveEditorPreviewHtml] = useState<string | null>(null);

  // Determine which template to show in the persistent desktop preview
  const previewTemplate = useMemo(() => {
    if (editingId) return templates.find(t => t.id === editingId);
    if (previewId) return templates.find(t => t.id === previewId);
    for (const type of TEMPLATE_TYPES) {
      if (expandedTypes.has(type)) {
        const typeTemplates = getTemplatesForType(type);
        if (typeTemplates.length > 0) return typeTemplates[0];
      }
    }
    return templates[0];
  }, [editingId, previewId, templates, expandedTypes, getTemplatesForType]);

  const persistentPreviewHtml = useMemo(
    () => previewTemplate
      ? generatePreviewHTML(previewTemplate.intro_text, previewTemplate.service_text, previewTemplate.closing_text, previewTemplate.seasonal_text || '', previewTemplate.template_type, userSignature, previewTemplate.block_order)
      : '',
    [previewTemplate, userSignature]
  );

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const handleGenerateAI = async (templateType: string, customPrompt?: string) => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Ni prijave');

      const body: Record<string, string> = { template_type: templateType };
      if (customPrompt) body.custom_prompt = customPrompt;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://jtkwgkmccxdzmitlefgj.supabase.co'}/functions/v1/generate-email-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'AI generiranje ni uspelo');
      }

      const result = await res.json();
      return result as { intro_text: string; service_text: string; closing_text: string; seasonal_text: string };
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri AI generiranju');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDuplicate = async (template: UserEmailTemplate) => {
    try {
      await createTemplate.mutateAsync({
        name: `${template.name} (kopija)`,
        template_type: template.template_type,
        intro_text: template.intro_text,
        service_text: template.service_text,
        closing_text: template.closing_text,
        seasonal_text: template.seasonal_text,
        block_order: template.block_order,
        is_default: false,
      });
      toast.success('Predloga kopirana');
    } catch {
      toast.error('Napaka pri kopiranju');
    }
  };

  const handleCreateNew = async (type: string) => {
    try {
      const result = await createTemplate.mutateAsync({
        name: `Nova predloga (${TEMPLATE_TYPE_LABELS[type]})`,
        template_type: type as any,
        intro_text: '',
        service_text: '',
        closing_text: '',
        seasonal_text: '',
        is_default: false,
      });
      setEditingId(result.id);
      setExpandedTypes(prev => new Set([...prev, type]));
      setCreatingType(null);
    } catch {
      toast.error('Napaka pri ustvarjanju');
    }
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('Privzete predloge ni mogoče izbrisati');
      return;
    }
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Predloga izbrisana');
      if (editingId === id) setEditingId(null);
    } catch {
      toast.error('Napaka pri brisanju');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Uredite besedilo email ponudb. Vsak tip ponudbe ima privzeto predlogo, ki jo lahko prilagodite ali dodate nove.
      </p>

      {/* Fallback notice */}
      {isFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <p className="font-medium">Predloge so prikazane iz privzetih nastavitev sistema.</p>
          <p className="mt-1">Za urejanje in shranjevanje lastnih predlog je potrebno pognati migracijo baze (<code>20260314_email_templates_and_signatures.sql</code>).</p>
        </div>
      )}

      {/* Desktop: two-column layout (templates left, persistent preview right) */}
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6">
        {/* Left: template list */}
        <div className="space-y-4">
          {TEMPLATE_TYPES.map(type => {
            const typeTemplates = getTemplatesForType(type);
            const isExpanded = expandedTypes.has(type);

            return (
              <div key={type} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleType(type)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 text-left transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2">
                    <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      <ChevronRight size={18} />
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TEMPLATE_TYPE_COLORS[type] || TEMPLATE_TYPE_COLORS.custom}`}>{TEMPLATE_TYPE_LABELS[type]}</span>
                    <span className="text-xs text-gray-400">({typeTemplates.length} {typeTemplates.length === 1 ? 'predloga' : 'predlog'})</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t p-3 space-y-3 animate-in fade-in duration-200">
                    {typeTemplates.map(template => (
                      <div key={template.id}>
                        {editingId === template.id && !isFallback ? (
                          <TemplateEditor
                            template={template}
                            onSave={async (updates) => {
                              await updateTemplate.mutateAsync({ id: template.id, ...updates });
                              setEditingId(null);
                              setLiveEditorPreviewHtml(null);
                            }}
                            onCancel={() => { setEditingId(null); setLiveEditorPreviewHtml(null); }}
                            onGenerateAI={handleGenerateAI}
                            isGenerating={isGenerating}
                            signature={userSignature}
                            onPreviewUpdate={setLiveEditorPreviewHtml}
                          />
                        ) : (
                          <div
                            className={`flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm cursor-pointer transition-colors ${
                              previewTemplate?.id === template.id ? 'ring-2 ring-blue-300 border-blue-300' : ''
                            }`}
                            onClick={() => setPreviewId(template.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{template.name}</span>
                                {template.is_default && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">privzeta</span>
                                )}
                              </div>
                              {template.intro_text && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{template.intro_text.slice(0, 100)}{template.intro_text.length > 100 ? '...' : ''}</p>
                              )}
                              {template.service_text && (
                                <p className="text-xs text-gray-300 mt-0.5 truncate">{template.service_text.slice(0, 80)}{template.service_text.length > 80 ? '...' : ''}</p>
                              )}
                            </div>
                            {!isFallback && (
                              <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setEditingId(template.id)}
                                  className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Uredi"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(template)}
                                  className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Kopiraj"
                                >
                                  <Copy size={16} />
                                </button>
                                {!template.is_default && (
                                  <button
                                    onClick={() => handleDelete(template.id, template.is_default)}
                                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Izbriši"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add new template button */}
                    {isFallback ? (
                      <p className="text-xs text-amber-600 text-center p-2">
                        Za dodajanje predlog je potrebno pognati migracijo baze.
                      </p>
                    ) : (
                      <button
                        onClick={() => handleCreateNew(type)}
                        disabled={createTemplate.isPending}
                        className="w-full flex items-center justify-center gap-1.5 p-2 text-sm text-gray-500 border border-dashed rounded-lg hover:border-blue-400 hover:text-blue-600"
                      >
                        <Plus size={14} />
                        Dodaj predlogo za {TEMPLATE_TYPE_LABELS[type].toLowerCase()}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: persistent desktop preview */}
        <div className="hidden lg:block min-w-0 overflow-hidden">
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                <Eye size={14} />
                Predogled
              </label>
              {previewTemplate && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TEMPLATE_TYPE_COLORS[previewTemplate.template_type] || TEMPLATE_TYPE_COLORS.custom}`}>
                  {previewTemplate.name}
                </span>
              )}
            </div>
            <div className="bg-white border rounded-lg p-3 max-h-[70vh] overflow-y-auto shadow-sm">
              {(liveEditorPreviewHtml || persistentPreviewHtml) ? (
                <div
                  className="text-[13px] [&_table]:text-[10px] [&_p]:leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: liveEditorPreviewHtml || persistentPreviewHtml }}
                />
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Izberi predlogo za predogled</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

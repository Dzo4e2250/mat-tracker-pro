/**
 * @file AISettingsSection.tsx
 * @description Sekcija za AI nastavitve (provider, API key, modeli) v profilu
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AI_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    fastModels: [{ value: 'gpt-4o-mini', label: 'GPT-4o Mini (hitri)' }],
    smartModels: [{ value: 'gpt-4o', label: 'GPT-4o (pametnejsi)' }],
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    fastModels: [{ value: 'claude-3-5-haiku-latest', label: 'Claude Haiku (hitri)' }],
    smartModels: [{ value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (pametnejsi)' }],
  },
  google: {
    label: 'Google Gemini',
    fastModels: [{ value: 'gemini-2.0-flash', label: 'Gemini Flash (hitri)' }],
    smartModels: [{ value: 'gemini-2.0-pro', label: 'Gemini Pro (pametnejsi)' }],
  },
} as const;

type ProviderKey = keyof typeof AI_PROVIDERS;

interface AISettingsSectionProps {
  userId: string;
}

export default function AISettingsSection({ userId }: AISettingsSectionProps) {
  const [provider, setProvider] = useState<ProviderKey>('openai');
  const [apiKey, setApiKey] = useState('');
  const [fastModel, setFastModel] = useState('');
  const [smartModel, setSmartModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [existingProvider, setExistingProvider] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Check if user has existing AI settings
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from('user_ai_settings' as any)
        .select('provider, fast_model, smart_model')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const existing = data[0] as any;
        setHasExisting(true);
        setExistingProvider(existing.provider);
        setProvider(existing.provider as ProviderKey);
        setFastModel(existing.fast_model);
        setSmartModel(existing.smart_model);
      }
    };

    checkExisting();
  }, [userId]);

  // Set default models when provider changes
  useEffect(() => {
    const config = AI_PROVIDERS[provider];
    if (!fastModel || !config.fastModels.find(m => m.value === fastModel)) {
      setFastModel(config.fastModels[0].value);
    }
    if (!smartModel || !config.smartModels.find(m => m.value === smartModel)) {
      setSmartModel(config.smartModels[0].value);
    }
  }, [provider]);

  const handleSave = async () => {
    if (!apiKey && !hasExisting) {
      toast.error('Vnesite API kljuc');
      return;
    }

    // Only save if key is provided (or updating models with existing key)
    if (!apiKey) {
      toast.error('Vnesite API kljuc za posodobitev');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Ni seje');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-ai-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            provider,
            api_key: apiKey,
            fast_model: fastModel,
            smart_model: smartModel,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Napaka pri shranjevanju');
      }

      setHasExisting(true);
      setExistingProvider(provider);
      setApiKey(''); // Clear key from memory
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 5000);
      toast.success('AI nastavitve shranjene');
    } catch (error: any) {
      toast.error(error.message || 'Napaka pri shranjevanju AI nastavitev');
    } finally {
      setIsSaving(false);
    }
  };

  const providerConfig = AI_PROVIDERS[provider];

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      {hasExisting && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Konfigurirano: {AI_PROVIDERS[existingProvider as ProviderKey]?.label || existingProvider}
        </div>
      )}

      {/* Provider selection */}
      <div>
        <label className="text-sm text-gray-600 mb-1 block">Ponudnik AI</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderKey)}
          className="w-full p-3 border rounded-lg bg-white"
        >
          {Object.entries(AI_PROVIDERS).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="text-sm text-gray-600 mb-1 block">API kljuc</label>
        {justSaved && !apiKey ? (
          <div className="w-full p-3 border-2 border-green-400 rounded-lg bg-green-50 flex items-center gap-2 text-green-700">
            <Check size={18} className="shrink-0" />
            <span className="font-medium">Kljuc shranjen in sifriran</span>
            <span className="text-green-500 ml-auto text-sm">●●●●●●●●</span>
          </div>
        ) : (
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setJustSaved(false); }}
              className={`w-full p-3 border rounded-lg pr-10 ${hasExisting && !apiKey ? 'border-green-300 bg-green-50/30' : ''}`}
              placeholder={hasExisting ? '●●●●●●●● (vnesi nov kljuc za zamenjavo)' : 'sk-... ali kljuc ponudnika'}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {hasExisting ? 'Kljuc je varno sifriran v bazi. Za zamenjavo vnesi novega.' : 'Kljuc se sifrira v bazi. Nikoli ni vrnjen nazaj.'}
        </p>
      </div>

      {/* Fast model */}
      <div>
        <label className="text-sm text-gray-600 mb-1 block">Hitri model (OCR)</label>
        <select
          value={fastModel}
          onChange={(e) => setFastModel(e.target.value)}
          className="w-full p-3 border rounded-lg bg-white"
        >
          {providerConfig.fastModels.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Smart model */}
      <div>
        <label className="text-sm text-gray-600 mb-1 block">Pametni model (sklepanje)</label>
        <select
          value={smartModel}
          onChange={(e) => setSmartModel(e.target.value)}
          className="w-full p-3 border rounded-lg bg-white"
        >
          {providerConfig.smartModels.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !apiKey}
        className="w-full py-3 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <><Loader2 size={18} className="animate-spin" /> Shranjujem...</>
        ) : hasExisting ? (
          <><Check size={18} /> Posodobi nastavitve</>
        ) : (
          'Shrani nastavitve'
        )}
      </button>
    </div>
  );
}

/**
 * @file NotificationSettingsSection.tsx
 * @description Notification settings with 5 collapsible sections, auto-save, phone preview
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Loader2, FileText, FileCheck, Bell as BellIcon, Send, Moon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/hooks/useNotificationSettings';
import type { UserNotificationSettingsUpdate } from '@/integrations/supabase/types';
import PhoneMockup from './components/PhoneMockup';
import NotificationPreviewContent from './components/NotificationPreviewContent';

type ReminderType = 'offer' | 'contract' | 'general';

interface NotificationSettingsSectionProps {
  userId: string;
}

export default function NotificationSettingsSection({ userId }: NotificationSettingsSectionProps) {
  const { settings: dbSettings, isLoading, upsertSettings } = useNotificationSettings(userId);

  // Local state (merged DB + defaults)
  const [local, setLocal] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['offer', 'contract']));
  const [previewType, setPreviewType] = useState<ReminderType>('offer');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Sync DB → local state
  useEffect(() => {
    if (dbSettings) {
      const { id: _, user_id: __, created_at: ___, updated_at: ____, ...rest } = dbSettings;
      setLocal(rest);
      initializedRef.current = true;
    } else if (!isLoading) {
      initializedRef.current = true;
    }
  }, [dbSettings, isLoading]);

  // Debounced auto-save
  const saveToDb = useCallback((updates: Omit<UserNotificationSettingsUpdate, 'user_id' | 'id'>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      upsertSettings.mutate(updates, {
        onError: () => toast.error('Napaka pri shranjevanju nastavitev'),
      });
    }, 800);
  }, [upsertSettings]);

  // Update helper
  const update = useCallback(<K extends keyof typeof DEFAULT_NOTIFICATION_SETTINGS>(key: K, value: (typeof DEFAULT_NOTIFICATION_SETTINGS)[K]) => {
    setLocal(prev => {
      const next = { ...prev, [key]: value };
      if (initializedRef.current) {
        saveToDb(next);
      }
      return next;
    });
  }, [saveToDb]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
        Nastavite kako in kdaj prejmete opomnike za ponudbe, pogodbe in splošne naloge.
      </p>

      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6">
        {/* Left column: settings */}
        <div className="space-y-3">
          {/* 1. Offer follow-up */}
          <CollapsibleSection
            id="offer"
            icon={<FileText size={16} />}
            title="Sledenje ponudbam"
            isExpanded={expandedSections.has('offer')}
            onToggle={() => toggleSection('offer')}
          >
            <div className="space-y-4">
              <SwitchRow
                label="Samodejni opomniki za ponudbe"
                checked={local.offer_followup_enabled}
                onChange={v => update('offer_followup_enabled', v)}
              />
              {local.offer_followup_enabled && (
                <>
                  <SelectRow
                    label="Max follow-upov"
                    value={String(local.offer_followup_max_rounds)}
                    options={[
                      { value: '0', label: '0 (brez)' },
                      { value: '1', label: '1' },
                      { value: '2', label: '2' },
                      { value: '3', label: '3' },
                      { value: '10', label: 'Brez omejitve' },
                    ]}
                    onChange={v => update('offer_followup_max_rounds', Number(v))}
                  />
                  <NumberRow
                    label="Interval med follow-upi"
                    value={local.offer_followup_interval_days}
                    min={1}
                    max={14}
                    suffix="dni"
                    onChange={v => update('offer_followup_interval_days', v)}
                  />
                  <SwitchRow
                    label="Po zadnjem follow-upu opomni za klic"
                    checked={local.offer_auto_escalate_call}
                    onChange={v => update('offer_auto_escalate_call', v)}
                  />
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* 2. Contract follow-up */}
          <CollapsibleSection
            id="contract"
            icon={<FileCheck size={16} />}
            title="Sledenje pogodbam"
            isExpanded={expandedSections.has('contract')}
            onToggle={() => toggleSection('contract')}
          >
            <div className="space-y-4">
              <SwitchRow
                label="Samodejni opomniki za pogodbe"
                checked={local.contract_followup_enabled}
                onChange={v => update('contract_followup_enabled', v)}
              />
              {local.contract_followup_enabled && (
                <>
                  <NumberRow
                    label="Interval med opomniki"
                    value={local.contract_followup_interval_days}
                    min={1}
                    max={7}
                    suffix="dni"
                    onChange={v => update('contract_followup_interval_days', v)}
                  />
                  <NumberRow
                    label="Zaznaj po X dneh brez odgovora"
                    value={local.contract_detection_days}
                    min={1}
                    max={14}
                    suffix="dni"
                    onChange={v => update('contract_detection_days', v)}
                  />
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* 3. General reminders */}
          <CollapsibleSection
            id="general"
            icon={<BellIcon size={16} />}
            title="Splošni opomniki"
            isExpanded={expandedSections.has('general')}
            onToggle={() => toggleSection('general')}
          >
            <SwitchRow
              label="Prikaži splošne opomnike"
              checked={local.general_reminders_enabled}
              onChange={v => update('general_reminders_enabled', v)}
            />
          </CollapsibleSection>

          {/* 4. Channels */}
          <CollapsibleSection
            id="channels"
            icon={<Send size={16} />}
            title="Kanal obveščanja"
            isExpanded={expandedSections.has('channels')}
            onToggle={() => toggleSection('channels')}
          >
            <div className="space-y-4">
              <SwitchRow
                label="V aplikaciji"
                checked={true}
                onChange={() => {}}
                disabled
                badge="Vedno vklopljeno"
              />
              <SwitchRow
                label="Push obvestila"
                checked={local.channel_browser_push}
                onChange={v => update('channel_browser_push', v)}
                disabled
                badge="Kmalu"
                badgeColor="bg-amber-100 text-amber-600"
              />
              <SwitchRow
                label="Dnevno poročilo po emailu"
                checked={local.channel_email_digest}
                onChange={v => update('channel_email_digest', v)}
                disabled
                badge="Kmalu"
                badgeColor="bg-amber-100 text-amber-600"
              />
            </div>
          </CollapsibleSection>

          {/* 5. Quiet hours */}
          <CollapsibleSection
            id="quiet"
            icon={<Moon size={16} />}
            title="Tihi čas"
            isExpanded={expandedSections.has('quiet')}
            onToggle={() => toggleSection('quiet')}
          >
            <div className="space-y-4">
              <SwitchRow
                label="Tihi čas (brez obvestil)"
                checked={local.quiet_hours_enabled}
                onChange={v => update('quiet_hours_enabled', v)}
              />
              {local.quiet_hours_enabled && (
                <div className="flex gap-3 items-center">
                  <TimeInput
                    label="Od"
                    value={local.quiet_hours_start || '18:00'}
                    onChange={v => update('quiet_hours_start', v)}
                  />
                  <span className="text-gray-400 text-sm mt-5">—</span>
                  <TimeInput
                    label="Do"
                    value={local.quiet_hours_end || '08:00'}
                    onChange={v => update('quiet_hours_end', v)}
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Info note */}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-lg text-[11px] text-blue-700">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Nastavitve se shranijo samodejno. Dejanska logika opomnikov bo aktivirana v naslednji posodobitvi (Faza 2).
            </span>
          </div>

          {/* Mobile: inline preview */}
          <div className="lg:hidden mt-6">
            <p className="text-sm text-gray-600 font-medium mb-3">Predogled obvestila</p>
            {/* Type pills */}
            <div className="flex gap-1.5 mb-3">
              {(['offer', 'contract', 'general'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPreviewType(t)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                    previewType === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t === 'offer' ? 'Ponudba' : t === 'contract' ? 'Pogodba' : 'Splošni'}
                </button>
              ))}
            </div>
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm" style={{ height: 300 }}>
              <NotificationPreviewContent
                reminderType={previewType}
                intervalDays={previewType === 'offer' ? local.offer_followup_interval_days : local.contract_followup_interval_days}
                maxRounds={local.offer_followup_max_rounds}
              />
            </div>
          </div>
        </div>

        {/* Right column: phone preview (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            {/* Type selector pills */}
            <div className="flex gap-1.5 mb-3 justify-center">
              {(['offer', 'contract', 'general'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPreviewType(t)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                    previewType === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t === 'offer' ? 'Ponudba' : t === 'contract' ? 'Pogodba' : 'Splošni'}
                </button>
              ))}
            </div>

            <PhoneMockup>
              <NotificationPreviewContent
                reminderType={previewType}
                intervalDays={previewType === 'offer' ? local.offer_followup_interval_days : local.contract_followup_interval_days}
                maxRounds={local.offer_followup_max_rounds}
              />
            </PhoneMockup>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              Klikni na obvestilo za interakcijo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Reusable sub-components ===== */

function CollapsibleSection({
  id,
  icon,
  title,
  isExpanded,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 text-left transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <ChevronRight size={16} />
          </span>
          <span className="text-gray-500">{icon}</span>
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t p-4 bg-white animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
  disabled,
  badge,
  badgeColor = 'bg-blue-100 text-blue-600',
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <label className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        {badge && (
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        } ${disabled ? '' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2.5 py-1.5 text-sm border rounded-lg bg-white text-gray-700 min-w-[120px]"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => {
            const n = Number(e.target.value);
            if (n >= min && n <= max) onChange(n);
          }}
          className="w-16 px-2 py-1.5 text-sm border rounded-lg text-center"
        />
        <span className="text-xs text-gray-500">{suffix}</span>
      </div>
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1.5 text-sm border rounded-lg bg-white"
      />
    </div>
  );
}

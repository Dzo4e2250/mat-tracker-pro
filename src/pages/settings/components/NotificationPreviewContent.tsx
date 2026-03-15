/**
 * @file NotificationPreviewContent.tsx
 * @description Three-state notification preview: Lock Screen → In-App Card → Action Dialog
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, Phone, X, Clock, FileText, AlertCircle } from 'lucide-react';

type PreviewState = 'lock' | 'card' | 'action';
type ReminderType = 'offer' | 'contract' | 'general';

interface NotificationPreviewContentProps {
  reminderType: ReminderType;
  intervalDays?: number;
  maxRounds?: number;
}

const REMINDER_CONFIG: Record<ReminderType, {
  title: string;
  subtitle: string;
  lockText: string;
  cardColor: string;
  cardBg: string;
  cardBorder: string;
  icon: typeof FileText;
}> = {
  offer: {
    title: 'Ponudba - Follow up',
    subtitle: 'Čaka na odgovor',
    lockText: 'Podjetje ABC d.o.o. ni odgovorilo na ponudbo.',
    cardColor: 'text-amber-700',
    cardBg: 'bg-amber-50',
    cardBorder: 'border-amber-200',
    icon: FileText,
  },
  contract: {
    title: 'Pogodba - Opomnik',
    subtitle: 'Pogodba ni bila vrnjena',
    lockText: 'Podjetje ABC d.o.o. ni vrnilo pogodbe.',
    cardColor: 'text-purple-700',
    cardBg: 'bg-purple-50',
    cardBorder: 'border-purple-200',
    icon: FileText,
  },
  general: {
    title: 'Splošni opomnik',
    subtitle: 'Nastavljen opomnik',
    lockText: 'Opomnik: Pokliči stranko ABC d.o.o.',
    cardColor: 'text-red-700',
    cardBg: 'bg-red-50',
    cardBorder: 'border-red-200',
    icon: AlertCircle,
  },
};

const OFFER_ACTIONS = [
  { label: 'Hoče pogodbo', icon: Check, color: 'bg-green-500 text-white' },
  { label: 'Potrebuje čas', icon: Clock, color: 'bg-blue-500 text-white' },
  { label: 'Ni interesa', icon: X, color: 'bg-gray-400 text-white' },
  { label: 'Predrago', icon: X, color: 'bg-red-400 text-white' },
];

export default function NotificationPreviewContent({
  reminderType,
  intervalDays = 2,
  maxRounds = 3,
}: NotificationPreviewContentProps) {
  const [state, setState] = useState<PreviewState>('lock');
  const [animating, setAnimating] = useState(false);
  const config = REMINDER_CONFIG[reminderType];

  // Reset to lock screen when reminder type changes
  useEffect(() => {
    setState('lock');
  }, [reminderType]);

  const transition = useCallback((to: PreviewState) => {
    setAnimating(true);
    setTimeout(() => {
      setState(to);
      setAnimating(false);
    }, 300);
  }, []);

  const handleActionClick = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setState('lock');
      setAnimating(false);
    }, 600);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className={`flex-1 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
        {state === 'lock' && (
          <LockScreen
            config={config}
            intervalDays={intervalDays}
            onTap={() => transition('card')}
          />
        )}
        {state === 'card' && (
          <InAppCard
            config={config}
            reminderType={reminderType}
            maxRounds={maxRounds}
            intervalDays={intervalDays}
            onYes={() => transition('action')}
            onNo={() => transition('lock')}
          />
        )}
        {state === 'action' && (
          <ActionDialog
            reminderType={reminderType}
            config={config}
            onAction={handleActionClick}
          />
        )}
      </div>

      {/* State navigation pills */}
      <div className="flex justify-center gap-2 pb-1 pt-2">
        {(['lock', 'card', 'action'] as const).map(s => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`w-2 h-2 rounded-full transition-all ${
              state === s ? 'bg-white w-4' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ----- Lock Screen ----- */
function LockScreen({
  config,
  intervalDays,
  onTap,
}: {
  config: typeof REMINDER_CONFIG.offer;
  intervalDays: number;
  onTap: () => void;
}) {
  return (
    <div
      className="h-full flex flex-col cursor-pointer select-none"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 30%, #4a7ab5 60%, #6b9fd4 100%)',
      }}
      onClick={onTap}
    >
      {/* Clock */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-white/90 text-[52px] font-extralight leading-none tracking-tight">
          9:00
        </div>
        <div className="text-white/60 text-sm mt-1">ponedeljek, 16. marca</div>
      </div>

      {/* Notification card */}
      <div className="px-4 pb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            {/* App icon */}
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-900">{config.title}</span>
                <span className="text-[9px] text-gray-400">zdaj</span>
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">
                {config.lockText}
              </p>
              <p className="text-[9px] text-gray-400 mt-1">
                Follow up {intervalDays > 1 ? `čez ${intervalDays} dni` : 'jutri'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- In-App Reminder Card ----- */
function InAppCard({
  config,
  reminderType,
  maxRounds,
  intervalDays,
  onYes,
  onNo,
}: {
  config: typeof REMINDER_CONFIG.offer;
  reminderType: ReminderType;
  maxRounds: number;
  intervalDays: number;
  onYes: () => void;
  onNo: () => void;
}) {
  const Icon = config.icon;

  return (
    <div className="h-full bg-gray-100 flex flex-col">
      {/* App header bar */}
      <div className="bg-white border-b px-3 py-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">M</span>
        </div>
        <span className="text-[11px] font-semibold text-gray-800">Mat Tracker Pro</span>
      </div>

      {/* Scrollable card area */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className={`rounded-xl border-2 ${config.cardBorder} ${config.cardBg} p-3 shadow-sm`}>
          {/* Card header */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${config.cardBg}`}>
              <Icon size={14} className={config.cardColor} />
            </div>
            <div>
              <div className={`text-[11px] font-semibold ${config.cardColor}`}>{config.title}</div>
              <div className="text-[9px] text-gray-500">{config.subtitle}</div>
            </div>
          </div>

          {/* Card body */}
          <div className="bg-white rounded-lg p-2.5 mb-3">
            <p className="text-[10px] font-semibold text-gray-900 mb-1">ABC d.o.o.</p>
            <p className="text-[10px] text-gray-600 leading-snug">
              {reminderType === 'offer' && `Ponudba poslana pred ${intervalDays} dnevi. Follow up ${maxRounds > 0 ? `1/${maxRounds}` : ''}.`}
              {reminderType === 'contract' && `Pogodba poslana pred ${intervalDays + 1} dnevi, ni bila vrnjena.`}
              {reminderType === 'general' && 'Nastavljen opomnik za to podjetje.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onYes}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-lg text-[10px] font-medium active:scale-95 transition-transform"
            >
              <Check size={12} />
              Da
            </button>
            <button
              onClick={onNo}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-[10px] font-medium active:scale-95 transition-transform"
            >
              <X size={12} />
              Ne
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- Action Dialog ----- */
function ActionDialog({
  reminderType,
  config,
  onAction,
}: {
  reminderType: ReminderType;
  config: typeof REMINDER_CONFIG.offer;
  onAction: () => void;
}) {
  return (
    <div className="h-full bg-gray-100 flex flex-col">
      {/* App header bar */}
      <div className="bg-white border-b px-3 py-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">M</span>
        </div>
        <span className="text-[11px] font-semibold text-gray-800">Mat Tracker Pro</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex items-center">
        <div className="w-full bg-white rounded-xl shadow-md p-3">
          <p className={`text-[11px] font-semibold ${config.cardColor} mb-3 text-center`}>
            {reminderType === 'offer' ? 'Kaj je stranka odgovorila?' : reminderType === 'contract' ? 'Pogodba prejeta?' : 'Opravljeno?'}
          </p>

          {reminderType === 'offer' ? (
            <div className="grid grid-cols-2 gap-2">
              {OFFER_ACTIONS.map(act => {
                const ActIcon = act.icon;
                return (
                  <button
                    key={act.label}
                    onClick={onAction}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-[9px] font-medium ${act.color} active:scale-95 transition-transform`}
                  >
                    <ActIcon size={11} />
                    {act.label}
                  </button>
                );
              })}
            </div>
          ) : reminderType === 'contract' ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={onAction}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-lg text-[10px] font-medium active:scale-95 transition-transform"
              >
                <Check size={12} />
                Pogodba prejeta
              </button>
              <button
                onClick={onAction}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 text-white rounded-lg text-[10px] font-medium active:scale-95 transition-transform"
              >
                <Phone size={12} />
                Pokliči stranko
              </button>
            </div>
          ) : (
            <button
              onClick={onAction}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-lg text-[10px] font-medium active:scale-95 transition-transform"
            >
              <Check size={12} />
              Opravljeno
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

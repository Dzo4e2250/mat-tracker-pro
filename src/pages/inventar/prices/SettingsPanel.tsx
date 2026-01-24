import type { PendingSettingChange } from './usePriceChanges';

interface SettingInputProps {
  label: string;
  settingKey: string;
  value: number;
  suffix?: string;
  isPercentage?: boolean;
  pendingChanges: Map<string, PendingSettingChange>;
  onChange: (key: string, oldValue: number, newValue: number) => void;
}

export function SettingInput({
  label,
  settingKey,
  value,
  suffix,
  isPercentage,
  pendingChanges,
  onChange,
}: SettingInputProps) {
  const pending = pendingChanges.get(settingKey);
  const isChanged = pending !== undefined;

  // For percentages: display as % (e.g., 1.5 -> 50%), save as multiplier
  const displayValue = isPercentage ? (value - 1) * 100 : value;
  const currentDisplayValue = pending
    ? isPercentage
      ? (pending.newValue - 1) * 100
      : pending.newValue
    : displayValue;

  const handleChange = (inputVal: string) => {
    const numVal = parseFloat(inputVal);
    if (isNaN(numVal)) return;

    const saveValue = isPercentage ? 1 + numVal / 100 : numVal;
    onChange(settingKey, value, saveValue);
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 p-2 rounded ${isChanged ? 'bg-yellow-50' : 'bg-gray-50'}`}
    >
      <label className="text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        {isPercentage && <span className="text-gray-400">+</span>}
        <input
          type="number"
          step={isPercentage ? '1' : '0.01'}
          value={currentDisplayValue}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-20 p-1 border rounded text-right text-sm ${isChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
        />
        <span className="text-gray-500 text-sm w-12">
          {isPercentage ? '%' : suffix}
        </span>
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  settings: {
    special_shape_multiplier?: number;
    optibrush_special_shape_multiplier?: number;
    design_purchase_price_per_m2?: number;
    optibrush_m2_threshold?: number;
  };
  pendingChanges: Map<string, PendingSettingChange>;
  onChange: (key: string, oldValue: number, newValue: number) => void;
}

export function SettingsPanel({
  settings,
  pendingChanges,
  onChange,
}: SettingsPanelProps) {
  return (
    <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
      <div className="font-medium text-gray-800 mb-3">Splošne nastavitve</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <SettingInput
          label="Posebne oblike najem"
          settingKey="special_shape_multiplier"
          value={settings.special_shape_multiplier || 1.5}
          isPercentage
          pendingChanges={pendingChanges}
          onChange={onChange}
        />
        <SettingInput
          label="Posebne oblike Optibrush"
          settingKey="optibrush_special_shape_multiplier"
          value={settings.optibrush_special_shape_multiplier || 1.3}
          isPercentage
          pendingChanges={pendingChanges}
          onChange={onChange}
        />
        <SettingInput
          label="Design nakup"
          settingKey="design_purchase_price_per_m2"
          value={settings.design_purchase_price_per_m2 || 165}
          suffix="€/m²"
          pendingChanges={pendingChanges}
          onChange={onChange}
        />
        <SettingInput
          label="Optibrush prag velikosti"
          settingKey="optibrush_m2_threshold"
          value={settings.optibrush_m2_threshold || 7.5}
          suffix="m²"
          pendingChanges={pendingChanges}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

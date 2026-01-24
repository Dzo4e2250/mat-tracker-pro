/**
 * @file SignContractModal.tsx
 * @description Modal za podpis pogodbe
 */

interface SignContractModalProps {
  frequency: string;
  isPending: boolean;
  onFrequencyChange: (frequency: string) => void;
  onSign: () => void;
  onBack: () => void;
}

export default function SignContractModal({
  frequency,
  isPending,
  onFrequencyChange,
  onSign,
  onBack,
}: SignContractModalProps) {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Podpiši pogodbo</h3>
      <select
        value={frequency || ''}
        onChange={(e) => onFrequencyChange(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        aria-label="Izberi frekvenco"
      >
        <option value="">Izberi frekvenco...</option>
        <option value="1_week">1x tedensko</option>
        <option value="2_weeks">2x tedensko</option>
        <option value="3_weeks">3x tedensko</option>
        <option value="4_weeks">4x tedensko (mesečno)</option>
      </select>
      <button
        onClick={onSign}
        disabled={!frequency || isPending}
        className="w-full bg-purple-500 text-white py-2 rounded disabled:bg-gray-300"
      >
        {isPending ? 'Shranjevanje...' : 'Potrdi'}
      </button>
      <button
        onClick={onBack}
        className="w-full mt-2 py-2 border rounded"
      >
        Nazaj
      </button>
    </div>
  );
}

/**
 * @file OfferTypeStep.tsx
 * @description Korak 1: Izbira tipa ponudbe in frekvence
 */

import { OfferType, FrequencyType } from './types';

interface OfferTypeStepProps {
  offerType: OfferType;
  offerFrequency: string;
  hasNajem: boolean;
  onTypeChange: (type: OfferType) => void;
  onFrequencyChange: (freq: string) => void;
  onNext: () => void;
}

/**
 * Korak za izbiro tipa ponudbe
 * - Najem, Nakup, Primerjava, Dodatna prodaja
 * - Frekvenca menjave (če je najem)
 */
export default function OfferTypeStep({
  offerType,
  offerFrequency,
  hasNajem,
  onTypeChange,
  onFrequencyChange,
  onNext,
}: OfferTypeStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center text-gray-600 mb-4">Izberi tip ponudbe</div>

      <div className="space-y-3">
        {/* Option 1: Samo najem */}
        <button
          onClick={() => onTypeChange('najem')}
          className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'najem' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'najem' ? 'border-blue-500' : 'border-gray-300'}`}>
              {offerType === 'najem' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </div>
            <div>
              <div className="font-bold text-blue-600">NAJEM</div>
              <div className="text-sm text-gray-500">Samo najem predpražnikov</div>
            </div>
          </div>
        </button>

        {/* Option 2: Samo nakup */}
        <button
          onClick={() => onTypeChange('nakup')}
          className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'nakup' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'nakup' ? 'border-yellow-500' : 'border-gray-300'}`}>
              {offerType === 'nakup' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />}
            </div>
            <div>
              <div className="font-bold text-yellow-600">NAKUP</div>
              <div className="text-sm text-gray-500">Samo nakup predpražnikov</div>
            </div>
          </div>
        </button>

        {/* Option 3: Primerjava */}
        <button
          onClick={() => onTypeChange('primerjava')}
          className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'primerjava' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'primerjava' ? 'border-green-500' : 'border-gray-300'}`}>
              {offerType === 'primerjava' && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
            </div>
            <div>
              <div className="font-bold text-green-600">PRIMERJAVA</div>
              <div className="text-sm text-gray-500">Isti artikli za najem IN nakup</div>
            </div>
          </div>
        </button>

        {/* Option 4: Dodatna prodaja */}
        <button
          onClick={() => onTypeChange('dodatna')}
          className={`w-full p-4 border-2 rounded-lg text-left ${offerType === 'dodatna' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${offerType === 'dodatna' ? 'border-purple-500' : 'border-gray-300'}`}>
              {offerType === 'dodatna' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
            </div>
            <div>
              <div className="font-bold text-purple-600">DODATNA PRODAJA</div>
              <div className="text-sm text-gray-500">Različni artikli za najem in nakup</div>
            </div>
          </div>
        </button>
      </div>

      {/* Frekvenca for najem types */}
      {hasNajem && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Frekvenca menjave:</div>
          <div className="grid grid-cols-4 gap-2">
            {['1', '2', '3', '4'].map(freq => (
              <button
                key={freq}
                onClick={() => onFrequencyChange(freq)}
                className={`py-2 rounded ${offerFrequency === freq ? 'bg-blue-500 text-white' : 'bg-white border'}`}
              >
                {freq} {freq === '1' ? 'teden' : 'tedne'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
      >
        Naprej →
      </button>
    </div>
  );
}

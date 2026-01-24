/**
 * @file ConfirmSendStep.tsx
 * @description Korak za potrditev pošiljanja pogodbe
 */

import { Check, Send, Download } from 'lucide-react';

interface ConfirmSendStepProps {
  onSendToClient: () => void;
  onDownloadAgain: () => void;
  onClose: () => void;
}

export default function ConfirmSendStep({
  onSendToClient,
  onDownloadAgain,
  onClose,
}: ConfirmSendStepProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            PDF uspesno generiran!
          </h3>
          <p className="text-gray-600 mb-6">
            Pogodba je bila prenesena. Ali zelis poslati pogodbo stranki?
          </p>

          <div className="space-y-3">
            <button
              onClick={onSendToClient}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Send size={18} />
              Da, poslji stranki
            </button>

            <button
              onClick={onDownloadAgain}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              Prenesi PDF ponovno
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Zapri
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

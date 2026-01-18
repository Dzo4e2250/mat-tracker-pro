/**
 * @file ContractConfirmDialog.tsx
 * @description Dialog za potrditev generiranja pogodbe iz ponudbe
 */

import { X, FileText } from 'lucide-react';

interface ContractConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Potrditveni dialog za generiranje pogodbe
 */
export default function ContractConfirmDialog({
  onConfirm,
  onCancel,
}: ContractConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
        <div className="flex justify-end p-2">
          <button onClick={onCancel} className="p-1 text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="px-6 pb-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Generiranje pogodbe
          </h3>
          <p className="text-gray-600 mb-6">
            Ali želiš generirati pogodbo iz te ponudbe?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ne
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Da, generiraj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

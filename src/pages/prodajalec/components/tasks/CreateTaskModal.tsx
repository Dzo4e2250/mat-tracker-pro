/**
 * @file CreateTaskModal.tsx
 * @description Modal za ustvarjanje nove naloge z lazy loading za podjetja
 */

import { useState } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import type { CompanyWithContacts } from '@/hooks/useCompanyContacts';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; companyId?: string }) => void;
  companies?: CompanyWithContacts[];
  loadingCompanies?: boolean;
  isPending: boolean;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onCreate,
  companies,
  loadingCompanies,
  isPending,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [showCompanySelect, setShowCompanySelect] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      title: title.trim(),
      description: description.trim(),
      companyId: companyId || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setCompanyId('');
    setShowCompanySelect(false);
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCompanyId('');
    setShowCompanySelect(false);
    onClose();
  };

  const selectedCompany = companies?.find(c => c.id === companyId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Nova naloga</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Naslov */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naslov *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kaj je treba narediti?"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          {/* Opis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatne podrobnosti (opcijsko)"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Podjetje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Povezano podjetje
            </label>
            {loadingCompanies ? (
              <div className="flex items-center gap-2 p-2 text-gray-500 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Nalagam podjetja...
              </div>
            ) : selectedCompany ? (
              <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-500" />
                  <span className="text-sm">{selectedCompany.display_name || selectedCompany.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCompanyId('')}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Odstrani
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCompanySelect(true)}
                className="w-full px-3 py-2 border border-dashed rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 text-sm flex items-center justify-center gap-2"
              >
                <Building2 size={16} />
                Izberi podjetje (opcijsko)
              </button>
            )}
          </div>

          {/* Company select dropdown */}
          {showCompanySelect && !loadingCompanies && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {companies && companies.length > 0 ? (
                companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      setCompanyId(company.id);
                      setShowCompanySelect(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Building2 size={14} className="text-gray-400" />
                    {company.display_name || company.name}
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500 text-center">
                  Ni podjetij
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Prekliči
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Ustvarjam...' : 'Ustvari'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;

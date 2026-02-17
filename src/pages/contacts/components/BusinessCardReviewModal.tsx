/**
 * @file BusinessCardReviewModal.tsx
 * @description Prikaz rezultatov AI skeniranja vizitke z moznostjo izbire ujemanja
 */

import { useState } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, Hash, Check, ChevronDown, ChevronUp, Brain, Sparkles, Store } from 'lucide-react';
import type { ScanResult, MatchedCompany, ExtractedCardData } from '../hooks/useBusinessCardScanner';

interface BusinessCardReviewModalProps {
  result: ScanResult;
  onUseMatch: (company: MatchedCompany, extractedData: ExtractedCardData) => void;
  onUseExtracted: (extractedData: ExtractedCardData) => void;
  onClose: () => void;
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-orange-100 text-orange-700 border-orange-300',
  none: 'bg-gray-100 text-gray-600 border-gray-300',
};

const CONFIDENCE_LABELS = {
  high: 'Visoka zanesljivost',
  medium: 'Srednja zanesljivost',
  low: 'Nizka zanesljivost',
  none: 'Ni ujemanja',
};

function DataField({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-gray-500">{label}: </span>
        <span className="text-gray-800 font-medium">{value}</span>
      </div>
    </div>
  );
}

function CompanyCandidate({
  company,
  isSelected,
  onSelect,
}: {
  company: MatchedCompany;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="font-medium text-sm">{company.name}</p>
          {company.address_street && (
            <p className="text-xs text-gray-500">
              {company.address_street}, {company.address_postal} {company.address_city}
            </p>
          )}
          {company.tax_number && (
            <p className="text-xs text-gray-400">Davcna: {company.tax_number}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {company.similarity_score !== undefined && (
            <span className="text-xs text-gray-400">{(company.similarity_score * 100).toFixed(0)}%</span>
          )}
          {isSelected && <Check size={16} className="text-indigo-500" />}
        </div>
      </div>
    </button>
  );
}

export default function BusinessCardReviewModal({
  result,
  onUseMatch,
  onUseExtracted,
  onClose,
}: BusinessCardReviewModalProps) {
  const { extracted_data, match } = result;
  const [showCandidates, setShowCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchedCompany | null>(
    match.matched_company
  );

  const allCandidates = [
    ...(match.matched_company ? [match.matched_company] : []),
    ...(match.candidates || []),
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500" />
            Rezultat skeniranja
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Extracted data */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Izvleceni podatki</h4>
            <DataField icon={Building2} label="Podjetje" value={extracted_data.company_name} />
            {extracted_data.branch_name && (
              <DataField icon={Store} label="Poslovalnica" value={extracted_data.branch_name} />
            )}
            <DataField icon={User} label="Oseba" value={extracted_data.person_name} />
            <DataField icon={User} label="Vloga" value={extracted_data.person_role} />
            <DataField icon={Phone} label="Telefon" value={extracted_data.phone} />
            <DataField icon={Mail} label="Email" value={extracted_data.email} />
            {(extracted_data.address_street || extracted_data.address_city) && (
              <DataField icon={MapPin} label="Sedez" value={
                [extracted_data.address_street, extracted_data.address_postal, extracted_data.address_city]
                  .filter(Boolean)
                  .join(', ') || null
              } />
            )}
            {(extracted_data.branch_address_street || extracted_data.branch_address_city) && (
              <DataField icon={MapPin} label="Naslov PE" value={
                [extracted_data.branch_address_street, extracted_data.branch_address_postal, extracted_data.branch_address_city]
                  .filter(Boolean)
                  .join(', ') || null
              } />
            )}
            {/* Fallback: if no branch but has address, show as Naslov */}
            {!extracted_data.branch_name && !extracted_data.branch_address_street && (
              <DataField icon={MapPin} label="Naslov" value={
                [extracted_data.address_street, extracted_data.address_postal, extracted_data.address_city]
                  .filter(Boolean)
                  .join(', ') || null
              } />
            )}
            <DataField icon={Hash} label="Davcna" value={extracted_data.tax_number} />
          </div>

          {/* Match result */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Ujemanje iz registra</h4>
              <span className={`text-xs px-2 py-1 rounded-full border ${CONFIDENCE_COLORS[match.confidence]}`}>
                {CONFIDENCE_LABELS[match.confidence]}
              </span>
            </div>

            {match.reasoning && (
              <div className="bg-indigo-50 rounded-lg p-2 text-xs text-indigo-700 flex items-start gap-2">
                <Brain size={14} className="shrink-0 mt-0.5" />
                <span>{match.reasoning}</span>
              </div>
            )}

            {selectedCandidate ? (
              <div className="border-2 border-indigo-500 rounded-lg p-3 bg-indigo-50">
                <p className="font-medium">{selectedCandidate.name}</p>
                {selectedCandidate.address_street && (
                  <p className="text-sm text-gray-600">
                    {selectedCandidate.address_street}, {selectedCandidate.address_postal} {selectedCandidate.address_city}
                  </p>
                )}
                {selectedCandidate.tax_number && (
                  <p className="text-sm text-gray-500">Davcna: {selectedCandidate.tax_number}</p>
                )}
                {selectedCandidate.legal_form && (
                  <p className="text-xs text-gray-400">{selectedCandidate.legal_form}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Ni ujemanja v registru</p>
            )}

            {/* Other candidates */}
            {allCandidates.length > 1 && (
              <div>
                <button
                  onClick={() => setShowCandidates(!showCandidates)}
                  className="text-sm text-indigo-600 flex items-center gap-1"
                >
                  {showCandidates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showCandidates ? 'Skrij' : 'Pokazi'} {allCandidates.length} kandidatov
                </button>

                {showCandidates && (
                  <div className="mt-2 space-y-2">
                    {allCandidates.map((candidate, i) => (
                      <CompanyCandidate
                        key={`${candidate.tax_number || i}`}
                        company={candidate}
                        isSelected={selectedCandidate === candidate}
                        onSelect={() => setSelectedCandidate(candidate)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {selectedCandidate && (
              <button
                onClick={() => onUseMatch(selectedCandidate, extracted_data)}
                className="w-full py-3 bg-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Building2 size={18} />
                Uporabi ujemanje iz registra
              </button>
            )}

            <button
              onClick={() => onUseExtracted(extracted_data)}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                selectedCandidate
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-indigo-500 text-white'
              }`}
            >
              <User size={18} />
              Uporabi izvlecene podatke
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

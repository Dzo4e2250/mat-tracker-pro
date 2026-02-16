/**
 * @file OfferResponseModal.tsx
 * @description Modal za vnos rezultata klica/odgovora na ponudbo
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FileCheck,
  XCircle,
  Euro,
  Clock,
  Phone,
  Palmtree,
  ArrowLeft,
  Calendar,
  UserX,
} from 'lucide-react';

export type OfferResponseType =
  | 'wants_contract'
  | 'no_interest_close'
  | 'no_interest_followup'
  | 'too_expensive_close'
  | 'too_expensive_followup'
  | 'needs_time'
  | 'call_next_week'
  | 'no_time'
  | 'custom';

interface OfferResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  onSubmit: (response: {
    type: OfferResponseType;
    note: string;
    followupDays?: number;
  }) => void;
}

type ModalStep = 'main' | 'negative_choice';

interface NegativeContext {
  type: 'no_interest' | 'too_expensive';
  label: string;
}

export function OfferResponseModal({
  isOpen,
  onClose,
  companyName,
  onSubmit,
}: OfferResponseModalProps) {
  const [step, setStep] = useState<ModalStep>('main');
  const [negativeContext, setNegativeContext] = useState<NegativeContext | null>(null);
  const [customNote, setCustomNote] = useState('');

  const handleClose = () => {
    setStep('main');
    setNegativeContext(null);
    setCustomNote('');
    onClose();
  };

  const handleNegativeClick = (type: 'no_interest' | 'too_expensive', label: string) => {
    setNegativeContext({ type, label });
    setStep('negative_choice');
  };

  const handleNegativeChoice = (close: boolean) => {
    if (!negativeContext) return;

    const responseType = negativeContext.type === 'no_interest'
      ? (close ? 'no_interest_close' : 'no_interest_followup')
      : (close ? 'too_expensive_close' : 'too_expensive_followup');

    const note = close
      ? negativeContext.label
      : `${negativeContext.label} - followup čez 30 dni`;

    onSubmit({
      type: responseType,
      note,
      followupDays: close ? undefined : 30,
    });
    handleClose();
  };

  const handleQuickOption = (
    type: OfferResponseType,
    note: string,
    followupDays?: number
  ) => {
    onSubmit({ type, note, followupDays });
    handleClose();
  };

  const handleCustomSubmit = () => {
    if (!customNote.trim()) return;
    onSubmit({
      type: 'custom',
      note: customNote.trim(),
    });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {step === 'main' ? (
              <>Kaj ste se dogovorili s stranko?</>
            ) : (
              <button
                onClick={() => setStep('main')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={18} />
                <span>{negativeContext?.label}</span>
              </button>
            )}
          </DialogTitle>
          <p className="text-sm text-gray-500">{companyName}</p>
        </DialogHeader>

        {step === 'main' ? (
          <div className="space-y-3 mt-2">
            {/* Pozitivni odziv */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pozitivno
              </p>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 border-green-300 bg-green-50 hover:bg-green-100 text-green-800"
                onClick={() => handleQuickOption('wants_contract', 'Hoče pogodbo')}
              >
                <FileCheck size={20} className="text-green-600" />
                <span>Hoče pogodbo</span>
              </Button>
            </div>

            {/* Negativni odziv */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Negativno
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3 border-red-300 bg-red-50 hover:bg-red-100 text-red-800"
                  onClick={() => handleNegativeClick('no_interest', 'Ni interesa')}
                >
                  <XCircle size={18} className="text-red-600" />
                  <span>Ni interesa</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800"
                  onClick={() => handleNegativeClick('too_expensive', 'Predrago')}
                >
                  <Euro size={18} className="text-orange-600" />
                  <span>Predrago</span>
                </Button>
              </div>
            </div>

            {/* Odlog */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Odlog
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800"
                  onClick={() => handleQuickOption('needs_time', 'Mora še razmisliti', 5)}
                >
                  <Clock size={18} className="text-blue-600" />
                  <div className="text-left">
                    <span>Mora še razmisliti</span>
                    <span className="text-xs text-blue-600 ml-2">→ followup čez 5 dni</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800"
                  onClick={() => handleQuickOption('call_next_week', 'Pokliči me čez teden', 7)}
                >
                  <Phone size={18} className="text-purple-600" />
                  <div className="text-left">
                    <span>Pokliči me čez teden</span>
                    <span className="text-xs text-purple-600 ml-2">→ followup čez 7 dni</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800"
                  onClick={() => handleQuickOption('no_time', 'Ni časa / na dopustu', 14)}
                >
                  <Palmtree size={18} className="text-teal-600" />
                  <div className="text-left">
                    <span>Ni časa / na dopustu</span>
                    <span className="text-xs text-teal-600 ml-2">→ followup čez 14 dni</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Custom vnos */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Lastna opomba
              </p>
              <Textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Vpiši svojo opombo..."
                className="min-h-[60px]"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={!customNote.trim()}
                onClick={handleCustomSubmit}
              >
                Shrani opombo
              </Button>
            </div>
          </div>
        ) : (
          /* Negative choice step */
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Kaj želite narediti?
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 border-red-300 bg-red-50 hover:bg-red-100 text-red-800"
                onClick={() => handleNegativeChoice(true)}
              >
                <UserX size={20} className="text-red-600" />
                <div className="text-left">
                  <div className="font-medium">Zaključi</div>
                  <div className="text-xs text-red-600">
                    Vrni v status "Kontaktiran", brez followupa
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
                onClick={() => handleNegativeChoice(false)}
              >
                <Calendar size={20} className="text-amber-600" />
                <div className="text-left">
                  <div className="font-medium">Followup čez 30 dni</div>
                  <div className="text-xs text-amber-600">
                    Morda se bo situacija spremenila
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

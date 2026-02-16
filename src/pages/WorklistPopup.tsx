/**
 * @file WorklistPopup.tsx
 * @description iPhone-style popup window for CRM data entry
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useD365Worklist } from '@/hooks/useCompanyNotes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  SkipForward,
} from 'lucide-react';

// Copy button with feedback
function CopyField({ value, label }: { value: string | null | undefined; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!value) return null;

  return (
    <button
      onClick={handleCopy}
      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-0.5">
        {copied ? '✓ Skopirano' : label}
      </div>
      <div className={`font-semibold text-[15px] ${copied ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
    </button>
  );
}

export default function WorklistPopup() {
  const { user } = useAuth();
  const { data: worklistActivities, isLoading } = useD365Worklist(user?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [addressExpanded, setAddressExpanded] = useState(false);

  const allActivities = worklistActivities || [];
  const currentActivity = allActivities[currentIndex];
  const totalCount = allActivities.length;

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= totalCount && totalCount > 0) {
      setCurrentIndex(totalCount - 1);
    }
  }, [totalCount, currentIndex]);

  // Mutations
  const markAsEnteredMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('company_notes')
        .update({ exported_to_d365_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['d365-worklist'] });
      queryClient.invalidateQueries({ queryKey: ['all-company-notes'] });
      toast({ description: '✓ Vneseno v CRM' });
    },
    onError: (error: Error) => {
      toast({ description: `Napaka: ${error.message}`, variant: 'destructive' });
    },
  });


  const handleMarkAsEntered = () => {
    if (currentActivity) markAsEnteredMutation.mutate(currentActivity.id);
  };

  const handleSkip = () => {
    // Just move to the next activity without deleting
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (totalCount > 1) {
      // If at the end, go back to start
      setCurrentIndex(0);
    }
  };

  const goToPrevious = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);
  const goToNext = () => currentIndex < totalCount - 1 && setCurrentIndex(currentIndex + 1);

  const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '';
    const match = timestamp.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sl-SI', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // iPhone-style container
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2">
      {/* iPhone frame */}
      <div className="w-full max-w-[390px] bg-gray-100 rounded-[40px] overflow-hidden shadow-2xl border-[8px] border-gray-800">
        {/* Dynamic Island / Notch */}
        <div className="bg-gray-100 pt-3 pb-2 flex justify-center">
          <div className="w-28 h-7 bg-black rounded-full"></div>
        </div>

        {/* Screen content */}
        <div className="bg-white min-h-[700px] max-h-[85vh] overflow-y-auto">
          {/* Status bar style header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-4">
            <div className="text-center">
              <h1 className="text-lg font-semibold">Za vnos v CRM</h1>
              {totalCount > 0 && (
                <p className="text-blue-100 text-sm">{totalCount} aktivnosti čaka</p>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check size={40} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Vse vneseno!</h2>
              <p className="text-gray-500 text-center mb-6">Ni več aktivnosti za vnos v CRM.</p>
              <button
                onClick={() => window.close()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium"
              >
                Zapri okno
              </button>
            </div>
          ) : (
            <>
              {/* Navigation */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow disabled:opacity-30"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                  <span className="text-2xl font-bold text-blue-600">{currentIndex + 1}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-lg text-gray-500">{totalCount}</span>
                </div>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === totalCount - 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow disabled:opacity-30"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {currentActivity && (
                <div className="px-5 py-4 space-y-4">
                  {/* Company section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Building2 size={16} className="text-blue-500" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Podjetje</span>
                    </div>
                    <div className="space-y-2">
                      <CopyField value={currentActivity.company?.tax_number} label="Davčna številka" />
                      <CopyField
                        value={currentActivity.company?.display_name || currentActivity.company?.name}
                        label="Ime podjetja"
                      />
                      {currentActivity.company?.name && currentActivity.company?.display_name && (
                        <CopyField value={currentActivity.company.name} label="Polno ime" />
                      )}
                    </div>
                  </div>

                  {/* Date & Time - under company */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                      <Calendar size={16} />
                      {formatDate(currentActivity.note_date)}
                    </div>
                    {formatTime(currentActivity.start_time) && (
                      <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
                        <Clock size={16} />
                        {formatTime(currentActivity.start_time)} - {formatTime(currentActivity.end_time)}
                      </div>
                    )}
                  </div>

                  {/* Contact section */}
                  {currentActivity.company?.contacts?.[0] && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <User size={16} className="text-green-500" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kontakt</span>
                      </div>
                      <div className="space-y-2">
                        <CopyField value={currentActivity.company.contacts[0].first_name} label="Ime" />
                        <CopyField value={currentActivity.company.contacts[0].last_name} label="Priimek" />
                        <CopyField
                          value={currentActivity.company.contacts[0].phone || currentActivity.company.contacts[0].work_phone}
                          label="Telefon"
                        />
                        <CopyField value={currentActivity.company.contacts[0].email} label="Email" />
                      </div>
                    </div>
                  )}

                  {/* Content section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <FileText size={16} className="text-purple-500" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vsebina</span>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {currentActivity.content}
                      </p>
                    </div>
                  </div>

                  {/* Address section - collapsible */}
                  {(currentActivity.company?.address_street || currentActivity.company?.address_city) && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setAddressExpanded(!addressExpanded)}
                        className="flex items-center justify-between w-full px-1 py-1"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-orange-500" />
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Naslov</span>
                        </div>
                        {addressExpanded ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400" />
                        )}
                      </button>
                      {addressExpanded && (
                        <div className="space-y-2">
                          <CopyField value={currentActivity.company?.address_street} label="Ulica" />
                          <CopyField value={currentActivity.company?.address_postal} label="Poštna številka" />
                          <CopyField value={currentActivity.company?.address_city} label="Kraj" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom action buttons - iOS style */}
              <div className="sticky bottom-0 bg-white border-t px-5 py-4 pb-8">
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-200 text-gray-700 rounded-2xl font-semibold text-[15px] active:bg-gray-300"
                  >
                    <SkipForward size={18} />
                    Preskoči
                  </button>
                  <button
                    onClick={handleMarkAsEntered}
                    disabled={markAsEnteredMutation.isPending}
                    className="flex-[2] flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-2xl font-semibold text-[15px] active:bg-green-600 disabled:opacity-50"
                  >
                    {markAsEnteredMutation.isPending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Check size={18} />
                        Vneseno v CRM
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Home indicator */}
        <div className="bg-white py-2 flex justify-center">
          <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

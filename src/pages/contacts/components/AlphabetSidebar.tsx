/**
 * @file AlphabetSidebar.tsx
 * @description Abecedna navigacija ob strani za hitro skakanje po seznamu
 */

import { useCallback, useState } from 'react';

interface AlphabetSidebarProps {
  /** Črke ki imajo vsaj eno podjetje */
  availableLetters: Set<string>;
  /** Callback ko uporabnik klikne/potegne na črko */
  onLetterSelect: (letter: string) => void;
}

const ALPHABET = 'ABCČDEFGHIJKLMNOPRSŠTUVZŽ#'.split('');

export default function AlphabetSidebar({ availableLetters, onLetterSelect }: AlphabetSidebarProps) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleLetterInteraction = useCallback((letter: string) => {
    if (availableLetters.has(letter)) {
      setActiveLetter(letter);
      onLetterSelect(letter);
    }
  }, [availableLetters, onLetterSelect]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.getAttribute('data-letter')) {
      const letter = element.getAttribute('data-letter')!;
      handleLetterInteraction(letter);
    }
  }, [handleLetterInteraction]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element && element.getAttribute('data-letter')) {
      const letter = element.getAttribute('data-letter')!;
      handleLetterInteraction(letter);
    }
  }, [isDragging, handleLetterInteraction]);

  return (
    <>
      {/* Prikaz aktivne črke na sredini zaslona */}
      {activeLetter && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-blue-500 text-white text-5xl font-bold w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg animate-in fade-in zoom-in duration-150">
            {activeLetter}
          </div>
        </div>
      )}

      {/* Abecedna vrstica */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center py-1 px-0.5 bg-gray-100/80 backdrop-blur-sm rounded-l-lg select-none touch-none"
        onTouchStart={() => setIsDragging(true)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          setIsDragging(false);
          setTimeout(() => setActiveLetter(null), 300);
        }}
        onMouseDown={() => setIsDragging(true)}
        onMouseMove={handleMouseMove}
        onMouseUp={() => {
          setIsDragging(false);
          setTimeout(() => setActiveLetter(null), 300);
        }}
        onMouseLeave={() => {
          setIsDragging(false);
          setTimeout(() => setActiveLetter(null), 300);
        }}
      >
        {ALPHABET.map(letter => {
          const isAvailable = availableLetters.has(letter);
          return (
            <button
              key={letter}
              data-letter={letter}
              onClick={() => handleLetterInteraction(letter)}
              className={`w-5 h-4 text-[10px] font-semibold flex items-center justify-center transition-colors ${
                isAvailable
                  ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded'
                  : 'text-gray-300'
              } ${activeLetter === letter ? 'bg-blue-500 text-white rounded' : ''}`}
              disabled={!isAvailable}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </>
  );
}

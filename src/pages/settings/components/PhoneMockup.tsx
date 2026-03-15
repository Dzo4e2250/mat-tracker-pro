/**
 * @file PhoneMockup.tsx
 * @description CSS-only iPhone mockup frame (no images).
 */

import type { ReactNode } from 'react';

interface PhoneMockupProps {
  children: ReactNode;
}

export default function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto" style={{ width: 280, height: 560 }}>
      {/* Outer bezel */}
      <div className="absolute inset-0 bg-gray-900 rounded-[40px] shadow-xl border border-gray-700" />

      {/* Screen area */}
      <div className="absolute inset-[4px] rounded-[36px] overflow-hidden bg-black">
        {/* Dynamic island */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-20 w-[90px] h-[24px] bg-black rounded-full" />

        {/* Status bar */}
        <div className="absolute top-[10px] left-0 right-0 z-10 flex items-center justify-between px-6 py-1 text-white text-[10px] font-medium">
          <span>9:41</span>
          <span />
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
              <rect x="0" y="7" width="2.5" height="3" rx="0.5" />
              <rect x="3.5" y="5" width="2.5" height="5" rx="0.5" />
              <rect x="7" y="3" width="2.5" height="7" rx="0.5" />
              <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" />
            </svg>
            {/* Battery */}
            <svg width="20" height="10" viewBox="0 0 20 10" fill="currentColor">
              <rect x="0" y="1" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="1.5" y="2.5" width="12" height="5" rx="0.5" fill="currentColor" opacity="0.8" />
              <rect x="17" y="3" width="2" height="4" rx="0.5" />
            </svg>
          </div>
        </div>

        {/* Content area */}
        <div className="absolute top-[40px] bottom-[24px] left-0 right-0 overflow-hidden">
          {children}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-white/40 rounded-full" />
      </div>
    </div>
  );
}

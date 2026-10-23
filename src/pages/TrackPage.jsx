/**
 * TrackPage.jsx
 * ───────────────────────────────────────────────────────────────
 * Dedicated Standalone Order Tracking & Fleet Telemetry Page:
 *  - Opens as a separate, distraction-free production application page
 *  - Top aerospace command bar with back button & pop-out window action
 *  - Full 5-step fabrication pipeline & real-time telemetry readout
 *  - Deep-link support for specific Tracking IDs (e.g., #/track?id=NX-88492)
 */

import { useEffect, useState } from "react";
import OrderTracker from "../components/sections/OrderTracker";

export default function TrackPage({ onBack }) {
  // Extract tracking ID from URL if provided (e.g. #/track?id=NX-88492 or #/track/NX-88492)
  const [initialId] = useState(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]id=([a-zA-Z0-9_-]+)/i) || hash.match(/#\/track\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1].toUpperCase() : "NX-88492";
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePopout = () => {
    const url = window.location.origin + window.location.pathname + `#/track?id=${initialId}`;
    window.open(url, "_blank", "width=1280,height=900,menubar=no,toolbar=no,location=no,status=no");
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col selection:bg-[#FF5A00] selection:text-black">
      {/* ── TOP AEROSPACE COMMAND BAR ─────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#161616]/95 backdrop-blur-md border-b border-[#333333] px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand + Return Link */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="group flex items-center gap-2 font-mono text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <span className="text-[#FF5A00] group-hover:-translate-x-0.5 transition-transform">←</span>
              [ RETURN TO MAIN PLATFORM ]
            </button>
            <span className="text-[#333333] hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm tracking-wider text-white">NEXUS // 3D</span>
              <span className="font-mono text-[10px] text-[#FF5A00] bg-[#FF5A00]/10 px-2 py-0.5 border border-[#FF5A00]/30 font-semibold uppercase">
                TELEMETRY TERMINAL
              </span>
            </div>
          </div>

          {/* Right Fleet Indicators & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] border border-[#333333] font-mono text-[11px] text-[#A1A1AA]">
              <span className="w-2 h-2 rounded-full bg-[#FF5A00] animate-pulse" />
              <span>FLEET BED #04 LINK ACTIVE</span>
            </div>

            {/* Pop out to standalone new browser window */}
            <button
              type="button"
              onClick={handlePopout}
              title="Open standalone tracking window in separate tab"
              className="font-mono text-[11px] text-white hover:text-[#FF5A00] bg-[#222222] hover:bg-[#2A2A2A] px-3 py-1.5 border border-[#333333] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>[ POP-OUT WINDOW ↗ ]</span>
            </button>
          </div>

        </div>
      </header>

      {/* ── MAIN TRACKING APPLICATION VIEW ────────────────────── */}
      <main className="flex-1">
        <OrderTracker initialId={initialId} isStandalonePage={true} />
      </main>

      {/* ── TERMINAL FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-[#333333] bg-[#141414] py-6 px-6 md:px-12 text-center text-xs font-mono text-[#666666]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>NEXUS-3D-API: ONLINE (127.0.0.1:5050) • AUSTIN ADVANCED ADDITIVE FACILITY</span>
          </div>
          <div>
            <span>SYSTEM PROTOCOL: ISO-9001 / AS9100D AUDITED • 256-BIT ENCRYPTED TELEMETRY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

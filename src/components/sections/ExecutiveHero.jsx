/**
 * src/components/sections/ExecutiveHero.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Executive Industrial Capability & Telemetry Header
 * Presents a world-class high-tech entrance with real-time fleet health,
 * ISO certifications, and quick navigation anchors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { sound } from "../../utils/soundEffects";

export default function ExecutiveHero({ fleet = [], onScrollTo }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeRigs = fleet.filter((r) => r.status === "ACTIVE").length;
  const totalRigs = fleet.length || 4;

  return (
    <section
      className="border border-[#333333] bg-[#141414] rounded-[1px] relative overflow-hidden transition-all duration-300"
      aria-label="Industrial Fleet Overview"
    >
      {/* Background Subtle Industrial Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #333333 1px, transparent 1px),
            linear-gradient(to bottom, #333333 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Atmospheric Orange Glow Accent */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#FF5A00]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 px-5 md:px-8 py-4 border-b border-[#262626] bg-[#161616]/90 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-[#FF5A00] rounded-[1px] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-white font-bold">
            NEXUS CORE // INDUSTRIAL ADDITIVE MANUFACTURING PROTOCOLS
          </span>
          <span className="hidden sm:inline-block font-mono text-[10px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.5 rounded-[1px]">
            ● FLEET ACTIVE ({activeRigs}/{totalRigs})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#A1A1AA] hidden md:inline">
            SYSTEM VERSION: <strong className="text-white">PROD CORE V2.4</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsCollapsed(!isCollapsed);
            }}
            className="font-mono text-[11px] text-[#FF5A00] hover:text-white bg-[#FF5A00]/10 hover:bg-[#FF5A00]/20 border border-[#FF5A00]/30 px-2.5 py-1 rounded-[1px] transition-colors cursor-pointer"
          >
            {isCollapsed ? "[ + EXPAND OVERVIEW ]" : "[ − MINIMIZE ]"}
          </button>
        </div>
      </div>

      {/* Expandable Content Body */}
      {!isCollapsed && (
        <div className="relative z-10 p-5 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 Cols: Title & Mission */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#1A1A1A] border border-[#333333] rounded-[1px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]" />
                <span className="font-mono text-[10px] text-[#A1A1AA] tracking-wider uppercase font-semibold">
                  ENTERPRISE RAPID PROTOTYPING &amp; SERIAL FABRICATION
                </span>
              </div>

              <h1 className="font-sans text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                PRECISION ADDITIVE HARDWARE <br />
                <span className="text-[#FF5A00]">&amp; HIGH-THROUGHPUT FLEET</span>
              </h1>

              <p className="font-sans text-sm text-[#A1A1AA] leading-relaxed max-w-xl">
                Integrated FDM &amp; micronic SLA production cluster. Ingest raw CAD geometry, configure
                structural toolpaths, inspect live thermal telemetry, and dispatch directly to verified
                industrial machines with sub-millimeter tolerances.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  id="btn-hero-launch-slicer"
                  onClick={() => {
                    sound.playClick();
                    onScrollTo("user-panel");
                  }}
                  className="relative group bg-[#FF5A00] hover:bg-[#D94D00] text-black font-mono text-xs font-bold uppercase px-5 py-2.5 rounded-[1px] transition-all duration-200 cursor-pointer shadow-[0_0_16px_rgba(255,90,0,0.35)] hover:shadow-[0_0_24px_rgba(255,90,0,0.6)] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>LAUNCH SLICER &amp; QUOTE ↓</span>
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-hero-explore-vault"
                  onClick={() => {
                    sound.playClick();
                    onScrollTo("popular-designs");
                  }}
                  className="bg-[#1A1A1A] hover:bg-[#252525] text-white hover:text-[#FF5A00] border border-[#333333] hover:border-[#FF5A00]/80 font-mono text-xs font-bold uppercase px-5 py-2.5 rounded-[1px] transition-all duration-200 cursor-pointer hover:shadow-[0_0_14px_rgba(255,90,0,0.2)] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-1.5">
                    <span>🗄</span>
                    <span>EXPLORE VERIFIED VAULT</span>
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-hero-materials-matrix"
                  onClick={() => {
                    sound.playClick();
                    onScrollTo("materials-section");
                  }}
                  className="bg-[#1A1A1A] hover:bg-[#252525] text-white hover:text-[#FF5A00] border border-[#333333] hover:border-[#FF5A00]/80 font-mono text-xs font-bold uppercase px-5 py-2.5 rounded-[1px] transition-all duration-200 cursor-pointer hover:shadow-[0_0_14px_rgba(255,90,0,0.2)] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-1.5">
                    <span>🧪</span>
                    <span>POLYMER &amp; RESIN MATRIX</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Right 5 Cols: 4 Technical KPI Modules */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {/* Metric 1 */}
              <div className="shimmer-card group relative bg-[#111111]/80 backdrop-blur-sm border border-[#262626] p-4 rounded-[1px] hover:border-[#FF5A00]/70 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,90,0,0.12)] cursor-default">
                <span className="absolute top-1.5 right-2 font-mono text-[8px] text-[#444444] group-hover:text-[#FF5A00] transition-colors">+01</span>
                <span className="font-mono text-[9px] text-[#71717A] uppercase tracking-wider block">
                  MICRONIC RESOLUTION
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-white mt-1 block group-hover:text-[#FF5A00] transition-colors">
                  ±0.05 <span className="text-[#FF5A00] text-sm">MM</span>
                </span>
                <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                  Ultra-fine liquid photopolymer SLA optical slicing.
                </p>
              </div>

              {/* Metric 2 */}
              <div className="shimmer-card group relative bg-[#111111]/80 backdrop-blur-sm border border-[#262626] p-4 rounded-[1px] hover:border-[#FF5A00]/70 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,90,0,0.12)] cursor-default">
                <span className="absolute top-1.5 right-2 font-mono text-[8px] text-[#444444] group-hover:text-[#FF5A00] transition-colors">+02</span>
                <span className="font-mono text-[9px] text-[#71717A] uppercase tracking-wider block">
                  STRUCTURAL YIELD
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-white mt-1 block group-hover:text-[#FF5A00] transition-colors">
                  115 <span className="text-[#FF5A00] text-sm">MPA</span>
                </span>
                <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                  Carbon fiber reinforced nylon composite matrix.
                </p>
              </div>

              {/* Metric 3 */}
              <div className="shimmer-card group relative bg-[#111111]/80 backdrop-blur-sm border border-[#262626] p-4 rounded-[1px] hover:border-[#FF5A00]/70 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,90,0,0.12)] cursor-default">
                <span className="absolute top-1.5 right-2 font-mono text-[8px] text-[#444444] group-hover:text-[#FF5A00] transition-colors">+03</span>
                <span className="font-mono text-[9px] text-[#71717A] uppercase tracking-wider block">
                  STANDARD COMPLIANCE
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-white mt-1 block group-hover:text-[#FF5A00] transition-colors">
                  ISO 52900
                </span>
                <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                  Additive manufacturing general design principles.
                </p>
              </div>

              {/* Metric 4 */}
              <div className="shimmer-card group relative bg-[#111111]/80 backdrop-blur-sm border border-[#262626] p-4 rounded-[1px] hover:border-[#22C55E]/70 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.12)] cursor-default">
                <span className="absolute top-1.5 right-2 font-mono text-[8px] text-[#444444] group-hover:text-[#22C55E] transition-colors">+04</span>
                <span className="font-mono text-[9px] text-[#71717A] uppercase tracking-wider block">
                  PRODUCTION PROTOCOL
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-[#22C55E] mt-1 block">
                  24H <span className="text-white text-xs">DISPATCH</span>
                </span>
                <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                  Express automated queueing &amp; thermal annealing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

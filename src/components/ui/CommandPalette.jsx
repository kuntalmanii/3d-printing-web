/**
 * src/components/ui/CommandPalette.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Fast Industrial Command Palette & Search (⌘K / Ctrl+K)
 * Quick jumping across client & operator console, order tracking, and benchmark models.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";
import { sound } from "../../utils/soundEffects";

export default function CommandPalette({
  isOpen,
  onClose,
  orders = [],
  isAdminAuthenticated = false,
  onSelectOrder,
  onSwitchView,
  onSelectDesign,
  popularDesigns = [],
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
    setQuery("");
  } else if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
  }

  useEffect(() => {
    if (isOpen) {
      sound.playClick();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via parent
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  // Filter matching orders
  const matchingOrders = orders.filter(
    (ord) =>
      ord.id.toLowerCase().includes(normalizedQuery) ||
      (ord.filename && ord.filename.toLowerCase().includes(normalizedQuery)) ||
      (ord.client && ord.client.toLowerCase().includes(normalizedQuery))
  );

  // Filter matching popular designs
  const matchingDesigns = popularDesigns.filter(
    (d) =>
      d.title.toLowerCase().includes(normalizedQuery) ||
      d.category.toLowerCase().includes(normalizedQuery) ||
      d.technology.toLowerCase().includes(normalizedQuery)
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#333333] shadow-2xl rounded-[1px] w-full max-w-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#262626] bg-[#161616]">
          <span className="text-[#FF5A00] font-mono text-sm mr-3 font-bold">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an Order ID (e.g. NX-9042), design name, or command..."
            className="w-full bg-transparent text-sm font-mono text-white placeholder-[#71717A] focus:outline-none"
          />
          <kbd className="hidden sm:inline-block font-mono text-[10px] text-[#A1A1AA] bg-[#222222] border border-[#333333] px-2 py-0.5 rounded-[1px]">
            ESC TO CLOSE
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 font-mono text-xs">
          {/* Quick View Controls */}
          <div>
            <span className="text-[10px] text-[#71717A] uppercase tracking-wider block px-2 mb-1.5">
              // WORKSPACE CONSOLES
            </span>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onSwitchView("USER");
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-[1px] hover:bg-[#FF5A00]/10 hover:border-[#FF5A00]/40 border border-transparent flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full" />
                  <span className="text-white group-hover:text-[#FF5A00] font-semibold">
                    SWITCH TO CLIENT PRODUCTION INTERFACE
                  </span>
                </div>
                <kbd className="text-[10px] text-[#71717A] bg-[#1a1a1a] px-1.5 py-0.5 border border-[#333333]">
                  KEY: U
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onSwitchView("ADMIN");
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-[1px] hover:bg-[#FF5A00]/10 hover:border-[#FF5A00]/40 border border-transparent flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isAdminAuthenticated ? "bg-[#22C55E]" : "bg-[#EF4444]"
                    }`}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white group-hover:text-[#FF5A00] font-semibold">
                      SWITCH TO FLEET OPERATOR CONSOLE
                    </span>
                    {!isAdminAuthenticated && (
                      <span className="text-[9px] text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 px-1.5 py-0.2 rounded-[1px] font-bold">
                        🔒 LEVEL 4 AUTH REQ
                      </span>
                    )}
                  </div>
                </div>
                <kbd className="text-[10px] text-[#71717A] bg-[#1a1a1a] px-1.5 py-0.5 border border-[#333333]">
                  KEY: A
                </kbd>
              </button>
            </div>
          </div>

          {/* Matching Active Orders */}
          {matchingOrders.length > 0 && (
            <div>
              <span className="text-[10px] text-[#71717A] uppercase tracking-wider block px-2 mb-1.5">
                // ACTIVE ORDERS &amp; TELEMETRY ({matchingOrders.length})
              </span>
              <div className="space-y-1">
                {matchingOrders.slice(0, 5).map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onSelectOrder(ord.id);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded-[1px] hover:bg-[#222222] border border-[#262626] flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#FF5A00] font-bold">{ord.id}</span>
                      <span className="text-[#A1A1AA] text-[11px] truncate max-w-[220px]">
                        {ord.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 bg-[#181818] border border-[#333333] text-[#A1A1AA]">
                        {ord.status}
                      </span>
                      <span className="text-[#FF5A00] font-bold text-[11px]">
                        {ord.progress || 0}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Popular Designs */}
          {matchingDesigns.length > 0 && (
            <div>
              <span className="text-[10px] text-[#71717A] uppercase tracking-wider block px-2 mb-1.5">
                // POPULAR BENCHMARKS &amp; CAD PRESETS
              </span>
              <div className="space-y-1">
                {matchingDesigns.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onSelectDesign(d);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded-[1px] hover:bg-[#222222] border border-[#262626] flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#A1A1AA] text-[10px]">{d.id}</span>
                      <span className="text-white group-hover:text-[#FF5A00] font-semibold">
                        {d.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#71717A]">
                      [ LOAD INTO SLICER ]
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="border-t border-[#262626] bg-[#111111] px-4 py-2 flex items-center justify-between text-[10px] font-mono text-[#71717A]">
          <div className="flex items-center gap-3">
            <span>[1] Slicer Tab</span>
            <span>[2] Telemetry Tab</span>
            <span>[U/A] Switch Consoles</span>
          </div>
          <span>NEXUS INDUSTRIAL SHELL</span>
        </div>
      </div>
    </div>
  );
}

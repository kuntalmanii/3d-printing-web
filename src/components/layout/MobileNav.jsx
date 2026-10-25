/**
 * src/components/layout/MobileNav.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Mobile Industrial Bottom Command Bar
 * Sticky persistent navigation for mobile devices providing instantaneous
 * access to Slicer, Vault, Materials, and Order Tracker.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { sound } from "../../utils/soundEffects";

export default function MobileNav({ activeSection = "slicer", onScrollTo, onNavigateTrack }) {
  const navItems = [
    {
      id: "slicer",
      targetId: "user-panel",
      label: "SLICER",
      icon: "⚡",
    },
    {
      id: "vault",
      targetId: "popular-designs",
      label: "VAULT",
      icon: "🗄",
    },
    {
      id: "materials",
      targetId: "materials-section",
      label: "MATERIALS",
      icon: "🧪",
    },
    {
      id: "track",
      isRoute: true,
      label: "TRACK",
      icon: "📦",
    },
  ];

  const handleAction = (item) => {
    sound.playClick();
    if (item.isRoute) {
      if (onNavigateTrack) {
        onNavigateTrack();
      } else {
        window.location.assign("#/track");
      }
    } else if (item.targetId) {
      if (onScrollTo) {
        onScrollTo(item.targetId);
      } else {
        document.getElementById(item.targetId)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#141414]/95 backdrop-blur-xl border-t border-[#333333] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="grid grid-cols-4 items-center">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAction(item)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors cursor-pointer select-none ${
                isActive
                  ? "text-[#FF5A00] bg-[#FF5A00]/5"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              {/* Active Top Highlight Bar */}
              {isActive && (
                <span className="absolute top-0 left-2 right-2 h-[2px] bg-[#FF5A00] shadow-[0_0_8px_#FF5A00]" />
              )}
              <span className="text-base leading-none mb-1">{item.icon}</span>
              <span className="font-mono text-[9px] font-bold tracking-wider uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

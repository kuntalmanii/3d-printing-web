/**
 * src/components/layout/MobileNav.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Mobile Industrial Bottom Command Bar
 * Sticky persistent navigation for mobile devices providing instantaneous
 * access to Slicer, Vault, Materials, and Order Tracker.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { sound } from "../../utils/soundEffects";

const NAV_ITEMS = [
  { id: "slicer",    targetId: "user-panel",        label: "SLICER",    icon: "⚡" },
  { id: "vault",     targetId: "popular-designs",    label: "VAULT",     icon: "🗄" },
  { id: "materials", targetId: "materials-section",  label: "MATERIALS", icon: "🧪" },
  { id: "track",     isRoute: true,                  label: "TRACK",     icon: "📦" },
];

export default function MobileNav({ activeSection = "slicer", onScrollTo, onNavigateTrack }) {
  const handleAction = (item) => {
    sound.playClick();
    if (item.isRoute) {
      if (onNavigateTrack) onNavigateTrack();
      else window.location.assign("#/track");
    } else if (item.targetId) {
      if (onScrollTo) onScrollTo(item.targetId);
      else document.getElementById(item.targetId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-[max(env(safe-area-inset-bottom),0.25rem)]"
      style={{
        background: "rgba(12, 12, 12, 0.92)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid rgba(51,51,51,0.8)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      aria-label="Mobile Bottom Navigation"
    >
      {/* Top accent glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,90,0,0.35) 40%, rgba(255,90,0,0.35) 60%, transparent)",
        }}
      />

      <div className="grid grid-cols-4 items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAction(item)}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center justify-center py-3 px-1 relative transition-all duration-200 cursor-pointer select-none"
              style={{
                color: isActive ? "#FF5A00" : "#6B6B6B",
                background: isActive ? "rgba(255,90,0,0.07)" : "transparent",
              }}
            >
              {/* Active top highlight bar */}
              {isActive && (
                <span
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full"
                  style={{
                    background: "#FF5A00",
                    boxShadow: "0 0 10px rgba(255,90,0,0.8), 0 0 20px rgba(255,90,0,0.4)",
                  }}
                />
              )}

              {/* Active ambient glow */}
              {isActive && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,90,0,0.12), transparent)",
                  }}
                />
              )}

              <span
                className="text-base leading-none mb-1 transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
              >
                {item.icon}
              </span>
              <span
                className="font-mono tracking-wider uppercase transition-all duration-200"
                style={{
                  fontSize: "8px",
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: isActive ? "0.14em" : "0.1em",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * src/App.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // 3D FABRICATION — Root Master Application Shell
 *
 * Design Framework Specifications:
 *  - Theme:       Full dark theme (#111111 background, #161616 header, #333333 borders)
 *  - Accent:      #FF5A00 primary
 *  - Typography:  Inter (primary headers & UI text), JetBrains Mono (badges, telemetry, code)
 *  - Selection:   bg-[#FF5A00], text-white
 *  - Radii:       1px strict corner radii
 *
 * Centralized State:
 *  - orders: Array of customer orders initialized from INITIAL_ORDERS
 *  - currentView: "USER" (Client Interface) | "ADMIN" (Operator Console)
 *  - handleNewOrder: appends new orders from UserPanel immediately into shared queue
 *  - handleUpdateOrderStatus: updates shared order status across both consoles
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import UserPanel from "./components/UserPanel";
import ExecutiveHero from "./components/sections/ExecutiveHero";
import PopularDesignsSection from "./components/sections/PopularDesignsSection";
import MaterialsSection from "./components/sections/MaterialsSection";
import TrackPage from "./pages/TrackPage";
import AdminPage from "./pages/AdminPage";
import CommandPalette from "./components/ui/CommandPalette";
import { ToastProvider } from "./components/ui/Toast";
import { INITIAL_ORDERS, INITIAL_FLEET, INITIAL_INVENTORY } from "./data/mockData";
import { sound } from "./utils/soundEffects";

export default function App() {
  return (
    <ToastProvider>
      <MainApplicationShell />
    </ToastProvider>
  );
}

function MainApplicationShell() {
  // Centralized Synchronized State
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [loadedDesign, setLoadedDesign] = useState(null);

  // Operator Authorization Clearance State (Persisted in sessionStorage)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem("nexus_operator_authenticated") === "true";
    } catch {
      return false;
    }
  });

  // Command Palette & Sound State
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Live Real-Time Telemetry Clock
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toTimeString().split(" ")[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem("nexus_operator_authenticated", "true");
    } catch {
      // In private browsing mode where sessionStorage might throw
    }
  };

  const handleLockConsole = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem("nexus_operator_authenticated");
    } catch {
      // In private browsing mode where sessionStorage might throw
    }
    window.location.hash = "#/";
    sound.playClick();
  };

  // Global Keyboard Shortcuts (Cmd+K to search, U to scroll to top)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === "u") {
        sound.playClick();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sound.playChirp();
    }
  };

  const handleScrollTo = (elementId) => {
    setCurrentView("USER");
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleLoadDesign = (design) => {
    sound.playClick();
    setLoadedDesign(design);
    setCurrentView("USER");
    setTimeout(() => {
      document.getElementById("user-panel")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Append new customer order into shared queue, allocate fleet rig, & deduct raw inventory
  const handleNewOrder = (newOrder) => {
    // 1. Immediately append to shared orders queue
    setOrders((prev) => [newOrder, ...prev]);

    // 2. Real-time Raw Material Inventory deduction
    setInventory((prev) =>
      prev.map((item) => {
        const itemLower = item.name.toLowerCase();
        const ordMatLower = (newOrder.material || "").toLowerCase();
        const isMatch =
          (ordMatLower.includes("pa-cf") && itemLower.includes("pa-cf")) ||
          (ordMatLower.includes("petg") && itemLower.includes("petg")) ||
          (ordMatLower.includes("pla") && itemLower.includes("pla")) ||
          (ordMatLower.includes("resin") && itemLower.includes("resin"));

        if (isMatch) {
          const estimatedGrams = Math.round((newOrder.volumeCm3 || 35) * 1.25);
          const remainingGrams = Math.max(0, item.remainingGrams - estimatedGrams);
          return { ...item, remainingGrams };
        }
        return item;
      })
    );

    // 3. Dynamic Fleet Rig Allocation
    setFleet((prev) => {
      const isSLA = newOrder.technology === "SLA";
      const candidateRig =
        prev.find((r) => r.type === (isSLA ? "SLA" : "FDM") && r.status === "IDLE") || prev[0];
      return prev.map((rig) => {
        if (rig.id === candidateRig.id) {
          return {
            ...rig,
            status: "ACTIVE",
            currentOrder: newOrder.id,
            currentLayer: 1,
            totalLayers: Math.round(
              (newOrder.dimensions?.z || 38) / (newOrder.layerHeight || 0.16)
            ),
            nozzleTemp: isSLA ? 0 : 255,
            targetNozzleTemp: isSLA ? 0 : 255,
            bedTemp: isSLA ? 35 : 65,
            targetBedTemp: isSLA ? 35 : 65,
            chamberTemp: isSLA ? 32 : 40,
          };
        }
        return rig;
      });
    });
  };

  // Update order status and synchronize progress & machine telemetry across consoles
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    // 1. Update shared orders state
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const progress =
            newStatus === "DISPATCHED"
              ? 100
              : newStatus === "POST_PROCESSING"
              ? 85
              : newStatus === "PRINTING"
              ? Math.max(35, ord.progress || 50)
              : 0;
          return { ...ord, status: newStatus, progress };
        }
        return ord;
      })
    );

    // 2. Synchronize machine fleet hardware rig status
    setFleet((prev) =>
      prev.map((rig) => {
        if (rig.currentOrder === orderId) {
          if (newStatus === "DISPATCHED") {
            return {
              ...rig,
              status: "IDLE",
              currentOrder: null,
              currentLayer: 0,
              totalLayers: 0,
              nozzleTemp: 23,
              targetNozzleTemp: 0,
              bedTemp: 22,
              targetBedTemp: 0,
            };
          } else if (newStatus === "POST_PROCESSING") {
            return {
              ...rig,
              currentLayer: rig.totalLayers,
              nozzleTemp: 26,
              targetNozzleTemp: 0,
            };
          } else if (newStatus === "PRINTING") {
            return {
              ...rig,
              status: "ACTIVE",
              nozzleTemp: rig.type === "SLA" ? 0 : 255,
              targetNozzleTemp: rig.type === "SLA" ? 0 : 255,
              bedTemp: rig.type === "SLA" ? 35 : 65,
              targetBedTemp: rig.type === "SLA" ? 35 : 65,
            };
          }
        }
        return rig;
      })
    );
  };

  // Restock inventory item
  const handleRestockInventory = (itemId) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, remainingGrams: 1000 } : item))
    );
  };

  // Emergency stop: halts all rigs into IDLE standby
  const handleEmergencyStop = () => {
    setFleet((prev) =>
      prev.map((rig) => ({
        ...rig,
        status: "IDLE",
        nozzleTemp: 24,
        targetNozzleTemp: 0,
        bedTemp: 22,
        targetBedTemp: 0,
      }))
    );
  };

  // Route state initialized from window.location.hash / pathname
  const getRoute = () => {
    const hash = window.location.hash || "";
    const path = window.location.pathname || "";
    if (hash.startsWith("#/track") || hash.startsWith("#track") || path.startsWith("/track")) {
      return "track";
    }
    if (
      hash.startsWith("#/admin") ||
      hash.startsWith("#admin") ||
      hash.startsWith("#/operator") ||
      hash.startsWith("#operator") ||
      path.startsWith("/admin") ||
      path.startsWith("/operator")
    ) {
      return "admin";
    }
    return "home";
  };

  const [currentRoute, setCurrentRoute] = useState(getRoute);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getRoute());
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const navigateToHome = () => {
    window.location.hash = "#/";
    setCurrentRoute("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Standalone Route 1: Order Tracking Page
  if (currentRoute === "track") {
    return <TrackPage onBack={navigateToHome} />;
  }

  // Standalone Route 2: Operator & Admin Console (Only Accessible via URL #/admin or /admin)
  if (currentRoute === "admin") {
    return (
      <AdminPage
        fleet={fleet}
        orders={orders}
        inventory={inventory}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onRestockInventory={handleRestockInventory}
        onEmergencyStop={handleEmergencyStop}
        isAuthenticated={isAdminAuthenticated}
        onAuthenticate={handleAuthSuccess}
        onLogout={handleLockConsole}
        onBackToClient={navigateToHome}
      />
    );
  }

  const activeRigsCount = fleet.filter((r) => r.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#FF5A00] selection:text-white flex flex-col font-sans">
      {/* ═════════════════════════════════════════════════════════════════════
          TOP STICKY INDUSTRIAL COMMAND BAR (PUBLIC CLIENT INTERFACE)
      ═════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#161616]/95 backdrop-blur-md border-b border-[#333333] px-4 md:px-8 py-3 transition-colors">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left Side: Brand Identity & Telemetry Beacon */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="w-3.5 h-3.5 bg-[#FF5A00] rounded-[1px] flex-shrink-0 shadow-[0_0_8px_rgba(255,90,0,0.6)]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-black text-sm md:text-base tracking-wider text-white uppercase">
                  NEXUS // 3D FABRICATION
                </h1>
                <span className="font-mono text-[9px] text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/30 px-1.5 py-0.2 rounded-[1px] uppercase font-bold hidden md:inline">
                  PROD CORE v2.4
                </span>
                <span className="font-mono text-[9px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.2 rounded-[1px] uppercase font-bold hidden lg:inline flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
                  FLEET: {activeRigsCount}/{fleet.length} ACTIVE
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider hidden sm:block">
                INDUSTRIAL ADDITIVE MANUFACTURING &amp; FLEET TELEMETRY
              </p>
            </div>
          </div>

          {/* Center: In-Page Section Jump Shortcuts */}
          <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono text-[#A1A1AA]">
            <button
              type="button"
              onClick={() => handleScrollTo("user-panel")}
              className="hover:text-white px-2 py-1 rounded-[1px] hover:bg-[#222222] transition-colors cursor-pointer"
            >
              // SLICER
            </button>
            <span className="text-[#333333]">•</span>
            <button
              type="button"
              onClick={() => handleScrollTo("popular-designs")}
              className="hover:text-white px-2 py-1 rounded-[1px] hover:bg-[#222222] transition-colors cursor-pointer"
            >
              // CURATED VAULT
            </button>
            <span className="text-[#333333]">•</span>
            <button
              type="button"
              onClick={() => handleScrollTo("materials-section")}
              className="hover:text-white px-2 py-1 rounded-[1px] hover:bg-[#222222] transition-colors cursor-pointer"
            >
              // MATERIALS MATRIX
            </button>
          </div>

          {/* Right Side: Quick Search, Sound, Clock & Order Tracking Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Quick Command Trigger */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsCommandOpen(true);
              }}
              className="font-mono text-xs text-[#A1A1AA] hover:text-white bg-[#111111] hover:bg-[#222222] border border-[#333333] px-2.5 py-1.5 rounded-[1px] flex items-center gap-2 transition-colors cursor-pointer"
              title="Quick Search & Actions (⌘K)"
            >
              <span>🔍 SEARCH</span>
              <kbd className="text-[9px] bg-[#1a1a1a] text-[#71717A] px-1 rounded-[1px] border border-[#2a2a2a] hidden md:inline">
                ⌘K
              </kbd>
            </button>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`font-mono text-xs px-2 py-1.5 rounded-[1px] border transition-colors cursor-pointer ${
                isMuted
                  ? "border-[#333333] text-[#71717A] bg-[#111111]"
                  : "border-[#FF5A00]/40 text-[#FF5A00] bg-[#FF5A00]/10"
              }`}
              title={isMuted ? "Enable Synthetic Industrial Audio" : "Mute Sound Effects"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>

            {/* Live Clock */}
            {timeString && (
              <span className="font-mono text-[11px] text-[#A1A1AA] bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px] hidden md:inline">
                {timeString}
              </span>
            )}

            {/* Public Client Order Tracker Link */}
            <button
              type="button"
              id="btn-header-track"
              onClick={() => {
                sound.playClick();
                window.location.hash = "#/track";
              }}
              className="font-mono text-xs md:text-[13px] px-3.5 py-1.5 rounded-[1px] border border-[#333333] bg-[#111111] hover:bg-[#222222] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer uppercase tracking-wider font-semibold flex items-center gap-1.5"
              title="Track Active Fabrication Order by ID"
            >
              <span>📦</span>
              <span>[ TRACK ORDER ]</span>
            </button>

            {/* If Operator has an active session, show discreet return badge */}
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  window.location.hash = "#/admin";
                }}
                className="font-mono text-xs px-2.5 py-1.5 rounded-[1px] border border-[#FF5A00]/40 bg-[#FF5A00]/10 text-[#FF5A00] hover:bg-[#FF5A00] hover:text-black transition-colors cursor-pointer font-bold uppercase flex items-center gap-1"
                title="Return to Active Operator Console"
              >
                <span>⚡ OPERATOR CONSOLE</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          CLIENT PRODUCTION WORKSPACE (HOME ROUTE)
      ═════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12">
        {/* Executive Overview Header */}
        <ExecutiveHero fleet={fleet} onScrollTo={handleScrollTo} />

        {/* Client Production Panel */}
        <UserPanel orders={orders} onNewOrder={handleNewOrder} loadedDesign={loadedDesign} />

        {/* Curated 3D Print Benchmark Vault */}
        <PopularDesignsSection onLoadDesign={handleLoadDesign} onDirectDispatch={handleNewOrder} />

        {/* Polymer & Resin Specification Matrix */}
        <MaterialsSection />
      </main>

      {/* ═════════════════════════════════════════════════════════════════════
          PERSISTENT INDUSTRIAL TECHNICAL FOOTER STRIP
      ═════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#333333] bg-[#141414] py-6 px-4 sm:px-6 lg:px-8 font-mono text-[12px] text-[#A1A1AA]">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Manufacturing Tolerances & Standards */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00] animate-pulse" />
              <span>
                TOLERANCES: <strong className="text-white">±0.15 MM (FDM)</strong> •{" "}
                <strong className="text-white">±0.05 MM (SLA)</strong>
              </span>
            </div>

            <span className="text-[#333333] hidden sm:inline">|</span>

            <div>
              <span>
                STANDARD REFERENCE: <strong className="text-white">ISO/ASTM 52900</strong> // ADDITIVE
                MANUFACTURING GENERAL PRINCIPLES
              </span>
            </div>
          </div>

          {/* Right: Legal Copyright */}
          <div className="text-center md:text-right text-[#71717A] text-[11px] md:text-[12px]">
            <span>© 2026 NEXUS // 3D INDUSTRIAL FABRICATION CORP. ALL RIGHTS RESERVED.</span>
          </div>
        </div>
      </footer>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        orders={orders}
        isAdminAuthenticated={isAdminAuthenticated}
        onSelectOrder={(_orderId) => {
          handleScrollTo("user-panel");
        }}
        onSelectDesign={(design) => handleLoadDesign(design)}
        onScrollTo={handleScrollTo}
        onTrack={() => {
          sound.playClick();
          window.location.hash = "#/track";
        }}
      />
    </div>
  );
}

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
import AdminPanel from "./components/AdminPanel";
import TrackPage from "./pages/TrackPage";
import { INITIAL_ORDERS, INITIAL_FLEET, INITIAL_INVENTORY } from "./data/mockData";

export default function App() {
  // Centralized Synchronized State
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [currentView, setCurrentView] = useState("USER"); // "USER" | "ADMIN"

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
      const candidateRig = prev.find((r) => r.type === (isSLA ? "SLA" : "FDM") && r.status === "IDLE") || prev[0];
      return prev.map((rig) => {
        if (rig.id === candidateRig.id) {
          return {
            ...rig,
            status: "ACTIVE",
            currentOrder: newOrder.id,
            currentLayer: 1,
            totalLayers: Math.round((newOrder.dimensions?.z || 38) / (newOrder.layerHeight || 0.16)),
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
            // Machine job completed; rig transitions to IDLE standby ready for next job
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

  // Route state initialized from window.location.hash for standalone tracking deep-linking
  const [currentRoute, setCurrentRoute] = useState(() => {
    const hash = window.location.hash;
    return hash.startsWith("#/track") || hash.startsWith("#track") ? "track" : "home";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/track") || hash.startsWith("#track")) {
        setCurrentRoute("track");
      } else {
        setCurrentRoute("home");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateToHome = () => {
    window.location.hash = "#/";
    setCurrentRoute("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If on track route, render the standalone Track Application Page
  if (currentRoute === "track") {
    return <TrackPage onBack={navigateToHome} />;
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#FF5A00] selection:text-white flex flex-col font-sans">
      {/* ═════════════════════════════════════════════════════════════════════
          3. TOP STICKY COMMAND BAR
      ═════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#161616]/95 backdrop-blur-md border-b border-[#333333] px-4 md:px-8 py-3.5 transition-colors">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left Side: Brand Identity */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="w-3.5 h-3.5 bg-[#FF5A00] rounded-[1px] flex-shrink-0 shadow-[0_0_8px_rgba(255,90,0,0.5)]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-bold text-sm md:text-base tracking-wider text-white uppercase">
                  NEXUS // 3D FABRICATION
                </h1>
                <span className="font-mono text-[9px] text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/30 px-1.5 py-0.5 rounded-[1px] uppercase font-bold hidden md:inline">
                  PROD CORE v2.4
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider hidden sm:block">
                INDUSTRIAL ADDITIVE MANUFACTURING &amp; FLEET TELEMETRY
              </p>
            </div>
          </div>

          {/* Right Side: Global View Switcher Segmented Control */}
          <nav
            aria-label="Global Console View Switcher"
            className="flex items-center gap-1.5 bg-[#111111] border border-[#333333] p-1 rounded-[1px] self-end sm:self-auto"
          >
            <button
              type="button"
              id="btn-view-client"
              onClick={() => setCurrentView("USER")}
              className={`font-mono text-xs md:text-[13px] px-3.5 py-1.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
                currentView === "USER"
                  ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold shadow-sm"
                  : "border-transparent text-[#A1A1AA] hover:text-white hover:border-[#555555]"
              }`}
            >
              [ CLIENT INTERFACE ]
            </button>

            <button
              type="button"
              id="btn-view-operator"
              onClick={() => setCurrentView("ADMIN")}
              className={`font-mono text-xs md:text-[13px] px-3.5 py-1.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
                currentView === "ADMIN"
                  ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold shadow-sm"
                  : "border-transparent text-[#A1A1AA] hover:text-white hover:border-[#555555]"
              }`}
            >
              [ OPERATOR CONSOLE ]
            </button>
          </nav>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          4. DYNAMIC MAIN WORKSPACE
      ═════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className={currentView === "USER" ? "block" : "hidden"}>
          <UserPanel orders={orders} onNewOrder={handleNewOrder} />
        </div>

        <div className={currentView === "ADMIN" ? "block" : "hidden"}>
          <AdminPanel
            fleet={fleet}
            orders={orders}
            inventory={inventory}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════════
          4. PERSISTENT INDUSTRIAL TECHNICAL FOOTER STRIP
      ═════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#333333] bg-[#141414] py-6 px-4 sm:px-6 lg:px-8 font-mono text-[12px] text-[#A1A1AA]">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Manufacturing Tolerances & Standards */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00] animate-pulse" />
              <span>
                TOLERANCES: <strong className="text-white">±0.15 MM (FDM)</strong> • <strong className="text-white">±0.05 MM (SLA)</strong>
              </span>
            </div>

            <span className="text-[#333333] hidden sm:inline">|</span>

            <div>
              <span>
                STANDARD REFERENCE: <strong className="text-white">ISO/ASTM 52900</strong> // ADDITIVE MANUFACTURING GENERAL PRINCIPLES
              </span>
            </div>
          </div>

          {/* Right: Legal Copyright */}
          <div className="text-center md:text-right text-[#71717A] text-[11px] md:text-[12px]">
            <span>© 2026 NEXUS // 3D INDUSTRIAL FABRICATION CORP. ALL RIGHTS RESERVED.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

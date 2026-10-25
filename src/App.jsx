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

import { useState, useEffect, useRef, useCallback } from "react";
import HeroSection from "./components/sections/HeroSection";
import UserPanel from "./components/UserPanel";
import ExecutiveHero from "./components/sections/ExecutiveHero";
import PopularDesignsSection from "./components/sections/PopularDesignsSection";
import { POPULAR_DESIGNS } from "./data/popularDesigns";
import MaterialsSection from "./components/sections/MaterialsSection";
import TrackPage from "./pages/TrackPage";
import AdminPage from "./pages/AdminPage";
import CommandPalette from "./components/ui/CommandPalette";
import MobileNav from "./components/layout/MobileNav";
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
  const loadSeqRef = useRef(1);

  // Operator Authorization Clearance State (Persisted in sessionStorage)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem("nexus_operator_authenticated") === "true";
    } catch {
      return false;
    }
  });

  // Command Palette State
  const [isCommandOpen, setIsCommandOpen] = useState(false);



  // Scroll progress & FAB visibility
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFab, setShowFab] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    setScrollProgress(progress);
    setShowFab(scrollTop > window.innerHeight * 0.75);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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

  const handleScrollTo = (elementId) => {
    if (currentRoute !== "home") {
      navigateToHome();
    }
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  const handleLoadDesign = (design) => {
    sound.playClick();
    loadSeqRef.current += 1;
    setLoadedDesign({ ...design, _loadSeq: loadSeqRef.current });
    if (currentRoute !== "home") {
      navigateToHome();
    }
    setTimeout(() => {
      const target = document.getElementById("slicer-3d-viewport") || document.getElementById("user-panel");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
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
        if (ord.id === orderId || ord.trackingId === orderId) {
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

  const [activeSection, setActiveSection] = useState("slicer");

  // Track active section for top header & mobile nav highlights
  useEffect(() => {
    if (currentRoute !== "home") return;

    const sections = [
      { id: "slicer", el: document.getElementById("user-panel") },
      { id: "vault", el: document.getElementById("popular-designs") },
      { id: "materials", el: document.getElementById("materials-section") },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const found = sections.find((s) => s.el === entry.target);
            if (found) setActiveSection(found.id);
          }
        });
      },
      { threshold: 0.2, rootMargin: "-10% 0px -40% 0px" }
    );

    sections.forEach(({ el }) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentRoute]);

  // Standalone Route 1: Order Tracking Page (With smooth route transition)
  if (currentRoute === "track") {
    return (
      <div key="track-route" className="animate-fade-in">
        <TrackPage onBack={navigateToHome} />
      </div>
    );
  }

  // Standalone Route 2: Operator & Admin Console (With smooth route transition)
  if (currentRoute === "admin") {
    return (
      <div key="admin-route" className="animate-fade-in">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#FF5A00] selection:text-white flex flex-col font-sans pb-16 md:pb-0">
      {/* ═══════════════ SCROLL PROGRESS BAR ═══════════════ */}
      <div
        className="scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />
      {/* ═════════════════════════════════════════════════════════════════════
          TOP STICKY INDUSTRIAL COMMAND BAR (PUBLIC CLIENT INTERFACE)
      ═════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#161616]/95 backdrop-blur-md border-b border-[#333333] px-4 md:px-8 py-3.5 transition-colors" style={{ boxShadow: "0 1px 0 rgba(255,90,0,0.08), 0 4px 24px rgba(0,0,0,0.6)" }}>
        {/* Top accent glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF5A00]/40 to-transparent pointer-events-none" />
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Left Side: Brand Identity */}
          <div
            onClick={navigateToHome}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <span className="w-3 h-3 bg-[#FF5A00] rounded-[1px] flex-shrink-0 shadow-[0_0_8px_rgba(255,90,0,0.6)] group-hover:scale-110 transition-transform" />
            <h1 className="font-sans font-black text-sm md:text-base tracking-wider text-white uppercase group-hover:text-[#FF5A00] transition-colors">
              NEXUS 3D
            </h1>
          </div>

          {/* Center: In-Page Section Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono tracking-wider">
            <button
              type="button"
              onClick={() => handleScrollTo("user-panel")}
              className={`transition-colors cursor-pointer py-1 ${
                activeSection === "slicer"
                  ? "text-[#FF5A00] font-bold border-b border-[#FF5A00]"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              SLICER
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo("popular-designs")}
              className={`transition-colors cursor-pointer py-1 ${
                activeSection === "vault"
                  ? "text-[#FF5A00] font-bold border-b border-[#FF5A00]"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              CATALOG
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo("materials-section")}
              className={`transition-colors cursor-pointer py-1 ${
                activeSection === "materials"
                  ? "text-[#FF5A00] font-bold border-b border-[#FF5A00]"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              MATERIALS
            </button>
          </nav>

          {/* Right Side: Essential Actions */}
          <div className="flex items-center gap-3">
            {/* Public Client Order Tracker Link */}
            <button
              type="button"
              id="btn-header-track"
              onClick={() => {
                sound.playClick();
                window.location.hash = "#/track";
              }}
              className="font-mono text-xs px-3.5 py-1.5 rounded-[1px] border border-[#333333] hover:border-[#FF5A00] bg-[#111111] hover:bg-[#222222] text-white transition-colors cursor-pointer uppercase tracking-wider font-semibold flex items-center gap-1.5"
              title="Track Active Fabrication Order by ID"
            >
              <span>📦</span>
              <span>TRACK ORDER</span>
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
                <span>⚡ OPERATOR</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          CLIENT PRODUCTION WORKSPACE (HOME ROUTE)
      ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. Grand Atmospheric Three.js WebGL 3D Hero Landing Section */}
      <HeroSection
        onNavigateTrack={() => {
          sound.playClick();
          window.location.hash = "#/track";
        }}
        onScrollTo={handleScrollTo}
        hideNav={true}
      />

      {/* 2. Client Production Workspace & Catalog Modules */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Executive Overview Header */}
        <section className="reveal-init is-revealed mb-12">
          <ExecutiveHero fleet={fleet} onScrollTo={handleScrollTo} />
        </section>

        <div className="section-divider my-10" aria-hidden="true" />

        {/* Client Production Panel */}
        <section className="reveal-init is-revealed stagger-1 mb-12">
          <UserPanel orders={orders} onNewOrder={handleNewOrder} loadedDesign={loadedDesign} />
        </section>

        <div className="section-divider my-10" aria-hidden="true" />

        {/* Curated 3D Print Benchmark Vault */}
        <section className="reveal-init is-revealed stagger-2 mb-12">
          <PopularDesignsSection onLoadDesign={handleLoadDesign} onDirectDispatch={handleNewOrder} />
        </section>

        <div className="section-divider my-10" aria-hidden="true" />

        {/* Polymer & Resin Specification Matrix */}
        <section className="reveal-init is-revealed stagger-3 mb-4">
          <MaterialsSection />
        </section>
      </main>

      {/* ═════════════════════════════════════════════════════════════════════
          PERSISTENT INDUSTRIAL TECHNICAL FOOTER STRIP
      ═════════════════════════════════════════════════════════════════════ */}
      <footer className="relative border-t border-[#333333] bg-[#141414] py-8 px-4 sm:px-6 lg:px-8 font-mono text-[12px] text-[#A1A1AA]">
        {/* Accent glow line at top of footer */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF5A00]/30 to-transparent pointer-events-none" />
        <div className="max-w-[1440px] mx-auto flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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

            {/* Right: Technical Documentation & Github Links */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#71717A]">
              <a
                href="https://github.com/kuntalmanii/3d-printing-web"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FF5A00] transition-colors"
              >
                [ GITHUB REPOSITORY ↗ ]
              </a>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleScrollTo("materials-section")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                [ ISO 9001:2015 AUDITED ]
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsCommandOpen(true);
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                [ SYSTEM API TELEMETRY ]
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between text-[#71717A] text-[11px]">
            <span>© 2026 NEXUS // 3D INDUSTRIAL FABRICATION CORP. ALL RIGHTS RESERVED.</span>
            <span className="text-[10px] text-[#555555]">PROD RIG ARCHITECTURE: AUSTIN HUB-01 • LATENCY &lt; 14MS</span>
          </div>
        </div>
      </footer>

      {/* Mobile Persistent Bottom Command Bar */}
      <MobileNav
        activeSection={activeSection}
        onScrollTo={handleScrollTo}
        onNavigateTrack={() => {
          sound.playClick();
          window.location.hash = "#/track";
        }}
      />

      {/* Floating FAB — Instant Quote shortcut (visible after scrolling past hero) */}
      {showFab && (
        <div className="fab-quote">
          <button
            type="button"
            id="fab-instant-quote"
            onClick={() => {
              sound.playClick();
              handleScrollTo("user-panel");
            }}
            className="
              flex items-center gap-2
              bg-[#FF5A00] hover:bg-[#D94D00]
              text-black font-mono text-[10px] font-bold tracking-[0.12em] uppercase
              px-4 py-2.5 rounded-[2px]
              shadow-[0_0_24px_rgba(255,90,0,0.55),0_4px_16px_rgba(0,0,0,0.6)]
              hover:shadow-[0_0_36px_rgba(255,90,0,0.75),0_6px_20px_rgba(0,0,0,0.7)]
              transition-all duration-200 active:scale-[0.96] cursor-pointer
              border border-[#FF7A29]/60
            "
            aria-label="Jump to Instant Quote"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M6 1L11 6H7.5V11H4.5V6H1L6 1Z" />
            </svg>
            INSTANT QUOTE
          </button>
        </div>
      )}

      {/* Global Command Palette Modal */}
      {isCommandOpen && (
        <CommandPalette
          isOpen={isCommandOpen}
          onClose={() => setIsCommandOpen(false)}
          orders={orders}
          isAdminAuthenticated={isAdminAuthenticated}
          onSelectOrder={(_orderId) => {
            handleScrollTo("user-panel");
          }}
          popularDesigns={POPULAR_DESIGNS}
          onSelectDesign={(design) => handleLoadDesign(design)}
          onScrollTo={handleScrollTo}
          onTrack={() => {
            sound.playClick();
            window.location.hash = "#/track";
          }}
        />
      )}
    </div>
  );
}

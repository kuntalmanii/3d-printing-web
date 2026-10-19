import { useState, useEffect } from "react";
import HeroSection from "./components/sections/HeroSection";
import ModelUploader from "./components/sections/ModelUploader";
import QuoteCalculator from "./components/sections/QuoteCalculator";
import MaterialsSection from "./components/sections/MaterialsSection";
import UserPanel from "./components/UserPanel";
import AdminPanel from "./components/AdminPanel";
import TrackPage from "./pages/TrackPage";
import { useModelParser } from "./hooks/useModelParser";
import { INITIAL_ORDERS, INITIAL_FLEET, INITIAL_INVENTORY } from "./data/mockData";

/**
 * Root App — Engineering dark mode additive manufacturing platform:
 *  - Route 'home': Complete platform console (User & Admin Panels, Hero, ModelUploader, Materials, QuoteCalculator)
 *  - Route 'track': Dedicated standalone Order Tracking application page
 */
export default function App() {
  const modelParser = useModelParser();
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [consoleMode, setConsoleMode] = useState("user"); // "user" | "admin"

  const handleNewOrder = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
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
  };

  // Route state initialized from window.location.hash
  const [currentRoute, setCurrentRoute] = useState(() => {
    const hash = window.location.hash;
    return hash.startsWith("#/track") || hash.startsWith("#track") ? "track" : "home";
  });

  // Listen to hash changes (browser back/forward, links, etc.)
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

  const navigateToTrack = (trackingId) => {
    const target = trackingId ? `#/track?id=${trackingId}` : "#/track";
    window.location.hash = target;
    setCurrentRoute("track");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If on track route, render the dedicated Track Application Page
  if (currentRoute === "track") {
    return <TrackPage onBack={navigateToHome} />;
  }

  // Default: Render the main additive manufacturing platform console
  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#FF5A00] selection:text-black">
      <HeroSection onNavigateTrack={navigateToTrack} />

      {/* Production Interactive Console Section (User vs Admin Mode) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        {/* Console Mode Switcher */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full bg-[#FF5A00] animate-pulse" />
            <span className="uppercase tracking-wider">ACTIVE CONSOLE INTERFACE:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-mode-user"
              onClick={() => setConsoleMode("user")}
              className={`font-mono text-xs px-3.5 py-1.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
                consoleMode === "user"
                  ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                  : "bg-[#181818] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
              }`}
            >
              [ CLIENT USER PANEL ]
            </button>
            <button
              type="button"
              id="btn-mode-admin"
              onClick={() => setConsoleMode("admin")}
              className={`font-mono text-xs px-3.5 py-1.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
                consoleMode === "admin"
                  ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                  : "bg-[#181818] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
              }`}
            >
              [ OPERATOR / ADMIN CONSOLE ]
            </button>
          </div>
        </div>

        {/* Dynamic Console Component Rendering */}
        {consoleMode === "user" ? (
          <UserPanel orders={orders} onNewOrder={handleNewOrder} />
        ) : (
          <AdminPanel
            fleet={INITIAL_FLEET}
            orders={orders}
            inventory={INITIAL_INVENTORY}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}
      </div>

      <ModelUploader parser={modelParser} />
      <MaterialsSection />
      <QuoteCalculator modelMetrics={modelParser} onNavigateTrack={navigateToTrack} />
    </div>
  );
}

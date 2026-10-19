import { useState, useEffect } from "react";
import HeroSection from "./components/sections/HeroSection";
import ModelUploader from "./components/sections/ModelUploader";
import QuoteCalculator from "./components/sections/QuoteCalculator";
import MaterialsSection from "./components/sections/MaterialsSection";
import UserPanel from "./components/UserPanel";
import TrackPage from "./pages/TrackPage";
import { useModelParser } from "./hooks/useModelParser";
import { INITIAL_ORDERS } from "./data/mockData";

/**
 * Root App — Engineering dark mode additive manufacturing platform:
 *  - Route 'home': Complete platform console (Hero, UserPanel, ModelUploader, Materials, QuoteCalculator)
 *  - Route 'track': Dedicated standalone Order Tracking application page
 */
export default function App() {
  const modelParser = useModelParser();
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  const handleNewOrder = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
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

      {/* Production Client User Panel */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <UserPanel orders={orders} onNewOrder={handleNewOrder} />
      </div>

      <ModelUploader parser={modelParser} />
      <MaterialsSection />
      <QuoteCalculator modelMetrics={modelParser} onNavigateTrack={navigateToTrack} />
    </div>
  );
}

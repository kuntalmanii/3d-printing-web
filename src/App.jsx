import HeroSection from "./components/sections/HeroSection";
import ModelUploader from "./components/sections/ModelUploader";
import QuoteCalculator from "./components/sections/QuoteCalculator";
import MaterialsSection from "./components/sections/MaterialsSection";
import OrderTracker from "./components/sections/OrderTracker";
import { useModelParser } from "./hooks/useModelParser";

/**
 * Root App — Engineering dark mode additive manufacturing platform:
 *  - HeroSection: Ambient Three.js toolpath & isometric fleet telemetry
 *  - ModelUploader: Interactive client-side STL/OBJ ingestion, bounding box extraction & 3D viewer
 *  - MaterialsSection: Comprehensive polymer & resin matrix with QA standards
 *  - QuoteCalculator: Real-time pricing calculator coupled directly to extracted mesh metrics
 *  - OrderTracker: Customer-facing real-time 5-step fabrication tracker & telemetry dashboard
 */
export default function App() {
  const modelParser = useModelParser();

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#FF5A00] selection:text-black">
      <HeroSection />
      <ModelUploader parser={modelParser} />
      <MaterialsSection />
      <QuoteCalculator modelMetrics={modelParser} />
      <OrderTracker />
    </div>
  );
}

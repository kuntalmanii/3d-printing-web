import HeroSection from "./components/sections/HeroSection";
import ModelUploader from "./components/sections/ModelUploader";
import QuoteCalculator from "./components/sections/QuoteCalculator";
import { useModelParser } from "./hooks/useModelParser";

/**
 * Root App — Engineering dark mode additive manufacturing platform:
 *  - HeroSection: Ambient Three.js toolpath & isometric fleet telemetry
 *  - ModelUploader: Interactive client-side STL/OBJ ingestion, bounding box extraction & 3D viewer
 *  - QuoteCalculator: Real-time pricing calculator coupled directly to extracted mesh metrics
 */
export default function App() {
  const modelParser = useModelParser();

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-[#FF5A00] selection:text-black">
      <HeroSection />
      <ModelUploader parser={modelParser} />
      <QuoteCalculator modelMetrics={modelParser} />
    </div>
  );
}

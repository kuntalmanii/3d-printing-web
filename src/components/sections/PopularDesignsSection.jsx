/**
 * src/components/sections/PopularDesignsSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Curated 3D Print Vault & Verified Benchmark Showcase
 *
 * Design Framework Specifications:
 *  - Colors:      #FF5A00 (Primary accent), #111111 (Dark base), #161616 (Card base), #333333 (Borders)
 *  - Radii:       Strict 1px corner radii on cards, images, and buttons
 *  - Typography:  Inter (headers & descriptions), JetBrains Mono (metrics, telemetry, badges)
 *  - Currency:    INR (₹ - Indian Rupee)
 *
 * Capabilities:
 *  - Category filtering (All, Calibration, Mechanisms, Aerospace, Biomedical & Kinetic)
 *  - High-res macro 3D print photography
 *  - Detailed engineering specifications (Dimensions, Volume, Polygon count, Machine time, Material)
 *  - One-click [ LOAD INTO SLICER & QUOTE ] and [ INSTANT QUEUE DISPATCH ]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from "react";
import { formatINR } from "../../data/mockData";

// Import local generated high-resolution assets
import benchyImg from "../../assets/popular/benchy.jpg";
import planetaryImg from "../../assets/popular/planetary_gearbox.jpg";
import dragonImg from "../../assets/popular/articulated_dragon.jpg";
import turbofanImg from "../../assets/popular/turbofan_bracket.jpg";
import cranialImg from "../../assets/popular/cranial_mesh.jpg";
import gyroImg from "../../assets/popular/kinetic_gyroscope.jpg";

const POPULAR_DESIGNS = [
  {
    id: "POP-01",
    title: "3DBenchy Nautical Benchmark",
    category: "CALIBRATION & BENCHMARKS",
    filename: "3D_Benchy_Calibration_v3.stl",
    sizeMB: 2.85,
    dimensions: { x: 60.0, y: 31.0, z: 48.0 },
    volumeCm3: 15.5,
    facetCount: 225154,
    technology: "FDM",
    recommendedMaterial: "PLA+ High Speed",
    recommendedMaterialId: "pla-speed",
    printTime: "45m",
    price: 450,
    image: benchyImg,
    description:
      "The undisputed gold standard additive calibration artifact. Tests dimensional accuracy, steep hull overhangs, chimney bridging, and multi-plane cooling.",
    tags: ["0.12mm DETAIL", "TOROID BRIDGING", "ZERO SUPPORT"],
  },
  {
    id: "POP-02",
    title: "Dual-Stage Planetary Gearbox",
    category: "MECHANICAL ASSEMBLIES",
    filename: "planetary_reduction_gearbox_v4.stl",
    sizeMB: 5.42,
    dimensions: { x: 85.0, y: 85.0, z: 42.0 },
    volumeCm3: 62.0,
    facetCount: 412890,
    technology: "FDM",
    recommendedMaterial: "PA-CF (Carbon Nylon)",
    recommendedMaterialId: "pa-cf",
    printTime: "3h 15m",
    price: 2450,
    image: planetaryImg,
    description:
      "Precision print-in-place epicyclic gear train with 4:1 torque amplification. Features self-lubricating involute gear teeth and hardened steel shaft collar seats.",
    tags: ["PRINT-IN-PLACE", "±0.15mm TOLERANCE", "HIGH TORQUE"],
  },
  {
    id: "POP-03",
    title: "Generative Turbofan Drone Arm",
    category: "AEROSPACE & ROBOTICS",
    filename: "aerospace_turbofan_cowling_v2.stl",
    sizeMB: 7.15,
    dimensions: { x: 145.0, y: 92.0, z: 55.0 },
    volumeCm3: 78.4,
    facetCount: 580240,
    technology: "FDM",
    recommendedMaterial: "PA-CF (Carbon Nylon)",
    recommendedMaterialId: "pa-cf",
    printTime: "4h 30m",
    price: 3850,
    image: turbofanImg,
    description:
      "Topology-optimized aeronautical mount engineered with generative load paths. Reduces structural mass by 42% while retaining 115 MPa tensile yield.",
    tags: ["FEA OPTIMIZED", "PA-CF REINFORCED", "AS9100D READY"],
  },
  {
    id: "POP-04",
    title: "Articulated Imperial Dragon",
    category: "BIOMEDICAL & KINETIC",
    filename: "articulated_spine_dragon_v6.stl",
    sizeMB: 4.88,
    dimensions: { x: 210.0, y: 65.0, z: 32.0 },
    volumeCm3: 52.0,
    facetCount: 348700,
    technology: "FDM",
    recommendedMaterial: "PETG Industrial",
    recommendedMaterialId: "petg",
    printTime: "2h 50m",
    price: 1850,
    image: dragonImg,
    description:
      "Interlocking print-in-place ball-and-socket spine with 34 free-moving segments. Dual-color extrusion with zero auxiliary support detachment necessary.",
    tags: ["PRINT-IN-PLACE", "34 LINKAGES", "HIGH FLEXIBILITY"],
  },
  {
    id: "POP-05",
    title: "Micro-Lattice Cranial Prosthetic",
    category: "BIOMEDICAL & KINETIC",
    filename: "biocompatible_cranial_mesh_v1.stl",
    sizeMB: 8.92,
    dimensions: { x: 110.0, y: 95.0, z: 68.0 },
    volumeCm3: 28.6,
    facetCount: 712400,
    technology: "SLA",
    recommendedMaterial: "Tough 2000 Resin",
    recommendedMaterialId: "resin-tough",
    printTime: "2h 10m",
    price: 3200,
    image: cranialImg,
    description:
      "SLA photopolymer micro-lattice implant prototype with 300μm osteoconductive pore geometry. Liquid-tight sterile resin with ±0.05mm dimensional conformance.",
    tags: ["MICRONIC SLA", "ISO 10993 COMPLIANT", "300μm LATTICE"],
  },
  {
    id: "POP-06",
    title: "Triple-Axis Gimbal Kinetic Gyroscope",
    category: "MECHANICAL ASSEMBLIES",
    filename: "triple_gimbal_gyroscope_v3.stl",
    sizeMB: 6.30,
    dimensions: { x: 125.0, y: 125.0, z: 110.0 },
    volumeCm3: 85.0,
    facetCount: 490120,
    technology: "FDM",
    recommendedMaterial: "PETG Industrial",
    recommendedMaterialId: "petg",
    printTime: "3h 40m",
    price: 2650,
    image: gyroImg,
    description:
      "Concentric triple-axis gimbal suspension exhibiting 360° rotational freedom. Balanced inertial core mounted via sealed precision micro-bearings.",
    tags: ["3-AXIS GIMBAL", "LOW COEFFICIENT", "ROTATIONAL INERTIA"],
  },
];

const CATEGORIES = [
  "ALL DESIGNS",
  "CALIBRATION & BENCHMARKS",
  "MECHANICAL ASSEMBLIES",
  "AEROSPACE & ROBOTICS",
  "BIOMEDICAL & KINETIC",
];

export default function PopularDesignsSection({ onLoadDesign, onDirectDispatch }) {
  const [selectedCategory, setSelectedCategory] = useState("ALL DESIGNS");
  const [dispatchedId, setDispatchedId] = useState(null);

  // Filtered designs
  const filteredDesigns = useMemo(() => {
    if (selectedCategory === "ALL DESIGNS") return POPULAR_DESIGNS;
    return POPULAR_DESIGNS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  const handleInstantDispatch = (design) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderPayload = {
      id: `NX-${randomSuffix}`,
      client: "Benchmark Vault Direct",
      filename: design.filename,
      volumeCm3: design.volumeCm3,
      dimensions: design.dimensions,
      technology: design.technology,
      material: design.recommendedMaterial,
      infill: 40,
      layerHeight: design.technology === "SLA" ? 0.08 : 0.16,
      status: "QUEUED",
      assignedPrinter: design.technology === "SLA" ? "RIG-02" : "RIG-04",
      progress: 0,
      estimatedTime: design.printTime,
      price: design.price,
      createdAt: new Date().toISOString(),
    };

    if (onDirectDispatch) {
      onDirectDispatch(orderPayload);
    }

    setDispatchedId(design.id);
    setTimeout(() => setDispatchedId(null), 3000);
  };

  return (
    <section
      id="popular-designs"
      className="bg-[#111111] text-white py-16 px-4 sm:px-6 lg:px-8 border-t border-[#333333] relative overflow-hidden"
      aria-label="Popular 3D Print Showcase"
    >
      {/* Background Subtle Technical Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, #333333 1px, transparent 1px),
            linear-gradient(to bottom, #333333 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-[1440px] mx-auto relative z-10 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#262626] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 bg-[#FF5A00] rounded-[1px]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF5A00] font-bold">
                // 03. POPULAR ADDITIVE BENCHMARKS &amp; VERIFIED DESIGNS
              </span>
            </div>
            <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white uppercase">
              CURATED 3D PRINT VAULT
            </h2>
            <p className="font-sans text-sm text-[#A1A1AA] max-w-2xl mt-1.5 leading-relaxed">
              Pre-analyzed, tolerance-verified engineering models ready for immediate fleet fabrication.
              Load any geometry directly into the slicing configurator or dispatch instantly into the production queue.
            </p>
          </div>

          {/* Quick Counter */}
          <div className="font-mono text-xs bg-[#161616] border border-[#333333] px-4 py-2.5 rounded-[1px] flex items-center gap-3 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#A1A1AA]">BENCHMARK REPOSITORY:</span>
            <span className="text-white font-bold">{POPULAR_DESIGNS.length} MODELS VERIFIED</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`font-mono text-[11px] md:text-xs px-3.5 py-1.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
                  isSelected
                    ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                    : "bg-[#161616] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 6-Grid Popular Designs Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => {
            const isDispatched = dispatchedId === design.id;

            return (
              <div
                key={design.id}
                className="bg-[#141414] border border-[#333333] rounded-[1px] overflow-hidden flex flex-col justify-between group hover:border-[#FF5A00] transition-all duration-300 shadow-sm"
              >
                <div>
                  {/* High-Resolution Photography Container */}
                  <div className="relative aspect-square w-full overflow-hidden bg-[#0A0A0A] border-b border-[#262626]">
                    <img
                      src={design.image}
                      alt={design.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Gradient Overlay for Technical Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-transparent to-transparent pointer-events-none" />

                    {/* Top Badges: Technology & Model Code */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between font-mono text-[10px]">
                      <span className="bg-[#111111]/90 backdrop-blur-md text-[#FF5A00] border border-[#FF5A00]/40 px-2 py-0.5 rounded-[1px] font-bold uppercase">
                        [{design.technology}]
                      </span>
                      <span className="bg-[#111111]/90 backdrop-blur-md text-[#A1A1AA] border border-[#333333] px-2 py-0.5 rounded-[1px]">
                        {design.id}
                      </span>
                    </div>

                    {/* Bottom Image Overlay: Dimensions & Volume */}
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between font-mono text-[10px] text-white">
                      <span className="bg-[#111111]/90 border border-[#333333] px-2 py-0.5 rounded-[1px]">
                        {design.dimensions.x} × {design.dimensions.y} × {design.dimensions.z} mm
                      </span>
                      <span className="bg-[#FF5A00]/90 text-black font-bold px-2 py-0.5 rounded-[1px]">
                        {design.volumeCm3} cm³
                      </span>
                    </div>
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="p-5 space-y-4">
                    {/* Header: Title & Category */}
                    <div>
                      <span className="font-mono text-[9px] text-[#FF5A00] uppercase tracking-wider block font-semibold mb-1">
                        // {design.category}
                      </span>
                      <h3 className="font-sans font-bold text-lg text-white group-hover:text-[#FF5A00] transition-colors leading-snug">
                        {design.title}
                      </h3>
                      <p className="font-sans text-xs text-[#A1A1AA] mt-1.5 leading-relaxed line-clamp-2">
                        {design.description}
                      </p>
                    </div>

                    {/* Technical Specs 4-Pillar Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-[#111111] border border-[#222222] p-2.5 rounded-[1px] font-mono text-[10px]">
                      <div>
                        <span className="text-[#71717A] uppercase block">RECOMMENDED:</span>
                        <span className="text-white font-semibold truncate block mt-0.5">
                          {design.recommendedMaterial}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#71717A] uppercase block">EST. RUN TIME:</span>
                        <span className="text-[#FF5A00] font-bold block mt-0.5">
                          {design.printTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#71717A] uppercase block">FACET DENSITY:</span>
                        <span className="text-white block mt-0.5">
                          {design.facetCount.toLocaleString()} △
                        </span>
                      </div>
                      <div>
                        <span className="text-[#71717A] uppercase block">BASE PRICE:</span>
                        <span className="text-[#FF5A00] font-black text-xs block mt-0.5">
                          {formatINR(design.price)}
                        </span>
                      </div>
                    </div>

                    {/* Feature Micro-tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {design.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] bg-[#181818] text-[#888888] border border-[#262626] px-2 py-0.5 rounded-[1px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-5 pt-0 grid grid-cols-2 gap-2 border-t border-[#222222] mt-2 pt-4">
                  {/* Load into Slicer */}
                  <button
                    type="button"
                    onClick={() => onLoadDesign && onLoadDesign(design)}
                    className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white hover:text-[#FF5A00] border border-[#333333] hover:border-[#FF5A00] py-2.5 px-3 font-mono text-[10px] md:text-[11px] font-bold uppercase rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    title="Load model into Instant Slicing Configurator"
                  >
                    <span>[ LOAD SLICER ↗ ]</span>
                  </button>

                  {/* Instant Dispatch */}
                  <button
                    type="button"
                    onClick={() => handleInstantDispatch(design)}
                    className={`w-full py-2.5 px-3 font-mono text-[10px] md:text-[11px] font-bold uppercase rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 border ${
                      isDispatched
                        ? "bg-[#22C55E] text-black border-[#22C55E]"
                        : "bg-[#FF5A00] hover:bg-[#D94D00] text-black border-[#FF5A00]"
                    }`}
                    title="Transmit this pre-verified model immediately to fleet queue"
                  >
                    {isDispatched ? (
                      <span>✓ QUEUED</span>
                    ) : (
                      <span>[ DISPATCH — {formatINR(design.price)} ]</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

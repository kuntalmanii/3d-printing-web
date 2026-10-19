/**
 * QuoteCalculator.jsx
 * ───────────────────────────────────────────────────────────────
 * Responsive Pricing Calculator & Production Order Engine:
 *  - Coupled directly to client-side 3D model metrics (volume, height, bounding box)
 *  - High-density dual-column technical interface:
 *      * Left: 3D Model Preview & Architectural Geometry Summary
 *      * Right: Configurator Form (1px #333333 borders, #111111 background, #FFFFFF text)
 *  - Configuration Parameters:
 *      * Technology: Segmented control [ FDM (Filament) ] vs [ SLA (Resin) ]
 *      * Material Selector: PLA+ ($0.04/g), PETG ($0.05/g), ABS ($0.06/g), PA-CF ($0.12/g)
 *                          Resin Pro Grey ($0.08/g), Engineering Tough ($0.15/g)
 *      * Infill Density: Interactive slider (10% - 100%) with recommended usage callouts
 *      * Layer Height: [ 0.08mm Ultra Detail, 0.16mm Standard, 0.24mm Rapid Draft ]
 *      * Post-Processing: Support Removal (+$5), Vapor/UV Polish (+$10), Brass Inserts (+$8)
 *  - Exact Pricing Algorithm:
 *      TotalPrice = (MassGrams * MaterialCostPerGram * MaterialMarkupMultiplier)
 *                 + (EstimatedPrintHours * MachineHourlyRate)
 *                 + SetupFee + PostProcessingFees
 *  - Real-Time Output Panel:
 *      Background: #EAEAEA, text: #111111, radius: 1px
 *      Displays: Raw Mass, Production Duration, Dispatch Date (+2 business days), Total Price
 *      Action Button: "[ ADD TO PRODUCTION QUEUE ]" in #FF5A00
 */

import { useState, useMemo } from "react";
import {
  TECHNOLOGIES,
  LAYER_HEIGHTS,
  POST_PROCESSING_ADDONS,
  INFILL_PRESETS,
  PRICING_CONSTANTS,
  calculateQuote,
} from "../../utils/pricingCalculator";

export default function QuoteCalculator({ modelMetrics, onNavigateTrack }) {
  // Extract geometry metrics from modelMetrics prop with safe fallbacks
  const activeAnalysis = modelMetrics?.analysis;
  const fileName = modelMetrics?.fileName || "20mm_Calibration_Cube.stl";
  const volumeCm3 = activeAnalysis?.volumeCm3 ?? 8.0;
  const boundingBox = activeAnalysis?.boundingBox ?? { x: 20, y: 20, z: 20 };
  const surfaceArea = activeAnalysis?.surfaceArea ?? { areaCm2: 24.0, areaMm2: 2400 };
  const watertight = activeAnalysis?.watertight ?? { isWatertight: true, status: "WATERTIGHT (MANIFOLD)" };
  const triangleCount = activeAnalysis?.triangleCount ?? 192;
  const heightMm = boundingBox?.y ?? 20;

  // Configurator state
  const [techKey, setTechKey] = useState("FDM"); // 'FDM' | 'SLA'
  const activeTech = TECHNOLOGIES[techKey];

  const [selectedMaterialId, setSelectedMaterialId] = useState(activeTech.materials[0].id);
  const [infillPercent, setInfillPercent] = useState(20);
  const [layerHeightId, setLayerHeightId] = useState("0.16");
  const [selectedAddons, setSelectedAddons] = useState(["support-removal"]);
  const [orderQueued, setOrderQueued] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Active selected material object
  const activeMaterial = useMemo(() => {
    return (
      activeTech.materials.find((m) => m.id === selectedMaterialId) ||
      activeTech.materials[0]
    );
  }, [activeTech, selectedMaterialId]);

  // Handle technology switch (auto-select first material in that tech)
  const handleTechChange = (newTechKey) => {
    setTechKey(newTechKey);
    const newTech = TECHNOLOGIES[newTechKey];
    setSelectedMaterialId(newTech.materials[0].id);
  };

  // Toggle post-processing add-ons
  const toggleAddon = (addonId) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Infill recommendation label
  const infillRecommendation = useMemo(() => {
    if (infillPercent <= 15) return "Ultra-Lightweight Test Block";
    if (infillPercent <= 25) return "Cosmetic Display / Visual Fit Verification";
    if (infillPercent <= 45) return "Functional Part / Enclosures & Brackets";
    if (infillPercent <= 75) return "High Mechanical Rigidity & Torsion";
    return "100% Solid Load-Bearing & Thread Anchor";
  }, [infillPercent]);

  // Execute Pricing Algorithm
  const singleQuote = useMemo(() => {
    return calculateQuote({
      volumeCm3,
      heightMm,
      material: activeMaterial,
      infillPercent,
      layerHeightId,
      selectedAddonIds: selectedAddons,
    });
  }, [volumeCm3, heightMm, activeMaterial, infillPercent, layerHeightId, selectedAddons]);

  // Scaled values by quantity
  const totalOrderPrice = Number((singleQuote.totalPrice * quantity).toFixed(2));
  const totalOrderMass = Number((singleQuote.massGrams * quantity).toFixed(2));

  const handleQueueOrder = () => {
    setOrderId(Math.floor(100000 + Math.random() * 900000));
    setOrderQueued(true);
    setTimeout(() => {
      setOrderQueued(false);
      setOrderId(null);
    }, 4500);
  };

  return (
    <section
      id="quote-calculator"
      className="relative w-full bg-[#111111] text-white border-t border-[#333333] py-14 md:py-20"
      aria-label="Instant Manufacturing Pricing & Quote Calculator"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-[#FF5A00]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF5A00]">
                // MODULE 03: LIVE PRICING ALGORITHM &amp; FLEET DISPATCH
              </span>
            </div>
            <h2 className="font-sans text-[28px] md:text-[36px] font-bold tracking-tight text-white leading-tight">
              INSTANT QUOTE &amp; CONFIGURATOR
            </h2>
            <p className="font-sans text-[14px] text-[#A1A1AA] max-w-2xl mt-1.5 leading-relaxed">
              Algorithmic manufacturing costing coupled directly to your parsed CAD mesh metrics.
              Transparent pricing with real-time material markup, machine time estimation, and
              scheduled fleet dispatch dates.
            </p>
          </div>

          {/* Pricing Formula Badge */}
          <div className="font-mono text-[10px] bg-[#161616] border border-[#333333] p-3 text-[#A1A1AA] max-w-sm">
            <div className="text-white font-semibold mb-1 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>PRICING ENGINE HEURISTIC</span>
              <span className="text-[#FF5A00]">v2.4 ACTIVE</span>
            </div>
            <div className="text-[10px] text-[#71717A] leading-relaxed">
              Cost = (Mass × $/g × 3.0) + (PrintHrs × $2.50) + $5.00 Setup + Add-ons
            </div>
          </div>
        </div>

        {/* ── DUAL COLUMN HIGH-DENSITY TECHNICAL INTERFACE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ═════════════════════════════════════════════════════
              LEFT COLUMN: 3D MODEL PREVIEW & METRICS SUMMARY (5 cols)
          ═════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Model Geometric Card */}
            <div className="bg-[#141414] border border-[#333333] p-5">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4 font-mono text-[11px]">
                <span className="text-[#FF5A00] uppercase tracking-wider font-semibold">
                  // CAD MODEL METRICS
                </span>
                <span
                  className={`px-2 py-0.5 text-[9px] uppercase font-semibold border ${
                    watertight.isWatertight
                      ? "border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                      : "border-[#EF4444] text-[#EF4444] bg-[#EF4444]/10"
                  }`}
                >
                  {watertight.isWatertight ? "2-MANIFOLD VERIFIED" : "NON-MANIFOLD"}
                </span>
              </div>

              {/* Model File Identification */}
              <div className="mb-4">
                <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                  INGESTED SOURCE FILE:
                </span>
                <div className="font-mono text-[14px] font-semibold text-white truncate">
                  {fileName}
                </div>
              </div>

              {/* Technical Blueprint Wireframe Graphic */}
              <div className="relative w-full h-44 bg-[#0d0d0f] border border-[#262626] flex items-center justify-center overflow-hidden mb-4 p-4">
                {/* Millimeter Grid Texture */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, #333333 1px, transparent 1px),
                                      linear-gradient(to bottom, #333333 1px, transparent 1px)`,
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Isometric Blueprint Box with Calipers */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 border border-[#FF5A00] bg-[#1a130e]/40 relative flex items-center justify-center">
                    {/* Inner CAD feature lines */}
                    <div className="w-16 h-16 border border-dashed border-[#FF5A00]/60 flex items-center justify-center">
                      <span className="font-mono text-[9px] text-[#FF5A00]">
                        {volumeCm3} cm³
                      </span>
                    </div>

                    {/* Corner Caliper ticks */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#FF5A00]" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#FF5A00]" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#FF5A00]" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#FF5A00]" />
                  </div>

                  {/* Dimension Annotations */}
                  <div className="font-mono text-[10px] text-[#A1A1AA] mt-2 flex items-center gap-2">
                    <span className="text-[#FF5A00]">X: {boundingBox.x}mm</span>
                    <span>•</span>
                    <span className="text-[#4ADE80]">Y: {boundingBox.y}mm</span>
                    <span>•</span>
                    <span className="text-[#60A5FA]">Z: {boundingBox.z}mm</span>
                  </div>
                </div>

                {/* Floating scale badge */}
                <div className="absolute bottom-2 left-2 font-mono text-[9px] text-[#666666]">
                  PROJECTION: ISOMETRIC 1:1
                </div>
              </div>

              {/* Physical Property Telemetry Table */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mb-4">
                <div className="bg-[#18181a] border border-[#262626] p-2.5">
                  <span className="text-[10px] text-[#71717A] uppercase block">
                    NET VOLUME:
                  </span>
                  <span className="text-white font-semibold text-[13px]">
                    {volumeCm3} <span className="text-[10px] text-[#FF5A00]">cm³</span>
                  </span>
                  <span className="text-[9px] text-[#666666] block">
                    {(volumeCm3 * 1000).toLocaleString()} mm³
                  </span>
                </div>

                <div className="bg-[#18181a] border border-[#262626] p-2.5">
                  <span className="text-[10px] text-[#71717A] uppercase block">
                    SURFACE AREA:
                  </span>
                  <span className="text-white font-semibold text-[13px]">
                    {surfaceArea.areaCm2} <span className="text-[10px] text-[#A1A1AA]">cm²</span>
                  </span>
                  <span className="text-[9px] text-[#666666] block">
                    {surfaceArea.areaMm2.toLocaleString()} mm²
                  </span>
                </div>

                <div className="bg-[#18181a] border border-[#262626] p-2.5">
                  <span className="text-[10px] text-[#71717A] uppercase block">
                    Z-HEIGHT (SLICES):
                  </span>
                  <span className="text-white font-semibold text-[13px]">
                    {heightMm} <span className="text-[10px] text-[#A1A1AA]">mm</span>
                  </span>
                  <span className="text-[9px] text-[#666666] block">
                    ≈ {Math.round(heightMm / parseFloat(layerHeightId))} layers
                  </span>
                </div>

                <div className="bg-[#18181a] border border-[#262626] p-2.5">
                  <span className="text-[10px] text-[#71717A] uppercase block">
                    FACET DENSITY:
                  </span>
                  <span className="text-white font-semibold text-[13px]">
                    {triangleCount.toLocaleString()} △
                  </span>
                  <span className="text-[9px] text-[#666666] block">
                    TRIANGULAR MESH
                  </span>
                </div>
              </div>

              {/* Manufacturing Cost Breakdown Matrix */}
              <div className="border-t border-[#222222] pt-4 font-mono text-[11px]">
                <div className="text-[10px] uppercase text-[#71717A] tracking-wider mb-2">
                  TRANSPARENT COST SUB-ALLOCATION (1 UNIT):
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[#A1A1AA]">
                    <span>
                      RAW MATERIAL ({singleQuote.massGrams}g @ ${activeMaterial.costPerGram}/g × 3.0x):
                    </span>
                    <span className="text-white font-semibold">
                      ${singleQuote.materialCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#A1A1AA]">
                    <span>
                      MACHINE OCCUPANCY ({singleQuote.estimatedPrintHours}h @ $2.50/hr):
                    </span>
                    <span className="text-white font-semibold">
                      ${singleQuote.machineCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#A1A1AA]">
                    <span>CALIBRATION &amp; PLATFORM SETUP FEE:</span>
                    <span className="text-white font-semibold">
                      ${PRICING_CONSTANTS.setupFee.toFixed(2)}
                    </span>
                  </div>

                  {singleQuote.postProcessingFees > 0 && (
                    <div className="flex justify-between items-center text-[#A1A1AA]">
                      <span>POST-PROCESSING ADD-ONS:</span>
                      <span className="text-[#FF5A00] font-semibold">
                        +${singleQuote.postProcessingFees.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#262626] pt-1.5 flex justify-between items-center font-bold text-white">
                    <span>UNIT BASE PRICE:</span>
                    <span className="text-[#FF5A00] text-[13px]">
                      ${singleQuote.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════
              RIGHT COLUMN: CONFIGURATOR FORM (7 cols)
          ═════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 bg-[#111111] border border-[#333333] p-6 md:p-8 space-y-7">
            {/* 1. Technology Segmented Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold">
                  01. SELECT MANUFACTURING TECHNOLOGY
                </label>
                <span className="font-mono text-[10px] text-[#A1A1AA]">
                  {techKey === "FDM" ? "THERMOPLASTIC EXTRUSION" : "PHOTOPOLYMER VAT"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 border border-[#333333] p-1 bg-[#141414]">
                {Object.values(TECHNOLOGIES).map((tech) => {
                  const isActive = techKey === tech.key;
                  return (
                    <button
                      key={tech.key}
                      type="button"
                      id={`btn-tech-${tech.key.toLowerCase()}`}
                      onClick={() => handleTechChange(tech.key)}
                      className={`
                        py-2.5 px-4 font-mono text-[12px] uppercase tracking-wider transition-all duration-150 rounded-none text-center
                        ${
                          isActive
                            ? "bg-[#FF5A00] text-black font-bold shadow-sm"
                            : "bg-transparent text-[#A1A1AA] hover:text-white hover:bg-[#1a1a1a]"
                        }
                      `}
                    >
                      [ {tech.name} ]
                    </button>
                  );
                })}
              </div>
              <p className="font-sans text-[11px] text-[#71717A] mt-1.5">
                {activeTech.description}
              </p>
            </div>

            {/* 2. Material Selector Grid */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold">
                  02. ENGINEERING MATERIAL SELECTOR ({activeTech.key})
                </label>
                <span className="font-mono text-[10px] text-[#FF5A00]">
                  RATE INCL. 3.0x MARKUP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeTech.materials.map((mat) => {
                  const isSelected = selectedMaterialId === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      id={`btn-material-${mat.id}`}
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`
                        p-3 text-left border transition-all duration-150 rounded-none relative
                        ${
                          isSelected
                            ? "bg-[#1d140e] border-[#FF5A00] text-white shadow-sm"
                            : "bg-[#141414] border-[#262626] text-[#A1A1AA] hover:border-[#444444] hover:text-white"
                        }
                      `}
                    >
                      {/* Active indicator dot */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF5A00] rounded-full" />
                      )}

                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[12px] font-bold text-white">
                          {mat.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#FF5A00] font-semibold">
                          ${mat.costPerGram.toFixed(2)}/g
                        </span>
                      </div>
                      <p className="font-sans text-[11px] text-[#71717A] leading-tight">
                        {mat.desc}
                      </p>
                      <div className="mt-1.5 font-mono text-[9px] text-[#A1A1AA]">
                        DENSITY: {mat.density} g/cm³
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Infill Density Interactive Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold">
                  03. INTERNAL INFILL DENSITY: {infillPercent}%
                </label>
                <span className="font-mono text-[11px] text-[#FF5A00] font-semibold">
                  {infillRecommendation}
                </span>
              </div>

              {/* Range Slider */}
              <div className="relative py-2">
                <input
                  id="input-infill-slider"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={infillPercent}
                  onChange={(e) => setInfillPercent(Number(e.target.value))}
                  className="w-full h-2 bg-[#222222] rounded-none appearance-none cursor-pointer accent-[#FF5A00] focus:outline-none"
                />
                <div className="flex justify-between font-mono text-[10px] text-[#666666] mt-1">
                  <span>10% (RAPID)</span>
                  <span>20% (COSMETIC)</span>
                  <span>40% (FUNCTIONAL)</span>
                  <span>70% (RIGID)</span>
                  <span>100% (SOLID)</span>
                </div>
              </div>

              {/* Infill Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {INFILL_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setInfillPercent(preset.value)}
                    className={`
                      py-1.5 px-2 font-mono text-[10px] uppercase tracking-wider border transition-colors
                      ${
                        infillPercent === preset.value
                          ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                          : "bg-[#161616] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
                      }
                    `}
                  >
                    [ {preset.label} ]
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Layer Height (Resolution) Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="select-layer-height"
                  className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold"
                >
                  04. LAYER HEIGHT &amp; VERTICAL RESOLUTION
                </label>
                <span className="font-mono text-[10px] text-[#A1A1AA]">
                  AFFECTS PRINT DURATION
                </span>
              </div>

              <select
                id="select-layer-height"
                value={layerHeightId}
                onChange={(e) => setLayerHeightId(e.target.value)}
                className="
                  w-full bg-[#161616] text-white border border-[#333333] hover:border-[#FF5A00]
                  font-mono text-[12px] p-3 rounded-none transition-colors
                  focus:outline-none focus:border-[#FF5A00]
                "
              >
                {LAYER_HEIGHTS.map((layer) => (
                  <option key={layer.id} value={layer.id} className="bg-[#161616] text-white">
                    {layer.label} — {layer.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Post-Processing Add-ons */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold">
                  05. POST-PROCESSING &amp; FINISHING ADD-ONS
                </label>
                <span className="font-mono text-[10px] text-[#A1A1AA]">
                  SELECT ALL APPLICABLE
                </span>
              </div>

              <div className="space-y-2">
                {POST_PROCESSING_ADDONS.map((addon) => {
                  const isChecked = selectedAddons.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`
                        flex items-start gap-3 p-3 border cursor-pointer select-none transition-colors
                        ${
                          isChecked
                            ? "bg-[#181818] border-[#FF5A00]"
                            : "bg-[#141414] border-[#262626] hover:border-[#444444]"
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAddon(addon.id)}
                        className="mt-0.5 w-4 h-4 rounded-none accent-[#FF5A00] cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[12px] text-white font-semibold">
                            {addon.label}
                          </span>
                          <span className="font-mono text-[11px] text-[#FF5A00] font-semibold">
                            +${addon.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="font-sans text-[11px] text-[#71717A] mt-0.5">
                          {addon.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between border-t border-[#222222] pt-4 font-mono text-[11px]">
              <span className="text-[#A1A1AA] uppercase">BATCH PRODUCTION QUANTITY:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 bg-[#181818] border border-[#333333] hover:border-[#FF5A00] text-white flex items-center justify-center font-mono"
                >
                  -
                </button>
                <span className="w-12 text-center text-white font-mono text-[14px] font-bold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 bg-[#181818] border border-[#333333] hover:border-[#FF5A00] text-white flex items-center justify-center font-mono"
                >
                  +
                </button>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════
                4. REAL-TIME HIGH-CONTRAST OUTPUT PANEL
                Background: #EAEAEA, text: #111111, radius: 1px
            ═════════════════════════════════════════════════ */}
            <div className="bg-[#EAEAEA] text-[#111111] p-6 rounded-[1px] border border-[#EAEAEA] shadow-md">
              <div className="flex items-center justify-between border-b border-[#CCCCCC] pb-3 mb-4">
                <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#111111] uppercase">
                  // REAL-TIME MANUFACTURING QUOTE
                </span>
                <span className="font-mono text-[10px] text-[#666666] uppercase">
                  READY FOR DISPATCH
                </span>
              </div>

              {/* 4 Summary Telemetry Pillars */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* 1. Raw Material Mass */}
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#666666] block">
                    TOTAL RAW MASS:
                  </span>
                  <div className="font-mono text-[20px] font-bold text-[#111111] leading-tight">
                    {totalOrderMass} <span className="text-[12px] font-normal">g</span>
                  </div>
                  <span className="font-mono text-[9px] text-[#777777]">
                    {activeMaterial.name}
                  </span>
                </div>

                {/* 2. Estimated Production Duration */}
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#666666] block">
                    PRODUCTION DURATION:
                  </span>
                  <div className="font-mono text-[20px] font-bold text-[#111111] leading-tight">
                    {singleQuote.durationFormatted}
                  </div>
                  <span className="font-mono text-[9px] text-[#777777]">
                    ≈ {(singleQuote.estimatedPrintHours * quantity).toFixed(1)}h total
                  </span>
                </div>

                {/* 3. Estimated Dispatch Date (+2 business days) */}
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#666666] block">
                    EST. DISPATCH DATE:
                  </span>
                  <div className="font-mono text-[14px] font-bold text-[#111111] leading-tight mt-1">
                    {singleQuote.dispatchDate}
                  </div>
                  <span className="font-mono text-[9px] text-[#777777]">
                    +2 BUSINESS DAYS
                  </span>
                </div>

                {/* 4. Total Order Price */}
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#666666] block">
                    TOTAL ORDER PRICE:
                  </span>
                  <div className="font-mono text-[26px] font-black text-[#FF5A00] leading-none my-0.5">
                    ${totalOrderPrice.toFixed(2)}
                  </div>
                  <span className="font-mono text-[9px] text-[#777777]">
                    {quantity > 1 ? `(${quantity} × $${singleQuote.totalPrice.toFixed(2)})` : "TAX INCLUDED"}
                  </span>
                </div>
              </div>

              {/* Action Button: [ ADD TO PRODUCTION QUEUE ] */}
              <button
                type="button"
                id="btn-add-to-queue"
                onClick={handleQueueOrder}
                className="
                  w-full bg-[#FF5A00] hover:bg-[#D94D00] text-white
                  font-mono text-[13px] tracking-[0.14em] uppercase font-bold
                  py-4 px-6 rounded-[1px]
                  transition-all duration-150
                  active:scale-[0.99]
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#111111]
                  shadow-md
                "
              >
                [ ADD TO PRODUCTION QUEUE — ${totalOrderPrice.toFixed(2)} ]
              </button>

              {/* Success Notification Banner */}
              {orderQueued && (
                <div className="mt-3 p-3 bg-[#111111] text-white font-mono text-[11px] border border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                    <span className="text-[#22C55E] font-bold">DISPATCH SUCCESS:</span>
                    <span>Order #{orderId || "NX-88492"} queued for fleet printing.</span>
                  </span>
                  <a
                    href={`#/track?id=${orderId || "NX-88492"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigateTrack) {
                        onNavigateTrack(orderId || "NX-88492");
                      } else {
                        window.location.hash = `#/track?id=${orderId || "NX-88492"}`;
                      }
                    }}
                    className="text-[#FF5A00] hover:text-white underline tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                  >
                    [ OPEN TRACKING APPLICATION ↗ ]
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

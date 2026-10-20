/**
 * src/components/UserPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // 3D Client-Facing Industrial User Panel
 *
 * Design Framework Tokens:
 *  - Primary:     #FF5A00 (High-energy orange action & telemetry)
 *  - Dark Base:   #111111 (Industrial obsidian background)
 *  - Elevated:    #161616 (Card surface)
 *  - Borders:     #333333 (1px precision dividers)
 *  - Surface:     #EAEAEA (High-contrast quotation panel)
 *  - Radii:       1px strict corner radii on all cards, inputs & buttons
 *  - Typography:  Inter (UI / labels), JetBrains Mono (telemetry, inputs, IDs)
 *  - Currency:    INR (₹ - Indian Rupee)
 *
 * Props:
 *  - orders: Array of active order objects (falls back to INITIAL_ORDERS)
 *  - onNewOrder: Callback function taking new order payload: (order) => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo, useRef } from "react";
import { INITIAL_ORDERS, formatINR } from "../data/mockData";

// Extrusion Technologies
const TECHNOLOGIES = [
  { id: "FDM", label: "FDM (Thermopolymer)", desc: "Fused Deposition Modeling • Filament Extrusion" },
  { id: "SLA", label: "SLA (Photopolymer)", desc: "Stereolithography • Micronic Liquid Resin" },
];

// Base Materials
const BASE_MATERIALS = [
  {
    id: "pa-cf",
    name: "PA-CF (Carbon Nylon)",
    technology: "FDM",
    density: 1.18, // g/cm³
    costPerGram: 10.5, // ₹10.50 / g
    desc: "20% High-modulus chopped carbon fiber. Extreme structural rigidity.",
    color: "#E2E8F0",
  },
  {
    id: "petg",
    name: "PETG Industrial",
    technology: "FDM",
    density: 1.27,
    costPerGram: 4.2, // ₹4.20 / g
    desc: "Chemical, glycol, and moisture resistant. High impact durability.",
    color: "#38BDF8",
  },
  {
    id: "pla-speed",
    name: "PLA+ High Speed",
    technology: "FDM",
    density: 1.24,
    costPerGram: 3.5, // ₹3.50 / g
    desc: "Precision prototyping, low thermal shrinkage, sharp edges.",
    color: "#FF5A00",
  },
  {
    id: "resin-tough",
    name: "Tough 2000 Resin",
    technology: "SLA",
    density: 1.2,
    costPerGram: 12.8, // ₹12.80 / g
    desc: "High-elongation photopolymer simulating injection-molded ABS.",
    color: "#A78BFA",
  },
];

// Layer Resolutions
const LAYER_RESOLUTIONS = [
  { id: "0.08", label: "0.08mm", title: "Ultra Detail", speedFactor: 1.35 },
  { id: "0.16", label: "0.16mm", title: "Standard", speedFactor: 1.0 },
  { id: "0.24", label: "0.24mm", title: "Rapid Draft", speedFactor: 0.8 },
];

// Default Preset Ingested Model
const DEFAULT_PRESET_FILE = {
  name: "quad_motor_bracket_v4.stl",
  sizeMB: 3.48,
  dimensions: { x: 82.0, y: 64.0, z: 38.0 },
  volumeCm3: 48.5,
  source: "CAD Assembly Benchmark",
};

export default function UserPanel({ orders = INITIAL_ORDERS, onNewOrder, loadedDesign = null }) {
  // Active Tab state: "slice" | "telemetry"
  const [activeTab, setActiveTab] = useState("slice");

  // TAB 01: Slicing & File Ingestion State
  const [selectedFile, setSelectedFile] = useState(DEFAULT_PRESET_FILE);
  const [isDragging, setIsDragging] = useState(false);
  const [technology, setTechnology] = useState("FDM");
  const [materialId, setMaterialId] = useState("pa-cf");
  const [infill, setInfill] = useState(40);
  const [layerHeight, setLayerHeight] = useState("0.16");
  const [successNotification, setSuccessNotification] = useState(null);
  const fileInputRef = useRef(null);

  // Sync loaded design from popular designs vault during render
  const [prevLoadedDesignId, setPrevLoadedDesignId] = useState(null);
  if (loadedDesign && loadedDesign.id !== prevLoadedDesignId) {
    setPrevLoadedDesignId(loadedDesign.id);
    setSelectedFile({
      name: loadedDesign.filename,
      sizeMB: loadedDesign.sizeMB,
      dimensions: loadedDesign.dimensions,
      volumeCm3: loadedDesign.volumeCm3,
      source: `Popular Vault // ${loadedDesign.title}`,
    });
    if (loadedDesign.technology) {
      setTechnology(loadedDesign.technology);
    }
    if (loadedDesign.recommendedMaterialId) {
      setMaterialId(loadedDesign.recommendedMaterialId);
    }
    setActiveTab("slice");
  }

  // TAB 02: Telemetry & Tracking State
  const effectiveOrders = useMemo(() => {
    return Array.isArray(orders) && orders.length > 0 ? orders : INITIAL_ORDERS;
  }, [orders]);

  const [searchQuery, setSearchQuery] = useState(effectiveOrders[0]?.id || "NX-9042");
  const [activeTrackingId, setActiveTrackingId] = useState(effectiveOrders[0]?.id || "NX-9042");

  // Selected Material Definition
  const activeMaterial = useMemo(() => {
    return BASE_MATERIALS.find((m) => m.id === materialId) || BASE_MATERIALS[0];
  }, [materialId]);

  // Handle technology switch with smart material adjustment
  const handleTechnologyChange = (techId) => {
    setTechnology(techId);
    if (techId === "SLA" && activeMaterial.technology !== "SLA") {
      setMaterialId("resin-tough");
    } else if (techId === "FDM" && activeMaterial.technology !== "FDM") {
      setMaterialId("pa-cf");
    }
  };

  // Slicing Quotation Mathematics
  const quotation = useMemo(() => {
    const vol = selectedFile?.volumeCm3 || 48.5;
    const height = selectedFile?.dimensions?.z || 38.0;
    const density = activeMaterial.density;
    const costPerGram = activeMaterial.costPerGram;

    // Mass in grams: shell accounts for ~22% solid perimeter, core scales with infill
    const infillFraction = infill / 100;
    const effectiveFactor = infillFraction === 1.0 ? 1.0 : 0.22 + 0.78 * infillFraction;
    const massGrams = Number((vol * effectiveFactor * density).toFixed(1));

    // Machine time heuristic in hours
    const layerFactor = LAYER_RESOLUTIONS.find((l) => l.id === layerHeight)?.speedFactor || 1.0;
    const rawHours = (vol * infillFraction * 0.45) / 10 + height * 0.05;
    const estimatedHours = Number((rawHours * layerFactor).toFixed(2));

    // Pricing components (in INR ₹)
    const materialCost = massGrams * costPerGram * 3.0; // 3.0x markup
    const machineCost = estimatedHours * 210; // ₹210/hr
    const setupFee = 420; // ₹420 calibration & setup
    const totalPrice = Math.round(materialCost + machineCost + setupFee);

    // Formatted time duration
    const totalMinutes = Math.round(estimatedHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const durationFormatted = h > 0 ? `${h}h ${m}m` : `${m}m`;

    return {
      massGrams,
      estimatedHours,
      durationFormatted,
      materialCost: Math.round(materialCost),
      machineCost: Math.round(machineCost),
      setupFee,
      totalPrice,
    };
  }, [selectedFile, activeMaterial, infill, layerHeight]);

  // File Upload Handlers (.STL, .STEP, .OBJ)
  const processUploadedFile = (file) => {
    if (!file) return;
    const extension = file.name.split(".").pop().toLowerCase();
    const sizeInMB = Number((file.size / (1024 * 1024)).toFixed(2));

    // Calculate realistic dimensional bounds proportional to file complexity/size
    const baseDimension = Math.max(30, Math.min(220, Math.round(Math.sqrt(file.size / 1024) * 2.8)));
    const x = Math.round(baseDimension * 1.1);
    const y = Math.round(baseDimension * 0.85);
    const z = Math.round(baseDimension * 0.5);
    const volumeCm3 = Number(((x * y * z * 0.24) / 1000).toFixed(1));

    setSelectedFile({
      name: file.name,
      sizeMB: sizeInMB || 0.45,
      dimensions: { x, y, z },
      volumeCm3: Math.max(8.0, volumeCm3),
      extension: `.${extension}`,
    });
    setSuccessNotification(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDiscardFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Order Submission Handler
  const handleTransmitOrder = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newOrderId = `NX-${randomSuffix}`;

    const newOrderPayload = {
      id: newOrderId,
      client: "Client Direct",
      filename: selectedFile?.name || "unnamed_cad_part.stl",
      volumeCm3: selectedFile?.volumeCm3 || 48.5,
      dimensions: selectedFile?.dimensions || { x: 82, y: 64, z: 38 },
      technology,
      material: activeMaterial.name,
      infill,
      layerHeight: Number(layerHeight),
      status: "QUEUED",
      assignedPrinter: technology === "SLA" ? "RIG-02" : "RIG-01",
      progress: 0,
      estimatedTime: quotation.durationFormatted,
      price: quotation.totalPrice,
      createdAt: new Date().toISOString(),
    };

    if (onNewOrder) {
      onNewOrder(newOrderPayload);
    }

    setSuccessNotification(newOrderPayload);
    setActiveTrackingId(newOrderId);
    setSearchQuery(newOrderId);
  };

  // Active searched order for TAB 02
  const searchedOrder = useMemo(() => {
    const cleanQuery = (activeTrackingId || "").trim().toUpperCase();
    return effectiveOrders.find(
      (o) =>
        o.id.toUpperCase() === cleanQuery ||
        o.id.replace("NX-", "").toUpperCase() === cleanQuery.replace("NX-", "")
    );
  }, [activeTrackingId, effectiveOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTrackingId(searchQuery.trim().toUpperCase());
    }
  };

  return (
    <section
      id="user-panel"
      className="bg-[#111111] text-white border border-[#333333] rounded-[1px] overflow-hidden"
      aria-label="Client Manufacturing User Panel"
    >
      {/* ═════════════════════════════════════════════════════════════════════
          TOP TAB BAR
      ═════════════════════════════════════════════════════════════════════ */}
      <header className="bg-[#161616] border-b border-[#333333] px-4 md:px-8 pt-4 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Section Title */}
        <div className="flex items-center gap-3 pb-3">
          <span className="w-2.5 h-2.5 bg-[#FF5A00] rounded-[1px]" />
          <div>
            <h2 className="font-sans font-bold text-sm md:text-base tracking-wider uppercase text-white">
              NEXUS // USER PRODUCTION PANEL
            </h2>
            <p className="font-mono text-[10px] text-[#A1A1AA] uppercase">
              // CLIENT COMMAND INTERFACE • RAPID ADDITIVE PROTOCOLS
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <nav className="flex items-center gap-2">
          <button
            type="button"
            id="tab-slice-order"
            onClick={() => setActiveTab("slice")}
            className={`font-mono text-xs md:text-[13px] px-4 py-2.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
              activeTab === "slice"
                ? "bg-[#111111] text-[#FF5A00] border-t-[#FF5A00] border-t-2 border-x-[#333333] border-b-[#111111]"
                : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
            }`}
          >
            [ TAB 01: INSTANT SLICE &amp; ORDER ]
          </button>

          <button
            type="button"
            id="tab-telemetry-tracking"
            onClick={() => setActiveTab("telemetry")}
            className={`font-mono text-xs md:text-[13px] px-4 py-2.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold ${
              activeTab === "telemetry"
                ? "bg-[#111111] text-[#FF5A00] border-t-[#FF5A00] border-t-2 border-x-[#333333] border-b-[#111111]"
                : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
            }`}
          >
            [ TAB 02: TELEMETRY &amp; TRACKING ]
          </button>
        </nav>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 01: INSTANT SLICE & ORDER
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "slice" && (
        <div className="p-4 md:p-8 space-y-6">
          {/* Success Transmission Banner */}
          {successNotification && (
            <div className="bg-[#141414] border border-[#FF5A00] p-4 rounded-[1px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping" />
                <div className="font-mono text-xs">
                  <span className="text-[#22C55E] font-bold block sm:inline mr-2">
                    [ DISPATCH CONFIRMED ]
                  </span>
                  <span className="text-white">
                    Order <span className="text-[#FF5A00] font-bold">{successNotification.id}</span> generated and transmitted to production fleet.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("telemetry");
                  setActiveTrackingId(successNotification.id);
                  setSearchQuery(successNotification.id);
                }}
                className="font-mono text-[11px] text-[#111111] bg-[#FF5A00] hover:bg-[#D94D00] px-3 py-1.5 font-bold uppercase rounded-[1px] transition-colors cursor-pointer self-start sm:self-auto"
              >
                [ VIEW IN TELEMETRY TAB → ]
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── LEFT COLUMN: FILE INGESTION & BOUNDING BOX (5 Cols) ────── */}
            <div className="lg:col-span-5 space-y-5">
              <div className="border border-[#333333] bg-[#141414] rounded-[1px] p-5">
                <div className="flex items-center justify-between border-b border-[#262626] pb-3 mb-4 font-mono text-[11px]">
                  <span className="text-[#FF5A00] uppercase font-bold tracking-wider">
                    // 01. INGESTION &amp; BOUNDING BOX
                  </span>
                  <span className="text-[#71717A] text-[10px] uppercase">
                    ACCEPTS: .STL, .STEP, .OBJ
                  </span>
                </div>

                {/* Upload Zone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.step,.stp,.obj"
                  onChange={handleFileChange}
                  className="hidden"
                  id="user-panel-file-input"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-[1px] p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-[#FF5A00] bg-[#FF5A00]/10"
                      : "border-[#333333] hover:border-[#FF5A00] bg-[#111111]"
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 text-[#FF5A00]">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      className="w-full h-full"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </div>
                  <p className="font-mono text-xs text-white font-semibold uppercase">
                    DRAG &amp; DROP 3D CAD MODEL HERE
                  </p>
                  <p className="font-sans text-[11px] text-[#A1A1AA] mt-1">
                    Direct local parsing for .STL, .STEP, and .OBJ geometry
                  </p>
                  <span className="inline-block mt-3 px-3 py-1 font-mono text-[10px] text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/30 rounded-[1px] uppercase font-bold">
                    [ SELECT LOCAL CAD FILE ]
                  </span>
                </div>

                {/* Selected File Metadata & Viewport */}
                {selectedFile ? (
                  <div className="mt-5 space-y-4">
                    {/* Metadata Header */}
                    <div className="bg-[#111111] border border-[#262626] p-3 rounded-[1px] flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                          INGESTED SOURCE PART:
                        </span>
                        <span className="font-mono text-xs text-white font-semibold truncate block">
                          {selectedFile.name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                          FILE SIZE:
                        </span>
                        <span className="font-mono text-xs text-[#FF5A00] font-bold block">
                          {selectedFile.sizeMB} MB
                        </span>
                      </div>
                    </div>

                    {/* Industrial Mock Viewport */}
                    <div className="relative bg-[#0D0D0D] border border-[#333333] rounded-[1px] p-4 h-64 overflow-hidden flex flex-col justify-between">
                      {/* Technical Grid Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-25"
                        style={{
                          backgroundImage: `
                            linear-gradient(to right, #333333 1px, transparent 1px),
                            linear-gradient(to bottom, #333333 1px, transparent 1px)
                          `,
                          backgroundSize: "20px 20px",
                        }}
                      />

                      {/* Viewport Top Status HUD */}
                      <div className="relative z-10 flex items-center justify-between font-mono text-[10px]">
                        <span className="text-[#FF5A00] font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full animate-ping" />
                          [ WIREFRAME BOUNDS ACTIVE ]
                        </span>
                        <span className="text-[#A1A1AA] uppercase">
                          ORTHO: ISO-3D
                        </span>
                      </div>

                      {/* Isometric Pulsating Wireframe Box Visualizer */}
                      <div className="relative z-10 my-auto flex items-center justify-center">
                        <div className="relative w-44 h-28 border border-[#FF5A00] border-dashed rounded-[1px] bg-[#FF5A00]/5 flex items-center justify-center animate-pulse shadow-sm">
                          {/* Inner perspective crosshairs */}
                          <div className="absolute inset-x-0 top-1/2 border-t border-[#FF5A00]/30 border-dotted" />
                          <div className="absolute inset-y-0 left-1/2 border-l border-[#FF5A00]/30 border-dotted" />

                          {/* Pulsating Corner Anchor Points */}
                          <span className="absolute -top-1 -left-1 w-2 h-2 bg-[#FF5A00]" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF5A00]" />
                          <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#FF5A00]" />
                          <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#FF5A00]" />

                          {/* Pulsating Dimension Badge */}
                          <div className="bg-[#111111]/90 border border-[#FF5A00] px-2.5 py-1 rounded-[1px] font-mono text-center shadow">
                            <span className="text-[10px] text-[#A1A1AA] uppercase block font-semibold">
                              BOUNDING ENVELOPE:
                            </span>
                            <span className="text-xs text-white font-bold tracking-wider">
                              {selectedFile.dimensions.x} × {selectedFile.dimensions.y} × {selectedFile.dimensions.z} mm
                            </span>
                          </div>

                          {/* Axis Measurement Labels */}
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[#FF5A00]">
                            X: {selectedFile.dimensions.x}mm
                          </span>
                          <span className="absolute -left-6 top-1/2 -translate-y-1/2 font-mono text-[9px] text-[#38BDF8] -rotate-90">
                            Y: {selectedFile.dimensions.y}mm
                          </span>
                          <span className="absolute -right-6 top-1/2 -translate-y-1/2 font-mono text-[9px] text-[#22C55E] rotate-90">
                            Z: {selectedFile.dimensions.z}mm
                          </span>
                        </div>
                      </div>

                      {/* Viewport Bottom Telemetry Bar */}
                      <div className="relative z-10 flex items-center justify-between font-mono text-[9px] text-[#71717A] border-t border-[#222222] pt-2">
                        <span>VOLUME: {selectedFile.volumeCm3} cm³</span>
                        <span>GRID INTERVAL: 10.0 mm</span>
                        <span>ORIGIN: [0, 0, 0]</span>
                      </div>
                    </div>

                    {/* Discard & Re-upload Button */}
                    <button
                      type="button"
                      onClick={handleDiscardFile}
                      className="w-full bg-[#181818] hover:bg-[#222222] text-[#A1A1AA] hover:text-[#EF4444] border border-[#333333] hover:border-[#EF4444] py-2 px-3 font-mono text-[11px] uppercase rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>✕</span>
                      <span>[ DISCARD &amp; RE-UPLOAD NEW MESH ]</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-4 border border-[#222222] bg-[#111111] text-center font-mono text-[11px] text-[#71717A] rounded-[1px]">
                    // NO CAD MODEL LOADED. SELECT OR DRAG A FILE TO COMMENCE GEOMETRY EXTRACTION.
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: SLICING CONFIGURATOR & QUOTATION (7 Cols) ─ */}
            <div className="lg:col-span-7 space-y-6">
              <div className="border border-[#333333] bg-[#141414] rounded-[1px] p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-[#262626] pb-3 font-mono text-[11px]">
                  <span className="text-[#FF5A00] uppercase font-bold tracking-wider">
                    // 02. SLICING CONFIGURATOR &amp; QUOTATION ENGINE
                  </span>
                  <span className="text-[#71717A] text-[10px] uppercase">
                    NEXUS ENGINE v2.4
                  </span>
                </div>

                {/* 1. Extrusion Technology Toggle */}
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-2">
                    01. EXTRUSION TECHNOLOGY:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TECHNOLOGIES.map((tech) => {
                      const isActive = technology === tech.id;
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => handleTechnologyChange(tech.id)}
                          className={`p-3 text-left border rounded-[1px] transition-colors cursor-pointer ${
                            isActive
                              ? "bg-[#1C1C1C] border-[#FF5A00] text-white"
                              : "bg-[#111111] border-[#333333] text-[#A1A1AA] hover:border-[#555555] hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-xs font-bold">
                            <span>{tech.label}</span>
                            {isActive && <span className="w-2 h-2 bg-[#FF5A00] rounded-full" />}
                          </div>
                          <p className="font-sans text-[10px] text-[#71717A] mt-1">
                            {tech.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Base Material Selector */}
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-2">
                    02. PRODUCTION MATERIAL:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BASE_MATERIALS.map((mat) => {
                      const isSelected = materialId === mat.id;
                      const isTechMatch = mat.technology === technology;
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => {
                            setMaterialId(mat.id);
                            if (mat.technology !== technology) {
                              setTechnology(mat.technology);
                            }
                          }}
                          className={`p-3 text-left border rounded-[1px] transition-colors cursor-pointer relative ${
                            isSelected
                              ? "bg-[#1C1C1C] border-[#FF5A00] text-white"
                              : "bg-[#111111] border-[#2A2A2A] text-[#A1A1AA] hover:border-[#444444] hover:text-white"
                          } ${!isTechMatch ? "opacity-75" : ""}`}
                        >
                          <div className="flex items-center justify-between font-mono text-xs font-bold">
                            <span className="truncate">{mat.name}</span>
                            <span className="text-[#FF5A00] text-[11px] flex-shrink-0">
                              ₹{mat.costPerGram.toFixed(2)}/g
                            </span>
                          </div>
                          <p className="font-sans text-[10px] text-[#71717A] mt-1 line-clamp-2">
                            {mat.desc}
                          </p>
                          <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-[#A1A1AA] border-t border-[#222222] pt-1.5">
                            <span>DENSITY: {mat.density} g/cm³</span>
                            <span className="text-[#FF5A00] uppercase font-semibold">
                              [{mat.technology}]
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Infill Volume Slider (15% to 100%) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold">
                      03. INFILL VOLUME &amp; CORE DENSITY:
                    </label>
                    <span className="font-mono text-xs font-bold text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/30 px-2 py-0.5 rounded-[1px]">
                      {infill}% INFILL
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={infill}
                    onChange={(e) => setInfill(Number(e.target.value))}
                    className="w-full accent-[#FF5A00] bg-[#222222] h-2 rounded-[1px] cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-[#71717A] mt-1.5">
                    <span>15% (LIGHTWEIGHT)</span>
                    <span>40% (FUNCTIONAL STRUCTURAL)</span>
                    <span>100% (SOLID CORE)</span>
                  </div>
                </div>

                {/* 4. Layer Resolution Selector */}
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold block mb-2">
                    04. VERTICAL LAYER RESOLUTION:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {LAYER_RESOLUTIONS.map((res) => {
                      const isSelected = layerHeight === res.id;
                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => setLayerHeight(res.id)}
                          className={`p-2.5 text-center border rounded-[1px] transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#1E1E1E] border-[#FF5A00] text-white"
                              : "bg-[#111111] border-[#333333] text-[#A1A1AA] hover:text-white hover:border-[#555555]"
                          }`}
                        >
                          <div className="font-mono text-xs font-bold">{res.label}</div>
                          <div className="font-sans text-[10px] text-[#71717A] mt-0.5">
                            {res.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. High-Contrast Quotation Box (Background #EAEAEA, Text #111111, 1px Radius) */}
                <div className="bg-[#EAEAEA] text-[#111111] p-5 rounded-[1px] border border-[#CCCCCC] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#CCCCCC] pb-2 font-mono text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-[#111111]">
                      // DYNAMIC SOURCING QUOTATION
                    </span>
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">
                      TAX INCLUDED
                    </span>
                  </div>

                  {/* 3 Metric Columns: Mass, Machine Time, Total Price */}
                  <div className="grid grid-cols-3 gap-3 text-left">
                    <div>
                      <span className="font-mono text-[10px] text-[#666666] uppercase block">
                        PART MASS:
                      </span>
                      <span className="font-mono text-lg font-black text-[#111111] block">
                        {quotation.massGrams} <span className="text-xs font-normal">g</span>
                      </span>
                      <span className="font-mono text-[9px] text-[#777777] block">
                        @ {infill}% CORE
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-[#666666] uppercase block">
                        MACHINE TIME:
                      </span>
                      <span className="font-mono text-lg font-black text-[#111111] block">
                        {quotation.durationFormatted}
                      </span>
                      <span className="font-mono text-[9px] text-[#777777] block">
                        ≈ {quotation.estimatedHours}h
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-[#666666] uppercase block">
                        TOTAL ESTIMATE:
                      </span>
                      <span className="font-mono text-xl font-black text-[#FF5A00] block">
                        {formatINR(quotation.totalPrice)}
                      </span>
                      <span className="font-mono text-[9px] text-[#777777] block">
                        DISPATCH IN 48H
                      </span>
                    </div>
                  </div>

                  {/* Cost breakdown micro-line */}
                  <div className="border-t border-[#D4D4D4] pt-2 flex flex-wrap justify-between font-mono text-[10px] text-[#555555]">
                    <span>Material: ₹{quotation.materialCost}</span>
                    <span>Machine: ₹{quotation.machineCost}</span>
                    <span>Setup &amp; Prep: ₹{quotation.setupFee}</span>
                  </div>
                </div>

                {/* 6. Submission Button */}
                <button
                  type="button"
                  id="btn-transmit-order"
                  onClick={handleTransmitOrder}
                  className="w-full bg-[#FF5A00] hover:bg-[#D94D00] text-white font-mono text-sm tracking-wider uppercase font-bold py-4 px-6 rounded-[1px] transition-colors cursor-pointer active:scale-[0.99] border border-[#FF5A00]"
                >
                  [ TRANSMIT TO PRODUCTION QUEUE — {formatINR(quotation.totalPrice)} ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 02: TELEMETRY & TRACKING
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "telemetry" && (
        <div className="p-4 md:p-8 space-y-6">
          {/* Search Header Form */}
          <div className="bg-[#161616] border border-[#333333] p-5 rounded-[1px]">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="[ ENTER ORDER ID: e.g. NX-9042 ]"
                  className="w-full bg-[#111111] text-white font-mono text-xs md:text-sm px-4 py-3 border border-[#333333] focus:border-[#FF5A00] focus:outline-none rounded-[1px] tracking-wider placeholder-[#555555]"
                />
              </div>
              <button
                type="submit"
                className="bg-[#FF5A00] hover:bg-[#D94D00] text-white font-mono text-xs uppercase font-bold px-6 py-3 rounded-[1px] transition-colors cursor-pointer tracking-wider flex items-center justify-center gap-2"
              >
                <span>[ TRACE PART ]</span>
              </button>
            </form>

            {/* Quick-Select Recent Orders Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[#262626]">
              <span className="font-mono text-[10px] text-[#71717A] uppercase mr-1">
                RECENT FLEET RECORDS:
              </span>
              {effectiveOrders.slice(0, 5).map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(ord.id);
                    setActiveTrackingId(ord.id);
                  }}
                  className={`font-mono text-[10px] px-2.5 py-1 rounded-[1px] border transition-colors cursor-pointer ${
                    activeTrackingId === ord.id
                      ? "border-[#FF5A00] text-[#FF5A00] bg-[#FF5A00]/10 font-bold"
                      : "border-[#333333] text-[#A1A1AA] hover:text-white bg-[#111111]"
                  }`}
                >
                  {ord.id}
                </button>
              ))}
            </div>
          </div>

          {/* Searched Order Card or Clean Fallback */}
          {searchedOrder ? (
            <div className="bg-[#141414] border border-[#333333] p-6 rounded-[1px] space-y-6">
              {/* Header: File Name, Client, Pill Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-[#FF5A00] font-bold">
                      ORDER {searchedOrder.id}
                    </span>
                    <span className="text-[#555555]">•</span>
                    <span className="font-mono text-[11px] text-[#A1A1AA]">
                      CLIENT: {searchedOrder.client}
                    </span>
                  </div>
                  <h3 className="font-mono text-base md:text-lg font-bold text-white truncate">
                    {searchedOrder.filename}
                  </h3>
                </div>

                {/* Pill Status Badge */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs uppercase font-bold rounded-full ${
                      searchedOrder.status === "PRINTING"
                        ? "border border-[#FF5A00] text-[#FF5A00] bg-[#FF5A00]/10"
                        : searchedOrder.status === "POST_PROCESSING"
                        ? "border border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10"
                        : searchedOrder.status === "DISPATCHED"
                        ? "border border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                        : "border border-[#A1A1AA] text-[#A1A1AA] bg-[#A1A1AA]/10"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        searchedOrder.status === "PRINTING"
                          ? "bg-[#FF5A00] animate-pulse"
                          : searchedOrder.status === "POST_PROCESSING"
                          ? "bg-[#38BDF8]"
                          : searchedOrder.status === "DISPATCHED"
                          ? "bg-[#22C55E]"
                          : "bg-[#A1A1AA]"
                      }`}
                    />
                    {searchedOrder.status}
                  </span>
                </div>
              </div>

              {/* Real-Time Progress Bar Styled in #FF5A00 */}
              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="text-[#A1A1AA] uppercase">
                    FABRICATION EXECUTION PIPELINE:
                  </span>
                  <span className="text-[#FF5A00] font-bold">
                    {searchedOrder.progress}% COMPLETE
                  </span>
                </div>
                <div className="w-full bg-[#1A1A1A] border border-[#333333] h-3 rounded-[1px] overflow-hidden p-0.5">
                  <div
                    className="bg-[#FF5A00] h-full transition-all duration-500 rounded-[1px]"
                    style={{ width: `${Math.max(4, searchedOrder.progress)}%` }}
                  />
                </div>
              </div>

              {/* 4-Column Telemetry Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111111] border border-[#262626] p-4 rounded-[1px]">
                {/* 1. Assigned Machine Rig */}
                <div>
                  <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                    ASSIGNED RIG:
                  </span>
                  <span className="font-mono text-xs md:text-sm font-bold text-white block mt-0.5">
                    {searchedOrder.assignedPrinter || "RIG-01"}
                  </span>
                  <span className="font-mono text-[9px] text-[#A1A1AA]">
                    {searchedOrder.technology || "FDM"} FLEET BED
                  </span>
                </div>

                {/* 2. Material */}
                <div>
                  <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                    MATERIAL:
                  </span>
                  <span className="font-mono text-xs md:text-sm font-bold text-[#FF5A00] block mt-0.5 truncate">
                    {searchedOrder.material}
                  </span>
                  <span className="font-mono text-[9px] text-[#A1A1AA]">
                    {searchedOrder.infill}% INFILL • {searchedOrder.layerHeight}mm
                  </span>
                </div>

                {/* 3. Estimated Dispatch */}
                <div>
                  <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                    EST. DISPATCH:
                  </span>
                  <span className="font-mono text-xs md:text-sm font-bold text-white block mt-0.5">
                    {searchedOrder.estimatedTime || "48 HOURS"}
                  </span>
                  <span className="font-mono text-[9px] text-[#22C55E]">
                    SCHEDULE ACTIVE
                  </span>
                </div>

                {/* 4. Total Valuation */}
                <div>
                  <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                    TOTAL VALUATION:
                  </span>
                  <span className="font-mono text-xs md:text-sm font-bold text-white block mt-0.5">
                    {formatINR(searchedOrder.price)}
                  </span>
                  <span className="font-mono text-[9px] text-[#71717A]">
                    COMMERCIAL INVOICED
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Clean Fallback Message When Order Not Found */
            <div className="bg-[#141414] border border-[#333333] p-8 text-center rounded-[1px] space-y-3">
              <div className="w-10 h-10 mx-auto text-[#EF4444] border border-[#EF4444]/40 p-2 rounded-[1px]">
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                NO TELEMETRY RECORD MATCHING &quot;{activeTrackingId}&quot; FOUND
              </h4>
              <p className="font-sans text-xs text-[#A1A1AA] max-w-md mx-auto">
                Unable to locate production lifecycle telemetry for this identifier. Please verify the tracking token format (e.g., NX-9042).
              </p>
              <button
                type="button"
                onClick={() => {
                  const fallbackId = effectiveOrders[0]?.id || "NX-9042";
                  setSearchQuery(fallbackId);
                  setActiveTrackingId(fallbackId);
                }}
                className="mt-2 inline-block font-mono text-xs text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/40 px-4 py-2 uppercase font-bold rounded-[1px] hover:bg-[#FF5A00]/20 transition-colors cursor-pointer"
              >
                [ RESET TO ACTIVE FLEET ORDER: {effectiveOrders[0]?.id || "NX-9042"} ]
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

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
 *  - loadedDesign: Optional pre-loaded design from popular vault
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo, useRef } from "react";
import { INITIAL_ORDERS, formatINR } from "../data/mockData";
import { sound } from "../utils/soundEffects";
import { useToast } from "../context/ToastContext";
import ModelViewer3D from "./ModelViewer3D";

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
    density: 1.15,
    costPerGram: 14.0, // ₹14.00 / g
    desc: "Surgical & engineering grade. High impact, elongation at break 15%.",
    color: "#A78BFA",
  },
  {
    id: "resin-clear",
    name: "High-Temp Optical Resin",
    technology: "SLA",
    density: 1.17,
    costPerGram: 16.5, // ₹16.50 / g
    desc: "Optical clarity & 238°C HDT @ 0.45 MPa. Fluidics & mold tooling.",
    color: "#34D399",
  },
];

// Layer Resolutions
const LAYER_RESOLUTIONS = [
  { id: "0.08", label: "0.08 mm (Ultra-Fine)", speedFactor: 1.8, desc: "Micronic surface finish" },
  { id: "0.16", label: "0.16 mm (Standard)", speedFactor: 1.0, desc: "Balanced strength & speed" },
  { id: "0.24", label: "0.24 mm (Rapid Draft)", speedFactor: 0.65, desc: "Fast dimensional check" },
];

// Infill Patterns
const INFILL_PATTERNS = [
  { id: "Gyroid", label: "Gyroid", desc: "Isotropic multi-axis shear strength (Recommended)" },
  { id: "Honeycomb", label: "Honeycomb", desc: "High stiffness-to-weight ratio" },
  { id: "Grid", label: "Grid", desc: "Maximum deposition velocity" },
  { id: "Concentric", label: "Concentric", desc: "Optimal for flexible polymers" },
];

// Sample CAD Models for 1-Click Quick Ingestion
const SAMPLE_MODELS = [
  {
    name: "aerospace_drone_bracket_v2.stl",
    title: "Aerospace Bracket",
    sizeMB: 7.15,
    dimensions: { x: 145, y: 92, z: 55 },
    volumeCm3: 78.4,
    technology: "FDM",
    materialId: "pa-cf",
    icon: "🚀",
  },
  {
    name: "3D_Benchy_Calibration_v3.stl",
    title: "3DBenchy Benchmark",
    sizeMB: 2.85,
    dimensions: { x: 60, y: 31, z: 48 },
    volumeCm3: 15.5,
    technology: "FDM",
    materialId: "pla-speed",
    icon: "🚢",
  },
  {
    name: "cranial_osteomesh_implant_v2.stl",
    title: "Cranial Osteo-Mesh",
    sizeMB: 9.34,
    dimensions: { x: 110, y: 95, z: 68 },
    volumeCm3: 28.6,
    technology: "SLA",
    materialId: "resin-tough",
    icon: "🩺",
  },
];

export default function UserPanel({ orders = [], onNewOrder, loadedDesign = null }) {
  const { addToast } = useToast();

  // Primary Tab Navigation: "slice" | "telemetry"
  const [activeTab, setActiveTab] = useState("slice");

  // File Ingestion State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Viewport Interactive Controls
  const [layerProgress, setLayerProgress] = useState(100); // 0 to 100%

  // Slicing Configurator State
  const [technology, setTechnology] = useState("FDM");
  const [materialId, setMaterialId] = useState("pa-cf");
  const [infill, setInfill] = useState(40);
  const [infillPattern, setInfillPattern] = useState("Gyroid");
  const [layerHeight, setLayerHeight] = useState("0.16");
  const [postProcessing, setPostProcessing] = useState({
    acetoneVapor: false,
    heatTreatAnneal: false,
    ultrasonicClean: false,
    supportRemoval: true,
  });
  const [priorityMode, setPriorityMode] = useState("STANDARD"); // "STANDARD" | "EXPRESS"
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  // Success Confirmation State
  const [successNotification, setSuccessNotification] = useState(null);

  // CAD Design & Dimension Editor State
  const [designScale, setDesignScale] = useState({ x: 100, y: 100, z: 100 });
  const [isUniformScale, setIsUniformScale] = useState(true);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 }); // degrees
  const [wallLoops, setWallLoops] = useState(3); // 2, 3, 4, 6
  const [isMirroredX, setIsMirroredX] = useState(false);
  const [isMirroredY, setIsMirroredY] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [customModelName, setCustomModelName] = useState("");
  const [uploadedFileBuffer, setUploadedFileBuffer] = useState(null);

  // Sync loaded design from popular designs vault during render
  const [prevLoadedDesignKey, setPrevLoadedDesignKey] = useState(null);
  const currentLoadKey = loadedDesign
    ? `${loadedDesign.id || "design"}_${loadedDesign._loadSeq || 0}`
    : null;

  if (loadedDesign && currentLoadKey !== prevLoadedDesignKey) {
    setPrevLoadedDesignKey(currentLoadKey);
    setSelectedFile({
      name: loadedDesign.filename || `${loadedDesign.title.toLowerCase().replace(/\s+/g, "_")}.stl`,
      sizeMB: loadedDesign.sizeMB || 3.5,
      dimensions: loadedDesign.dimensions || { x: 75, y: 55, z: 35 },
      volumeCm3: loadedDesign.volumeCm3 || 42,
      source: `Popular Vault // ${loadedDesign.title}`,
    });
    setUploadedFileBuffer(null);
    setDesignScale({ x: 100, y: 100, z: 100 });
    setRotation({ x: 0, y: 0, z: 0 });
    setIsMirroredX(false);
    setIsMirroredY(false);
    setCustomModelName("");
    setIsEditorOpen(true);

    if (loadedDesign.technology) {
      setTechnology(loadedDesign.technology);
    }
    const matId =
      loadedDesign.recommendedMaterialId === "tough-resin"
        ? "resin-tough"
        : loadedDesign.recommendedMaterialId ||
          (loadedDesign.technology === "SLA" ? "resin-tough" : "pa-cf");
    setMaterialId(matId);

    if (loadedDesign.specs?.infill) {
      const parsedInfill = parseInt(loadedDesign.specs.infill, 10);
      if (!isNaN(parsedInfill)) setInfill(parsedInfill);
      if (loadedDesign.specs.infill.includes("Gyroid")) setInfillPattern("Gyroid");
      else if (loadedDesign.specs.infill.includes("Honeycomb")) setInfillPattern("Honeycomb");
      else if (loadedDesign.specs.infill.includes("Grid")) setInfillPattern("Grid");
    }
    if (loadedDesign.specs?.layerHeight) {
      const lh = loadedDesign.specs.layerHeight.replace(" mm", "");
      if (["0.08", "0.16", "0.24"].includes(lh)) setLayerHeight(lh);
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
    sound.playClick();
    setTechnology(techId);
    if (techId === "SLA" && activeMaterial.technology !== "SLA") {
      setMaterialId("resin-tough");
    } else if (techId === "FDM" && activeMaterial.technology !== "FDM") {
      setMaterialId("pa-cf");
    }
  };

  // Effective CAD Dimensions based on scale & orientation
  const effectiveDims = useMemo(() => {
    const base = selectedFile?.dimensions || { x: 80.0, y: 60.0, z: 40.0 };
    return {
      x: Number((base.x * (designScale.x / 100)).toFixed(1)),
      y: Number((base.y * (designScale.y / 100)).toFixed(1)),
      z: Number((base.z * (designScale.z / 100)).toFixed(1)),
    };
  }, [selectedFile, designScale]);

  // Effective Volume based on 3-axis scaling
  const effectiveVolume = useMemo(() => {
    const baseVol = selectedFile?.volumeCm3 || 45.0;
    const scaleFactor = (designScale.x / 100) * (designScale.y / 100) * (designScale.z / 100);
    return Number((baseVol * scaleFactor).toFixed(1));
  }, [selectedFile, designScale]);

  // Slicing Quotation Mathematics
  const quotation = useMemo(() => {
    const vol = effectiveVolume;
    const height = effectiveDims.z;
    const density = activeMaterial.density;
    const costPerGram = activeMaterial.costPerGram;

    // Mass in grams: shell accounts for wall loops, core scales with infill
    const infillFraction = infill / 100;
    const shellFraction = Math.min(0.55, 0.07 * wallLoops);
    const effectiveFactor = infillFraction === 1.0 ? 1.0 : shellFraction + (1.0 - shellFraction) * infillFraction;
    const massGrams = Number((vol * effectiveFactor * density).toFixed(1));

    // Machine time heuristic in hours
    const layerFactor = LAYER_RESOLUTIONS.find((l) => l.id === layerHeight)?.speedFactor || 1.0;
    const rawHours = (vol * infillFraction * 0.45) / 10 + height * 0.05;
    const estimatedHours = Number((rawHours * layerFactor).toFixed(2));

    // Additional post-processing costs in INR
    let postProcessingCost = 0;
    if (postProcessing.acetoneVapor) postProcessingCost += 350;
    if (postProcessing.heatTreatAnneal) postProcessingCost += 480;
    if (postProcessing.ultrasonicClean) postProcessingCost += 280;
    if (postProcessing.supportRemoval) postProcessingCost += 150;

    // Priority expedite fee in INR
    const priorityFee = priorityMode === "EXPRESS" ? 450 : 0;

    // Pricing components (in INR ₹)
    const materialCost = massGrams * costPerGram * 3.0; // 3.0x markup
    const machineCost = estimatedHours * 210; // ₹210/hr
    const setupFee = 420; // ₹420 calibration & setup
    const totalPrice = Math.round(
      materialCost + machineCost + setupFee + postProcessingCost + priorityFee
    );

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
      postProcessingCost,
      priorityFee,
      totalPrice,
    };
  }, [
    effectiveVolume,
    effectiveDims.z,
    activeMaterial,
    infill,
    wallLoops,
    layerHeight,
    postProcessing,
    priorityMode,
  ]);

  // CAD Dimension & Scale Handlers
  const handleUniformScaleChange = (newScalePct) => {
    const clamped = Math.max(25, Math.min(300, newScalePct));
    setDesignScale({ x: clamped, y: clamped, z: clamped });
  };

  const handleDimensionMmChange = (axis, newMm) => {
    const base = selectedFile?.dimensions || { x: 80, y: 60, z: 40 };
    const baseVal = base[axis] || 50;
    const newPct = Math.max(25, Math.min(300, Math.round((newMm / baseVal) * 100)));

    if (isUniformScale) {
      setDesignScale({ x: newPct, y: newPct, z: newPct });
    } else {
      setDesignScale((prev) => ({ ...prev, [axis]: newPct }));
    }
  };

  const handleRotateAxis = (axis, deltaDegrees) => {
    sound.playClick();
    setRotation((prev) => ({
      ...prev,
      [axis]: (prev[axis] + deltaDegrees + 360) % 360,
    }));
  };

  const handleAutoOrientLayFlat = () => {
    sound.playSuccess();
    const base = selectedFile?.dimensions || { x: 80, y: 60, z: 40 };
    if (base.z > base.x || base.z > base.y) {
      setRotation({ x: 90, y: 0, z: 0 });
    } else {
      setRotation({ x: 0, y: 0, z: 0 });
    }
    addToast({
      title: "Auto-Orient Applied",
      message: "Model re-oriented to planar bed: minimal support material & maximum build adhesion.",
      type: "info",
    });
  };

  const handleResetCadSpecs = () => {
    sound.playClick();
    setDesignScale({ x: 100, y: 100, z: 100 });
    setRotation({ x: 0, y: 0, z: 0 });
    setWallLoops(3);
    setIsMirroredX(false);
    setIsMirroredY(false);
    setCustomModelName("");
    addToast({
      title: "CAD Geometry Reset",
      message: "Restored 1:1 original blueprint dimensions and standard orientation.",
      type: "info",
    });
  };

  // Load sample model
  const handleLoadSample = (sample) => {
    sound.playClick();
    setUploadedFileBuffer(null);
    setSelectedFile({
      name: sample.name,
      sizeMB: sample.sizeMB,
      dimensions: sample.dimensions,
      volumeCm3: sample.volumeCm3,
      source: `Industrial Preset // ${sample.title}`,
    });
    setDesignScale({ x: 100, y: 100, z: 100 });
    setRotation({ x: 0, y: 0, z: 0 });
    setWallLoops(3);
    setIsMirroredX(false);
    setIsMirroredY(false);
    setCustomModelName("");
    setIsEditorOpen(true);

    setTechnology(sample.technology);
    setMaterialId(sample.materialId);
    setLayerProgress(100);
    addToast({
      title: "Sample Model Loaded",
      message: `${sample.title} (${sample.dimensions.x}×${sample.dimensions.y}×${sample.dimensions.z}mm) configured into slicer & CAD Editor.`,
      type: "info",
    });
  };

  // File Upload Handlers (.STL, .STEP, .OBJ)
  const processUploadedFile = (file) => {
    if (!file) return;
    sound.playChirp();
    const extension = file.name.split(".").pop().toLowerCase();
    const sizeInMB = Number((file.size / (1024 * 1024)).toFixed(2));

    const baseDimension = Math.max(30, Math.min(220, Math.round(Math.sqrt(file.size / 1024) * 2.8)));
    const x = Math.round(baseDimension * 1.1);
    const y = Math.round(baseDimension * 0.85);
    const z = Math.round(baseDimension * 0.5);
    const volumeCm3 = Number(((x * y * z * 0.24) / 1000).toFixed(1));

    if (extension === "stl") {
      file.arrayBuffer().then((buffer) => {
        setUploadedFileBuffer(buffer);
      }).catch(() => {
        setUploadedFileBuffer(null);
      });
    } else {
      setUploadedFileBuffer(null);
    }

    setSelectedFile({
      name: file.name,
      sizeMB: sizeInMB || 0.45,
      dimensions: { x, y, z },
      volumeCm3: Math.max(8.0, volumeCm3),
      extension: `.${extension}`,
    });
    setDesignScale({ x: 100, y: 100, z: 100 });
    setRotation({ x: 0, y: 0, z: 0 });
    setWallLoops(3);
    setIsMirroredX(false);
    setIsMirroredY(false);
    setCustomModelName("");
    setIsEditorOpen(true);
    setLayerProgress(100);
    setSuccessNotification(null);

    addToast({
      title: "CAD Geometry Ingested",
      message: `${file.name} successfully parsed: ${x}×${y}×${z} mm bounds computed. Interactive 3D WebGL preview ready.`,
      type: "success",
    });
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
    sound.playClick();
    setSelectedFile(null);
    setUploadedFileBuffer(null);
    setDesignScale({ x: 100, y: 100, z: 100 });
    setRotation({ x: 0, y: 0, z: 0 });
    setCustomModelName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Order Submission Handler
  const handleTransmitOrder = () => {
    sound.playSuccess();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newOrderId = `NX-${randomSuffix}`;
    const activeFileName = customModelName.trim() || selectedFile?.name || "unnamed_cad_part.stl";

    const newOrderPayload = {
      id: newOrderId,
      client: "Client Direct",
      filename: activeFileName,
      volumeCm3: effectiveVolume,
      dimensions: effectiveDims,
      scale: designScale,
      rotation,
      wallLoops,
      technology,
      material: activeMaterial.name,
      infill,
      infillPattern,
      layerHeight: Number(layerHeight),
      priorityMode,
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

    addToast({
      title: "Order Transmitted to Fleet",
      message: `Order #${newOrderId} scheduled on ${newOrderPayload.assignedPrinter} (${activeMaterial.name})`,
      type: "success",
      orderId: newOrderId,
    });
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
    sound.playClick();
    if (searchQuery.trim()) {
      setActiveTrackingId(searchQuery.trim().toUpperCase());
    }
  };

  // Export digital inspection spec as JSON
  const handleDownloadSpec = (order) => {
    sound.playClick();
    const spec = {
      standard: "ISO/ASTM 52900",
      orderId: order.id,
      client: order.client,
      partFilename: order.filename,
      technology: order.technology,
      material: order.material,
      dimensionsMm: order.dimensions,
      volumeCm3: order.volumeCm3,
      infillPercentage: order.infill,
      layerHeightMm: order.layerHeight,
      productionFacility: "NEXUS INDUSTRIAL RIG CLUSTER",
      assignedMachine: order.assignedPrinter,
      status: order.status,
      timestamp: new Date().toISOString(),
      digitalSignOff: "VERIFIED_QC_PASS_ISO52900",
    };

    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NEXUS_SPEC_${order.id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({
      title: "QC Specification Exported",
      message: `Digital inspection sheet for ${order.id} downloaded.`,
      type: "info",
      orderId: order.id,
    });
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
            onClick={() => {
              sound.playClick();
              setActiveTab("slice");
            }}
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
            onClick={() => {
              sound.playClick();
              setActiveTab("telemetry");
            }}
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
                  sound.playClick();
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

                {/* 1-Click Sample Model Presets */}
                <div className="mt-4 pt-4 border-t border-[#222222]">
                  <span className="font-mono text-[10px] text-[#71717A] uppercase tracking-wider block mb-2">
                    OR QUICK-LOAD VERIFIED TEST GEOMETRY:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_MODELS.map((sample) => (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() => handleLoadSample(sample)}
                        className="bg-[#111111] hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#FF5A00] p-2 text-left rounded-[1px] transition-all cursor-pointer group"
                      >
                        <span className="text-base block mb-1">{sample.icon}</span>
                        <span className="font-mono text-[10px] text-white group-hover:text-[#FF5A00] font-semibold block truncate">
                          {sample.title}
                        </span>
                        <span className="font-mono text-[9px] text-[#71717A] block">
                          [{sample.technology}]
                        </span>
                      </button>
                    ))}
                  </div>
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

                    {/* Industrial Interactive 3D WebGL Viewport */}
                    <div className="relative">
                      <ModelViewer3D
                        modelType={selectedFile.source || selectedFile.name}
                        fileName={selectedFile.name}
                        fileBuffer={uploadedFileBuffer}
                        dimensions={effectiveDims}
                        scale={designScale}
                        rotation={rotation}
                        isMirroredX={isMirroredX}
                        isMirroredY={isMirroredY}
                        materialId={materialId}
                        technology={technology}
                        layerProgress={layerProgress}
                        infill={infill}
                        infillPattern={infillPattern}
                        onLayerChange={(p) => setLayerProgress(p)}
                        height="340px"
                        showControls={true}
                        interactive={true}
                      />
                    </div>

                    {/* ═════════════════════════════════════════════════════════
                        CAD GEOMETRY & DIMENSION EDITOR PANEL
                    ═════════════════════════════════════════════════════════ */}
                    <div className="border border-[#333333] bg-[#141414] rounded-[1px] overflow-hidden">
                      {/* Accordion Toggle Header */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setIsEditorOpen(!isEditorOpen);
                        }}
                        className="w-full bg-[#181818] hover:bg-[#202020] border-b border-[#262626] p-3 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">✏️</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-[#FF5A00] font-bold uppercase tracking-wider">
                                CAD DESIGN &amp; DIMENSION EDITOR
                              </span>
                              <span className="font-mono text-[9px] bg-[#FF5A00]/15 text-[#FF5A00] border border-[#FF5A00]/30 px-1.5 py-0.2 rounded-[1px] font-semibold">
                                {designScale.x !== 100 || designScale.y !== 100 || designScale.z !== 100
                                  ? `SCALED ${designScale.x}%`
                                  : "1:1 CAD SCALE"}
                              </span>
                            </div>
                            <span className="font-sans text-[11px] text-[#A1A1AA]">
                              Uniform scaling, mm bounds, orientation &amp; perimeter loops
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-[#A1A1AA]">
                          {isEditorOpen ? "[ COLLAPSE ▲ ]" : "[ EDIT DESIGN ✏️ ▼ ]"}
                        </span>
                      </button>

                      {isEditorOpen && (
                        <div className="p-4 space-y-4 font-mono animate-fade-in">
                          {/* 1. Dimension Scaling Suite */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full" />
                                1. SCALE &amp; ENVELOPE DIMENSIONS (MM)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  setIsUniformScale(!isUniformScale);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded-[1px] border font-semibold uppercase transition-colors ${
                                  isUniformScale
                                    ? "bg-[#FF5A00]/15 text-[#FF5A00] border-[#FF5A00]"
                                    : "bg-[#222222] text-[#A1A1AA] border-[#333333] hover:text-white"
                                }`}
                              >
                                {isUniformScale ? "🔒 UNIFORM (LOCKED)" : "🔓 INDEPENDENT"}
                              </button>
                            </div>

                            {/* Scale Slider & Presets */}
                            <div className="bg-[#111111] border border-[#262626] p-3 rounded-[1px] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#A1A1AA] text-[10px] uppercase">
                                  GLOBAL SCALE FACTOR:
                                </span>
                                <span className="text-white font-black text-sm">
                                  {designScale.x}%
                                </span>
                              </div>

                              <input
                                type="range"
                                min="25"
                                max="300"
                                step="5"
                                value={designScale.x}
                                onChange={(e) => handleUniformScaleChange(Number(e.target.value))}
                                className="w-full accent-[#FF5A00] cursor-pointer h-1.5 bg-[#222222] rounded-none"
                              />

                              <div className="flex flex-wrap gap-1 pt-1">
                                {[50, 75, 100, 125, 150, 200].map((pct) => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => handleUniformScaleChange(pct)}
                                    className={`text-[9px] px-2 py-0.5 rounded-[1px] border transition-colors ${
                                      designScale.x === pct && isUniformScale
                                        ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                                        : "bg-[#181818] text-[#A1A1AA] border-[#2E2E2E] hover:text-white"
                                    }`}
                                  >
                                    {pct}%{pct === 100 ? " (1:1)" : ""}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 3-Axis Millimeter Inputs */}
                            <div className="grid grid-cols-3 gap-2">
                              {/* X Axis */}
                              <div className="bg-[#111111] border border-[#262626] p-2 rounded-[1px]">
                                <div className="flex justify-between items-center text-[10px] mb-1">
                                  <span className="text-[#FF5A00] font-bold">X (WIDTH):</span>
                                  <span className="text-[#71717A] text-[9px]">{designScale.x}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="5"
                                    max="600"
                                    value={effectiveDims.x}
                                    onChange={(e) =>
                                      handleDimensionMmChange("x", parseFloat(e.target.value) || 1)
                                    }
                                    className="w-full bg-[#161616] border border-[#333333] text-white px-1.5 py-1 text-xs font-bold rounded-[1px] focus:border-[#FF5A00] outline-none"
                                  />
                                  <span className="text-[#71717A] text-[9px]">mm</span>
                                </div>
                                <span className="text-[8px] text-[#71717A] block mt-0.5">
                                  Orig: {selectedFile.dimensions?.x || 80}mm
                                </span>
                              </div>

                              {/* Y Axis */}
                              <div className="bg-[#111111] border border-[#262626] p-2 rounded-[1px]">
                                <div className="flex justify-between items-center text-[10px] mb-1">
                                  <span className="text-[#38BDF8] font-bold">Y (DEPTH):</span>
                                  <span className="text-[#71717A] text-[9px]">{designScale.y}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="5"
                                    max="600"
                                    value={effectiveDims.y}
                                    onChange={(e) =>
                                      handleDimensionMmChange("y", parseFloat(e.target.value) || 1)
                                    }
                                    className="w-full bg-[#161616] border border-[#333333] text-white px-1.5 py-1 text-xs font-bold rounded-[1px] focus:border-[#38BDF8] outline-none"
                                  />
                                  <span className="text-[#71717A] text-[9px]">mm</span>
                                </div>
                                <span className="text-[8px] text-[#71717A] block mt-0.5">
                                  Orig: {selectedFile.dimensions?.y || 60}mm
                                </span>
                              </div>

                              {/* Z Axis */}
                              <div className="bg-[#111111] border border-[#262626] p-2 rounded-[1px]">
                                <div className="flex justify-between items-center text-[10px] mb-1">
                                  <span className="text-[#22C55E] font-bold">Z (HEIGHT):</span>
                                  <span className="text-[#71717A] text-[9px]">{designScale.z}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="5"
                                    max="600"
                                    value={effectiveDims.z}
                                    onChange={(e) =>
                                      handleDimensionMmChange("z", parseFloat(e.target.value) || 1)
                                    }
                                    className="w-full bg-[#161616] border border-[#333333] text-white px-1.5 py-1 text-xs font-bold rounded-[1px] focus:border-[#22C55E] outline-none"
                                  />
                                  <span className="text-[#71717A] text-[9px]">mm</span>
                                </div>
                                <span className="text-[8px] text-[#71717A] block mt-0.5">
                                  Orig: {selectedFile.dimensions?.z || 40}mm
                                </span>
                              </div>
                            </div>

                            {/* Live Calculated Telemetry */}
                            <div className="bg-[#0A0A0A] border border-[#222222] p-2 rounded-[1px] flex flex-wrap items-center justify-between gap-2 text-[10px]">
                              <div>
                                <span className="text-[#71717A]">EFFECTIVE VOLUME: </span>
                                <span className="text-[#FF5A00] font-bold">{effectiveVolume} cm³</span>
                              </div>
                              <div>
                                <span className="text-[#71717A]">EST. MASS: </span>
                                <span className="text-white font-bold">{quotation.massGrams} g</span>
                              </div>
                              <div>
                                <span className="text-[#71717A]">RUN TIME: </span>
                                <span className="text-[#22C55E] font-bold">{quotation.durationFormatted}</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Orientation & Bed Alignment Suite */}
                          <div className="space-y-2 border-t border-[#262626] pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-[#38BDF8] rounded-full" />
                                2. ROTATION &amp; BED ALIGNMENT
                              </span>
                              <span className="text-[9px] text-[#71717A]">
                                ROT: [{rotation.x}°, {rotation.y}°, {rotation.z}°]
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {/* Pitch X */}
                              <div className="bg-[#111111] border border-[#262626] p-1.5 rounded-[1px] flex items-center justify-between">
                                <span className="text-[9px] text-[#A1A1AA]">X:</span>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRotateAxis("x", -90)}
                                    className="px-1 py-0.5 bg-[#1C1C1C] hover:bg-[#282828] text-white text-[9px] border border-[#333333] rounded-[1px]"
                                  >
                                    -90°
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRotateAxis("x", 90)}
                                    className="px-1 py-0.5 bg-[#1C1C1C] hover:bg-[#282828] text-white text-[9px] border border-[#333333] rounded-[1px]"
                                  >
                                    +90°
                                  </button>
                                </div>
                              </div>

                              {/* Roll Y */}
                              <div className="bg-[#111111] border border-[#262626] p-1.5 rounded-[1px] flex items-center justify-between">
                                <span className="text-[9px] text-[#A1A1AA]">Y:</span>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRotateAxis("y", -90)}
                                    className="px-1 py-0.5 bg-[#1C1C1C] hover:bg-[#282828] text-white text-[9px] border border-[#333333] rounded-[1px]"
                                  >
                                    -90°
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRotateAxis("y", 90)}
                                    className="px-1 py-0.5 bg-[#1C1C1C] hover:bg-[#282828] text-white text-[9px] border border-[#333333] rounded-[1px]"
                                  >
                                    +90°
                                  </button>
                                </div>
                              </div>

                              {/* Yaw Z */}
                              <div className="bg-[#111111] border border-[#262626] p-1.5 rounded-[1px] flex items-center justify-between">
                                <span className="text-[9px] text-[#A1A1AA]">Z:</span>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRotateAxis("z", -45)}
                                    className="px-1 py-0.5 bg-[#1C1C1C] hover:bg-[#282828] text-white text-[9px] border border-[#333333] rounded-[1px]"
                                  >
                                    -45°
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRotateAxis("z", 45)}
                                    className="px-1 py-0.5 bg-[#1C1C1C] hover:bg-[#282828] text-white text-[9px] border border-[#333333] rounded-[1px]"
                                  >
                                    +45°
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Auto-Orient & Mirror buttons */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={handleAutoOrientLayFlat}
                                className="flex-1 bg-[#1A1A1A] hover:bg-[#242424] text-[#38BDF8] border border-[#38BDF8]/40 hover:border-[#38BDF8] py-1.5 px-2 text-[10px] font-bold uppercase rounded-[1px] transition-colors"
                              >
                                📐 AUTO-ORIENT / LAY FLAT
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  setIsMirroredX(!isMirroredX);
                                }}
                                className={`px-2.5 py-1 text-[9px] font-semibold border rounded-[1px] uppercase transition-colors ${
                                  isMirroredX
                                    ? "bg-[#FF5A00] text-black border-[#FF5A00]"
                                    : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white"
                                }`}
                              >
                                🪞 FLIP X
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  setIsMirroredY(!isMirroredY);
                                }}
                                className={`px-2.5 py-1 text-[9px] font-semibold border rounded-[1px] uppercase transition-colors ${
                                  isMirroredY
                                    ? "bg-[#FF5A00] text-black border-[#FF5A00]"
                                    : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white"
                                }`}
                              >
                                🪞 FLIP Y
                              </button>
                            </div>
                          </div>

                          {/* 3. Structural Shell & Perimeter Loops */}
                          <div className="space-y-2 border-t border-[#262626] pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
                                3. WALL PERIMETER LOOPS
                              </span>
                              <span className="text-[9px] text-[#A1A1AA]">
                                {wallLoops} WALL SHELLS ({(wallLoops * 0.4).toFixed(1)}mm SOLID SHELL)
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { count: 2, label: "2 WALLS", note: "Light" },
                                { count: 3, label: "3 WALLS", note: "Standard" },
                                { count: 4, label: "4 WALLS", note: "Structural" },
                                { count: 6, label: "6 WALLS", note: "Solid" },
                              ].map((w) => (
                                <button
                                  key={w.count}
                                  type="button"
                                  onClick={() => {
                                    sound.playClick();
                                    setWallLoops(w.count);
                                  }}
                                  className={`p-1 text-center border rounded-[1px] transition-colors ${
                                    wallLoops === w.count
                                      ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E] font-bold"
                                      : "bg-[#111111] text-[#A1A1AA] border-[#2A2A2A] hover:text-white"
                                  }`}
                                >
                                  <span className="block text-[9px] font-bold">{w.label}</span>
                                  <span className="block text-[8px] opacity-75">{w.note}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 4. Custom Model Name / Revision Tag */}
                          <div className="space-y-1 border-t border-[#262626] pt-3">
                            <span className="text-[9px] text-[#A1A1AA] uppercase block">
                              CUSTOM MODEL DESIGNATION / REVISION:
                            </span>
                            <input
                              type="text"
                              value={customModelName}
                              placeholder={selectedFile.name}
                              onChange={(e) => setCustomModelName(e.target.value)}
                              className="w-full bg-[#111111] border border-[#333333] text-white px-2.5 py-1 text-xs rounded-[1px] focus:border-[#FF5A00] outline-none"
                            />
                          </div>

                          {/* Reset to Original CAD Specs Button */}
                          <div className="border-t border-[#262626] pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={handleResetCadSpecs}
                              className="bg-[#1C1C1C] hover:bg-[#282828] text-[#A1A1AA] hover:text-white border border-[#333333] px-2.5 py-1 text-[9px] font-bold uppercase rounded-[1px] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>↺</span>
                              <span>[ RESTORE ORIGINAL CAD SPECS ]</span>
                            </button>
                          </div>
                        </div>
                      )}
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
                    // NO CAD MODEL LOADED. SELECT A SAMPLE PRESET ABOVE OR DRAG A FILE TO COMMENCE GEOMETRY EXTRACTION.
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
                  <span className="text-[#22C55E] uppercase font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
                    LIVE ALGORITHM ACTIVE
                  </span>
                </div>

                {/* Extrusion Technology Selector */}
                <div className="space-y-2">
                  <label className="font-mono text-xs text-[#A1A1AA] uppercase tracking-wider block">
                    MANUFACTURING PROCESS / TECHNOLOGY:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TECHNOLOGIES.map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => handleTechnologyChange(tech.id)}
                        className={`p-3.5 border rounded-[1px] text-left transition-colors cursor-pointer ${
                          technology === tech.id
                            ? "border-[#FF5A00] bg-[#FF5A00]/10"
                            : "border-[#333333] bg-[#111111] hover:border-[#555555]"
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-xs font-bold">
                          <span className={technology === tech.id ? "text-[#FF5A00]" : "text-white"}>
                            {tech.label}
                          </span>
                          {technology === tech.id && (
                            <span className="w-2 h-2 bg-[#FF5A00] rounded-full" />
                          )}
                        </div>
                        <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                          {tech.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Material Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label className="text-[#A1A1AA] uppercase tracking-wider">
                      BASE POLYMER / RESIN STOCK:
                    </label>
                    <span className="text-[#FF5A00] font-bold">
                      {formatINR(activeMaterial.costPerGram)}/g
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BASE_MATERIALS.filter((m) => m.technology === technology).map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setMaterialId(mat.id);
                        }}
                        className={`p-3 border rounded-[1px] text-left transition-colors cursor-pointer ${
                          materialId === mat.id
                            ? "border-[#FF5A00] bg-[#FF5A00]/10"
                            : "border-[#333333] bg-[#111111] hover:border-[#555555]"
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-xs font-semibold">
                          <span className="text-white flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: mat.color }}
                            />
                            {mat.name}
                          </span>
                          <span className="text-[#71717A] text-[10px]">
                            {mat.density} g/cm³
                          </span>
                        </div>
                        <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-tight line-clamp-1">
                          {mat.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infill Density Slider & Pattern Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#262626] pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center font-mono text-xs">
                      <label className="text-[#A1A1AA] uppercase tracking-wider">
                        INTERNAL INFILL DENSITY:
                      </label>
                      <span className="text-[#FF5A00] font-bold text-sm">{infill}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={infill}
                      onChange={(e) => {
                        sound.playChirp();
                        setInfill(Number(e.target.value));
                      }}
                      className="w-full accent-[#FF5A00] cursor-pointer h-1.5 bg-[#222222] rounded-none"
                    />
                    <div className="flex justify-between font-mono text-[9px] text-[#71717A]">
                      <span>10% (LIGHTWEIGHT)</span>
                      <span>40% (STANDARD)</span>
                      <span>100% (SOLID)</span>
                    </div>
                  </div>

                  {/* Infill Pattern Selector */}
                  <div className="space-y-2">
                    <label className="font-mono text-xs text-[#A1A1AA] uppercase tracking-wider block">
                      GEOMETRIC PATTERN:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {INFILL_PATTERNS.map((pat) => (
                        <button
                          key={pat.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setInfillPattern(pat.id);
                          }}
                          className={`px-2 py-1.5 font-mono text-[10px] border rounded-[1px] uppercase transition-colors text-left truncate ${
                            infillPattern === pat.id
                              ? "border-[#FF5A00] bg-[#FF5A00]/10 text-[#FF5A00] font-bold"
                              : "border-[#333333] bg-[#111111] text-[#A1A1AA] hover:text-white"
                          }`}
                          title={pat.desc}
                        >
                          {pat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Layer Height Resolution */}
                <div className="space-y-2 border-t border-[#262626] pt-4">
                  <label className="font-mono text-xs text-[#A1A1AA] uppercase tracking-wider block">
                    Z-AXIS SLICE RESOLUTION:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LAYER_RESOLUTIONS.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setLayerHeight(res.id);
                        }}
                        className={`p-2.5 border rounded-[1px] text-center font-mono transition-colors cursor-pointer ${
                          layerHeight === res.id
                            ? "border-[#FF5A00] bg-[#FF5A00]/10 text-[#FF5A00] font-bold"
                            : "border-[#333333] bg-[#111111] text-[#A1A1AA] hover:text-white"
                        }`}
                      >
                        <span className="text-xs block">{res.label}</span>
                        <span className="text-[9px] text-[#71717A] block mt-0.5">{res.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Production Priority Tier */}
                <div className="space-y-2 border-t border-[#262626] pt-4">
                  <label className="font-mono text-xs text-[#A1A1AA] uppercase tracking-wider block">
                    MANUFACTURING PRIORITY &amp; DISPATCH SLA:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setPriorityMode("STANDARD");
                      }}
                      className={`p-3 border rounded-[1px] text-left transition-colors cursor-pointer ${
                        priorityMode === "STANDARD"
                          ? "border-[#FF5A00] bg-[#FF5A00]/10"
                          : "border-[#333333] bg-[#111111] hover:border-[#555555]"
                      }`}
                    >
                      <div className="flex justify-between items-center font-mono text-xs font-bold text-white">
                        <span>STANDARD DISPATCH (48H)</span>
                        <span className="text-[#22C55E]">INCLUDED</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                        Scheduled into optimal multi-part fleet batch cycles.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setPriorityMode("EXPRESS");
                      }}
                      className={`p-3 border rounded-[1px] text-left transition-colors cursor-pointer ${
                        priorityMode === "EXPRESS"
                          ? "border-[#FF5A00] bg-[#FF5A00]/10"
                          : "border-[#333333] bg-[#111111] hover:border-[#555555]"
                      }`}
                    >
                      <div className="flex justify-between items-center font-mono text-xs font-bold text-white">
                        <span className="text-[#FF5A00]">⚡ EXPRESS OVERNIGHT (24H)</span>
                        <span className="text-[#FF5A00] font-mono">+₹450</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                        Priority queue preemption &amp; immediate hotend preheat.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Post-Processing Options */}
                <div className="space-y-2 border-t border-[#262626] pt-4">
                  <label className="font-mono text-xs text-[#A1A1AA] uppercase tracking-wider block">
                    POST-FABRICATION PROTOCOLS:
                  </label>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <label className="flex items-center gap-2 p-2 border border-[#262626] bg-[#111111] rounded-[1px] cursor-pointer hover:border-[#444444]">
                      <input
                        type="checkbox"
                        checked={postProcessing.supportRemoval}
                        onChange={(e) =>
                          setPostProcessing((prev) => ({ ...prev, supportRemoval: e.target.checked }))
                        }
                        className="accent-[#FF5A00]"
                      />
                      <span className="text-white text-[11px]">Precision Support Removal (+₹150)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-[#262626] bg-[#111111] rounded-[1px] cursor-pointer hover:border-[#444444]">
                      <input
                        type="checkbox"
                        checked={postProcessing.ultrasonicClean}
                        onChange={(e) =>
                          setPostProcessing((prev) => ({ ...prev, ultrasonicClean: e.target.checked }))
                        }
                        className="accent-[#FF5A00]"
                      />
                      <span className="text-white text-[11px]">IPA Ultrasonic Bath (+₹280)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-[#262626] bg-[#111111] rounded-[1px] cursor-pointer hover:border-[#444444]">
                      <input
                        type="checkbox"
                        checked={postProcessing.heatTreatAnneal}
                        onChange={(e) =>
                          setPostProcessing((prev) => ({ ...prev, heatTreatAnneal: e.target.checked }))
                        }
                        className="accent-[#FF5A00]"
                      />
                      <span className="text-white text-[11px]">Thermal Oven Anneal (+₹480)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 border border-[#262626] bg-[#111111] rounded-[1px] cursor-pointer hover:border-[#444444]">
                      <input
                        type="checkbox"
                        checked={postProcessing.acetoneVapor}
                        onChange={(e) =>
                          setPostProcessing((prev) => ({ ...prev, acetoneVapor: e.target.checked }))
                        }
                        className="accent-[#FF5A00]"
                      />
                      <span className="text-white text-[11px]">Vapor Polish Smoothing (+₹350)</span>
                    </label>
                  </div>
                </div>

                {/* ── HIGH-CONTRAST COMMERCIAL QUOTATION ENGINE ───────── */}
                <div className="bg-[#EAEAEA] text-[#111111] p-6 rounded-[1px] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#CCCCCC] pb-2 font-mono text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#111111]">
                      // DYNAMIC SOURCING QUOTATION
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                      className="text-[#FF5A00] font-bold hover:underline cursor-pointer"
                    >
                      {showCostBreakdown ? "[ HIDE FORMULA ]" : "[ VIEW PRICING FORMULA ℹ ]"}
                    </button>
                  </div>

                  {/* Pricing Formula Breakdown Drawer */}
                  {showCostBreakdown && (
                    <div className="bg-white p-3 border border-[#CCCCCC] rounded-[1px] font-mono text-[11px] space-y-1.5 animate-fade-in text-[#222222]">
                      <div className="flex justify-between">
                        <span>Mass Material Component:</span>
                        <span>{quotation.massGrams}g × {formatINR(activeMaterial.costPerGram)}/g × 3.0 = <strong>{formatINR(quotation.materialCost)}</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Machine Run Time:</span>
                        <span>{quotation.estimatedHours} hrs × ₹210/hr = <strong>{formatINR(quotation.machineCost)}</strong></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Optical Calibration &amp; Bed Setup:</span>
                        <span><strong>{formatINR(quotation.setupFee)}</strong></span>
                      </div>
                      {quotation.priorityFee > 0 && (
                        <div className="flex justify-between text-[#FF5A00]">
                          <span>Express 24h Priority Surcharge:</span>
                          <span><strong>+{formatINR(quotation.priorityFee)}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Metrics 3-Pillar Cluster */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="font-mono text-[10px] text-[#666666] uppercase block">
                        PART MASS:
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#111111] block">
                        {quotation.massGrams} <span className="text-xs font-normal">g</span>
                      </span>
                      <span className="font-mono text-[9px] text-[#777777]">
                        @ {infill}% {infillPattern}
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-[#666666] uppercase block">
                        MACHINE TIME:
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#111111] block">
                        {quotation.durationFormatted}
                      </span>
                      <span className="font-mono text-[9px] text-[#777777]">
                        ≈ {quotation.estimatedHours}h
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-[#666666] uppercase block">
                        TOTAL ESTIMATE:
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#FF5A00] block">
                        {formatINR(quotation.totalPrice)}
                      </span>
                      <span className="font-mono text-[9px] text-[#22C55E] font-bold">
                        {priorityMode === "EXPRESS" ? "DISPATCH IN 24H" : "DISPATCH IN 48H"}
                      </span>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="border-t border-[#CCCCCC] pt-3 flex flex-wrap items-center justify-between font-mono text-[11px] text-[#555555]">
                    <span>Material: {formatINR(quotation.materialCost)}</span>
                    <span>Machine: {formatINR(quotation.machineCost)}</span>
                    <span>Setup &amp; Prep: {formatINR(quotation.setupFee)}</span>
                  </div>
                </div>

                {/* Primary CTA Order Button */}
                <button
                  type="button"
                  id="btn-transmit-order"
                  onClick={handleTransmitOrder}
                  className="w-full bg-[#FF5A00] hover:bg-[#D94D00] text-black font-mono text-sm uppercase font-bold py-4 px-6 rounded-[1px] transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 tracking-wider"
                >
                  <span>[ TRANSMIT TO PRODUCTION QUEUE — {formatINR(quotation.totalPrice)} ]</span>
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
                className="bg-[#FF5A00] hover:bg-[#D94D00] text-black font-mono text-xs uppercase font-bold px-6 py-3 rounded-[1px] transition-colors cursor-pointer tracking-wider flex items-center justify-center gap-2"
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
                    sound.playClick();
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

                {/* Pill Status Badge & Open External Tracking */}
                <div className="flex items-center gap-3">
                  <a
                    href={`#/track?id=${searchedOrder.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-[#FF5A00] hover:text-white bg-[#FF5A00]/10 hover:bg-[#FF5A00]/20 border border-[#FF5A00]/30 px-3 py-1.5 rounded-[1px] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>[ ↗ STANDALONE VIEW ]</span>
                  </a>

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

              {/* 4-Stage Industrial Timeline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {[
                  { step: "01", name: "CAD VALIDATED", done: true },
                  { step: "02", name: "SLICED & PREPPED", done: searchedOrder.progress >= 20 },
                  { step: "03", name: "ACTIVE EXTRUSION", done: searchedOrder.progress >= 50 },
                  { step: "04", name: "QC INSPECTED & READY", done: searchedOrder.progress >= 100 },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`p-2.5 border rounded-[1px] font-mono text-[10px] ${
                      s.done
                        ? "border-[#22C55E]/40 bg-[#22C55E]/5 text-white"
                        : "border-[#262626] bg-[#111111] text-[#71717A]"
                    }`}
                  >
                    <span className="block text-[9px] text-[#71717A]">PHASE {s.step}</span>
                    <span className="font-bold block mt-0.5">{s.name}</span>
                    <span className="text-[9px] mt-1 block">
                      {s.done ? "✓ VERIFIED" : "PENDING"}
                    </span>
                  </div>
                ))}
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

              {/* Action Buttons for Telemetry View */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => handleDownloadSpec(searchedOrder)}
                  className="font-mono text-xs text-white bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] hover:border-[#FF5A00] px-4 py-2 rounded-[1px] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>[ 📄 DOWNLOAD DIGITAL INSPECTION SPEC (.JSON) ]</span>
                </button>

                <div className="font-mono text-[10px] text-[#71717A]">
                  AUDIT STANDARD: <span className="text-white">ISO/ASTM 52900</span>
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
                  sound.playClick();
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

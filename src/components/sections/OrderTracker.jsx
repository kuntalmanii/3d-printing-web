/**
 * OrderTracker.jsx
 * ───────────────────────────────────────────────────────────────
 * Customer-Facing Additive Manufacturing Order Tracking Dashboard:
 *  - Dark industrial theme (#111111 base, 1px #333333 borders, #FF5A00 accents)
 *  - Monospace search bar: "[ ENTER TRACKING ID: e.g. NX-88492 ]" + "[ TRACE PART ]"
 *  - 5-step visual pipeline:
 *      1. [ MESH VERIFIED ]
 *      2. [ SLICED & G-CODE GENERATED ]
 *      3. [ BED EXTRUSION IN PROGRESS ]
 *      4. [ WASH / CURE / POST-PROCESSING ]
 *      5. [ DISPATCHED & EN ROUTE ]
 *  - Active stage in glowing #FF5A00; completed in #FFFFFF with checkmark; upcoming in #333333
 *  - Live Telemetry Readout Box (with animated thermal micro-jitter and dynamic progress)
 *  - Interactive stage simulator buttons for instant testing of all 5 states
 *  - Direct integration with backend API (GET /api/orders/:id) with automatic offline fallback
 */

import { useState, useEffect, useMemo } from "react";
import { formatINR } from "../../data/mockData";

// ─────────────────────────────────────────────────────────────
// STAGE DEFINITIONS & METADATA
// ─────────────────────────────────────────────────────────────
const STAGES = [
  {
    step: 1,
    id: "MESH_VERIFIED",
    shortLabel: "01. MESH",
    title: "MESH VERIFIED",
    subtext: "Watertightness & manifold geometric integrity confirmed",
    timestampOffset: "Oct 19, 09:12 UTC",
  },
  {
    step: 2,
    id: "SLICED_GCODE",
    shortLabel: "02. SLICED",
    title: "SLICED & G-CODE GENERATED",
    subtext: "Adaptive layer heights & Gyroid infill toolpaths mapped",
    timestampOffset: "Oct 19, 09:28 UTC",
  },
  {
    step: 3,
    id: "BED_EXTRUSION",
    shortLabel: "03. EXTRUDING",
    title: "BED EXTRUSION IN PROGRESS",
    subtext: "Direct-drive active thermoplastic deposition on build plate",
    timestampOffset: "Oct 19, 10:05 UTC (ACTIVE)",
  },
  {
    step: 4,
    id: "POST_PROCESSING",
    shortLabel: "04. POST-PROCESS",
    title: "WASH / CURE / POST-PROCESSING",
    subtext: "Support scaffolding detachment, deburring & UV chamber cure",
    timestampOffset: "Pending Layer Finish",
  },
  {
    step: 5,
    id: "DISPATCHED",
    shortLabel: "05. DISPATCHED",
    title: "DISPATCHED & EN ROUTE",
    subtext: "Desiccant moisture-barrier vacuum seal & priority courier transit",
    timestampOffset: "Est. Dispatch Tomorrow",
  },
];

// ─────────────────────────────────────────────────────────────
// STAGE-SPECIFIC TELEMETRY READOUT CONFIGURATIONS
// ─────────────────────────────────────────────────────────────
const TELEMETRY_PROFILES = {
  MESH_VERIFIED: {
    statusBadge: "ANALYZED // 100% WATERTIGHT",
    badgeColor: "#38BDF8",
    headline: "GEOMETRIC PRE-FLIGHT VERIFICATION PASSED",
    metrics: [
      { label: "MANIFOLD INTEGRITY", value: "100% Watertight", note: "0 Non-Manifold Edges" },
      { label: "FACET RESOLUTION", value: "142,880 Polygons", note: "STL Buffer Verified" },
      { label: "MIN WALL THICKNESS", value: "1.24 mm", note: "Safety Margin: > 0.8mm" },
      { label: "SLICING QUEUE", value: "High Priority", note: "Core Engine: Arachne v2.2" },
    ],
    alertText: "Mesh passes structural feasibility checks. Dispatched to G-code generation queue.",
  },

  SLICED_GCODE: {
    statusBadge: "G-CODE READY // 656 LAYERS",
    badgeColor: "#FBBF24",
    headline: "TOOLPATH GENERATION & KINEMATICS COMPILED",
    metrics: [
      { label: "LAYER COUNT", value: "656 Slices", note: "0.16mm Standard Resolution" },
      { label: "TOTAL EXTRUSION", value: "84.3 Meters", note: "Volumetric Feed: 18.2 mm³/s" },
      { label: "INFILL TOPOLOGY", value: "40% Gyroid Core", note: "Tri-directional Shear Resistant" },
      { label: "ESTIMATED DURATION", value: "3h 48m Run Time", note: "Target Speed: 250 mm/s" },
    ],
    alertText: "G-code toolpath synthesized. Bed calibration code queued for Rig Bed #04.",
  },

  BED_EXTRUSION: {
    statusBadge: "ACTIVE PRINT // LIVE BED #04",
    badgeColor: "#FF5A00",
    headline: "PHYSICAL ADDITIVE MANUFACTURING IN PROGRESS",
    isExtruding: true, // Triggers live thermal meters and layer counter
    metrics: [
      { label: "ASSIGNED RIG", value: "Bambu Lab X1-Carbon #04", note: "Fleet Bed Online • 0.4 Hardened Steel" },
      { label: "NOZZLE THERMALS", value: "255°C", target: "Target: 255°C", note: "±0.3°C PID loop lock" },
      { label: "BED THERMALS", value: "65°C", target: "Target: 65°C", note: "High-adhesion PEI textured sheet" },
      { label: "PROGRESS", value: "64% Complete", note: "Layer 420 / 656 (1h 14m remaining)" },
      { label: "ACTIVE FILAMENT", value: "PETG Signal Orange", note: "Density 1.27 g/cm³ • Dry Box Active" },
    ],
    alertText: "Extrusion operating at nominal 280 mm/s with active input shaping vibration compensation.",
  },

  POST_PROCESSING: {
    statusBadge: "POST-CURE // CHAMBER ACTIVE",
    badgeColor: "#A78BFA",
    headline: "SCAFFOLDING DETACHMENT & THERMAL CONDITIONING",
    metrics: [
      { label: "SUPPORT REMOVAL", value: "Deburring Complete", note: "Caliper Tolerance: ±0.08 mm" },
      { label: "UV CURE CHAMBER", value: "16 / 20 Minutes", note: "405nm Array @ 60°C Environment" },
      { label: "BRASS THREADS", value: "2× M3 Installed", note: "Thermal Arbor Press Seated" },
      { label: "SURFACE TREATMENT", value: "Vapor Micro-Seal", note: "Matte Uniform Hydrophobic Coat" },
    ],
    alertText: "Secondary post-processing underway. Rigorous caliper QA audit scheduled prior to packing.",
  },

  DISPATCHED: {
    statusBadge: "DISPATCHED // IN TRANSIT",
    badgeColor: "#34D399",
    headline: "OUT FOR DELIVERY VIA PRIORITY AEROSPACE COURIER",
    metrics: [
      { label: "COURIER", value: "FedEx Priority Overnight", note: "Air Cargo Flight #FX-881" },
      { label: "WAYBILL TRACKING", value: "FX-9402-8849-01TX", note: "Direct Signature Required" },
      { label: "PACKAGING SPEC", value: "Vacuum Static-Shield", note: "Desiccant Barrier + High-Density Foam" },
      { label: "ESTIMATED ARRIVAL", value: "Tomorrow by 10:30 AM", note: "Guaranteed Commercial Delivery" },
    ],
    alertText: "Package inspected, sealed, and handed to air courier custody.",
  },
};

// ─────────────────────────────────────────────────────────────
// PRESET ORDERS FOR TESTING
// ─────────────────────────────────────────────────────────────
const PRESET_ORDERS = [
  {
    trackingId: "NX-88492",
    stageIndex: 2, // 0-based -> Step 3: Bed Extrusion
    partName: "quad_motor_bracket_v4.stl",
    material: "PETG Functional (Signal Orange)",
    technology: "FDM (Direct-Drive CoreXY)",
    orderDate: "OCT 19, 2026",
    customer: "Apex Robotics Ltd",
  },
  {
    trackingId: "NX-46808",
    stageIndex: 0, // Step 1: Mesh Verified
    partName: "flight_gimbal_housing.stl",
    material: "PA-CF Carbon Fiber",
    technology: "FDM (Composite)",
    orderDate: "OCT 19, 2026",
    customer: "Elena Rostova",
  },
  {
    trackingId: "NX-68050",
    stageIndex: 1, // Step 2: Sliced & G-Code
    partName: "sample_coupler.stl",
    material: "PETG Functional",
    technology: "FDM",
    orderDate: "OCT 19, 2026",
    customer: "Kaelen Thorne",
  },
  {
    trackingId: "NX-91204",
    stageIndex: 3, // Step 4: Post Processing
    partName: "high_temp_duct_shroud.stl",
    material: "ABS Technical",
    technology: "FDM",
    orderDate: "OCT 18, 2026",
    customer: "Cyberdyne Systems",
  },
  {
    trackingId: "NX-10294",
    stageIndex: 4, // Step 5: Dispatched
    partName: "optical_sensor_bracket.stl",
    material: "SLA Tough 2000 Resin",
    technology: "SLA Photopolymer",
    orderDate: "OCT 17, 2026",
    customer: "Vance Aerospace",
  },
];

function getDeterministicStageFromId(idString) {
  let hash = 0;
  for (let i = 0; i < idString.length; i++) {
    hash = (hash << 5) - hash + idString.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 5;
}

function resolveInitialOrder(id) {
  const cleanId = (id || "NX-88492").trim().toUpperCase();
  const match = PRESET_ORDERS.find(
    (p) =>
      p.trackingId === cleanId ||
      p.trackingId.replace("NX-", "") === cleanId.replace("NX-", "")
  );
  if (match) return match;
  const stage = getDeterministicStageFromId(cleanId);
  return {
    trackingId: cleanId.startsWith("NX-") ? cleanId : `NX-${cleanId}`,
    stageIndex: stage,
    partName: "custom_cad_model.stl",
    material: "PETG Functional",
    technology: "FDM",
    orderDate: "OCT 19, 2026",
    customer: "Client Direct",
  };
}

export default function OrderTracker({ initialId = "NX-88492", isStandalonePage = false }) {
  const initialData = resolveInitialOrder(initialId);
  const [queryInput, setQueryInput] = useState(initialId);
  const [activeTrackingId, setActiveTrackingId] = useState(initialId);
  const [activeStageIndex, setActiveStageIndex] = useState(initialData.stageIndex);
  const [orderDetails, setOrderDetails] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Micro-jitter animation for real-time live thermal realism
  const [tempJitter, setTempJitter] = useState({ nozzle: 255.0, bed: 65.0 });

  useEffect(() => {
    // Subtle temperature PID loop variation (±0.4°C)
    const interval = setInterval(() => {
      setTempJitter({
        nozzle: +(255 + (Math.random() * 0.8 - 0.4)).toFixed(1),
        bed: +(65 + (Math.random() * 0.4 - 0.2)).toFixed(1),
      });
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // Handle Search Submission
  const handleTracePart = async (idToSearch) => {
    const rawId = (idToSearch || queryInput).trim().toUpperCase();
    if (!rawId) return;

    setIsLoading(true);
    setFetchError(null);

    // 1. Check local presets first
    const presetMatch = PRESET_ORDERS.find(
      (p) =>
        p.trackingId === rawId ||
        p.trackingId.replace("NX-", "") === rawId.replace("NX-", "")
    );

    if (presetMatch) {
      setActiveTrackingId(presetMatch.trackingId);
      setActiveStageIndex(presetMatch.stageIndex);
      setOrderDetails(presetMatch);
    }

    // 2. Query live Express backend API (with 2000ms timeout fallback)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`http://127.0.0.1:5000/api/orders/${encodeURIComponent(rawId)}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.order) {
          setActiveTrackingId(data.trackingId);

          // Map backend status to stepper index (0-4)
          const backendStatus = data.status || "";
          let mappedIndex = 0;
          if (backendStatus === "ANALYZING_MESH" || backendStatus === "PENDING_REVIEW") {
            mappedIndex = 0; // Stage 1
          } else if (backendStatus === "QUEUED_FOR_PRINT") {
            mappedIndex = 1; // Stage 2
          } else if (backendStatus === "EXTRUDING") {
            mappedIndex = 2; // Stage 3
          } else if (backendStatus === "POST_PROCESSING") {
            mappedIndex = 3; // Stage 4
          } else if (backendStatus === "DISPATCHED") {
            mappedIndex = 4; // Stage 5
          } else {
            mappedIndex = data.telemetry?.activeStep ? Math.min(4, Math.max(0, data.telemetry.activeStep - 1)) : 2;
          }

          setActiveStageIndex(mappedIndex);
          setOrderDetails({
            trackingId: data.trackingId,
            stageIndex: mappedIndex,
            partName: data.order.file?.originalName || "custom_part.stl",
            material: data.order.configuration?.material || "PETG Functional",
            technology: data.order.configuration?.technology || "FDM",
            orderDate: new Date(data.order.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).toUpperCase(),
            customer: data.order.customer?.company || data.order.customer?.fullName || "Verified Client",
            pricingTotal: data.order.pricing?.total ? formatINR(data.order.pricing.total) : null,
          });
          setFetchError(null);
        }
      } else if (!presetMatch) {
        // Only set error if neither backend nor preset matched
        setFetchError(`Tracking ID "${rawId}" not found in fleet telemetry. Try sample "NX-88492".`);
      }
    } catch {
      // Backend is optional/local; presetMatch will keep the UI working seamlessly
      if (!presetMatch) {
        // Create a deterministic simulated order for the queried ID
        const generatedStage = getDeterministicStageFromId(rawId);
        setActiveTrackingId(rawId.startsWith("NX-") ? rawId : `NX-${rawId}`);
        setActiveStageIndex(generatedStage);
        setOrderDetails({
          trackingId: rawId.startsWith("NX-") ? rawId : `NX-${rawId}`,
          stageIndex: generatedStage,
          partName: "custom_cad_model.stl",
          material: "PETG Functional",
          technology: "FDM",
          orderDate: "OCT 19, 2026",
          customer: "Client Direct",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(activeTrackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStage = STAGES[activeStageIndex];
  const telemetryData = useMemo(() => {
    return TELEMETRY_PROFILES[currentStage.id] || TELEMETRY_PROFILES.BED_EXTRUSION;
  }, [currentStage.id]);

  return (
    <section
      id="order-tracker"
      className={`relative bg-[#111111] text-white px-6 md:px-12 lg:px-20 overflow-hidden ${
        isStandalonePage ? "py-10 md:py-14" : "py-24 border-t border-[#333333]"
      }`}
      aria-label="Order Tracking Dashboard"
    >
      {/* Background ambient grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(90deg, #FFFFFF 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      {/* Decorative corner accent badge */}
      <div className="absolute top-0 right-10 hidden lg:flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] border-b border-x border-[#333333] font-mono text-[10px] text-[#A1A1AA] tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00] animate-pulse" />
        FLEET_TELEMETRY_LINK_V2.4 // ACTIVE
      </div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* ── SECTION HEADER ────────────────────────────────────── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[11px] tracking-[0.25em] text-[#FF5A00] uppercase font-semibold">
              // 04. PRODUCTION TELEMETRY & REAL-TIME ORDER TRACKING
            </span>
            <span className="h-[1px] w-12 bg-[#FF5A00]/40 hidden sm:block" />
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold tracking-tight text-white uppercase">
                PRODUCTION PIPELINE TRACE
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#A1A1AA] max-w-2xl font-sans">
                Enter your high-resolution telemetry key to inspect fleet allocation, nozzle thermals,
                and physical layer fabrication progress in real time.
              </p>
            </div>

            {/* Quick preset selector buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider mr-1">
                DEMO PRESETS:
              </span>
              {PRESET_ORDERS.map((p) => {
                const isActive = activeTrackingId === p.trackingId;
                return (
                  <button
                    key={p.trackingId}
                    type="button"
                    onClick={() => {
                      setQueryInput(p.trackingId);
                      handleTracePart(p.trackingId);
                    }}
                    className={`font-mono text-[11px] px-2.5 py-1 border transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "border-[#FF5A00] bg-[#FF5A00]/10 text-[#FF5A00] font-semibold"
                        : "border-[#333333] bg-[#161616] text-[#A1A1AA] hover:border-[#666666] hover:text-white"
                    }`}
                  >
                    [{p.trackingId}]
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SEARCH BAR CARD ──────────────────────────────────── */}
        <div className="bg-[#161616] border border-[#333333] p-4 sm:p-6 mb-10 shadow-2xl relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTracePart();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {/* Input with icon and styling */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF5A00]">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value.toUpperCase())}
                placeholder="[ ENTER TRACKING ID: e.g. NX-88492 ]"
                className="w-full bg-[#111111] border border-[#333333] pl-11 pr-4 py-3.5 font-mono text-sm sm:text-base text-white uppercase placeholder-[#555555] tracking-wider focus:outline-none focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-colors"
                aria-label="Tracking ID"
              />
            </div>

            {/* Trace Part Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3.5 bg-[#FF5A00] text-black hover:bg-[#D94D00] transition-colors font-mono font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  QUERYING TELEMETRY...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  [ TRACE PART ]
                </>
              )}
            </button>
          </form>

          {/* Validation/Fetch Error Banner */}
          {fetchError && (
            <div className="mt-4 p-3 bg-red-950/40 border border-red-800/80 text-red-300 font-mono text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-red-400 font-bold">!</span> {fetchError}
              </span>
              <button
                type="button"
                onClick={() => setFetchError(null)}
                className="text-red-400 hover:text-white font-bold ml-4 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Sub-bar: Active Order Summary Tag */}
          <div className="mt-4 pt-4 border-t border-[#262626] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[#A1A1AA] flex items-center gap-2">
                ACTIVE TRACE:
                <strong className="text-white bg-[#222222] px-2 py-0.5 border border-[#333333] tracking-widest">
                  {activeTrackingId}
                </strong>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy Tracking ID"
                  className="text-[#FF5A00] hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? "[ COPIED! ]" : "[ COPY ]"}
                </button>
              </span>
              <span className="text-[#666666] hidden sm:inline">•</span>
              <span className="text-[#A1A1AA]">
                PART: <span className="text-white">{orderDetails?.partName}</span>
              </span>
              <span className="text-[#666666] hidden md:inline">•</span>
              <span className="text-[#A1A1AA] hidden md:inline">
                POLYMER: <span className="text-white">{orderDetails?.material}</span>
              </span>
            </div>

            {/* Interactive stage manual switcher (Interactive mock states) */}
            <div className="flex items-center gap-1">
              <span className="text-[#777777] text-[10px] uppercase tracking-wider mr-1">
                STAGE OVERRIDE:
              </span>
              {STAGES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStageIndex(idx)}
                  className={`px-2 py-0.5 text-[10px] border transition-colors cursor-pointer ${
                    activeStageIndex === idx
                      ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                      : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white"
                  }`}
                  title={`Switch to Step ${s.step}: ${s.title}`}
                >
                  {s.step}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 5-STEP VISUAL PROGRESSION PIPELINE ────────────────── */}
        <div className="bg-[#161616] border border-[#333333] p-6 lg:p-8 mb-10 shadow-2xl relative">

          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#262626]">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5A00] animate-ping" />
              <h3 className="font-mono text-sm tracking-[0.18em] text-white uppercase font-semibold">
                FABRICATION LIFECYCLE MONITOR // STAGE {activeStageIndex + 1} OF 5
              </h3>
            </div>
            <span className="font-mono text-xs text-[#FF5A00] bg-[#FF5A00]/10 px-3 py-1 border border-[#FF5A00]/30 font-semibold uppercase">
              {currentStage.title}
            </span>
          </div>

          {/* Stepper Pipeline: Desktop Horizontal Layout */}
          <div className="hidden lg:grid grid-cols-5 gap-3 relative">

            {/* Background connecting timeline track */}
            <div
              className="absolute top-[28px] left-[10%] right-[10%] h-[3px] bg-[#262626] z-0 overflow-hidden"
              aria-hidden="true"
            >
              {/* Completed filled portion with glowing animated gradient */}
              <div
                className="h-full bg-gradient-to-r from-white via-[#FF7A29] to-[#FF5A00] transition-all duration-500 shadow-[0_0_14px_rgba(255,90,0,0.8)]"
                style={{
                  width: `${(activeStageIndex / (STAGES.length - 1)) * 100}%`,
                }}
              />
            </div>

            {STAGES.map((stage, idx) => {
              const isCompleted = idx < activeStageIndex;
              const isActive = idx === activeStageIndex;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageIndex(idx)}
                  className={`group relative z-10 flex flex-col items-center text-center p-4 border transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? "bg-[#111111] border-[#FF5A00] shadow-[0_0_20px_rgba(255,90,0,0.25)] ring-1 ring-[#FF5A00]"
                      : isCompleted
                      ? "bg-[#141414] border-white/60 hover:border-white"
                      : "bg-[#121212] border-[#333333] opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Step node icon */}
                  <div
                    className={`w-14 h-14 rounded-none flex items-center justify-center font-mono text-sm font-bold border transition-colors mb-4 ${
                      isActive
                        ? "bg-[#FF5A00] text-black border-[#FF5A00] shadow-[0_0_12px_#FF5A00]"
                        : isCompleted
                        ? "bg-white text-black border-white"
                        : "bg-[#1A1A1A] text-[#666666] border-[#333333]"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-6 h-6 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      `0${stage.step}`
                    )}
                  </div>

                  {/* Stage Label */}
                  <div className="w-full">
                    <span
                      className={`block font-mono text-[10px] tracking-widest uppercase mb-1 ${
                        isActive
                          ? "text-[#FF5A00] font-bold"
                          : isCompleted
                          ? "text-white font-medium"
                          : "text-[#666666]"
                      }`}
                    >
                      {isActive ? "[ CURRENT STAGE ]" : isCompleted ? "[ COMPLETED ]" : `[ STEP 0${stage.step} ]`}
                    </span>
                    <h4
                      className={`font-sans font-bold text-xs uppercase tracking-tight leading-snug line-clamp-2 ${
                        isActive ? "text-white" : isCompleted ? "text-[#EAEAEA]" : "text-[#777777]"
                      }`}
                    >
                      {stage.title}
                    </h4>
                    <p className="mt-2 text-[10px] text-[#A1A1AA] font-mono leading-relaxed hidden xl:block">
                      {stage.subtext}
                    </p>
                  </div>

                  {/* Bottom Indicator Line */}
                  <div
                    className={`w-full h-1 mt-4 transition-colors ${
                      isActive
                        ? "bg-[#FF5A00]"
                        : isCompleted
                        ? "bg-white"
                        : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Stepper Pipeline: Mobile & Tablet Vertical Stack */}
          <div className="lg:hidden flex flex-col gap-3">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < activeStageIndex;
              const isActive = idx === activeStageIndex;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageIndex(idx)}
                  className={`flex items-start gap-4 p-4 border text-left transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#111111] border-[#FF5A00] shadow-[0_0_15px_rgba(255,90,0,0.2)] ring-1 ring-[#FF5A00]"
                      : isCompleted
                      ? "bg-[#141414] border-white/60"
                      : "bg-[#121212] border-[#2E2E2E] opacity-60"
                  }`}
                >
                  <div
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center font-mono text-xs font-bold border ${
                      isActive
                        ? "bg-[#FF5A00] text-black border-[#FF5A00]"
                        : isCompleted
                        ? "bg-white text-black border-white"
                        : "bg-[#1A1A1A] text-[#666666] border-[#333333]"
                    }`}
                  >
                    {isCompleted ? "✓" : `0${stage.step}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-[10px] tracking-widest uppercase ${
                          isActive ? "text-[#FF5A00] font-bold" : isCompleted ? "text-white" : "text-[#666666]"
                        }`}
                      >
                        STEP 0{stage.step} // {isActive ? "ACTIVE" : isCompleted ? "VERIFIED" : "PENDING"}
                      </span>
                      <span className="font-mono text-[10px] text-[#A1A1AA]">{stage.timestampOffset}</span>
                    </div>
                    <h4
                      className={`font-sans font-bold text-sm uppercase mt-0.5 ${
                        isActive ? "text-white" : isCompleted ? "text-zinc-200" : "text-zinc-500"
                      }`}
                    >
                      {stage.title}
                    </h4>
                    <p className="text-xs text-[#A1A1AA] mt-1 font-mono">{stage.subtext}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── LIVE TELEMETRY READOUT BOX ───────────────────────── */}
        <div className="bg-[#111111] border-2 border-[#333333] p-6 lg:p-8 relative shadow-2xl">

          {/* Amber top line bar indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF5A00] via-[#D94D00] to-transparent" />

          {/* Telemetry Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#262626]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] text-[#FF5A00] tracking-widest uppercase font-semibold">
                  // TELEMETRY SENSOR MATRIX:
                </span>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border"
                  style={{
                    backgroundColor: `${telemetryData.badgeColor}15`,
                    color: telemetryData.badgeColor,
                    borderColor: `${telemetryData.badgeColor}40`,
                  }}
                >
                  {telemetryData.statusBadge}
                </span>
              </div>
              <h3 className="font-sans font-bold text-xl md:text-2xl text-white tracking-tight uppercase">
                {telemetryData.headline}
              </h3>
            </div>

            {/* Live Rig online status badge */}
            <div className="flex items-center gap-3 bg-[#181818] border border-[#333333] px-4 py-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A00] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF5A00]" />
              </span>
              <div className="font-mono text-left">
                <div className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">HARDWARE TELEMETRY</div>
                <div className="text-xs font-bold text-white tracking-widest">FLEET BED ONLINE</div>
              </div>
            </div>
          </div>

          {/* If Stage 3: BED EXTRUSION IN PROGRESS -> High-density 4-metric grid with thermal readout */}
          {activeStageIndex === 2 ? (
            <div>
              {/* Progress Bar (64% Complete) */}
              <div className="mb-8 bg-[#181818] border border-[#333333] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 font-mono text-xs">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="text-[#FF5A00]">▶</span> FABRICATION PROGRESS:
                    <strong className="text-white text-sm">64% COMPLETE</strong>
                  </span>
                  <span className="text-white bg-[#262626] px-3 py-1 border border-[#3A3A3A] tracking-wider">
                    LAYER 420 / 656 • 1H 14M REMAINING
                  </span>
                </div>

                {/* Striped Progress Bar */}
                <div className="h-5 bg-[#0D0D0D] border border-[#333333] p-0.5 relative overflow-hidden">
                  <div
                    className="h-full bg-[#FF5A00] transition-all duration-500 relative"
                    style={{ width: "64%" }}
                  >
                    {/* Animated diagonal stripes */}
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)",
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-[#666666] mt-2">
                  <span>LAYER 001 (RAFT / BRIM)</span>
                  <span className="text-[#FF5A00]">▲ CURRENT NOZZLE Z: 67.20 MM</span>
                  <span>LAYER 656 (CAP FINISH)</span>
                </div>
              </div>

              {/* 4 Core Required Telemetry Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                {/* Card 1: Assigned Rig */}
                <div className="bg-[#161616] border border-[#333333] p-4 flex flex-col justify-between">
                  <span className="font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                    ASSIGNED RIG
                  </span>
                  <div className="my-2">
                    <span className="block font-sans font-bold text-lg text-white leading-tight">
                      Bambu Lab X1-Carbon #04
                    </span>
                    <span className="inline-block font-mono text-[11px] text-[#FF5A00] tracking-wider mt-1">
                      0.4mm Hardened Toolhead
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#666666] pt-2 border-t border-[#262626]">
                    CoreXY • Direct-Drive Dual Gear
                  </span>
                </div>

                {/* Card 2: Nozzle Temp */}
                <div className="bg-[#161616] border border-[#333333] p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                      NOZZLE TEMP
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <div className="my-2">
                    <span className="font-mono font-bold text-2xl lg:text-3xl text-white tracking-tight">
                      {tempJitter.nozzle}°C
                    </span>
                    <span className="block font-mono text-[11px] text-[#A1A1AA] mt-1">
                      Set Point: 255°C (Locked)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#34D399] pt-2 border-t border-[#262626]">
                    PID Delta: ±0.3°C Nominal
                  </span>
                </div>

                {/* Card 3: Bed Temp */}
                <div className="bg-[#161616] border border-[#333333] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                      BED TEMP
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <div className="my-2">
                    <span className="font-mono font-bold text-2xl lg:text-3xl text-white tracking-tight">
                      {tempJitter.bed}°C
                    </span>
                    <span className="block font-mono text-[11px] text-[#A1A1AA] mt-1">
                      Set Point: 65°C (Textured PEI)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#34D399] pt-2 border-t border-[#262626]">
                    Uniformity: ±0.8°C Verified
                  </span>
                </div>

                {/* Card 4: Active Filament */}
                <div className="bg-[#161616] border border-[#333333] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                      ACTIVE FILAMENT
                    </span>
                    <span className="w-3 h-3 rounded-full bg-[#FF5A00] border border-white/40" />
                  </div>
                  <div className="my-2">
                    <span className="block font-sans font-bold text-lg text-white leading-tight">
                      PETG Signal Orange
                    </span>
                    <span className="inline-block font-mono text-[11px] text-[#A1A1AA] tracking-wider mt-1">
                      1.75mm • Density 1.27 g/cm³
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#666666] pt-2 border-t border-[#262626]">
                    Chamber Humidity: 14% RH (Desiccant Dry)
                  </span>
                </div>

              </div>
            </div>
          ) : (
            /* Telemetry display for other stages */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {telemetryData.metrics.map((m, i) => (
                <div key={i} className="bg-[#161616] border border-[#333333] p-4 flex flex-col justify-between">
                  <span className="font-mono text-[10px] text-[#A1A1AA] tracking-widest uppercase">
                    {m.label}
                  </span>
                  <div className="my-2">
                    <span className="block font-sans font-bold text-xl text-white">
                      {m.value}
                    </span>
                    {m.target && (
                      <span className="block font-mono text-xs text-[#FF5A00] mt-0.5">
                        {m.target}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[#666666] pt-2 border-t border-[#262626]">
                    {m.note}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Operational Log / Telemetry Alert Footer */}
          <div className="p-4 bg-[#161616] border border-[#2E2E2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#34D399]" />
              <span className="text-[#A1A1AA]">
                FACILITY TELEMETRY:{" "}
                <span className="text-white">{telemetryData.alertText}</span>
              </span>
            </div>
            <div className="text-[11px] text-[#666666] flex items-center gap-2">
              <span>LOCATION: AUSTIN ADVANCED HUB #01</span>
              <span>•</span>
              <span>NODE: G-CODE-SYNC-OK</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

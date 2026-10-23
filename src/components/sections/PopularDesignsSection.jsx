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
 *  - Add Custom Designs to Curated Vault with live persistence
 *  - Edit Vault Design Specifications, Dimensions, and Quotations
 *  - Category filtering with live counts
 *  - High-res macro 3D print photography
 *  - Full Technical Inspection Modal with 360 inspection datasheet
 *  - Quantity adjustment with bulk manufacturing discount
 *  - One-click [ LOAD INTO SLICER & QUOTE ] and [ INSTANT QUEUE DISPATCH ]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { formatINR } from "../../data/mockData";
import { sound } from "../../utils/soundEffects";
import { useToast } from "../../context/ToastContext";
import ModelViewer3D from "../ModelViewer3D";

import { POPULAR_DESIGNS } from "../../data/popularDesigns";

const CATEGORIES = [
  "ALL DESIGNS",
  "CALIBRATION & BENCHMARKS",
  "MECHANICAL ASSEMBLIES",
  "AEROSPACE & ROBOTICS",
  "BIOMEDICAL & KINETIC",
  "ARCHITECTURAL & LIGHTING",
  "CUSTOM ENGINEERING",
];

export default function PopularDesignsSection({ onLoadDesign, onDirectDispatch }) {
  const { addToast } = useToast();

  // Stateful collection backed by localStorage
  const [designs, setDesigns] = useState(() => {
    try {
      const saved = localStorage.getItem("nexus_vault_designs_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= POPULAR_DESIGNS.length) return parsed;
      }
    } catch {
      // Fallback
    }
    return POPULAR_DESIGNS;
  });

  const [selectedCategory, setSelectedCategory] = useState("ALL DESIGNS");
  const [dispatchedId, setDispatchedId] = useState(null);
  const [inspectingDesign, setInspectingDesign] = useState(null);
  const [modalViewMode, setModalViewMode] = useState("3d"); // "3d" or "photo"
  const [quantities, setQuantities] = useState({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);

  // Add Design Form State
  const [newDesignForm, setNewDesignForm] = useState({
    title: "",
    category: "MECHANICAL ASSEMBLIES",
    filename: "",
    technology: "FDM",
    dimensions: { x: 80, y: 80, z: 40 },
    recommendedMaterial: "PA-CF (Carbon Nylon)",
    recommendedMaterialId: "pa-cf",
    price: 1850,
    printTime: "2h 30m",
    description: "",
    tagsInput: "CUSTOM CAD, HIGH STRENGTH, PRECISION",
    presetImage: "gearbox",
  });

  // Edit Design Form State
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    category: "",
    filename: "",
    technology: "FDM",
    dimensions: { x: 80, y: 80, z: 40 },
    recommendedMaterial: "",
    recommendedMaterialId: "",
    price: 1000,
    printTime: "",
    description: "",
    tagsInput: "",
    specs: { infill: "40% Gyroid", layerHeight: "0.16 mm", nozzleTemp: "250°C", coolingFan: "50%" },
  });

  const updateDesigns = (next) => {
    setDesigns(next);
    try {
      localStorage.setItem("nexus_vault_designs_v2", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleResetToFactory = () => {
    sound.playClick();
    updateDesigns(POPULAR_DESIGNS);
    addToast({
      title: "Vault Restored",
      message: "Reset Curated 3D Print Vault to factory benchmark models.",
      type: "info",
    });
  };

  const getQty = (id) => quantities[id] || 1;

  const handleQtyChange = (id, delta) => {
    sound.playChirp();
    setQuantities((prev) => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(25, current + delta));
      return { ...prev, [id]: next };
    });
  };

  // Filtered designs
  const filteredDesigns = useMemo(() => {
    if (selectedCategory === "ALL DESIGNS") return designs;
    return designs.filter((d) => d.category === selectedCategory);
  }, [designs, selectedCategory]);

  // View More Pagination (6 designs initial batch)
  const INITIAL_BATCH_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  const handleCategorySelect = (cat) => {
    sound.playClick();
    setSelectedCategory(cat);
    setVisibleCount(INITIAL_BATCH_SIZE);
  };

  const displayedDesigns = useMemo(() => {
    return filteredDesigns.slice(0, visibleCount);
  }, [filteredDesigns, visibleCount]);

  const handleLoadIntoSlicer = (design) => {
    sound.playClick();
    if (onLoadDesign) {
      onLoadDesign(design);
    }
    addToast({
      title: "Model Ingested into Slicer",
      message: `${design.title} (${design.dimensions.x}×${design.dimensions.y}×${design.dimensions.z}mm) loaded. CAD Editor open for dimension adjustments.`,
      type: "success",
    });
  };

  const handleOpenEdit = (design) => {
    sound.playClick();
    setEditingDesign(design);
    setEditForm({
      id: design.id,
      title: design.title,
      category: design.category,
      filename: design.filename,
      technology: design.technology,
      dimensions: { ...design.dimensions },
      recommendedMaterial: design.recommendedMaterial,
      recommendedMaterialId: design.recommendedMaterialId,
      price: design.price,
      printTime: design.printTime,
      description: design.description,
      tagsInput: Array.isArray(design.tags) ? design.tags.join(", ") : "",
      specs: { ...design.specs },
    });
  };

  const handleAddNewDesignSubmit = (e) => {
    e.preventDefault();
    sound.playSuccess();
    const cleanTags = newDesignForm.tagsInput
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const imageMap = {
      calib: POPULAR_DESIGNS[0]?.image,
      gearbox: POPULAR_DESIGNS[1]?.image,
      aero: POPULAR_DESIGNS[2]?.image,
      dragon: POPULAR_DESIGNS[3]?.image,
      bio: POPULAR_DESIGNS[4]?.image,
      gyro: POPULAR_DESIGNS[5]?.image,
      lamp: POPULAR_DESIGNS[6]?.image,
      turbofan: POPULAR_DESIGNS[7]?.image,
      hand: POPULAR_DESIGNS[8]?.image,
      calicat: POPULAR_DESIGNS[9]?.image,
      aperture: POPULAR_DESIGNS[10]?.image,
      upright: POPULAR_DESIGNS[11]?.image,
    };

    const newId = `VAULT-${Math.floor(100 + Math.random() * 900)}`;
    const x = Number(newDesignForm.dimensions.x) || 50;
    const y = Number(newDesignForm.dimensions.y) || 50;
    const z = Number(newDesignForm.dimensions.z) || 30;
    const computedVol = Number(((x * y * z * 0.22) / 1000).toFixed(1));

    const newDesign = {
      id: newId,
      title: newDesignForm.title.trim() || "Custom Specimen",
      category: newDesignForm.category,
      filename:
        newDesignForm.filename.trim() ||
        `${newDesignForm.title.toLowerCase().replace(/\s+/g, "_")}.stl`,
      sizeMB: Number((Math.random() * 5 + 2).toFixed(2)),
      dimensions: { x, y, z },
      volumeCm3: Math.max(5, computedVol),
      facetCount: Math.round(x * y * z * 1.5),
      technology: newDesignForm.technology,
      recommendedMaterial: newDesignForm.recommendedMaterial,
      recommendedMaterialId: newDesignForm.recommendedMaterialId,
      printTime: newDesignForm.printTime || "2h 15m",
      price: Math.max(150, Number(newDesignForm.price) || 1200),
      image: imageMap[newDesignForm.presetImage] || POPULAR_DESIGNS[1]?.image || POPULAR_DESIGNS[0]?.image,
      description:
        newDesignForm.description.trim() ||
        "Custom registered CAD geometry with verified dimensional envelope ready for production.",
      tags: cleanTags.length > 0 ? cleanTags : ["CUSTOM SPEC", "VERIFIED MESH"],
      specs: {
        infill: "40% Gyroid",
        layerHeight: newDesignForm.technology === "SLA" ? "0.08 mm" : "0.16 mm",
        nozzleTemp: newDesignForm.technology === "SLA" ? "N/A" : "260°C",
        coolingFan: newDesignForm.technology === "SLA" ? "UV 405nm" : "40%",
      },
    };

    const next = [newDesign, ...designs];
    updateDesigns(next);
    setIsAddModalOpen(false);

    // Reset Form
    setNewDesignForm({
      title: "",
      category: "MECHANICAL ASSEMBLIES",
      filename: "",
      technology: "FDM",
      dimensions: { x: 80, y: 80, z: 40 },
      recommendedMaterial: "PA-CF (Carbon Nylon)",
      recommendedMaterialId: "pa-cf",
      price: 1850,
      printTime: "2h 30m",
      description: "",
      tagsInput: "CUSTOM CAD, HIGH STRENGTH, PRECISION",
      presetImage: "gearbox",
    });

    addToast({
      title: "Design Added to Vault",
      message: `${newDesign.title} (${newDesign.dimensions.x}×${newDesign.dimensions.y}×${newDesign.dimensions.z}mm) added to Curated 3D Print Vault.`,
      type: "success",
    });
  };

  const handleEditDesignSubmit = (e) => {
    e.preventDefault();
    sound.playSuccess();
    const cleanTags = editForm.tagsInput
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const x = Number(editForm.dimensions.x) || 50;
    const y = Number(editForm.dimensions.y) || 50;
    const z = Number(editForm.dimensions.z) || 30;
    const computedVol = Number(((x * y * z * 0.22) / 1000).toFixed(1));

    const next = designs.map((d) => {
      if (d.id !== editForm.id) return d;
      const updated = {
        ...d,
        title: editForm.title.trim() || d.title,
        category: editForm.category || d.category,
        technology: editForm.technology || d.technology,
        dimensions: { x, y, z },
        volumeCm3: Math.max(5, computedVol),
        recommendedMaterial: editForm.recommendedMaterial || d.recommendedMaterial,
        recommendedMaterialId: editForm.recommendedMaterialId || d.recommendedMaterialId,
        price: Math.max(100, Number(editForm.price) || d.price),
        printTime: editForm.printTime || d.printTime,
        description: editForm.description || d.description,
        tags: cleanTags.length > 0 ? cleanTags : d.tags,
      };
      if (inspectingDesign?.id === d.id) {
        setInspectingDesign(updated);
      }
      return updated;
    });

    updateDesigns(next);
    setEditingDesign(null);

    addToast({
      title: "Vault Specifications Updated",
      message: `${editForm.title} specifications successfully updated in the repository.`,
      type: "success",
    });
  };

  const handleDeleteDesign = (id) => {
    sound.playClick();
    const next = designs.filter((d) => d.id !== id);
    updateDesigns(next);
    setEditingDesign(null);
    if (inspectingDesign?.id === id) {
      setInspectingDesign(null);
    }
    addToast({
      title: "Design Removed",
      message: "Model removed from active vault repository.",
      type: "info",
    });
  };

  const handleInstantDispatch = (design, customQty = null) => {
    sound.playSuccess();
    const qty = customQty || getQty(design.id);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // Bulk discount: 5% off for 5+, 10% off for 10+
    const discount = qty >= 10 ? 0.9 : qty >= 5 ? 0.95 : 1;
    const computedPrice = Math.round(design.price * qty * discount);

    const orderPayload = {
      id: `NX-${randomSuffix}`,
      client: "Benchmark Vault Direct",
      filename: qty > 1 ? `${design.filename} (${qty}x Units)` : design.filename,
      volumeCm3: Math.round(design.volumeCm3 * qty),
      dimensions: design.dimensions,
      technology: design.technology,
      material: design.recommendedMaterial,
      infill: 40,
      layerHeight: design.technology === "SLA" ? 0.08 : 0.16,
      status: "QUEUED",
      assignedPrinter: design.technology === "SLA" ? "RIG-02" : "RIG-04",
      progress: 0,
      estimatedTime: design.printTime,
      price: computedPrice,
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
              Load any geometry directly into the slicing configurator, customize dimensions, or dispatch instantly into the production queue.
            </p>
          </div>

          {/* Quick Counter & Vault Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto font-mono text-xs">
            <div className="bg-[#161616] border border-[#333333] px-3.5 py-2 rounded-[1px] flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[#A1A1AA]">VAULT:</span>
              <span className="text-white font-bold">{designs.length} VERIFIED</span>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsAddModalOpen(true);
              }}
              className="bg-[#FF5A00] hover:bg-[#D94D00] text-black font-extrabold uppercase px-3.5 py-2 rounded-[1px] border border-[#FF5A00] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Upload and ingest a custom benchmark design into the vault repository"
            >
              <span>＋</span>
              <span>ADD NEW DESIGN</span>
            </button>

            {designs.length !== POPULAR_DESIGNS.length && (
              <button
                type="button"
                onClick={handleResetToFactory}
                className="bg-[#1A1A1A] hover:bg-[#252525] text-[#A1A1AA] hover:text-white border border-[#333333] px-2.5 py-2 rounded-[1px] transition-colors cursor-pointer"
                title="Restore default factory benchmark models"
              >
                ↺ RESTORE DEFAULTS
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === "ALL DESIGNS"
                ? designs.length
                : designs.filter((d) => d.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`font-mono text-[11px] md:text-xs px-3.5 py-1.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                    : "bg-[#161616] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-[1px] ${
                    isSelected ? "bg-black/20 text-black font-bold" : "bg-[#222222] text-[#71717A]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Responsive Grid Designs Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedDesigns.map((design) => {
            const isDispatched = dispatchedId === design.id;
            const qty = getQty(design.id);
            const discount = qty >= 10 ? 0.9 : qty >= 5 ? 0.95 : 1;
            const totalPrice = Math.round(design.price * qty * discount);

            return (
              <div
                key={design.id}
                className="card-interactive bg-[#141414] border border-[#333333] rounded-[1px] overflow-hidden flex flex-col justify-between group hover:border-[#FF5A00] hover:shadow-[0_0_25px_rgba(255,90,0,0.18)] transition-all duration-300 shadow-sm"
              >
                <div>
                  {/* High-Resolution Photography / 3D Specimen Container */}
                  <div
                    onClick={() => {
                      sound.playClick();
                      setModalViewMode("3d");
                      setInspectingDesign(design);
                    }}
                    className="relative aspect-square w-full overflow-hidden bg-[#0A0A0A] border-b border-[#262626] cursor-pointer"
                    title="Click to view interactive 3D WebGL model & datasheet"
                  >
                    <img
                      src={design.image}
                      alt={design.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Gradient Overlay for Technical Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-transparent to-transparent pointer-events-none" />

                    {/* Top Badges: Technology, Model Code & Edit Button */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between font-mono text-[10px]">
                      <span className="bg-[#111111]/90 backdrop-blur-md text-[#FF5A00] border border-[#FF5A00]/40 px-2 py-0.5 rounded-[1px] font-bold uppercase flex items-center gap-1.5">
                        <span>[{design.technology}]</span>
                        <span className="text-white/40">|</span>
                        <span className="text-[#22C55E] flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse inline-block" />
                          3D CAD
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(design);
                          }}
                          className="bg-[#111111]/95 hover:bg-[#FF5A00] text-[#A1A1AA] hover:text-black border border-[#333333] hover:border-[#FF5A00] px-2 py-0.5 rounded-[1px] transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                          title="Edit this model's specifications, dimensions, and pricing"
                        >
                          <span>✏️</span>
                          <span>EDIT</span>
                        </button>
                        <span className="bg-[#111111]/90 backdrop-blur-md text-[#A1A1AA] border border-[#333333] px-2 py-0.5 rounded-[1px]">
                          {design.id}
                        </span>
                      </div>
                    </div>

                    {/* Inspect Badge Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                      <span className="bg-[#111111]/95 border border-[#FF5A00] text-[#FF5A00] font-mono text-[11px] px-3 py-1.5 rounded-[1px] uppercase tracking-wider font-bold shadow-xl flex items-center gap-1.5">
                        <span>🧊</span>
                        <span>[ INSPECT 3D MODEL & DATASHEET ]</span>
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
                      <h3
                        onClick={() => {
                          sound.playClick();
                          setInspectingDesign(design);
                        }}
                        className="font-sans font-bold text-lg text-white group-hover:text-[#FF5A00] transition-colors leading-snug cursor-pointer"
                      >
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

                    {/* Quantity Selector & Bulk Badge */}
                    <div className="flex items-center justify-between border-t border-[#222222] pt-3 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#71717A] text-[10px] uppercase">BATCH QTY:</span>
                        <div className="flex items-center border border-[#333333] rounded-[1px] bg-[#111111]">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(design.id, -1)}
                            className="px-2 py-0.5 text-[#A1A1AA] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                          >
                            −
                          </button>
                          <span className="px-2 font-bold text-white text-[11px] min-w-[20px] text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(design.id, 1)}
                            className="px-2 py-0.5 text-[#A1A1AA] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {qty >= 5 && (
                        <span className="text-[9px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-1.5 py-0.5 rounded-[1px] font-bold">
                          {qty >= 10 ? "10% BULK DISCOUNT" : "5% BULK DISCOUNT"}
                        </span>
                      )}
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
                <div className="p-5 pt-0 space-y-2 border-t border-[#222222] mt-2 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Load into Slicer & CAD Editor */}
                    <button
                      type="button"
                      onClick={() => handleLoadIntoSlicer(design)}
                      className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white hover:text-[#FF5A00] border border-[#333333] hover:border-[#FF5A00] py-2.5 px-2 font-mono text-[10px] md:text-[11px] font-bold uppercase rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="Load model into Instant Slicing Configurator & CAD Editor"
                    >
                      <span>[ ✏️ CUSTOMIZE &amp; SLICE ]</span>
                    </button>

                    {/* Instant Dispatch */}
                    <button
                      type="button"
                      onClick={() => handleInstantDispatch(design)}
                      className={`w-full py-2.5 px-2 font-mono text-[10px] md:text-[11px] font-bold uppercase rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1 border ${
                        isDispatched
                          ? "bg-[#22C55E] text-black border-[#22C55E]"
                          : "bg-[#FF5A00] hover:bg-[#D94D00] text-black border-[#FF5A00]"
                      }`}
                      title="Transmit this pre-verified model immediately to fleet queue"
                    >
                      {isDispatched ? (
                        <span>✓ QUEUED</span>
                      ) : (
                        <span>[ DISPATCH — {formatINR(totalPrice)} ]</span>
                      )}
                    </button>
                  </div>

                  {/* Secondary Quick Action Row */}
                  <div className="flex items-center justify-between text-right pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(design)}
                      className="font-mono text-[10px] text-[#71717A] hover:text-[#FF5A00] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>✏️ Edit Specifications</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setModalViewMode("3d");
                        setInspectingDesign(design);
                      }}
                      className="font-mono text-[10px] text-[#A1A1AA] hover:text-[#FF5A00] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>🧊 3D Preview ↗</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* VIEW MORE / SHOW LESS INDUSTRIAL EXPANDER CONTROLS */}
        {filteredDesigns.length > INITIAL_BATCH_SIZE && (
          <div className="pt-6 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            {/* Telemetry Progress & Count Indicator */}
            <div className="flex items-center gap-3 text-xs text-[#A1A1AA]">
              <span className="w-2 h-2 rounded-full bg-[#FF5A00] animate-pulse" />
              <span>
                DISPLAYING <strong className="text-white">{displayedDesigns.length}</strong> OF{" "}
                <strong className="text-white">{filteredDesigns.length}</strong> VERIFIED MODELS
              </span>
              <div className="hidden md:block w-28 h-1.5 bg-[#1F1F1F] rounded-[1px] overflow-hidden border border-[#333333]">
                <div
                  className="h-full bg-[#FF5A00] transition-all duration-300"
                  style={{
                    width: `${(displayedDesigns.length / filteredDesigns.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Toggle Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {visibleCount < filteredDesigns.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setVisibleCount((prev) => Math.min(prev + 6, filteredDesigns.length));
                    }}
                    className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#FF5A00] hover:bg-[#D94D00] text-black font-extrabold uppercase px-6 py-2.5 rounded-[1px] border border-[#FF5A00] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(255,90,0,0.25)] text-xs tracking-wider"
                  >
                    <span>VIEW MORE DESIGNS (+{Math.min(6, filteredDesigns.length - visibleCount)})</span>
                    <span className="transition-transform group-hover:translate-y-0.5 text-sm">▾</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setVisibleCount(filteredDesigns.length);
                    }}
                    className="bg-[#181818] hover:bg-[#222222] text-[#A1A1AA] hover:text-white uppercase px-4 py-2.5 rounded-[1px] border border-[#333333] hover:border-[#555555] transition-colors cursor-pointer text-xs"
                    title="Expand all models in this category"
                  >
                    [ VIEW ALL {filteredDesigns.length} ]
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setVisibleCount(INITIAL_BATCH_SIZE);
                    const el = document.getElementById("popular-designs");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="group flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#252525] text-white hover:text-[#FF5A00] uppercase px-6 py-2.5 rounded-[1px] border border-[#333333] hover:border-[#FF5A00] transition-colors cursor-pointer text-xs"
                >
                  <span>COLLAPSE TO TOP {INITIAL_BATCH_SIZE}</span>
                  <span className="transition-transform group-hover:-translate-y-0.5 text-sm">▴</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          ADD NEW DESIGN TO VAULT MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setIsAddModalOpen(false)}
          >
          <div
            className="bg-[#141414] border border-[#333333] shadow-2xl rounded-[1px] w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#181818] border-b border-[#262626] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-[#FF5A00] rounded-[1px]" />
                <span className="font-mono text-xs text-[#FF5A00] font-bold uppercase tracking-wider">
                  // INGEST NEW 3D PRINT DESIGN TO VAULT
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="font-mono text-xs text-[#71717A] hover:text-white px-2 py-1 bg-[#222222] border border-[#333333] rounded-[1px] cursor-pointer"
              >
                [ ESC ✕ ]
              </button>
            </div>

            <form onSubmit={handleAddNewDesignSubmit} className="p-6 space-y-4 font-mono text-xs">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    MODEL TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDesignForm.title}
                    onChange={(e) => setNewDesignForm({ ...newDesignForm, title: e.target.value })}
                    placeholder="e.g. Generative Heat Sink Core"
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    CATEGORY *
                  </label>
                  <select
                    value={newDesignForm.category}
                    onChange={(e) =>
                      setNewDesignForm({ ...newDesignForm, category: e.target.value })
                    }
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none cursor-pointer"
                  >
                    <option value="MECHANICAL ASSEMBLIES">MECHANICAL ASSEMBLIES</option>
                    <option value="AEROSPACE & ROBOTICS">AEROSPACE & ROBOTICS</option>
                    <option value="BIOMEDICAL & KINETIC">BIOMEDICAL & KINETIC</option>
                    <option value="ARCHITECTURAL & LIGHTING">ARCHITECTURAL & LIGHTING</option>
                    <option value="CALIBRATION & BENCHMARKS">CALIBRATION & BENCHMARKS</option>
                    <option value="CUSTOM ENGINEERING">CUSTOM ENGINEERING</option>
                  </select>
                </div>
              </div>

              {/* CAD Filename & Manufacturing Tech */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    CAD FILENAME (.STL/.STEP)
                  </label>
                  <input
                    type="text"
                    value={newDesignForm.filename}
                    onChange={(e) =>
                      setNewDesignForm({ ...newDesignForm, filename: e.target.value })
                    }
                    placeholder="e.g. heatsink_fin_array.stl"
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    TECHNOLOGY
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["FDM", "SLA"].map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => setNewDesignForm({ ...newDesignForm, technology: tech })}
                        className={`py-2 text-center border rounded-[1px] font-bold cursor-pointer ${
                          newDesignForm.technology === tech
                            ? "bg-[#FF5A00] text-black border-[#FF5A00]"
                            : "bg-[#111111] text-[#A1A1AA] border-[#333333]"
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dimensions X, Y, Z (mm) */}
              <div>
                <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                  BOUNDING ENVELOPE DIMENSIONS (X × Y × Z MM)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px]">
                    <span className="text-[#FF5A00] text-[10px] mr-1">X:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="500"
                      value={newDesignForm.dimensions.x}
                      onChange={(e) =>
                        setNewDesignForm({
                          ...newDesignForm,
                          dimensions: {
                            ...newDesignForm.dimensions,
                            x: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-full bg-transparent text-white text-xs outline-none font-bold"
                    />
                    <span className="text-[#71717A] text-[10px]">mm</span>
                  </div>
                  <div className="flex items-center bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px]">
                    <span className="text-[#38BDF8] text-[10px] mr-1">Y:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="500"
                      value={newDesignForm.dimensions.y}
                      onChange={(e) =>
                        setNewDesignForm({
                          ...newDesignForm,
                          dimensions: {
                            ...newDesignForm.dimensions,
                            y: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-full bg-transparent text-white text-xs outline-none font-bold"
                    />
                    <span className="text-[#71717A] text-[10px]">mm</span>
                  </div>
                  <div className="flex items-center bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px]">
                    <span className="text-[#22C55E] text-[10px] mr-1">Z:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="500"
                      value={newDesignForm.dimensions.z}
                      onChange={(e) =>
                        setNewDesignForm({
                          ...newDesignForm,
                          dimensions: {
                            ...newDesignForm.dimensions,
                            z: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-full bg-transparent text-white text-xs outline-none font-bold"
                    />
                    <span className="text-[#71717A] text-[10px]">mm</span>
                  </div>
                </div>
              </div>

              {/* Material & Base Price & Print Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">MATERIAL</label>
                  <select
                    value={newDesignForm.recommendedMaterialId}
                    onChange={(e) => {
                      const matId = e.target.value;
                      const matNames = {
                        "pa-cf": "PA-CF (Carbon Nylon)",
                        petg: "PETG Industrial",
                        "pla-speed": "PLA+ High Speed",
                        "resin-tough": "Tough 2000 Resin",
                        "resin-clear": "High-Temp Optical Resin",
                      };
                      setNewDesignForm({
                        ...newDesignForm,
                        recommendedMaterialId: matId,
                        recommendedMaterial: matNames[matId] || "PA-CF (Carbon Nylon)",
                      });
                    }}
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none cursor-pointer"
                  >
                    <option value="pa-cf">PA-CF (Carbon Nylon)</option>
                    <option value="petg">PETG Industrial</option>
                    <option value="pla-speed">PLA+ High Speed</option>
                    <option value="resin-tough">Tough 2000 Resin</option>
                    <option value="resin-clear">High-Temp Optical Resin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    BASE PRICE (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={newDesignForm.price}
                    onChange={(e) =>
                      setNewDesignForm({
                        ...newDesignForm,
                        price: parseInt(e.target.value, 10) || 450,
                      })
                    }
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    EST. PRINT TIME
                  </label>
                  <input
                    type="text"
                    value={newDesignForm.printTime}
                    onChange={(e) =>
                      setNewDesignForm({ ...newDesignForm, printTime: e.target.value })
                    }
                    placeholder="e.g. 2h 45m"
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                  ENGINEERING DESCRIPTION
                </label>
                <textarea
                  rows="2"
                  value={newDesignForm.description}
                  onChange={(e) =>
                    setNewDesignForm({ ...newDesignForm, description: e.target.value })
                  }
                  placeholder="Mechanical tolerance, load characteristics, recommended infill pattern..."
                  className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none font-sans text-xs"
                />
              </div>

              {/* Feature Tags */}
              <div>
                <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                  TECHNICAL TAGS (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={newDesignForm.tagsInput}
                  onChange={(e) =>
                    setNewDesignForm({ ...newDesignForm, tagsInput: e.target.value })
                  }
                  placeholder="e.g. HIGH TORQUE, AS9100D, ±0.1mm"
                  className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="border-t border-[#262626] pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#222222] hover:bg-[#2c2c2c] text-[#A1A1AA] hover:text-white rounded-[1px] border border-[#333333] cursor-pointer"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF5A00] hover:bg-[#D94D00] text-black font-extrabold uppercase rounded-[1px] transition-colors cursor-pointer"
                >
                  [ ＋ REGISTER TO CURATED VAULT ]
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          EDIT VAULT DESIGN SPECIFICATIONS MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {editingDesign &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setEditingDesign(null)}
          >
          <div
            className="bg-[#141414] border border-[#333333] shadow-2xl rounded-[1px] w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#181818] border-b border-[#262626] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-[#FF5A00] rounded-[1px]" />
                <span className="font-mono text-xs text-[#FF5A00] font-bold uppercase tracking-wider">
                  // EDIT VAULT SPECIFICATIONS: {editingDesign.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingDesign(null)}
                className="font-mono text-xs text-[#71717A] hover:text-white px-2 py-1 bg-[#222222] border border-[#333333] rounded-[1px] cursor-pointer"
              >
                [ ESC ✕ ]
              </button>
            </div>

            <form onSubmit={handleEditDesignSubmit} className="p-6 space-y-4 font-mono text-xs">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    MODEL TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    CATEGORY *
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none cursor-pointer"
                  >
                    <option value="MECHANICAL ASSEMBLIES">MECHANICAL ASSEMBLIES</option>
                    <option value="AEROSPACE & ROBOTICS">AEROSPACE & ROBOTICS</option>
                    <option value="BIOMEDICAL & KINETIC">BIOMEDICAL & KINETIC</option>
                    <option value="ARCHITECTURAL & LIGHTING">ARCHITECTURAL & LIGHTING</option>
                    <option value="CALIBRATION & BENCHMARKS">CALIBRATION & BENCHMARKS</option>
                    <option value="CUSTOM ENGINEERING">CUSTOM ENGINEERING</option>
                  </select>
                </div>
              </div>

              {/* Dimensions X, Y, Z (mm) */}
              <div>
                <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                  BOUNDING ENVELOPE DIMENSIONS (X × Y × Z MM)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px]">
                    <span className="text-[#FF5A00] text-[10px] mr-1">X:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="500"
                      value={editForm.dimensions.x}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          dimensions: {
                            ...editForm.dimensions,
                            x: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-full bg-transparent text-white text-xs outline-none font-bold"
                    />
                    <span className="text-[#71717A] text-[10px]">mm</span>
                  </div>
                  <div className="flex items-center bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px]">
                    <span className="text-[#38BDF8] text-[10px] mr-1">Y:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="500"
                      value={editForm.dimensions.y}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          dimensions: {
                            ...editForm.dimensions,
                            y: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-full bg-transparent text-white text-xs outline-none font-bold"
                    />
                    <span className="text-[#71717A] text-[10px]">mm</span>
                  </div>
                  <div className="flex items-center bg-[#111111] border border-[#333333] px-2 py-1.5 rounded-[1px]">
                    <span className="text-[#22C55E] text-[10px] mr-1">Z:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="5"
                      max="500"
                      value={editForm.dimensions.z}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          dimensions: {
                            ...editForm.dimensions,
                            z: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-full bg-transparent text-white text-xs outline-none font-bold"
                    />
                    <span className="text-[#71717A] text-[10px]">mm</span>
                  </div>
                </div>
              </div>

              {/* Material & Base Price & Print Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">MATERIAL</label>
                  <select
                    value={editForm.recommendedMaterialId}
                    onChange={(e) => {
                      const matId = e.target.value;
                      const matNames = {
                        "pa-cf": "PA-CF (Carbon Nylon)",
                        petg: "PETG Industrial",
                        "pla-speed": "PLA+ High Speed",
                        "resin-tough": "Tough 2000 Resin",
                        "resin-clear": "High-Temp Optical Resin",
                      };
                      setEditForm({
                        ...editForm,
                        recommendedMaterialId: matId,
                        recommendedMaterial: matNames[matId] || "PA-CF (Carbon Nylon)",
                      });
                    }}
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none cursor-pointer"
                  >
                    <option value="pa-cf">PA-CF (Carbon Nylon)</option>
                    <option value="petg">PETG Industrial</option>
                    <option value="pla-speed">PLA+ High Speed</option>
                    <option value="resin-tough">Tough 2000 Resin</option>
                    <option value="resin-clear">High-Temp Optical Resin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    BASE PRICE (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: parseInt(e.target.value, 10) || 450 })
                    }
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                    PRINT RUN TIME
                  </label>
                  <input
                    type="text"
                    value={editForm.printTime}
                    onChange={(e) => setEditForm({ ...editForm, printTime: e.target.value })}
                    className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                  ENGINEERING DESCRIPTION
                </label>
                <textarea
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none font-sans text-xs"
                />
              </div>

              {/* Feature Tags */}
              <div>
                <label className="text-[#A1A1AA] text-[10px] block mb-1 uppercase">
                  TECHNICAL TAGS (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={editForm.tagsInput}
                  onChange={(e) => setEditForm({ ...editForm, tagsInput: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] text-white px-3 py-2 rounded-[1px] focus:border-[#FF5A00] outline-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="border-t border-[#262626] pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteDesign(editingDesign.id)}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 rounded-[1px] text-[11px] font-bold uppercase transition-colors cursor-pointer"
                >
                  🗑️ DELETE FROM VAULT
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDesign(null)}
                    className="px-4 py-2 bg-[#222222] hover:bg-[#2c2c2c] text-[#A1A1AA] hover:text-white rounded-[1px] border border-[#333333] cursor-pointer"
                  >
                    [ CANCEL ]
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF5A00] hover:bg-[#D94D00] text-black font-extrabold uppercase rounded-[1px] transition-colors cursor-pointer"
                  >
                    [ SAVE SPECIFICATIONS ]
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TECHNICAL INSPECTION MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {inspectingDesign &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setInspectingDesign(null)}
          >
          <div
            className="bg-[#141414] border border-[#333333] shadow-2xl rounded-[1px] w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#181818] border-b border-[#262626] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[#FF5A00] rounded-full animate-ping" />
                <span className="font-mono text-xs text-[#FF5A00] font-bold uppercase tracking-wider">
                  // TECHNICAL DATASHEET &amp; TOLERANCE PROFILE
                </span>
                <span className="font-mono text-[10px] text-[#A1A1AA] bg-[#222222] px-2 py-0.5 rounded-[1px]">
                  {inspectingDesign.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDesign(null)}
                className="font-mono text-xs text-[#71717A] hover:text-white px-2 py-1 bg-[#222222] border border-[#333333] rounded-[1px] cursor-pointer"
              >
                [ ESC ✕ ]
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Interactive 3D WebGL Model / Photography Toggle */}
              <div className="md:col-span-5 space-y-3">
                {/* View Mode Switcher */}
                <div className="flex border border-[#333333] bg-[#0F0F0F] p-0.5 rounded-[1px]">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setModalViewMode("3d");
                    }}
                    className={`flex-1 py-1.5 px-2 font-mono text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-[1px] ${
                      modalViewMode === "3d"
                        ? "bg-[#FF5A00] text-black shadow"
                        : "text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    <span>🧊</span> 3D WebGL CAD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setModalViewMode("photo");
                    }}
                    className={`flex-1 py-1.5 px-2 font-mono text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-[1px] ${
                      modalViewMode === "photo"
                        ? "bg-[#2A2A2A] text-white shadow"
                        : "text-[#71717A] hover:text-white"
                    }`}
                  >
                    <span>📷</span> Specimen Macro
                  </button>
                </div>

                {modalViewMode === "3d" ? (
                  <div className="relative w-full rounded-[1px] overflow-hidden border border-[#333333] bg-[#0A0A0A]">
                    <ModelViewer3D
                      modelType={inspectingDesign.id || inspectingDesign.title}
                      fileName={inspectingDesign.filename}
                      dimensions={inspectingDesign.dimensions}
                      materialId={inspectingDesign.recommendedMaterialId || "pa-cf"}
                      technology={inspectingDesign.technology || "FDM"}
                      height="360px"
                      showControls={true}
                      interactive={true}
                    />
                  </div>
                ) : (
                  <div className="relative aspect-square w-full rounded-[1px] overflow-hidden border border-[#333333] bg-[#0A0A0A]">
                    <img
                      src={inspectingDesign.image}
                      alt={inspectingDesign.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border border-[#FF5A00]/20 pointer-events-none" />
                    <span className="absolute bottom-2 left-2 font-mono text-[9px] bg-black/80 px-2 py-0.5 border border-[#333333] text-white">
                      VERIFIED AS-BUILT SPECIMEN
                    </span>
                  </div>
                )}

                <div className="bg-[#111111] p-3 border border-[#262626] font-mono text-[11px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#71717A]">CAD FILENAME:</span>
                    <span className="text-white truncate max-w-[180px]">
                      {inspectingDesign.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A]">FILE SIZE:</span>
                    <span className="text-white">{inspectingDesign.sizeMB} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A]">SURFACE FACETS:</span>
                    <span className="text-white">
                      {inspectingDesign.facetCount.toLocaleString()} △
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Full Specifications */}
              <div className="md:col-span-7 space-y-5">
                <div>
                  <span className="font-mono text-[10px] text-[#FF5A00] font-bold uppercase">
                    // {inspectingDesign.category}
                  </span>
                  <h3 className="font-sans text-2xl font-black text-white mt-1 uppercase">
                    {inspectingDesign.title}
                  </h3>
                  <p className="font-sans text-sm text-[#A1A1AA] mt-2 leading-relaxed">
                    {inspectingDesign.description}
                  </p>
                </div>

                {/* Slicing Recommendations */}
                <div className="bg-[#111111] border border-[#262626] p-4 rounded-[1px] space-y-3">
                  <h4 className="font-mono text-xs text-[#FF5A00] font-bold uppercase tracking-wider">
                    // RECOMMENDED SLICER PROFILE
                  </h4>
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div>
                      <span className="text-[#71717A] text-[10px] block">MATERIAL:</span>
                      <span className="text-white font-semibold">
                        {inspectingDesign.recommendedMaterial}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717A] text-[10px] block">LAYER HEIGHT:</span>
                      <span className="text-white font-semibold">
                        {inspectingDesign.specs?.layerHeight || "0.16 mm"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717A] text-[10px] block">INFILL PATTERN:</span>
                      <span className="text-white font-semibold">
                        {inspectingDesign.specs?.infill || "35% Gyroid"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717A] text-[10px] block">HOTEND / LASER:</span>
                      <span className="text-white font-semibold">
                        {inspectingDesign.specs?.nozzleTemp || "255°C"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Direct Actions */}
                <div className="border-t border-[#262626] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] text-[#71717A] uppercase block">
                      SINGLE UNIT QUOTE:
                    </span>
                    <span className="font-mono text-2xl font-black text-[#FF5A00]">
                      {formatINR(inspectingDesign.price)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEdit(inspectingDesign);
                      }}
                      className="font-mono text-xs px-3 py-2.5 bg-[#202020] hover:bg-[#2c2c2c] text-[#A1A1AA] hover:text-white border border-[#333333] rounded-[1px] font-bold uppercase transition-colors cursor-pointer"
                      title="Edit this model's specifications and pricing"
                    >
                      [ ✏️ EDIT SPECS ]
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleLoadIntoSlicer(inspectingDesign);
                        setInspectingDesign(null);
                      }}
                      className="flex-1 sm:flex-none font-mono text-xs px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-white border border-[#333333] hover:border-[#FF5A00] rounded-[1px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      [ ✏️ LOAD SLICER ]
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleInstantDispatch(inspectingDesign);
                        setInspectingDesign(null);
                      }}
                      className="flex-1 sm:flex-none font-mono text-xs px-5 py-2.5 bg-[#FF5A00] hover:bg-[#D94D00] text-black font-bold uppercase rounded-[1px] transition-colors cursor-pointer"
                    >
                      [ DISPATCH ORDER ]
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

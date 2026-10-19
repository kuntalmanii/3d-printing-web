/**
 * MaterialsSection.jsx
 * ───────────────────────────────────────────────────────────────
 * Comprehensive Materials Matrix & Quality Control Section:
 *  - Dark industrial theme (#111111 base, 1px #333333 borders, #FFFFFF text)
 *  - Section label: "// 02. POLYMER & RESIN INVENTORY SPECIFICATIONS" in #FF5A00
 *  - Responsive technical comparison table with high-contrast row striping & #FF5A00/10 hover
 *  - 5 Production Materials: PLA+ Speed, PETG Pro, ABS Technical, PA-CF, SLA Tough 2000
 *  - 3-Column Quality Assurance feature cards with engineering telemetry
 */

import { useState } from "react";

const MATERIALS_DATA = [
  {
    id: "pla-plus",
    name: "PLA+ Speed",
    type: "FDM",
    typeColor: "#FF5A00",
    polymer: "Toughened Polylactic Acid (PLA)",
    tensileStrength: "54 MPa",
    tensileRaw: 54,
    hdt: "55°C",
    hdtRaw: 55,
    infillRec: "15% – 25% Gyroid / Grid",
    applications: "Rapid dimensional validation, architectural mockups, visual masters, non-load fixtures",
    density: "1.24 g/cm³",
    elongation: "6.2%",
  },
  {
    id: "petg-pro",
    name: "PETG Pro",
    type: "FDM",
    typeColor: "#38BDF8",
    polymer: "Polyethylene Terephthalate Glycol",
    tensileStrength: "50 MPa",
    tensileRaw: 50,
    hdt: "73°C",
    hdtRaw: 73,
    infillRec: "25% – 40% Honeycomb",
    applications: "Water-resistant enclosures, mechanical snap-fits, chemical wash fluidic fittings, outdoor housings",
    density: "1.27 g/cm³",
    elongation: "8.5%",
  },
  {
    id: "abs-tech",
    name: "ABS Technical",
    type: "FDM",
    typeColor: "#FBBF24",
    polymer: "Acrylonitrile Butadiene Styrene",
    tensileStrength: "43 MPa",
    tensileRaw: 43,
    hdt: "98°C",
    hdtRaw: 98,
    infillRec: "35% – 50% Tri-Hexagonal",
    applications: "High-heat electronics shrouds, automotive interior ducting, post-machinable drill test blocks",
    density: "1.04 g/cm³",
    elongation: "4.5%",
  },
  {
    id: "pa-cf",
    name: "PA-CF (Nylon Carbon Fiber)",
    type: "FDM",
    typeColor: "#E2E8F0",
    polymer: "Polyamide 12 + 20% Carbon Fiber",
    tensileStrength: "115 MPa",
    tensileRaw: 115,
    hdt: "165°C",
    hdtRaw: 165,
    infillRec: "40% – 100% Solid Rectilinear",
    applications: "End-use structural brackets, drone arms, CNC replacement gears, rigid robot end-effectors",
    density: "1.18 g/cm³",
    elongation: "3.2%",
  },
  {
    id: "sla-tough-2000",
    name: "SLA Tough 2000",
    type: "SLA",
    typeColor: "#A78BFA",
    polymer: "Urethane Methacrylate Resin",
    tensileStrength: "65 MPa",
    tensileRaw: 65,
    hdt: "140°C",
    hdtRaw: 140,
    infillRec: "100% Solid (Liquid Photopolymer)",
    applications: "Fine-pitch fluidic manifolds, optical test fixtures, ergonomic medical grips, press-fit couplings",
    density: "1.20 g/cm³",
    elongation: "12.0%",
  },
];

const QA_CARDS = [
  {
    id: "dimensional-accuracy",
    index: "01",
    title: "Dimensional Accuracy Standards",
    badge: "ISO 2768-m VERIFIED",
    specs: [
      { label: "STANDARD FDM", val: "±0.15 mm" },
      { label: "PRECISION SLA", val: "±0.05 mm" },
    ],
    details:
      "Caliper-verified tolerances down to ±0.15mm for standard FDM and ±0.05mm for SLA resin. Laser-scanned optical coordinate measuring machine (CMM) routine executes every 100 print layers.",
    tag: "TOLERANCE COMPLIANCE",
  },
  {
    id: "environmental-control",
    index: "02",
    title: "Continuous Environmental Control",
    badge: "ACTIVE DEHYDRATION",
    specs: [
      { label: "CHAMBER DEW POINT", val: "-40°C" },
      { label: "FEED AMBIENT RH", val: "< 4.5%" },
    ],
    details:
      "Active filament dehydration chambers during extrusion to prevent moisture micro-voids, steam pitting, and layer delamination. Nitrogen-purged storage towers preserve resin viscosity.",
    tag: "MOISTURE DEFENSE",
  },
  {
    id: "quality-certification",
    index: "03",
    title: "Quality Certification",
    badge: "SERIALIZED LOT REPORT",
    specs: [
      { label: "LOT TRAVELER", val: "QR VERIFIED" },
      { label: "POST-CURE LOG", val: "UV + HEAT" },
    ],
    details:
      "Every part ships with a digital dimensional inspection report and post-cure verification log. High-resolution microscope photography captures perimeter seam fusion integrity.",
    tag: "TRACEABILITY AUDIT",
  },
];

export default function MaterialsSection() {
  const [filterType, setFilterType] = useState("ALL");

  const filteredMaterials =
    filterType === "ALL"
      ? MATERIALS_DATA
      : MATERIALS_DATA.filter((m) => m.type === filterType);

  return (
    <section
      id="materials-section"
      className="relative w-full bg-[#111111] text-white border-t border-[#333333] py-14 md:py-20"
      aria-label="Polymer and Resin Inventory Specifications"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-[#FF5A00]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF5A00]">
                // 02. POLYMER &amp; RESIN INVENTORY SPECIFICATIONS
              </span>
            </div>
            <h2 className="font-sans text-[28px] md:text-[36px] font-bold tracking-tight text-white leading-tight">
              MATERIALS MATRIX &amp; QUALITY CONTROL
            </h2>
            <p className="font-sans text-[14px] text-[#A1A1AA] max-w-2xl mt-1.5 leading-relaxed">
              Industrial-grade thermoplastics and engineering photopolymer resins calibrated for
              repeatable mechanical performance, thermal stability, and micronic dimensional
              adherence.
            </p>
          </div>

          {/* Technology Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#161616] border border-[#333333] p-1 font-mono text-[11px]">
            <button
              type="button"
              id="filter-mat-all"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 transition-colors uppercase ${
                filterType === "ALL"
                  ? "bg-[#FF5A00] text-black font-semibold"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              [ ALL (5) ]
            </button>
            <button
              type="button"
              id="filter-mat-fdm"
              onClick={() => setFilterType("FDM")}
              className={`px-3 py-1.5 transition-colors uppercase ${
                filterType === "FDM"
                  ? "bg-[#FF5A00] text-black font-semibold"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              [ FDM FILAMENT (4) ]
            </button>
            <button
              type="button"
              id="filter-mat-sla"
              onClick={() => setFilterType("SLA")}
              className={`px-3 py-1.5 transition-colors uppercase ${
                filterType === "SLA"
                  ? "bg-[#FF5A00] text-black font-semibold"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              [ SLA RESIN (1) ]
            </button>
          </div>
        </div>

        {/* ── 1. TECHNICAL COMPARISON TABLE (RESPONSIVE & DENSE) ── */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-3 font-mono text-[11px]">
            <span className="text-[#FF5A00] uppercase tracking-wider font-semibold">
              // PRODUCTION MATERIAL SPECIFICATION INDEX
            </span>
            <span className="text-[#71717A] hidden sm:inline uppercase">
              HORIZONTAL SCROLL ENABLED • ASTM D638 / ISO 75 COMPLIANT
            </span>
          </div>

          {/* Horizontally scrollable container with sharp borders */}
          <div className="overflow-x-auto border border-[#333333] bg-[#111111] shadow-2xl">
            <table className="w-full min-w-[960px] text-left border-collapse font-sans text-[13px]">
              {/* Header Row */}
              <thead>
                <tr className="bg-[#161616] border-b border-[#333333] font-mono text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3.5 px-4 font-semibold border-r border-[#262626] w-[200px]">
                    MATERIAL NAME
                  </th>
                  <th className="py-3.5 px-4 font-semibold border-r border-[#262626] w-[220px]">
                    BASE POLYMER
                  </th>
                  <th className="py-3.5 px-4 font-semibold border-r border-[#262626] w-[140px]">
                    TENSILE STRENGTH
                  </th>
                  <th className="py-3.5 px-4 font-semibold border-r border-[#262626] w-[140px]">
                    HEAT DEFLECTION (HDT)
                  </th>
                  <th className="py-3.5 px-4 font-semibold border-r border-[#262626] w-[200px]">
                    INFILL RECOMMENDATIONS
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    PRIMARY APPLICATIONS
                  </th>
                </tr>
              </thead>

              {/* Body Rows with High-Contrast Striping & #FF5A00/10 hover */}
              <tbody>
                {filteredMaterials.map((mat, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={mat.id}
                      className={`
                        border-b border-[#262626] transition-colors duration-150 group
                        ${isEven ? "bg-[#111111]" : "bg-[#141414]"}
                        hover:bg-[#FF5A00]/10 hover:border-[#FF5A00]/40
                      `}
                    >
                      {/* 1. Material Name */}
                      <td className="py-4 px-4 border-r border-[#262626] group-hover:border-[#FF5A00]/20">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: mat.typeColor }}
                          />
                          <div>
                            <div className="font-mono text-[13px] font-bold text-white group-hover:text-[#FF5A00] transition-colors">
                              {mat.name}
                            </div>
                            <span className="font-mono text-[10px] text-[#71717A] tracking-wider uppercase">
                              [{mat.type} PROCESS • {mat.density}]
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Base Polymer */}
                      <td className="py-4 px-4 border-r border-[#262626] group-hover:border-[#FF5A00]/20 text-[#E2E8F0]">
                        <span className="font-sans font-medium text-[13px]">
                          {mat.polymer}
                        </span>
                        <div className="font-mono text-[10px] text-[#71717A] mt-0.5">
                          ELONGATION: {mat.elongation}
                        </div>
                      </td>

                      {/* 3. Tensile Strength */}
                      <td className="py-4 px-4 border-r border-[#262626] group-hover:border-[#FF5A00]/20">
                        <div className="font-mono text-[13px] font-bold text-white group-hover:text-[#FF5A00]">
                          {mat.tensileStrength}
                        </div>
                        {/* Visual Strength Bar */}
                        <div className="w-full h-1 bg-[#262626] mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-[#FF5A00]"
                            style={{ width: `${Math.min(100, (mat.tensileRaw / 120) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* 4. Heat Deflection Temp */}
                      <td className="py-4 px-4 border-r border-[#262626] group-hover:border-[#FF5A00]/20">
                        <div className="font-mono text-[13px] font-bold text-white">
                          {mat.hdt}
                        </div>
                        <span className="font-mono text-[10px] text-[#71717A]">
                          @ 0.45 MPa
                        </span>
                      </td>

                      {/* 5. Infill Recommendations */}
                      <td className="py-4 px-4 border-r border-[#262626] group-hover:border-[#FF5A00]/20">
                        <span className="font-mono text-[12px] text-[#E2E8F0] font-medium block">
                          {mat.infillRec}
                        </span>
                        <span className="font-mono text-[10px] text-[#71717A]">
                          OPTIMAL RIGIDITY RATIO
                        </span>
                      </td>

                      {/* 6. Primary Applications */}
                      <td className="py-4 px-4 text-[#A1A1AA] leading-relaxed text-[12px]">
                        {mat.applications}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 2. QUALITY ASSURANCE FEATURE CARDS (3-COLUMN GRID) ── */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-[#222222] pb-3 font-mono text-[11px]">
            <span className="text-[#FF5A00] uppercase tracking-wider font-semibold">
              // PRODUCTION QUALITY ASSURANCE &amp; TOLERANCE PROTOCOLS
            </span>
            <span className="text-[#A1A1AA] uppercase">
              STANDARDS: DIN EN ISO 2768-1 (M)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {QA_CARDS.map((card) => (
              <div
                key={card.id}
                className="
                  relative bg-[#141414] border border-[#333333] hover:border-[#FF5A00]
                  p-6 transition-colors duration-200 flex flex-col justify-between
                "
              >
                {/* Top Corner Mechanical Accent */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#FF5A00]" />

                <div>
                  {/* Card Header & Badge */}
                  <div className="flex items-center justify-between mb-3 font-mono text-[10px]">
                    <span className="text-[#FF5A00] tracking-widest font-bold">
                      [{card.index} // {card.tag}]
                    </span>
                    <span className="px-2 py-0.5 border border-[#333333] bg-[#1a1a1a] text-[#A1A1AA] uppercase font-semibold">
                      {card.badge}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="font-sans text-[18px] font-bold text-white mb-3 tracking-tight">
                    {card.title}
                  </h3>

                  {/* Specification Metric Callouts */}
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-[#0f0f11] border border-[#222222] font-mono text-[11px]">
                    {card.specs.map((spec) => (
                      <div key={spec.label}>
                        <span className="text-[#71717A] text-[9px] block uppercase">
                          {spec.label}
                        </span>
                        <span className="text-[#FF5A00] text-[13px] font-bold">
                          {spec.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Description */}
                  <p className="font-sans text-[13px] text-[#A1A1AA] leading-relaxed mb-4">
                    {card.details}
                  </p>
                </div>

                {/* Bottom Verification Status */}
                <div className="border-t border-[#222222] pt-3 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#71717A]">PROTOCOL STATUS:</span>
                  <span className="text-[#22C55E] flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                    ACTIVE FLEET QA
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

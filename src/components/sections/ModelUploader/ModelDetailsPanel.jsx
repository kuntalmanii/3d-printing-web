/**
 * ModelDetailsPanel.jsx
 * ───────────────────────────────────────────────────────────────
 * Client-side Slicing & Engineering Metrics Breakdown:
 *  - Bounding Box Dimensions (X, Y, Z in mm) vs 256x256mm Build Plate
 *  - Computed Mesh Volume in cm³ and mm³
 *  - Surface Area in cm² and mm²
 *  - Raw and Infill Weight Estimations across PLA, PETG, and PA-CF
 *  - Interactive Material Density Selector
 *  - Topology & Watertight Integrity Diagnostic
 */

import { MATERIAL_DENSITIES, BUILD_VOLUME } from "../../../utils/modelAnalysis";

export function ModelDetailsPanel({
  analysis,
  fileName,
  fileSize,
  fileExtension,
  selectedMaterial,
  onSelectMaterial,
  infillPercent,
  onSelectInfill,
}) {
  if (!analysis) return null;

  const { boundingBox, volumeCm3, surfaceArea, watertight, triangleCount, vertexCount, weights } =
    analysis;

  const activeMat = MATERIAL_DENSITIES[selectedMaterial] || MATERIAL_DENSITIES.PLA;
  const solidWeight = weights?.[selectedMaterial]?.solid ?? 0;
  const sliced20Weight = weights?.[selectedMaterial]?.infill20 ?? 0;
  const sliced40Weight = weights?.[selectedMaterial]?.infill40 ?? 0;

  const currentDisplayWeight =
    infillPercent === 100
      ? solidWeight
      : infillPercent === 40
      ? sliced40Weight
      : sliced20Weight;

  return (
    <div className="w-full bg-[#111111] border border-[#333333] p-5 md:p-6 font-mono text-[12px]">
      {/* Header telemetry badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222222] pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#FF5A00]" />
          <div>
            <h3 className="font-mono text-[13px] font-semibold text-white tracking-[0.12em] uppercase">
              CLIENT-SIDE SLICING & METRIC EXTRACTION
            </h3>
            <span className="font-mono text-[10px] text-[#A1A1AA]">
              SOURCE: {fileName || "UNNAMED"} • {fileSize} • {fileExtension}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#71717A] uppercase">TOPOLOGY AUDIT:</span>
          <span
            className={`px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold border ${
              watertight.isWatertight
                ? "bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E]"
                : "bg-[#EF4444]/10 border-[#EF4444] text-[#EF4444]"
            }`}
          >
            {watertight.isWatertight ? "[ 2-MANIFOLD // PRINT-READY ]" : "[ NON-MANIFOLD // REPAIR ]"}
          </span>
        </div>
      </div>

      {/* Main 3-Column Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* COLUMN 1: BOUNDING BOX & BUILD PLATE FIT */}
        <div className="bg-[#141414] border border-[#262626] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#71717A] uppercase tracking-wider mb-2">
              <span>01. BOUNDING BOX (MM)</span>
              <span className="text-[#A1A1AA]">BED: 256×256</span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[#FF5A00] font-semibold">LENGTH (X):</span>
                <span className="text-white text-[13px] font-bold">
                  {boundingBox.x} <span className="text-[10px] text-[#71717A] font-normal">mm</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4ADE80] font-semibold">HEIGHT (Y):</span>
                <span className="text-white text-[13px] font-bold">
                  {boundingBox.y} <span className="text-[10px] text-[#71717A] font-normal">mm</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#60A5FA] font-semibold">WIDTH (Z):</span>
                <span className="text-white text-[13px] font-bold">
                  {boundingBox.z} <span className="text-[10px] text-[#71717A] font-normal">mm</span>
                </span>
              </div>
            </div>

            {/* Build Envelope Usage */}
            <div className="border-t border-[#222222] pt-2 text-[10px]">
              <div className="flex justify-between text-[#71717A] mb-1">
                <span>ENVELOPE CONSUMPTION:</span>
                <span className="text-white">
                  {Math.round((boundingBox.maxDimension / BUILD_VOLUME.x) * 100)}%
                </span>
              </div>
              <div className="w-full h-1 bg-[#222222]">
                <div
                  className={`h-full ${
                    boundingBox.fitsBuildPlate ? "bg-[#FF5A00]" : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(100, (boundingBox.maxDimension / BUILD_VOLUME.x) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-[#71717A]">
            STATUS:{" "}
            {boundingBox.fitsBuildPlate ? (
              <span className="text-[#22C55E]">FITS 256mm PLATFORM</span>
            ) : (
              <span className="text-red-400">EXCEEDS 256mm ENVELOPE</span>
            )}
          </div>
        </div>

        {/* COLUMN 2: VOLUME & SURFACE AREA */}
        <div className="bg-[#141414] border border-[#262626] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#71717A] uppercase tracking-wider mb-2">
              <span>02. VOLUMETRICS</span>
              <span className="text-[#A1A1AA]">DIVERGENCE THM</span>
            </div>

            <div className="space-y-3 mb-3">
              <div>
                <span className="text-[#71717A] text-[10px] block">TOTAL NET VOLUME:</span>
                <div className="text-[18px] font-bold text-white leading-tight">
                  {volumeCm3.toLocaleString()}{" "}
                  <span className="text-[12px] text-[#FF5A00] font-normal">cm³</span>
                </div>
                <span className="text-[10px] text-[#71717A]">
                  ≈ {(volumeCm3 * 1000).toLocaleString()} mm³
                </span>
              </div>

              <div className="border-t border-[#222222] pt-2">
                <span className="text-[#71717A] text-[10px] block">SURFACE AREA:</span>
                <div className="text-[14px] font-semibold text-white">
                  {surfaceArea.areaCm2.toLocaleString()}{" "}
                  <span className="text-[10px] text-[#A1A1AA]">cm²</span>
                </div>
                <span className="text-[10px] text-[#71717A]">
                  {surfaceArea.areaMm2.toLocaleString()} mm²
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#71717A] border-t border-[#222222] pt-2 flex justify-between">
            <span>FACETS: {triangleCount.toLocaleString()}</span>
            <span>VERTS: {vertexCount.toLocaleString()}</span>
          </div>
        </div>

        {/* COLUMN 3: WEIGHT & MATERIAL ESTIMATION */}
        <div className="bg-[#141414] border border-[#262626] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#71717A] uppercase tracking-wider mb-2">
              <span>03. ESTIMATED MASS</span>
              <span className="text-[#FF5A00]">DENSITY: {activeMat.density} g/cm³</span>
            </div>

            <div className="mb-3">
              <span className="text-[#71717A] text-[10px] block">
                MASS ({selectedMaterial} @ {infillPercent}% INFILL):
              </span>
              <div className="text-[24px] font-bold text-[#FF5A00] leading-none my-1">
                {currentDisplayWeight}{" "}
                <span className="text-[13px] text-white font-normal">grams</span>
              </div>
              <span className="text-[10px] text-[#71717A]">
                100% Solid Mass: {solidWeight} g
              </span>
            </div>

            {/* Infill Mode Selector */}
            <div className="border-t border-[#222222] pt-2 mb-2">
              <span className="text-[10px] text-[#71717A] block mb-1.5 uppercase">
                INFILL PROFILE:
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "SOLID (100%)", val: 100 },
                  { label: "STD (20%)", val: 20 },
                  { label: "CFG (40%)", val: 40 },
                ].map((inf) => (
                  <button
                    key={inf.val}
                    type="button"
                    onClick={() => onSelectInfill(inf.val)}
                    className={`px-1.5 py-1 text-[9px] uppercase border transition-colors ${
                      infillPercent === inf.val
                        ? "bg-[#FF5A00] text-black border-[#FF5A00] font-semibold"
                        : "bg-[#181818] text-[#A1A1AA] border-[#333333] hover:text-white"
                    }`}
                  >
                    {inf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#71717A] border-t border-[#222222] pt-2 flex justify-between">
            <span>NOZZLE TEMP:</span>
            <span className="text-white">{activeMat.printTemp}</span>
          </div>
        </div>
      </div>

      {/* Material Selection Strip */}
      <div className="border-t border-[#222222] pt-4">
        <div className="text-[10px] uppercase text-[#71717A] tracking-wider mb-2 flex items-center justify-between">
          <span>SELECT ENGINEERING MATERIAL DENSITY CONSTANT:</span>
          <span className="text-[#A1A1AA]">CLICK TO RECALCULATE MASS INSTANTLY</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(MATERIAL_DENSITIES).map((mat) => {
            const isSelected = selectedMaterial === mat.key;
            const matWeight = weights?.[mat.key]?.solid ?? 0;

            return (
              <button
                key={mat.key}
                id={`btn-mat-${mat.key.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                type="button"
                onClick={() => onSelectMaterial(mat.key)}
                className={`
                  p-3 text-left border transition-all duration-150 rounded-none
                  ${
                    isSelected
                      ? "bg-[#1c140d] border-[#FF5A00] text-white"
                      : "bg-[#141414] border-[#262626] text-[#A1A1AA] hover:border-[#444444] hover:text-white"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      isSelected ? "text-[#FF5A00]" : "text-white"
                    }`}
                  >
                    {mat.key}
                  </span>
                  <span className="text-[10px] text-[#71717A]">
                    {mat.density} g/cm³
                  </span>
                </div>
                <div className="text-[10px] text-[#71717A] truncate mb-1">
                  {mat.fullName}
                </div>
                <div className="font-mono text-[11px] font-semibold text-white">
                  {matWeight} <span className="text-[9px] text-[#A1A1AA]">g (solid)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

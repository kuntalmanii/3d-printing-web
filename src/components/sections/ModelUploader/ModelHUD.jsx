/**
 * ModelHUD.jsx
 * ───────────────────────────────────────────────────────────────
 * Floating telemetry HUD for the 3D Viewport:
 *  - JetBrains Mono typography
 *  - Dimensions (X × Y × Z mm) with color-coded axis indicators
 *  - Calculated Volume in cm³
 *  - Watertight Status badge (Manifold vs Non-manifold / open boundary)
 *  - Active material density & estimated solid weight
 */

export function ModelHUD({ analysis, selectedMaterial }) {
  if (!analysis) return null;

  const { boundingBox, volumeCm3, watertight, triangleCount, weights } = analysis;
  const currentWeight = weights?.[selectedMaterial]?.solid ?? 0;

  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2 max-w-[320px]">
      {/* Primary HUD Card */}
      <div className="bg-[#111111]/90 backdrop-blur-md border border-[#333333] p-3 pointer-events-auto font-mono text-[11px] leading-tight">
        {/* Header telemetry badge */}
        <div className="flex items-center justify-between border-b border-[#222222] pb-2 mb-2">
          <span className="text-[#FF5A00] tracking-[0.14em] uppercase font-semibold">
            // TELEMETRY HUD
          </span>
          <span className="text-[10px] text-[#A1A1AA] uppercase">
            SCALE: 1.0 (MM)
          </span>
        </div>

        {/* 1. Bounding Box Dimensions */}
        <div className="mb-2.5">
          <div className="text-[10px] uppercase text-[#71717A] tracking-wider mb-1">
            BOUNDING DIMENSIONS (X × Y × Z):
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <span className="text-[#FF5A00]">X: {boundingBox.x}</span>
            <span className="text-[#71717A]">×</span>
            <span className="text-[#4ADE80]">Y: {boundingBox.y}</span>
            <span className="text-[#71717A]">×</span>
            <span className="text-[#60A5FA]">Z: {boundingBox.z}</span>
            <span className="text-[#71717A] text-[10px] font-normal ml-0.5">mm</span>
          </div>
          {!boundingBox.fitsBuildPlate && (
            <div className="text-red-400 text-[10px] mt-0.5 flex items-center gap-1">
              <span>⚠</span> EXCEEDS 256mm BUILD VOLUME
            </div>
          )}
        </div>

        {/* 2. Calculated Volume */}
        <div className="mb-2.5 flex items-center justify-between border-t border-[#1e1e1e] pt-2">
          <span className="text-[10px] uppercase text-[#71717A] tracking-wider">
            NET VOLUME:
          </span>
          <span className="text-[12px] font-semibold text-white">
            {volumeCm3.toLocaleString()} <span className="text-[10px] text-[#A1A1AA]">cm³</span>
          </span>
        </div>

        {/* 3. Watertight Topology Status */}
        <div className="mb-2.5 flex items-center justify-between border-t border-[#1e1e1e] pt-2">
          <span className="text-[10px] uppercase text-[#71717A] tracking-wider">
            TOPOLOGY:
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                watertight.isWatertight ? "bg-[#22C55E]" : "bg-[#EF4444] animate-pulse"
              }`}
            />
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase ${
                watertight.isWatertight ? "text-[#22C55E]" : "text-[#EF4444]"
              }`}
            >
              {watertight.isWatertight ? "WATERTIGHT (MANIFOLD)" : "NON-MANIFOLD"}
            </span>
          </div>
        </div>

        {/* 4. Active Material & Estimated Weight */}
        <div className="border-t border-[#1e1e1e] pt-2 flex items-center justify-between">
          <span className="text-[10px] uppercase text-[#71717A] tracking-wider">
            RAW WEIGHT ({selectedMaterial}):
          </span>
          <span className="text-[12px] font-semibold text-[#FF5A00]">
            {currentWeight} <span className="text-[10px] text-white">g</span>
          </span>
        </div>

        {/* 5. Mesh Complexity */}
        <div className="border-t border-[#1e1e1e] pt-1.5 mt-1.5 flex items-center justify-between text-[10px] text-[#71717A]">
          <span>FACET COUNT:</span>
          <span className="text-[#A1A1AA]">{triangleCount.toLocaleString()} △</span>
        </div>
      </div>
    </div>
  );
}

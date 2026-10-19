/**
 * ModelUploader.jsx
 * ───────────────────────────────────────────────────────────────
 * Interactive 3D Model File Ingestion & Viewer:
 *  - Drag & drop ingestion zone for .STL and .OBJ files
 *  - Industrial styling: 1px dashed #333333 border, #111111 background, #FF5A00 on drag-over
 *  - Fallback button: "[ SELECT LOCAL FILE ]" in JetBrains Mono
 *  - Client-side Slicing / Bounding Box Extractor:
 *      * Dimensions (X, Y, Z mm)
 *      * Total mesh volume in cm³ (Divergence theorem)
 *      * Surface area in cm²
 *      * Raw & sliced weight estimation across PLA (1.24), PETG (1.27), PA-CF (1.18), ABS (1.04)
 *  - 3D Viewport:
 *      * Three.js canvas with OrbitControls (rotate, zoom, pan)
 *      * Engineering wireframe-on-shaded material (dark grey surface + #FF5A00 edges)
 *      * 256x256mm build plate grid with scale reference
 *      * Floating HUD in JetBrains Mono with Dimensions, Volume, Watertight status
 */

import { useState } from "react";
import { useModelParser } from "../../hooks/useModelParser";
import { Dropzone } from "./ModelUploader/Dropzone";
import { ModelViewport } from "./ModelUploader/ModelViewport";
import { ModelDetailsPanel } from "./ModelUploader/ModelDetailsPanel";

function ModelUploaderInner({ parser }) {
  const {
    status,
    progress,
    fileName,
    fileSize,
    fileExtension,
    error,
    geometry,
    edgesGeometry,
    analysis,
    selectedMaterial,
    setSelectedMaterial,
    infillPercent,
    setInfillPercent,
    loadFile,
    loadSample,
    reset,
  } = parser;

  const [showDropzone, setShowDropzone] = useState(true);

  return (
    <section
      id="model-uploader"
      className="relative w-full bg-[#111111] text-white border-t border-[#333333] py-14 md:py-20"
      aria-label="3D Model Ingestion & Analysis Section"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Subtitle */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-[#FF5A00]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF5A00]">
                // MODULE 02: CLIENT-SIDE GEOMETRIC EXTRACTION &amp; CAD VIEWPORT
              </span>
            </div>
            <h2 className="font-sans text-[28px] md:text-[36px] font-bold tracking-tight text-white leading-tight">
              3D MODEL INGESTION &amp; ANALYSIS
            </h2>
            <p className="font-sans text-[14px] text-[#A1A1AA] max-w-2xl mt-1.5 leading-relaxed">
              Upload production <span className="font-mono text-white">.STL</span> or{" "}
              <span className="font-mono text-white">.OBJ</span> CAD files for zero-latency
              client-side parsing. Computes bounding boxes, calculates true volume via
              tetrahedral divergence, verifies 2-manifold topology, and estimates material mass.
            </p>
          </div>

          {/* Quick status pill */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <button
              type="button"
              id="btn-toggle-dropzone"
              onClick={() => setShowDropzone(!showDropzone)}
              className="bg-[#161616] hover:bg-[#222222] border border-[#333333] text-[#A1A1AA] hover:text-white px-3 py-2 transition-colors uppercase tracking-wider"
            >
              {showDropzone ? "[ HIDE DROPZONE ]" : "[ + UPLOAD / DROP FILE ]"}
            </button>
            <div className="bg-[#161616] border border-[#333333] px-3.5 py-2 flex items-center gap-2">
              <span className="text-[#71717A] uppercase">PIPELINE:</span>
              <span className="text-white flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === "ready"
                      ? "bg-[#22C55E]"
                      : status === "loading"
                      ? "bg-[#FF5A00] animate-ping"
                      : "bg-[#71717A]"
                  }`}
                />
                {status === "ready"
                  ? "MODEL READY // ANALYZED"
                  : status === "loading"
                  ? "PARSING MESH..."
                  : "AWAITING CAD INGESTION"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 1. INGESTION DROPZONE (Collapsible or Prominent) ── */}
        {showDropzone && (
          <div className="mb-8 transition-all duration-200">
            <Dropzone
              onFileSelect={loadFile}
              onLoadSample={loadSample}
              isLoading={status === "loading"}
              progress={progress}
              error={error}
              currentFileName={fileName}
            />
          </div>
        )}

        {/* ── 2. ACTIVE FILE HEADER STRIP ── */}
        {status === "ready" && (
          <div className="bg-[#141414] border border-[#333333] px-4 py-2.5 mb-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
            <div className="flex items-center gap-2.5">
              <span className="text-[#FF5A00] font-semibold">[ ACTIVE CAD FILE ]:</span>
              <span className="text-white font-medium">{fileName}</span>
              <span className="text-[#71717A]">•</span>
              <span className="text-[#A1A1AA]">{fileSize}</span>
              <span className="text-[#71717A]">•</span>
              <span className="text-[#4ADE80]">{fileExtension} FORMAT</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-sample-cube-quick"
                onClick={() => loadSample("cube20")}
                className="text-[10px] text-[#A1A1AA] hover:text-white border border-[#2b2b2b] px-2 py-1 bg-[#1a1a1a] hover:border-[#FF5A00] transition-colors"
              >
                CUBE 20MM
              </button>
              <button
                type="button"
                id="btn-sample-hex-quick"
                onClick={() => loadSample("hexConnector")}
                className="text-[10px] text-[#A1A1AA] hover:text-white border border-[#2b2b2b] px-2 py-1 bg-[#1a1a1a] hover:border-[#FF5A00] transition-colors"
              >
                M16 HEX COUPLER
              </button>
              <button
                type="button"
                id="btn-sample-torus-quick"
                onClick={() => loadSample("isoBracket")}
                className="text-[10px] text-[#A1A1AA] hover:text-white border border-[#2b2b2b] px-2 py-1 bg-[#1a1a1a] hover:border-[#FF5A00] transition-colors"
              >
                TORUS RING
              </button>
              <button
                type="button"
                id="btn-reset-pipeline"
                onClick={reset}
                className="text-[10px] text-[#FF5A00] hover:bg-[#FF5A00] hover:text-black border border-[#FF5A00] px-2.5 py-1 transition-colors uppercase font-semibold ml-2"
              >
                CLEAR
              </button>
            </div>
          </div>
        )}

        {/* ── 3. WORKSPACE STAGE: 3D VIEWPORT + CLIENT-SIDE SLICING METRICS ── */}
        {status === "ready" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 3D Viewport with OrbitControls & Floating HUD (7 cols) */}
            <div className="lg:col-span-7">
              <ModelViewport
                geometry={geometry}
                edgesGeometry={edgesGeometry}
                analysis={analysis}
                selectedMaterial={selectedMaterial}
                onResetModel={reset}
              />
            </div>

            {/* Client-Side Slicing / Bounding Box Extractor Panel (5 cols) */}
            <div className="lg:col-span-5">
              <ModelDetailsPanel
                analysis={analysis}
                fileName={fileName}
                fileSize={fileSize}
                fileExtension={fileExtension}
                selectedMaterial={selectedMaterial}
                onSelectMaterial={setSelectedMaterial}
                infillPercent={infillPercent}
                onSelectInfill={setInfillPercent}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ModelUploaderStandalone() {
  const parser = useModelParser();
  return <ModelUploaderInner parser={parser} />;
}

export default function ModelUploader({ parser }) {
  if (parser) {
    return <ModelUploaderInner parser={parser} />;
  }
  return <ModelUploaderStandalone />;
}

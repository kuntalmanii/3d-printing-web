/**
 * Dropzone.jsx
 * ───────────────────────────────────────────────────────────────
 * Industrial drag-and-drop ingestion zone:
 *  - 1px dashed #333333 border, #111111 background
 *  - Dynamically changes to #FF5A00 dashed border on drag-over
 *  - Fallback button: "[ SELECT LOCAL FILE ]" in JetBrains Mono
 *  - Quick sample model presets for instantaneous evaluation
 *  - Supports .STL (binary/ASCII) and .OBJ files
 */

import { useState, useRef } from "react";

export function Dropzone({
  onFileSelect,
  onLoadSample,
  isLoading,
  progress,
  error,
  currentFileName,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the container itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj"
        className="hidden"
        id="model-file-input"
        onChange={handleFileInputChange}
      />

      {/* Main Dropzone Surface */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full p-8 md:p-10 transition-colors duration-150 text-center
          bg-[#111111]
          ${
            isDragging
              ? "border border-dashed border-[#FF5A00] bg-[#1a120b]"
              : "border border-dashed border-[#333333] hover:border-[#555555]"
          }
        `}
      >
        {/* Subtle corner mechanical bracket accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#FF5A00]" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#FF5A00]" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#FF5A00]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#FF5A00]" />

        {/* Loading Progress Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#111111]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 mb-4 border-2 border-[#333333] border-t-[#FF5A00] rounded-none animate-spin" />
            <div className="font-mono text-[12px] uppercase tracking-wider text-white mb-2">
              [ PARSING 3D BUFFER GEOMETRY // {progress}% ]
            </div>
            <div className="w-64 h-1 bg-[#222222] overflow-hidden">
              <div
                className="h-full bg-[#FF5A00] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-[#A1A1AA] mt-2">
              Extracting facets, computing volume & verifying manifold integrity...
            </span>
          </div>
        )}

        <div className="max-w-xl mx-auto flex flex-col items-center">
          {/* Top Status Header */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`w-2 h-2 rounded-full ${
                isDragging ? "bg-[#FF5A00] animate-ping" : "bg-[#FF5A00]"
              }`}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF5A00]">
              {isDragging
                ? "// DROP FILE TO COMMENCE CLIENT-SIDE SLICING"
                : "// 3D CAD FILE INGESTION PIPELINE"}
            </span>
          </div>

          {/* Interactive Icon / Graphic */}
          <div className="w-16 h-16 mb-5 border border-[#333333] bg-[#161616] flex items-center justify-center group-hover:border-[#FF5A00] transition-colors">
            <svg
              className={`w-8 h-8 ${isDragging ? "text-[#FF5A00]" : "text-[#A1A1AA]"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>

          {/* Main Prompt */}
          <p className="font-sans text-[16px] md:text-[18px] font-medium text-white mb-1">
            Drag and drop 3D model file here
          </p>
          <p className="font-sans text-[13px] text-[#A1A1AA] mb-6">
            Accepts binary/ASCII <span className="text-white font-mono">.STL</span> and{" "}
            <span className="text-white font-mono">.OBJ</span> files (up to 100MB). Parsed
            entirely in your browser.
          </p>

          {/* Fallback Button (JetBrains Mono) */}
          <button
            id="btn-select-local-file"
            type="button"
            onClick={triggerFileBrowser}
            className="
              inline-flex items-center justify-center
              bg-[#161616] hover:bg-[#FF5A00] hover:text-black
              border border-[#333333] hover:border-[#FF5A00]
              text-white font-mono text-[11px] tracking-[0.14em] uppercase
              px-7 py-3 rounded-none
              transition-all duration-150
              active:scale-[0.98]
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A00]
              mb-6
            "
          >
            [ SELECT LOCAL FILE ]
          </button>

          {/* Current file notification */}
          {currentFileName && (
            <div className="font-mono text-[11px] text-[#A1A1AA] bg-[#161616] border border-[#333333] px-3 py-1.5 mb-6 flex items-center gap-2">
              <span className="text-[#FF5A00]">LOADED:</span>
              <span className="text-white truncate max-w-[260px]">{currentFileName}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="w-full mb-6 p-3 bg-red-950/40 border border-red-800 text-red-300 font-mono text-[12px] flex items-start gap-2 text-left">
              <span className="text-red-400 font-bold">[ERROR]</span>
              <span>{error}</span>
            </div>
          )}

          {/* Sample Preset Buttons for Instant Evaluation */}
          <div className="w-full pt-4 border-t border-[#222222]">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#666666] mb-3">
              OR TEST INSTANTLY WITH BENCHMARK CAD PRESETS:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                id="btn-sample-cube"
                type="button"
                onClick={() => onLoadSample("cube20")}
                className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 border border-[#333333] bg-[#141414] text-[#A1A1AA] hover:text-white hover:border-[#FF5A00] transition-colors"
              >
                [ 20mm CALIBRATION CUBE ]
              </button>
              <button
                id="btn-sample-hex"
                type="button"
                onClick={() => onLoadSample("hexConnector")}
                className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 border border-[#333333] bg-[#141414] text-[#A1A1AA] hover:text-white hover:border-[#FF5A00] transition-colors"
              >
                [ M16 HEX COUPLER ]
              </button>
              <button
                id="btn-sample-torus"
                type="button"
                onClick={() => onLoadSample("isoBracket")}
                className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 border border-[#333333] bg-[#141414] text-[#A1A1AA] hover:text-white hover:border-[#FF5A00] transition-colors"
              >
                [ TORUS STRUCTURAL RING ]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

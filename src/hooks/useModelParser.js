/**
 * useModelParser.js
 * ───────────────────────────────────────────────────────────────
 * React hook for client-side 3D model parsing & analytical extraction:
 *  - Supports .STL (binary & ASCII) via STLLoader from three-stdlib
 *  - Supports .OBJ via OBJLoader from three-stdlib
 *  - Automatic memory cleanup & geometry disposal
 *  - Computes dimensions, volume, surface area, weight estimates & watertight status
 *  - Built-in sample model presets for instant testing
 */

import { useState, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader, OBJLoader, mergeBufferGeometries } from "three-stdlib";
import {
  analyzeGeometry,
  normalizeGeometryForBuildPlate,
  generateSampleGeometry,
  MATERIAL_DENSITIES,
} from "../utils/modelAnalysis";

export function useModelParser() {
  const [status, setStatus] = useState("loading"); // 'idle' | 'loading' | 'ready' | 'error'
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("20mm_Calibration_Cube.stl");
  const [fileSize, setFileSize] = useState("18.4 KB");
  const [fileExtension, setFileExtension] = useState("STL");
  const [error, setError] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [edgesGeometry, setEdgesGeometry] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState("PLA");
  const [infillPercent, setInfillPercent] = useState(100);

  // Keep references to dispose on replacement or unmount
  const activeGeoRef = useRef(null);
  const activeEdgesRef = useRef(null);

  const cleanupGeometries = useCallback(() => {
    if (activeGeoRef.current) {
      activeGeoRef.current.dispose();
      activeGeoRef.current = null;
    }
    if (activeEdgesRef.current) {
      activeEdgesRef.current.dispose();
      activeEdgesRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupGeometries();
    };
  }, [cleanupGeometries]);

  /**
   * Applies and sets a new BufferGeometry into state
   */
  const applyGeometry = useCallback(
    (rawGeometry, name, sizeStr, ext) => {
      try {
        cleanupGeometries();

        // 1. Center at origin and position bottom at build plate plane (Y = 0)
        const normalized = normalizeGeometryForBuildPlate(rawGeometry);

        // 2. Compute sharp CAD engineering edges for wireframe overlay
        // 24-degree threshold captures true mechanical features cleanly
        const edges = new THREE.EdgesGeometry(normalized, 24);

        // 3. Compute client-side physical and topological metrics
        const analysisResults = analyzeGeometry(normalized);

        activeGeoRef.current = normalized;
        activeEdgesRef.current = edges;

        setGeometry(normalized);
        setEdgesGeometry(edges);
        setAnalysis(analysisResults);
        setFileName(name);
        setFileSize(sizeStr);
        setFileExtension(ext.toUpperCase());
        setError(null);
        setStatus("ready");
        setProgress(100);
      } catch (err) {
        console.error("Failed to analyze 3D geometry:", err);
        setError(`Analytical extraction failed: ${err.message}`);
        setStatus("error");
      }
    },
    [cleanupGeometries]
  );

  // Load default 20mm calibration cube on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const sample = generateSampleGeometry("cube20");
        applyGeometry(sample, "20mm_Calibration_Cube.stl", "18.4 KB", "stl");
      } catch (err) {
        console.error("Initial sample load error:", err);
        setStatus("idle");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [applyGeometry]);

  /**
   * Loads and parses a local File object (.stl or .obj)
   */
  const loadFile = useCallback(
    async (file) => {
      if (!file) return;

      const name = file.name;
      const ext = name.split(".").pop().toLowerCase();

      if (ext !== "stl" && ext !== "obj") {
        setError(`Unsupported file format ".${ext}". Please upload an .STL or .OBJ file.`);
        setStatus("error");
        return;
      }

      setStatus("loading");
      setProgress(10);
      setError(null);

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = `${sizeInMB} MB`;

      try {
        if (ext === "stl") {
          // Parse STL with STLLoader from three-stdlib
          const reader = new FileReader();

          reader.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 60) + 10;
              setProgress(pct);
            }
          };

          reader.onload = (evt) => {
            try {
              setProgress(75);
              const buffer = evt.target.result;
              const loader = new STLLoader();
              const parsedGeometry = loader.parse(buffer);

              setProgress(90);
              applyGeometry(parsedGeometry, name, sizeStr, ext);
            } catch (err) {
              console.error("STLLoader parse error:", err);
              setError(`STL parsing error: ${err.message || "Invalid or corrupt STL file."}`);
              setStatus("error");
            }
          };

          reader.onerror = () => {
            setError("Could not read local file. Please try again.");
            setStatus("error");
          };

          reader.readAsArrayBuffer(file);
        } else if (ext === "obj") {
          // Parse OBJ with OBJLoader from three-stdlib
          const reader = new FileReader();

          reader.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 60) + 10;
              setProgress(pct);
            }
          };

          reader.onload = (evt) => {
            try {
              setProgress(75);
              const text = evt.target.result;
              const loader = new OBJLoader();
              const objGroup = loader.parse(text);

              const geometries = [];
              objGroup.traverse((child) => {
                if (child.isMesh && child.geometry) {
                  geometries.push(child.geometry.clone());
                }
              });

              if (geometries.length === 0) {
                throw new Error("No mesh geometry found in OBJ file.");
              }

              let combinedGeometry;
              if (geometries.length === 1) {
                combinedGeometry = geometries[0];
              } else {
                combinedGeometry = mergeBufferGeometries(geometries);
              }

              setProgress(90);
              applyGeometry(combinedGeometry, name, sizeStr, ext);
            } catch (err) {
              console.error("OBJLoader parse error:", err);
              setError(`OBJ parsing error: ${err.message || "Invalid or corrupt OBJ file."}`);
              setStatus("error");
            }
          };

          reader.onerror = () => {
            setError("Could not read local file. Please try again.");
            setStatus("error");
          };

          reader.readAsText(file);
        }
      } catch (err) {
        console.error("File ingestion error:", err);
        setError(`File ingestion failed: ${err.message}`);
        setStatus("error");
      }
    },
    [applyGeometry]
  );

  /**
   * Loads a built-in benchmark geometry preset
   */
  const loadSample = useCallback(
    (type = "cube20") => {
      setStatus("loading");
      setProgress(30);
      setError(null);

      setTimeout(() => {
        try {
          const sampleGeo = generateSampleGeometry(type);
          const labels = {
            cube20: { name: "20mm_Calibration_Cube.stl", size: "18.4 KB" },
            hexConnector: { name: "M16_Hex_Fitting.stl", size: "32.1 KB" },
            isoBracket: { name: "Torus_Coupling_Link.stl", size: "48.6 KB" },
          };
          const meta = labels[type] || { name: "Sample_Model.stl", size: "24.0 KB" };

          setProgress(80);
          applyGeometry(sampleGeo, meta.name, meta.size, "stl");
        } catch (err) {
          console.error("Sample load error:", err);
          setError(`Failed to load benchmark sample: ${err.message}`);
          setStatus("error");
        }
      }, 150);
    },
    [applyGeometry]
  );

  /**
   * Resets viewer back to initial idle dropzone state
   */
  const reset = useCallback(() => {
    cleanupGeometries();
    setGeometry(null);
    setEdgesGeometry(null);
    setAnalysis(null);
    setFileName("");
    setFileSize("");
    setFileExtension("");
    setError(null);
    setStatus("idle");
    setProgress(0);
  }, [cleanupGeometries]);

  return {
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
    materialSpecs: MATERIAL_DENSITIES[selectedMaterial] || MATERIAL_DENSITIES.PLA,
  };
}

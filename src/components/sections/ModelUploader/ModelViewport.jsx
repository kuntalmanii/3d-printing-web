/**
 * ModelViewport.jsx
 * ───────────────────────────────────────────────────────────────
 * 3D Viewport component:
 *  - Three.js Canvas with OrbitControls from three-stdlib
 *  - Engineering wireframe-on-shaded material (dark grey surface + #FF5A00 edges)
 *  - 256x256mm build plate grid with scale indicators
 *  - 256x256x256mm build volume bounding box
 *  - Camera view presets (ISO, TOP, FRONT, RESET)
 *  - Embedded floating telemetry HUD in JetBrains Mono
 */

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls as ThreeOrbitControls } from "three-stdlib";
import * as THREE from "three";
import { ModelHUD } from "./ModelHUD";
import { BUILD_VOLUME } from "../../../utils/modelAnalysis";

/* ═══════════════════════════════════════════════════════════════
   1. ORBIT CONTROLS WRAPPER (three-stdlib)
═══════════════════════════════════════════════════════════════ */
function Controls({ controlsRef, autoRotate }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 1200;
    // Restrict camera from going completely beneath the build plate
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.target.set(0, 15, 0);

    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl, controlsRef]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.6;
      controlsRef.current.update();
    }
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   2. CAMERA AUTO-FIT CONTROLLER
═══════════════════════════════════════════════════════════════ */
function CameraController({ geometry, controlsRef, viewPreset }) {
  const { camera } = useThree();

  // Auto-frame when geometry changes
  useEffect(() => {
    if (!geometry) return;

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 50);
    const dist = maxDim * 2.1;
    const centerY = size.y / 2;

    camera.position.set(dist * 0.9, dist * 0.85, dist * 1.05);
    camera.lookAt(0, centerY, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, centerY, 0);
      controlsRef.current.update();
    }
  }, [geometry, camera, controlsRef]);

  // Handle Preset changes
  useEffect(() => {
    if (!controlsRef.current || !geometry) return;
    const box = geometry.boundingBox || new THREE.Box3();
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 60);
    const centerY = size.y / 2;
    const dist = maxDim * 2.2;

    if (viewPreset === "top") {
      camera.position.set(0, dist * 1.6, 0.001);
      controlsRef.current.target.set(0, 0, 0);
    } else if (viewPreset === "front") {
      camera.position.set(0, centerY, dist * 1.6);
      controlsRef.current.target.set(0, centerY, 0);
    } else if (viewPreset === "iso" || viewPreset === "reset") {
      camera.position.set(dist * 0.9, dist * 0.85, dist * 1.05);
      controlsRef.current.target.set(0, centerY, 0);
    }

    camera.lookAt(controlsRef.current.target);
    controlsRef.current.update();
  }, [viewPreset, geometry, camera, controlsRef]);

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   3. 256x256mm BUILD PLATE & GRID
═══════════════════════════════════════════════════════════════ */
function BuildPlate({ showVolumeBox }) {
  const size = BUILD_VOLUME.x; // 256mm
  const half = size / 2; // 128mm

  // 10mm Minor Grid + 50mm Major Grid lines
  const { minorGeo, majorGeo, borderGeo, volumeBoxGeo } = useMemo(() => {
    const minorVerts = [];
    const majorVerts = [];

    // 10mm step
    for (let p = -half; p <= half; p += 10) {
      const isMajor = p % 50 === 0 || p === -half || p === half;
      const target = isMajor ? majorVerts : minorVerts;

      // X lines (along Z)
      target.push(p, 0.05, -half, p, 0.05, half);
      // Z lines (along X)
      target.push(-half, 0.05, p, half, 0.05, p);
    }

    const minorG = new THREE.BufferGeometry();
    minorG.setAttribute("position", new THREE.Float32BufferAttribute(minorVerts, 3));

    const majorG = new THREE.BufferGeometry();
    majorG.setAttribute("position", new THREE.Float32BufferAttribute(majorVerts, 3));

    // Outer border with Bambu-style corner tabs
    const bVerts = [
      -half, 0.1, -half,  half, 0.1, -half,
       half, 0.1, -half,  half, 0.1,  half,
       half, 0.1,  half, -half, 0.1,  half,
      -half, 0.1,  half, -half, 0.1, -half,
    ];
    const borderG = new THREE.BufferGeometry();
    borderG.setAttribute("position", new THREE.Float32BufferAttribute(bVerts, 3));

    // 256x256x256 mm Build Volume Wireframe Box
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    // Offset so bottom rests at Y=0
    boxEdges.translate(0, half, 0);

    return {
      minorGeo: minorG,
      majorGeo: majorG,
      borderGeo: borderG,
      volumeBoxGeo: boxEdges,
    };
  }, [size, half]);

  return (
    <group position={[0, 0, 0]}>
      {/* Dark textured solid plate */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[size + 8, 2, size + 8]} />
        <meshStandardMaterial color="#121214" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Minor 10mm grid */}
      <lineSegments geometry={minorGeo}>
        <lineBasicMaterial color="#262626" transparent opacity={0.6} />
      </lineSegments>

      {/* Major 50mm grid */}
      <lineSegments geometry={majorGeo}>
        <lineBasicMaterial color="#404040" transparent opacity={0.8} />
      </lineSegments>

      {/* Outer 256x256mm Frame */}
      <lineSegments geometry={borderGeo}>
        <lineBasicMaterial color="#FF5A00" transparent opacity={0.85} />
      </lineSegments>

      {/* Center origin crosshair */}
      <axesHelper args={[20]} position={[0, 0.2, 0]} />

      {/* Build Volume Envelope (256³ mm) */}
      {showVolumeBox && (
        <lineSegments geometry={volumeBoxGeo}>
          <lineBasicMaterial color="#333333" transparent opacity={0.4} />
        </lineSegments>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. MODEL MESH (ENGINEERING WIREFRAME-ON-SHADED)
═══════════════════════════════════════════════════════════════ */
function ModelMesh({ geometry, edgesGeometry, showEdges }) {
  if (!geometry) return null;

  return (
    <group>
      {/* 1. Shaded Body Surface (Dark Grey Industrial Matte/Satin) */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#1e1e22"
          roughness={0.45}
          metalness={0.22}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* 2. Precision CAD Feature Edges in Orange #FF5A00 */}
      {showEdges && edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color="#FF5A00" linewidth={1.5} transparent opacity={0.95} />
        </lineSegments>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. MAIN VIEWPORT EXPORT
═══════════════════════════════════════════════════════════════ */
export function ModelViewport({
  geometry,
  edgesGeometry,
  analysis,
  selectedMaterial,
  onResetModel,
}) {
  const controlsRef = useRef(null);
  const [showEdges, setShowEdges] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showVolumeBox, setShowVolumeBox] = useState(true);
  const [viewPreset, setViewPreset] = useState("iso");

  const triggerPreset = (preset) => {
    setViewPreset(preset);
  };

  return (
    <div className="relative w-full h-[520px] md:h-[620px] bg-[#0c0c0e] border border-[#333333] overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        camera={{ position: [160, 140, 190], fov: 42, near: 1, far: 2500 }}
      >
        <color attach="background" args={["#0c0c0e"]} />

        {/* Studio Industrial Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[150, 220, 120]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-120, 100, -100]} intensity={0.4} color="#38BDF8" />
        <directionalLight position={[0, -50, 0]} intensity={0.2} color="#FFFFFF" />

        {/* Interactive Controls */}
        <Controls controlsRef={controlsRef} autoRotate={autoRotate} />

        {/* Camera Preset Handler */}
        <CameraController
          geometry={geometry}
          controlsRef={controlsRef}
          viewPreset={viewPreset}
        />

        {/* 256x256mm Build Plate Grid */}
        <BuildPlate showVolumeBox={showVolumeBox} />

        {/* The Loaded 3D Model */}
        <ModelMesh
          geometry={geometry}
          edgesGeometry={edgesGeometry}
          showEdges={showEdges}
        />
      </Canvas>

      {/* Floating HUD Telemetry (JetBrains Mono) */}
      <ModelHUD
        analysis={analysis}
        selectedMaterial={selectedMaterial}
      />

      {/* Viewport Control Bar (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        {/* Change / Reset File */}
        <button
          type="button"
          onClick={onResetModel}
          className="bg-[#111111]/90 hover:bg-[#FF5A00] hover:text-black border border-[#333333] hover:border-[#FF5A00] text-white px-2.5 py-1.5 transition-colors"
          title="Upload or load another model"
        >
          [ CHANGE FILE ]
        </button>

        {/* Wireframe toggle */}
        <button
          type="button"
          onClick={() => setShowEdges(!showEdges)}
          className={`border px-2.5 py-1.5 transition-colors ${
            showEdges
              ? "bg-[#FF5A00] text-black border-[#FF5A00] font-semibold"
              : "bg-[#111111]/90 text-[#A1A1AA] border-[#333333] hover:text-white"
          }`}
          title="Toggle orange CAD edge wireframe"
        >
          [ WIREFRAME: {showEdges ? "ON" : "OFF"} ]
        </button>

        {/* Auto Rotate toggle */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`border px-2.5 py-1.5 transition-colors ${
            autoRotate
              ? "bg-[#FF5A00] text-black border-[#FF5A00] font-semibold"
              : "bg-[#111111]/90 text-[#A1A1AA] border-[#333333] hover:text-white"
          }`}
          title="Toggle smooth auto rotation"
        >
          [ SPIN: {autoRotate ? "ON" : "OFF"} ]
        </button>

        {/* 256mm Volume Box toggle */}
        <button
          type="button"
          onClick={() => setShowVolumeBox(!showVolumeBox)}
          className={`border px-2.5 py-1.5 transition-colors ${
            showVolumeBox
              ? "bg-[#1f1f23] text-white border-[#555555]"
              : "bg-[#111111]/90 text-[#71717A] border-[#333333]"
          }`}
          title="Toggle 256x256x256mm build volume bounding cage"
        >
          [ 256³ CAGE ]
        </button>
      </div>

      {/* Camera Presets & Interaction Help (Bottom Bar) */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Interaction hints */}
        <div className="font-mono text-[10px] text-[#71717A] bg-[#111111]/80 backdrop-blur-sm border border-[#222222] px-2.5 py-1 pointer-events-auto flex items-center gap-3">
          <span>
            <strong className="text-white">L-DRAG:</strong> ROTATE
          </span>
          <span>•</span>
          <span>
            <strong className="text-white">R-DRAG:</strong> PAN
          </span>
          <span>•</span>
          <span>
            <strong className="text-white">SCROLL:</strong> ZOOM
          </span>
          <span>•</span>
          <span className="text-[#FF5A00]">BED: 256×256 mm</span>
        </div>

        {/* View Angle Presets */}
        <div className="font-mono text-[10px] bg-[#111111]/80 backdrop-blur-sm border border-[#222222] p-1 flex items-center gap-1 pointer-events-auto">
          <span className="text-[#71717A] px-1.5 uppercase">VIEW:</span>
          <button
            type="button"
            onClick={() => triggerPreset("iso")}
            className="px-2 py-0.5 border border-[#333333] text-[#A1A1AA] hover:text-white hover:border-[#FF5A00] transition-colors"
          >
            ISO
          </button>
          <button
            type="button"
            onClick={() => triggerPreset("top")}
            className="px-2 py-0.5 border border-[#333333] text-[#A1A1AA] hover:text-white hover:border-[#FF5A00] transition-colors"
          >
            TOP
          </button>
          <button
            type="button"
            onClick={() => triggerPreset("front")}
            className="px-2 py-0.5 border border-[#333333] text-[#A1A1AA] hover:text-white hover:border-[#FF5A00] transition-colors"
          >
            FRONT
          </button>
          <button
            type="button"
            onClick={() => triggerPreset("reset")}
            className="px-2 py-0.5 border border-[#333333] text-[#FF5A00] hover:bg-[#FF5A00] hover:text-black transition-colors"
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}

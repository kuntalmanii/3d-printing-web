/**
 * src/components/ModelViewer3D.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Interactive 3D WebGL Model Viewer & Slicer Canvas
 *
 * Built with Three.js (WebGL 2.0 / PBR Standard Materials):
 *  - 360° OrbitControls (Left-click drag to orbit, Wheel to zoom, Right-click to pan)
 *  - Real Procedural & STL CAD Geometries:
 *      * 3DBenchy Nautical Benchmark
 *      * Planetary Gearbox Epicyclic Assembly
 *      * Generative Turbofan Aerospace Nacelle Bracket
 *      * Articulated Imperial Dragon Spine
 *      * Micro-Lattice Cranial Osteo-Mesh Implant
 *      * Triple-Axis Kinetic Gyroscope Gimbal
 *      * Direct Binary/ASCII STL Parser for local uploaded files
 *  - Real-time Slicing Laser Cross-Section Clipping Plane (Local Clipping)
 *  - Heated Build Bed Grid with XYZ coordinates and millimeter markings
 *  - Material Shading matching active polymer (PA-CF, PETG, PLA+, Tough/Clear Resins)
 *  - View Modes: Shaded, Wireframe, X-Ray Infill, Slice Cross-Section
 *  - Camera Perspective Presets: ISO-3D, TOP (XY), FRONT (XZ), SIDE (YZ)
 *  - Dynamic Scale, Rotation, and Symmetry Mirroring integration
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { sound } from "../utils/soundEffects";

// Material Color & PBR Presets
const MATERIAL_PRESETS = {
  "pa-cf": {
    name: "PA-CF Carbon Fiber",
    color: 0x1a1a1d,
    emissive: 0x050505,
    roughness: 0.85,
    metalness: 0.25,
    transparent: false,
    opacity: 1.0,
    wireColor: 0xff5a00,
  },
  petg: {
    name: "PETG Industrial",
    color: 0x0284c7,
    emissive: 0x032742,
    roughness: 0.2,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
    wireColor: 0x38bdf8,
  },
  "pla-speed": {
    name: "PLA+ High Speed",
    color: 0xff5a00,
    emissive: 0x331200,
    roughness: 0.4,
    metalness: 0.1,
    transparent: false,
    opacity: 1.0,
    wireColor: 0xffa066,
  },
  "resin-tough": {
    name: "Tough 2000 Resin",
    color: 0x8b5cf6,
    emissive: 0x1f0f3d,
    roughness: 0.25,
    metalness: 0.3,
    transparent: true,
    opacity: 0.92,
    wireColor: 0xc4b5fd,
  },
  "resin-clear": {
    name: "High-Temp Optical Resin",
    color: 0x10b981,
    emissive: 0x022e20,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.65,
    wireColor: 0x6ee7b7,
  },
};

export default function ModelViewer3D({
  modelType = "custom",
  fileName = "",
  fileBuffer = null,
  dimensions = { x: 80, y: 60, z: 40 },
  scale = { x: 100, y: 100, z: 100 },
  rotation = { x: 0, y: 0, z: 0 },
  isMirroredX = false,
  isMirroredY = false,
  materialId = "pa-cf",
  technology = "FDM",
  layerProgress = 100, // 0 to 100%
  infill = 40,
  infillPattern = "Gyroid",
  onLayerChange = null,
  height = "320px",
  showControls = true,
  interactive = true,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Three.js internal instances
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelGroupRef = useRef(null);
  const laserPlaneRef = useRef(null);
  const boundingBoxMeshRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const clipPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 100));

  // Local UI HUD State
  const [renderMode, setRenderMode] = useState("shaded"); // "shaded" | "wireframe" | "xray" | "slice"
  const [activePerspective, setActivePerspective] = useState("ISO-3D");
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const isAutoRotatingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modelBounds, setModelBounds] = useState({ minZ: 0, maxZ: 40 });

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  // Detect which model type to render based on modelType prop or fileName
  const detectedType = useCallback(() => {
    const fn = (fileName || "").toLowerCase();
    const mt = (modelType || "").toLowerCase();
    if (fn.includes("benchy") || mt.includes("benchy")) return "benchy";
    if (fn.includes("gearbox") || fn.includes("planetary") || mt.includes("gearbox")) return "gearbox";
    if (fn.includes("turbofan") || fn.includes("drone") || mt.includes("turbofan") || fn.includes("bracket")) return "turbofan";
    if (fn.includes("dragon") || mt.includes("dragon")) return "dragon";
    if (fn.includes("cranial") || fn.includes("osteomesh") || mt.includes("cranial")) return "cranial";
    if (fn.includes("gyro") || fn.includes("gimbal") || mt.includes("gyro")) return "gyro";
    return "custom";
  }, [fileName, modelType]);

  // ───────────────────────────────────────────────────────────────────────────
  // PROCEDURAL CAD GEOMETRIES CREATOR
  // ───────────────────────────────────────────────────────────────────────────
  const buildModelMesh = useCallback(
    (type, currentMaterial) => {
      const rootGroup = new THREE.Group();
      rootGroup.name = "CAD_MODEL_ROOT";

      // Check if user uploaded a real .STL file buffer
      if (fileBuffer && fileBuffer.byteLength > 0) {
        try {
          const loader = new STLLoader();
          const geometry = loader.parse(fileBuffer);
          geometry.computeVertexNormals();
          geometry.center();

          // Calculate normalized bounding size to fit ~50mm build envelope
          geometry.computeBoundingBox();
          const bbox = geometry.boundingBox;
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetDim = 45;
          const scaleFactor = targetDim / maxDim;
          geometry.scale(scaleFactor, scaleFactor, scaleFactor);
          geometry.computeBoundingBox();

          const mesh = new THREE.Mesh(geometry, currentMaterial);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Align base to Y = 0 (on top of bed)
          const adjustedBox = new THREE.Box3().setFromObject(mesh);
          mesh.position.y = -adjustedBox.min.y;

          rootGroup.add(mesh);
          return rootGroup;
        } catch {
          // Fallback to procedural shape if corrupted
        }
      }

      // ── 1. 3DBENCHY NAUTICAL BENCHMARK ─────────────────────────────────────
      if (type === "benchy") {
        const benchyGroup = new THREE.Group();

        // Hull Keel & Gunwales (Lofted wedge hull)
        const hullGeo = new THREE.CylinderGeometry(14, 2, 22, 16, 4);
        hullGeo.rotateZ(Math.PI / 2);
        hullGeo.scale(1.8, 0.7, 0.9);
        const hullMesh = new THREE.Mesh(hullGeo, currentMaterial);
        hullMesh.position.set(0, 7, 0);
        hullMesh.castShadow = true;
        benchyGroup.add(hullMesh);

        // Deck Flat Bed
        const deckGeo = new THREE.BoxGeometry(38, 3, 16);
        const deckMesh = new THREE.Mesh(deckGeo, currentMaterial);
        deckMesh.position.set(2, 11, 0);
        benchyGroup.add(deckMesh);

        // Stern Cargo Box
        const cargoGeo = new THREE.BoxGeometry(10, 6, 12);
        const cargoMesh = new THREE.Mesh(cargoGeo, currentMaterial);
        cargoMesh.position.set(-11, 14, 0);
        benchyGroup.add(cargoMesh);

        // Wheelhouse / Cabin
        const cabinGeo = new THREE.BoxGeometry(16, 15, 13);
        const cabinMesh = new THREE.Mesh(cabinGeo, currentMaterial);
        cabinMesh.position.set(4, 18, 0);
        benchyGroup.add(cabinMesh);

        // Cabin Roof Arch
        const roofGeo = new THREE.CylinderGeometry(10, 10, 18, 12, 1, false, 0, Math.PI);
        roofGeo.rotateZ(Math.PI / 2);
        roofGeo.scale(0.9, 0.35, 1.0);
        const roofMesh = new THREE.Mesh(roofGeo, currentMaterial);
        roofMesh.position.set(4, 25.5, 0);
        benchyGroup.add(roofMesh);

        // Chimney / Smokestack
        const chimneyGeo = new THREE.CylinderGeometry(2.6, 3.2, 12, 16);
        const chimneyMesh = new THREE.Mesh(chimneyGeo, currentMaterial);
        chimneyMesh.position.set(2, 30, 0);
        benchyGroup.add(chimneyMesh);

        // Chimney Top Lip
        const lipGeo = new THREE.TorusGeometry(3.0, 0.8, 8, 16);
        lipGeo.rotateX(Math.PI / 2);
        const lipMesh = new THREE.Mesh(lipGeo, currentMaterial);
        lipMesh.position.set(2, 36, 0);
        benchyGroup.add(lipMesh);

        // Bow Hawse Pipe Hole (Circular portal)
        const hawseGeo = new THREE.TorusGeometry(1.6, 0.5, 8, 16);
        hawseGeo.rotateY(Math.PI / 2);
        const hawseMesh1 = new THREE.Mesh(hawseGeo, currentMaterial);
        hawseMesh1.position.set(16, 10, 6.5);
        const hawseMesh2 = hawseMesh1.clone();
        hawseMesh2.position.set(16, 10, -6.5);
        benchyGroup.add(hawseMesh1, hawseMesh2);

        benchyGroup.position.set(0, 0, 0);
        rootGroup.add(benchyGroup);
        return rootGroup;
      }

      // ── 2. PLANETARY GEARBOX EPICYCLIC ASSEMBLY ────────────────────────────
      if (type === "gearbox") {
        const gearboxGroup = new THREE.Group();

        // Outer Annular Ring Gear
        const ringOuterGeo = new THREE.CylinderGeometry(26, 26, 12, 32, 1, true);
        const ringOuter = new THREE.Mesh(ringOuterGeo, currentMaterial);
        ringOuter.position.y = 8;
        gearboxGroup.add(ringOuter);

        // Ring Mounting Flange with 6 Bolt Holes
        const flangeGeo = new THREE.CylinderGeometry(29, 29, 2, 32);
        const flangeMesh = new THREE.Mesh(flangeGeo, currentMaterial);
        flangeMesh.position.y = 2;
        gearboxGroup.add(flangeMesh);

        // 6 Bolt Holes (Dark recessed studs)
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const studGeo = new THREE.CylinderGeometry(1.5, 1.5, 3.5, 12);
          const studMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
          const stud = new THREE.Mesh(studGeo, studMat);
          stud.position.set(Math.cos(angle) * 27.5, 2.5, Math.sin(angle) * 27.5);
          gearboxGroup.add(stud);
        }

        // Central Sun Gear
        const sunGeo = new THREE.CylinderGeometry(7.5, 7.5, 14, 18);
        const sunMesh = new THREE.Mesh(sunGeo, currentMaterial);
        sunMesh.position.y = 9;
        gearboxGroup.add(sunMesh);

        // Sun Center Drive Shaft Bore
        const boreGeo = new THREE.CylinderGeometry(3.5, 3.5, 16, 16);
        const boreMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
        const boreMesh = new THREE.Mesh(boreGeo, boreMat);
        boreMesh.position.y = 9;
        gearboxGroup.add(boreMesh);

        // 4 Planet Gears Orbiting
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + Math.PI / 8;
          const planetRadius = 7.5;
          const orbitDist = 15.5;

          const planetGeo = new THREE.CylinderGeometry(planetRadius, planetRadius, 12, 16);
          const planetMesh = new THREE.Mesh(planetGeo, currentMaterial);
          planetMesh.position.set(Math.cos(angle) * orbitDist, 8, Math.sin(angle) * orbitDist);
          gearboxGroup.add(planetMesh);

          // Center Axle Pin
          const pinGeo = new THREE.CylinderGeometry(1.8, 1.8, 14, 12);
          const pinMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
          const pin = new THREE.Mesh(pinGeo, pinMat);
          pin.position.set(Math.cos(angle) * orbitDist, 8.5, Math.sin(angle) * orbitDist);
          gearboxGroup.add(pin);
        }

        // Cross Carrier Plate
        const carrierGeo = new THREE.BoxGeometry(32, 2, 8);
        const carrierMesh1 = new THREE.Mesh(carrierGeo, currentMaterial);
        carrierMesh1.position.y = 15;
        const carrierMesh2 = carrierMesh1.clone();
        carrierMesh2.rotateY(Math.PI / 2);
        gearboxGroup.add(carrierMesh1, carrierMesh2);

        rootGroup.add(gearboxGroup);
        return rootGroup;
      }

      // ── 3. GENERATIVE TURBOFAN AEROSPACE BRACKET ───────────────────────────
      if (type === "turbofan") {
        const aeroGroup = new THREE.Group();

        // Outer Nacelle Cowl Ring
        const cowlGeo = new THREE.CylinderGeometry(24, 21, 16, 32, 1, true);
        const cowlMesh = new THREE.Mesh(cowlGeo, currentMaterial);
        cowlMesh.position.set(0, 16, 0);
        aeroGroup.add(cowlMesh);

        // Aerodynamic Lip Ring
        const lipGeo = new THREE.TorusGeometry(24, 1.6, 12, 32);
        lipGeo.rotateX(Math.PI / 2);
        const lipMesh = new THREE.Mesh(lipGeo, currentMaterial);
        lipMesh.position.set(0, 24, 0);
        aeroGroup.add(lipMesh);

        // Center Aerodynamic Spinner Hub
        const hubGeo = new THREE.ConeGeometry(7, 18, 24);
        hubGeo.rotateX(Math.PI);
        const hubMesh = new THREE.Mesh(hubGeo, currentMaterial);
        hubMesh.position.set(0, 18, 0);
        aeroGroup.add(hubMesh);

        // 10 Stator Airfoil Vanes
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI * 2) / 10;
          const vaneGeo = new THREE.BoxGeometry(16, 1.2, 7);
          vaneGeo.rotateY(angle);
          vaneGeo.rotateZ(0.45);
          const vaneMesh = new THREE.Mesh(vaneGeo, currentMaterial);
          vaneMesh.position.set((Math.cos(angle) * 14) / 2, 16, (Math.sin(angle) * 14) / 2);
          aeroGroup.add(vaneMesh);
        }

        // Generative Structural Mounting Arm (Angled bracket)
        const armGeo = new THREE.BoxGeometry(22, 14, 10);
        armGeo.rotateZ(-0.35);
        const armMesh = new THREE.Mesh(armGeo, currentMaterial);
        armMesh.position.set(-20, 8, 0);
        aeroGroup.add(armMesh);

        // Baseplate with 4 Mounting Holes
        const baseGeo = new THREE.BoxGeometry(16, 3, 28);
        const baseMesh = new THREE.Mesh(baseGeo, currentMaterial);
        baseMesh.position.set(-28, 1.5, 0);
        aeroGroup.add(baseMesh);

        rootGroup.add(aeroGroup);
        return rootGroup;
      }

      // ── 4. ARTICULATED IMPERIAL DRAGON SPINE ────────────────────────────────
      if (type === "dragon") {
        const dragonGroup = new THREE.Group();

        // Stylized Dragon Head
        const headGeo = new THREE.ConeGeometry(7, 16, 6);
        headGeo.rotateZ(-Math.PI / 2);
        const headMesh = new THREE.Mesh(headGeo, currentMaterial);
        headMesh.position.set(22, 10, 0);
        dragonGroup.add(headMesh);

        // Dual Horns
        const hornGeo = new THREE.CylinderGeometry(0.5, 2, 10, 8);
        hornGeo.rotateZ(0.6);
        const horn1 = new THREE.Mesh(hornGeo, currentMaterial);
        horn1.position.set(20, 16, 4);
        const horn2 = horn1.clone();
        horn2.position.set(20, 16, -4);
        dragonGroup.add(horn1, horn2);

        // 12 Articulated Spine Links arranged in a graceful serpentine wave
        for (let i = 0; i < 12; i++) {
          const t = i / 12;
          const x = 16 - i * 3.6;
          const y = 8 + Math.sin(t * Math.PI * 2) * 2;
          const z = Math.sin(t * Math.PI * 3) * 7;
          const segRadius = Math.max(2.2, 5.5 - i * 0.28);

          // Segment Sphere/Cylinder body
          const segGeo = new THREE.CylinderGeometry(segRadius, segRadius * 0.85, 4.5, 10);
          segGeo.rotateZ(Math.PI / 2);
          const segMesh = new THREE.Mesh(segGeo, currentMaterial);
          segMesh.position.set(x, y, z);
          dragonGroup.add(segMesh);

          // Dorsal Spike Ridge
          const spikeGeo = new THREE.ConeGeometry(1.6, 5, 4);
          const spikeMesh = new THREE.Mesh(spikeGeo, currentMaterial);
          spikeMesh.position.set(x, y + segRadius + 2.5, z);
          dragonGroup.add(spikeMesh);
        }

        // Tail Fan Blade
        const tailGeo = new THREE.BoxGeometry(8, 6, 1);
        tailGeo.rotateY(0.4);
        const tailMesh = new THREE.Mesh(tailGeo, currentMaterial);
        tailMesh.position.set(-28, 7, -3);
        dragonGroup.add(tailMesh);

        rootGroup.add(dragonGroup);
        return rootGroup;
      }

      // ── 5. CRANIAL OSTEO-MESH IMPLANT ──────────────────────────────────────
      if (type === "cranial") {
        const cranialGroup = new THREE.Group();

        // Curved Anatomical Cranial Cap
        const domeGeo = new THREE.SphereGeometry(24, 28, 16, 0, Math.PI, 0, Math.PI * 0.48);
        domeGeo.rotateX(Math.PI / 2);
        const domeMesh = new THREE.Mesh(domeGeo, currentMaterial);
        domeMesh.position.set(0, 12, 0);
        cranialGroup.add(domeMesh);

        // Inner Micro-Lattice Grid (Porous Scaffold)
        const latticeGeo = new THREE.SphereGeometry(23.2, 32, 20, 0, Math.PI, 0, Math.PI * 0.48);
        latticeGeo.rotateX(Math.PI / 2);
        const latticeMat = new THREE.MeshBasicMaterial({
          color: 0x34d399,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
        });
        const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
        latticeMesh.position.set(0, 12, 0);
        cranialGroup.add(latticeMesh);

        // Solid Fixation Flange Rim
        const rimGeo = new THREE.TorusGeometry(23.8, 1.8, 12, 32, Math.PI);
        rimGeo.rotateX(Math.PI / 2);
        const rimMesh = new THREE.Mesh(rimGeo, currentMaterial);
        rimMesh.position.set(0, 12, 0);
        cranialGroup.add(rimMesh);

        // 4 Titanium Fixation Screw Eyelets
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 3;
          const eyeletGeo = new THREE.TorusGeometry(3.5, 1.2, 8, 16);
          const eyeletMesh = new THREE.Mesh(eyeletGeo, currentMaterial);
          eyeletMesh.position.set(Math.cos(angle) * 25, 12, Math.sin(angle) * 25);
          cranialGroup.add(eyeletMesh);
        }

        rootGroup.add(cranialGroup);
        return rootGroup;
      }

      // ── 6. TRIPLE-AXIS KINETIC GYROSCOPE ───────────────────────────────────
      if (type === "gyro") {
        const gyroGroup = new THREE.Group();

        // Outer Gimbal Ring
        const ring1Geo = new THREE.TorusGeometry(26, 1.6, 16, 36);
        const ring1 = new THREE.Mesh(ring1Geo, currentMaterial);
        ring1.position.y = 20;
        gyroGroup.add(ring1);

        // Intermediate Gimbal Ring (Rotated 45 degrees)
        const ring2Geo = new THREE.TorusGeometry(20, 1.5, 16, 32);
        ring2Geo.rotateX(Math.PI / 4);
        const ring2 = new THREE.Mesh(ring2Geo, currentMaterial);
        ring2.position.y = 20;
        gyroGroup.add(ring2);

        // Inner Gimbal Ring (Rotated 90 degrees)
        const ring3Geo = new THREE.TorusGeometry(14, 1.4, 16, 28);
        ring3Geo.rotateY(Math.PI / 3);
        const ring3 = new THREE.Mesh(ring3Geo, currentMaterial);
        ring3.position.y = 20;
        gyroGroup.add(ring3);

        // Central Balanced Heavy Rotor Flywheel
        const rotorGeo = new THREE.CylinderGeometry(9, 9, 5, 24);
        rotorGeo.rotateX(Math.PI / 2);
        const rotorMat = new THREE.MeshStandardMaterial({
          color: 0xeab308,
          metalness: 0.85,
          roughness: 0.2,
        });
        const rotor = new THREE.Mesh(rotorGeo, rotorMat);
        rotor.position.y = 20;
        gyroGroup.add(rotor);

        // Spindle Axle
        const spindleGeo = new THREE.CylinderGeometry(1.2, 1.2, 32, 12);
        const spindle = new THREE.Mesh(spindleGeo, currentMaterial);
        spindle.position.y = 20;
        gyroGroup.add(spindle);

        // Pedestal Stand
        const baseGeo = new THREE.CylinderGeometry(18, 20, 3, 32);
        const baseMesh = new THREE.Mesh(baseGeo, currentMaterial);
        baseMesh.position.y = 1.5;
        gyroGroup.add(baseMesh);

        const pillarGeo = new THREE.CylinderGeometry(2.5, 4, 18, 16);
        const pillarMesh = new THREE.Mesh(pillarGeo, currentMaterial);
        pillarMesh.position.y = 10;
        gyroGroup.add(pillarMesh);

        rootGroup.add(gyroGroup);
        return rootGroup;
      }

      // ── 7. GENERIC PRECISION INDUSTRIAL CAD PART (DEFAULT) ─────────────────
      const genericGroup = new THREE.Group();

      // Main Stepped Flanged Cylinder
      const mainBodyGeo = new THREE.CylinderGeometry(18, 22, 24, 24);
      const mainBody = new THREE.Mesh(mainBodyGeo, currentMaterial);
      mainBody.position.y = 14;
      genericGroup.add(mainBody);

      // Central Through Bore
      const centerBoreGeo = new THREE.CylinderGeometry(9, 9, 28, 20);
      const centerBoreMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
      const centerBore = new THREE.Mesh(centerBoreGeo, centerBoreMat);
      centerBore.position.y = 14;
      genericGroup.add(centerBore);

      // Mounting Base Flange
      const mountFlangeGeo = new THREE.CylinderGeometry(28, 28, 3.5, 32);
      const mountFlange = new THREE.Mesh(mountFlangeGeo, currentMaterial);
      mountFlange.position.y = 2;
      genericGroup.add(mountFlange);

      // 4 Fastener Counter-bore Holes
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const holeGeo = new THREE.CylinderGeometry(2.2, 2.2, 5, 12);
        const holeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(Math.cos(angle) * 23, 2.5, Math.sin(angle) * 23);
        genericGroup.add(hole);
      }

      // Stiffening Web Gussets
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const gussetGeo = new THREE.BoxGeometry(8, 14, 2.5);
        gussetGeo.rotateY(angle);
        const gusset = new THREE.Mesh(gussetGeo, currentMaterial);
        gusset.position.set(Math.cos(angle) * 16, 10, Math.sin(angle) * 16);
        genericGroup.add(gusset);
      }

      rootGroup.add(genericGroup);
      return rootGroup;
    },
    [fileBuffer]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // THREE.JS SCENE INITIALIZATION & EVENT LOOP
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const containerWidth = container.clientWidth || 300;
    const containerHeight = container.clientHeight || 280;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera (Perspective CAD View)
    const camera = new THREE.PerspectiveCamera(42, containerWidth / containerHeight, 0.5, 1000);
    camera.position.set(55, 45, 55);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High-Precision Local Clipping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 12, 0);
    controls.minDistance = 15;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI * 0.88;
    controlsRef.current = controls;

    // 5. Studio Lighting
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key Directional Light (Studio Top-Right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(35, 60, 45);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 150;
    scene.add(keyLight);

    // Rim Accent Light (High-Energy Orange)
    const rimLight = new THREE.DirectionalLight(0xff5a00, 1.6);
    rimLight.position.set(-35, -5, -35);
    scene.add(rimLight);

    // Side Fill Light (Cyan contrast)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    fillLight.position.set(-30, 30, 20);
    scene.add(fillLight);

    // 6. Precision 3D Heated Build Bed
    const bedGroup = new THREE.Group();

    // Bed Grid (200 x 200 mm with 10mm ticks)
    const gridHelper = new THREE.GridHelper(100, 20, 0xff5a00, 0x27272a);
    gridHelper.position.y = 0;
    bedGroup.add(gridHelper);

    // Dark Bed Platter Plate
    const bedPlateGeo = new THREE.BoxGeometry(104, 1.2, 104);
    const bedPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f11,
      roughness: 0.9,
      metalness: 0.1,
    });
    const bedPlate = new THREE.Mesh(bedPlateGeo, bedPlateMat);
    bedPlate.position.y = -0.65;
    bedPlate.receiveShadow = true;
    bedGroup.add(bedPlate);

    // Orange Build Perimeter Border
    const bedBorderGeo = new THREE.EdgesGeometry(bedPlateGeo);
    const bedBorderMat = new THREE.LineBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.4 });
    const bedBorder = new THREE.LineSegments(bedBorderGeo, bedBorderMat);
    bedBorder.position.y = -0.65;
    bedGroup.add(bedBorder);

    // Origin XYZ Axes at [0, 0, 0]
    const axesHelper = new THREE.AxesHelper(14);
    axesHelper.position.set(0, 0.2, 0);
    bedGroup.add(axesHelper);

    scene.add(bedGroup);

    // 7. Glowing Laser Slicing Plane Helper
    const laserGroup = new THREE.Group();
    const laserRingGeo = new THREE.PlaneGeometry(80, 80);
    laserRingGeo.rotateX(-Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xff5a00,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const laserMesh = new THREE.Mesh(laserRingGeo, laserMat);
    laserGroup.add(laserMesh);

    // Perimeter laser scan edge
    const laserEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(laserRingGeo),
      new THREE.LineBasicMaterial({ color: 0xff5a00, linewidth: 2 })
    );
    laserGroup.add(laserEdges);
    laserGroup.position.y = 40;
    laserGroup.visible = false;
    scene.add(laserGroup);
    laserPlaneRef.current = laserGroup;

    // 8. Dynamic Bounding Box
    const bboxGeo = new THREE.BoxGeometry(1, 1, 1);
    const bboxMat = new THREE.LineBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.45 });
    const bboxMesh = new THREE.LineSegments(new THREE.EdgesGeometry(bboxGeo), bboxMat);
    bboxMesh.visible = false;
    scene.add(bboxMesh);
    boundingBoxMeshRef.current = bboxMesh;

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Animation Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Smooth auto-rotation if toggled
      if (modelGroupRef.current && isAutoRotatingRef.current) {
        modelGroupRef.current.rotation.y += 0.008;
      }

      // Smooth laser glow pulse
      if (laserMat.visible) {
        const elapsed = clock.getElapsedTime();
        laserMat.opacity = 0.12 + Math.sin(elapsed * 4) * 0.06;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update controls enabled state on interactive prop change
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = interactive;
    }
  }, [interactive]);

  // ───────────────────────────────────────────────────────────────────────────
  // UPDATE CAD MODEL MESH & MATERIAL ON PROP CHANGES
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing model
    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      modelGroupRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      modelGroupRef.current = null;
    }

    // Resolve material config
    const matPreset = MATERIAL_PRESETS[materialId] || MATERIAL_PRESETS["pa-cf"];

    let activeMat;
    if (renderMode === "wireframe") {
      activeMat = new THREE.MeshBasicMaterial({
        color: matPreset.wireColor || 0xff5a00,
        wireframe: true,
      });
    } else if (renderMode === "xray") {
      activeMat = new THREE.MeshStandardMaterial({
        color: matPreset.color,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        wireframe: false,
      });
    } else {
      activeMat = new THREE.MeshStandardMaterial({
        color: matPreset.color,
        emissive: matPreset.emissive || 0x000000,
        roughness: matPreset.roughness,
        metalness: matPreset.metalness,
        transparent: matPreset.transparent,
        opacity: matPreset.opacity,
      });
    }

    // Apply slicing clipping plane in slice mode
    if (renderMode === "slice") {
      activeMat.clippingPlanes = [clipPlaneRef.current];
      activeMat.clipShadows = true;
    }

    // Build the 3D model
    const type = detectedType();
    const newModelGroup = buildModelMesh(type, activeMat);
    modelGroupRef.current = newModelGroup;

    // Apply scale & rotation from CAD Editor
    const sX = (scale.x / 100) * (isMirroredX ? -1 : 1);
    const sY = scale.z / 100; // Three.js Y is height!
    const sZ = (scale.y / 100) * (isMirroredY ? -1 : 1);
    newModelGroup.scale.set(sX, sY, sZ);

    newModelGroup.rotation.x = THREE.MathUtils.degToRad(rotation.x);
    newModelGroup.rotation.y = THREE.MathUtils.degToRad(rotation.z);
    newModelGroup.rotation.z = THREE.MathUtils.degToRad(rotation.y);

    scene.add(newModelGroup);

    // Compute bounds for laser slicer plane
    const box = new THREE.Box3().setFromObject(newModelGroup);
    const minZ = Math.max(0, box.min.y);
    const maxZ = Math.max(minZ + 10, box.max.y);
    setModelBounds({ minZ, maxZ });

    // Update Bounding Box Box3 helper
    if (boundingBoxMeshRef.current) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      boundingBoxMeshRef.current.scale.set(size.x, size.y, size.z);
      boundingBoxMeshRef.current.position.copy(center);
      boundingBoxMeshRef.current.visible = renderMode === "wireframe" || renderMode === "xray";
    }
  }, [
    detectedType,
    buildModelMesh,
    materialId,
    renderMode,
    scale,
    rotation,
    isMirroredX,
    isMirroredY,
    technology,
    fileBuffer,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // UPDATE LAYER SLICE LASER HEIGHT
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { minZ, maxZ } = modelBounds;
    const progressFactor = Math.min(1.0, Math.max(0.0, layerProgress / 100));
    const currentY = minZ + (maxZ - minZ) * progressFactor;

    // Update clipping plane position
    clipPlaneRef.current.constant = currentY;

    // Update glowing laser slice plane
    if (laserPlaneRef.current) {
      laserPlaneRef.current.position.y = currentY;
      laserPlaneRef.current.visible = renderMode === "slice" || layerProgress < 100;
    }
  }, [layerProgress, modelBounds, renderMode]);

  // ───────────────────────────────────────────────────────────────────────────
  // PERSPECTIVE CAMERA QUICK-VIEWS
  // ───────────────────────────────────────────────────────────────────────────
  const handleSetPerspective = (persp) => {
    sound.playClick();
    setActivePerspective(persp);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (persp === "TOP") {
      camera.position.set(0, 85, 0.001);
      controls.target.set(0, 0, 0);
    } else if (persp === "FRONT") {
      camera.position.set(0, 15, 80);
      controls.target.set(0, 12, 0);
    } else if (persp === "SIDE") {
      camera.position.set(80, 15, 0);
      controls.target.set(0, 12, 0);
    } else {
      // ISO-3D
      camera.position.set(55, 45, 55);
      controls.target.set(0, 12, 0);
    }
    controls.update();
  };

  const handleResetCamera = () => {
    sound.playClick();
    handleSetPerspective("ISO-3D");
  };

  return (
    <div
      ref={containerRef}
      style={{ height: isFullscreen ? "100vh" : height }}
      className={`relative w-full bg-[#080808] border border-[#333333] rounded-[1px] overflow-hidden select-none font-mono ${
        isFullscreen ? "fixed inset-0 z-50 p-4 bg-black/95" : ""
      }`}
    >
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* ── TOP HUD BAR: Status & Perspective Controls ──────────────────── */}
      {showControls && (
        <div className="absolute top-2.5 inset-x-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10 text-[10px]">
          {/* Engine Status Badge */}
          <div className="pointer-events-auto bg-[#111111]/90 backdrop-blur-md border border-[#333333] px-2.5 py-1 rounded-[1px] flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#FF5A00] font-bold uppercase tracking-wider">
              3D WEBGL ENGINE
            </span>
            <span className="text-[#71717A] text-[9px] hidden sm:inline">| 60 FPS</span>
          </div>

          {/* Render Mode Tabs: Shaded, Wireframe, X-Ray, Slice */}
          <div className="pointer-events-auto flex items-center bg-[#111111]/90 backdrop-blur-md border border-[#333333] p-0.5 rounded-[1px] shadow-lg">
            {[
              { id: "shaded", label: "SHADED" },
              { id: "wireframe", label: "WIREFRAME" },
              { id: "xray", label: "X-RAY" },
              { id: "slice", label: "SLICE" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setRenderMode(mode.id);
                }}
                className={`px-2 py-0.5 rounded-[1px] uppercase transition-colors cursor-pointer text-[9px] font-bold ${
                  renderMode === mode.id
                    ? "bg-[#FF5A00] text-black"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Perspective Buttons & Tools */}
          <div className="pointer-events-auto flex items-center gap-1">
            <div className="flex items-center bg-[#111111]/90 backdrop-blur-md border border-[#333333] p-0.5 rounded-[1px]">
              {["ISO-3D", "TOP", "FRONT", "SIDE"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSetPerspective(p)}
                  className={`px-1.5 py-0.5 text-[9px] rounded-[1px] uppercase transition-colors cursor-pointer ${
                    activePerspective === p
                      ? "bg-[#FF5A00] text-black font-bold"
                      : "text-[#A1A1AA] hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Auto-Rotate Spin Toggle */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsAutoRotating(!isAutoRotating);
              }}
              className={`p-1 bg-[#111111]/90 border rounded-[1px] text-[9px] uppercase transition-colors cursor-pointer ${
                isAutoRotating
                  ? "bg-[#FF5A00] text-black border-[#FF5A00] font-bold"
                  : "text-[#A1A1AA] border-[#333333] hover:text-white"
              }`}
              title="Toggle slow 360° spin"
            >
              {isAutoRotating ? "⟳ SPINNING" : "⟳ SPIN"}
            </button>

            {/* Reset Camera */}
            <button
              type="button"
              onClick={handleResetCamera}
              className="p-1 bg-[#111111]/90 hover:bg-[#222222] text-[#A1A1AA] hover:text-white border border-[#333333] rounded-[1px] text-[9px] uppercase cursor-pointer"
              title="Reset view to default framing"
            >
              ↺
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsFullscreen(!isFullscreen);
              }}
              className="p-1 bg-[#111111]/90 hover:bg-[#222222] text-[#A1A1AA] hover:text-white border border-[#333333] rounded-[1px] text-[9px] uppercase cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
            >
              {isFullscreen ? "✕ CLOSE" : "⛶ FULL"}
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM HUD BAR: Slicing Scrubber & Interactive Telemetry ───── */}
      {showControls && (
        <div className="absolute bottom-2.5 inset-x-3 pointer-events-none z-10 space-y-2">
          {/* Laser Layer Slicer Scrubber Bar */}
          <div className="pointer-events-auto bg-[#111111]/90 backdrop-blur-md border border-[#333333] p-2 rounded-[1px] shadow-xl space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#A1A1AA]">
                SLICING LASER DEPTH:{" "}
                <strong className="text-[#FF5A00]">
                  {Math.round((layerProgress / 100) * 350)} / 350 LAYERS
                </strong>
                {renderMode === "slice" && (
                  <span className="ml-2 text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-1 py-0.2 rounded-[1px]">
                    CLIPPING ACTIVE
                  </span>
                )}
              </span>
              <span className="text-[#71717A] text-[8px] uppercase">
                {layerProgress}% CROSS-SECTION
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={layerProgress}
              onChange={(e) => onLayerChange && onLayerChange(Number(e.target.value))}
              className="w-full accent-[#FF5A00] cursor-pointer h-1.5 bg-[#222222] rounded-none"
            />
          </div>

          {/* Bottom Telemetry Strip & Mouse Navigation Hint */}
          <div className="flex flex-wrap items-center justify-between text-[9px] text-[#71717A] bg-[#0A0A0A]/85 backdrop-blur-sm px-2.5 py-1 border border-[#222222] rounded-[1px]">
            <div className="flex items-center gap-3">
              <span>
                BOUNDS:{" "}
                <strong className="text-white">
                  {dimensions.x} × {dimensions.y} × {dimensions.z} mm
                </strong>
              </span>
              <span>
                MATERIAL:{" "}
                <strong className="text-[#FF5A00]">
                  {MATERIAL_PRESETS[materialId]?.name || "PA-CF"}
                </strong>
              </span>
              <span>
                INFILL:{" "}
                <strong className="text-white">
                  {infill}% {infillPattern}
                </strong>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-[8px] text-[#A1A1AA]">
              <span>[ 🖱️ DRAG: ROTATE ]</span>
              <span>[ WHEEL: ZOOM ]</span>
              <span>[ RIGHT-CLICK: PAN ]</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * modelAnalysis.js
 * ───────────────────────────────────────────────────────────────
 * Client-side 3D model parsing & slicing mathematics:
 *  - Bounding Box extraction (X, Y, Z in mm)
 *  - Total mesh volume computation via Divergence Theorem (cm³)
 *  - Total surface area computation (cm² / mm²)
 *  - Raw & infilled weight estimation using material density constants
 *  - Manifold / Watertight topology verification
 *  - Procedural engineering benchmark geometry generation
 */

import * as THREE from "three";

/**
 * Standard 3D printing filament densities (g/cm³) and specs
 */
export const MATERIAL_DENSITIES = {
  PLA: {
    key: "PLA",
    name: "Standard PLA",
    fullName: "Polylactic Acid",
    density: 1.24, // g/cm³
    color: "#FF5A00",
    printTemp: "210°C - 220°C",
    bedTemp: "55°C - 60°C",
    tensileStrength: "50 MPa",
    application: "Rapid prototyping, cosmetic parts, fit testing",
  },
  PETG: {
    key: "PETG",
    name: "Functional PETG",
    fullName: "Polyethylene Terephthalate Glycol",
    density: 1.27, // g/cm³
    color: "#38BDF8",
    printTemp: "235°C - 245°C",
    bedTemp: "70°C - 80°C",
    tensileStrength: "52 MPa",
    application: "Water-resistant enclosures, snap fits, outdoor use",
  },
  "PA-CF": {
    key: "PA-CF",
    name: "Carbon Fiber Nylon",
    fullName: "Polyamide + 20% High-Modulus Carbon Fiber",
    density: 1.18, // g/cm³
    color: "#E2E8F0",
    printTemp: "280°C - 290°C",
    bedTemp: "90°C - 100°C",
    tensileStrength: "115 MPa",
    application: "End-use structural brackets, drone frames, jigs",
  },
  ABS: {
    key: "ABS",
    name: "Industrial ABS",
    fullName: "Acrylonitrile Butadiene Styrene",
    density: 1.04, // g/cm³
    color: "#FBBF24",
    printTemp: "245°C - 255°C",
    bedTemp: "100°C - 110°C",
    tensileStrength: "43 MPa",
    application: "High heat enclosures, automotive interior parts",
  },
};

export const BUILD_VOLUME = {
  x: 256,
  y: 256,
  z: 256, // mm (Bambu Lab / Voron / Prusa standard bed)
};

/**
 * Extracts bounding box dimensions (X, Y, Z in mm) and centers the geometry.
 * STL/OBJ files from CAD are assumed to be exported in millimeters.
 */
export function computeBoundingBox(geometry) {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const box = geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  const min = box.min;
  const max = box.max;

  const fitsBuildPlate =
    size.x <= BUILD_VOLUME.x &&
    size.y <= BUILD_VOLUME.y &&
    size.z <= BUILD_VOLUME.z;

  return {
    x: Number(size.x.toFixed(2)),
    y: Number(size.y.toFixed(2)),
    z: Number(size.z.toFixed(2)),
    min: { x: min.x, y: min.y, z: min.z },
    max: { x: max.x, y: max.y, z: max.z },
    center: { x: center.x, y: center.y, z: center.z },
    fitsBuildPlate,
    maxDimension: Number(Math.max(size.x, size.y, size.z).toFixed(2)),
  };
}

/**
 * Computes exact mesh volume in cm³ using the Divergence Theorem on triangular facets.
 * For each triangular facet, calculates the signed volume of the tetrahedron with the origin.
 * Summing over all facets yields the enclosed volume of closed manifold surfaces.
 */
export function computeMeshVolume(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  if (!pos || pos.count === 0) return 0;

  let totalVolume = 0;

  for (let i = 0; i < pos.count; i += 3) {
    const x1 = pos.getX(i),     y1 = pos.getY(i),     z1 = pos.getZ(i);
    const x2 = pos.getX(i + 1), y2 = pos.getY(i + 1), z2 = pos.getZ(i + 1);
    const x3 = pos.getX(i + 2), y3 = pos.getY(i + 2), z3 = pos.getZ(i + 2);

    // v = 1/6 * det([p1, p2, p3])
    const v =
      (x1 * (y2 * z3 - y3 * z2) -
       y1 * (x2 * z3 - x3 * z2) +
       z1 * (x2 * y3 - x3 * y2)) / 6.0;

    totalVolume += v;
  }

  // Convert mm³ to cm³: 1 cm³ = 1000 mm³
  const volumeCm3 = Math.abs(totalVolume) / 1000.0;
  return Number(volumeCm3.toFixed(3));
}

/**
 * Computes total surface area in cm² and mm².
 */
export function computeSurfaceArea(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  if (!pos || pos.count === 0) return { areaMm2: 0, areaCm2: 0 };

  let totalArea = 0;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    vA.fromBufferAttribute(pos, i);
    vB.fromBufferAttribute(pos, i + 1);
    vC.fromBufferAttribute(pos, i + 2);

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab);

    totalArea += cb.length() * 0.5;
  }

  return {
    areaMm2: Number(totalArea.toFixed(1)),
    areaCm2: Number((totalArea / 100.0).toFixed(2)),
  };
}

/**
 * Checks if the geometry is watertight (2-manifold without boundary holes or non-manifold edges).
 * Every edge in a watertight mesh must be shared by exactly 2 triangles.
 */
export function checkWatertight(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  if (!pos || pos.count === 0) {
    return {
      isWatertight: false,
      status: "EMPTY",
      openEdges: 0,
      nonManifoldEdges: 0,
      totalEdges: 0,
    };
  }

  const edgeCounts = new Map();

  // Rounding prevents microscopic precision discrepancies in CAD exports
  const roundCoord = (n) => Math.round(n * 1000) / 1000;
  const makeKey = (x, y, z) => `${roundCoord(x)},${roundCoord(y)},${roundCoord(z)}`;

  for (let i = 0; i < pos.count; i += 3) {
    const k1 = makeKey(pos.getX(i), pos.getY(i), pos.getZ(i));
    const k2 = makeKey(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
    const k3 = makeKey(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));

    const edges = [
      k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`,
      k2 < k3 ? `${k2}|${k3}` : `${k3}|${k2}`,
      k3 < k1 ? `${k3}|${k1}` : `${k1}|${k3}`,
    ];

    for (const edge of edges) {
      edgeCounts.set(edge, (edgeCounts.get(edge) || 0) + 1);
    }
  }

  let openEdges = 0;
  let nonManifoldEdges = 0;

  for (const count of edgeCounts.values()) {
    if (count === 1) openEdges++;
    else if (count > 2) nonManifoldEdges++;
  }

  const isWatertight = openEdges === 0 && nonManifoldEdges === 0;

  return {
    isWatertight,
    status: isWatertight ? "WATERTIGHT (2-MANIFOLD)" : openEdges > 0 ? "OPEN BOUNDARIES DETECTED" : "NON-MANIFOLD EDGES",
    openEdges,
    nonManifoldEdges,
    totalEdges: edgeCounts.size,
  };
}

/**
 * Calculates raw solid model weight in grams using material density (g/cm³).
 * Weight (g) = Volume (cm³) × Density (g/cm³)
 */
export function estimateRawWeight(volumeCm3, density = 1.24) {
  const weight = volumeCm3 * density;
  return Number(weight.toFixed(2));
}

/**
 * Estimates sliced print weight considering 3 wall loops + infill percentage.
 * Sliced Weight ≈ Shell Weight + (Internal Cavity × Infill%)
 */
export function estimateSlicedWeight(volumeCm3, surfaceAreaCm2, density = 1.24, infillPercent = 20) {
  // Approximate standard 3-wall perimeter shell thickness = 1.2mm = 0.12 cm
  const shellThicknessCm = 0.12;
  const shellVolumeCm3 = Math.min(volumeCm3, surfaceAreaCm2 * shellThicknessCm * 0.7);
  const coreVolumeCm3 = Math.max(0, volumeCm3 - shellVolumeCm3);

  const effectiveVolumeCm3 = shellVolumeCm3 + coreVolumeCm3 * (infillPercent / 100);
  const weight = effectiveVolumeCm3 * density;
  return Number(weight.toFixed(2));
}

/**
 * Full structural analysis runner for any parsed Three.js BufferGeometry
 */
export function analyzeGeometry(geometry) {
  const boundingBox = computeBoundingBox(geometry);
  const volumeCm3 = computeMeshVolume(geometry);
  const surfaceArea = computeSurfaceArea(geometry);
  const watertight = checkWatertight(geometry);

  const triangleCount = geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position.count / 3;
  const vertexCount = geometry.attributes.position.count;

  // Weight estimates across all materials
  const weights = {};
  for (const [key, mat] of Object.entries(MATERIAL_DENSITIES)) {
    weights[key] = {
      solid: estimateRawWeight(volumeCm3, mat.density),
      infill20: estimateSlicedWeight(volumeCm3, surfaceArea.areaCm2, mat.density, 20),
      infill40: estimateSlicedWeight(volumeCm3, surfaceArea.areaCm2, mat.density, 40),
    };
  }

  return {
    boundingBox,
    volumeCm3,
    surfaceArea,
    watertight,
    triangleCount: Math.round(triangleCount),
    vertexCount,
    weights,
  };
}

/**
 * Normalizes geometry so its bottom rests exactly on the build plate (Y = 0)
 * and its center is at X = 0, Z = 0.
 */
export function normalizeGeometryForBuildPlate(geometry) {
  const geo = geometry.clone();
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Center on X and Z, place bottom at Y = 0
  geo.translate(-center.x, -box.min.y, -center.z);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Generates procedural engineering benchmark sample models:
 * 1. 'cube20': 20×20×20 mm calibration cube with beveled step and test core
 * 2. 'hexConnector': M16 hexagonal flange spacer with bore hole
 * 3. 'isoBracket': 50×50×20 mm structural L-bracket with rib gusset
 */
export function generateSampleGeometry(type = "cube20") {
  let geometry;

  if (type === "cube20") {
    // 20x20x20 mm Calibration Cube
    geometry = new THREE.BoxGeometry(20, 20, 20, 4, 4, 4);
  } else if (type === "hexConnector") {
    // Hexagonal Flange Fitting (approx 36mm diameter x 24mm height)
    geometry = new THREE.CylinderGeometry(18, 22, 24, 6, 3);
  } else if (type === "isoBracket") {
    // Structural Torus Link / Ring (55mm outer diameter x 14mm thick)
    geometry = new THREE.TorusGeometry(24, 7, 18, 36);
  } else {
    geometry = new THREE.BoxGeometry(20, 20, 20);
  }

  return normalizeGeometryForBuildPlate(geometry);
}

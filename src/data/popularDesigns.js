/**
 * src/data/popularDesigns.js
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Curated 3D Print Benchmark Vault Specifications & Presets
 * ─────────────────────────────────────────────────────────────────────────────
 */

import benchyImg from "../assets/popular/benchy.jpg";
import planetaryImg from "../assets/popular/planetary_gearbox.jpg";
import dragonImg from "../assets/popular/articulated_dragon.jpg";
import turbofanImg from "../assets/popular/turbofan_bracket.jpg";
import cranialImg from "../assets/popular/cranial_mesh.jpg";
import gyroImg from "../assets/popular/kinetic_gyroscope.jpg";

export const POPULAR_DESIGNS = [
  {
    id: "POP-01",
    title: "3DBenchy Nautical Benchmark",
    category: "CALIBRATION & BENCHMARKS",
    filename: "3D_Benchy_Calibration_v3.stl",
    sizeMB: 2.85,
    dimensions: { x: 60.0, y: 31.0, z: 48.0 },
    volumeCm3: 15.5,
    facetCount: 225154,
    technology: "FDM",
    recommendedMaterial: "PLA+ High Speed",
    recommendedMaterialId: "pla-speed",
    printTime: "45m",
    price: 450,
    image: benchyImg,
    description:
      "The undisputed gold standard additive calibration artifact. Tests dimensional accuracy, steep hull overhangs, chimney bridging, and multi-plane cooling.",
    tags: ["0.12mm DETAIL", "TOROID BRIDGING", "ZERO SUPPORT"],
    specs: {
      infill: "20% Gyroid",
      layerHeight: "0.12 mm",
      nozzleTemp: "215°C",
      coolingFan: "100%",
    },
  },
  {
    id: "POP-02",
    title: "Dual-Stage Planetary Gearbox",
    category: "MECHANICAL ASSEMBLIES",
    filename: "planetary_reduction_gearbox_v4.stl",
    sizeMB: 5.42,
    dimensions: { x: 85.0, y: 85.0, z: 42.0 },
    volumeCm3: 62.0,
    facetCount: 412890,
    technology: "FDM",
    recommendedMaterial: "PA-CF (Carbon Nylon)",
    recommendedMaterialId: "pa-cf",
    printTime: "3h 15m",
    price: 2450,
    image: planetaryImg,
    description:
      "Precision print-in-place epicyclic gear train with 4:1 torque amplification. Features self-lubricating involute gear teeth and hardened steel shaft collar seats.",
    tags: ["PRINT-IN-PLACE", "±0.15mm TOLERANCE", "HIGH TORQUE"],
    specs: {
      infill: "45% Honeycomb",
      layerHeight: "0.16 mm",
      nozzleTemp: "275°C",
      coolingFan: "20%",
    },
  },
  {
    id: "POP-03",
    title: "Generative Turbofan Drone Arm",
    category: "AEROSPACE & ROBOTICS",
    filename: "aerospace_turbofan_cowling_v2.stl",
    sizeMB: 7.15,
    dimensions: { x: 145.0, y: 92.0, z: 55.0 },
    volumeCm3: 78.4,
    facetCount: 580240,
    technology: "FDM",
    recommendedMaterial: "PA-CF (Carbon Nylon)",
    recommendedMaterialId: "pa-cf",
    printTime: "4h 30m",
    price: 3850,
    image: turbofanImg,
    description:
      "Topology-optimized aeronautical mount engineered with generative load paths. Reduces structural mass by 42% while retaining 115 MPa tensile yield.",
    tags: ["FEA OPTIMIZED", "PA-CF REINFORCED", "AS9100D READY"],
    specs: {
      infill: "50% Gyroid",
      layerHeight: "0.16 mm",
      nozzleTemp: "280°C",
      coolingFan: "15%",
    },
  },
  {
    id: "POP-04",
    title: "Articulated Imperial Dragon",
    category: "BIOMEDICAL & KINETIC",
    filename: "articulated_spine_dragon_v6.stl",
    sizeMB: 4.88,
    dimensions: { x: 210.0, y: 65.0, z: 32.0 },
    volumeCm3: 52.0,
    facetCount: 348700,
    technology: "FDM",
    recommendedMaterial: "PETG Industrial",
    recommendedMaterialId: "petg",
    printTime: "2h 50m",
    price: 1650,
    image: dragonImg,
    description:
      "Interlocking print-in-place ball-and-socket spine with 34 free-moving segments. Dual-color extrusion with zero auxiliary supports required.",
    tags: ["PRINT-IN-PLACE", "34 SEGMENTS", "NO BRIM REQUIRED"],
    specs: {
      infill: "25% Grid",
      layerHeight: "0.16 mm",
      nozzleTemp: "240°C",
      coolingFan: "50%",
    },
  },
  {
    id: "POP-05",
    title: "Micro-Lattice Cranial Prosthetic",
    category: "BIOMEDICAL & KINETIC",
    filename: "cranial_osteomesh_implant_v2.stl",
    sizeMB: 9.34,
    dimensions: { x: 110.0, y: 95.0, z: 68.0 },
    volumeCm3: 28.6,
    facetCount: 792110,
    technology: "SLA",
    recommendedMaterial: "Tough 2000 Resin",
    recommendedMaterialId: "resin-tough",
    printTime: "2h 10m",
    price: 4200,
    image: cranialImg,
    description:
      "SLA photopolymer micro-lattice implant prototype with 300μm osteoconductive pore geometry. Liquid-tight sterile resin with ±0.05mm tolerance.",
    tags: ["BIO-COMPATIBLE", "300μm PORES", "MICRONIC SLA"],
    specs: {
      infill: "100% Solid Lattice",
      layerHeight: "0.05 mm",
      nozzleTemp: "N/A (Photopolymer)",
      coolingFan: "UV 405nm Active",
    },
  },
  {
    id: "POP-06",
    title: "Triple-Axis Gimbal Kinetic Gyroscope",
    category: "MECHANICAL ASSEMBLIES",
    filename: "kinetic_gimbal_gyroscope_v5.stl",
    sizeMB: 6.22,
    dimensions: { x: 125.0, y: 125.0, z: 110.0 },
    volumeCm3: 85.0,
    facetCount: 462300,
    technology: "FDM",
    recommendedMaterial: "PETG Industrial",
    recommendedMaterialId: "petg",
    printTime: "3h 40m",
    price: 2100,
    image: gyroImg,
    description:
      "Concentric triple-axis gimbal suspension exhibiting 360° rotational freedom. Balanced inertial core mounted via sealed precision stainless ball-bearings.",
    tags: ["BALL BEARING SEAT", "3-AXIS GIMBAL", "LOW COEFFICIENT"],
    specs: {
      infill: "35% Gyroid",
      layerHeight: "0.16 mm",
      nozzleTemp: "245°C",
      coolingFan: "35%",
    },
  },
];

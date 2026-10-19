/**
 * src/data/mockData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // 3D Additive Manufacturing Platform — Architectural Mock State & Data
 *
 * Design Framework Tokens:
 *  - Primary:     #FF5A00 (Action / Glow / Extrusion Telemetry)
 *  - Dark Base:   #111111 (Industrial Obsidian Surface)
 *  - Surface:     #EAEAEA (High-contrast Telemetry Panels)
 *  - Borders:     #333333 (1px Crisp Precision Dividers)
 *  - Typography:  Inter (Display/Body), JetBrains Mono (Telemetry/Labels)
 *  - Currency:    INR (₹ - Indian Rupee)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * NEXUS Design Framework Tokens
 */
export const NEXUS_TOKENS = {
  colors: {
    primary: "#FF5A00",
    accent: "#D94D00",
    darkBase: "#111111",
    darkElevated: "#161616",
    surface: "#EAEAEA",
    surfaceMuted: "#CCCCCC",
    borderDark: "#333333",
    borderLight: "#222222",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    statusActive: "#22C55E",
    statusWarning: "#F59E0B",
    statusAlert: "#EF4444",
  },
  typography: {
    fontDisplay: "Inter, sans-serif",
    fontTelemetry: "'JetBrains Mono', monospace",
  },
  currency: {
    code: "INR",
    symbol: "₹",
    locale: "en-IN",
  },
};

/**
 * Currency Formatting Helper (Indian Rupee - INR)
 * Formats numbers into standard INR notation: e.g. ₹3,450 or ₹1,20,000
 *
 * @param {number} amount
 * @param {boolean} [includeSymbol=true]
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatINR(amount, includeSymbol = true, decimals = 0) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return includeSymbol ? "₹0" : "0";
  }
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. INITIAL_ORDERS
 * ═══════════════════════════════════════════════════════════════════════════
 * Initial production pipeline queue containing diverse items:
 *  - Robotics Bracket (Structural FDM, PA-CF)
 *  - Medical Tools (Micronic SLA, Tough 2000 Biocompatible)
 *  - Rapid Prototyping (Aerofoil Cowling, PETG Draft)
 */
export const INITIAL_ORDERS = [
  {
    id: "NX-9042",
    client: "Apex Robotics Ltd",
    filename: "quad_motor_bracket_v4.stl",
    volumeCm3: 48.5,
    dimensions: {
      x: 120.0,
      y: 85.5,
      z: 34.0,
    },
    technology: "FDM",
    material: "PA-CF (Carbon Nylon)",
    infill: 40,
    layerHeight: 0.16,
    status: "PRINTING",
    assignedPrinter: "RIG-01",
    progress: 64,
    estimatedTime: "3h 45m",
    price: 3450,
    createdAt: "2026-10-19T14:15:00.000Z",
  },
  {
    id: "NX-9043",
    client: "BioSync MedTech",
    filename: "surgical_drill_guide_v2.stl",
    volumeCm3: 18.2,
    dimensions: {
      x: 45.0,
      y: 32.0,
      z: 68.0,
    },
    technology: "SLA",
    material: "Tough 2000 Resin",
    infill: 100,
    layerHeight: 0.08,
    status: "POST_PROCESSING",
    assignedPrinter: "RIG-02",
    progress: 92,
    estimatedTime: "1h 15m",
    price: 2890,
    createdAt: "2026-10-19T11:40:00.000Z",
  },
  {
    id: "NX-9044",
    client: "AeroDynamics Rapid Labs",
    filename: "drone_aerofoil_cowling.obj",
    volumeCm3: 36.8,
    dimensions: {
      x: 165.0,
      y: 110.0,
      z: 42.5,
    },
    technology: "FDM",
    material: "PETG Signal Orange",
    infill: 20,
    layerHeight: 0.24,
    status: "QUEUED",
    assignedPrinter: "RIG-04",
    progress: 0,
    estimatedTime: "2h 10m",
    price: 1850,
    createdAt: "2026-10-19T15:20:00.000Z",
  },
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 2. INITIAL_FLEET
 * ═══════════════════════════════════════════════════════════════════════════
 * Additive manufacturing printer rigs ("RIG-01" to "RIG-04")
 * Covers active extrusion states with live telemetry, SLA vats, idle, & maintenance.
 */
export const INITIAL_FLEET = [
  {
    id: "RIG-01",
    model: "Bambu Lab X1-Carbon",
    type: "FDM",
    status: "ACTIVE",
    currentOrder: "NX-9042",
    nozzleTemp: 255,
    targetNozzleTemp: 255,
    bedTemp: 65,
    targetBedTemp: 65,
    chamberTemp: 42,
    currentLayer: 420,
    totalLayers: 656,
    activeSpool: "PA-CF (Carbon Nylon) #SP-04",
    uptime: "168h 42m",
  },
  {
    id: "RIG-02",
    model: "Formlabs Form 4",
    type: "SLA",
    status: "ACTIVE",
    currentOrder: "NX-9043",
    nozzleTemp: 0,
    targetNozzleTemp: 0,
    bedTemp: 35,
    targetBedTemp: 35,
    chamberTemp: 32,
    currentLayer: 810,
    totalLayers: 850,
    activeSpool: "Tough 2000 Resin #RS-02",
    uptime: "94h 15m",
  },
  {
    id: "RIG-03",
    model: "Prusa XL 5-Toolhead",
    type: "FDM",
    status: "MAINTENANCE",
    currentOrder: null,
    nozzleTemp: 24,
    targetNozzleTemp: 0,
    bedTemp: 23,
    targetBedTemp: 0,
    chamberTemp: 24,
    currentLayer: 0,
    totalLayers: 0,
    activeSpool: "PLA+ Matte Black #SP-01",
    uptime: "312h 05m",
  },
  {
    id: "RIG-04",
    model: "Bambu Lab X1-Carbon",
    type: "FDM",
    status: "IDLE",
    currentOrder: null,
    nozzleTemp: 23,
    targetNozzleTemp: 0,
    bedTemp: 22,
    targetBedTemp: 0,
    chamberTemp: 23,
    currentLayer: 0,
    totalLayers: 0,
    activeSpool: "PETG Signal Orange #SP-09",
    uptime: "72h 50m",
  },
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3. INITIAL_INVENTORY
 * ═══════════════════════════════════════════════════════════════════════════
 * Raw material inventory items (Spools & Resin Cartridges).
 * Cost per Kg is denominated in INR (₹).
 * Includes "PETG Signal Orange" below threshold (190g < 250g) to trigger alert.
 */
export const INITIAL_INVENTORY = [
  {
    id: "MAT-01",
    name: "PA-CF (Carbon Nylon)",
    type: "Spool (1kg)",
    remainingGrams: 680,
    threshold: 300,
    costPerKg: 4200,
  },
  {
    id: "MAT-02",
    name: "PETG Signal Orange",
    type: "Spool (1kg)",
    remainingGrams: 190,
    threshold: 250, // Below threshold -> LOW STOCK ALERT
    costPerKg: 1850,
  },
  {
    id: "MAT-03",
    name: "PLA+ Matte Black",
    type: "Spool (1kg)",
    remainingGrams: 850,
    threshold: 200,
    costPerKg: 1400,
  },
  {
    id: "MAT-04",
    name: "Tough 2000 Resin",
    type: "Resin Cartridge (1L)",
    remainingGrams: 1050,
    threshold: 400,
    costPerKg: 8900,
  },
];

/**
 * Inventory Alert Evaluator Helper
 * Checks if a material is critically low based on configured threshold.
 *
 * @param {typeof INITIAL_INVENTORY[0]} item
 * @returns {boolean}
 */
export function isLowStock(item) {
  return item.remainingGrams <= item.threshold;
}

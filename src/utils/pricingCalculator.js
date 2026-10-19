/**
 * pricingCalculator.js
 * ───────────────────────────────────────────────────────────────
 * Production Additive Manufacturing Pricing Engine:
 *
 * Exact Formula:
 * TotalPrice = (MassGrams * MaterialCostPerGram * MaterialMarkupMultiplier)
 *            + (EstimatedPrintHours * MachineHourlyRate)
 *            + SetupFee
 *            + PostProcessingFees
 *
 * Print time heuristic:
 * EstimatedPrintHours = (VolumeCm3 * (InfillPercent / 100) * 0.45) / 10 + (HeightMm * 0.05)
 *
 * Constants:
 *  - Material Markup: 3.0x
 *  - Machine Hourly Rate: $2.50/hour
 *  - Setup Fee: $5.00
 */

export const PRICING_CONSTANTS = {
  materialMarkup: 3.0,
  machineHourlyRate: 2.5, // $2.50 / hr
  setupFee: 5.0, // $5.00
};

export const TECHNOLOGIES = {
  FDM: {
    key: "FDM",
    name: "FDM (Filament)",
    description: "Fused Deposition Modeling • High-strength thermoplastics & composites",
    materials: [
      {
        id: "pla-plus",
        name: "PLA+ Tough",
        costPerGram: 0.04,
        density: 1.24, // g/cm³
        color: "#FF5A00",
        desc: "Rapid prototyping, fit checks, cosmetic models",
      },
      {
        id: "petg",
        name: "PETG Functional",
        costPerGram: 0.05,
        density: 1.27,
        color: "#38BDF8",
        desc: "Chemical resistance, snap-fits, outdoor enclosures",
      },
      {
        id: "abs",
        name: "ABS Impact",
        costPerGram: 0.06,
        density: 1.04,
        color: "#FBBF24",
        desc: "High thermal stability, automotive interior parts",
      },
      {
        id: "pa-cf",
        name: "PA-CF Carbon Fiber",
        costPerGram: 0.12,
        density: 1.18,
        color: "#E2E8F0",
        desc: "Structural stiffness, drone arms, industrial jigs",
      },
    ],
  },
  SLA: {
    key: "SLA",
    name: "SLA (Resin)",
    description: "Stereolithography Photopolymer • Micronic surface detail & liquid-tightness",
    materials: [
      {
        id: "resin-std",
        name: "Standard Pro Grey",
        costPerGram: 0.08,
        density: 1.15,
        color: "#94A3B8",
        desc: "Smooth presentation masters, miniature figurines",
      },
      {
        id: "resin-tough",
        name: "Engineering Tough",
        costPerGram: 0.15,
        density: 1.2,
        color: "#A78BFA",
        desc: "High elongation at break, impact resistant housings",
      },
    ],
  },
};

export const LAYER_HEIGHTS = [
  { id: "0.08", label: "0.08mm Ultra Detail", speedFactor: 1.35, desc: "Near-injection finish, highest layer count" },
  { id: "0.16", label: "0.16mm Standard", speedFactor: 1.0, desc: "Balanced strength, resolution & speed" },
  { id: "0.24", label: "0.24mm Rapid Draft", speedFactor: 0.8, desc: "Fast validation prototypes, mechanical test blocks" },
];

export const POST_PROCESSING_ADDONS = [
  {
    id: "support-removal",
    label: "Support Removal & Manual Deburring",
    price: 5.0,
    desc: "Clean detachment of all scaffolding and support interface marks",
  },
  {
    id: "acetone-uv-polish",
    label: "Acetone Vapor / UV Chamber Polish",
    price: 10.0,
    desc: "Layer line elimination & high-gloss protective sealant",
  },
  {
    id: "brass-inserts",
    label: "Brass Heat-Set Thread Inserts",
    price: 8.0,
    desc: "M3/M4 threaded brass inserts installed via thermal arbor press",
  },
];

export const INFILL_PRESETS = [
  { value: 20, label: "20% Cosmetic", description: "Display / fit-check / lightweight" },
  { value: 40, label: "40% Functional", description: "Standard enclosures & brackets" },
  { value: 100, label: "100% Load-bearing", description: "Solid structural & mounting joints" },
];

/**
 * Calculates estimated dispatch date (+2 business days, skipping weekends)
 */
export function getEstimatedDispatchDate(businessDays = 2) {
  const date = new Date();
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options).toUpperCase();
}

/**
 * Calculates mass in grams based on volume, infill percent, and density.
 * Sliced model accounts for standard 3-wall perimeter shell + internal infill.
 */
export function calculateModelMass(volumeCm3, infillPercent, density) {
  if (!volumeCm3 || volumeCm3 <= 0) return 0;
  // Sliced mass factor: shell accounts for ~22% volume minimum, remaining core scales with infill
  const infillFraction = infillPercent / 100;
  const effectiveVolumeFactor = infillFraction === 1.0
    ? 1.0
    : 0.22 + 0.78 * infillFraction;

  const massGrams = volumeCm3 * effectiveVolumeFactor * density;
  return Number(massGrams.toFixed(2));
}

/**
 * Executes the complete user-specified pricing algorithm
 */
export function calculateQuote({
  volumeCm3,
  heightMm,
  material,
  infillPercent = 20,
  layerHeightId = "0.16",
  selectedAddonIds = [],
}) {
  const vol = Math.max(0.1, Number(volumeCm3) || 8.0); // default 8 cm³ if none
  const height = Math.max(1.0, Number(heightMm) || 20.0); // default 20mm if none

  const density = material?.density || 1.24;
  const costPerGram = material?.costPerGram || 0.04;
  const markup = PRICING_CONSTANTS.materialMarkup; // 3.0x
  const machineRate = PRICING_CONSTANTS.machineHourlyRate; // $2.50/hr
  const setupFee = PRICING_CONSTANTS.setupFee; // $5.00

  // 1. Calculate Mass in Grams
  const massGrams = calculateModelMass(vol, infillPercent, density);

  // 2. Material Cost = MassGrams * MaterialCostPerGram * MaterialMarkupMultiplier
  const materialCost = Number((massGrams * costPerGram * markup).toFixed(2));

  // 3. Print Time Heuristic:
  // EstimatedPrintHours = (VolumeCm3 * (InfillPercent / 100) * 0.45) / 10 + (HeightMm * 0.05)
  const layerOption = LAYER_HEIGHTS.find((l) => l.id === layerHeightId) || LAYER_HEIGHTS[1];
  const rawHours = (vol * (infillPercent / 100) * 0.45) / 10 + height * 0.05;
  // Apply layer resolution factor
  const estimatedPrintHours = Number((rawHours * layerOption.speedFactor).toFixed(2));

  // 4. Machine Time Cost = EstimatedPrintHours * MachineHourlyRate
  const machineCost = Number((estimatedPrintHours * machineRate).toFixed(2));

  // 5. Post-Processing Fees
  const postProcessingFees = selectedAddonIds.reduce((sum, id) => {
    const addon = POST_PROCESSING_ADDONS.find((a) => a.id === id);
    return sum + (addon ? addon.price : 0);
  }, 0);

  // 6. Total Price = Material Cost + Machine Cost + Setup Fee + Post Processing Fees
  const totalPrice = Number(
    (materialCost + machineCost + setupFee + postProcessingFees).toFixed(2)
  );

  // Formatted production duration string (e.g. "1h 42m")
  const totalMinutes = Math.round(estimatedPrintHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    massGrams,
    estimatedPrintHours,
    durationFormatted,
    materialCost,
    machineCost,
    setupFee,
    postProcessingFees,
    totalPrice,
    dispatchDate: getEstimatedDispatchDate(2),
  };
}

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;
const UPLOADS_DIR = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
const DATA_DIR = path.resolve(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024; // 50MB limit

// Ensure storage directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// ─────────────────────────────────────────────────────────────
// Production Additive Manufacturing Pricing Database & Specs
// ─────────────────────────────────────────────────────────────
const PRICING_CONSTANTS = {
  currency: 'INR',
  currencySymbol: '₹',
  materialMarkup: 3.0,     // 3.0x raw material markup
  machineHourlyRate: 210,  // ₹210 / hour machine run-time
  setupFee: 420,           // ₹420 fixed calibration and bed preparation fee
  taxRate: 0.18,           // 18% GST
};

const MATERIALS = {
  'pla-plus': {
    id: 'pla-plus',
    name: 'PLA+ Tough',
    technology: 'FDM',
    costPerGram: 3.50,
    density: 1.24, // g/cm³
  },
  'petg': {
    id: 'petg',
    name: 'PETG Functional',
    technology: 'FDM',
    costPerGram: 4.20,
    density: 1.27,
  },
  'abs': {
    id: 'abs',
    name: 'ABS Impact',
    technology: 'FDM',
    costPerGram: 5.00,
    density: 1.04,
  },
  'pa-cf': {
    id: 'pa-cf',
    name: 'PA-CF Carbon Fiber',
    technology: 'FDM',
    costPerGram: 10.50,
    density: 1.18,
  },
  'resin-std': {
    id: 'resin-std',
    name: 'Standard Pro Grey',
    technology: 'SLA',
    costPerGram: 6.80,
    density: 1.15,
  },
  'pla-speed': {
    id: 'pla-speed',
    name: 'PLA+ High Speed',
    technology: 'FDM',
    costPerGram: 3.50,
    density: 1.24,
  },
  'resin-clear': {
    id: 'resin-clear',
    name: 'High-Temp Optical Resin',
    technology: 'SLA',
    costPerGram: 16.50,
    density: 1.17,
  },
  'resin-tough': {
    id: 'resin-tough',
    name: 'Engineering Tough',
    technology: 'SLA',
    costPerGram: 12.80,
    density: 1.20,
  },
};

const LAYER_RESOLUTIONS = {
  '0.08': { id: '0.08', label: '0.08mm Ultra Detail', speedFactor: 1.35 },
  '0.16': { id: '0.16', label: '0.16mm Standard', speedFactor: 1.00 },
  '0.24': { id: '0.24', label: '0.24mm Rapid Draft', speedFactor: 0.80 },
};

const POST_PROCESSING_ADDONS = {
  'support-removal': {
    id: 'support-removal',
    name: 'Support Removal & Manual Deburring',
    price: 420.00,
  },
  'acetone-uv-polish': {
    id: 'acetone-uv-polish',
    name: 'Acetone Vapor / UV Chamber Polish',
    price: 840.00,
  },
  'brass-inserts': {
    id: 'brass-inserts',
    name: 'Brass Heat-Set Thread Inserts',
    price: 670.00,
  },
};

// ─────────────────────────────────────────────────────────────
// CORS Configuration
// ─────────────────────────────────────────────────────────────
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile clients, curl, postman, direct server calls)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded models statically if needed for inspection
app.use('/uploads', express.static(UPLOADS_DIR));

// ─────────────────────────────────────────────────────────────
// Multer Storage & Whitelist Validation Configuration
// ─────────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set(['.stl', '.obj', '.step', '.stp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // Sanitize original file name to prevent directory traversal or invalid characters
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }
  const error = new Error(
    `Unsupported file type '${ext}'. Only 3D CAD files (.stl, .obj, .step) up to 50MB are accepted.`
  );
  error.code = 'INVALID_FILE_TYPE';
  return cb(error, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 50MB
    files: 1,
  },
});

// Helper: Read orders from JSON store
function readOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading orders.json:', err);
    return [];
  }
}

// Helper: Save orders to JSON store
function writeOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing orders.json:', err);
    throw err;
  }
}

// Helper: Calculate estimated dispatch business date
function calculateEstimatedDispatch(businessDays = 2) {
  const date = new Date();
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

// Helper: Server-side pricing computation engine
function computeServerQuote({
  volumeCm3,
  materialKey,
  infillPercent = 20,
  layerHeightKey = '0.16',
  heightMm,
  addons = [],
}) {
  const vol = Number(volumeCm3);
  if (isNaN(vol) || vol <= 0) {
    throw new Error('Volume (volumeCm3) must be a positive numeric value.');
  }

  // Resolve material by id or name
  let mat = MATERIALS[materialKey];
  if (!mat) {
    const keyLower = String(materialKey || '').toLowerCase();
    const found = Object.values(MATERIALS).find(
      (m) =>
        m.name.toLowerCase() === keyLower ||
        m.id.toLowerCase() === keyLower ||
        (keyLower.includes('pla') && m.id.includes('pla')) ||
        (keyLower.includes('petg') && m.id.includes('petg')) ||
        (keyLower.includes('carbon') && m.id.includes('pa-cf')) ||
        (keyLower.includes('clear') && m.id.includes('resin-clear')) ||
        (keyLower.includes('tough') && m.id.includes('resin-tough')) ||
        (keyLower.includes('resin') && m.technology === 'SLA')
    );
    mat = found || MATERIALS['pla-plus'];
  }

  // Infill percent bounds
  const clampedInfill = Math.min(100, Math.max(10, Number(infillPercent) || 20));
  const infillFraction = clampedInfill / 100;

  // Resolve layer resolution
  const layerKeyStr = String(layerHeightKey).replace('mm', '').trim();
  const layerOption = LAYER_RESOLUTIONS[layerKeyStr] || LAYER_RESOLUTIONS['0.16'];

  // Height default estimate if not provided (cube root of volume in mm)
  const zHeight = Number(heightMm) > 0 ? Number(heightMm) : Math.max(10, Math.cbrt(vol * 1000));

  // 1. Mass in Grams
  // Effective volume factor accounts for shell perimeters + infill core
  const effectiveVolumeFactor = infillFraction === 1.0 ? 1.0 : 0.22 + 0.78 * infillFraction;
  const massGrams = Number((vol * effectiveVolumeFactor * mat.density).toFixed(2));

  // 2. Material Cost = MassGrams * MaterialCostPerGram * MaterialMarkupMultiplier
  const materialCost = Number(
    (massGrams * mat.costPerGram * PRICING_CONSTANTS.materialMarkup).toFixed(2)
  );

  // 3. Print Time Heuristic
  // EstimatedPrintHours = (VolumeCm3 * (InfillPercent / 100) * 0.45) / 10 + (HeightMm * 0.05)
  const rawHours = (vol * infillFraction * 0.45) / 10 + zHeight * 0.05;
  const estimatedPrintHours = Number((rawHours * layerOption.speedFactor).toFixed(2));

  // 4. Run Time Cost = EstimatedPrintHours * MachineHourlyRate ($2.50/hr)
  const runTimeCost = Number(
    (estimatedPrintHours * PRICING_CONSTANTS.machineHourlyRate).toFixed(2)
  );

  // 5. Setup Fee
  const setupFee = PRICING_CONSTANTS.setupFee;

  // 6. Post Processing Add-ons
  const addonIds = Array.isArray(addons) ? addons : [];
  const postProcessingCost = Number(
    addonIds.reduce((sum, id) => {
      const addon = POST_PROCESSING_ADDONS[id];
      return sum + (addon ? addon.price : 0);
    }, 0).toFixed(2)
  );

  // 7. Subtotal, Tax, and Total
  const subtotal = Number(
    (materialCost + runTimeCost + setupFee + postProcessingCost).toFixed(2)
  );
  const tax = Number((subtotal * PRICING_CONSTANTS.taxRate).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  // Production duration formatted string
  const totalMinutes = Math.round(estimatedPrintHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    technology: mat.technology,
    material: mat.name,
    materialId: mat.id,
    massGrams,
    estimatedPrintHours,
    durationFormatted,
    breakdown: {
      materialCost,
      runTimeCost,
      setupFee,
      postProcessingCost,
      subtotal,
      tax,
      total,
    },
    dispatchDate: calculateEstimatedDispatch(2),
  };
}

// ─────────────────────────────────────────────────────────────
// Lifecycle Status Stages Definition
// ─────────────────────────────────────────────────────────────
const ORDER_STATUS_LIFECYCLE = [
  'PENDING_REVIEW',
  'ANALYZING_MESH',
  'QUEUED_FOR_PRINT',
  'EXTRUDING',
  'POST_PROCESSING',
  'DISPATCHED',
];

const STAGE_LABELS = {
  PENDING_REVIEW: 'PENDING_REVIEW // ORDER LOGGED & PRE-FLIGHT VERIFICATION',
  ANALYZING_MESH: 'ANALYZING_MESH // VERIFYING GEOMETRIC WATERTIGHTNESS',
  QUEUED_FOR_PRINT: 'QUEUED_FOR_PRINT // ASSIGNED TO FLEET BED',
  EXTRUDING: 'EXTRUDING // ACTIVE LAYER FABRICATION',
  POST_PROCESSING: 'POST_PROCESSING // SUPPORT REMOVAL & CURE CHAMBER',
  DISPATCHED: 'DISPATCHED // EN ROUTE VIA PRIORITY COURIER',
};

// Helper: Determine dynamic live status based on order timeline progression
function getLiveOrderStatus(order) {
  if (!order) return null;

  const createdAt = new Date(order.createdAt).getTime();
  const now = Date.now();
  const elapsedMinutes = Math.max(0, (now - createdAt) / (1000 * 60));

  // Determine baseline status from elapsed time
  let timeBasedStatus = 'PENDING_REVIEW';
  let timeStep = 0;
  let timeProgress = 5;

  if (elapsedMinutes >= 90) {
    timeBasedStatus = 'DISPATCHED';
    timeStep = 5;
    timeProgress = 100;
  } else if (elapsedMinutes >= 45) {
    timeBasedStatus = 'POST_PROCESSING';
    timeStep = 4;
    timeProgress = 80;
  } else if (elapsedMinutes >= 8) {
    timeBasedStatus = 'EXTRUDING';
    timeStep = 3;
    timeProgress = 55;
  } else if (elapsedMinutes >= 2) {
    timeBasedStatus = 'QUEUED_FOR_PRINT';
    timeStep = 2;
    timeProgress = 30;
  } else if (elapsedMinutes >= 0.5) {
    timeBasedStatus = 'ANALYZING_MESH';
    timeStep = 1;
    timeProgress = 15;
  }

  // If order was explicitly stored with a more advanced status, take the maximum
  const explicitIndex = ORDER_STATUS_LIFECYCLE.indexOf(order.status);
  const timeIndex = ORDER_STATUS_LIFECYCLE.indexOf(timeBasedStatus);

  let finalStatus = timeBasedStatus;
  let finalStep = timeStep;
  let finalProgress = timeProgress;

  if (explicitIndex > timeIndex) {
    finalStatus = order.status;
    finalStep = explicitIndex;
    finalProgress = Math.min(100, Math.round((explicitIndex / (ORDER_STATUS_LIFECYCLE.length - 1)) * 100));
  }

  return {
    currentStatus: finalStatus,
    progressPercent: finalProgress,
    activeStep: finalStep,
    stageLabel: STAGE_LABELS[finalStatus] || `${finalStatus} // ACTIVE PRODUCTION STAGE`,
    elapsedMinutes: Number(elapsedMinutes.toFixed(1)),
  };
}

// ─────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'NEXUS-3D-API',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    supportedExtensions: Array.from(ALLOWED_EXTENSIONS),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
  });
});

/**
 * 1. POST /api/upload
 * Receives 3D CAD files via multipart/form-data.
 * Validates file extensions (.stl, .obj, .step).
 * Saves files to an uploads/ directory with unique timestamps.
 * Returns file path, original name, and byte size.
 */
app.post('/api/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please supply a 3D CAD file in the multipart field "file".',
      });
    }

    const relativePath = path.relative(__dirname, req.file.path).replace(/\\/g, '/');

    return res.status(201).json({
      success: true,
      message: 'File successfully uploaded and validated.',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        filePath: relativePath,
        size: req.file.size,
        extension: path.extname(req.file.originalname).toLowerCase(),
        uploadedAt: new Date().toISOString(),
      },
    });
  });
});

/**
 * 2. POST /api/quote
 * Receives file volume, material choice, infill percentage, and layer height.
 * Computes validated pricing using server-side formula to prevent client-side price tampering.
 * Returns structured JSON with line-item breakdown (Material Cost, Run Time, Setup Fee, Tax, Total).
 */
app.post('/api/quote', (req, res) => {
  try {
    const {
      volumeCm3,
      material,
      materialId,
      infillPercent,
      layerHeight,
      heightMm,
      addons,
      selectedAddonIds,
    } = req.body || {};

    if (volumeCm3 === undefined || volumeCm3 === null || Number(volumeCm3) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid parameter "volumeCm3". Must be a number greater than 0.',
      });
    }

    const selectedMaterial = materialId || material || 'pla-plus';
    const selectedAddons = addons || selectedAddonIds || [];

    const quote = computeServerQuote({
      volumeCm3,
      materialKey: selectedMaterial,
      infillPercent,
      layerHeightKey: layerHeight,
      heightMm,
      addons: selectedAddons,
    });

    return res.json({
      success: true,
      quote,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Pricing calculation failed.',
    });
  }
});

/**
 * 3. POST /api/orders
 * Accepts customer shipping details, selected configuration, file reference, and total amount.
 * Stores order data into a mock database / JSON store with status: "PENDING_REVIEW".
 * Returns unique Tracking ID (e.g., NX-88492).
 */
app.post('/api/orders', (req, res) => {
  try {
    const { customer, configuration, file, pricing, totalAmount, notes, payment } = req.body || {};

    // Validate customer contact/shipping details
    if (!customer || !customer.fullName || !customer.email || !customer.address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required customer shipping fields: fullName, email, and address are mandatory.',
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer email address format.',
      });
    }

    // Server-side recalculation of pricing if configuration and volume exist to prevent tampering
    let validatedPricing = pricing;
    const shippingFee = Number(pricing?.shippingFee) || 0;

    if (configuration && configuration.volumeCm3) {
      const serverQuote = computeServerQuote({
        volumeCm3: configuration.volumeCm3,
        materialKey: configuration.materialId || configuration.material || 'pla-plus',
        infillPercent: configuration.infillPercent,
        layerHeightKey: configuration.layerHeight,
        heightMm: configuration.heightMm,
        addons: configuration.addons || configuration.selectedAddonIds || [],
      });
      validatedPricing = serverQuote.breakdown;
      if (shippingFee > 0) {
        validatedPricing.shippingFee = shippingFee;
        validatedPricing.subtotal = Number((validatedPricing.subtotal + shippingFee).toFixed(2));
        validatedPricing.tax = Math.round(validatedPricing.subtotal * PRICING_CONSTANTS.taxRate);
        validatedPricing.total = validatedPricing.subtotal + validatedPricing.tax;
      } else {
        validatedPricing.shippingFee = 0;
      }
    } else if (!validatedPricing) {
      validatedPricing = {
        materialCost: 0,
        runTimeCost: 0,
        setupFee: PRICING_CONSTANTS.setupFee,
        postProcessingCost: 0,
        shippingFee,
        subtotal: totalAmount ? Number(totalAmount) : PRICING_CONSTANTS.setupFee,
        tax: Number(((totalAmount ? Number(totalAmount) : PRICING_CONSTANTS.setupFee) * PRICING_CONSTANTS.taxRate).toFixed(2)),
        total: totalAmount ? Number(totalAmount) : Number((PRICING_CONSTANTS.setupFee * (1 + PRICING_CONSTANTS.taxRate)).toFixed(2)),
      };
    }

    // Generate unique Tracking ID in format NX-XXXXX
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const trackingId = `NX-${randomSuffix}`;

    const newOrder = {
      trackingId,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customer: {
        fullName: customer.fullName.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone ? customer.phone.trim() : null,
        company: customer.company ? customer.company.trim() : null,
        address: customer.address.trim(),
        city: customer.city ? customer.city.trim() : '',
        state: customer.state ? customer.state.trim() : 'Karnataka',
        postalCode: customer.postalCode ? customer.postalCode.trim() : '',
        country: customer.country ? customer.country.trim() : 'India',
      },
      configuration: configuration || {
        technology: 'FDM',
        material: 'PLA+ Tough',
        infillPercent: 20,
        layerHeight: '0.16mm Standard',
        addons: [],
      },
      file: file || null,
      pricing: validatedPricing,
      payment: payment || null,
      notes: notes || null,
      history: [
        {
          status: 'PENDING_REVIEW',
          timestamp: new Date().toISOString(),
          note: 'Order submitted. Payment pre-authorization recorded. Queued for pre-flight slicing.',
        },
      ],
    };

    const existingOrders = readOrders();
    existingOrders.unshift(newOrder); // Prepend so newest is first
    writeOrders(existingOrders);

    return res.status(201).json({
      success: true,
      message: 'Order placed into production pipeline.',
      trackingId: newOrder.trackingId,
      status: newOrder.status,
      order: newOrder,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to persist order.',
    });
  }
});

/**
 * 4. GET /api/orders/:id
 * Returns live status ("ANALYZING_MESH", "QUEUED_FOR_PRINT", "EXTRUDING", "POST_PROCESSING", "DISPATCHED").
 */
app.get('/api/orders/:id', (req, res) => {
  const queryId = String(req.params.id).trim().toUpperCase();
  const orders = readOrders();

  // Match trackingId or numeric portion (e.g. "NX-88492" or "88492")
  const order = orders.find((o) => {
    const oId = String(o.trackingId).toUpperCase();
    return oId === queryId || oId.replace('NX-', '') === queryId.replace('NX-', '');
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      error: `Tracking ID '${req.params.id}' not found in production telemetry.`,
      availableStatusOptions: ORDER_STATUS_LIFECYCLE,
    });
  }

  // Calculate live dynamic lifecycle status
  const liveStatus = getLiveOrderStatus(order);

  return res.json({
    success: true,
    trackingId: order.trackingId,
    status: liveStatus.currentStatus,
    telemetry: {
      progressPercent: liveStatus.progressPercent,
      activeStep: liveStatus.activeStep,
      stageLabel: liveStatus.stageLabel,
      elapsedMinutes: liveStatus.elapsedMinutes,
      lifecycleStages: ORDER_STATUS_LIFECYCLE,
    },
    order: {
      createdAt: order.createdAt,
      customer: {
        fullName: order.customer?.fullName || 'Client Direct',
        company: order.customer?.company || null,
        city: order.customer?.city || null,
        state: order.customer?.state || null,
        country: order.customer?.country || 'India',
      },
      configuration: order.configuration,
      file: order.file,
      pricing: order.pricing,
      payment: order.payment || null,
      history: order.history,
    },
  });
});

/**
 * GET /api/orders (Helper for inspecting all orders)
 */
app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  res.json({
    success: true,
    count: orders.length,
    orders: orders.map((o) => ({
      trackingId: o.trackingId,
      status: getLiveOrderStatus(o).currentStatus,
      createdAt: o.createdAt,
      customer: o.customer?.fullName || 'Client Direct',
      material: o.configuration?.material,
      total: o.pricing?.total,
    })),
  });
});

// ─────────────────────────────────────────────────────────────
// Error-Handling Middleware
// ─────────────────────────────────────────────────────────────

// 404 Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}. Endpoint not found.`,
    availableRoutes: [
      'POST /api/upload',
      'POST /api/quote',
      'POST /api/orders',
      'GET  /api/orders/:id',
      'GET  /api/orders',
      'GET  /api/health',
    ],
  });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error('[API Error]:', err);

  // Multer: File too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: `Payload Too Large: File exceeds the maximum limit of ${parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50}MB.`,
    });
  }

  // Multer: Custom file type invalid
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Generic Multer error
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: `Multer Error: ${err.message}`,
    });
  }

  // JSON syntax error in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.',
    });
  }

  // CORS error
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message,
    });
  }

  // General internal server error
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

const HOST = process.env.HOST || '127.0.0.1';

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   NEXUS // 3D BACKEND API                      ║
╠════════════════════════════════════════════════════════════════╣
║  • Status: ONLINE                                              ║
║  • Host: ${HOST}                                            ║
║  • Port: ${PORT}                                                  ║
║  • CAD Ingestion: .stl, .obj, .step (Max: 50MB)                ║
║  • CORS Origins: ${allowedOrigins.slice(0, 3).join(', ')}...   ║
║  • Endpoint: http://${HOST}:${PORT}/api/health               ║
╚════════════════════════════════════════════════════════════════╝
    `);
  });
}

export default app;

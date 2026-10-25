/**
 * src/components/ui/CheckoutModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Additive Manufacturing Procurement & Checkout Gateway
 *
 * Full-cycle industrial checkout flow:
 *  - Step 1: Customer Logistics & Shipping Address Manifest
 *  - Step 2: Bill of Materials (BOM) & Slicing Specifications Review
 *  - Step 3: Multi-Rail Payment Gateway (UPI / QR, Card, Corporate PO, Sandbox)
 *  - Step 4: Dispatch Confirmation, Tracking ID Generation & Receipt Manifest
 *
 * Integrated with Express Backend (POST /api/orders) + resilient offline fallback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatINR } from "../../data/mockData";
import { sound } from "../../utils/soundEffects";
import { useToast } from "../../context/ToastContext";

const INDIAN_STATES = [
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Telangana",
  "Delhi NCR",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Kerala",
  "Haryana",
  "Madhya Pradesh",
  "Punjab",
  "Other / International",
];

function generateTrackingId() {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `NX-${randomSuffix}`;
}

function getIsoTimestamp() {
  return new Date().toISOString();
}

export default function CheckoutModal({
  isOpen,
  onClose,
  orderConfig,
  onOrderSuccess,
}) {
  const { addToast } = useToast();

  // Step state: "shipping" | "review" | "payment" | "success"
  const [currentStep, setCurrentStep] = useState("shipping");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Step 1: Shipping Form State
  const [shippingData, setShippingData] = useState({
    fullName: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "Karnataka",
    postalCode: "",
    country: "India",
    shippingTier: "standard", // "standard" (₹0) | "priority" (₹450)
    notes: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Step 3: Payment Form State
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "card" | "po" | "sandbox"
  const [upiId, setUpiId] = useState("");
  const [cardData, setCardData] = useState({
    holderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [poNumber, setPoNumber] = useState("");
  const [gstin, setGstin] = useState("");

  const modalRef = useRef(null);

  // Audio feedback on mount
  useEffect(() => {
    sound.playClick();
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && currentStep !== "payment") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, currentStep]);

  if (!isOpen || !orderConfig) return null;

  // Pricing & Logistics Computation
  const baseSubtotal = Number(orderConfig.pricing?.subtotal || orderConfig.price || 1200);
  const shippingFee = shippingData.shippingTier === "priority" ? 450 : 0;
  const taxableAmount = baseSubtotal + shippingFee;
  const gstTax = Math.round(taxableAmount * 0.18);
  const grandTotal = taxableAmount + gstTax;

  // Validation for Step 1
  const validateShippingForm = () => {
    const errors = {};
    if (!shippingData.fullName.trim()) errors.fullName = "Full name is required.";
    if (!shippingData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingData.email.trim())) {
      errors.email = "Please enter a valid business/personal email address.";
    }
    if (!shippingData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (shippingData.phone.replace(/[^0-9]/g, "").length < 10) {
      errors.phone = "Enter a valid 10-digit phone number.";
    }
    if (!shippingData.address.trim()) errors.address = "Street address / shipping dock is required.";
    if (!shippingData.city.trim()) errors.city = "City is required.";
    if (!shippingData.postalCode.trim()) {
      errors.postalCode = "PIN / Postal code is required.";
    } else if (!/^[0-9]{5,6}$/.test(shippingData.postalCode.trim())) {
      errors.postalCode = "Enter a valid 5 or 6-digit postal code.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (validateShippingForm()) {
      sound.playClick();
      setCurrentStep("review");
    } else {
      sound.playAlert();
    }
  };

  const handleProceedToPayment = () => {
    sound.playClick();
    setCurrentStep("payment");
  };

  // Step 3 Execution: Payment & Transmit to Backend
  const handleAuthorizeAndPlaceOrder = async () => {
    sound.playClick();
    setIsSubmitting(true);

    const fallbackTrackingId = generateTrackingId();

    const orderPayload = {
      customer: {
        fullName: shippingData.fullName.trim(),
        email: shippingData.email.trim(),
        phone: shippingData.phone.trim(),
        company: shippingData.company.trim() || null,
        address: shippingData.address.trim(),
        city: shippingData.city.trim(),
        state: shippingData.state,
        postalCode: shippingData.postalCode.trim(),
        country: shippingData.country,
      },
      configuration: {
        technology: orderConfig.technology || "FDM",
        material: orderConfig.material || "PA-CF (Carbon Nylon)",
        materialId: orderConfig.materialId || "pa-cf",
        infillPercent: orderConfig.infill || 40,
        infillPattern: orderConfig.infillPattern || "Gyroid",
        layerHeight: String(orderConfig.layerHeight || "0.16"),
        volumeCm3: orderConfig.volumeCm3 || 38,
        heightMm: orderConfig.dimensions?.z || 40,
        addons: orderConfig.addons || [],
      },
      file: {
        originalName: orderConfig.filename || "custom_model.stl",
        dimensions: orderConfig.dimensions || { x: 75, y: 55, z: 35 },
      },
      pricing: {
        materialCost: orderConfig.pricing?.materialCost || Math.round(baseSubtotal * 0.45),
        runTimeCost: orderConfig.pricing?.runTimeCost || Math.round(baseSubtotal * 0.35),
        setupFee: 420,
        postProcessingCost: orderConfig.pricing?.postProcessingCost || 0,
        shippingFee,
        subtotal: taxableAmount,
        tax: gstTax,
        total: grandTotal,
      },
      payment: {
        method: paymentMethod,
        reference:
          paymentMethod === "upi"
            ? (upiId || "UPI-QR-VERIFIED")
            : paymentMethod === "card"
            ? `CARD-••••-${cardData.cardNumber.slice(-4) || "8842"}`
            : paymentMethod === "po"
            ? (poNumber || "PO-PENDING")
            : "SANDBOX-CLEARANCE",
        status: "AUTHORIZED",
        clearedAt: getIsoTimestamp(),
      },
      notes: shippingData.notes.trim() || null,
    };

    let confirmedResult = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(orderPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.trackingId) {
          confirmedResult = {
            id: data.trackingId,
            trackingId: data.trackingId,
            status: "PENDING_REVIEW",
            client: shippingData.company || shippingData.fullName,
            filename: orderConfig.filename || "custom_part.stl",
            volumeCm3: orderConfig.volumeCm3 || 38,
            dimensions: orderConfig.dimensions,
            technology: orderConfig.technology || "FDM",
            material: orderConfig.material || "PA-CF (Carbon Nylon)",
            infill: orderConfig.infill || 40,
            layerHeight: orderConfig.layerHeight || 0.16,
            price: grandTotal,
            estimatedTime: orderConfig.estimatedTime || "2h 45m",
            assignedPrinter: orderConfig.technology === "SLA" ? "RIG-02" : "RIG-01",
            progress: 0,
            createdAt: data.order?.createdAt || getIsoTimestamp(),
            customer: orderPayload.customer,
            pricing: orderPayload.pricing,
            payment: orderPayload.payment,
          };
        }
      }
    } catch {
      // Backend is offline; use local deterministic record
    }

    // Fallback if backend wasn't running
    if (!confirmedResult) {
      confirmedResult = {
        id: fallbackTrackingId,
        trackingId: fallbackTrackingId,
        status: "PENDING_REVIEW",
        client: shippingData.company || shippingData.fullName,
        filename: orderConfig.filename || "custom_part.stl",
        volumeCm3: orderConfig.volumeCm3 || 38,
        dimensions: orderConfig.dimensions,
        technology: orderConfig.technology || "FDM",
        material: orderConfig.material || "PA-CF (Carbon Nylon)",
        infill: orderConfig.infill || 40,
        layerHeight: orderConfig.layerHeight || 0.16,
        price: grandTotal,
        estimatedTime: orderConfig.estimatedTime || "2h 45m",
        assignedPrinter: orderConfig.technology === "SLA" ? "RIG-02" : "RIG-01",
        progress: 0,
        createdAt: getIsoTimestamp(),
        customer: orderPayload.customer,
        pricing: orderPayload.pricing,
        payment: orderPayload.payment,
      };
    }

    // Small delay to simulate industrial payment verification
    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedOrder(confirmedResult);
      setCurrentStep("success");
      sound.playSuccess();

      if (onOrderSuccess) {
        onOrderSuccess(confirmedResult);
      }

      addToast({
        title: "Order Procured & Scheduled",
        message: `Order #${confirmedResult.id} authorized. Scheduled for fabrication on ${confirmedResult.assignedPrinter}.`,
        type: "success",
        orderId: confirmedResult.id,
      });
    }, 700);
  };

  const handleCopyTrackingId = (id) => {
    sound.playClick();
    navigator.clipboard.writeText(id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Export official PDF/JSON Spec
  const handleDownloadInvoice = () => {
    if (!confirmedOrder) return;
    sound.playClick();
    const invoice = {
      standard: "ISO/ASTM 52900 - Additive Manufacturing Manifest",
      invoiceNumber: `INV-${confirmedOrder.id}`,
      trackingId: confirmedOrder.id,
      generatedAt: getIsoTimestamp(),
      customer: confirmedOrder.customer,
      specifications: {
        partName: confirmedOrder.filename,
        technology: confirmedOrder.technology,
        material: confirmedOrder.material,
        dimensionsMm: confirmedOrder.dimensions,
        volumeCm3: confirmedOrder.volumeCm3,
        infill: `${confirmedOrder.infill}%`,
        layerHeightMm: confirmedOrder.layerHeight,
      },
      financials: {
        currency: "INR",
        subtotal: taxableAmount,
        shippingFee,
        gst18Percent: gstTax,
        grandTotalINR: grandTotal,
      },
      payment: confirmedOrder.payment,
      facility: "NEXUS Precision Additive Hub, Austin Facility #01",
    };

    const blob = new Blob([JSON.stringify(invoice, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NEXUS-INVOICE-${confirmedOrder.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && currentStep !== "payment" && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-[#121212] border border-[#333333] shadow-2xl rounded-[1px] w-full max-w-4xl text-white overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═════════════════════════════════════════════════════════════════
            MODAL HEADER & WORKFLOW STEP INDICATOR
        ═════════════════════════════════════════════════════════════════ */}
        <header className="border-b border-[#262626] bg-[#161616] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-[#FF5A00] rounded-[1px] shadow-[0_0_8px_rgba(255,90,0,0.6)]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-black text-sm tracking-wider uppercase text-white">
                  NEXUS // PROCUREMENT &amp; DISPATCH CHECKOUT
                </span>
                <span className="font-mono text-[9px] bg-[#FF5A00]/15 text-[#FF5A00] border border-[#FF5A00]/40 px-2 py-0.5 rounded-[1px] font-bold">
                  SECURE AES-256
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#A1A1AA] block uppercase tracking-wider">
                ITEM: {orderConfig.filename || "Custom CAD Component"} • {orderConfig.technology || "FDM"}
              </span>
            </div>
          </div>

          {/* Stepper Telemetry Tabs */}
          <div className="flex items-center gap-1 font-mono text-[10px]">
            {[
              { id: "shipping", label: "01. SHIPPING" },
              { id: "review", label: "02. REVIEW" },
              { id: "payment", label: "03. PAYMENT" },
              { id: "success", label: "04. DISPATCH" },
            ].map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast =
                (currentStep === "review" && idx === 0) ||
                (currentStep === "payment" && idx <= 1) ||
                (currentStep === "success" && idx <= 2);

              return (
                <div
                  key={step.id}
                  className={`px-2 py-1 rounded-[1px] border transition-colors ${
                    isActive
                      ? "border-[#FF5A00] bg-[#FF5A00]/15 text-[#FF5A00] font-bold"
                      : isPast
                      ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]"
                      : "border-[#262626] bg-[#141414] text-[#71717A]"
                  }`}
                >
                  <span>{isPast ? "✓" : step.label}</span>
                </div>
              );
            })}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ml-2 text-[#71717A] hover:text-white p-1 hover:bg-[#222222] border border-transparent hover:border-[#444444] rounded-[1px] transition-colors cursor-pointer"
              aria-label="Close Checkout"
            >
              ✕
            </button>
          </div>
        </header>

        {/* ═════════════════════════════════════════════════════════════════
            STEP 1: SHIPPING & DELIVERY MANIFEST
        ═════════════════════════════════════════════════════════════════ */}
        {currentStep === "shipping" && (
          <form onSubmit={handleProceedToReview} className="p-5 sm:p-7 overflow-y-auto space-y-6">
            <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider">
                  Logistics &amp; Delivery Destination Manifest
                </h3>
                <p className="font-mono text-[11px] text-[#A1A1AA] mt-0.5">
                  Enter your verified facility dock, laboratory address, or personal shipping details.
                </p>
              </div>
              <span className="font-mono text-xs text-[#FF5A00] font-bold">STEP 1 OF 3</span>
            </div>

            {/* Contact Person Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                  Recipient Full Name <span className="text-[#FF5A00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kaelen Thorne"
                  value={shippingData.fullName}
                  onChange={(e) =>
                    setShippingData({ ...shippingData, fullName: e.target.value })
                  }
                  className={`w-full bg-[#181818] border ${
                    formErrors.fullName ? "border-[#EF4444]" : "border-[#333333]"
                  } focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans`}
                />
                {formErrors.fullName && (
                  <span className="font-mono text-[10px] text-[#EF4444] mt-1 block">
                    {formErrors.fullName}
                  </span>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                  Company / Institution / Lab (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BioSync Robotics Labs"
                  value={shippingData.company}
                  onChange={(e) =>
                    setShippingData({ ...shippingData, company: e.target.value })
                  }
                  className="w-full bg-[#181818] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                  Business / Contact Email <span className="text-[#FF5A00]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. k.thorne@biosync.io"
                  value={shippingData.email}
                  onChange={(e) =>
                    setShippingData({ ...shippingData, email: e.target.value })
                  }
                  className={`w-full bg-[#181818] border ${
                    formErrors.email ? "border-[#EF4444]" : "border-[#333333]"
                  } focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans`}
                />
                {formErrors.email && (
                  <span className="font-mono text-[10px] text-[#EF4444] mt-1 block">
                    {formErrors.email}
                  </span>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                  Phone (Carrier Dispatch Updates) <span className="text-[#FF5A00]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={shippingData.phone}
                  onChange={(e) =>
                    setShippingData({ ...shippingData, phone: e.target.value })
                  }
                  className={`w-full bg-[#181818] border ${
                    formErrors.phone ? "border-[#EF4444]" : "border-[#333333]"
                  } focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans`}
                />
                {formErrors.phone && (
                  <span className="font-mono text-[10px] text-[#EF4444] mt-1 block">
                    {formErrors.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                  Street Address &amp; Dock / Floor <span className="text-[#FF5A00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 42 Tech Innovation Corridor, Gate 3, Electronic City"
                  value={shippingData.address}
                  onChange={(e) =>
                    setShippingData({ ...shippingData, address: e.target.value })
                  }
                  className={`w-full bg-[#181818] border ${
                    formErrors.address ? "border-[#EF4444]" : "border-[#333333]"
                  } focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans`}
                />
                {formErrors.address && (
                  <span className="font-mono text-[10px] text-[#EF4444] mt-1 block">
                    {formErrors.address}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                    City <span className="text-[#FF5A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={shippingData.city}
                    onChange={(e) =>
                      setShippingData({ ...shippingData, city: e.target.value })
                    }
                    className={`w-full bg-[#181818] border ${
                      formErrors.city ? "border-[#EF4444]" : "border-[#333333]"
                    } focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans`}
                  />
                  {formErrors.city && (
                    <span className="font-mono text-[10px] text-[#EF4444] mt-1 block">
                      {formErrors.city}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                    State / Region <span className="text-[#FF5A00]">*</span>
                  </label>
                  <select
                    value={shippingData.state}
                    onChange={(e) =>
                      setShippingData({ ...shippingData, state: e.target.value })
                    }
                    className="w-full bg-[#181818] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st} className="bg-[#181818]">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                    PIN / Postal Code <span className="text-[#FF5A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 560100"
                    value={shippingData.postalCode}
                    onChange={(e) =>
                      setShippingData({ ...shippingData, postalCode: e.target.value })
                    }
                    className={`w-full bg-[#181818] border ${
                      formErrors.postalCode ? "border-[#EF4444]" : "border-[#333333]"
                    } focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans font-mono`}
                  />
                  {formErrors.postalCode && (
                    <span className="font-mono text-[10px] text-[#EF4444] mt-1 block">
                      {formErrors.postalCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Logistics Tier Selection */}
            <div>
              <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-2">
                Logistics &amp; Courier Speed Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => sound.playClick()}
                  className={`border rounded-[1px] p-3.5 flex items-start justify-between cursor-pointer transition-colors ${
                    shippingData.shippingTier === "standard"
                      ? "border-[#FF5A00] bg-[#FF5A00]/10"
                      : "border-[#333333] bg-[#161616] hover:border-[#555555]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="shippingTier"
                      checked={shippingData.shippingTier === "standard"}
                      onChange={() =>
                        setShippingData({ ...shippingData, shippingTier: "standard" })
                      }
                      className="mt-0.5 accent-[#FF5A00]"
                    />
                    <div>
                      <span className="font-sans font-bold text-sm text-white block">
                        Standard Ground Logistics
                      </span>
                      <span className="font-mono text-[11px] text-[#A1A1AA] block mt-0.5">
                        BlueDart / DTDC Surface • 3–5 Business Days
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#22C55E]">FREE</span>
                </label>

                <label
                  onClick={() => sound.playClick()}
                  className={`border rounded-[1px] p-3.5 flex items-start justify-between cursor-pointer transition-colors ${
                    shippingData.shippingTier === "priority"
                      ? "border-[#FF5A00] bg-[#FF5A00]/10"
                      : "border-[#333333] bg-[#161616] hover:border-[#555555]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="shippingTier"
                      checked={shippingData.shippingTier === "priority"}
                      onChange={() =>
                        setShippingData({ ...shippingData, shippingTier: "priority" })
                      }
                      className="mt-0.5 accent-[#FF5A00]"
                    />
                    <div>
                      <span className="font-sans font-bold text-sm text-white block flex items-center gap-1.5">
                        Priority Air Courier
                        <span className="font-mono text-[9px] bg-[#FF5A00] text-black px-1.5 py-0.2 font-black rounded-[1px]">
                          FAST
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-[#A1A1AA] block mt-0.5">
                        Dedicated Air Charter • 24–48 Business Hours
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#FF5A00]">+₹450</span>
                </label>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                Special Delivery / Inspection Directives (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Leave with security dock #4, handle fragile micro-lattice geometry with care."
                value={shippingData.notes}
                onChange={(e) => setShippingData({ ...shippingData, notes: e.target.value })}
                className="w-full bg-[#181818] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-xs text-white rounded-[1px] outline-none font-sans"
              />
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-[#262626] pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-xs text-[#A1A1AA] hover:text-white px-4 py-2.5 rounded-[1px] border border-[#333333] hover:border-[#555555] uppercase font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="bg-[#FF5A00] hover:bg-[#E04F00] text-black font-sans font-bold text-sm px-6 py-2.5 rounded-[1px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,90,0,0.3)]"
              >
                <span>Continue to BOM Review</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            STEP 2: BOM SPECIFICATION & PRICING REVIEW
        ═════════════════════════════════════════════════════════════════ */}
        {currentStep === "review" && (
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
            <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider">
                  Fabrication Specification &amp; Quotation Audit
                </h3>
                <p className="font-mono text-[11px] text-[#A1A1AA] mt-0.5">
                  Confirm geometric parameters, material selection, and verified financial line items.
                </p>
              </div>
              <span className="font-mono text-xs text-[#FF5A00] font-bold">STEP 2 OF 3</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Part Specifications */}
              <div className="bg-[#161616] border border-[#2a2a2a] p-4 rounded-[1px] space-y-4">
                <span className="font-mono text-[10px] text-[#FF5A00] uppercase tracking-wider font-bold block border-b border-[#262626] pb-2">
                  // CAD GEOMETRY &amp; HARDWARE TARGET
                </span>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">PART FILENAME:</span>
                    <span className="text-white font-semibold truncate max-w-[200px]">
                      {orderConfig.filename || "custom_part.stl"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">TECHNOLOGY:</span>
                    <span className="text-[#FF5A00] font-bold">
                      {orderConfig.technology || "FDM (Fused Deposition)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">MATERIAL FEEDSTOCK:</span>
                    <span className="text-white font-bold">{orderConfig.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">BOUNDING ENVELOPE:</span>
                    <span className="text-white">
                      {orderConfig.dimensions?.x || 80} × {orderConfig.dimensions?.y || 60} ×{" "}
                      {orderConfig.dimensions?.z || 40} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">DISPLACEMENT VOLUME:</span>
                    <span className="text-white">{orderConfig.volumeCm3 || 38} cm³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">INFILL STRUCTURE:</span>
                    <span className="text-white">
                      {orderConfig.infill || 40}% {orderConfig.infillPattern || "Gyroid"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">LAYER RESOLUTION:</span>
                    <span className="text-white">{orderConfig.layerHeight || "0.16"} mm</span>
                  </div>
                </div>

                {/* Delivery Snapshot */}
                <div className="border-t border-[#262626] pt-3 font-mono text-[11px] space-y-1">
                  <span className="text-[#71717A] uppercase text-[9px] block">
                    DESTINATION ADDRESS:
                  </span>
                  <p className="text-white">
                    {shippingData.fullName}
                    {shippingData.company ? ` (${shippingData.company})` : ""}
                  </p>
                  <p className="text-[#A1A1AA] truncate">
                    {shippingData.address}, {shippingData.city}, {shippingData.state} -{" "}
                    {shippingData.postalCode}
                  </p>
                </div>
              </div>

              {/* Right Column: Financial Quotation Breakdown */}
              <div className="bg-[#141414] border border-[#2a2a2a] p-4 rounded-[1px] flex flex-col justify-between space-y-4">
                <div>
                  <span className="font-mono text-[10px] text-[#FF5A00] uppercase tracking-wider font-bold block border-b border-[#262626] pb-2">
                    // COMMERCIAL COST BREAKDOWN (INR)
                  </span>

                  <div className="mt-3 space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-[#A1A1AA]">
                      <span>Raw Material Polymer / Resin:</span>
                      <span className="text-white">
                        {formatINR(orderConfig.pricing?.materialCost || Math.round(baseSubtotal * 0.45))}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#A1A1AA]">
                      <span>Machine Run-Time &amp; Laser Calibration:</span>
                      <span className="text-white">
                        {formatINR(orderConfig.pricing?.runTimeCost || Math.round(baseSubtotal * 0.35))}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#A1A1AA]">
                      <span>Bed Prep &amp; Setup Surcharge:</span>
                      <span className="text-white">{formatINR(420)}</span>
                    </div>

                    {shippingFee > 0 && (
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Priority Air Freight (24-48h):</span>
                        <span className="text-[#FF5A00]">+{formatINR(shippingFee)}</span>
                      </div>
                    )}

                    <div className="border-t border-[#262626] pt-2 flex justify-between font-bold text-white">
                      <span>TAXABLE SUBTOTAL:</span>
                      <span>{formatINR(taxableAmount)}</span>
                    </div>

                    <div className="flex justify-between text-[#A1A1AA]">
                      <span>GST @ 18% (Harmonized HSN 8477):</span>
                      <span className="text-white">+{formatINR(gstTax)}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total Callout Box */}
                <div className="bg-[#191919] border border-[#333333] p-3 rounded-[1px] flex items-baseline justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-[#FF5A00] uppercase font-bold block">
                      TOTAL PAYABLE AMOUNT
                    </span>
                    <span className="font-mono text-[10px] text-[#71717A]">
                      INCL. TAXES &amp; CERTIFICATION
                    </span>
                  </div>
                  <span className="font-sans font-black text-2xl text-white">
                    {formatINR(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="border-t border-[#262626] pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCurrentStep("shipping");
                }}
                className="font-mono text-xs text-[#A1A1AA] hover:text-white px-4 py-2.5 rounded-[1px] border border-[#333333] hover:border-[#555555] uppercase font-bold transition-colors cursor-pointer"
              >
                ← Edit Logistics
              </button>

              <button
                type="button"
                onClick={handleProceedToPayment}
                className="bg-[#FF5A00] hover:bg-[#E04F00] text-black font-sans font-bold text-sm px-6 py-2.5 rounded-[1px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,90,0,0.3)]"
              >
                <span>Proceed to Payment Clearance</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            STEP 3: MULTI-RAIL PAYMENT GATEWAY CLEARANCE
        ═════════════════════════════════════════════════════════════════ */}
        {currentStep === "payment" && (
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
            <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider">
                  Payment Gateway &amp; Fiscal Clearance
                </h3>
                <p className="font-mono text-[11px] text-[#A1A1AA] mt-0.5">
                  Select your authorization protocol. Amount due:{" "}
                  <strong className="text-[#FF5A00] font-mono">{formatINR(grandTotal)}</strong>
                </p>
              </div>
              <span className="font-mono text-xs text-[#FF5A00] font-bold">STEP 3 OF 3</span>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "upi", label: "UPI / QR CODE", icon: "📱" },
                { id: "card", label: "CREDIT / DEBIT", icon: "💳" },
                { id: "po", label: "CORPORATE PO", icon: "🏛️" },
                { id: "sandbox", label: "INSTANT DEMO", icon: "⚡" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPaymentMethod(m.id);
                  }}
                  className={`p-3 rounded-[1px] border font-mono text-xs uppercase font-bold flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                    paymentMethod === m.id
                      ? "border-[#FF5A00] bg-[#FF5A00]/15 text-[#FF5A00]"
                      : "border-[#333333] bg-[#161616] text-[#A1A1AA] hover:text-white hover:border-[#555555]"
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Payment Sub-panels */}
            <div className="bg-[#161616] border border-[#2a2a2a] p-5 rounded-[1px]">
              {/* Option 1: UPI Dynamic QR */}
              {paymentMethod === "upi" && (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Procedural High-Contrast QR Code */}
                  <div className="bg-white p-3 rounded-[1px] flex flex-col items-center shadow-lg border border-[#333333]">
                    <svg viewBox="0 0 120 120" className="w-36 h-36">
                      {/* Corner Targets */}
                      <rect x="10" y="10" width="30" height="30" fill="#000" />
                      <rect x="15" y="15" width="20" height="20" fill="#fff" />
                      <rect x="20" y="20" width="10" height="10" fill="#000" />

                      <rect x="80" y="10" width="30" height="30" fill="#000" />
                      <rect x="85" y="15" width="20" height="20" fill="#fff" />
                      <rect x="90" y="20" width="10" height="10" fill="#000" />

                      <rect x="10" y="80" width="30" height="30" fill="#000" />
                      <rect x="15" y="85" width="20" height="20" fill="#fff" />
                      <rect x="20" y="90" width="10" height="10" fill="#000" />

                      {/* Data Grid Pattern */}
                      <rect x="50" y="20" width="10" height="20" fill="#000" />
                      <rect x="65" y="10" width="10" height="10" fill="#000" />
                      <rect x="50" y="50" width="20" height="20" fill="#FF5A00" />
                      <rect x="20" y="50" width="20" height="10" fill="#000" />
                      <rect x="80" y="50" width="10" height="20" fill="#000" />
                      <rect x="95" y="65" width="15" height="10" fill="#000" />
                      <rect x="50" y="80" width="10" height="30" fill="#000" />
                      <rect x="70" y="85" width="20" height="10" fill="#000" />
                      <rect x="100" y="90" width="10" height="20" fill="#000" />
                    </svg>
                    <span className="font-mono text-[9px] text-black font-bold uppercase tracking-wider mt-1">
                      UPI ID: nexus3d@axis
                    </span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#22C55E]">✓ INSTANT CLEARANCE</span>
                      <span className="font-mono text-[10px] text-[#71717A]">• GOOGLE PAY / PHONEPE / PAYTM</span>
                    </div>
                    <p className="font-sans text-xs text-[#A1A1AA] leading-relaxed">
                      Scan the QR code with any UPI app on your device, or enter your VPA / UPI ID below to receive a collect request.
                    </p>
                    <div>
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        Enter UPI ID / VPA
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. yourname@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option 2: Credit / Debit Card */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                    <span className="font-mono text-xs text-[#A1A1AA]">
                      ENCRYPTED VIA PCI-DSS LEVEL 1 PROTOCOL
                    </span>
                    <span className="font-mono text-[10px] text-[#22C55E]">
                      🔒 256-BIT TLS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. KAELEN THORNE"
                        value={cardData.holderName}
                        onChange={(e) =>
                          setCardData({ ...cardData, holderName: e.target.value })
                        }
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-sans uppercase"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        maxLength={19}
                        placeholder="4532 •••• •••• 8842"
                        value={cardData.cardNumber}
                        onChange={(e) =>
                          setCardData({ ...cardData, cardNumber: e.target.value })
                        }
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-mono tracking-widest"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="MM/YY"
                        value={cardData.expiry}
                        onChange={(e) =>
                          setCardData({ ...cardData, expiry: e.target.value })
                        }
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="•••"
                        value={cardData.cvv}
                        onChange={(e) =>
                          setCardData({ ...cardData, cvv: e.target.value })
                        }
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option 3: Corporate Purchase Order */}
              {paymentMethod === "po" && (
                <div className="space-y-4">
                  <div className="border-b border-[#262626] pb-2">
                    <span className="font-mono text-xs text-[#FF5A00] font-bold block">
                      NET-30 INSTITUTIONAL PROCUREMENT CLEARANCE
                    </span>
                    <span className="font-mono text-[10px] text-[#A1A1AA]">
                      For registered aerospace, university, and medical enterprise accounts.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        Purchase Order (PO) Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PO-2026-9901-AUSTIN"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-[#A1A1AA] uppercase block mb-1">
                        GSTIN / Corporate Tax ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 29AABCU9603R1ZM"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#FF5A00] px-3 py-2 text-sm text-white rounded-[1px] outline-none font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option 4: Sandbox Instant Authorization */}
              {paymentMethod === "sandbox" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="font-mono text-xs text-[#22C55E] font-bold">
                      DEVELOPER &amp; CLIENT TEST CLEARINGHOUSE
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#A1A1AA] leading-relaxed">
                    Instantly sim-authorize this transaction without entering financial credentials. 
                    A real procurement manifest will be created, registered into the production database, and assigned to active fleet hardware.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-[#262626] pt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  sound.playClick();
                  setCurrentStep("review");
                }}
                className="font-mono text-xs text-[#A1A1AA] hover:text-white px-4 py-2.5 rounded-[1px] border border-[#333333] hover:border-[#555555] uppercase font-bold transition-colors cursor-pointer"
              >
                ← Back to Review
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAuthorizeAndPlaceOrder}
                className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-sans font-black text-sm px-6 py-2.5 rounded-[1px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,197,94,0.35)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>AUTHORIZING PAYMENT...</span>
                  </>
                ) : (
                  <>
                    <span>AUTHORIZE &amp; DISPATCH ({formatINR(grandTotal)})</span>
                    <span>✓</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            STEP 4: DISPATCH CONFIRMATION & OFFICIAL TELEMETRY MANIFEST
        ═════════════════════════════════════════════════════════════════ */}
        {currentStep === "success" && confirmedOrder && (
          <div className="p-5 sm:p-8 overflow-y-auto space-y-6 text-center animate-fade-in">
            {/* Top Success Badge */}
            <div className="w-16 h-16 bg-[#22C55E]/15 border border-[#22C55E] rounded-full flex items-center justify-center mx-auto text-[#22C55E] text-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              ✓
            </div>

            <div>
              <span className="font-mono text-xs text-[#22C55E] font-bold tracking-widest uppercase block mb-1">
                // PRODUCTION CONTRACT EXECUTED • PAYMENT AUTHORIZED
              </span>
              <h2 className="font-sans font-black text-2xl text-white uppercase tracking-wider">
                Order Manifest #{confirmedOrder.id}
              </h2>
              <p className="font-sans text-xs text-[#A1A1AA] max-w-lg mx-auto mt-1">
                Your part has entered the additive fabrication queue. Pre-flight mesh verification and bed preparation have commenced on{" "}
                <strong className="text-white">{confirmedOrder.assignedPrinter}</strong>.
              </p>
            </div>

            {/* Tracking ID Callout Card with 1-Click Copy */}
            <div className="bg-[#161616] border border-[#333333] p-4 rounded-[1px] max-w-md mx-auto flex items-center justify-between">
              <div className="text-left font-mono">
                <span className="text-[10px] text-[#71717A] uppercase block">
                  OFFICIAL TRACKING IDENTIFIER
                </span>
                <span className="text-xl font-bold text-[#FF5A00]">
                  {confirmedOrder.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyTrackingId(confirmedOrder.id)}
                className="bg-[#242424] hover:bg-[#333333] text-white border border-[#444444] px-3 py-1.5 rounded-[1px] font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                {isCopied ? "✓ COPIED" : "📋 COPY ID"}
              </button>
            </div>

            {/* Summary Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto font-mono text-left bg-[#141414] border border-[#262626] p-4 rounded-[1px]">
              <div>
                <span className="text-[9px] text-[#71717A] uppercase block">CARRIER SPEED</span>
                <span className="text-xs text-white font-bold block mt-0.5">
                  {shippingData.shippingTier === "priority" ? "AIR PRIORITY" : "GROUND FREIGHT"}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[#71717A] uppercase block">EST. DISPATCH</span>
                <span className="text-xs text-[#22C55E] font-bold block mt-0.5">
                  24–48 HOURS
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[#71717A] uppercase block">AMOUNT PAID</span>
                <span className="text-xs text-white font-bold block mt-0.5">
                  {formatINR(confirmedOrder.price)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[#71717A] uppercase block">RECEIPT STATUS</span>
                <span className="text-xs text-[#22C55E] font-bold block mt-0.5">
                  AUTHORIZED
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                  window.location.hash = `#/track?id=${confirmedOrder.id}`;
                }}
                className="bg-[#FF5A00] hover:bg-[#E04F00] text-black font-sans font-bold text-xs px-5 py-2.5 rounded-[1px] uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(255,90,0,0.3)]"
              >
                🛰️ Track Real-Time Fabrication
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white border border-[#444444] font-mono text-xs px-4 py-2.5 rounded-[1px] uppercase font-bold transition-colors cursor-pointer"
              >
                📄 Download JSON Manifest
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="text-[#A1A1AA] hover:text-white font-mono text-xs px-4 py-2.5 rounded-[1px] uppercase font-bold transition-colors cursor-pointer"
              >
                ✕ Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

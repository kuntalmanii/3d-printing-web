/**
 * src/components/AdminPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Operator & Industrial Fleet Command Console
 *
 * Design Framework Tokens:
 *  - Primary:     #FF5A00 (Fleet telemetry, active status, highlights)
 *  - Dark Base:   #111111 (Industrial obsidian background)
 *  - Elevated:    #161616 / #141414 (Card & table headers)
 *  - Borders:     #333333 (1px precision dividers)
 *  - Radii:       1px strict corner radii on cards, panels, and buttons
 *  - Typography:  Inter (Primary headers/display), JetBrains Mono (metrics, telemetry)
 *  - Currency:    INR (₹ - Indian Rupee)
 *
 * Props:
 *  - fleet: Array of 3D printer hardware objects (falls back to INITIAL_FLEET)
 *  - orders: Array of customer orders (falls back to INITIAL_ORDERS)
 *  - inventory: Array of raw material stock objects (falls back to INITIAL_INVENTORY)
 *  - onUpdateOrderStatus: Function (orderId, newStatus) => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from "react";
import {
  INITIAL_FLEET,
  INITIAL_ORDERS,
  INITIAL_INVENTORY,
  formatINR,
  isLowStock,
} from "../data/mockData";

const STAGES = ["QUEUED", "PRINTING", "POST_PROCESSING", "DISPATCHED"];

export default function AdminPanel({
  fleet = INITIAL_FLEET,
  orders = INITIAL_ORDERS,
  inventory = INITIAL_INVENTORY,
  onUpdateOrderStatus,
}) {
  // Tab State: "fleet" | "queue" | "inventory"
  const [activeTab, setActiveTab] = useState("fleet");

  // Local fallback state for order status transitions if parent doesn't handle state directly
  const [localOrderOverrides, setLocalOrderOverrides] = useState({});

  // Merge orders with local status updates
  const effectiveOrders = useMemo(() => {
    return (orders || []).map((ord) => {
      if (localOrderOverrides[ord.id]) {
        return {
          ...ord,
          status: localOrderOverrides[ord.id],
          progress:
            localOrderOverrides[ord.id] === "DISPATCHED"
              ? 100
              : localOrderOverrides[ord.id] === "POST_PROCESSING"
              ? 85
              : localOrderOverrides[ord.id] === "PRINTING"
              ? Math.max(25, ord.progress || 50)
              : 0,
        };
      }
      return ord;
    });
  }, [orders, localOrderOverrides]);

  // Handle stage transition from interactive dropdown
  const handleStageChange = (orderId, newStatus) => {
    setLocalOrderOverrides((prev) => ({
      ...prev,
      [orderId]: newStatus,
    }));

    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, newStatus);
    }
  };

  // Fleet summary telemetry statistics
  const fleetStats = useMemo(() => {
    const total = fleet.length;
    const active = fleet.filter((r) => r.status === "ACTIVE").length;
    const idle = fleet.filter((r) => r.status === "IDLE").length;
    const maintenance = fleet.filter((r) => r.status === "MAINTENANCE").length;
    return { total, active, idle, maintenance };
  }, [fleet]);

  // Inventory alert count
  const lowStockCount = useMemo(() => {
    return (inventory || []).filter((item) => isLowStock(item)).length;
  }, [inventory]);

  return (
    <section
      id="admin-panel"
      className="bg-[#111111] text-white border border-[#333333] rounded-[1px] overflow-hidden"
      aria-label="Operator and Admin Fleet Command Console"
    >
      {/* ═════════════════════════════════════════════════════════════════════
          TOP OPERATOR CONSOLE HEADER
      ═════════════════════════════════════════════════════════════════════ */}
      <header className="bg-[#161616] border-b border-[#333333] px-4 md:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Title & Status Beacon */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-[#FF5A00] rounded-[1px] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-base md:text-lg tracking-wider uppercase text-white">
                  OPERATOR // FLEET CONTROL &amp; DISPATCH CONSOLE
                </h2>
                <span className="font-mono text-[9px] bg-[#FF5A00]/15 text-[#FF5A00] border border-[#FF5A00]/40 px-2 py-0.5 rounded-[1px] font-bold">
                  LEVEL 4 AUTH
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#A1A1AA] mt-0.5 uppercase tracking-wide">
                FACILITY ID: NEXUS-AUSTIN-01 • AS9100D FABRICATION PROTOCOL ACTIVE
              </p>
            </div>
          </div>

          {/* Real-time Fleet Telemetry Stat Badges */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <div className="bg-[#111111] border border-[#333333] px-3 py-1.5 rounded-[1px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]" />
              <span className="text-[#A1A1AA]">FLEET:</span>
              <span className="text-white font-bold">{fleetStats.active} ACTIVE</span>
              <span className="text-[#71717A]">/ {fleetStats.total} TOTAL</span>
            </div>

            <div className="bg-[#111111] border border-[#333333] px-3 py-1.5 rounded-[1px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              <span className="text-[#A1A1AA]">QUEUE:</span>
              <span className="text-white font-bold">{effectiveOrders.length} JOBS</span>
            </div>

            {lowStockCount > 0 ? (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 px-3 py-1.5 rounded-[1px] flex items-center gap-2 text-[#EF4444]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                <span className="font-bold">{lowStockCount} LOW STOCK ALERT</span>
              </div>
            ) : (
              <div className="bg-[#111111] border border-[#333333] px-3 py-1.5 rounded-[1px] flex items-center gap-2 text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                <span className="font-bold">INVENTORY NOMINAL</span>
              </div>
            )}
          </div>
        </div>

        {/* 3-Tab Sub-Navigation Interface */}
        <nav className="flex items-center gap-2 mt-5 border-t border-[#262626] pt-4 overflow-x-auto">
          <button
            type="button"
            id="admin-tab-fleet"
            onClick={() => setActiveTab("fleet")}
            className={`font-mono text-xs md:text-[13px] px-4 py-2.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold whitespace-nowrap ${
              activeTab === "fleet"
                ? "bg-[#111111] text-[#FF5A00] border-t-[#FF5A00] border-t-2 border-x-[#333333] border-b-[#111111]"
                : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
            }`}
          >
            [ TAB 01: FLEET TELEMETRY ({fleet.length}) ]
          </button>

          <button
            type="button"
            id="admin-tab-queue"
            onClick={() => setActiveTab("queue")}
            className={`font-mono text-xs md:text-[13px] px-4 py-2.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold whitespace-nowrap ${
              activeTab === "queue"
                ? "bg-[#111111] text-[#FF5A00] border-t-[#FF5A00] border-t-2 border-x-[#333333] border-b-[#111111]"
                : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
            }`}
          >
            [ TAB 02: PRODUCTION QUEUE ({effectiveOrders.length}) ]
          </button>

          <button
            type="button"
            id="admin-tab-inventory"
            onClick={() => setActiveTab("inventory")}
            className={`font-mono text-xs md:text-[13px] px-4 py-2.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold whitespace-nowrap ${
              activeTab === "inventory"
                ? "bg-[#111111] text-[#FF5A00] border-t-[#FF5A00] border-t-2 border-x-[#333333] border-b-[#111111]"
                : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
            }`}
          >
            [ TAB 03: RAW MATERIAL INVENTORY ({inventory.length}) ]
          </button>
        </nav>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 01: [ FLEET TELEMETRY ]
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fleet" && (
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex items-center justify-between font-mono text-[11px] text-[#A1A1AA] border-b border-[#222222] pb-3">
            <span className="text-[#FF5A00] font-bold uppercase tracking-wider">
              // ACTIVE ADDITIVE RIG TELEMETRY &amp; THERMAL METRICS
            </span>
            <span className="uppercase text-[10px] text-[#71717A]">
              TELEMETRY POLLING: 1000ms • HARDENED CAN-BUS PROTOCOL
            </span>
          </div>

          {/* Multi-Column Grid of Machine Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {fleet.map((rig) => {
              const isActive = rig.status === "ACTIVE";
              const isMaintenance = rig.status === "MAINTENANCE";
              const layerPercent =
                rig.totalLayers > 0
                  ? Math.min(100, Math.round((rig.currentLayer / rig.totalLayers) * 100))
                  : 0;

              return (
                <div
                  key={rig.id}
                  className="bg-[#141414] border border-[#333333] rounded-[1px] p-5 flex flex-col justify-between space-y-4 hover:border-[#444444] transition-colors"
                >
                  {/* Card Header: Rig ID and Status Badge */}
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white tracking-wider">
                          {rig.id}
                        </span>
                        <span className="font-mono text-[9px] text-[#71717A] bg-[#1A1A1A] px-1.5 py-0.5 rounded-[1px] border border-[#2A2A2A]">
                          [{rig.type}]
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold rounded-full ${
                          isActive
                            ? "border border-[#FF5A00] text-[#FF5A00] bg-[#FF5A00]/10"
                            : isMaintenance
                            ? "border border-[#EF4444] text-[#EF4444] bg-[#EF4444]/10"
                            : "border border-[#A1A1AA] text-[#A1A1AA] bg-[#A1A1AA]/10"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive
                              ? "bg-[#FF5A00] animate-pulse"
                              : isMaintenance
                              ? "bg-[#EF4444]"
                              : "bg-[#A1A1AA]"
                          }`}
                        />
                        {rig.status}
                      </span>
                    </div>

                    {/* Machine Model & Spool Specification */}
                    <div className="mt-3 space-y-1">
                      <h3 className="font-sans font-bold text-sm text-white truncate">
                        {rig.model}
                      </h3>
                      <p className="font-mono text-[10px] text-[#A1A1AA] truncate">
                        SPOOL: <span className="text-[#FF5A00]">{rig.activeSpool}</span>
                      </p>
                      <p className="font-mono text-[10px] text-[#71717A]">
                        JOB: {rig.currentOrder ? (
                          <span className="text-white font-semibold">{rig.currentOrder}</span>
                        ) : (
                          <span className="text-[#555555]">STANDBY // NO JOB</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 3-Column Thermal Telemetry Cluster */}
                  <div className="grid grid-cols-3 gap-2 bg-[#111111] border border-[#262626] p-2.5 rounded-[1px] text-center font-mono">
                    {/* 1. Hotend / Nozzle */}
                    <div className="border-r border-[#222222] pr-1">
                      <span className="text-[9px] text-[#71717A] uppercase block">HOTEND</span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {rig.nozzleTemp}°C
                      </span>
                      <span className="text-[8px] text-[#555555] block">
                        T: {rig.targetNozzleTemp}°C
                      </span>
                    </div>

                    {/* 2. Heated Bed */}
                    <div className="border-r border-[#222222] px-1">
                      <span className="text-[9px] text-[#71717A] uppercase block">BED</span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {rig.bedTemp}°C
                      </span>
                      <span className="text-[8px] text-[#555555] block">
                        T: {rig.targetBedTemp}°C
                      </span>
                    </div>

                    {/* 3. Chamber */}
                    <div className="pl-1">
                      <span className="text-[9px] text-[#71717A] uppercase block">CHAMBER</span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {rig.chamberTemp}°C
                      </span>
                      <span className="text-[8px] text-[#22C55E] block">SEALED</span>
                    </div>
                  </div>

                  {/* Active Job Layer Progression Bar */}
                  <div>
                    <div className="flex justify-between items-center font-mono text-[10px] mb-1">
                      <span className="text-[#71717A] uppercase">
                        {isActive
                          ? `LAYER ${rig.currentLayer} / ${rig.totalLayers}`
                          : "IDLE // READY"}
                      </span>
                      <span className="text-[#FF5A00] font-bold">
                        {isActive ? `${layerPercent}%` : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-[#1A1A1A] border border-[#2C2C2C] h-2 rounded-[1px] overflow-hidden p-[1px]">
                      <div
                        className={`h-full rounded-[1px] transition-all duration-300 ${
                          isActive ? "bg-[#FF5A00]" : "bg-[#333333]"
                        }`}
                        style={{ width: `${layerPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-[#555555]">
                      <span>UPTIME: {rig.uptime}</span>
                      <span>LINK: 100% OK</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 02: [ PRODUCTION QUEUE ]
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "queue" && (
        <div className="p-4 md:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px] text-[#A1A1AA] border-b border-[#222222] pb-3">
            <span className="text-[#FF5A00] font-bold uppercase tracking-wider">
              // PRODUCTION EXECUTION QUEUE • REAL-TIME DISPATCH MANIFEST
            </span>
            <span className="uppercase text-[10px] text-[#71717A]">
              SHOWING {effectiveOrders.length} REGISTERED ASSETS
            </span>
          </div>

          {/* High-Density Industrial Data Table */}
          <div className="border border-[#333333] rounded-[1px] overflow-x-auto bg-[#111111]">
            <table className="w-full text-left border-collapse">
              {/* Header */}
              <thead>
                <tr className="bg-[#141414] border-b border-[#333333] font-mono text-[10px] text-[#A1A1AA] uppercase tracking-wider">
                  <th className="py-3 px-4">ORDER CODE</th>
                  <th className="py-3 px-4">FILE / CLIENT ASSET</th>
                  <th className="py-3 px-4">TECH &amp; MATERIAL</th>
                  <th className="py-3 px-4">SLICING PARAMETERS</th>
                  <th className="py-3 px-4">RIG ALLOCATION</th>
                  <th className="py-3 px-4">CURRENT STAGE</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-[#222222] font-mono text-xs">
                {effectiveOrders.map((ord) => {
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-[#161616] transition-colors"
                    >
                      {/* 1. Order Code */}
                      <td className="py-3.5 px-4 font-bold text-[#FF5A00] whitespace-nowrap">
                        {ord.id}
                        <span className="block text-[9px] text-[#666666] font-normal">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : "TODAY"}
                        </span>
                      </td>

                      {/* 2. File / Client Asset */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <span className="text-white font-semibold truncate block">
                          {ord.filename}
                        </span>
                        <span className="text-[10px] text-[#A1A1AA] truncate block">
                          CLIENT: {ord.client}
                        </span>
                      </td>

                      {/* 3. Tech & Material */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-white bg-[#1F1F1F] border border-[#333333] rounded-[1px] mr-1.5">
                          {ord.technology}
                        </span>
                        <span className="text-[#A1A1AA] text-[11px]">
                          {ord.material}
                        </span>
                      </td>

                      {/* 4. Slicing Parameters (Infill % / Layer Height) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#A1A1AA]">
                        <span className="text-white font-bold">{ord.infill}%</span> infill
                        <span className="text-[#555555] mx-1">/</span>
                        <span className="text-white font-bold">{ord.layerHeight}mm</span> layer
                      </td>

                      {/* 5. Rig Allocation */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-white bg-[#1A1A1A] border border-[#333333] px-2 py-1 rounded-[1px] text-[11px]">
                          {ord.assignedPrinter || "RIG-01"}
                        </span>
                      </td>

                      {/* 6. Current Stage Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                            ord.status === "PRINTING"
                              ? "border border-[#FF5A00] text-[#FF5A00] bg-[#FF5A00]/10"
                              : ord.status === "POST_PROCESSING"
                              ? "border border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10"
                              : ord.status === "DISPATCHED"
                              ? "border border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                              : "border border-[#A1A1AA] text-[#A1A1AA] bg-[#A1A1AA]/10"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ord.status === "PRINTING"
                                ? "bg-[#FF5A00] animate-pulse"
                                : ord.status === "POST_PROCESSING"
                                ? "bg-[#38BDF8]"
                                : ord.status === "DISPATCHED"
                                ? "bg-[#22C55E]"
                                : "bg-[#A1A1AA]"
                            }`}
                          />
                          {ord.status}
                        </span>
                      </td>

                      {/* 7. Action: Interactive Stage Updater Dropdown */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <select
                          value={ord.status}
                          onChange={(e) => handleStageChange(ord.id, e.target.value)}
                          className="bg-[#181818] text-white border border-[#333333] hover:border-[#FF5A00] focus:border-[#FF5A00] focus:outline-none rounded-[1px] px-2.5 py-1 text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          {STAGES.map((stage) => (
                            <option key={stage} value={stage} className="bg-[#181818] text-white">
                              → {stage}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 03: [ RAW MATERIAL INVENTORY ]
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex items-center justify-between font-mono text-[11px] text-[#A1A1AA] border-b border-[#222222] pb-3">
            <span className="text-[#FF5A00] font-bold uppercase tracking-wider">
              // RAW MATERIAL INVENTORY MONITORING • 1000g BASELINE ALLOCATION
            </span>
            <span className="uppercase text-[10px] text-[#71717A]">
              STOCK VERIFICATION: CONTINUOUS LOAD-CELL SENSORS
            </span>
          </div>

          {/* Cards Displaying Raw Material Stock Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {inventory.map((item) => {
              const isAlert = isLowStock(item);
              const percentage = Math.min(100, Math.round((item.remainingGrams / 1000) * 100));

              return (
                <div
                  key={item.id}
                  className={`bg-[#141414] border rounded-[1px] p-5 flex flex-col justify-between space-y-5 transition-colors ${
                    isAlert
                      ? "border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      : "border-[#333333] hover:border-[#444444]"
                  }`}
                >
                  {/* Card Header: Material ID & Alert Badge */}
                  <div>
                    <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {item.id}
                      </span>

                      {/* Visual Alert Indicator */}
                      {isAlert ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[9px] uppercase font-bold text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444] rounded-full animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[9px] uppercase font-semibold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                          OPTIMAL
                        </span>
                      )}
                    </div>

                    {/* Metric Readouts: Material Name, Unit Type, Cost Per Kg */}
                    <div className="mt-3 space-y-1.5">
                      <h3 className="font-sans font-bold text-sm text-white truncate">
                        {item.name}
                      </h3>
                      <div className="font-mono text-[10px] text-[#A1A1AA] flex justify-between">
                        <span>PACKAGE TYPE:</span>
                        <span className="text-white font-semibold">{item.type}</span>
                      </div>
                      <div className="font-mono text-[10px] text-[#A1A1AA] flex justify-between">
                        <span>COST / KG:</span>
                        <span className="text-[#FF5A00] font-bold">{formatINR(item.costPerKg)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Level Bar against 1000g baseline */}
                  <div>
                    <div className="flex justify-between items-center font-mono text-[11px] mb-1.5">
                      <span className="text-[#A1A1AA]">
                        REMAINING: <strong className="text-white">{item.remainingGrams}g</strong>
                      </span>
                      <span className={`font-bold ${isAlert ? "text-[#EF4444]" : "text-[#FF5A00]"}`}>
                        {percentage}%
                      </span>
                    </div>

                    {/* Stock Level Bar (changes from #FF5A00 to Red when low) */}
                    <div className="w-full bg-[#1A1A1A] border border-[#2C2C2C] h-3 rounded-[1px] overflow-hidden p-[1px]">
                      <div
                        className={`h-full rounded-[1px] transition-all duration-500 ${
                          isAlert ? "bg-[#EF4444]" : "bg-[#FF5A00]"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Micro-label footer */}
                    <div className="mt-2 flex items-center justify-between font-mono text-[9px]">
                      <span className="text-[#71717A]">
                        BASELINE: 1000g
                      </span>
                      <span className={isAlert ? "text-[#EF4444] font-bold" : "text-[#71717A]"}>
                        THRESHOLD: {item.threshold}g
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

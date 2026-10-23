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
 *  - onRestockInventory: Optional Function (itemId) => void
 *  - onEmergencyStop: Optional Function () => void
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
import { sound } from "../utils/soundEffects";
import { useToast } from "../context/ToastContext";

const STAGES = ["QUEUED", "PRINTING", "POST_PROCESSING", "DISPATCHED"];

function ThroughputSparklineChart() {
  const hourlyData = [
    { hour: "00:00", rate: 42 },
    { hour: "03:00", rate: 58 },
    { hour: "06:00", rate: 75 },
    { hour: "09:00", rate: 92 },
    { hour: "12:00", rate: 110 },
    { hour: "15:00", rate: 98 },
    { hour: "18:00", rate: 104 },
    { hour: "21:00", rate: 85 },
  ];

  const maxRate = 120;
  const width = 420;
  const height = 54;
  const points = hourlyData
    .map((d, i) => {
      const x = (i / (hourlyData.length - 1)) * (width - 20) + 10;
      const y = height - (d.rate / maxRate) * (height - 14) - 6;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] p-3 rounded-[1px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00] animate-ping" />
          <span className="font-mono text-[10px] text-[#FF5A00] uppercase tracking-widest font-bold">
            24H FABRICATION THROUGHPUT &amp; LAYER YIELD
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-sans font-bold text-lg text-white">845 cm³/hr</span>
          <span className="font-mono text-[10px] text-[#22C55E]">↑ +14.2% VS 7D AVG</span>
          <span className="font-mono text-[10px] text-[#71717A]">• 99.4% FIRST-LAYER ADHESION</span>
        </div>
      </div>

      <div className="w-full md:w-auto flex items-center gap-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full md:w-64 h-12 overflow-visible">
          <defs>
            <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5A00" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FF5A00" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polygon
            points={`10,${height} ${points} ${width - 10},${height}`}
            fill="url(#sparkline-grad)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#FF5A00"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={width - 10}
            cy={height - (hourlyData[hourlyData.length - 1].rate / maxRate) * (height - 14) - 6}
            r="3.5"
            fill="#FF5A00"
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
}

export default function AdminPanel({
  fleet = INITIAL_FLEET,
  orders = INITIAL_ORDERS,
  inventory = INITIAL_INVENTORY,
  onUpdateOrderStatus,
  onRestockInventory,
  onEmergencyStop,
  onLockConsole,
}) {
  const { addToast } = useToast();

  // Tab State: "fleet" | "queue" | "inventory"
  const [activeTab, setActiveTab] = useState("fleet");
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [isHalted, setIsHalted] = useState(false);

  // Local fallback state for order status transitions only if parent onUpdateOrderStatus is not provided
  const [localOrderOverrides, setLocalOrderOverrides] = useState({});

  // Merge orders with local status updates
  const effectiveOrders = useMemo(() => {
    return (orders || []).map((ord) => {
      const overrideStatus = localOrderOverrides[ord.id];
      if (overrideStatus && ord.status !== overrideStatus) {
        return {
          ...ord,
          status: overrideStatus,
          progress:
            overrideStatus === "DISPATCHED"
              ? 100
              : overrideStatus === "POST_PROCESSING"
              ? 85
              : overrideStatus === "PRINTING"
              ? Math.max(35, ord.progress || 50)
              : 0,
        };
      }
      return ord;
    });
  }, [orders, localOrderOverrides]);

  // Handle stage transition from interactive dropdown
  const handleStageChange = (orderId, newStatus) => {
    sound.playClick();
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, newStatus);
    } else {
      setLocalOrderOverrides((prev) => ({
        ...prev,
        [orderId]: newStatus,
      }));
    }

    addToast({
      title: "Order Status Updated",
      message: `Order #${orderId} stage transitioned to ${newStatus}.`,
      type: newStatus === "DISPATCHED" ? "success" : "info",
      orderId,
    });
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

  // Handle emergency stop
  const handleToggleEmergencyStop = () => {
    if (!isHalted) {
      sound.playAlert();
      setIsHalted(true);
      if (onEmergencyStop) onEmergencyStop();
      addToast({
        title: "FLEET EMERGENCY HALT ENGAGED",
        message: "All machine axes locked. Hotends cooling to ambient safe state.",
        type: "warning",
      });
    } else {
      sound.playSuccess();
      setIsHalted(false);
      addToast({
        title: "FLEET RESUMED NORMAL OPERATIONS",
        message: "Interlocks cleared. Standby rigs re-enabled.",
        type: "info",
      });
    }
  };

  // Filtered queue orders
  const filteredOrders = useMemo(() => {
    if (queueFilter === "ALL") return effectiveOrders;
    return effectiveOrders.filter((ord) => ord.status === queueFilter);
  }, [effectiveOrders, queueFilter]);

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
            <span
              className={`w-3 h-3 rounded-[1px] animate-pulse ${
                isHalted ? "bg-[#EF4444]" : "bg-[#FF5A00]"
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-base md:text-lg tracking-wider uppercase text-white">
                  OPERATOR // FLEET CONTROL &amp; DISPATCH CONSOLE
                </h2>
                <span className="font-mono text-[9px] bg-[#FF5A00]/15 text-[#FF5A00] border border-[#FF5A00]/40 px-2 py-0.5 rounded-[1px] font-bold">
                  LEVEL 4 AUTH
                </span>
                {isHalted && (
                  <span className="font-mono text-[9px] bg-[#EF4444] text-black font-black px-2 py-0.5 rounded-[1px] animate-pulse">
                    EMERGENCY HALTED
                  </span>
                )}
              </div>
              <p className="font-mono text-[11px] text-[#A1A1AA] mt-0.5 uppercase tracking-wide">
                FACILITY ID: NEXUS-AUSTIN-01 • AS9100D FABRICATION PROTOCOL ACTIVE
              </p>
            </div>
          </div>

          {/* Action & Real-time Fleet Telemetry Stat Badges */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            {/* Emergency E-Stop Button */}
            <button
              type="button"
              onClick={handleToggleEmergencyStop}
              className={`px-3 py-1.5 rounded-[1px] border font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                isHalted
                  ? "bg-[#22C55E] text-black border-[#22C55E] hover:bg-[#16A34A]"
                  : "bg-[#EF4444]/15 hover:bg-[#EF4444] text-[#EF4444] hover:text-black border-[#EF4444]"
              }`}
            >
              <span>{isHalted ? "✓ RESUME FLEET" : "🚨 FLEET E-STOP"}</span>
            </button>

            {/* Operator Lock Console Button */}
            {onLockConsole && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onLockConsole();
                }}
                className="bg-[#181818] hover:bg-[#252525] text-[#A1A1AA] hover:text-white border border-[#333333] hover:border-[#EF4444] px-3 py-1.5 rounded-[1px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                title="Lock Operator Console and return to Client Interface"
              >
                <span>🔒 LOCK CONSOLE</span>
              </button>
            )}

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

        {/* 24h Fabrication Sparkline Telemetry */}
        <ThroughputSparklineChart />

        {/* 3-Tab Sub-Navigation Interface */}
        <nav className="flex items-center gap-2 mt-5 border-t border-[#262626] pt-4 overflow-x-auto">
          <button
            type="button"
            id="admin-tab-fleet"
            onClick={() => {
              sound.playClick();
              setActiveTab("fleet");
            }}
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
            onClick={() => {
              sound.playClick();
              setActiveTab("queue");
            }}
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
            onClick={() => {
              sound.playClick();
              setActiveTab("inventory");
            }}
            className={`font-mono text-xs md:text-[13px] px-4 py-2.5 rounded-[1px] border transition-colors cursor-pointer uppercase tracking-wider font-semibold whitespace-nowrap ${
              activeTab === "inventory"
                ? "bg-[#111111] text-[#FF5A00] border-t-[#FF5A00] border-t-2 border-x-[#333333] border-b-[#111111]"
                : "bg-[#1A1A1A] text-[#A1A1AA] border-[#333333] hover:text-white hover:border-[#555555]"
            }`}
          >
            [ TAB 03: RAW INVENTORY ({inventory.length}) ]
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
              // ACTIVE MACHINE FLEET TELEMETRY • LIVE INDUSTRIAL SENSORS
            </span>
            <span className="uppercase text-[10px] text-[#71717A]">
              TELEMETRY POLLING: 1000ms LATENCY
            </span>
          </div>

          {/* Multi-Column Grid of Machine Rig Cards */}
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
                  className="bg-[#141414] border border-[#333333] hover:border-[#FF5A00] transition-colors duration-200 rounded-[1px] p-5 flex flex-col justify-between space-y-4"
                >
                  {/* Card Header: Rig ID and Status Badge */}
                  <div>
                    <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white tracking-wider">
                          {rig.id}
                        </span>
                        <span className="font-mono text-[9px] text-[#71717A] bg-[#1a1a1a] px-1.5 py-0.5 border border-[#2a2a2a] rounded-[1px]">
                          {rig.type}
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

                    {/* Machine Model & Spool / Cartridge Info */}
                    <div className="mt-3 space-y-1">
                      <h3 className="font-sans font-bold text-sm text-white truncate">
                        {rig.model}
                      </h3>
                      <p className="font-mono text-[11px] text-[#A1A1AA] truncate">
                        SPOOL: <span className="text-[#FF5A00] font-semibold">{rig.material}</span>
                      </p>
                      {rig.currentOrder && (
                        <p className="font-mono text-[10px] text-[#71717A]">
                          JOB ID: <strong className="text-white">{rig.currentOrder}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3-Column Thermal Telemetry Cluster */}
                  <div className="grid grid-cols-3 gap-1 bg-[#101010] border border-[#262626] p-2.5 rounded-[1px] font-mono text-center">
                    {/* 1. Hotend */}
                    <div className="border-r border-[#222222] pr-1">
                      <span className="text-[9px] text-[#71717A] uppercase block">
                        {rig.type === "SLA" ? "OPTICAL" : "HOTEND"}
                      </span>
                      <span className="text-xs font-bold text-[#FF5A00] block mt-0.5">
                        {rig.type === "SLA" ? "405nm" : `${rig.nozzleTemp}°C`}
                      </span>
                      <span className="text-[8px] text-[#71717A] block">
                        {rig.type === "SLA" ? "UV LASER" : `SET ${rig.targetNozzleTemp}°C`}
                      </span>
                    </div>

                    {/* 2. Bed */}
                    <div className="border-r border-[#222222] px-1">
                      <span className="text-[9px] text-[#71717A] uppercase block">
                        {rig.type === "SLA" ? "RESIN VAT" : "BED"}
                      </span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {rig.bedTemp}°C
                      </span>
                      <span className="text-[8px] text-[#71717A] block">
                        SET {rig.targetBedTemp}°C
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[11px] text-[#A1A1AA] border-b border-[#222222] pb-3">
            <span className="text-[#FF5A00] font-bold uppercase tracking-wider">
              // PRODUCTION EXECUTION QUEUE • REAL-TIME DISPATCH MANIFEST
            </span>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["ALL", "QUEUED", "PRINTING", "POST_PROCESSING", "DISPATCHED"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setQueueFilter(f);
                  }}
                  className={`px-2 py-0.5 rounded-[1px] text-[10px] uppercase font-bold border transition-colors ${
                    queueFilter === f
                      ? "bg-[#FF5A00] text-black border-[#FF5A00]"
                      : "bg-[#161616] text-[#A1A1AA] border-[#333333] hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
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
                {filteredOrders.map((ord) => {
                  const isPrinting = ord.status === "PRINTING";
                  const isPostProcessing = ord.status === "POST_PROCESSING";
                  const isDispatched = ord.status === "DISPATCHED";

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-[#181818] transition-colors duration-150"
                    >
                      {/* 1. Order Code */}
                      <td className="py-3.5 px-4 font-bold text-[#FF5A00] whitespace-nowrap">
                        {ord.id}
                      </td>

                      {/* 2. File & Client */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="text-white font-semibold block truncate">
                          {ord.filename}
                        </span>
                        <span className="text-[#71717A] text-[10px] block truncate">
                          CLIENT: {ord.client}
                        </span>
                      </td>

                      {/* 3. Tech & Material */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-white block font-medium">
                          {ord.material}
                        </span>
                        <span className="text-[#A1A1AA] text-[10px] block">
                          [{ord.technology}] • {formatINR(ord.price)}
                        </span>
                      </td>

                      {/* 4. Slicing Parameters */}
                      <td className="py-3.5 px-4 text-[#A1A1AA] text-[11px] whitespace-nowrap">
                        <span className="block">INFILL: {ord.infill}%</span>
                        <span className="text-[#71717A] text-[10px] block">
                          LAYER: {ord.layerHeight}mm
                        </span>
                      </td>

                      {/* 5. Rig Allocation */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-white font-semibold block">
                          {ord.assignedPrinter || "UNASSIGNED"}
                        </span>
                        <span className="text-[#FF5A00] text-[10px] block">
                          {ord.progress || 0}% EXECUTED
                        </span>
                      </td>

                      {/* 6. Current Stage Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full ${
                            isPrinting
                              ? "border border-[#FF5A00] text-[#FF5A00] bg-[#FF5A00]/10"
                              : isPostProcessing
                              ? "border border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10"
                              : isDispatched
                              ? "border border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                              : "border border-[#A1A1AA] text-[#A1A1AA] bg-[#A1A1AA]/10"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPrinting
                                ? "bg-[#FF5A00] animate-pulse"
                                : isPostProcessing
                                ? "bg-[#38BDF8]"
                                : isDispatched
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

                    {/* Micro-label & Restock Action */}
                    <div className="mt-3 flex items-center justify-between font-mono text-[9px]">
                      <span className="text-[#71717A]">
                        BASELINE: 1000g
                      </span>
                      {onRestockInventory && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playSuccess();
                            onRestockInventory(item.id);
                            addToast({
                              title: "Raw Material Restocked",
                              message: `${item.name} replenished to 1000g.`,
                              type: "success",
                            });
                          }}
                          className="text-[#FF5A00] hover:text-white bg-[#FF5A00]/10 hover:bg-[#FF5A00]/20 border border-[#FF5A00]/30 px-2 py-0.5 rounded-[1px] font-bold uppercase transition-colors"
                        >
                          + RESTOCK 1000g
                        </button>
                      )}
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

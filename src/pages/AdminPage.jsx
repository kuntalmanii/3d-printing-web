/**
 * src/pages/AdminPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Standalone Dedicated Operator & Admin Console Route (#/admin)
 *
 * Requirements:
 *  - Admin login is accessible ONLY through direct URL navigation (#/admin or /admin)
 *  - Clients browsing the main site do not see any admin login buttons or triggers
 *  - Displays full-screen Level 4 Security Clearance Gateway when unauthenticated
 *  - Unlocks full Operator Console (AdminPanel) once verified with authorized credentials
 *  - Provides [ 🔒 LOCK & LOGOUT ] and [ ← RETURN TO CLIENT ] controls
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";
import AdminPanel from "../components/AdminPanel";
import { sound } from "../utils/soundEffects";
import { useToast } from "../context/ToastContext";

const VALID_PASSCODES = ["NEXUS-8402", "8402", "nexus-admin", "admin8402"];

export default function AdminPage({
  fleet,
  orders,
  inventory,
  onUpdateOrderStatus,
  onRestockInventory,
  onEmergencyStop,
  isAuthenticated,
  onAuthenticate,
  onLogout,
  onBackToClient,
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAuthenticated) {
      sound.playAlert();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const cleanPass = passcode.trim();

    if (VALID_PASSCODES.includes(cleanPass.toLowerCase()) || VALID_PASSCODES.includes(cleanPass)) {
      sound.playSuccess();
      setError(false);
      setErrorMessage("");
      addToast({
        title: "Level 4 Clearance Granted",
        message: "Operator identity verified. Fleet control privileges active.",
        type: "success",
      });
      onAuthenticate();
    } else {
      sound.playAlert();
      setError(true);
      setErrorMessage("ACCESS DENIED // Invalid operator credentials. Incident recorded in audit log.");
      addToast({
        title: "Security Interlock Triggered",
        message: "Unauthorized attempt to access fabrication fleet controls.",
        type: "warning",
      });
    }
  };

  const handleQuickFill = () => {
    sound.playClick();
    setPasscode("NEXUS-8402");
    setError(false);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: UNAUTHENTICATED — DEDICATED FULL-SCREEN LEVEL 4 CLEARANCE GATE
  // ═════════════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-between font-sans selection:bg-[#FF5A00] selection:text-black">
        {/* Top Header Strip */}
        <header className="border-b border-[#262626] bg-[#141414] px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-[#FF5A00] rounded-[1px] shadow-[0_0_8px_rgba(255,90,0,0.6)]" />
              <div>
                <span className="font-sans font-black text-sm tracking-wider uppercase text-white">
                  NEXUS // 3D FABRICATION
                </span>
                <span className="font-mono text-[10px] text-[#A1A1AA] block uppercase tracking-wider">
                  RESTRICTED URL TERMINAL • LEVEL 4 PROTOCOL
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToClient}
              className="font-mono text-xs text-[#A1A1AA] hover:text-white bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] px-3 py-1.5 rounded-[1px] transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>←</span>
              <span>[ RETURN TO CLIENT PORTAL ]</span>
            </button>
          </div>
        </header>

        {/* Central Clearance Gateway Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
          <div
            className={`w-full max-w-lg bg-[#141414] border ${
              error ? "border-[#EF4444] shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "border-[#333333] shadow-2xl"
            } rounded-[1px] overflow-hidden transition-all`}
          >
            {/* Card Header */}
            <div className="bg-[#181818] border-b border-[#262626] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-ping" />
                <div>
                  <span className="font-mono text-[10px] text-[#EF4444] font-bold uppercase tracking-widest block">
                    // RESTRICTED ACCESS GATEWAY
                  </span>
                  <h2 className="font-sans font-bold text-base text-white uppercase tracking-wider">
                    OPERATOR CLEARANCE LOGIN
                  </h2>
                </div>
              </div>
              <span className="font-mono text-[9px] bg-[#222222] text-[#A1A1AA] border border-[#333333] px-2 py-0.5 rounded-[1px] uppercase">
                DIRECT URL ONLY
              </span>
            </div>

            {/* Card Form Body */}
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-6">
              <div className="bg-[#0E0E0E] border border-[#262626] p-4 rounded-[1px] space-y-2">
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">
                  <span className="text-[#FF5A00]">⚠</span>
                  <span>SECURITY POLICY SPECIFICATION:</span>
                </div>
                <p className="font-sans text-xs text-[#A1A1AA] leading-relaxed">
                  This console is restricted to certified shop technicians and fleet engineers. Direct URL routing
                  detected. Please input authorized Level 4 clearance credentials to access hardware telemetry, thermal
                  overrides, and G-code execution.
                </p>
              </div>

              {/* Passcode Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center font-mono text-xs">
                  <label htmlFor="url-operator-passcode" className="text-[#A1A1AA] uppercase tracking-wider">
                    OPERATOR PASSKEY / PIN:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-[#71717A] hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    [{showPassword ? "HIDE KEY" : "REVEAL KEY"}]
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="url-operator-passcode"
                    ref={inputRef}
                    type={showPassword ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder="ENTER CLEARANCE KEY (e.g. NEXUS-8402)"
                    className={`w-full bg-[#0A0A0A] text-white font-mono text-sm px-4 py-3.5 border ${
                      error
                        ? "border-[#EF4444] text-[#EF4444] focus:border-[#EF4444]"
                        : "border-[#333333] focus:border-[#FF5A00]"
                    } rounded-[1px] focus:outline-none tracking-widest placeholder-[#444444] transition-colors`}
                  />
                </div>

                {error && (
                  <p className="font-mono text-xs text-[#EF4444] mt-1.5 flex items-center gap-1.5 leading-snug">
                    <span>✕</span>
                    <span>{errorMessage}</span>
                  </p>
                )}
              </div>

              {/* Demo Helper Box */}
              <div className="bg-[#181818] border border-[#2A2A2A] p-3 rounded-[1px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-[#71717A]">AUTHORIZED DEMO CREDENTIAL:</span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[#FF5A00] hover:text-white font-bold uppercase transition-colors underline cursor-pointer text-left sm:text-right"
                >
                  [ AUTOFILL: NEXUS-8402 ]
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToClient}
                  className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white border border-[#333333] py-3 px-4 font-mono text-xs font-bold uppercase rounded-[1px] transition-colors cursor-pointer text-center"
                >
                  [ ← RETURN TO CLIENT ]
                </button>

                <button
                  type="submit"
                  className="w-full bg-[#FF5A00] hover:bg-[#D94D00] text-black font-mono text-xs font-bold uppercase py-3 px-4 rounded-[1px] transition-colors cursor-pointer text-center shadow-[0_0_15px_rgba(255,90,0,0.3)]"
                >
                  [ VERIFY &amp; UNLOCK ]
                </button>
              </div>
            </form>

            {/* Audit Strip */}
            <div className="bg-[#0D0D0D] border-t border-[#222222] px-6 py-3 flex flex-wrap items-center justify-between font-mono text-[9px] text-[#555555] gap-2">
              <span>FACILITY: NEXUS-AUSTIN-01</span>
              <span>PROTOCOL: ISO/ASTM 52900 • AS9100D</span>
            </div>
          </div>
        </main>

        {/* Technical Footer */}
        <footer className="border-t border-[#262626] bg-[#141414] py-4 px-6 font-mono text-[11px] text-[#71717A] text-center">
          <span>NEXUS INDUSTRIAL ADDITIVE MANUFACTURING // OPERATOR SECURITY SUBSYSTEM</span>
        </footer>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: AUTHENTICATED — DEDICATED FULL OPERATOR CONSOLE WITH TOP BAR
  // ═════════════════════════════════════════════════════════════════════════
  const activeRigsCount = (fleet || []).filter((r) => r.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-sans selection:bg-[#FF5A00] selection:text-white">
      {/* Dedicated Operator Sticky Command Bar */}
      <header className="sticky top-0 z-50 bg-[#161616]/95 backdrop-blur-md border-b border-[#333333] px-4 md:px-8 py-3 transition-colors">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Brand + Link back to Client */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToClient}
              className="group flex items-center gap-2 font-mono text-xs text-[#A1A1AA] hover:text-white bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] px-3 py-1.5 rounded-[1px] transition-colors cursor-pointer"
              title="Return to public client fabrication portal"
            >
              <span className="text-[#FF5A00] group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>[ CLIENT PORTAL ]</span>
            </button>

            <span className="text-[#333333] hidden sm:inline">|</span>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#FF5A00] rounded-[1px]" />
              <h1 className="font-sans font-black text-sm tracking-wider uppercase text-white">
                NEXUS // OPERATOR FLEET COMMAND
              </h1>
              <span className="font-mono text-[9px] bg-[#FF5A00]/15 text-[#FF5A00] border border-[#FF5A00]/40 px-2 py-0.5 rounded-[1px] font-bold">
                LEVEL 4 ACTIVE
              </span>
            </div>
          </div>

          {/* Right: Telemetry Badge + Lock / Logout Action */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-2.5 py-1 rounded-[1px] text-[11px] font-bold flex items-center gap-1.5 hidden md:flex">
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
              <span>
                ACTIVE RIGS: {activeRigsCount}/{(fleet || []).length}
              </span>
            </span>

            <button
              type="button"
              onClick={onLogout}
              className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#EF4444] hover:text-white border border-[#333333] hover:border-[#EF4444] px-3.5 py-1.5 rounded-[1px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-2"
              title="End operator session, lock console, and return to client site"
            >
              <span>🔒</span>
              <span>[ LOCK &amp; LOGOUT ]</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Panel Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <AdminPanel
          fleet={fleet}
          orders={orders}
          inventory={inventory}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onRestockInventory={onRestockInventory}
          onEmergencyStop={onEmergencyStop}
          onLockConsole={onLogout}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#333333] bg-[#141414] py-4 px-6 font-mono text-[11px] text-[#71717A] text-center">
        <span>© 2026 NEXUS FABRICATION CORP. • OPERATOR TERMINAL • AS9100D CERTIFIED</span>
      </footer>
    </div>
  );
}

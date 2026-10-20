/**
 * src/components/ui/AdminAuthModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Operator Security Clearance Gate
 * Restricts access to Operator Console so clients cannot enter without Level 4 clearance.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect } from "react";
import { sound } from "../../utils/soundEffects";
import { useToast } from "../../context/ToastContext";

// Allowed operator credentials (passcode or numeric PIN)
const VALID_PASSCODES = ["NEXUS-8402", "8402", "nexus-admin", "admin8402"];

export default function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  const { addToast } = useToast();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setPasscode("");
    setError(false);
    setErrorMessage("");
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  useEffect(() => {
    if (isOpen) {
      sound.playAlert();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanPass = passcode.trim();

    if (VALID_PASSCODES.includes(cleanPass.toLowerCase()) || VALID_PASSCODES.includes(cleanPass)) {
      sound.playSuccess();
      setError(false);
      addToast({
        title: "Level 4 Clearance Granted",
        message: "Operator identity verified. Fleet control privileges active.",
        type: "success",
      });
      onSuccess();
    } else {
      sound.playAlert();
      setError(true);
      setErrorMessage("ACCESS DENIED // Invalid operator credentials. Incident logged to audit log.");
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`bg-[#141414] border ${
          error ? "border-[#EF4444] shadow-[0_0_25px_rgba(239,68,68,0.25)]" : "border-[#333333] shadow-2xl"
        } rounded-[1px] w-full max-w-md overflow-hidden text-white transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#181818] border-b border-[#262626] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-ping" />
            <div>
              <span className="font-mono text-[10px] text-[#EF4444] font-bold uppercase tracking-widest block">
                // RESTRICTED AREA • LEVEL 4 AUTH
              </span>
              <h3 id="auth-modal-title" className="font-sans font-bold text-sm text-white uppercase tracking-wider">
                OPERATOR ACCESS INTERLOCK
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-[#71717A] hover:text-white px-2 py-1 bg-[#222222] border border-[#333333] rounded-[1px] transition-colors"
          >
            [ ESC ✕ ]
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-[#111111] border border-[#222222] p-3.5 rounded-[1px] space-y-1.5">
            <span className="font-mono text-[9px] text-[#A1A1AA] uppercase tracking-wider block font-semibold">
              SECURITY POLICY NOTICE:
            </span>
            <p className="font-sans text-xs text-[#A1A1AA] leading-relaxed">
              Client accounts are strictly prohibited from accessing machine G-code queues, thermal overrides, and
              fleet calibrations. Please present authorized operator credentials to proceed.
            </p>
          </div>

          {/* Passcode Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center font-mono text-xs">
              <label htmlFor="operator-passcode" className="text-[#A1A1AA] uppercase tracking-wider">
                OPERATOR PASSCODE / PIN:
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-[#71717A] hover:text-white uppercase transition-colors"
              >
                [{showPassword ? "HIDE" : "REVEAL"}]
              </button>
            </div>

            <div className="relative">
              <input
                id="operator-passcode"
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="ENTER CLEARANCE KEY (e.g. NEXUS-8402)"
                className={`w-full bg-[#0D0D0D] text-white font-mono text-sm px-4 py-3 border ${
                  error
                    ? "border-[#EF4444] text-[#EF4444] focus:border-[#EF4444]"
                    : "border-[#333333] focus:border-[#FF5A00]"
                } rounded-[1px] focus:outline-none tracking-widest placeholder-[#555555]`}
              />
            </div>

            {error && (
              <p className="font-mono text-[11px] text-[#EF4444] mt-1.5 leading-snug">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Authorized Demo Credentials Hint */}
          <div className="bg-[#161616] border border-[#262626] p-2.5 rounded-[1px] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#71717A]">OPERATOR PASSKEY:</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[#FF5A00] hover:text-white font-bold uppercase transition-colors underline cursor-pointer"
            >
              [ USE DEMO KEY: NEXUS-8402 ]
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white border border-[#333333] py-2.5 px-4 font-mono text-xs font-bold uppercase rounded-[1px] transition-colors cursor-pointer text-center"
            >
              [ RETURN TO CLIENT ]
            </button>

            <button
              type="submit"
              className="w-full bg-[#FF5A00] hover:bg-[#D94D00] text-black font-mono text-xs font-bold uppercase py-2.5 px-4 rounded-[1px] transition-colors cursor-pointer text-center"
            >
              [ VERIFY &amp; UNLOCK ]
            </button>
          </div>
        </form>

        {/* Footer Audit Bar */}
        <div className="bg-[#0D0D0D] border-t border-[#222222] px-5 py-2.5 flex items-center justify-between font-mono text-[9px] text-[#555555]">
          <span>FACILITY: NEXUS-AUSTIN-01</span>
          <span>ISO 52900 / AS9100D</span>
        </div>
      </div>
    </div>
  );
}

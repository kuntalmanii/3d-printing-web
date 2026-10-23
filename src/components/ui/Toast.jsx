/**
 * src/components/ui/Toast.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS // Industrial Notification Toast Component
 * Displays futuristic, high-contrast system alerts with sound feedback & telemetry.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from "react";
import { ToastContext } from "../../context/ToastContext";
import { sound } from "../../utils/soundEffects";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = "info", orderId, duration = 4500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);

    if (type === "success") {
      sound.playSuccess();
    } else if (type === "warning") {
      sound.playAlert();
    } else {
      sound.playChirp();
    }

    setToasts((prev) => [...prev, { id, title, message, type, orderId, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";

          const accentColor = isSuccess
            ? "#22C55E"
            : isWarning
            ? "#FBBF24"
            : "#FF5A00";

          return (
            <div
              key={toast.id}
              className="pointer-events-auto bg-[#141414]/95 backdrop-blur-md border border-[#333333] shadow-2xl p-4 rounded-[1px] relative overflow-hidden transition-all duration-300"
              style={{
                borderLeftColor: accentColor,
                borderLeftWidth: "3px",
                animation: "toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
                boxShadow: `0 10px 30px rgba(0,0,0,0.7), 0 0 20px ${accentColor}25`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="w-2 h-2 mt-1 rounded-full animate-ping shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-widest text-[#71717A] uppercase">
                        // SYSTEM EVENT
                      </span>
                      {toast.orderId && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/30 rounded-[1px] font-bold">
                          {toast.orderId}
                        </span>
                      )}
                    </div>
                    <h4 className="font-sans font-bold text-xs sm:text-sm text-white mt-0.5 uppercase tracking-wide">
                      {toast.title}
                    </h4>
                    {toast.message && (
                      <p className="font-mono text-[11px] text-[#A1A1AA] mt-1 leading-snug">
                        {toast.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-[#71717A] hover:text-white p-1 font-mono text-xs cursor-pointer transition-colors"
                  aria-label="Dismiss toast"
                >
                  ✕
                </button>
              </div>

              {/* Progress bar countdown */}
              <div
                className="absolute bottom-0 left-0 h-[2px] opacity-75"
                style={{
                  backgroundColor: accentColor,
                  width: "100%",
                  animation: `toast-progress ${toast.duration}ms linear forwards`,
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

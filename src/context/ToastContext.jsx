/**
 * src/context/ToastContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Context definition for application-wide industrial toast notifications.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
}

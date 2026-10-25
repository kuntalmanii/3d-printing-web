/**
 * useMediaQuery — responsive breakpoint hook.
 * @param {string} query - CSS media query string.
 * @returns {boolean}
 *
 * Usage:
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 */
import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mql = window.matchMedia(query);
      if (mql.addEventListener) {
        mql.addEventListener("change", callback);
        return () => mql.removeEventListener("change", callback);
      } else if (mql.addListener) {
        mql.addListener(callback);
        return () => mql.removeListener(callback);
      }
      return () => {};
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia(query).matches;
    }
    return false;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

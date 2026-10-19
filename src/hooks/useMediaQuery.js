/**
 * useMediaQuery — responsive breakpoint hook.
 * @param {string} query - CSS media query string.
 * @returns {boolean}
 *
 * Usage:
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 */
import { useState, useEffect } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

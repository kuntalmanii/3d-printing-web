/**
 * cn — class name utility (lightweight clsx replacement).
 * Filters falsy values and joins class strings.
 *
 * Usage:
 *   cn("base-class", isActive && "active", undefined)
 *   // => "base-class active"
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * formatTemp — format a temperature value with unit.
 * @param {number} value
 * @param {"C"|"F"} unit
 * @returns {string}
 */
export function formatTemp(value, unit = "C") {
  return `${value}°${unit}`;
}

/**
 * formatDuration — convert seconds to HH:MM:SS display string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * clamp — constrain a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

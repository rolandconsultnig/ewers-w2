/**
 * Canonical severity palette for charts, maps, and badges.
 * Red → Active tension/violence | Orange → Rising tension | Yellow → Moderate risk | Green → Relatively stable
 */
export const SEVERITY_HEX = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
} as const;

export type SeverityLevel = keyof typeof SEVERITY_HEX;

const LEVELS = new Set<string>(["critical", "high", "medium", "low"]);

export function normalizeSeverityLevel(raw: string): SeverityLevel | null {
  const k = raw.toLowerCase();
  return LEVELS.has(k) ? (k as SeverityLevel) : null;
}

/** Hex for Recharts / Leaflet; unknown severities → neutral slate */
export function severityHex(raw: string): string {
  const level = normalizeSeverityLevel(raw);
  return level ? SEVERITY_HEX[level] : "#94a3b8";
}

/** Tailwind classes for bordered badges / pills */
export const SEVERITY_BADGE_CLASS: Record<SeverityLevel, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

/** Left-border list rows (alerts) */
export const SEVERITY_LIST_ROW_CLASS: Record<SeverityLevel, string> = {
  critical: "border-red-500 bg-red-50/40 text-red-950",
  high: "border-orange-500 bg-orange-50/40 text-orange-950",
  medium: "border-yellow-500 bg-yellow-50/40 text-yellow-950",
  low: "border-green-500 bg-green-50/40 text-green-950",
};

export function severityBadgeClass(raw: string): string {
  const level = normalizeSeverityLevel(raw);
  return level ? SEVERITY_BADGE_CLASS[level] : "bg-slate-100 text-slate-700 border-slate-200";
}

export function severityListRowClass(raw: string): string {
  const level = normalizeSeverityLevel(raw);
  return level ? SEVERITY_LIST_ROW_CLASS[level] : "border-slate-300 bg-slate-50 text-slate-700";
}

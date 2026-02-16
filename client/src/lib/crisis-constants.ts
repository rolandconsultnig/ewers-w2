// Incident/Crisis types with colors and labels (aligned with EarlyPeaceTracker)
export const crisisTypes: Record<string, { color: string; label: string }> = {
  violence: { color: "#E74C3C", label: "Violence" },
  sgbv: { color: "#C2185B", label: "Sexual and Gender-Based Violence" },
  protest: { color: "#9B59B6", label: "Protest" },
  natural_disaster: { color: "#3498DB", label: "Natural Disaster" },
  economic: { color: "#F39C12", label: "Economic" },
  political: { color: "#34495E", label: "Political" },
  // EarlyPeaceTracker types for compatibility
  land: { color: "#F1C40F", label: "Communal Land Dispute" },
  banditry: { color: "#E74C3C", label: "Banditry" },
  farmers: { color: "#27AE60", label: "Farmers/Herders Crisis" },
  government: { color: "#34495E", label: "Government Policy Crisis" },
};

export const severityLevels = ["low", "medium", "high", "critical"];
export const crisisStatuses = ["pending", "active", "resolved"];

/** Severity colors: Low=Green, Medium=Grey, High=Blue, Critical=Red */
export const severityColors: Record<string, string> = {
  low: "#22c55e",      // green-500
  medium: "#6b7280",   // gray-500
  high: "#3b82f6",     // blue-500
  critical: "#ef4444", // red-500
};

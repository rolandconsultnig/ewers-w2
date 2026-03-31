/**
 * Department-based module access: each user belongs to one department and may only
 * use platform features allowed for that department (intersected with role permissions).
 * Role `admin` bypasses department scope and keeps full permission-based access.
 */
import { getDefaultPermissionsForRole } from "./permissions";

export const DEPARTMENT_IDS = ["early_warning", "election_monitoring", "communications", "administration"] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  early_warning: "Early Warning & Response",
  election_monitoring: "Election Monitoring",
  communications: "Communications & Social Media",
  administration: "Administration",
};

/** Available on every department (if the role grants them). */
export const SHARED_FEATURE_IDS: readonly string[] = ["dashboard", "map", "search", "settings"];

const EW: readonly string[] = [
  ...SHARED_FEATURE_IDS,
  "executive",
  "situation_room",
  "conflict_management",
  "ai_analysis",
  "ai_prediction",
  "ai_advisor",
  "peace_indicators",
  "data_collection",
  "data_processing",
  "collected_data",
  "processed_data",
  "risk_assessment",
  "visualization",
  "alerts",
  "incident_review",
  "voice_incident",
  "case_management",
  "response_plans",
  "responder_portal",
];

const EL: readonly string[] = [
  ...SHARED_FEATURE_IDS,
  "election_monitoring",
  "election_news",
  "election_elections",
  "election_parties",
  "election_politicians",
  "election_actors",
  "election_violence",
];

const COM: readonly string[] = [
  ...SHARED_FEATURE_IDS,
  "chat",
  "email",
  "calls",
  "sms",
  "sms_compose",
  "sms_templates",
  "sms_logs",
  "social_media",
  "social_dashboard",
  "social_twitter",
  "social_facebook",
  "social_instagram",
  "social_tiktok",
];

const ADM: readonly string[] = [
  ...SHARED_FEATURE_IDS,
  "audit_logs",
  "enterprise_settings",
  "user_management",
  "workflows",
  "integrations",
  "reporting",
];

const ALLOWLIST: Record<DepartmentId, ReadonlySet<string>> = {
  early_warning: new Set(EW),
  election_monitoring: new Set(EL),
  communications: new Set(COM),
  administration: new Set(ADM),
};

export function isDepartmentId(value: string | null | undefined): value is DepartmentId {
  return !!value && (DEPARTMENT_IDS as readonly string[]).includes(value);
}

/**
 * Normalize DB value: known slugs, or legacy free-text → best department.
 */
export function normalizeDepartmentId(raw: string | null | undefined): DepartmentId {
  if (!raw || !String(raw).trim()) return "early_warning";
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (isDepartmentId(key)) return key;
  if (key.includes("election")) return "election_monitoring";
  if (key.includes("communic") || key.includes("media") || key.includes("sms") || key.includes("social"))
    return "communications";
  if (key.includes("admin")) return "administration";
  return "early_warning";
}

export type UserForDepartmentAccess = {
  role: string;
  department?: string | null;
  permissions?: string[] | null;
};

function resolveBasePermissionIds(user: UserForDepartmentAccess): string[] {
  if ((user.role || "").toLowerCase() === "admin") {
    return ["*"];
  }
  const raw = user.permissions;
  const isLegacyView = Array.isArray(raw) && raw.length === 1 && raw[0] === "view";
  if (Array.isArray(raw) && raw.length > 0 && !isLegacyView) {
    return raw;
  }
  return getDefaultPermissionsForRole(user.role ?? "user");
}

/**
 * Effective feature ids after role + department intersection.
 */
export function getEffectivePermissionIdsForUser(user: UserForDepartmentAccess): string[] {
  if ((user.role || "").toLowerCase() === "admin") {
    return resolveBasePermissionIds(user);
  }

  const raw = user.permissions;
  const hasExplicitPerUserPermissions =
    Array.isArray(raw) && raw.length > 0 && !(raw.length === 1 && raw[0] === "view");

  const base = resolveBasePermissionIds(user);
  const dept = normalizeDepartmentId(user.department);
  const allowed = ALLOWLIST[dept];

  // Explicit per-user feature grants should be honored (even across departments).
  if (hasExplicitPerUserPermissions) {
    return base;
  }

  if (base.length === 1 && base[0] === "view") {
    return SHARED_FEATURE_IDS.filter((id) => allowed.has(id));
  }

  if (base.includes("*")) {
    return [...allowed].filter((id) => id !== "*" && id !== "view").sort();
  }

  return base.filter((p) => allowed.has(p));
}

export function userHasEffectivePermission(user: UserForDepartmentAccess | undefined, permissionId: string): boolean {
  if (!user) return false;
  if ((user.role || "").toLowerCase() === "admin") return true;
  const eff = getEffectivePermissionIdsForUser(user);
  return eff.includes(permissionId);
}

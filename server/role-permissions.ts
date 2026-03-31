/**
 * Editable role permission templates. Stored in settings (category: role_permissions, key: templates).
 * Falls back to DEFAULT_PERMISSIONS_BY_ROLE when not set.
 */
import { storage } from "./storage";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@shared/permissions";

const CATEGORY = "role_permissions";
const KEY = "templates";

export async function getRolePermissionTemplates(): Promise<Record<string, string[]>> {
  const row = await storage.getSettingByKey(CATEGORY, KEY);
  if (!row || !row.value || typeof row.value !== "object") return { ...DEFAULT_PERMISSIONS_BY_ROLE };
  const stored = row.value as Record<string, string[]>;
  return { ...DEFAULT_PERMISSIONS_BY_ROLE, ...stored };
}

export async function getPermissionsForRole(role: string): Promise<string[]> {
  const templates = await getRolePermissionTemplates();
  const normalized = (role || "user").toLowerCase();
  return templates[normalized] ?? templates.user ?? [];
}

export async function saveRolePermissionTemplate(
  role: string,
  permissions: string[],
  updatedBy: number
): Promise<void> {
  const templates = await getRolePermissionTemplates();
  const normalized = (role || "user").toLowerCase();
  templates[normalized] = permissions;
  const row = await storage.getSettingByKey(CATEGORY, KEY);
  if (row) {
    await storage.updateSetting(row.id, { value: templates as any });
  } else {
    await storage.createSetting({
      category: CATEGORY,
      key: KEY,
      value: templates as any,
      updatedBy,
    });
  }

  // Apply updated role permissions to all existing users in this role
  // so role-level changes take effect immediately platform-wide.
  const users = await storage.getAllUsers();
  const targetRole = normalized;
  await Promise.all(
    users
      .filter((u) => (u.role || "").toLowerCase() === targetRole)
      .map((u) => storage.updateUser(u.id, { permissions })),
  );
}

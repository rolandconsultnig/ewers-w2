import { db } from "../db";
import { settings } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { storage } from "../storage";
import type { Incident, Alert, User } from "@shared/schema";
import * as notificationService from "./notification-service";

const NOTIFICATION_RULES_CATEGORY = "notification_rules";
const NOTIFICATION_RULES_KEY = "rules";

export type NotificationRuleEvent = "incident_created" | "alert_created";

export interface NotificationRuleConditions {
  severityIn?: string[];
  regionIn?: string[];
  categoryIn?: string[];
  sourceIn?: string[];
  escalationLevelGte?: number;
}

export interface NotificationRuleActions {
  notifyRoles?: string[];
  notifyUserIds?: number[];
  notificationType?: "info" | "warning" | "critical" | "crisis";
  titleTemplate?: string;
  messageTemplate?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  event: NotificationRuleEvent;
  conditions?: NotificationRuleConditions;
  actions: NotificationRuleActions;
}

function coerceRules(value: unknown): NotificationRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r) => r && typeof r === "object")
    .map((r: any) => {
      const id = typeof r.id === "string" ? r.id : String(Math.random());
      const name = typeof r.name === "string" ? r.name : "Rule";
      const enabled = typeof r.enabled === "boolean" ? r.enabled : true;
      const event: NotificationRuleEvent = r.event === "alert_created" ? "alert_created" : "incident_created";
      const conditions: NotificationRuleConditions | undefined = r.conditions && typeof r.conditions === "object" ? r.conditions : undefined;
      const actions: NotificationRuleActions = r.actions && typeof r.actions === "object" ? r.actions : {};
      return { id, name, enabled, event, conditions, actions } satisfies NotificationRule;
    });
}

export async function getNotificationRules(): Promise<NotificationRule[]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.category, NOTIFICATION_RULES_CATEGORY), eq(settings.key, NOTIFICATION_RULES_KEY)))
    .limit(1);

  return coerceRules(row?.value);
}

export async function setNotificationRules(rules: NotificationRule[], updatedBy: number): Promise<NotificationRule[]> {
  const normalized = rules
    .filter((r) => r && typeof r.id === "string" && typeof r.name === "string")
    .map((r) => ({
      id: r.id,
      name: r.name,
      enabled: Boolean(r.enabled),
      event: r.event,
      conditions: r.conditions ?? {},
      actions: r.actions ?? {},
    }));

  const [existing] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.category, NOTIFICATION_RULES_CATEGORY), eq(settings.key, NOTIFICATION_RULES_KEY)))
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({
        value: normalized,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      category: NOTIFICATION_RULES_CATEGORY,
      key: NOTIFICATION_RULES_KEY,
      value: normalized,
      description: "Notification rules for incidents and alerts",
      updatedBy,
    });
  }

  return normalized;
}

function template(s: string | undefined, vars: Record<string, string>): string {
  if (!s) return "";
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return typeof v === "string" ? v : "";
  });
}

function matchesConditions(conditions: NotificationRuleConditions | undefined, data: { severity?: string | null; region?: string | null; category?: string | null; source?: string | null; escalationLevel?: number | null }): boolean {
  if (!conditions) return true;

  if (Array.isArray(conditions.severityIn) && conditions.severityIn.length > 0) {
    if (!data.severity || !conditions.severityIn.includes(data.severity)) return false;
  }

  if (Array.isArray(conditions.regionIn) && conditions.regionIn.length > 0) {
    if (!data.region || !conditions.regionIn.includes(data.region)) return false;
  }

  if (Array.isArray(conditions.categoryIn) && conditions.categoryIn.length > 0) {
    if (!data.category || !conditions.categoryIn.includes(data.category)) return false;
  }

  if (Array.isArray(conditions.sourceIn) && conditions.sourceIn.length > 0) {
    if (!data.source || !conditions.sourceIn.includes(data.source)) return false;
  }

  if (typeof conditions.escalationLevelGte === "number") {
    const lvl = typeof data.escalationLevel === "number" ? data.escalationLevel : 0;
    if (lvl < conditions.escalationLevelGte) return false;
  }

  return true;
}

async function resolveRecipients(actions: NotificationRuleActions): Promise<User[]> {
  const all = await storage.getAllUsers();
  const byId = new Map<number, User>();
  for (const u of all) byId.set(u.id, u);

  const recipients: User[] = [];

  if (Array.isArray(actions.notifyUserIds)) {
    for (const id of actions.notifyUserIds) {
      if (typeof id !== "number") continue;
      const u = byId.get(id);
      if (u && u.active !== false) recipients.push(u);
    }
  }

  if (Array.isArray(actions.notifyRoles) && actions.notifyRoles.length > 0) {
    for (const u of all) {
      if (u.active === false) continue;
      if (actions.notifyRoles.includes(u.role)) recipients.push(u);
    }
  }

  const unique = new Map<number, User>();
  for (const u of recipients) unique.set(u.id, u);
  return Array.from(unique.values());
}

export async function evaluateNotificationRulesForIncident(incident: Incident): Promise<number> {
  const rules = await getNotificationRules();

  const enabledRules = rules.filter((r) => r.enabled && r.event === "incident_created");

  if (enabledRules.length === 0) {
    const adminUsers = await storage.getAllUsers();
    const notifyUsers = adminUsers.filter((u) => (u.securityLevel ?? 0) >= 5 || u.role === "admin");
    let created = 0;
    for (const u of notifyUsers) {
      await notificationService.createNotification({
        userId: u.id,
        incidentId: incident.id,
        title: `New Incident: ${incident.title}`,
        message: incident.description,
        type: incident.severity === "critical" || incident.severity === "high" ? "critical" : "warning",
      });
      created++;
    }
    return created;
  }

  let created = 0;
  for (const rule of enabledRules) {
    if (!matchesConditions(rule.conditions, { severity: incident.severity, region: incident.region, category: incident.category, source: null, escalationLevel: null })) continue;

    const recipients = await resolveRecipients(rule.actions);
    if (recipients.length === 0) continue;

    const vars = {
      incidentTitle: incident.title,
      incidentDescription: incident.description,
      incidentLocation: incident.location,
      incidentRegion: incident.region ?? "",
      incidentSeverity: incident.severity ?? "",
      incidentCategory: incident.category ?? "",
    };

    const title = template(rule.actions.titleTemplate, vars) || `Incident: ${incident.title}`;
    const message = template(rule.actions.messageTemplate, vars) || incident.description;
    const type = rule.actions.notificationType ?? (incident.severity === "critical" || incident.severity === "high" ? "critical" : "warning");

    for (const u of recipients) {
      await notificationService.createNotification({
        userId: u.id,
        incidentId: incident.id,
        title,
        message,
        type,
      });
      created++;
    }
  }

  return created;
}

export async function evaluateNotificationRulesForAlert(alert: Alert): Promise<number> {
  const rules = await getNotificationRules();
  const enabledRules = rules.filter((r) => r.enabled && r.event === "alert_created");

  if (enabledRules.length === 0) {
    const adminUsers = await storage.getAllUsers();
    const notifyUsers = adminUsers.filter((u) => (u.securityLevel ?? 0) >= 5 || u.role === "admin");
    let created = 0;
    for (const u of notifyUsers) {
      await notificationService.createNotification({
        userId: u.id,
        alertId: alert.id,
        title: `New Alert: ${alert.title}`,
        message: alert.description,
        type: alert.severity === "critical" || alert.severity === "high" ? "critical" : "warning",
      });
      created++;
    }
    return created;
  }

  let created = 0;
  for (const rule of enabledRules) {
    if (!matchesConditions(rule.conditions, { severity: alert.severity, region: alert.region, category: alert.category ?? null, source: alert.source ?? null, escalationLevel: null })) continue;

    const recipients = await resolveRecipients(rule.actions);
    if (recipients.length === 0) continue;

    const vars = {
      alertTitle: alert.title,
      alertDescription: alert.description,
      alertLocation: alert.location,
      alertRegion: alert.region ?? "",
      alertSeverity: alert.severity ?? "",
      alertCategory: alert.category ?? "",
      alertSource: alert.source ?? "",
      alertEscalationLevel: "",
    };

    const title = template(rule.actions.titleTemplate, vars) || `Alert: ${alert.title}`;
    const message = template(rule.actions.messageTemplate, vars) || alert.description;
    const type = rule.actions.notificationType ?? (alert.severity === "critical" || alert.severity === "high" ? "critical" : "warning");

    for (const u of recipients) {
      await notificationService.createNotification({
        userId: u.id,
        alertId: alert.id,
        title,
        message,
        type,
      });
      created++;
    }
  }

  return created;
}

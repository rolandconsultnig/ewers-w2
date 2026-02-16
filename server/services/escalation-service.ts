/**
 * Escalation Service - SLA tracking and escalation workflow for enterprise EWER
 */
import { db } from "../db";
import { alerts, escalationRules } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import * as notificationService from "./notification-service";
import { storage } from "../storage";

export interface SlaStatus {
  alertId: number;
  generatedAt: Date;
  slaMinutes: number;
  elapsedMinutes: number;
  breached: boolean;
  remainingMinutes: number;
}

export async function getSlaStatus(alertId: number): Promise<SlaStatus | null> {
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, alertId));
  if (!alert || alert.status !== "active") return null;

  const [rule] = await db
    .select()
    .from(escalationRules)
    .where(
      and(
        eq(escalationRules.triggerSeverity, alert.severity),
        eq(escalationRules.active, true)
      )
    );

  const slaMinutes = rule?.slaMinutes ?? 60;
  const generatedAt = new Date(alert.generatedAt);
  const elapsedMinutes = Math.floor((Date.now() - generatedAt.getTime()) / 60000);
  const breached = elapsedMinutes > slaMinutes;

  return {
    alertId,
    generatedAt,
    slaMinutes,
    elapsedMinutes,
    breached,
    remainingMinutes: Math.max(0, slaMinutes - elapsedMinutes),
  };
}

export async function checkAndEscalateBreachedAlerts(): Promise<number> {
  const activeAlerts = await db.select().from(alerts).where(eq(alerts.status, "active"));
  let escalated = 0;

  for (const alert of activeAlerts) {
    const status = await getSlaStatus(alert.id);
    if (status?.breached) {
      const [rule] = await db
        .select()
        .from(escalationRules)
        .where(
          and(
            eq(escalationRules.triggerSeverity, alert.severity),
            eq(escalationRules.active, true)
          )
        );

      if (rule) {
        await db
          .update(alerts)
          .set({
            escalationLevel: rule.escalateToLevel,
            acknowledgedAt: null,
          })
          .where(eq(alerts.id, alert.id));

        const adminUsers = await storage.getAllUsers();
        const notifyUsers = adminUsers.filter(
          (u) =>
            u.securityLevel >= 5 ||
            u.role === "admin" ||
            (rule.notifyRoles?.includes(u.role) ?? false)
        );

        for (const u of notifyUsers) {
          await notificationService.createNotification({
            userId: u.id,
            alertId: alert.id,
            title: `SLA BREACH: ${alert.title}`,
            message: `Alert escalated - SLA exceeded by ${status.elapsedMinutes - status.slaMinutes} minutes`,
            type: "critical",
          });
        }

        escalated++;
        logger.warn("Alert escalated due to SLA breach", {
          alertId: alert.id,
          severity: alert.severity,
          rule: rule.name,
        });
      }
    }
  }

  return escalated;
}

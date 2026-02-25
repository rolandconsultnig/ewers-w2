/**
 * Threshold Alert Service - CRUD for threshold rules and evaluation (trigger alerts when conditions are met)
 */
import { db } from "../db";
import {
  thresholdAlertRules,
  riskIndicators,
  incidents,
  alerts,
  type ThresholdAlertRule,
  type InsertThresholdAlertRule,
} from "@shared/schema";
import { eq, desc, gte } from "drizzle-orm";

export type TriggerConfigIndicator = {
  indicatorId?: number;
  region?: string;
  minValue: number;
};

export type TriggerConfigIncidentCount = {
  region?: string;
  count: number;
  withinDays: number;
};

export async function getThresholdRules(): Promise<ThresholdAlertRule[]> {
  const rows = await db
    .select()
    .from(thresholdAlertRules)
    .orderBy(desc(thresholdAlertRules.id));
  return rows;
}

export async function createThresholdRule(
  data: InsertThresholdAlertRule
): Promise<ThresholdAlertRule> {
  const [row] = await db.insert(thresholdAlertRules).values(data).returning();
  if (!row) throw new Error("Failed to create threshold rule");
  return row;
}

export async function updateThresholdRule(
  id: number,
  data: Partial<InsertThresholdAlertRule>
): Promise<ThresholdAlertRule | undefined> {
  const [row] = await db
    .update(thresholdAlertRules)
    .set(data)
    .where(eq(thresholdAlertRules.id, id))
    .returning();
  return row;
}

export async function deleteThresholdRule(id: number): Promise<boolean> {
  const result = await db.delete(thresholdAlertRules).where(eq(thresholdAlertRules.id, id));
  return (result.rowCount ?? 0) > 0;
}

/** Evaluate all active threshold rules and create alerts when triggered. Returns created alert count. */
export async function evaluateThresholdRules(): Promise<{ triggered: number; created: number }> {
  const rules = await db
    .select()
    .from(thresholdAlertRules)
    .where(eq(thresholdAlertRules.active, true));
  const allIndicators = await db.select().from(riskIndicators);
  const allIncidents = await db.select().from(incidents);

  let triggered = 0;
  let created = 0;

  for (const rule of rules) {
    const config = rule.triggerConfig as TriggerConfigIndicator | TriggerConfigIncidentCount;
    let fired = false;

    if (rule.triggerType === "indicator") {
      const c = config as TriggerConfigIndicator;
      const filtered = allIndicators.filter((i) => {
        if (c.indicatorId != null && i.id !== c.indicatorId) return false;
        if (c.region && (i.region || "").toLowerCase() !== c.region.toLowerCase()) return false;
        return (i.value ?? 0) >= (c.minValue ?? 0);
      });
      fired = filtered.length > 0;
    } else if (rule.triggerType === "incident_count") {
      const c = config as TriggerConfigIncidentCount;
      const since = new Date();
      since.setDate(since.getDate() - (c.withinDays ?? 7));
      const filtered = allIncidents.filter((i) => {
        if (new Date(i.reportedAt) < since) return false;
        if (c.region && (i.region || "").toLowerCase() !== c.region.toLowerCase()) return false;
        return true;
      });
      fired = filtered.length >= (c.count ?? 0);
    }

    if (fired) {
      triggered++;
      const message =
        typeof rule.messageTemplate === "string"
          ? rule.messageTemplate
          : "Threshold condition met.";
      const [newAlert] = await db
        .insert(alerts)
        .values({
          title: rule.name,
          message,
          severity: (rule.severity as "low" | "medium" | "high" | "critical") || "high",
          status: "active",
          source: "threshold_rule",
          metadata: { thresholdRuleId: rule.id },
        })
        .returning();
      if (newAlert) created++;
    }
  }

  return { triggered, created };
}

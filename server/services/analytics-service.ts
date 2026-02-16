/**
 * Analytics Service - Crisis analytics and reporting system
 */
import { db } from "../db";
import { incidents, alerts, accessLogs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface CrisisStats {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
  resolutionRate: number;
}

export async function getCrisisStatistics(startDate?: Date, endDate?: Date): Promise<CrisisStats> {
  const allIncidents = await db.select().from(incidents);
  const filtered = allIncidents.filter((i) => {
    const d = new Date(i.reportedAt).getTime();
    if (startDate && d < startDate.getTime()) return false;
    if (endDate && d > endDate.getTime()) return false;
    return true;
  });

  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRegion: Record<string, number> = {};

  for (const i of filtered) {
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    byRegion[i.region] = (byRegion[i.region] || 0) + 1;
  }

  const active = filtered.filter((i) => i.status === "active").length;
  const resolved = filtered.filter((i) => i.status === "resolved").length;

  return {
    total: filtered.length,
    active,
    resolved,
    bySeverity,
    byCategory,
    byRegion,
    resolutionRate: filtered.length ? Math.round((resolved / filtered.length) * 100) : 0,
  };
}

export async function getResponseTimeMetrics(): Promise<{ avgHours: number; count: number }> {
  const allAlerts = await db.select().from(alerts);
  const activeAlerts = allAlerts.filter((a) => a.status === "active");
  const acknowledged = allAlerts.filter((a) => a.acknowledgedAt != null);

  let avgHours = 0;
  if (acknowledged.length > 0) {
    const totalMs = acknowledged.reduce((sum, a) => {
      const gen = new Date(a.generatedAt).getTime();
      const ack = new Date(a.acknowledgedAt!).getTime();
      return sum + (ack - gen);
    }, 0);
    avgHours = Math.round(totalMs / acknowledged.length / (1000 * 60 * 60) * 10) / 10;
  }

  return {
    avgHours,
    count: activeAlerts.length,
  };
}

/**
 * Enterprise Analytics - KPIs, trends, and regional heat map data for EWER
 */
import { db } from "../db";
import { incidents, alerts, riskIndicators } from "@shared/schema";
import { eq, gte, desc, sql } from "drizzle-orm";

export interface ExecutiveKpis {
  totalIncidents: number;
  activeIncidents: number;
  criticalAlerts: number;
  resolutionRate: number;
  avgResponseTimeHours: number;
  highRiskZones: number;
}

export async function getExecutiveKpis(): Promise<ExecutiveKpis> {
  const allIncidents = await db.select().from(incidents);
  const allAlerts = await db.select().from(alerts);

  const activeAlerts = allAlerts.filter((a) => a.status === "active");
  const criticalAlerts = activeAlerts.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  ).length;

  const resolved = allIncidents.filter((i) => i.status === "resolved").length;
  const resolutionRate =
    allIncidents.length > 0 ? Math.round((resolved / allIncidents.length) * 100) : 0;

  let avgResponseTimeHours = 0;
  const acknowledged = allAlerts.filter((a) => a.acknowledgedAt != null);
  if (acknowledged.length > 0) {
    const totalMs = acknowledged.reduce((sum, a) => {
      const gen = new Date(a.generatedAt).getTime();
      const ack = new Date(a.acknowledgedAt!).getTime();
      return sum + (ack - gen);
    }, 0);
    avgResponseTimeHours = Math.round((totalMs / acknowledged.length) / (1000 * 60 * 60) * 10) / 10;
  }

  const highRiskIndicators = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(riskIndicators)
    .where(gte(riskIndicators.value, 70));

  return {
    totalIncidents: allIncidents.length,
    activeIncidents: allIncidents.filter((i) => i.status === "active").length,
    criticalAlerts,
    resolutionRate,
    avgResponseTimeHours,
    highRiskZones: highRiskIndicators[0]?.count ?? 0,
  };
}

export interface RegionalHeatMap {
  region: string;
  state?: string;
  incidentCount: number;
  activeCount: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export async function getRegionalHeatMap(): Promise<RegionalHeatMap[]> {
  const allIncidents = await db.select().from(incidents);
  const byRegion = new Map<string, { total: number; active: number }>();

  for (const i of allIncidents) {
    const key = i.state ? `${i.region}|${i.state}` : i.region;
    const current = byRegion.get(key) || { total: 0, active: 0 };
    current.total++;
    if (i.status === "active") current.active++;
    byRegion.set(key, current);
  }

  return Array.from(byRegion.entries()).map(([key, counts]) => {
    const [region, state] = key.split("|");
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (counts.active >= 5 || counts.total >= 5) riskLevel = "critical";
    else if (counts.active >= 2 || counts.total >= 3) riskLevel = "high";
    else if (counts.active >= 1 || counts.total >= 2) riskLevel = "medium";

    return {
      region: region || "Unknown",
      state: state || undefined,
      incidentCount: counts.total,
      activeCount: counts.active,
      riskLevel,
    };
  });
}

export interface TrendDataPoint {
  date: string;
  incidents: number;
  resolved: number;
  alerts: number;
}

export async function getTrendData(days: number = 30): Promise<TrendDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const allIncidents = await db.select().from(incidents);
  const allAlerts = await db.select().from(alerts);

  const byDate = new Map<string, { incidents: number; resolved: number; alerts: number }>();

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().split("T")[0];
    byDate.set(key, { incidents: 0, resolved: 0, alerts: 0 });
  }

  for (const i of allIncidents) {
    const key = new Date(i.reportedAt).toISOString().split("T")[0];
    const entry = byDate.get(key);
    if (entry) {
      entry.incidents++;
      if (i.status === "resolved") entry.resolved++;
    }
  }

  for (const a of allAlerts) {
    const key = new Date(a.generatedAt).toISOString().split("T")[0];
    const entry = byDate.get(key);
    if (entry) entry.alerts++;
  }

  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({ date, ...data }));
}

export interface VulnerabilityResiliencePoint {
  region: string;
  state?: string;
  vulnerabilityScore: number; // 0-100, higher = more vulnerable
  resilienceScore: number;   // 0-100, higher = more resilient
  riskLevel: "low" | "medium" | "high" | "critical";
  incidentCount: number;
  activeCount: number;
  resolvedCount: number;
  avgIndicatorValue: number;
  resolutionRate: number;
}

export async function getVulnerabilityResilienceMap(): Promise<VulnerabilityResiliencePoint[]> {
  const allIncidents = await db.select().from(incidents);
  const allIndicators = await db.select().from(riskIndicators);

  const regions = new Set<string>();
  allIncidents.forEach((i) => regions.add(i.region || "Unknown"));

  const defaultRegions = [
    "North East", "North West", "North Central",
    "South East", "South South", "South West",
  ];
  defaultRegions.forEach((r) => regions.add(r));

  const result: VulnerabilityResiliencePoint[] = [];

  for (const region of regions) {
    const regionIncidents = allIncidents.filter((i) => (i.region || "") === region);
    const regionIndicators = allIndicators.filter((r) => (r.region || "") === region);
    const total = regionIncidents.length;
    const active = regionIncidents.filter((i) => i.status === "active").length;
    const resolved = regionIncidents.filter((i) => i.status === "resolved").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    const avgIndicatorValue =
      regionIndicators.length > 0
        ? Math.round(
            regionIndicators.reduce((s, i) => s + (i.value ?? 0), 0) / regionIndicators.length
          )
        : 0;

    const severityWeight = (s: string) =>
      s === "critical" ? 4 : s === "high" ? 3 : s === "medium" ? 2 : 1;
    const weighted =
      regionIncidents.length > 0
        ? regionIncidents.reduce((s, i) => s + severityWeight(i.severity), 0) / regionIncidents.length
        : 0;
    const vulnerabilityScore = Math.min(
      100,
      Math.round(weighted * 15 + avgIndicatorValue * 0.4 + active * 5)
    );
    const resilienceScore = Math.min(
      100,
      Math.max(0, 100 - vulnerabilityScore + (resolutionRate > 50 ? 10 : 0))
    );

    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (vulnerabilityScore >= 70) riskLevel = "critical";
    else if (vulnerabilityScore >= 50) riskLevel = "high";
    else if (vulnerabilityScore >= 30) riskLevel = "medium";

    result.push({
      region,
      incidentCount: total,
      activeCount: active,
      resolvedCount: resolved,
      avgIndicatorValue,
      resolutionRate,
      vulnerabilityScore,
      resilienceScore,
      riskLevel,
    });
  }

  return result.sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);
}

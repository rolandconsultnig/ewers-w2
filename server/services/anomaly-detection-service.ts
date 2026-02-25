import { storage } from "../storage";
import { db } from "../db";
import { incidentAnomalies, type IncidentAnomaly } from "@shared/schema";
import { logger } from "./logger";

export interface AnomalySummary {
  totalAnomalies: number;
  highSeverity: number;
  regions: string[];
}

export interface AnomalyDetectionResult {
  anomalies: IncidentAnomaly[];
  summary: AnomalySummary;
  generatedAt: Date;
}

export class AnomalyDetectionService {
  private static instance: AnomalyDetectionService;

  static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  async detectIncidentAnomalies(timeframeDays: number = 90, region?: string): Promise<AnomalyDetectionResult> {
    try {
      logger.info(
        `Starting anomaly detection over last ${timeframeDays} days${region ? ` for region ${region}` : ""}`
      );

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      const allIncidents = await storage.getIncidents();
      const incidents = allIncidents.filter((i) => {
        const d = new Date(i.reportedAt);
        if (d < startDate || d > endDate) return false;
        if (region && i.region !== region) return false;
        return true;
      });

      const dailyCounts = new Map<string, number>();
      incidents.forEach((i) => {
        const key = new Date(i.reportedAt).toISOString().split("T")[0];
        dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
      });

      const days = Array.from(dailyCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      if (days.length === 0) {
        return {
          anomalies: [],
          summary: { totalAnomalies: 0, highSeverity: 0, regions: region ? [region] : [] },
          generatedAt: new Date(),
        };
      }

      const counts = days.map(([, c]) => c);
      const mean = counts.reduce((s, c) => s + c, 0) / counts.length;
      const variance =
        counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / Math.max(1, counts.length - 1);
      const std = Math.sqrt(variance || 0.0001);

      const rowsToInsert: Omit<IncidentAnomaly, "id">[] = [];

      for (const [date, count] of days) {
        const z = (count - mean) / (std || 1);
        if (z <= 2 && count <= mean * 2) continue;

        let severity: "low" | "medium" | "high" | "critical" = "low";
        if (z >= 3 || count >= mean * 4) severity = "critical";
        else if (z >= 2.5 || count >= mean * 3) severity = "high";
        else if (z >= 2 || count >= mean * 2) severity = "medium";

        rowsToInsert.push({
          date: new Date(date),
          region: region || null,
          metric: "daily_incident_count",
          observed: count,
          expected: Math.round(mean),
          severity,
          description: `Daily incident count ${count} vs expected ~${mean.toFixed(
            1
          )} (z-score ${(z || 0).toFixed(2)})`,
          createdAt: new Date(),
        } as any);
      }

      let inserted: IncidentAnomaly[] = [];
      if (rowsToInsert.length > 0) {
        const res = await db.insert(incidentAnomalies).values(rowsToInsert).returning();
        inserted = res;
      }

      const highSeverity = inserted.filter((a) => a.severity === "high" || a.severity === "critical").length;
      const regions = region ? [region] : Array.from(new Set(allIncidents.map((i) => i.region).filter(Boolean))) as string[];

      return {
        anomalies: inserted,
        summary: {
          totalAnomalies: inserted.length,
          highSeverity,
          regions,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Anomaly detection failed", { error });
      throw new Error("Failed to detect anomalies");
    }
  }
}

export const anomalyDetectionService = AnomalyDetectionService.getInstance();


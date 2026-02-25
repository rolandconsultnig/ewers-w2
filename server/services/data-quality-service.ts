import { storage } from "../storage";
import { db } from "../db";
import { dataQualityIssues, type DataQualityIssue } from "@shared/schema";
import { logger } from "./logger";

export interface DataQualityScanSummary {
  totalIssues: number;
  highSeverity: number;
  byType: Record<string, number>;
}

export interface DataQualityScanResult {
  issues: DataQualityIssue[];
  summary: DataQualityScanSummary;
  generatedAt: Date;
}

const REQUIRED_INCIDENT_FIELDS: Array<keyof import("@shared/schema").Incident> = [
  "title",
  "description",
  "location",
  "region",
  "severity",
  "status",
];

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_STATUSES = new Set(["active", "resolved", "pending", "closed"]);

export class DataQualityService {
  private static instance: DataQualityService;

  static getInstance(): DataQualityService {
    if (!DataQualityService.instance) {
      DataQualityService.instance = new DataQualityService();
    }
    return DataQualityService.instance;
  }

  async scan(): Promise<DataQualityScanResult> {
    try {
      logger.info("Starting data quality scan");

      const incidents = await storage.getIncidents();
      const rows: Omit<DataQualityIssue, "id">[] = [];

      for (const incident of incidents) {
        for (const field of REQUIRED_INCIDENT_FIELDS) {
          const value = (incident as any)[field];
          if (value == null || value === "") {
            rows.push({
              entityType: "incident",
              entityId: incident.id,
              issueType: "missing_field",
              field,
              severity: "medium",
              message: `Incident is missing required field '${field}'.`,
              status: "open",
              metadata: null,
              createdAt: new Date(),
              resolvedAt: null,
            } as any);
          }
        }

        if (incident.severity && !VALID_SEVERITIES.has(incident.severity)) {
          rows.push({
            entityType: "incident",
            entityId: incident.id,
            issueType: "invalid_value",
            field: "severity",
            severity: "medium",
            message: `Invalid severity value '${incident.severity}'.`,
            status: "open",
            metadata: null,
            createdAt: new Date(),
            resolvedAt: null,
          } as any);
        }

        if (incident.status && !VALID_STATUSES.has(incident.status)) {
          rows.push({
            entityType: "incident",
            entityId: incident.id,
            issueType: "invalid_value",
            field: "status",
            severity: "medium",
            message: `Invalid status value '${incident.status}'.`,
            status: "open",
            metadata: null,
            createdAt: new Date(),
            resolvedAt: null,
          } as any);
        }

        const reportedAt = new Date(incident.reportedAt);
        const now = new Date();
        if (reportedAt.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
          rows.push({
            entityType: "incident",
            entityId: incident.id,
            issueType: "suspicious_date",
            field: "reportedAt",
            severity: "high",
            message: "Incident has a reportedAt date in the future.",
            status: "open",
            metadata: { reportedAt },
            createdAt: new Date(),
            resolvedAt: null,
          } as any);
        }
      }

      let inserted: DataQualityIssue[] = [];
      if (rows.length > 0) {
        const res = await db.insert(dataQualityIssues).values(rows).returning();
        inserted = res;
      }

      const byType: Record<string, number> = {};
      for (const issue of inserted) {
        byType[issue.issueType] = (byType[issue.issueType] || 0) + 1;
      }
      const highSeverity = inserted.filter((i) => i.severity === "high" || i.severity === "critical").length;

      return {
        issues: inserted,
        summary: {
          totalIssues: inserted.length,
          highSeverity,
          byType,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Data quality scan failed", { error });
      throw new Error("Failed to run data quality scan");
    }
  }
}

export const dataQualityService = DataQualityService.getInstance();


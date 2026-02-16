/**
 * System Health Monitor - Enterprise service status and uptime
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  message?: string;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "down";
  services: ServiceStatus[];
  timestamp: string;
  version: string;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const services: ServiceStatus[] = [];
  const start = Date.now();

  try {
    await db.execute(sql`SELECT 1`);
    services.push({
      name: "Database",
      status: "healthy",
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    logger.error("Database health check failed", { error: err });
    services.push({
      name: "Database",
      status: "down",
      message: err instanceof Error ? err.message : "Connection failed",
    });
  }

  const hasDown = services.some((s) => s.status === "down");
  const hasDegraded = services.some((s) => s.status === "degraded");

  return {
    overall: hasDown ? "down" : hasDegraded ? "degraded" : "healthy",
    services,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };
}

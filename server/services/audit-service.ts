/**
 * Audit Service - Complete activity logging and audit trail
 */
import { db } from "../db";
import { accessLogs } from "@shared/schema";
import type { Request } from "express";

export type AuditAction = "login" | "logout" | "view" | "create" | "update" | "delete";
export type AuditResource =
  | "user"
  | "incident"
  | "alert"
  | "crisis"
  | "report"
  | "settings"
  | "api_key"
  | "webhook"
  | "case"
  | "case_note";

export interface AuditEntry {
  userId: number;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  successful?: boolean;
  details?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(accessLogs).values({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      successful: entry.successful ?? true,
      details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : undefined,
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}

export function getClientInfo(req: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress;
  const userAgent = req.headers["user-agent"];
  return { ipAddress, userAgent };
}

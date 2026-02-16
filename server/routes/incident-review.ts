/**
 * Incident Review Routes
 * Allows standard users to review, accept, or discard sourced incidents
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { db } from "../db";
import { incidents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import * as auditService from "../services/audit-service";

export function setupIncidentReviewRoutes(app: Router, storage: IStorage) {
  
  // Get pending incidents for review (sourced from automated systems)
  app.get("/api/incidents/pending-review", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const state = typeof req.query.state === "string" ? req.query.state : undefined;
      const lga = typeof req.query.lga === "string" ? req.query.lga : undefined;
      const reportingMethod = typeof req.query.reportingMethod === "string" ? req.query.reportingMethod : undefined;

      const conditions = [
        eq(incidents.status, "pending"),
        eq(incidents.verificationStatus, "unverified"),
      ] as any[];

      if (state) conditions.push(eq(incidents.state, state));
      if (lga) conditions.push(eq(incidents.lga, lga));
      if (reportingMethod) conditions.push(eq(incidents.reportingMethod, reportingMethod));

      const pendingIncidents = await db
        .select()
        .from(incidents)
        .where(and(...conditions));

      res.json(pendingIncidents);
    } catch (error) {
      console.error("Error fetching pending incidents:", error);
      res.status(500).json({ error: "Failed to fetch pending incidents" });
    }
  });

  // Accept a sourced incident (approve and publish)
  app.post("/api/incidents/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    const incidentId = parseInt(req.params.id);

    try {
      const incident = await storage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      // Update incident to accepted status
      const updated = await storage.updateIncident(incidentId, {
        status: "active",
        verificationStatus: "verified",
      });

      // Log audit
      await auditService.logAudit(req, {
        userId: user.id,
        action: "incident_accepted",
        resource: "incident",
        resourceId: incidentId.toString(),
        details: JSON.stringify({ incidentTitle: incident.title }),
      });

      res.json({
        message: "Incident accepted and published",
        incident: updated,
      });
    } catch (error) {
      console.error("Error accepting incident:", error);
      res.status(500).json({ error: "Failed to accept incident" });
    }
  });

  // Discard a sourced incident (reject)
  app.post("/api/incidents/:id/discard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    const incidentId = parseInt(req.params.id);
    const { reason } = req.body;

    try {
      const incident = await storage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      // Update incident to rejected status
      const updated = await storage.updateIncident(incidentId, {
        status: "rejected",
        verificationStatus: "rejected",
      });

      // Log audit
      await auditService.logAudit(req, {
        userId: user.id,
        action: "incident_discarded",
        resource: "incident",
        resourceId: incidentId.toString(),
        details: JSON.stringify({ 
          incidentTitle: incident.title,
          reason: reason || "No reason provided"
        }),
      });

      res.json({
        message: "Incident discarded",
        incident: updated,
      });
    } catch (error) {
      console.error("Error discarding incident:", error);
      res.status(500).json({ error: "Failed to discard incident" });
    }
  });

  // Batch accept multiple incidents
  app.post("/api/incidents/batch-accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    const { incidentIds } = req.body;

    if (!Array.isArray(incidentIds) || incidentIds.length === 0) {
      return res.status(400).json({ error: "Invalid incident IDs" });
    }

    try {
      const accepted = [];
      for (const id of incidentIds) {
        const updated = await storage.updateIncident(id, {
          status: "active",
          verificationStatus: "verified",
        });
        accepted.push(updated);
      }

      await auditService.logAudit(req, {
        userId: user.id,
        action: "incidents_batch_accepted",
        resource: "incident",
        resourceId: "batch",
        details: JSON.stringify({ count: accepted.length, incidentIds }),
      });

      res.json({
        message: `${accepted.length} incidents accepted`,
        incidents: accepted,
      });
    } catch (error) {
      console.error("Error batch accepting incidents:", error);
      res.status(500).json({ error: "Failed to batch accept incidents" });
    }
  });

  // Batch discard multiple incidents
  app.post("/api/incidents/batch-discard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    const { incidentIds, reason } = req.body;

    if (!Array.isArray(incidentIds) || incidentIds.length === 0) {
      return res.status(400).json({ error: "Invalid incident IDs" });
    }

    try {
      const discarded = [];
      for (const id of incidentIds) {
        const updated = await storage.updateIncident(id, {
          status: "rejected",
          verificationStatus: "rejected",
        });
        discarded.push(updated);
      }

      await auditService.logAudit(req, {
        userId: user.id,
        action: "incidents_batch_discarded",
        resource: "incident",
        resourceId: "batch",
        details: JSON.stringify({ 
          count: discarded.length, 
          incidentIds,
          reason: reason || "No reason provided"
        }),
      });

      res.json({
        message: `${discarded.length} incidents discarded`,
        incidents: discarded,
      });
    } catch (error) {
      console.error("Error batch discarding incidents:", error);
      res.status(500).json({ error: "Failed to batch discard incidents" });
    }
  });

  // Get incident review statistics
  app.get("/api/incidents/review-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const pending = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.status, "pending"),
            eq(incidents.verificationStatus, "unverified")
          )
        );

      const verified = await db
        .select()
        .from(incidents)
        .where(eq(incidents.verificationStatus, "verified"));

      const rejected = await db
        .select()
        .from(incidents)
        .where(eq(incidents.verificationStatus, "rejected"));

      res.json({
        pending: pending.length,
        verified: verified.length,
        rejected: rejected.length,
        total: pending.length + verified.length + rejected.length,
      });
    } catch (error) {
      console.error("Error fetching review stats:", error);
      res.status(500).json({ error: "Failed to fetch review stats" });
    }
  });
}

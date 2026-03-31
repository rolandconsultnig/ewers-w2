/**
 * Responder workflow API: incident comments, routing, and responder portal.
 * - GET/POST /api/incidents/:id/comments — discussion thread
 * - PUT /api/incidents/:id/route — supervisor/coordinator routing actions
 * - GET /api/responders/teams — list teams (optional filter by category)
 * - GET /api/responders/assignments — dispatched incidents/activities for portal
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { z } from "zod";

const routeActionSchema = z.object({
  action: z.enum(["send_to_supervisor", "forward_to_coordinator", "approve_and_dispatch", "send_back"]),
  proposedResponderType: z.enum(["kinetic", "non_kinetic", "mixed"]).optional(),
  finalResponderType: z.enum(["kinetic", "non_kinetic", "mixed"]).optional(),
  assignedResponderTeamId: z.number().int().positive().optional(),
  comment: z.string().optional(),
});

const commentSchema = z.object({ comment: z.string().min(1) });

const dispatchAgenciesSchema = z.object({
  agencies: z.array(z.string().min(1)).min(1),
  comment: z.string().optional(),
});

function isSupervisorOrAbove(user: SelectUser): boolean {
  return user.role === "admin" || (user as any).securityLevel >= 5;
}

function isCoordinatorOrAbove(user: SelectUser): boolean {
  return user.role === "admin" || user.role === "coordinator" || (user as any).securityLevel >= 6;
}

function requireResponder(req: any, res: any): { user: SelectUser; agency: string } | null {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return null;
  }
  const user = req.user as SelectUser;
  if (user.role !== "responder") {
    res.status(403).json({ error: "Responder access required" });
    return null;
  }
  const agency = ((user as any).responderAgency as string | null | undefined)?.trim() || "";
  if (!agency) {
    res.status(403).json({ error: "Responder agency is not set for this account" });
    return null;
  }
  return { user, agency };
}

/** Returns team IDs where user is in members (members is array of user ids or objects with id / userId) */
function getTeamIdsForUser(teams: { id: number; members: unknown }[], userId: number): number[] {
  return teams
    .filter((t) => {
      const m = t.members;
      if (Array.isArray(m)) {
        return m.some((x: unknown) => {
          if (typeof x === "number") return x === userId;
          const o = x as { id?: number; userId?: number };
          return o?.id === userId || o?.userId === userId;
        });
      }
      return false;
    })
    .map((t) => t.id);
}
export function setupResponderWorkflowRoutes(app: Router, storage: IStorage) {
  // ——— Actionable incident dispatches (coordinator/admin) ———
  app.post("/api/incidents/:id/dispatch-to-agencies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    if (!isCoordinatorOrAbove(user)) return res.status(403).json({ error: "Coordinator role required" });

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid incident id" });

    const parsed = dispatchAgenciesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });

    try {
      const incident = await storage.getIncident(id);
      if (!incident) return res.status(404).json({ error: "Incident not found" });

      const agencies = Array.from(new Set(parsed.data.agencies.map((a) => a.trim()).filter(Boolean)));
      if (!agencies.length) return res.status(400).json({ error: "At least one agency is required" });

      const rows = await storage.createIncidentDispatches(
        agencies.map((agency) => ({
          incidentId: id,
          agency,
          status: "sent",
          comment: parsed.data.comment?.trim() || undefined,
          dispatchedBy: user.id,
        }))
      );

      return res.status(201).json({ dispatches: rows });
    } catch (e) {
      console.error("Error dispatching incident to agencies:", e);
      return res.status(500).json({ error: "Failed to dispatch incident" });
    }
  });

  // ——— Comments ———
  app.get("/api/incidents/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid incident id" });
    try {
      const incident = await storage.getIncident(id);
      if (!incident) return res.status(404).json({ error: "Incident not found" });
      const discussions = await storage.getIncidentDiscussions(id);
      // Enrich with author names if you have getUser in storage
      const withAuthors = await Promise.all(
        discussions.map(async (d) => {
          const u = await storage.getUser(d.authorId);
          return { ...d, authorName: u?.username ?? `User ${d.authorId}` };
        })
      );
      res.json(withAuthors);
    } catch (e) {
      console.error("Error fetching incident comments:", e);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/incidents/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid incident id" });
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "comment is required", issues: parsed.error.issues });
    try {
      const incident = await storage.getIncident(id);
      if (!incident) return res.status(404).json({ error: "Incident not found" });
      const role = user.role === "admin" ? "coordinator" : user.role;
      const created = await storage.createIncidentDiscussion({
        incidentId: id,
        authorId: user.id,
        role,
        comment: parsed.data.comment,
      });
      res.status(201).json(created);
    } catch (e) {
      console.error("Error adding incident comment:", e);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // ——— Routing (supervisor / coordinator) ———
  app.put("/api/incidents/:id/route", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid incident id" });
    const parsed = routeActionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });

    try {
      const incident = await storage.getIncident(id);
      if (!incident) return res.status(404).json({ error: "Incident not found" });
      const status = (incident as any).processingStatus ?? "draft";
      const { action, proposedResponderType, finalResponderType, assignedResponderTeamId, comment } = parsed.data;

      if (comment) {
        const role = user.role === "admin" ? "coordinator" : user.role;
        await storage.createIncidentDiscussion({
          incidentId: id,
          authorId: user.id,
          role,
          comment,
        });
      }

      if (action === "send_to_supervisor") {
        if (status !== "under_analysis" && status !== "analysis_complete") {
          return res.status(400).json({ error: "Incident must be in analysis phase to send to supervisor" });
        }
        await storage.updateIncident(id, {
          processingStatus: "supervisor_review",
          proposedResponderType: proposedResponderType ?? undefined,
          supervisorId: user.id,
        } as any);
        return res.json({ message: "Sent to supervisor review", processingStatus: "supervisor_review" });
      }

      if (action === "forward_to_coordinator") {
        if (!isSupervisorOrAbove(user)) return res.status(403).json({ error: "Supervisor role required" });
        if (status !== "supervisor_review") {
          return res.status(400).json({ error: "Incident must be in supervisor review to forward" });
        }
        await storage.updateIncident(id, {
          processingStatus: "coordinator_review",
          proposedResponderType: proposedResponderType ?? (incident as any).proposedResponderType,
          coordinatorId: user.id,
        } as any);
        return res.json({ message: "Forwarded to coordinator", processingStatus: "coordinator_review" });
      }

      if (action === "approve_and_dispatch") {
        if (!isCoordinatorOrAbove(user)) return res.status(403).json({ error: "Coordinator role required" });
        if (status !== "coordinator_review") {
          return res.status(400).json({ error: "Incident must be in coordinator review to dispatch" });
        }
        const teamId = assignedResponderTeamId ?? (incident as any).assignedResponderTeamId;
        const respType = finalResponderType ?? (incident as any).proposedResponderType ?? "non_kinetic";
        if (!teamId) return res.status(400).json({ error: "assignedResponderTeamId or team assignment required" });

        await storage.updateIncident(id, {
          processingStatus: "dispatched",
          finalResponderType: respType,
          assignedResponderTeamId: teamId,
          routedAt: new Date(),
          coordinatorId: user.id,
        } as any);

        // Create a response activity for the assigned team
        await storage.createResponseActivity({
          title: `Response: ${incident.title}`,
          description: incident.description,
          status: "pending",
          incidentId: id,
          assignedTeamId: teamId,
          responseType: respType,
        } as any);

        // Create an actionable dispatch record for the assigned team's agency
        try {
          const team = await storage.getResponseTeam(teamId);
          const agency = (team as any)?.agency?.trim() || "other";
          await storage.createIncidentDispatches([
            {
              incidentId: id,
              agency,
              status: "sent",
              dispatchedBy: user.id,
            } as any,
          ]);
        } catch (e) {
          console.warn("Failed to create incident dispatch record:", e);
        }

        return res.json({
          message: "Approved and dispatched to responders",
          processingStatus: "dispatched",
          assignedResponderTeamId: teamId,
          responseType: respType,
        });
      }

      if (action === "send_back") {
        if (!isSupervisorOrAbove(user)) return res.status(403).json({ error: "Insufficient permissions" });
        const targetStatus = status === "coordinator_review" ? "supervisor_review" : "under_analysis";
        await storage.updateIncident(id, { processingStatus: targetStatus } as any);
        return res.json({ message: "Sent back", processingStatus: targetStatus });
      }

      return res.status(400).json({ error: "Unknown action" });
    } catch (e) {
      console.error("Error updating incident route:", e);
      res.status(500).json({ error: "Failed to update routing" });
    }
  });

  // ——— Responder portal: teams (for dropdowns and filters) ———
  app.get("/api/responders/teams", async (req, res) => {
    const ctx = requireResponder(req, res);
    if (!ctx) return;
    const category = typeof req.query.category === "string" ? req.query.category : null;
    const agencyQuery = typeof req.query.agency === "string" ? req.query.agency.trim() || null : null;
    const agency = agencyQuery ?? ctx.agency;
    const valid = category === "kinetic" || category === "non_kinetic" || category === null;
    if (!valid) return res.status(400).json({ error: "category must be kinetic, non_kinetic, or omitted" });
    try {
      let teams = await storage.getResponseTeamsByCategory(category);
      if (agency != null) {
        teams = teams.filter((t) => ((t as { agency?: string | null }).agency ?? "other") === agency);
      }
      res.json(teams);
    } catch (e) {
      console.error("Error fetching responder teams:", e);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // ——— Responder portal: assignments (dispatched incidents + activities for kinetic/non_kinetic) ———
  app.get("/api/responders/assignments", async (req, res) => {
    const ctx = requireResponder(req, res);
    if (!ctx) return;
    const user = ctx.user;
    const type = typeof req.query.type === "string" ? req.query.type : null;
    if (type !== "kinetic" && type !== "non_kinetic") {
      return res.status(400).json({ error: "query type must be kinetic or non_kinetic" });
    }
    try {
      const dispatches = await storage.getIncidentDispatchesForAgency(ctx.agency);
      const dispatchedIncidentIds = Array.from(new Set(dispatches.map((d) => d.incidentId)));
      const dispatched = await storage.getIncidentsByIds(dispatchedIncidentIds);
      const activities = await storage.getResponseActivitiesFiltered({ responseType: type });
      const teams = await storage.getResponseTeams();
      const myTeamIds = getTeamIdsForUser(teams, user.id);

      const byIncident = new Map<number, { incident: (typeof dispatched)[0]; activities: (typeof activities) }>();
      for (const inc of dispatched) {
        const incActivities = activities.filter((a) => a.incidentId === inc.id);
        const visible =
          incActivities.some((a) => a.assignedTo === user.id || (a.assignedTeamId != null && myTeamIds.includes(a.assignedTeamId)));
        if (visible) {
          byIncident.set(inc.id, {
            incident: inc,
            activities: incActivities,
          });
        }
      }
      const list = Array.from(byIncident.entries()).map(([incidentId, payload]) => ({
        incidentId,
        incident: payload.incident,
        activities: payload.activities,
      }));
      res.json(list);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("Error fetching responder assignments:", err.message, err.stack);
      res.status(500).json({
        error: "Failed to fetch assignments",
        ...(process.env.NODE_ENV !== "production" && { detail: err.message }),
      });
    }
  });
}

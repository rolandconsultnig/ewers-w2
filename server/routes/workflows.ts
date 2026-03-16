import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  entityType: z.string().min(1),
  activityType: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  stages: z.array(
    z.object({
      name: z.string().min(1),
      stageOrder: z.number().int().min(1),
      allowedRoles: z.array(z.string()).optional().nullable(),
    })
  ),
  transitions: z
    .array(
      z.object({
        fromStageOrder: z.number().int().min(1),
        toStageOrder: z.number().int().min(1),
        allowedRoles: z.array(z.string()).optional().nullable(),
      })
    )
    .optional()
    .nullable(),
});

const createInstanceSchema = z.object({
  templateId: z.number().int().positive(),
  entityType: z.string().min(1),
  entityId: z.number().int().positive(),
});

const moveInstanceSchema = z.object({
  toStageId: z.number().int().positive(),
  comment: z.string().optional().nullable(),
});

function requireAdmin(req: any, res: any): SelectUser | null {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const user = req.user as SelectUser;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

export function setupWorkflowRoutes(app: Router, storage: IStorage) {
  app.get("/api/workflows/templates", async (req, res) => {
    if (!req.isAuthenticated?.()) return res.sendStatus(401);
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const activityType = typeof req.query.activityType === "string" ? req.query.activityType : undefined;
    const templates = await storage.getWorkflowTemplates({ entityType, activityType });
    res.json(templates);
  });

  app.get("/api/workflows/templates/:id", async (req, res) => {
    if (!req.isAuthenticated?.()) return res.sendStatus(401);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const tpl = await storage.getWorkflowTemplate(id);
    if (!tpl) return res.status(404).json({ error: "Not found" });
    const stages = await storage.getWorkflowStages(id);
    const transitions = await storage.getWorkflowTransitions(id);
    res.json({ template: tpl, stages, transitions });
  });

  app.post("/api/workflows/templates", async (req, res) => {
    const user = requireAdmin(req, res);
    if (!user) return;
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });

    const created = await storage.createWorkflowTemplateWithGraph({
      template: {
        name: parsed.data.name,
        entityType: parsed.data.entityType,
        activityType: parsed.data.activityType ?? null,
        isActive: parsed.data.isActive ?? true,
        createdBy: user.id,
      },
      stages: parsed.data.stages,
      transitions:
        parsed.data.transitions && parsed.data.transitions.length > 0
          ? parsed.data.transitions
          : null,
    });

    res.status(201).json(created);
  });

  app.put("/api/workflows/templates/:id", async (req, res) => {
    const user = requireAdmin(req, res);
    if (!user) return;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });

    const updated = await storage.replaceWorkflowTemplateGraph(id, {
      template: {
        name: parsed.data.name,
        entityType: parsed.data.entityType,
        activityType: parsed.data.activityType ?? null,
        isActive: parsed.data.isActive ?? true,
      },
      stages: parsed.data.stages,
      transitions:
        parsed.data.transitions && parsed.data.transitions.length > 0
          ? parsed.data.transitions
          : null,
      updatedBy: user.id,
    });

    res.json(updated);
  });

  app.delete("/api/workflows/templates/:id", async (req, res) => {
    const user = requireAdmin(req, res);
    if (!user) return;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const ok = await storage.deleteWorkflowTemplate(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  app.post("/api/workflows/instances", async (req, res) => {
    if (!req.isAuthenticated?.()) return res.sendStatus(401);
    const parsed = createInstanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });

    const instance = await storage.createWorkflowInstanceForEntity(parsed.data);
    res.status(201).json(instance);
  });

  app.get("/api/workflows/instances/:entityType/:entityId", async (req, res) => {
    if (!req.isAuthenticated?.()) return res.sendStatus(401);
    const entityType = req.params.entityType;
    const entityId = parseInt(req.params.entityId, 10);
    if (Number.isNaN(entityId)) return res.status(400).json({ error: "Invalid entity id" });

    const payload = await storage.getWorkflowInstanceForEntity(entityType, entityId);
    if (!payload) return res.status(404).json({ error: "Not found" });
    res.json(payload);
  });

  app.post("/api/workflows/instances/:id/move", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const parsed = moveInstanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });

    try {
      const result = await storage.moveWorkflowInstance({
        instanceId: id,
        toStageId: parsed.data.toStageId,
        movedBy: user.id,
        movedByRole: user.role,
        comment: parsed.data.comment ?? null,
      });
      res.json(result);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = err.message || "Failed";
      const status = msg.toLowerCase().includes("forbidden") ? 403 : msg.toLowerCase().includes("invalid") ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });
}

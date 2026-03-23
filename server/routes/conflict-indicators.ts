import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import {
  CONFLICT_INDICATORS_SETTING_CATEGORY,
  CONFLICT_INDICATORS_SETTING_KEY,
  DEFAULT_CONFLICT_INDICATOR_CONFIG,
  type ConflictIndicatorConfig,
} from "../services/conflict-nlp-service";

const router = Router();

const insertSchema = z.object({
  violence: z.array(z.string()),
  tension: z.array(z.string()),
  peace: z.array(z.string()),
  humanitarian: z.array(z.string()),
});

function normalizeIndicators(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
    .filter(Boolean);
}

function normalizeConfig(value: unknown): ConflictIndicatorConfig {
  const v = value as any;
  const defaults = DEFAULT_CONFLICT_INDICATOR_CONFIG;

  return {
    violence: v && "violence" in v ? normalizeIndicators(v.violence) : defaults.violence,
    tension: v && "tension" in v ? normalizeIndicators(v.tension) : defaults.tension,
    peace: v && "peace" in v ? normalizeIndicators(v.peace) : defaults.peace,
    humanitarian: v && "humanitarian" in v ? normalizeIndicators(v.humanitarian) : defaults.humanitarian,
  };
}

router.get("/conflict-indicators", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const currentUser = req.user as SelectUser;
  if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });

  const row = await storage.getSettingByKey(CONFLICT_INDICATORS_SETTING_CATEGORY, CONFLICT_INDICATORS_SETTING_KEY);
  const config = normalizeConfig(row?.value);
  res.json(config);
});

router.put("/conflict-indicators", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const currentUser = req.user as SelectUser;
  if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });

  const validated = insertSchema.parse(req.body);

  const normalized: ConflictIndicatorConfig = {
    violence: normalizeIndicators(validated.violence),
    tension: normalizeIndicators(validated.tension),
    peace: normalizeIndicators(validated.peace),
    humanitarian: normalizeIndicators(validated.humanitarian),
  };

  const existing = await storage.getSettingByKey(CONFLICT_INDICATORS_SETTING_CATEGORY, CONFLICT_INDICATORS_SETTING_KEY);
  if (existing) {
    const updated = await storage.updateSetting(existing.id, {
      value: normalized,
      description: "Configurable conflict indicators (violence, tension, peace, humanitarian)",
      updatedBy: currentUser.id,
    });
    res.json(updated.value as ConflictIndicatorConfig);
    return;
  }

  const created = await storage.createSetting({
    category: CONFLICT_INDICATORS_SETTING_CATEGORY,
    key: CONFLICT_INDICATORS_SETTING_KEY,
    value: normalized,
    description: "Configurable conflict indicators (violence, tension, peace, humanitarian)",
    updatedBy: currentUser.id,
  });

  res.status(201).json(created.value as ConflictIndicatorConfig);
});

export function setupConflictIndicatorRoutes(app: any) {
  app.use("/api", router);
}


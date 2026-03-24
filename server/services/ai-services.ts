/**
 * AI Services - OpenAI / DeepSeek integration for crisis analysis and recommendations
 * Supports OpenAI (gpt-4o-mini) or DeepSeek (deepseek-chat) via OpenAI-compatible API
 */
import OpenAI from "openai";
import { db } from "../db";
import { incidents, riskIndicators } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "./logger";

// Prefer DeepSeek if key is set; otherwise use OpenAI
const deepseekKey = process.env.DEEPSEEK_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const openai =
  deepseekKey
    ? new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com",
      })
    : openaiKey
      ? new OpenAI({ apiKey: openaiKey })
      : null;

const MODEL = deepseekKey ? (process.env.AI_MODEL || "deepseek-chat") : (process.env.OPENAI_MODEL || "gpt-4o-mini");

const SYSTEM_PROMPT = `You are an expert crisis analyst for the IPCR (Institute for Peace and Conflict Resolution) Early Warning System in Nigeria. 
Analyze incidents and risk indicators to provide:
1. Severity assessment (low/medium/high/critical)
2. Likelihood of escalation (unlikely/possible/likely/very_likely)
3. Impact assessment (minimal/moderate/significant/severe)
4. Actionable recommendations
5. Pattern recognition across incidents
Be concise, data-driven, and focus on conflict prevention and peacebuilding.`;

export interface CrisisAnalysisResult {
  success: boolean;
  data?: {
    title: string;
    description: string;
    analysis: string;
    severity: string;
    likelihood: string;
    impact: string;
    recommendations: string;
    timeframe: string;
    patterns?: string;
  };
  message?: string;
}

export interface ConflictForecastResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/** Match UI region slugs (north-east) to DB labels (North East, North East Nigeria). */
function normalizeRegionKey(s: string): string {
  return s.trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
}

function regionMatches(stored: string | null | undefined, input: string): boolean {
  if (!input?.trim()) return true;
  if (!stored?.trim()) return false;
  const a = normalizeRegionKey(stored);
  const b = normalizeRegionKey(input);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const ca = a.replace(/\s/g, "");
  const cb = b.replace(/\s/g, "");
  return ca === cb;
}

async function loadIncidentsForForecast(regionFilter: string | undefined) {
  const rows = await db
    .select()
    .from(incidents)
    .where(eq(incidents.status, "active"))
    .orderBy(desc(incidents.reportedAt))
    .limit(200);
  if (!regionFilter?.trim()) return rows.slice(0, 25);
  const filtered = rows.filter((i) => regionMatches(i.region, regionFilter));
  return (filtered.length > 0 ? filtered : rows).slice(0, 25);
}

async function loadIndicatorsForForecast(regionFilter: string | undefined) {
  const rows = await db.select().from(riskIndicators).orderBy(desc(riskIndicators.value)).limit(200);
  if (!regionFilter?.trim()) return rows.slice(0, 25);
  const filtered = rows.filter((r) => regionMatches(r.region, regionFilter));
  return (filtered.length > 0 ? filtered : rows).slice(0, 25);
}

export async function generateConflictForecast(
  region: string,
  timelineDays: number,
  startDateISO?: string
): Promise<ConflictForecastResult> {
  const days = Number.isFinite(timelineDays) && timelineDays > 0 ? timelineDays : 30;
  const startDate = startDateISO || new Date().toISOString();

  const activeIncidents = await loadIncidentsForForecast(region?.trim() || undefined);
  const indicators = await loadIndicatorsForForecast(region?.trim() || undefined);

  const buildFallback = (): ConflictForecastResult => {
    const severityCounts = activeIncidents.reduce<Record<string, number>>((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {});

    const topIndicator = indicators[0];
    const vol = activeIncidents.length;

    return {
      success: true,
      data: {
        summary: {
          region: region || "Nigeria",
          startDate,
          timelineDays: days,
          incidentCount: vol,
          severityCounts,
          riskLevel: vol >= 8 ? "high" : vol >= 3 ? "medium" : "low",
          confidence: Math.min(92, 55 + Math.min(30, vol * 3)),
          rationale: `Heuristic forecast from ${vol} recent active incident(s) in scope and top risk indicators.`,
          topRiskIndicator: topIndicator
            ? { name: topIndicator.name, value: topIndicator.value, category: topIndicator.category }
            : null,
        },
        predictedEvents: [
          {
            type: "Community tensions & competition",
            severity: vol >= 6 ? "high" : vol >= 2 ? "medium" : "low",
            locationHint: activeIncidents[0]?.state || activeIncidents[0]?.region || region || "Regional",
            windowDays: Math.min(14, days),
            probability: Math.min(90, 50 + vol * 4),
            rationale: "Derived from recent active incident density and indicator stress in the selected area.",
          },
          ...(vol >= 3
            ? [
                {
                  type: "Security / infrastructure pressure",
                  severity: "medium" as const,
                  locationHint: activeIncidents[1]?.state || activeIncidents[0]?.region || region || "Regional",
                  windowDays: Math.min(21, days),
                  probability: Math.min(85, 40 + vol * 3),
                  rationale: "Elevated incident flow suggests sustained pressure on stability and services.",
                },
              ]
            : []),
        ],
        contributingFactors: indicators.slice(0, 6).map((r) => ({
          factor: r.name,
          weight: Math.min(100, Math.max(0, Number(r.value) || 0)),
          category: r.category,
          rationale: r.category ? `Indicator category: ${r.category}` : undefined,
        })),
        generatedBy: "fallback",
      },
    };
  };

  if (!openai) return buildFallback();

  try {
    const context = {
      region: region || "Nigeria",
      startDate,
      timelineDays: days,
      incidents: activeIncidents.map((i) => ({
        title: i.title,
        description: i.description,
        severity: i.severity,
        category: i.category,
        location: i.location,
        state: i.state,
        lga: i.lga,
        region: i.region,
        reportedAt: i.reportedAt,
      })),
      riskIndicators: indicators.map((r) => ({
        name: r.name,
        value: r.value,
        category: r.category,
        region: r.region,
        trend: r.trend,
        timestamp: r.timestamp,
      })),
    };

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert conflict forecaster for Nigeria. Use the provided context to forecast likely conflict events. Respond with valid JSON only.",
        },
        {
          role: "user",
          content:
            `Generate a conflict forecast for the next ${days} days starting ${startDate}.\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nReturn JSON with: summary (riskLevel as low|medium|high|critical, confidence as number 0-100, rationale string), predictedEvents (array of objects: type, severity as low|medium|high|critical, locationHint string, windowDays number, probability number 0-100, rationale string), contributingFactors (array: factor string, weight number 0-100, rationale string).`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildFallback();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return buildFallback();
    }

    return { success: true, data: { ...parsed, generatedBy: deepseekKey ? "deepseek" : "openai" } };
  } catch (err) {
    logger.error("Conflict forecast failed", { error: err });
    return buildFallback();
  }
}

export async function analyzeCrisisWithGPT(
  region: string,
  location?: string
): Promise<CrisisAnalysisResult> {
  try {
    const activeIncidentConditions = [eq(incidents.status, "active")];
    if (region) activeIncidentConditions.push(eq(incidents.region, region));
    if (location) activeIncidentConditions.push(eq(incidents.location, location));

    let activeIncidents = await db
      .select()
      .from(incidents)
      .where(and(...activeIncidentConditions))
      .orderBy(desc(incidents.severity))
      .limit(10);

    if (activeIncidents.length === 0 && region) {
      activeIncidents = await db
        .select()
        .from(incidents)
        .where(eq(incidents.status, "active"))
        .orderBy(desc(incidents.severity))
        .limit(10);
    }

    const indicatorConditions = [];
    if (region) indicatorConditions.push(eq(riskIndicators.region, region));
    if (location) indicatorConditions.push(eq(riskIndicators.location, location));

    let indicators = indicatorConditions.length
      ? await db
          .select()
          .from(riskIndicators)
          .where(and(...indicatorConditions))
          .orderBy(desc(riskIndicators.value))
          .limit(10)
      : await db.select().from(riskIndicators).orderBy(desc(riskIndicators.value)).limit(10);

    if (indicators.length === 0 && region) {
      indicators = await db.select().from(riskIndicators).orderBy(desc(riskIndicators.value)).limit(10);
    }

    const context = {
      region,
      location: location || region,
      incidents: activeIncidents.map((i) => ({
        title: i.title,
        description: i.description,
        severity: i.severity,
        category: i.category,
        location: i.location,
        impactedPopulation: i.impactedPopulation,
      })),
      riskIndicators: indicators.map((r) => ({
        name: r.name,
        value: r.value,
        category: r.category,
        trend: r.trend,
      })),
    };

    if (!openai) {
      return {
        success: true,
        data: {
          title: `Crisis Analysis: ${region || "Nigeria"}`,
          description: `Summary based on recent incidents and risk indicators.`,
          analysis: `Active incidents analyzed: ${activeIncidents.length}. Risk indicators analyzed: ${indicators.length}.`,
          severity: activeIncidents.some((i) => i.severity === "critical") ? "critical" : activeIncidents.some((i) => i.severity === "high") ? "high" : "medium",
          likelihood: activeIncidents.length >= 5 ? "likely" : activeIncidents.length >= 2 ? "possible" : "unlikely",
          impact: activeIncidents.length >= 5 ? "significant" : activeIncidents.length >= 2 ? "moderate" : "minimal",
          recommendations: "Increase monitoring, validate reports, engage local stakeholders, and pre-position response resources.",
          timeframe: "short_term",
        },
      };
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this crisis situation in ${region}${location ? `, ${location}` : ""}:\n\n${JSON.stringify(context, null, 2)}\n\nProvide: title, description, analysis, severity, likelihood, impact, recommendations, timeframe, and patterns (if any). Respond with valid JSON only.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { success: false, message: "No response from AI" };
    }

    const parsed = JSON.parse(content) as Record<string, string>;
    return {
      success: true,
      data: {
        title: parsed.title || `Crisis Analysis: ${region}`,
        description: parsed.description || "",
        analysis: parsed.analysis || "",
        severity: parsed.severity || "medium",
        likelihood: parsed.likelihood || "possible",
        impact: parsed.impact || "moderate",
        recommendations: parsed.recommendations || "",
        timeframe: parsed.timeframe || "short_term",
        patterns: parsed.patterns,
        region,
        location: location || region,
        createdBy: 1,
      },
    };
  } catch (err) {
    logger.error("OpenAI analysis failed", { error: err });
    return {
      success: false,
      message: err instanceof Error ? err.message : "AI analysis failed",
    };
  }
}

/** Parse AI text into structured recommendation items (numbered or bulleted) */
function parseRecommendations(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const lines = text
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[\d.)\-\*•]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [text.trim()].filter(Boolean);
}

export async function getIncidentRecommendations(incidentId: number): Promise<{
  success: boolean;
  recommendations?: string[];
  message?: string;
}> {
  if (!openai) {
    return { success: false, message: "AI not configured (set DEEPSEEK_API_KEY or OPENAI_API_KEY)" };
  }

  try {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId));

    if (!incident) {
      return { success: false, message: "Incident not found" };
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Incident: ${incident.title}\nDescription: ${incident.description}\nLocation: ${incident.location}, ${incident.region}\nSeverity: ${incident.severity}\nCategory: ${incident.category}\n\nProvide 3-5 specific, actionable recommendations. Use numbered or bulleted format, one per line. Be concise.`,
        },
      ],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content;
    const items = content ? parseRecommendations(content) : [];
    return {
      success: !!content,
      recommendations: items.length > 0 ? items : (content ? [content] : undefined),
      message: content ? undefined : "No recommendations generated",
    };
  } catch (err) {
    logger.error("OpenAI recommendations failed", { error: err });
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to generate recommendations",
    };
  }
}

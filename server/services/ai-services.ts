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

export async function generateConflictForecast(
  region: string,
  timelineDays: number,
  startDateISO?: string
): Promise<ConflictForecastResult> {
  const days = Number.isFinite(timelineDays) && timelineDays > 0 ? timelineDays : 30;
  const startDate = startDateISO || new Date().toISOString();

  try {
    const activeIncidentConditions = [eq(incidents.status, "active")];
    if (region) activeIncidentConditions.push(eq(incidents.region, region));

    let activeIncidents = await db
      .select()
      .from(incidents)
      .where(and(...activeIncidentConditions))
      .orderBy(desc(incidents.reportedAt))
      .limit(25);

    if (activeIncidents.length === 0 && region) {
      activeIncidents = await db
        .select()
        .from(incidents)
        .where(eq(incidents.status, "active"))
        .orderBy(desc(incidents.reportedAt))
        .limit(25);
    }

    const indicatorConditions = [];
    if (region) indicatorConditions.push(eq(riskIndicators.region, region));

    let indicators = indicatorConditions.length
      ? await db
          .select()
          .from(riskIndicators)
          .where(and(...indicatorConditions))
          .orderBy(desc(riskIndicators.value))
          .limit(25)
      : await db.select().from(riskIndicators).orderBy(desc(riskIndicators.value)).limit(25);

    if (indicators.length === 0 && region) {
      indicators = await db.select().from(riskIndicators).orderBy(desc(riskIndicators.value)).limit(25);
    }

    const fallback = (): ConflictForecastResult => {
      const severityCounts = activeIncidents.reduce<Record<string, number>>((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
      }, {});

      const topIndicator = indicators[0];

      return {
        success: true,
        data: {
          summary: {
            region: region || "Nigeria",
            startDate,
            timelineDays: days,
            incidentCount: activeIncidents.length,
            severityCounts,
            topRiskIndicator: topIndicator
              ? { name: topIndicator.name, value: topIndicator.value, category: topIndicator.category }
              : null,
          },
          predictedEvents: [
            {
              type: "Community Tensions",
              severity: activeIncidents.length >= 5 ? "high" : "medium",
              windowDays: Math.min(14, days),
              rationale: "Heuristic forecast based on recent incident volume and indicator levels.",
            },
          ],
          contributingFactors: indicators.slice(0, 5).map((r) => ({
            factor: r.name,
            weight: Math.min(100, Math.max(0, r.value)),
            category: r.category,
          })),
          generatedBy: "fallback",
        },
      };
    };

    if (!openai) return fallback();

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
        reportedAt: i.reportedAt,
      })),
      riskIndicators: indicators.map((r) => ({
        name: r.name,
        value: r.value,
        category: r.category,
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
            `Generate a conflict forecast for the next ${days} days starting ${startDate}.\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nReturn JSON with: summary (riskLevel, confidence, rationale), predictedEvents (array: type, severity, locationHint, windowDays, probability, rationale), contributingFactors (array: factor, weight, rationale).`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { success: false, message: "No response from AI" };
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return { success: true, data: { ...parsed, generatedBy: deepseekKey ? "deepseek" : "openai" } };
  } catch (err) {
    logger.error("Conflict forecast failed", { error: err });
    return { success: false, message: err instanceof Error ? err.message : "Forecast failed" };
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

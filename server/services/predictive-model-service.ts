import { db } from "../db";
import { incidents, predictiveOutputs } from "@shared/schema";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";

export type ConflictType = string;

export interface RiskRankingParams {
  horizonDays: number;
  lookbackDays: number;
  minRows: number;
}

export interface RiskRankingRow {
  state: string;
  lga: string;
  conflictType: ConflictType;
  score: number;
  recentCount: number;
  previousCount: number;
  yearCount: number;
  severityMix: Record<string, number>;
}

export interface RiskRankingResult {
  horizonDays: number;
  lookbackDays: number;
  generatedAt: string;
  rows: RiskRankingRow[];
}

export interface MonthlyForecastParams {
  monthsBack: number;
  monthsForward: number;
  minRows: number;
}

export interface MonthlyForecastPoint {
  month: string; // YYYY-MM
  predicted: number;
  baseline: number;
  recentTrend: number;
}

export interface MonthlyForecastSeries {
  state: string;
  conflictType: ConflictType;
  history: Array<{ month: string; count: number }>;
  forecast: MonthlyForecastPoint[];
}

export interface MonthlyForecastResult {
  monthsBack: number;
  monthsForward: number;
  generatedAt: string;
  series: MonthlyForecastSeries[];
}

function safeKey(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function severityWeight(sev: string): number {
  const s = (sev || "").toLowerCase();
  if (s === "critical") return 4;
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

export class PredictiveModelService {
  private static instance: PredictiveModelService;

  static getInstance(): PredictiveModelService {
    if (!PredictiveModelService.instance) {
      PredictiveModelService.instance = new PredictiveModelService();
    }
    return PredictiveModelService.instance;
  }

  async runRiskRanking(params: Partial<RiskRankingParams> = {}) {
    const horizonDays = Number(params.horizonDays) > 0 ? Number(params.horizonDays) : 30;
    const lookbackDays = Number(params.lookbackDays) > 0 ? Number(params.lookbackDays) : 365;
    const minRows = Number(params.minRows) > 0 ? Number(params.minRows) : 20;

    const now = new Date();
    const recentStart = new Date(now.getTime() - horizonDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 2 * horizonDays * 24 * 60 * 60 * 1000);
    const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const rows = await db
      .select()
      .from(incidents)
      .where(
        and(
          gte(incidents.reportedAt, lookbackStart),
          isNotNull(incidents.state),
          isNotNull(incidents.lga),
          isNotNull(incidents.category),
        ),
      )
      .orderBy(desc(incidents.reportedAt));

    type Bucket = {
      state: string;
      lga: string;
      conflictType: ConflictType;
      recentCount: number;
      previousCount: number;
      yearCount: number;
      severityMix: Record<string, number>;
      severitySumRecent: number;
    };

    const buckets = new Map<string, Bucket>();

    for (const i of rows) {
      const state = safeKey(i.state);
      const lga = safeKey(i.lga);
      const conflictType = safeKey(i.category) || "unknown";
      if (!state || !lga) continue;

      const key = `${state}||${lga}||${conflictType}`;
      const b = buckets.get(key) || {
        state,
        lga,
        conflictType,
        recentCount: 0,
        previousCount: 0,
        yearCount: 0,
        severityMix: {},
        severitySumRecent: 0,
      };

      const t = new Date(i.reportedAt).getTime();

      b.yearCount += 1;

      if (t >= recentStart.getTime()) {
        b.recentCount += 1;
        b.severitySumRecent += severityWeight(i.severity);
      } else if (t >= previousStart.getTime()) {
        b.previousCount += 1;
      }

      const sevKey = safeKey(i.severity).toLowerCase() || "unknown";
      b.severityMix[sevKey] = (b.severityMix[sevKey] || 0) + 1;

      buckets.set(key, b);
    }

    const scored: RiskRankingRow[] = Array.from(buckets.values())
      .filter((b) => b.yearCount >= 1)
      .map((b) => {
        const delta = b.recentCount - b.previousCount;
        const trendBoost = delta > 0 ? delta * 8 : delta * 2;
        const volumeBoost = b.recentCount * 10;
        const baselineBoost = Math.min(50, b.yearCount * 0.6);
        const sevBoost = b.recentCount > 0 ? (b.severitySumRecent / b.recentCount) * 12 : 0;
        const score = Math.round(volumeBoost + trendBoost + baselineBoost + sevBoost);
        return {
          state: b.state,
          lga: b.lga,
          conflictType: b.conflictType,
          score,
          recentCount: b.recentCount,
          previousCount: b.previousCount,
          yearCount: b.yearCount,
          severityMix: b.severityMix,
        };
      })
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, Math.max(minRows, 50));

    const result: RiskRankingResult = {
      horizonDays,
      lookbackDays,
      generatedAt: new Date().toISOString(),
      rows: top,
    };

    const [saved] = await db
      .insert(predictiveOutputs)
      .values({
        kind: "risk_ranking_v1",
        region: "Nigeria",
        modelSource: "heuristic-v1",
        params: { horizonDays, lookbackDays, minRows },
        result,
      })
      .returning();

    return { result, saved: saved ?? null };
  }

  async runMonthlyForecast(params: Partial<MonthlyForecastParams> = {}) {
    const monthsBack = Number(params.monthsBack) > 0 ? Number(params.monthsBack) : 36;
    const monthsForward = Number(params.monthsForward) > 0 ? Number(params.monthsForward) : 12;
    const minRows = Number(params.minRows) > 0 ? Number(params.minRows) : 20;

    const now = new Date();
    const start = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -monthsBack);

    const rows = await db
      .select()
      .from(incidents)
      .where(and(gte(incidents.reportedAt, start), isNotNull(incidents.state), isNotNull(incidents.category)))
      .orderBy(desc(incidents.reportedAt));

    type SeriesBucket = {
      state: string;
      conflictType: ConflictType;
      counts: Map<string, number>;
    };

    const seriesMap = new Map<string, SeriesBucket>();

    for (const i of rows) {
      const state = safeKey(i.state);
      const conflictType = safeKey(i.category) || "unknown";
      if (!state) continue;
      const key = `${state}||${conflictType}`;
      const b = seriesMap.get(key) || { state, conflictType, counts: new Map<string, number>() };
      const mk = monthKey(new Date(i.reportedAt));
      b.counts.set(mk, (b.counts.get(mk) || 0) + 1);
      seriesMap.set(key, b);
    }

    const allSeries: MonthlyForecastSeries[] = [];

    for (const b of Array.from(seriesMap.values())) {
      const historyMonths: string[] = [];
      for (let i = monthsBack; i >= 0; i--) {
        historyMonths.push(monthKey(addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -i)));
      }

      const history = historyMonths.map((m) => ({ month: m, count: b.counts.get(m) || 0 }));
      const total = history.reduce((s, x) => s + x.count, 0);
      if (total === 0) continue;

      // recent trend: last 3 months vs prior 3 months
      const last3 = history.slice(-3).reduce((s, x) => s + x.count, 0);
      const prev3 = history.slice(-6, -3).reduce((s, x) => s + x.count, 0);
      const recentTrend = last3 - prev3;

      // baseline: average of last 6 months (non-seasonal)
      const last6 = history.slice(-6).map((x) => x.count);
      const baseline = last6.reduce((s, v) => s + v, 0) / Math.max(1, last6.length);

      const forecast: MonthlyForecastPoint[] = [];
      for (let f = 1; f <= monthsForward; f++) {
        const targetMonth = monthKey(addMonths(new Date(now.getFullYear(), now.getMonth(), 1), f));
        const trendAdj = recentTrend / 3;
        const predicted = Math.max(0, Math.round(baseline + trendAdj));
        forecast.push({ month: targetMonth, predicted, baseline: Math.round(baseline * 10) / 10, recentTrend });
      }

      allSeries.push({ state: b.state, conflictType: b.conflictType, history, forecast });
    }

    allSeries.sort((a, b) => {
      const at = a.history.slice(-6).reduce((s, x) => s + x.count, 0);
      const bt = b.history.slice(-6).reduce((s, x) => s + x.count, 0);
      return bt - at;
    });

    const selected = allSeries.slice(0, Math.max(minRows, 50));

    const result: MonthlyForecastResult = {
      monthsBack,
      monthsForward,
      generatedAt: new Date().toISOString(),
      series: selected,
    };

    const [saved] = await db
      .insert(predictiveOutputs)
      .values({
        kind: "monthly_forecast_v1",
        region: "Nigeria",
        modelSource: "heuristic-v1",
        params: { monthsBack, monthsForward, minRows },
        result,
      })
      .returning();

    return { result, saved: saved ?? null };
  }

  async getLatest(kind: string): Promise<{ id: number; generatedAt: Date; params: unknown; result: unknown } | null> {
    const [row] = await db
      .select({ id: predictiveOutputs.id, generatedAt: predictiveOutputs.generatedAt, params: predictiveOutputs.params, result: predictiveOutputs.result })
      .from(predictiveOutputs)
      .where(eq(predictiveOutputs.kind, kind))
      .orderBy(desc(predictiveOutputs.generatedAt))
      .limit(1);

    return row ? { id: row.id, generatedAt: row.generatedAt, params: row.params, result: row.result } : null;
  }
}

export const predictiveModelService = PredictiveModelService.getInstance();

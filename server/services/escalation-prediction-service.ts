import { db } from "../db";
import { incidents, riskIndicators, escalationPredictions, type EscalationPrediction } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface EscalationPredictionResult {
  prediction: {
    incidentId: number;
    region: string | null;
    currentSeverity: string;
    escalationRisk: "low" | "medium" | "high";
    probability: number; // 0-100
    timeWindowDays: number;
    keyDrivers: string[];
    recommendedActions: string[];
  };
  saved: EscalationPrediction | null;
}

function severityScore(severity: string | null | undefined): number {
  if (!severity) return 1;
  const s = severity.toLowerCase();
  if (s === "critical") return 4;
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

export class EscalationPredictionService {
  private static instance: EscalationPredictionService;

  static getInstance(): EscalationPredictionService {
    if (!EscalationPredictionService.instance) {
      EscalationPredictionService.instance = new EscalationPredictionService();
    }
    return EscalationPredictionService.instance;
  }

  async predictForIncident(incidentId: number): Promise<EscalationPredictionResult> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
    if (!incident) {
      throw new Error("Incident not found");
    }

    const region = incident.region ?? null;

    const indicatorConds = region ? [eq(riskIndicators.region, region)] : [];
    const indicators = indicatorConds.length
      ? await db
          .select()
          .from(riskIndicators)
          .where(and(...indicatorConds))
          .orderBy(desc(riskIndicators.value))
          .limit(10)
      : await db.select().from(riskIndicators).orderBy(desc(riskIndicators.value)).limit(10);

    const sevScore = severityScore(incident.severity);
    const avgIndicatorValue =
      indicators.length > 0
        ? indicators.reduce((sum, r) => sum + (r.value ?? 0), 0) / indicators.length
        : 0;

    let riskScore = sevScore * 20 + avgIndicatorValue * 0.5;
    if (incident.status === "active") riskScore += 10;
    if (incident.verificationStatus === "unverified") riskScore -= 5;

    const probability = Math.max(5, Math.min(95, Math.round(riskScore)));

    let escalationRisk: "low" | "medium" | "high" = "low";
    if (probability >= 70) escalationRisk = "high";
    else if (probability >= 40) escalationRisk = "medium";

    let timeWindowDays = 30;
    if (escalationRisk === "high") timeWindowDays = 14;
    else if (escalationRisk === "medium") timeWindowDays = 21;

    const keyDrivers: string[] = indicators.slice(0, 3).map((r) => r.name || `Indicator #${r.id}`);
    if (incident.category) keyDrivers.push(`Incident category: ${incident.category}`);
    if (incident.location) keyDrivers.push(`Reported location: ${incident.location}`);

    const recommendedActions: string[] = [];
    if (escalationRisk === "high") {
      recommendedActions.push(
        "Activate escalation response plan for the region.",
        "Increase monitoring and deploy field teams to the affected area.",
        "Engage community leaders and security agencies to de-escalate."
      );
    } else if (escalationRisk === "medium") {
      recommendedActions.push(
        "Enhance monitoring of the situation and update risk indicators regularly.",
        "Initiate dialogue and confidence-building measures with local stakeholders."
      );
    } else {
      recommendedActions.push(
        "Maintain routine monitoring and update the incident if new information emerges."
      );
    }

    const [saved] = await db
      .insert(escalationPredictions)
      .values({
        incidentId: incident.id,
        region,
        currentSeverity: incident.severity,
        escalationRisk,
        probability,
        timeWindowDays,
        keyDrivers,
        recommendedActions,
        modelSource: "heuristic-v1",
      })
      .returning();

    return {
      prediction: {
        incidentId: incident.id,
        region,
        currentSeverity: incident.severity,
        escalationRisk,
        probability,
        timeWindowDays,
        keyDrivers,
        recommendedActions,
      },
      saved: saved ?? null,
    };
  }
}

export const escalationPredictionService = EscalationPredictionService.getInstance();


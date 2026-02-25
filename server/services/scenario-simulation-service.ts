/**
 * Scenario Simulation Service - Run what-if conflict scenarios
 */
import { storage } from "../storage";

export interface ScenarioParams {
  region: string;
  incidentIncreasePercent?: number; // e.g. 20 = 20% more incidents
  additionalCriticalIncidents?: number;
  additionalHighIncidents?: number;
  indicatorValueIncrease?: number; // add this to avg indicator value in region
}

export interface ScenarioResult {
  scenario: ScenarioParams;
  currentState: {
    incidentCount: number;
    activeCount: number;
    avgSeverityScore: number;
    avgIndicatorValue: number;
  };
  simulatedState: {
    incidentCount: number;
    effectiveSeverityScore: number;
    effectiveIndicatorValue: number;
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  recommendations: string[];
  generatedAt: string;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export async function runScenario(params: ScenarioParams): Promise<ScenarioResult> {
  const incidents = await storage.getIncidents();
  const indicators = await storage.getRiskIndicators();
  const regionIncidents = incidents.filter((i) => (i.region || "").toLowerCase() === params.region.toLowerCase());
  const regionIndicators = indicators.filter((r) => (r.region || "").toLowerCase() === params.region.toLowerCase());

  const currentCount = regionIncidents.length;
  const activeCount = regionIncidents.filter((i) => i.status === "active").length;
  const avgSeverity =
    regionIncidents.length > 0
      ? regionIncidents.reduce((s, i) => s + (SEVERITY_WEIGHT[i.severity] ?? 1), 0) / regionIncidents.length
      : 0;
  const avgIndicator =
    regionIndicators.length > 0
      ? regionIndicators.reduce((s, i) => s + (i.value ?? 0), 0) / regionIndicators.length
      : 0;

  const increaseMult = 1 + (params.incidentIncreasePercent ?? 0) / 100;
  const additionalCritical = params.additionalCriticalIncidents ?? 0;
  const additionalHigh = params.additionalHighIncidents ?? 0;
  const simulatedCount = Math.round(currentCount * increaseMult) + additionalCritical + additionalHigh;
  const criticalWeight = 4;
  const highWeight = 3;
  const currentWeighted = regionIncidents.reduce(
    (s, i) => s + (SEVERITY_WEIGHT[i.severity] ?? 1),
    0
  );
  const addedWeight = additionalCritical * criticalWeight + additionalHigh * highWeight;
  const simulatedWeighted = Math.round(currentWeighted * increaseMult) + addedWeight;
  const effectiveSeverity = simulatedCount > 0 ? simulatedWeighted / simulatedCount : 0;
  const effectiveIndicator = avgIndicator + (params.indicatorValueIncrease ?? 0);

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  const composite = effectiveSeverity * 15 + effectiveIndicator * 0.4 + simulatedCount * 2;
  if (composite >= 70) riskLevel = "critical";
  else if (composite >= 50) riskLevel = "high";
  else if (composite >= 30) riskLevel = "medium";

  const recommendations: string[] = [];
  if (riskLevel === "critical" || riskLevel === "high") {
    recommendations.push("Mobilize emergency response teams and activate crisis protocols.");
    recommendations.push("Increase security presence and community engagement in the region.");
    recommendations.push("Coordinate with local authorities and humanitarian partners.");
  }
  if (effectiveIndicator > 70) {
    recommendations.push("Address underlying risk indicators through targeted interventions.");
  }
  if (simulatedCount > currentCount * 1.2) {
    recommendations.push("Prepare for potential surge in incidents; pre-position resources.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue monitoring; maintain current response readiness.");
  }

  return {
    scenario: params,
    currentState: {
      incidentCount: currentCount,
      activeCount: activeCount,
      avgSeverityScore: Math.round(avgSeverity * 100) / 100,
      avgIndicatorValue: Math.round(avgIndicator * 10) / 10,
    },
    simulatedState: {
      incidentCount: simulatedCount,
      effectiveSeverityScore: Math.round(effectiveSeverity * 100) / 100,
      effectiveIndicatorValue: Math.round(Math.min(100, effectiveIndicator) * 10) / 10,
      riskLevel,
    },
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

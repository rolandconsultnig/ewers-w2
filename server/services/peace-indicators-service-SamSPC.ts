import { storage } from '../storage';
import { logger } from './logger';
import { db } from '../db';
import { peaceOpportunities } from '@shared/schema';

export interface PeaceOpportunity {
  id: string;
  title: string;
  description: string;
  region: string;
  confidence: number; // 0-100
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeWindow: {
    start: Date;
    end: Date;
    optimal: Date;
  };
  indicators: string[];
  prerequisites: string[];
  recommendations: string[];
  riskFactors: string[];
  successProbability: number; // 0-100
  detectedAt: Date;
}

export interface PeaceIndicatorsResult {
  opportunities: PeaceOpportunity[];
  summary: {
    totalOpportunities: number;
    highPriorityOpportunities: number;
    optimalWindows: number;
    affectedRegions: string[];
  };
  generatedAt: Date;
}

export class PeaceIndicatorsService {
  private static instance: PeaceIndicatorsService;

  private constructor() {}

  public static getInstance(): PeaceIndicatorsService {
    if (!PeaceIndicatorsService.instance) {
      PeaceIndicatorsService.instance = new PeaceIndicatorsService();
    }
    return PeaceIndicatorsService.instance;
  }

  /**
   * Predict windows of opportunity for peace initiatives
   * @param timeframeDays - Analysis window in days (default 90)
   * @param region - Optional region filter (e.g. "North Central"); if set, only opportunities in that region or "National" are returned
   */
  async predictPeaceOpportunities(timeframeDays: number = 90, region?: string): Promise<PeaceIndicatorsResult> {
    try {
      logger.info(`Starting peace opportunity prediction for ${timeframeDays} days${region ? `, region: ${region}` : ""}`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      // Get incidents and analyze trends
      const incidents = await storage.getIncidents();
      const recentIncidents = incidents.filter(incident =>
        new Date(incident.reportedAt) >= startDate &&
        new Date(incident.reportedAt) <= endDate
      );

      const opportunities: PeaceOpportunity[] = [];

      // Opportunity 1: Declining Violence Trends
      const decliningViolenceOpps = await this.detectDecliningViolence(recentIncidents, startDate, endDate);
      opportunities.push(...decliningViolenceOpps);

      // Opportunity 2: Successful Resolution Patterns
      const resolutionOpps = await this.detectResolutionPatterns(recentIncidents, startDate, endDate);
      opportunities.push(...resolutionOpps);

      // Opportunity 3: Seasonal Peace Windows
      const seasonalOpps = await this.detectSeasonalOpportunities(recentIncidents, startDate, endDate);
      opportunities.push(...seasonalOpps);

      // Opportunity 4: Political Stability Indicators
      const politicalOpps = await this.detectPoliticalStability(recentIncidents, startDate, endDate);
      opportunities.push(...politicalOpps);

      // Opportunity 5: Community Reconciliation Signals
      const reconciliationOpps = await this.detectReconciliationSignals(recentIncidents, startDate, endDate);
      opportunities.push(...reconciliationOpps);

      // Optional region filter: keep only opportunities in the requested region or "National"
      let filteredOpportunities = opportunities;
      if (region && region.trim()) {
        const regionNorm = region.trim();
        filteredOpportunities = opportunities.filter(
          (o) => o.region === regionNorm || o.region === "National"
        );
      }

      const finalOpportunities = filteredOpportunities.sort((a, b) => b.confidence - a.confidence);
      const finalAffectedRegions = Array.from(new Set(finalOpportunities.map((o) => o.region)));
      const finalHighPriority = finalOpportunities.filter((o) => ["high", "critical"].includes(o.priority)).length;
      const finalOptimalWindows = finalOpportunities.filter((o) => {
        const now = new Date();
        const optimal = new Date(o.timeWindow.optimal);
        const diffDays = Math.abs((optimal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }).length;

      const result: PeaceIndicatorsResult = {
        opportunities: finalOpportunities,
        summary: {
          totalOpportunities: finalOpportunities.length,
          highPriorityOpportunities: finalHighPriority,
          optimalWindows: finalOptimalWindows,
          affectedRegions: finalAffectedRegions,
        },
        generatedAt: new Date(),
      };

      // Persist opportunities snapshot for audit/analytics
      if (finalOpportunities.length > 0) {
        try {
          await db.insert(peaceOpportunities).values(
            finalOpportunities.map((o) => ({
              externalId: o.id,
              title: o.title,
              description: o.description,
              region: o.region,
              confidence: Math.round(o.confidence),
              priority: o.priority,
              windowStart: o.timeWindow.start,
              windowEnd: o.timeWindow.end,
              windowOptimal: o.timeWindow.optimal,
              indicators: o.indicators,
              prerequisites: o.prerequisites,
              recommendations: o.recommendations,
              riskFactors: o.riskFactors,
              successProbability: Math.round(o.successProbability),
            }))
          );
        } catch (e) {
          logger.warn('Failed to persist peace opportunities snapshot', { error: e });
        }
      }

      logger.info(`Peace opportunity prediction completed: ${opportunities.length} opportunities identified`);
      return result;

    } catch (error) {
      logger.error('Peace opportunity prediction failed:', error);
      throw new Error('Failed to predict peace opportunities');
    }
  }

  /**
   * Detect declining violence trends as peace opportunities
   */
  private async detectDecliningViolence(incidents: any[], startDate: Date, endDate: Date): Promise<PeaceOpportunity[]> {
    const opportunities: PeaceOpportunity[] = [];
    const regionIncidents = this.groupByRegion(incidents);

    for (const [region, regionData] of Object.entries(regionIncidents)) {
      const sortedIncidents = regionData.sort((a, b) => 
        new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
      );

      // Analyze trend over time
      const midPoint = Math.floor(sortedIncidents.length / 2);
      const firstHalf = sortedIncidents.slice(0, midPoint);
      const secondHalf = sortedIncidents.slice(midPoint);

      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstHalfSeverity = this.getAverageSeverity(firstHalf);
        const secondHalfSeverity = this.getAverageSeverity(secondHalf);
        const reduction = firstHalfSeverity - secondHalfSeverity;

        if (reduction > 0.5 && secondHalf.length < firstHalf.length * 0.8) {
          const optimal = new Date();
          optimal.setDate(optimal.getDate() + 14); // Optimal window in 2 weeks

          opportunities.push({
            id: `declining_violence_${region}_${Date.now()}`,
            title: `Declining Violence Trend in ${region}`,
            description: `${region} shows a ${(reduction * 25).toFixed(1)}% reduction in conflict severity and ${((1 - secondHalf.length / firstHalf.length) * 100).toFixed(1)}% decrease in incident frequency.`,
            region,
            confidence: Math.min(90, 60 + (reduction * 30)),
            priority: reduction > 1.0 ? 'high' : 'medium',
            timeWindow: {
              start: new Date(),
              end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
              optimal,
            },
            indicators: [
              'Decreasing incident frequency',
              'Reducing conflict severity',
              'Improved security metrics',
              'Stabilizing conditions'
            ],
            prerequisites: [
              'Sustained security presence',
              'Community engagement',
              'Economic stability',
              'Political will'
            ],
            recommendations: [
              'Launch community dialogue initiatives',
              'Implement development projects',
              'Strengthen local governance',
              'Support reconciliation programs'
            ],
            riskFactors: [
              'External spoilers',
              'Economic deterioration',
              'Political instability',
              'Seasonal factors'
            ],
            successProbability: Math.min(85, 50 + (reduction * 25)),
            detectedAt: new Date(),
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Detect successful resolution patterns
   */
  private async detectResolutionPatterns(incidents: any[], startDate: Date, endDate: Date): Promise<PeaceOpportunity[]> {
    const opportunities: PeaceOpportunity[] = [];
    const resolvedIncidents = incidents.filter(inc => inc.status === 'resolved');
    const regionResolutions = this.groupByRegion(resolvedIncidents);

    for (const [region, resolutions] of Object.entries(regionResolutions)) {
      if (resolutions.length >= 3) {
        // Calculate average resolution time
        const avgResolutionTime = resolutions.reduce((sum, inc) => {
          const reported = new Date(inc.reportedAt);
          const updated = new Date(inc.updatedAt || inc.reportedAt);
          return sum + (updated.getTime() - reported.getTime());
        }, 0) / resolutions.length;

        const avgDays = avgResolutionTime / (1000 * 60 * 60 * 24);

        if (avgDays < 30) { // Quick resolution pattern
          const optimal = new Date();
          optimal.setDate(optimal.getDate() + 7); // Immediate opportunity

          opportunities.push({
            id: `resolution_pattern_${region}_${Date.now()}`,
            title: `Successful Resolution Pattern in ${region}`,
            description: `${region} demonstrates effective conflict resolution with ${resolutions.length} incidents resolved in an average of ${avgDays.toFixed(1)} days.`,
            region,
            confidence: Math.min(85, 50 + (resolutions.length * 5)),
            priority: resolutions.length >= 5 ? 'high' : 'medium',
            timeWindow: {
              start: new Date(),
              end: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
              optimal,
            },
            indicators: [
              'Effective resolution mechanisms',
              'Community cooperation',
              'Strong local leadership',
              'Rapid response capabilities'
            ],
            prerequisites: [
              'Maintain current leadership',
              'Preserve resolution mechanisms',
              'Continue community engagement',
              'Sustain resource allocation'
            ],
            recommendations: [
              'Scale successful resolution models',
              'Document best practices',
              'Train other regions',
              'Institutionalize processes'
            ],
            riskFactors: [
              'Leadership changes',
              'Resource constraints',
              'External interference',
              'Complacency'
            ],
            successProbability: Math.min(90, 60 + (resolutions.length * 3)),
            detectedAt: new Date(),
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Detect seasonal peace opportunities
   */
  private async detectSeasonalOpportunities(incidents: any[], startDate: Date, endDate: Date): Promise<PeaceOpportunity[]> {
    const opportunities: PeaceOpportunity[] = [];
    const monthlyIncidents = this.groupByMonth(incidents);
    const currentMonth = new Date().getMonth();

    // Identify low-conflict months
    const monthCounts = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      count: monthlyIncidents[i]?.length || 0,
      severity: this.getAverageSeverity(monthlyIncidents[i] || [])
    }));

    const avgMonthlyCount = monthCounts.reduce((sum, m) => sum + m.count, 0) / 12;
    const lowConflictMonths = monthCounts.filter(m => m.count < avgMonthlyCount * 0.7);

    for (const month of lowConflictMonths) {
      if (month.count < avgMonthlyCount * 0.5) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        const nextOccurrence = new Date();
        nextOccurrence.setMonth(month.month);
        if (nextOccurrence < new Date()) {
          nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
        }

        opportunities.push({
          id: `seasonal_${month.month}_${Date.now()}`,
          title: `Seasonal Peace Window - ${monthNames[month.month]}`,
          description: `${monthNames[month.month]} historically shows ${((1 - month.count / avgMonthlyCount) * 100).toFixed(1)}% fewer conflicts, presenting optimal conditions for peace initiatives.`,
          region: 'National',
          confidence: Math.min(80, 40 + ((avgMonthlyCount - month.count) * 5)),
          priority: month.count < avgMonthlyCount * 0.3 ? 'high' : 'medium',
          timeWindow: {
            start: new Date(nextOccurrence.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: new Date(nextOccurrence.getTime() + 30 * 24 * 60 * 60 * 1000),
            optimal: nextOccurrence,
          },
          indicators: [
            'Historical low conflict periods',
            'Seasonal stability patterns',
            'Reduced tension indicators',
            'Favorable conditions'
          ],
          prerequisites: [
            'Advance planning',
            'Resource preparation',
            'Stakeholder alignment',
            'Timing coordination'
          ],
          recommendations: [
            'Schedule major peace initiatives',
            'Conduct reconciliation ceremonies',
            'Implement development projects',
            'Hold community dialogues'
          ],
          riskFactors: [
            'Changing seasonal patterns',
            'External disruptions',
            'Resource competition',
            'Political changes'
          ],
          successProbability: Math.min(75, 45 + ((avgMonthlyCount - month.count) * 3)),
          detectedAt: new Date(),
        });
      }
    }

    return opportunities;
  }

  /**
   * Detect political stability indicators
   */
  private async detectPoliticalStability(incidents: any[], startDate: Date, endDate: Date): Promise<PeaceOpportunity[]> {
    const opportunities: PeaceOpportunity[] = [];
    const politicalIncidents = incidents.filter(inc => inc.category === 'political');
    const regionPolitical = this.groupByRegion(politicalIncidents);

    for (const [region, politicalData] of Object.entries(regionPolitical)) {
      if (politicalData.length === 0) {
        // No political incidents = stability
        const optimal = new Date();
        optimal.setDate(optimal.getDate() + 10);

        opportunities.push({
          id: `political_stability_${region}_${Date.now()}`,
          title: `Political Stability Window in ${region}`,
          description: `${region} shows political stability with no political incidents in the analysis period, creating favorable conditions for peace initiatives.`,
          region,
          confidence: 75,
          priority: 'medium',
          timeWindow: {
            start: new Date(),
            end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            optimal,
          },
          indicators: [
            'Absence of political violence',
            'Stable governance',
            'Peaceful political processes',
            'Institutional functionality'
          ],
          prerequisites: [
            'Maintain political dialogue',
            'Preserve institutional integrity',
            'Continue inclusive governance',
            'Address grievances proactively'
          ],
          recommendations: [
            'Strengthen democratic institutions',
            'Promote inclusive governance',
            'Support civil society',
            'Enhance transparency'
          ],
          riskFactors: [
            'Electoral periods',
            'Economic pressures',
            'External interference',
            'Leadership changes'
          ],
          successProbability: 70,
          detectedAt: new Date(),
        });
      }
    }

    return opportunities;
  }

  /**
   * Detect community reconciliation signals
   */
  private async detectReconciliationSignals(incidents: any[], startDate: Date, endDate: Date): Promise<PeaceOpportunity[]> {
    const opportunities: PeaceOpportunity[] = [];
    const conflictIncidents = incidents.filter(inc => inc.category === 'conflict');
    const regionConflicts = this.groupByRegion(conflictIncidents);

    for (const [region, conflicts] of Object.entries(regionConflicts)) {
      const recentConflicts = conflicts.filter(inc => {
        const incidentDate = new Date(inc.reportedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return incidentDate >= thirtyDaysAgo;
      });

      if (conflicts.length > 0 && recentConflicts.length === 0) {
        // Had conflicts but none recently = potential reconciliation
        const optimal = new Date();
        optimal.setDate(optimal.getDate() + 5);

        opportunities.push({
          id: `reconciliation_${region}_${Date.now()}`,
          title: `Community Reconciliation Opportunity in ${region}`,
          description: `${region} shows signs of community reconciliation with no recent conflicts after a period of tension, indicating readiness for peace-building initiatives.`,
          region,
          confidence: 65,
          priority: 'medium',
          timeWindow: {
            start: new Date(),
            end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            optimal,
          },
          indicators: [
            'Cessation of recent conflicts',
            'Community fatigue with violence',
            'Emerging reconciliation signals',
            'Readiness for dialogue'
          ],
          prerequisites: [
            'Neutral facilitation',
            'Safe dialogue spaces',
            'Community leader engagement',
            'Trust-building measures'
          ],
          recommendations: [
            'Facilitate community dialogues',
            'Support traditional reconciliation',
            'Implement joint projects',
            'Promote inter-community activities'
          ],
          riskFactors: [
            'Unresolved grievances',
            'Spoiler activities',
            'Resource competition',
            'External manipulation'
          ],
          successProbability: 60,
          detectedAt: new Date(),
        });
      }
    }

    return opportunities;
  }

  // Helper methods
  private groupByRegion(incidents: any[]): Record<string, any[]> {
    return incidents.reduce((acc, incident) => {
      const region = incident.region || 'Unknown';
      if (!acc[region]) acc[region] = [];
      acc[region].push(incident);
      return acc;
    }, {});
  }

  private groupByMonth(incidents: any[]): Record<number, any[]> {
    return incidents.reduce((acc, incident) => {
      const month = new Date(incident.reportedAt).getMonth();
      if (!acc[month]) acc[month] = [];
      acc[month].push(incident);
      return acc;
    }, {});
  }

  private getAverageSeverity(incidents: any[]): number {
    if (incidents.length === 0) return 0;
    const total = incidents.reduce((sum, inc) => sum + this.getSeverityScore(inc.severity), 0);
    return total / incidents.length;
  }

  private getSeverityScore(severity: string): number {
    switch (severity?.toLowerCase()) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 1;
    }
  }
}

export const peaceIndicatorsService = PeaceIndicatorsService.getInstance();

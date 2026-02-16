import { storage } from '../storage';
import { logger } from './logger';

export interface ConflictPattern {
  id: string;
  type: 'escalation' | 'geographic_spread' | 'temporal' | 'actor_based' | 'resource_conflict';
  title: string;
  description: string;
  confidence: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  regions: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  indicators: string[];
  relatedIncidents: number[];
  riskFactors: string[];
  recommendations: string[];
  detectedAt: Date;
}

export interface PatternDetectionResult {
  patterns: ConflictPattern[];
  summary: {
    totalPatterns: number;
    criticalPatterns: number;
    emergingThreats: number;
    affectedRegions: string[];
  };
  generatedAt: Date;
}

export class PatternDetectionService {
  private static instance: PatternDetectionService;

  private constructor() {}

  public static getInstance(): PatternDetectionService {
    if (!PatternDetectionService.instance) {
      PatternDetectionService.instance = new PatternDetectionService();
    }
    return PatternDetectionService.instance;
  }

  /**
   * Detect emerging conflict patterns across regions
   */
  async detectPatterns(timeframeDays: number = 90): Promise<PatternDetectionResult> {
    try {
      logger.info(`Starting pattern detection analysis for ${timeframeDays} days`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      // Get incidents for analysis
      const incidents = await storage.getIncidents();
      const recentIncidents = incidents.filter(incident => 
        new Date(incident.reportedAt) >= startDate && 
        new Date(incident.reportedAt) <= endDate
      );

      const patterns: ConflictPattern[] = [];

      // Pattern 1: Geographic Escalation Pattern
      const geoPattern = await this.detectGeographicEscalation(recentIncidents, startDate, endDate);
      if (geoPattern) patterns.push(geoPattern);

      // Pattern 2: Temporal Clustering Pattern
      const temporalPattern = await this.detectTemporalClustering(recentIncidents, startDate, endDate);
      if (temporalPattern) patterns.push(temporalPattern);

      // Pattern 3: Actor-Based Pattern
      const actorPattern = await this.detectActorBasedPatterns(recentIncidents, startDate, endDate);
      if (actorPattern) patterns.push(actorPattern);

      // Pattern 4: Resource Conflict Pattern
      const resourcePattern = await this.detectResourceConflictPattern(recentIncidents, startDate, endDate);
      if (resourcePattern) patterns.push(resourcePattern);

      // Pattern 5: Severity Escalation Pattern
      const escalationPattern = await this.detectSeverityEscalation(recentIncidents, startDate, endDate);
      if (escalationPattern) patterns.push(escalationPattern);

      // Generate summary
      const affectedRegions = Array.from(new Set(patterns.flatMap(p => p.regions)));
      const criticalPatterns = patterns.filter(p => p.severity === 'critical').length;
      const emergingThreats = patterns.filter(p => p.confidence > 75).length;

      const result: PatternDetectionResult = {
        patterns: patterns.sort((a, b) => b.confidence - a.confidence),
        summary: {
          totalPatterns: patterns.length,
          criticalPatterns,
          emergingThreats,
          affectedRegions,
        },
        generatedAt: new Date(),
      };

      logger.info(`Pattern detection completed: ${patterns.length} patterns detected`);
      return result;

    } catch (error) {
      logger.error('Pattern detection failed:', error);
      throw new Error('Failed to detect conflict patterns');
    }
  }

  /**
   * Detect geographic escalation patterns
   */
  private async detectGeographicEscalation(incidents: any[], startDate: Date, endDate: Date): Promise<ConflictPattern | null> {
    const regionIncidents = this.groupByRegion(incidents);
    const spreadingRegions: string[] = [];
    const relatedIncidents: number[] = [];

    // Analyze each region for escalation
    for (const [region, regionData] of Object.entries(regionIncidents)) {
      const sortedIncidents = regionData.sort((a, b) => 
        new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
      );

      // Check for increasing severity over time
      let escalationScore = 0;
      for (let i = 1; i < sortedIncidents.length; i++) {
        const prev = this.getSeverityScore(sortedIncidents[i-1].severity);
        const curr = this.getSeverityScore(sortedIncidents[i].severity);
        if (curr > prev) escalationScore++;
      }

      if (escalationScore > sortedIncidents.length * 0.3) {
        spreadingRegions.push(region);
        relatedIncidents.push(...regionData.map(inc => inc.id));
      }
    }

    if (spreadingRegions.length >= 2) {
      return {
        id: `geo_escalation_${Date.now()}`,
        type: 'geographic_spread',
        title: 'Geographic Conflict Escalation Detected',
        description: `Conflict patterns are spreading across multiple regions with increasing severity. ${spreadingRegions.length} regions showing escalation trends.`,
        confidence: Math.min(95, 60 + (spreadingRegions.length * 10)),
        severity: spreadingRegions.length >= 4 ? 'critical' : spreadingRegions.length >= 3 ? 'high' : 'medium',
        regions: spreadingRegions,
        timeframe: { start: startDate, end: endDate },
        indicators: [
          'Cross-regional incident correlation',
          'Increasing severity trends',
          'Geographic proximity clustering',
          'Similar conflict types across regions'
        ],
        relatedIncidents,
        riskFactors: [
          'Porous borders enabling conflict spread',
          'Similar socio-economic conditions',
          'Weak governance structures',
          'Resource competition spillover'
        ],
        recommendations: [
          'Enhance inter-regional security coordination',
          'Deploy rapid response teams to border areas',
          'Strengthen early warning systems',
          'Address root causes of regional tensions'
        ],
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect temporal clustering patterns
   */
  private async detectTemporalClustering(incidents: any[], startDate: Date, endDate: Date): Promise<ConflictPattern | null> {
    const dailyIncidents = this.groupByDay(incidents);
    const clusters: { date: string; count: number; severity: number }[] = [];

    // Find days with unusually high incident counts
    const avgDaily = incidents.length / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = avgDaily * 2;

    for (const [date, dayIncidents] of Object.entries(dailyIncidents)) {
      if (dayIncidents.length > threshold) {
        const avgSeverity = dayIncidents.reduce((sum, inc) => sum + this.getSeverityScore(inc.severity), 0) / dayIncidents.length;
        clusters.push({
          date,
          count: dayIncidents.length,
          severity: avgSeverity
        });
      }
    }

    if (clusters.length >= 3) {
      const relatedIncidents = clusters.flatMap(cluster => 
        dailyIncidents[cluster.date]?.map(inc => inc.id) || []
      );

      return {
        id: `temporal_cluster_${Date.now()}`,
        type: 'temporal',
        title: 'Temporal Incident Clustering Detected',
        description: `${clusters.length} days with significantly elevated incident rates detected, suggesting coordinated or cascading conflicts.`,
        confidence: Math.min(90, 50 + (clusters.length * 8)),
        severity: clusters.some(c => c.severity > 3) ? 'high' : 'medium',
        regions: [...new Set(incidents.map(inc => inc.region))],
        timeframe: { start: startDate, end: endDate },
        indicators: [
          'Spike in daily incident rates',
          'Temporal correlation patterns',
          'Coordinated timing indicators',
          'Cascading effect evidence'
        ],
        relatedIncidents,
        riskFactors: [
          'Coordinated attacks',
          'Retaliatory violence cycles',
          'Seasonal conflict patterns',
          'Event-triggered escalations'
        ],
        recommendations: [
          'Implement 24/7 monitoring during high-risk periods',
          'Pre-position response teams',
          'Activate emergency protocols',
          'Enhance intelligence gathering'
        ],
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect actor-based patterns
   */
  private async detectActorBasedPatterns(incidents: any[], startDate: Date, endDate: Date): Promise<ConflictPattern | null> {
    const categoryGroups = this.groupByCategory(incidents);
    const suspiciousPatterns: string[] = [];
    const relatedIncidents: number[] = [];

    // Analyze patterns by conflict category
    for (const [category, categoryIncidents] of Object.entries(categoryGroups)) {
      if (categoryIncidents.length >= 5) {
        // Check for geographic spread of same category
        const regions = Array.from(new Set(categoryIncidents.map(inc => inc.region)));
        if (regions.length >= 3) {
          suspiciousPatterns.push(`${category} incidents across ${regions.length} regions`);
          relatedIncidents.push(...categoryIncidents.map(inc => inc.id));
        }
      }
    }

    if (suspiciousPatterns.length > 0) {
      return {
        id: `actor_pattern_${Date.now()}`,
        type: 'actor_based',
        title: 'Actor-Based Conflict Pattern Detected',
        description: `Coordinated conflict patterns suggesting organized actor involvement: ${suspiciousPatterns.join(', ')}.`,
        confidence: Math.min(85, 40 + (suspiciousPatterns.length * 15)),
        severity: suspiciousPatterns.length >= 3 ? 'high' : 'medium',
        regions: [...new Set(incidents.map(inc => inc.region))],
        timeframe: { start: startDate, end: endDate },
        indicators: [
          'Similar modus operandi across regions',
          'Coordinated timing patterns',
          'Consistent target selection',
          'Geographic expansion patterns'
        ],
        relatedIncidents,
        riskFactors: [
          'Organized criminal networks',
          'Terrorist group activities',
          'Political manipulation',
          'Resource extraction conflicts'
        ],
        recommendations: [
          'Enhance intelligence sharing between regions',
          'Investigate potential actor connections',
          'Strengthen border security',
          'Target root causes of organized violence'
        ],
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect resource conflict patterns
   */
  private async detectResourceConflictPattern(incidents: any[], startDate: Date, endDate: Date): Promise<ConflictPattern | null> {
    const resourceKeywords = ['farmer', 'herder', 'land', 'water', 'grazing', 'crop', 'cattle', 'resource'];
    const resourceIncidents = incidents.filter(inc => 
      resourceKeywords.some(keyword => 
        inc.title.toLowerCase().includes(keyword) || 
        inc.description.toLowerCase().includes(keyword)
      )
    );

    if (resourceIncidents.length >= 8) {
      const regions = Array.from(new Set(resourceIncidents.map(inc => inc.region)));
      const severity = resourceIncidents.filter(inc => ['high', 'critical'].includes(inc.severity)).length;

      return {
        id: `resource_conflict_${Date.now()}`,
        type: 'resource_conflict',
        title: 'Resource-Based Conflict Pattern Detected',
        description: `${resourceIncidents.length} resource-related conflicts detected across ${regions.length} regions, indicating systemic resource competition issues.`,
        confidence: Math.min(90, 50 + (resourceIncidents.length * 3)),
        severity: severity >= 5 ? 'high' : severity >= 3 ? 'medium' : 'low',
        regions,
        timeframe: { start: startDate, end: endDate },
        indicators: [
          'Farmer-herder conflict patterns',
          'Land dispute escalations',
          'Water resource competition',
          'Seasonal migration conflicts'
        ],
        relatedIncidents: resourceIncidents.map(inc => inc.id),
        riskFactors: [
          'Climate change impacts',
          'Population growth pressure',
          'Weak land tenure systems',
          'Inadequate conflict resolution mechanisms'
        ],
        recommendations: [
          'Establish resource-sharing agreements',
          'Create early warning systems for resource stress',
          'Strengthen traditional conflict resolution',
          'Implement sustainable resource management'
        ],
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect severity escalation patterns
   */
  private async detectSeverityEscalation(incidents: any[], startDate: Date, endDate: Date): Promise<ConflictPattern | null> {
    const sortedIncidents = incidents.sort((a, b) => 
      new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
    );

    let escalationCount = 0;
    const escalatingIncidents: number[] = [];

    // Check for increasing severity over time
    for (let i = 1; i < sortedIncidents.length; i++) {
      const prevSeverity = this.getSeverityScore(sortedIncidents[i-1].severity);
      const currSeverity = this.getSeverityScore(sortedIncidents[i].severity);
      
      if (currSeverity > prevSeverity) {
        escalationCount++;
        escalatingIncidents.push(sortedIncidents[i].id);
      }
    }

    const escalationRate = escalationCount / Math.max(1, sortedIncidents.length - 1);

    if (escalationRate > 0.3) {
      return {
        id: `escalation_pattern_${Date.now()}`,
        type: 'escalation',
        title: 'Conflict Severity Escalation Pattern',
        description: `${(escalationRate * 100).toFixed(1)}% of incidents show escalating severity trends, indicating deteriorating security conditions.`,
        confidence: Math.min(95, 40 + (escalationRate * 100)),
        severity: escalationRate > 0.6 ? 'critical' : escalationRate > 0.4 ? 'high' : 'medium',
        regions: [...new Set(incidents.map(inc => inc.region))],
        timeframe: { start: startDate, end: endDate },
        indicators: [
          'Increasing incident severity',
          'Escalating violence patterns',
          'Deteriorating security metrics',
          'Rising casualty rates'
        ],
        relatedIncidents: escalatingIncidents,
        riskFactors: [
          'Unresolved underlying tensions',
          'Weak conflict resolution mechanisms',
          'Proliferation of weapons',
          'Breakdown of social cohesion'
        ],
        recommendations: [
          'Immediate de-escalation interventions',
          'Strengthen peacekeeping presence',
          'Address root causes urgently',
          'Implement emergency response protocols'
        ],
        detectedAt: new Date(),
      };
    }

    return null;
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

  private groupByDay(incidents: any[]): Record<string, any[]> {
    return incidents.reduce((acc, incident) => {
      const date = new Date(incident.reportedAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(incident);
      return acc;
    }, {});
  }

  private groupByCategory(incidents: any[]): Record<string, any[]> {
    return incidents.reduce((acc, incident) => {
      const category = incident.category || 'Unknown';
      if (!acc[category]) acc[category] = [];
      acc[category].push(incident);
      return acc;
    }, {});
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

export const patternDetectionService = PatternDetectionService.getInstance();

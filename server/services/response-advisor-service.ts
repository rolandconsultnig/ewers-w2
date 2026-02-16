import { storage } from '../storage';
import { logger } from './logger';

export interface ResponseRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'immediate' | 'short_term' | 'long_term';
  confidence: number;
  actions: string[];
  resources: string[];
  timeline: string;
  successProbability: number;
  riskLevel: string;
}

export interface ResponseAdvisorResult {
  recommendations: ResponseRecommendation[];
  summary: {
    totalRecommendations: number;
    criticalActions: number;
    immediateActions: number;
  };
  generatedAt: Date;
}

export class ResponseAdvisorService {
  private static instance: ResponseAdvisorService;

  private constructor() {}

  public static getInstance(): ResponseAdvisorService {
    if (!ResponseAdvisorService.instance) {
      ResponseAdvisorService.instance = new ResponseAdvisorService();
    }
    return ResponseAdvisorService.instance;
  }

  async generateRecommendations(incidentId?: number, region?: string): Promise<ResponseAdvisorResult> {
    try {
      logger.info('Generating AI response recommendations');

      const incidents = await storage.getIncidents();
      let targetIncidents = incidents;

      if (incidentId) {
        targetIncidents = incidents.filter(inc => inc.id === incidentId);
      } else if (region) {
        targetIncidents = incidents.filter(inc => inc.region === region);
      }

      const recommendations: ResponseRecommendation[] = [];

      // Generate different types of recommendations
      recommendations.push(...await this.generateImmediateResponse(targetIncidents));
      recommendations.push(...await this.generateShortTermResponse(targetIncidents));
      recommendations.push(...await this.generateLongTermResponse(targetIncidents));

      const criticalActions = recommendations.filter(r => r.priority === 'critical').length;
      const immediateActions = recommendations.filter(r => r.category === 'immediate').length;

      return {
        recommendations: recommendations.sort((a, b) => b.confidence - a.confidence),
        summary: {
          totalRecommendations: recommendations.length,
          criticalActions,
          immediateActions,
        },
        generatedAt: new Date(),
      };

    } catch (error) {
      logger.error('Response advisor failed:', error);
      throw new Error('Failed to generate response recommendations');
    }
  }

  private async generateImmediateResponse(incidents: any[]): Promise<ResponseRecommendation[]> {
    const recommendations: ResponseRecommendation[] = [];
    const criticalIncidents = incidents.filter(inc => inc.severity === 'critical');
    const activeIncidents = incidents.filter(inc => inc.status === 'active');

    if (criticalIncidents.length > 0) {
      recommendations.push({
        id: `immediate_critical_${Date.now()}`,
        title: 'Emergency Response Activation',
        description: `${criticalIncidents.length} critical incidents require immediate emergency response activation.`,
        priority: 'critical',
        category: 'immediate',
        confidence: 95,
        actions: [
          'Activate emergency operations center',
          'Deploy rapid response teams',
          'Coordinate with security forces',
          'Establish incident command structure'
        ],
        resources: ['Emergency response teams', 'Security personnel', 'Medical support', 'Communication systems'],
        timeline: '0-2 hours',
        successProbability: 85,
        riskLevel: 'high'
      });
    }

    if (activeIncidents.length > 10) {
      recommendations.push({
        id: `immediate_surge_${Date.now()}`,
        title: 'Surge Response Protocol',
        description: `High volume of active incidents (${activeIncidents.length}) requires surge response protocols.`,
        priority: 'high',
        category: 'immediate',
        confidence: 88,
        actions: [
          'Scale up response capacity',
          'Prioritize incident triage',
          'Mobilize additional resources',
          'Enhance coordination mechanisms'
        ],
        resources: ['Additional personnel', 'Mobile command units', 'Communication equipment', 'Transportation'],
        timeline: '2-6 hours',
        successProbability: 78,
        riskLevel: 'medium'
      });
    }

    return recommendations;
  }

  private async generateShortTermResponse(incidents: any[]): Promise<ResponseRecommendation[]> {
    const recommendations: ResponseRecommendation[] = [];
    const regionCounts = this.groupByRegion(incidents);
    const hotspots = Object.entries(regionCounts).filter(([_, count]) => count > 5);

    if (hotspots.length > 0) {
      recommendations.push({
        id: `shortterm_hotspots_${Date.now()}`,
        title: 'Hotspot Stabilization Initiative',
        description: `${hotspots.length} regions identified as conflict hotspots requiring targeted stabilization efforts.`,
        priority: 'high',
        category: 'short_term',
        confidence: 82,
        actions: [
          'Deploy specialized teams to hotspots',
          'Establish forward operating bases',
          'Implement community engagement programs',
          'Strengthen local security presence'
        ],
        resources: ['Specialized units', 'Community liaisons', 'Development funds', 'Security equipment'],
        timeline: '1-4 weeks',
        successProbability: 72,
        riskLevel: 'medium'
      });
    }

    const conflictTypes = this.groupByCategory(incidents);
    const dominantType = Object.entries(conflictTypes).reduce((a, b) => a[1] > b[1] ? a : b);

    if (dominantType[1] > 8) {
      recommendations.push({
        id: `shortterm_specialized_${Date.now()}`,
        title: `Specialized ${dominantType[0]} Response Program`,
        description: `High frequency of ${dominantType[0]} incidents (${dominantType[1]}) requires specialized response program.`,
        priority: 'medium',
        category: 'short_term',
        confidence: 75,
        actions: [
          `Deploy ${dominantType[0]} specialists`,
          'Develop targeted intervention strategies',
          'Train local response teams',
          'Implement prevention measures'
        ],
        resources: ['Subject matter experts', 'Training materials', 'Prevention tools', 'Monitoring systems'],
        timeline: '2-8 weeks',
        successProbability: 68,
        riskLevel: 'low'
      });
    }

    return recommendations;
  }

  private async generateLongTermResponse(incidents: any[]): Promise<ResponseRecommendation[]> {
    const recommendations: ResponseRecommendation[] = [];
    const totalIncidents = incidents.length;

    if (totalIncidents > 20) {
      recommendations.push({
        id: `longterm_systemic_${Date.now()}`,
        title: 'Systemic Conflict Prevention Program',
        description: `High incident volume (${totalIncidents}) indicates need for comprehensive systemic interventions.`,
        priority: 'high',
        category: 'long_term',
        confidence: 85,
        actions: [
          'Develop comprehensive peace strategy',
          'Address structural conflict drivers',
          'Strengthen governance systems',
          'Implement sustainable development programs'
        ],
        resources: ['Policy experts', 'Development funds', 'Institutional capacity', 'International support'],
        timeline: '6-24 months',
        successProbability: 65,
        riskLevel: 'medium'
      });
    }

    const resourceConflicts = incidents.filter(inc => 
      inc.description?.toLowerCase().includes('farmer') || 
      inc.description?.toLowerCase().includes('herder') ||
      inc.description?.toLowerCase().includes('land')
    );

    if (resourceConflicts.length > 5) {
      recommendations.push({
        id: `longterm_resource_${Date.now()}`,
        title: 'Resource Management and Reconciliation Program',
        description: `${resourceConflicts.length} resource-related conflicts require comprehensive resource management strategy.`,
        priority: 'medium',
        category: 'long_term',
        confidence: 78,
        actions: [
          'Establish resource-sharing frameworks',
          'Implement sustainable land use policies',
          'Create conflict resolution mechanisms',
          'Develop alternative livelihoods'
        ],
        resources: ['Land use experts', 'Mediation services', 'Development programs', 'Legal frameworks'],
        timeline: '12-36 months',
        successProbability: 60,
        riskLevel: 'low'
      });
    }

    return recommendations;
  }

  private groupByRegion(incidents: any[]): Record<string, number> {
    return incidents.reduce((acc, incident) => {
      const region = incident.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByCategory(incidents: any[]): Record<string, number> {
    return incidents.reduce((acc, incident) => {
      const category = incident.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }
}

export const responseAdvisorService = ResponseAdvisorService.getInstance();

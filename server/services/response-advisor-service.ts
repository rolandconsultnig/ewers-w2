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
  /** Present when the plan was scoped to one incident */
  incidentContext?: {
    id: number;
    title: string;
    location?: string | null;
    region?: string | null;
    severity: string;
    category?: string | null;
    status?: string | null;
  };
  /** Short narrative framing the suggested plan (template-based guidance) */
  planNarrative?: string;
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
      const idNum =
        incidentId !== undefined && incidentId !== null && !Number.isNaN(Number(incidentId))
          ? Number(incidentId)
          : undefined;

      if (idNum !== undefined) {
        const incident = await storage.getIncident(idNum);
        if (!incident) {
          throw new Error(`Incident ${idNum} not found`);
        }

        const tailored = this.buildIncidentTailoredRecommendations(incident);
        const fromGenerators = [
          ...(await this.generateImmediateResponse([incident])),
          ...(await this.generateShortTermResponse([incident])),
          ...(await this.generateLongTermResponse([incident])),
        ];
        const recommendations = this.dedupeByTitle([...tailored, ...fromGenerators]).sort(
          (a, b) => b.confidence - a.confidence,
        );

        const criticalActions = recommendations.filter((r) => r.priority === 'critical').length;
        const immediateActions = recommendations.filter((r) => r.category === 'immediate').length;

        return {
          recommendations,
          summary: {
            totalRecommendations: recommendations.length,
            criticalActions,
            immediateActions,
          },
          generatedAt: new Date(),
          incidentContext: {
            id: incident.id,
            title: incident.title,
            location: incident.location,
            region: incident.region,
            severity: incident.severity,
            category: incident.category,
            status: incident.status,
          },
          planNarrative: this.buildPlanNarrative(incident, recommendations.length),
        };
      }

      let targetIncidents = incidents;
      if (region && String(region).trim()) {
        targetIncidents = incidents.filter((inc) => this.matchesRegion(inc, String(region)));
        if (targetIncidents.length === 0) {
          targetIncidents = incidents;
        }
      }

      const recommendations: ResponseRecommendation[] = [];

      recommendations.push(...(await this.generateImmediateResponse(targetIncidents)));
      recommendations.push(...(await this.generateShortTermResponse(targetIncidents)));
      recommendations.push(...(await this.generateLongTermResponse(targetIncidents)));

      if (recommendations.length === 0) {
        recommendations.push(this.fallbackPortfolioRecommendation());
      }

      const criticalActions = recommendations.filter((r) => r.priority === 'critical').length;
      const immediateActions = recommendations.filter((r) => r.category === 'immediate').length;

      return {
        recommendations: recommendations.sort((a, b) => b.confidence - a.confidence),
        summary: {
          totalRecommendations: recommendations.length,
          criticalActions,
          immediateActions,
        },
        generatedAt: new Date(),
        planNarrative:
          region && String(region).trim()
            ? `Suggested response themes for ${String(region).trim()}, based on current incident portfolio and risk heuristics. This is decision-support only—not operational orders.`
            : 'Suggested response themes based on the current incident portfolio. This is decision-support only—not operational orders.',
      };
    } catch (error) {
      logger.error('Response advisor failed:', error);
      throw error instanceof Error ? error : new Error('Failed to generate response recommendations');
    }
  }

  private matchesRegion(incident: { region?: string | null }, region: string): boolean {
    const ir = (incident.region || '').trim().toLowerCase();
    const rr = region.trim().toLowerCase();
    if (!ir || !rr) return false;
    return ir === rr || ir.includes(rr) || rr.includes(ir);
  }

  private dedupeByTitle(recs: ResponseRecommendation[]): ResponseRecommendation[] {
    const seen = new Set<string>();
    return recs.filter((r) => {
      const k = r.title.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private buildPlanNarrative(incident: { title?: string; severity?: string; region?: string | null }, count: number): string {
    const t = incident.title || 'this incident';
    const sev = (incident.severity || 'medium').toLowerCase();
    const reg = incident.region ? ` in ${incident.region}` : '';
    return (
      `Suggested response plan for “${t}”${reg} (${sev} severity). ` +
      `${count} action themes are listed below—prioritize verification, civilian protection, and coordinated dialogue. ` +
      `This output is AI-assisted decision support and must be validated by responsible authorities before deployment.`
    );
  }

  /** Always returns several items so single-incident analysis is never empty */
  private buildIncidentTailoredRecommendations(incident: {
    id: number;
    title?: string;
    description?: string;
    location?: string | null;
    region?: string | null;
    severity?: string;
    category?: string | null;
    status?: string | null;
  }): ResponseRecommendation[] {
    const sev = (incident.severity || 'low').toLowerCase();
    const cat = (incident.category || 'general').toLowerCase();
    const desc = (incident.description || '').toLowerCase();
    const loc = incident.location || incident.region || 'the affected area';
    const title = incident.title || `Incident #${incident.id}`;
    const id = incident.id;

    const priorityImmediate: ResponseRecommendation['priority'] =
      sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low';

    const recs: ResponseRecommendation[] = [
      {
        id: `tailored_immediate_${id}`,
        title: 'Immediate verification, safety, and coordination',
        description: `Establish facts and protect civilians around “${title}” (${loc}). Open a dedicated coordination channel before scaling response.`,
        priority: priorityImmediate,
        category: 'immediate',
        confidence: 92,
        actions: [
          'Verify the situation through trusted field contacts and official channels; avoid amplifying unconfirmed reports',
          'Assess immediate protection needs for civilians and critical infrastructure',
          'Designate an incident lead and communication rhythm (sitrep schedule)',
          'Align with security and humanitarian actors on de-confliction and access',
        ],
        resources: ['Field liaison', 'Situation room / comms', 'Security coordination', 'Medical standby'],
        timeline: '0–6 hours',
        successProbability: 78,
        riskLevel: sev === 'critical' || sev === 'high' ? 'high' : 'medium',
      },
      {
        id: `tailored_community_${id}`,
        title: 'Community engagement, de-escalation, and information integrity',
        description: `Reduce escalation drivers linked to “${title}” through trusted messengers, calm channels, and targeted rumor management.`,
        priority: sev === 'critical' || sev === 'high' ? 'high' : 'medium',
        category: 'short_term',
        confidence: 84,
        actions: [
          'Engage community leaders, women/youth networks, and faith actors where appropriate',
          'Counter harmful speech with factual updates without revealing sensitive operational detail',
          'Offer safe reporting pathways for affected populations',
          'Map flashpoints for secondary incidents and pre-position mediation capacity',
        ],
        resources: ['Community liaisons', 'Media monitoring', 'Mediation partners', 'Hotline / feedback channels'],
        timeline: '24 hours – 2 weeks',
        successProbability: 68,
        riskLevel: 'medium',
      },
    ];

    if (
      cat.includes('protest') ||
      cat.includes('political') ||
      desc.includes('protest') ||
      desc.includes('demonstration')
    ) {
      recs.push({
        id: `tailored_protest_${id}`,
        title: 'Public order and rights-respecting crowd management',
        description: `Tailored for protest or political tension context: prioritize dialogue, proportionate policing, and freedom of assembly safeguards.`,
        priority: 'high',
        category: 'short_term',
        confidence: 80,
        actions: [
          'Facilitate dialogue between authorities and organizers where feasible',
          'Train responders on de-escalation and human rights standards',
          'Plan traffic, medical, and legal observation support',
          'Prepare contingency for diversion of violence away from protest cores',
        ],
        resources: ['Trained crowd management units', 'Legal observers', 'Mediation team', 'Emergency medical'],
        timeline: '1–7 days',
        successProbability: 65,
        riskLevel: 'medium',
      });
    } else if (
      cat.includes('natural') ||
      cat.includes('disaster') ||
      desc.includes('flood') ||
      desc.includes('disaster')
    ) {
      recs.push({
        id: `tailored_hum_${id}`,
        title: 'Humanitarian staging and early recovery',
        description: `Disaster-focused actions: life-saving assistance, shelter, WASH, and coordination with state emergency management.`,
        priority: 'high',
        category: 'immediate',
        confidence: 86,
        actions: [
          'Rapid needs assessment in accessible areas',
          'Pre-position shelter, food, water, and health surge capacity',
          'Coordinate with NEMA/state actors on logistics corridors',
          'Plan for disease prevention and child protection in collective sites',
        ],
        resources: ['Humanitarian clusters', 'Logistics', 'Health partners', 'Cash/voucher partners'],
        timeline: '0–72 hours',
        successProbability: 72,
        riskLevel: 'medium',
      });
    } else {
      recs.push({
        id: `tailored_conflict_${id}`,
        title: 'Conflict-sensitive response and accountability',
        description: `For violent or armed conflict dynamics: emphasize protection, accountability signals, and medium-term stabilization.`,
        priority: sev === 'low' ? 'medium' : 'high',
        category: 'short_term',
        confidence: 79,
        actions: [
          'Document incidents responsibly for accountability and learning (within security constraints)',
          'Prioritize protection of women, children, and displaced populations',
          'Explore localized ceasefires or cooling-off periods with trusted intermediaries',
          'Link to longer-term justice and reconciliation pathways where appropriate',
        ],
        resources: ['Protection specialists', 'Human rights monitors', 'Justice sector partners', 'DDR/reintegration advisors'],
        timeline: '1–8 weeks',
        successProbability: 62,
        riskLevel: 'high',
      });
    }

    recs.push({
      id: `tailored_monitor_${id}`,
      title: 'Monitoring, learning, and after-action review',
      description: `Sustain awareness of spillover risk and capture lessons from the response to “${title}”.`,
      priority: 'medium',
      category: 'long_term',
      confidence: 74,
      actions: [
        'Track indicators of recurrence and community trust',
        'Schedule an after-action review with all participating agencies',
        'Update SOPs and early-warning triggers based on this case',
        'Feed insights into regional prevention programming',
      ],
      resources: ['M&E staff', 'Regional analysts', 'Prevention program leads'],
      timeline: '2–12 weeks',
      successProbability: 70,
      riskLevel: 'low',
    });

    return recs;
  }

  private fallbackPortfolioRecommendation(): ResponseRecommendation {
    return {
      id: `fallback_monitor_${Date.now()}`,
      title: 'Portfolio monitoring and readiness',
      description:
        'Limited pattern match against current heuristics. Maintain monitoring, refresh risk picture weekly, and ensure surge contacts are current.',
      priority: 'medium',
      category: 'short_term',
      confidence: 55,
      actions: [
        'Review open incidents and unresolved hotspots',
        'Test escalation contacts and notification trees',
        'Run a tabletop exercise for likely scenarios in the next 30 days',
      ],
      resources: ['Operations desk', 'Regional leads', 'Communications'],
      timeline: 'Ongoing',
      successProbability: 60,
      riskLevel: 'low',
    };
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

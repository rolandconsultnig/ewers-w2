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

        // Single-incident plans must not reuse generic portfolio cards (they read the same for every incident).
        const recommendations = this.buildIncidentTailoredRecommendations(incident).sort(
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

  private buildPlanNarrative(
    incident: {
      id: number;
      title?: string;
      severity?: string;
      region?: string | null;
      category?: string | null;
      status?: string | null;
      description?: string;
    },
    count: number,
  ): string {
    const t = incident.title || 'this incident';
    const sev = (incident.severity || 'medium').toLowerCase();
    const reg = incident.region ? ` in ${incident.region}` : '';
    const cat = incident.category ? ` Category: ${incident.category}.` : '';
    const st = incident.status ? ` Status: ${incident.status}.` : '';
    const ex = this.situationExcerpt(incident.description, 140);
    const context = ex ? ` Reported context (abridged): ${ex}` : '';
    return (
      `Suggested response plan for incident #${incident.id} — “${t}”${reg} (${sev} severity).${cat}${st}${context} ` +
      `${count} action themes below are keyed to this record—prioritize verification, civilian protection, and coordinated dialogue. ` +
      `AI-assisted decision support only; validate before deployment.`
    );
  }

  private situationExcerpt(description: string | undefined, max = 160): string {
    if (!description?.trim()) return '';
    const one = description.replace(/\s+/g, ' ').trim();
    return one.length <= max ? one : `${one.slice(0, Math.max(0, max - 1))}…`;
  }

  /** Context-specific action bullets from free text + category (unique per incident). */
  private deriveContextualActions(
    cat: string,
    desc: string,
    title: string,
    loc: string,
  ): string[] {
    const actions: string[] = [];
    const d = desc.toLowerCase();

    const push = (s: string) => {
      if (!actions.includes(s)) actions.push(s);
    };

    if (d.includes('kidnap') || d.includes('abduct') || cat.includes('kidnap')) {
      push(`For “${title}” in ${loc}: prioritize victim-centred safety, secure channels with families, and structured law-enforcement coordination—avoid public details that could endanger captives.`);
    }
    if (d.includes('bandit') || d.includes('armed attack') || cat.includes('bandit') || cat.includes('violence')) {
      push(`Given reported armed violence around ${loc}, coordinate patrol patterns, civilian evacuation routes, and intelligence fusion specific to this incident’s geography.`);
    }
    if (d.includes('farmer') || d.includes('herder') || d.includes('grazing') || cat.includes('farmer') || cat.includes('land')) {
      push(`Address farmer–herder or land-use dynamics for this case: convene traditional and statutory actors, clarify grazing/farm boundaries, and schedule joint fact-finding in ${loc}.`);
    }
    if (d.includes('flood') || d.includes('storm') || d.includes('fire ') || cat.includes('natural') || cat.includes('disaster')) {
      push(`Align life-saving priorities for this event in ${loc}: shelter, WASH, health surge, and damage assessment tied to the reported hazard in the incident description.`);
    }
    if (d.includes('protest') || d.includes('riot') || d.includes('demonstration') || cat.includes('protest') || cat.includes('political')) {
      push(`Shape public-order measures for “${title}” around dialogue, proportionate policing, and safe assembly—map organizer contacts and medical/legal observation for this location.`);
    }
    if (d.includes('election') || d.includes('poll') || d.includes('vote')) {
      push(`Electoral context: secure polling and collation areas near ${loc}, train staff on dispute handling, and monitor hate speech tied to this incident’s narrative.`);
    }
    if (d.includes('sgbv') || d.includes('rape') || d.includes('sexual violence') || cat.includes('sgbv')) {
      push(`Activate GBV referral pathways for this case: safe reporting, clinical/psychosocial support, and protection from retaliation—coordinate with gender desks covering ${loc}.`);
    }
    if (d.includes('terror') || d.includes('bomb') || d.includes('explosion') || d.includes('insurgent')) {
      push(`High-impact security event: national–state fusion cell for ${loc}, controlled messaging, and counter-IED/force protection measures scaled to the described threat.`);
    }

    return actions.slice(0, 4);
  }

  private categoryTheme(incident: {
    id: number;
    title?: string;
    description?: string;
    location?: string | null;
    region?: string | null;
    category?: string | null;
    severity?: string;
  }): ResponseRecommendation {
    const id = incident.id;
    const title = incident.title || `Incident #${id}`;
    const loc = incident.location || incident.region || 'the affected area';
    const reg = incident.region || 'the region';
    const cat = (incident.category || 'general').toLowerCase();
    const desc = (incident.description || '').toLowerCase();
    const sev = (incident.severity || 'medium').toLowerCase();
    const pri: ResponseRecommendation['priority'] =
      sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low';

    const contextual = this.deriveContextualActions(cat, desc, title, loc);
    const excerpt = this.situationExcerpt(incident.description, 120);

    if (cat.includes('protest') || cat.includes('political') || desc.includes('protest') || desc.includes('demonstration')) {
      return {
        id: `theme_protest_${id}`,
        title: `Public order & dialogue — #${id} (${reg})`,
        description: `Incident “${title}” suggests assembly or political tension in ${loc}.${excerpt ? ` Context: ${excerpt}` : ''} Prioritize rights-respecting crowd management and de-escalation tailored to this report.`,
        priority: pri === 'low' ? 'medium' : 'high',
        category: 'short_term',
        confidence: 82,
        actions: [
          ...contextual,
          `Map stakeholder voices specific to “${title}” (traditional, youth, women, faith) in ${loc}.`,
          'Train responders on de-escalation, freedom of assembly, and media-safe updates.',
          'Pre-position medical and traffic management for the documented gathering pattern.',
        ].filter(Boolean).slice(0, 6),
        resources: ['Trained crowd units', 'Legal observers', 'Mediation team', 'Emergency medical', 'LGA desk'],
        timeline: '1–7 days',
        successProbability: 66,
        riskLevel: 'medium',
      };
    }

    if (cat.includes('natural') || cat.includes('disaster') || desc.includes('flood') || desc.includes('disaster')) {
      return {
        id: `theme_disaster_${id}`,
        title: `Humanitarian & recovery — #${id} (${loc})`,
        description: `Disaster-type report: “${title}”.${excerpt ? ` Details: ${excerpt}` : ''} Scale shelter, WASH, and health in ${reg} according to this incident’s scope.`,
        priority: 'high',
        category: 'immediate',
        confidence: 87,
        actions: [
          ...contextual,
          `Rapid needs assessment anchored on the described impacts for “${title}”.`,
          'Coordinate NEMA/state emergency desks and logistics corridors into ' + loc + '.',
          'Plan disease prevention and child protection in any collective sites opened for this event.',
        ].filter(Boolean).slice(0, 6),
        resources: ['NEMA/state EM', 'Health surge', 'WASH cluster', 'Logistics', 'Cash/voucher'],
        timeline: '0–72 hours',
        successProbability: 73,
        riskLevel: 'medium',
      };
    }

    if (cat.includes('economic')) {
      return {
        id: `theme_economic_${id}`,
        title: `Livelihoods & market stability — #${id}`,
        description: `Economic tension linked to “${title}” in ${loc}.${excerpt ? ` ${excerpt}` : ''} Stabilize prices, access, and grievances before they spill into violence.`,
        priority: 'medium',
        category: 'short_term',
        confidence: 76,
        actions: [
          ...contextual,
          `Assess market blockages and livelihood shocks referenced in this incident (${loc}).`,
          'Engage trade associations and regulators on short-term relief measures.',
          'Monitor for protest triggers tied to this economic flashpoint.',
        ].filter(Boolean).slice(0, 5),
        resources: ['Commerce/ministry liaison', 'Trade unions', 'Social protection', 'Police intel'],
        timeline: '1–6 weeks',
        successProbability: 64,
        riskLevel: 'medium',
      };
    }

    // Default: violence / armed conflict / general security
    return {
      id: `theme_security_${id}`,
      title: `Protection & stabilization — #${id} (${cat || 'security'})`,
      description: `“${title}” (${loc}, ${reg}) — category ${incident.category || 'unspecified'}.${excerpt ? ` Reported: ${excerpt}` : ''} Align security, protection, and justice responses to this specific narrative.`,
      priority: sev === 'low' ? 'medium' : 'high',
      category: 'short_term',
      confidence: 80,
      actions: [
        ...contextual,
        'Civilian-centred patrolling and safe corridors informed by this incident’s geography.',
        'Document for accountability where safe; coordinate with human rights monitors.',
        'Explore cooling-off or localized mediation matched to community structures in ' + loc + '.',
      ].filter(Boolean).slice(0, 6),
      resources: ['Security forces', 'Protection', 'Human rights', 'Justice sector', 'Local mediators'],
      timeline: '1–8 weeks',
      successProbability: 63,
      riskLevel: sev === 'critical' || sev === 'high' ? 'high' : 'medium',
    };
  }

  /** Always returns several items; every title and body is tied to incident id + text so plans differ across cases. */
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
    const reg = incident.region || 'the listed region';
    const title = incident.title || `Incident #${incident.id}`;
    const id = incident.id;
    const status = (incident.status || 'unknown').toLowerCase();
    const excerpt = this.situationExcerpt(incident.description, 130);

    const priorityImmediate: ResponseRecommendation['priority'] =
      sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low';

    const contextualFirst = this.deriveContextualActions(cat, desc, title, loc);

    const recs: ResponseRecommendation[] = [
      {
        id: `tailored_immediate_${id}`,
        title: `First-line response — Incident #${id}: ${title.length > 48 ? `${title.slice(0, 47)}…` : title}`,
        description: `Open the first window for “${title}” at ${loc} (${reg}). Severity ${sev}, status ${status}.${excerpt ? ` Summary from report: ${excerpt}` : ''} Verify facts before scaling assets.`,
        priority: priorityImmediate,
        category: 'immediate',
        confidence: Math.min(94, 88 + (sev === 'critical' ? 4 : 0)),
        actions: [
          ...(contextualFirst.length
            ? contextualFirst.slice(0, 2)
            : [
                `Dispatch verification to ${loc}: cross-check “${title}” with field contacts and official channels.`,
                `Stand up a named incident lead and sitrep rhythm for #${id} only (avoid generic portfolio queues).`,
              ]),
          sev === 'critical'
            ? `Treat #${id} as maximum alert: EOC activation, medical surge, and protected movement corridors in ${reg}.`
            : `Scale response to match ${sev} severity—reserve surge for confirmed escalation around ${loc}.`,
          `Log decisions against incident #${id} for after-action review.`,
        ],
        resources: ['Field liaison', 'Situation room', 'Security coordination', 'Medical standby', `Case log #${id}`],
        timeline: sev === 'critical' ? '0–2 hours' : '0–6 hours',
        successProbability: sev === 'critical' ? 82 : 76,
        riskLevel: sev === 'critical' || sev === 'high' ? 'high' : 'medium',
      },
      {
        id: `tailored_community_${id}`,
        title: `Community & comms — #${id} (${reg})`,
        description: `Reduce escalation around “${title}” in ${loc} using trusted networks.${excerpt ? ` Reference: ${excerpt}` : ''} Messaging should reflect this incident’s facts, not generic templates.`,
        priority: sev === 'critical' || sev === 'high' ? 'high' : 'medium',
        category: 'short_term',
        confidence: 83,
        actions: [
          `Identify credible messengers for communities near ${loc} who can speak to issues raised in “${title}”.`,
          'Counter harmful rumours with timed, factual updates (no operational detail that compromises safety).',
          `Map secondary flashpoints that could ignite from the same grievance chain as #${id}.`,
          'Offer safe reporting and feedback loops labelled for this incident so duplicates merge correctly.',
        ],
        resources: ['Community liaisons', 'Media monitoring', 'Mediation partners', 'Hotline'],
        timeline: '24 hours – 2 weeks',
        successProbability: 67,
        riskLevel: 'medium',
      },
    ];

    if (sev === 'critical' || sev === 'high') {
      recs.push({
        id: `tailored_escalation_${id}`,
        title: `Escalation control — #${id} (${sev})`,
        description: `Higher severity on record #${id} (“${title}”, ${loc}).${excerpt ? ` ${excerpt}` : ''} Focus on containment, civilian protection, and ordered de-escalation specific to this case.`,
        priority: sev === 'critical' ? 'critical' : 'high',
        category: 'immediate',
        confidence: 90,
        actions: [
          `Brief command on the distinct profile of #${id} versus other open incidents—avoid one-size response.`,
          'Pre-position trauma care and family tracing if the description indicates mass harm or displacement.',
          'Restrict use of indiscriminate force; document use-of-force against this incident’s timeline.',
          `Align humanitarian access requests to routes and checkpoints relevant to ${loc}.`,
        ],
        resources: ['Command cell', 'Trauma care', 'Humanitarian access', 'Legal advisor'],
        timeline: '0–12 hours',
        successProbability: 74,
        riskLevel: 'high',
      });
    }

    const theme = this.categoryTheme(incident);
    if (theme) {
      recs.push(theme);
    }

    recs.push({
      id: `tailored_monitor_${id}`,
      title: `Monitoring & AAR — #${id}`,
      description: `Track recurrence signals and lessons for “${title}” (${loc}).${status === 'resolved' ? ' Incident marked resolved—emphasize closure communications and residual risk.' : ' Incident still open—tie indicators to this ID in dashboards.'}`,
      priority: 'medium',
      category: 'long_term',
      confidence: 72,
      actions: [
        `Add #${id}-specific indicators (not only regional aggregates) to early-warning dashboards.`,
        'Schedule after-action review referencing this incident’s description and response timeline.',
        'Update SOPs where this case exposed gaps (comms, access, or coordination).',
        `Share anonymized lessons with prevention programming in ${reg}.`,
      ],
      resources: ['M&E', 'Regional analysts', 'Prevention leads'],
      timeline: '2–12 weeks',
      successProbability: 69,
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

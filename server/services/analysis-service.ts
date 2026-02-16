import { db } from "../db";
import { incidents, riskIndicators, riskAnalyses, alerts } from "@shared/schema";
import { and, eq, gte, desc, ne } from "drizzle-orm";
import { analyzeCrisisWithGPT } from "./ai-services";

/**
 * Analysis Service
 * 
 * This service provides AI-like analysis capabilities using rule-based methods
 * to analyze incidents, risk indicators, and other data to generate insights.
 */
export class AnalysisService {
  
  /**
   * Generate risk analysis - uses OpenAI GPT when configured, else rule-based
   */
  async generateRiskAnalysis(region: string, location?: string) {
    const gptResult = await analyzeCrisisWithGPT(region, location);
    if (gptResult.success && gptResult.data) {
      return {
        success: true,
        data: {
          ...gptResult.data,
          region: gptResult.data.region || region,
          location: gptResult.data.location || location || region,
          createdBy: 1,
        },
      };
    }

    try {
      // Get relevant incidents
      const activeIncidents = await db.select().from(incidents)
        .where(and(
          eq(incidents.region, region),
          location ? eq(incidents.location, location) : undefined,
          eq(incidents.status, 'active')
        ))
        .orderBy(desc(incidents.severity));
      
      // Get relevant risk indicators
      const relevantIndicators = await db.select().from(riskIndicators)
        .where(and(
          eq(riskIndicators.region, region),
          location ? eq(riskIndicators.location, location) : undefined,
          gte(riskIndicators.value, 60) // Only high-value indicators
        ))
        .orderBy(desc(riskIndicators.value));
      
      if (activeIncidents.length === 0 && relevantIndicators.length === 0) {
        return { success: false, message: "Insufficient data for analysis" };
      }
      
      // Determine overall severity
      let severity = 'low';
      if (activeIncidents.some(i => i.severity === 'high') || 
          relevantIndicators.some(i => i.value >= 80)) {
        severity = 'high';
      } else if (activeIncidents.some(i => i.severity === 'medium') || 
                relevantIndicators.some(i => i.value >= 70)) {
        severity = 'medium';
      }
      
      // Determine likelihood
      let likelihood = 'possible';
      if (relevantIndicators.length >= 3 && 
          relevantIndicators.filter(i => i.value >= 70).length >= 2) {
        likelihood = 'likely';
      } else if (relevantIndicators.length >= 5 && 
                relevantIndicators.filter(i => i.value >= 75).length >= 3) {
        likelihood = 'very_likely';
      } else if (relevantIndicators.length <= 1 || 
                relevantIndicators.every(i => i.value < 65)) {
        likelihood = 'unlikely';
      }
      
      // Determine impact
      let impact = 'moderate';
      if (activeIncidents.some(i => (i.impactedPopulation != null && i.impactedPopulation > 1000)) || 
          activeIncidents.filter(i => i.severity === 'high').length >= 2) {
        impact = 'severe';
      } else if (activeIncidents.some(i => (i.impactedPopulation != null && i.impactedPopulation > 500)) || 
                activeIncidents.some(i => i.severity === 'medium')) {
        impact = 'significant';
      } else if (activeIncidents.every(i => (i.impactedPopulation == null || i.impactedPopulation < 100)) && 
                activeIncidents.every(i => i.severity === 'low')) {
        impact = 'minor';
      }
      
      // Generate title
      const title = this.generateTitle(region, location, activeIncidents, relevantIndicators);
      
      // Generate description
      const description = this.generateDescription(region, location, activeIncidents, relevantIndicators);
      
      // Generate analysis
      const analysis = this.generateAnalysisText(activeIncidents, relevantIndicators, severity, likelihood, impact);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(activeIncidents, relevantIndicators, severity);
      
      // Determine timeframe
      let timeframe = 'medium_term';
      if (severity === 'high' && (likelihood === 'likely' || likelihood === 'very_likely')) {
        timeframe = 'immediate';
      } else if (severity === 'low' && likelihood === 'unlikely') {
        timeframe = 'long_term';
      }
      
      // Create risk analysis object
      const riskAnalysis = {
        title,
        description,
        analysis,
        severity,
        likelihood,
        impact,
        region,
        location: location || region,
        createdBy: 1, // Assuming admin user
        recommendations,
        timeframe,
      };
      
      return { success: true, data: riskAnalysis };
    } catch (error) {
      console.error("Error generating risk analysis:", error);
      return { success: false, message: "Error generating analysis" };
    }
  }
  
  /**
   * Generate a title for the risk analysis
   */
  private generateTitle(
    region: string, 
    location: string | undefined, 
    incidents: any[], 
    indicators: any[]
  ): string {
    const locationText = location || region;
    
    if (incidents.length > 0) {
      const mainIncident = incidents[0];
      const categoryMap: Record<string, string> = {
        'violence': 'Violent Conflict',
        'natural_disaster': 'Natural Disaster',
        'protest': 'Civil Unrest',
        'security': 'Security Situation',
        'fire': 'Fire Incident'
      };
      const categoryText = mainIncident.category ? 
        (categoryMap[mainIncident.category] || mainIncident.category) : 
        'Security Situation';
      
      return `${categoryText} Analysis for ${locationText}`;
    } else if (indicators.length > 0) {
      const topIndicator = indicators[0];
      return `${topIndicator.name} Risk Assessment for ${locationText}`;
    }
    
    return `Comprehensive Risk Analysis for ${locationText}`;
  }
  
  /**
   * Generate a description for the risk analysis
   */
  private generateDescription(
    region: string, 
    location: string | undefined, 
    incidents: any[], 
    indicators: any[]
  ): string {
    const locationText = location || region;
    
    if (incidents.length > 0 && indicators.length > 0) {
      return `Analysis of current situation in ${locationText} based on ${incidents.length} active incidents and ${indicators.length} risk indicators.`;
    } else if (incidents.length > 0) {
      return `Assessment of ongoing incidents in ${locationText} and their potential evolution.`;
    } else if (indicators.length > 0) {
      return `Evaluation of early warning signals and risk factors in ${locationText}.`;
    }
    
    return `Comprehensive analysis of security and risk factors in ${locationText}.`;
  }
  
  /**
   * Generate analysis text based on incidents and indicators
   */
  private generateAnalysisText(
    incidents: any[], 
    indicators: any[],
    severity: string,
    likelihood: string,
    impact: string
  ): string {
    let analysis = '';
    
    // Add incident-based analysis
    if (incidents.length > 0) {
      analysis += `Analysis based on ${incidents.length} active incidents indicates a ${severity} severity situation. `;
      
      const violentIncidents = incidents.filter(i => i.category === 'violence' || i.severity === 'high');
      if (violentIncidents.length > 0) {
        analysis += `Violent incidents in ${violentIncidents.map(i => i.location).join(', ')} represent significant concern. `;
      }
      
      const totalAffected = incidents.reduce((sum, incident) => sum + (incident.impactedPopulation || 0), 0);
      if (totalAffected > 0) {
        analysis += `Approximately ${totalAffected} individuals have been affected by current incidents. `;
      }
    }
    
    // Add indicator-based analysis
    if (indicators.length > 0) {
      analysis += `Risk indicators suggest ${likelihood} probability of escalation with ${impact} potential impact. `;
      
      const increasingTrends = indicators.filter(i => i.trend === 'increasing');
      if (increasingTrends.length > 0) {
        analysis += `${increasingTrends.length} indicators show worsening trends, particularly ${increasingTrends.map(i => i.name).slice(0, 2).join(' and ')}. `;
      }
      
      const highConfidence = indicators.filter(i => i.confidence >= 80);
      if (highConfidence.length > 0) {
        analysis += `High confidence in ${highConfidence.length} key risk factors. `;
      }
    }
    
    // Add contextual elements
    if (severity === 'high') {
      analysis += `Situation requires immediate attention and coordinated response effort. `;
    } else if (severity === 'medium') {
      analysis += `Situation warrants close monitoring and preparedness for response. `;
    } else {
      analysis += `Continuing situation monitoring recommended. `;
    }
    
    return analysis;
  }
  
  /**
   * Generate recommendations based on incidents and indicators
   */
  private generateRecommendations(
    incidents: any[], 
    indicators: any[],
    severity: string
  ): string {
    let recommendations = '';
    
    if (severity === 'high') {
      recommendations += 'Immediate deployment of response teams. ';
      
      if (incidents.some(i => i.category === 'violence')) {
        recommendations += 'Enhance security presence in affected areas. Deploy conflict resolution specialists. ';
      }
      
      if (incidents.some(i => i.category === 'natural_disaster')) {
        recommendations += 'Activate emergency evacuation plans. Prepare humanitarian assistance packages. ';
      }
      
      recommendations += 'Establish coordination center for ongoing monitoring and response. ';
    } else if (severity === 'medium') {
      recommendations += 'Increase monitoring frequency. Alert relevant response teams for potential deployment. ';
      
      if (indicators.some(i => i.category === 'political')) {
        recommendations += 'Engage with community leaders and stakeholders for de-escalation. ';
      }
      
      if (indicators.some(i => i.category === 'environmental')) {
        recommendations += 'Review preparedness measures for potential environmental impacts. ';
      }
      
      recommendations += 'Prepare public communication strategy for potential developments. ';
    } else {
      recommendations += 'Maintain routine monitoring. Review existing prevention measures. ';
      recommendations += 'Update contingency plans based on latest risk assessment. ';
    }
    
    return recommendations;
  }
  
  /**
   * Generate automatic alerts based on risk analysis
   */
  async generateAlerts(riskAnalysisId: number) {
    try {
      // Get the risk analysis
      const [riskAnalysis] = await db.select().from(riskAnalyses)
        .where(eq(riskAnalyses.id, riskAnalysisId));
      
      if (!riskAnalysis) {
        return { success: false, message: "Risk analysis not found" };
      }
      
      // Only generate alerts for high and medium severity analyses
      if (riskAnalysis.severity !== 'high' && riskAnalysis.severity !== 'medium') {
        return { success: false, message: "Alert generation not needed for low severity analysis" };
      }
      
      // Get related incidents
      const relatedIncidents = await db.select().from(incidents)
        .where(and(
          eq(incidents.region, riskAnalysis.region),
          riskAnalysis.location ? eq(incidents.location, riskAnalysis.location) : undefined,
          eq(incidents.status, 'active')
        ))
        .orderBy(desc(incidents.severity))
        .limit(1);
      
      // Determine escalation level
      let escalationLevel = 1;
      if (riskAnalysis.severity === 'high' && riskAnalysis.likelihood === 'very_likely') {
        escalationLevel = 3;
      } else if (riskAnalysis.severity === 'high' || 
                (riskAnalysis.severity === 'medium' && riskAnalysis.likelihood === 'very_likely')) {
        escalationLevel = 2;
      }
      
      // Generate alert title
      let title = '';
      if (escalationLevel === 3) {
        title = `URGENT: ${riskAnalysis.title}`;
      } else if (escalationLevel === 2) {
        title = `Warning: ${riskAnalysis.title}`;
      } else {
        title = `Alert: ${riskAnalysis.title}`;
      }
      
      // Create alert object
      const alert = {
        title,
        description: `${riskAnalysis.description} ${riskAnalysis.recommendations.substring(0, 100)}...`,
        severity: riskAnalysis.severity,
        status: 'active',
        region: riskAnalysis.region,
        location: riskAnalysis.location,
        incidentId: relatedIncidents.length > 0 ? relatedIncidents[0].id : null,
        escalationLevel: escalationLevel,
        channels: ['email', 'app'],
      };
      
      return { success: true, data: alert };
    } catch (error) {
      console.error("Error generating alert:", error);
      return { success: false, message: "Error generating alert" };
    }
  }
  
  /**
   * Analyze an incident to identify patterns and related risks
   */
  async analyzeIncident(incidentId: number) {
    try {
      // Get the incident
      const [incident] = await db.select().from(incidents)
        .where(eq(incidents.id, incidentId));
      
      if (!incident) {
        return { success: false, message: "Incident not found" };
      }
      
      // Get related incidents in the same area
      const relatedIncidents = await db.select().from(incidents)
        .where(and(
          eq(incidents.region, incident.region),
          incident.state ? eq(incidents.state, incident.state) : undefined,
          ne(incidents.id, incidentId)
        ))
        .limit(5);
      
      // Get relevant risk indicators
      const relevantIndicators = await db.select().from(riskIndicators)
        .where(and(
          eq(riskIndicators.region, incident.region),
          incident.state ? eq(riskIndicators.state, incident.state) : undefined
        ))
        .orderBy(desc(riskIndicators.value))
        .limit(5);
      
      // Generate analysis
      let analysis = {
        incident: incident,
        summary: this.generateIncidentSummary(incident),
        relatedIncidents: relatedIncidents,
        relatedIndicators: relevantIndicators,
        patterns: this.identifyPatterns(incident, relatedIncidents),
        potentialEscalation: this.assessEscalationPotential(incident, relevantIndicators),
        recommendedActions: this.recommendIncidentActions(incident)
      };
      
      return { success: true, data: analysis };
    } catch (error) {
      console.error("Error analyzing incident:", error);
      return { success: false, message: "Error analyzing incident" };
    }
  }
  
  /**
   * Generate a summary of an incident
   */
  private generateIncidentSummary(incident: any): string {
    let summary = `${incident.title} occurred in ${incident.location}, ${incident.state || incident.region}. `;
    
    summary += `This ${incident.severity} severity incident is currently ${incident.status}. `;
    
    if (incident.impactedPopulation) {
      summary += `Approximately ${incident.impactedPopulation} individuals have been affected. `;
    }
    
    if (incident.category) {
      const categoryMap: Record<string, string> = {
        'violence': 'This violent incident',
        'natural_disaster': 'This natural disaster',
        'protest': 'This protest activity',
        'security': 'This security incident',
        'fire': 'This fire incident'
      };
      
      const categoryPhrase = categoryMap[incident.category] || 'This incident';
      summary += `${categoryPhrase} requires attention based on its characteristics and context. `;
    }
    
    return summary;
  }
  
  /**
   * Identify patterns based on the incident and related incidents
   */
  private identifyPatterns(incident: any, relatedIncidents: any[]): string {
    if (relatedIncidents.length === 0) {
      return "No related incidents found to establish patterns.";
    }
    
    let patterns = '';
    
    // Check for category patterns
    const sameCategoryIncidents = relatedIncidents.filter(i => i.category === incident.category);
    if (sameCategoryIncidents.length > 0) {
      patterns += `${sameCategoryIncidents.length} similar ${incident.category} incidents recorded in the region. `;
    }
    
    // Check for location patterns
    const sameLocationIncidents = relatedIncidents.filter(i => i.location === incident.location);
    if (sameLocationIncidents.length > 0) {
      patterns += `Location has experienced ${sameLocationIncidents.length} previous incidents. `;
    }
    
    // Check for escalation patterns
    const severeIncidents = relatedIncidents.filter(i => i.severity === 'high');
    if (severeIncidents.length > 0) {
      patterns += `${severeIncidents.length} high-severity incidents have occurred in this region recently. `;
    }
    
    if (patterns === '') {
      patterns = "No clear patterns identified from related incidents.";
    }
    
    return patterns;
  }
  
  /**
   * Assess the potential for escalation
   */
  private assessEscalationPotential(incident: any, indicators: any[]): string {
    if (indicators.length === 0) {
      return "Insufficient risk indicators to assess escalation potential.";
    }
    
    let assessment = '';
    
    // High risk indicators
    const highRiskIndicators = indicators.filter(i => i.value >= 75);
    if (highRiskIndicators.length > 0) {
      assessment += `${highRiskIndicators.length} high-level risk indicators present in the area. `;
    }
    
    // Increasing trends
    const increasingTrends = indicators.filter(i => i.trend === 'increasing');
    if (increasingTrends.length > 0) {
      assessment += `${increasingTrends.length} risk factors show increasing trends. `;
    }
    
    // Assess based on incident characteristics
    if (incident.severity === 'high') {
      assessment += "Incident characteristics suggest high potential for further developments. ";
    } else if (incident.severity === 'medium') {
      assessment += "Moderate potential for escalation based on incident severity. ";
    } else {
      assessment += "Low immediate escalation potential based on incident characteristics. ";
    }
    
    // Overall assessment
    if (highRiskIndicators.length >= 2 || increasingTrends.length >= 3) {
      assessment += "Overall assessment: HIGH escalation potential.";
    } else if (highRiskIndicators.length >= 1 || increasingTrends.length >= 1) {
      assessment += "Overall assessment: MEDIUM escalation potential.";
    } else {
      assessment += "Overall assessment: LOW escalation potential.";
    }
    
    return assessment;
  }
  
  /**
   * Recommend actions based on the incident
   */
  private recommendIncidentActions(incident: any): string {
    let recommendations = '';
    
    // Base recommendations on severity
    if (incident.severity === 'high') {
      recommendations += "Immediate response required. ";
      recommendations += "Activate relevant response teams. ";
      recommendations += "Establish coordination center. ";
      
      // Category-specific recommendations
      if (incident.category === 'violence') {
        recommendations += "Deploy security teams and conflict resolution specialists. ";
        recommendations += "Initiate community protection measures. ";
      } else if (incident.category === 'natural_disaster') {
        recommendations += "Initiate evacuation protocols where necessary. ";
        recommendations += "Deploy search and rescue teams. ";
        recommendations += "Establish emergency shelter and aid distribution. ";
      } else if (incident.category === 'security') {
        recommendations += "Coordinate with security agencies. ";
        recommendations += "Implement protection measures for vulnerable populations. ";
      }
      
      recommendations += "Conduct comprehensive risk analysis. ";
    } else if (incident.severity === 'medium') {
      recommendations += "Increase monitoring and prepare response capabilities. ";
      recommendations += "Alert relevant response teams. ";
      
      // Category-specific recommendations
      if (incident.category === 'violence') {
        recommendations += "Engage community leaders for de-escalation. ";
        recommendations += "Prepare conflict resolution resources. ";
      } else if (incident.category === 'protest') {
        recommendations += "Monitor for potential escalation. ";
        recommendations += "Establish communication channels with protest leaders. ";
      } else if (incident.category === 'fire') {
        recommendations += "Ensure fire response resources are ready. ";
        recommendations += "Prepare evacuation plans if needed. ";
      }
      
      recommendations += "Assess need for further analysis and prevention measures. ";
    } else {
      recommendations += "Monitor situation developments. ";
      recommendations += "Document incident details for pattern analysis. ";
      recommendations += "Review prevention and preparedness measures. ";
    }
    
    return recommendations;
  }
}

export const analysisService = new AnalysisService();
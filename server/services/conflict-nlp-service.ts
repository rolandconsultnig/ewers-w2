/**
 * Conflict NLP Service
 * AI-powered NLP tools for conflict/peace indication analysis and statement screening
 */

import natural from "natural";
import Sentiment from "sentiment";

const sentiment = new Sentiment();
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

interface ConflictAnalysis {
  conflictScore: number; // 0-100, higher = more conflict
  peaceScore: number; // 0-100, higher = more peace
  sentiment: {
    score: number;
    comparative: number;
    label: "positive" | "negative" | "neutral";
  };
  indicators: {
    violence: string[];
    tension: string[];
    peace: string[];
    humanitarian: string[];
  };
  riskLevel: "low" | "medium" | "high" | "critical";
  keywords: string[];
  entities: {
    locations: string[];
    groups: string[];
    actors: string[];
  };
}

// Conflict indicator dictionaries
const VIOLENCE_INDICATORS = [
  "kill", "killed", "death", "dead", "murder", "slaughter", "massacre",
  "shoot", "shot", "gun", "weapon", "armed", "bomb", "explosion", "blast",
  "attack", "assault", "raid", "ambush", "strike", "offensive",
  "boko haram", "iswap", "ansaru", "bandit", "terrorist", "insurgent", "militant",
  "kidnap", "abduct", "hostage", "ransom", "captive",
  "rape", "sexual violence", "sgbv", "assault", "abuse"
];

const TENSION_INDICATORS = [
  "tension", "unrest", "protest", "demonstration", "riot", "clash",
  "conflict", "dispute", "confrontation", "standoff",
  "ethnic", "communal", "sectarian", "religious",
  "farmer", "herder", "land dispute", "boundary",
  "crisis", "emergency", "alert", "warning"
];

const PEACE_INDICATORS = [
  "peace", "peaceful", "reconciliation", "dialogue", "negotiation",
  "ceasefire", "truce", "agreement", "treaty", "accord",
  "mediation", "resolution", "settlement", "cooperation",
  "stability", "calm", "de-escalation", "disarmament"
];

const HUMANITARIAN_INDICATORS = [
  "displaced", "refugee", "idp", "camp", "shelter",
  "humanitarian", "aid", "relief", "assistance",
  "food security", "malnutrition", "hunger", "famine",
  "health", "medical", "clinic", "hospital",
  "water", "sanitation", "hygiene"
];

// Nigerian locations
const NIGERIAN_LOCATIONS = [
  "abuja", "lagos", "kano", "kaduna", "port harcourt", "ibadan", "benin",
  "maiduguri", "jos", "ilorin", "enugu", "aba", "onitsha", "warri",
  "sokoto", "katsina", "zamfara", "borno", "yobe", "adamawa",
  "plateau", "benue", "taraba", "niger", "nasarawa", "kogi",
  "sambisa", "lake chad", "niger delta"
];

// Armed groups and actors
const ARMED_GROUPS = [
  "boko haram", "iswap", "ansaru", "ipp", "bandits",
  "fulani", "herders", "farmers", "ipob", "massob",
  "niger delta avengers", "militants", "insurgents"
];

export class ConflictNLPService {
  /**
   * Analyze text for conflict/peace indicators
   */
  analyzeConflict(text: string): ConflictAnalysis {
    const lowerText = text.toLowerCase();
    const tokens = tokenizer.tokenize(lowerText) || [];

    // Sentiment analysis
    const sentimentResult = sentiment.analyze(text);
    const sentimentLabel = 
      sentimentResult.score > 2 ? "positive" :
      sentimentResult.score < -2 ? "negative" : "neutral";

    // Extract indicators
    const violenceIndicators = VIOLENCE_INDICATORS.filter(ind => 
      lowerText.includes(ind)
    );
    const tensionIndicators = TENSION_INDICATORS.filter(ind => 
      lowerText.includes(ind)
    );
    const peaceIndicators = PEACE_INDICATORS.filter(ind => 
      lowerText.includes(ind)
    );
    const humanitarianIndicators = HUMANITARIAN_INDICATORS.filter(ind => 
      lowerText.includes(ind)
    );

    // Calculate conflict score (0-100)
    const violenceWeight = violenceIndicators.length * 10;
    const tensionWeight = tensionIndicators.length * 5;
    const sentimentWeight = sentimentResult.score < 0 ? Math.abs(sentimentResult.score) * 3 : 0;
    const conflictScore = Math.min(100, violenceWeight + tensionWeight + sentimentWeight);

    // Calculate peace score (0-100)
    const peaceWeight = peaceIndicators.length * 10;
    const positiveSentimentWeight = sentimentResult.score > 0 ? sentimentResult.score * 3 : 0;
    const peaceScore = Math.min(100, peaceWeight + positiveSentimentWeight);

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical";
    if (conflictScore >= 70) riskLevel = "critical";
    else if (conflictScore >= 50) riskLevel = "high";
    else if (conflictScore >= 30) riskLevel = "medium";
    else riskLevel = "low";

    // Extract entities
    const locations = NIGERIAN_LOCATIONS.filter(loc => lowerText.includes(loc));
    const groups = ARMED_GROUPS.filter(group => lowerText.includes(group));

    // Extract keywords using TF-IDF
    const tfidf = new TfIdf();
    tfidf.addDocument(text);
    const keywords: string[] = [];
    tfidf.listTerms(0).slice(0, 10).forEach(item => {
      keywords.push(item.term);
    });

    return {
      conflictScore,
      peaceScore,
      sentiment: {
        score: sentimentResult.score,
        comparative: sentimentResult.comparative,
        label: sentimentLabel,
      },
      indicators: {
        violence: violenceIndicators,
        tension: tensionIndicators,
        peace: peaceIndicators,
        humanitarian: humanitarianIndicators,
      },
      riskLevel,
      keywords,
      entities: {
        locations,
        groups,
        actors: groups, // For now, groups are actors
      },
    };
  }

  /**
   * Screen statement for conflict/peace content
   */
  screenStatement(statement: string): {
    isConflictRelated: boolean;
    confidence: number;
    analysis: ConflictAnalysis;
    recommendation: "accept" | "review" | "reject";
  } {
    const analysis = this.analyzeConflict(statement);
    
    // Determine if conflict-related
    const totalIndicators = 
      analysis.indicators.violence.length +
      analysis.indicators.tension.length +
      analysis.indicators.humanitarian.length;
    
    const isConflictRelated = totalIndicators > 0 || analysis.conflictScore > 20;
    
    // Calculate confidence (0-100)
    const confidence = Math.min(100, 
      (totalIndicators * 15) + 
      (analysis.entities.locations.length * 10) +
      (analysis.entities.groups.length * 15)
    );

    // Recommendation
    let recommendation: "accept" | "review" | "reject";
    if (isConflictRelated && confidence >= 70) {
      recommendation = "accept";
    } else if (isConflictRelated && confidence >= 40) {
      recommendation = "review";
    } else {
      recommendation = "reject";
    }

    return {
      isConflictRelated,
      confidence,
      analysis,
      recommendation,
    };
  }

  /**
   * Batch analyze multiple texts
   */
  batchAnalyze(texts: string[]): ConflictAnalysis[] {
    return texts.map(text => this.analyzeConflict(text));
  }

  /**
   * Extract conflict events from text
   */
  extractConflictEvents(text: string): Array<{
    type: string;
    description: string;
    location?: string;
    actors?: string[];
    severity: "low" | "medium" | "high" | "critical";
  }> {
    const analysis = this.analyzeConflict(text);
    const events: Array<{
      type: string;
      description: string;
      location?: string;
      actors?: string[];
      severity: "low" | "medium" | "high" | "critical";
    }> = [];

    // Extract violence events
    if (analysis.indicators.violence.length > 0) {
      events.push({
        type: "violence",
        description: `Violence indicators detected: ${analysis.indicators.violence.join(", ")}`,
        location: analysis.entities.locations[0],
        actors: analysis.entities.groups,
        severity: analysis.riskLevel,
      });
    }

    // Extract tension events
    if (analysis.indicators.tension.length > 0) {
      events.push({
        type: "tension",
        description: `Tension indicators detected: ${analysis.indicators.tension.join(", ")}`,
        location: analysis.entities.locations[0],
        actors: analysis.entities.groups,
        severity: analysis.riskLevel === "critical" ? "high" : analysis.riskLevel,
      });
    }

    return events;
  }

  /**
   * Compare two texts for similarity (useful for duplicate detection)
   */
  calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(tokenizer.tokenize(text1.toLowerCase()) || []);
    const tokens2 = new Set(tokenizer.tokenize(text2.toLowerCase()) || []);
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
}

export const conflictNLPService = new ConflictNLPService();

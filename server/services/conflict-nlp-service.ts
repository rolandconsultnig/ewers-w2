/**
 * Conflict NLP Service
 * AI-powered NLP tools for conflict/peace indication analysis and statement screening
 */

import natural from "natural";
import Sentiment from "sentiment";
import { storage } from "../storage";

const sentiment = new Sentiment();
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

export const CONFLICT_INDICATORS_SETTING_CATEGORY = "conflict_indicators";
export const CONFLICT_INDICATORS_SETTING_KEY = "dictionary";

export interface ConflictIndicatorConfig {
  violence: string[];
  tension: string[];
  peace: string[];
  humanitarian: string[];
}

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
export const DEFAULT_VIOLENCE_INDICATORS = [
  "violence",
  "kill", "killed", "death", "dead", "murder", "slaughter", "massacre",
  "shoot", "shot", "gun", "weapon", "armed", "bomb", "explosion", "blast",
  "attack", "assault", "raid", "ambush", "strike", "offensive",
  "boko haram", "iswap", "ansaru", "bandit", "terrorist", "insurgent", "militant", "ipp",
  "kidnap", "abduct", "hostage", "ransom", "captive",
  "rape", "sexual violence", "gender-based violence", "sgbv", "assault", "abuse",
  "security", "military", "police", "army", "gunmen",
  "casualty", "injur",
];

export const DEFAULT_TENSION_INDICATORS = [
  "tension", "unrest", "protest", "demonstration", "riot", "clash",
  "conflict", "dispute", "confrontation", "standoff",
  "ethnic", "communal", "sectarian", "religious",
  "farmer", "herder", "land dispute", "boundary",
  "crisis", "emergency", "alert", "warning"
];

export const DEFAULT_PEACE_INDICATORS = [
  "peace", "peaceful", "reconciliation", "dialogue", "negotiation",
  "ceasefire", "truce", "agreement", "treaty", "accord",
  "mediation", "resolution", "settlement", "cooperation",
  "stability", "calm", "de-escalation", "disarmament"
];

export const DEFAULT_HUMANITARIAN_INDICATORS = [
  "displaced", "refugee", "idp", "camp", "shelter",
  "humanitarian", "aid", "relief", "assistance",
  "displace",
  "food security", "malnutrition", "hunger", "famine",
  "health", "medical", "clinic", "hospital",
  "water", "sanitation", "hygiene",
  "human rights"
];

export const DEFAULT_CONFLICT_INDICATOR_CONFIG: ConflictIndicatorConfig = {
  violence: DEFAULT_VIOLENCE_INDICATORS,
  tension: DEFAULT_TENSION_INDICATORS,
  peace: DEFAULT_PEACE_INDICATORS,
  humanitarian: DEFAULT_HUMANITARIAN_INDICATORS,
};

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
  private cachedIndicatorConfig: ConflictIndicatorConfig | null = null;
  private cachedIndicatorConfigLoadedAt = 0;
  private indicatorConfigLoadPromise: Promise<ConflictIndicatorConfig> | null = null;
  private static readonly INDICATOR_CONFIG_CACHE_TTL_MS = 10_000;

  private normalizeIndicators(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return input
      .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter(Boolean);
  }

  private async getIndicatorConfig(): Promise<ConflictIndicatorConfig> {
    const now = Date.now();
    if (
      this.cachedIndicatorConfig &&
      now - this.cachedIndicatorConfigLoadedAt < ConflictNLPService.INDICATOR_CONFIG_CACHE_TTL_MS
    ) {
      return this.cachedIndicatorConfig;
    }

    if (this.indicatorConfigLoadPromise) return this.indicatorConfigLoadPromise;

    this.indicatorConfigLoadPromise = (async () => {
      const row = await storage.getSettingByKey(CONFLICT_INDICATORS_SETTING_CATEGORY, CONFLICT_INDICATORS_SETTING_KEY);
      const storedValue = row?.value as any;

      const defaults = DEFAULT_CONFLICT_INDICATOR_CONFIG;
      const violence = storedValue && "violence" in storedValue ? this.normalizeIndicators(storedValue.violence) : defaults.violence;
      const tension = storedValue && "tension" in storedValue ? this.normalizeIndicators(storedValue.tension) : defaults.tension;
      const peace = storedValue && "peace" in storedValue ? this.normalizeIndicators(storedValue.peace) : defaults.peace;
      const humanitarian =
        storedValue && "humanitarian" in storedValue
          ? this.normalizeIndicators(storedValue.humanitarian)
          : defaults.humanitarian;

      const config: ConflictIndicatorConfig = {
        violence,
        tension,
        peace,
        humanitarian,
      };

      this.cachedIndicatorConfig = config;
      this.cachedIndicatorConfigLoadedAt = Date.now();
      this.indicatorConfigLoadPromise = null;
      return config;
    })().catch((e) => {
      // If settings aren't available, keep the service working with defaults.
      this.indicatorConfigLoadPromise = null;
      return DEFAULT_CONFLICT_INDICATOR_CONFIG;
    });

    return this.indicatorConfigLoadPromise;
  }

  /**
   * Analyze text for conflict/peace indicators
   */
  async analyzeConflict(text: string): Promise<ConflictAnalysis> {
    const indicatorConfig = await this.getIndicatorConfig();
    const lowerText = text.toLowerCase();
    tokenizer.tokenize(lowerText) || [];

    // Sentiment analysis
    const sentimentResult = sentiment.analyze(text);
    const sentimentLabel = 
      sentimentResult.score > 2 ? "positive" :
      sentimentResult.score < -2 ? "negative" : "neutral";

    // Extract indicators
    const violenceIndicators = indicatorConfig.violence.filter(ind => 
      lowerText.includes(ind)
    );
    const tensionIndicators = indicatorConfig.tension.filter(ind => 
      lowerText.includes(ind)
    );
    const peaceIndicators = indicatorConfig.peace.filter(ind => 
      lowerText.includes(ind)
    );
    const humanitarianIndicators = indicatorConfig.humanitarian.filter(ind => 
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
  async screenStatement(statement: string): Promise<{
    isConflictRelated: boolean;
    confidence: number;
    analysis: ConflictAnalysis;
    recommendation: "accept" | "review" | "reject";
  }> {
    const analysis = await this.analyzeConflict(statement);
    
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
  async batchAnalyze(texts: string[]): Promise<ConflictAnalysis[]> {
    return Promise.all(texts.map((text) => this.analyzeConflict(text)));
  }

  /**
   * Extract conflict events from text
   */
  async extractConflictEvents(text: string): Promise<Array<{
    type: string;
    description: string;
    location?: string;
    actors?: string[];
    severity: "low" | "medium" | "high" | "critical";
  }>> {
    const analysis = await this.analyzeConflict(text);
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

/**
 * AI Analysis Routes
 * NLP and AI-powered conflict analysis endpoints
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { conflictNLPService } from "../services/conflict-nlp-service";
import { createWebScraperService } from "../services/web-scraper-service";
import { patternDetectionService } from "../services/pattern-detection-service";
import { peaceIndicatorsService } from "../services/peace-indicators-service";
import { responseAdvisorService } from "../services/response-advisor-service";

export function setupAIAnalysisRoutes(app: Router, storage: IStorage) {
  const webScraperService = createWebScraperService(storage);

  // Analyze text for conflict indicators
  app.post("/api/ai/analyze-conflict", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const analysis = conflictNLPService.analyzeConflict(text);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing conflict:", error);
      res.status(500).json({ error: "Failed to analyze text" });
    }
  });

  // Screen statement for conflict content
  app.post("/api/ai/screen-statement", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { statement } = req.body;

    if (!statement || typeof statement !== "string") {
      return res.status(400).json({ error: "Statement is required" });
    }

    try {
      const screening = conflictNLPService.screenStatement(statement);
      res.json(screening);
    } catch (error) {
      console.error("Error screening statement:", error);
      res.status(500).json({ error: "Failed to screen statement" });
    }
  });

  // Batch analyze multiple texts
  app.post("/api/ai/batch-analyze", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { texts } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: "Texts array is required" });
    }

    try {
      const analyses = conflictNLPService.batchAnalyze(texts);
      res.json(analyses);
    } catch (error) {
      console.error("Error batch analyzing:", error);
      res.status(500).json({ error: "Failed to batch analyze texts" });
    }
  });

  // Extract conflict events from text
  app.post("/api/ai/extract-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const events = conflictNLPService.extractConflictEvents(text);
      res.json(events);
    } catch (error) {
      console.error("Error extracting events:", error);
      res.status(500).json({ error: "Failed to extract events" });
    }
  });

  // Scrape web for real-time conflict content
  app.post("/api/ai/scrape-web", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    
    // Only admins and analysts can trigger web scraping
    if (user.role !== "admin" && user.role !== "analyst" && user.securityLevel < 4) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      // Run scraping in background
      res.json({ 
        message: "Web scraping started",
        status: "processing" 
      });

      // Execute scraping asynchronously
      (async () => {
        try {
          const content = await webScraperService.scrapeAllSources();
          console.log(`Scraped ${content.length} conflict-related items`);
          
          if (content.length > 0) {
            await webScraperService.storeScrapedContent(content);
          }
        } catch (error) {
          console.error("Background scraping error:", error);
        }
      })();
    } catch (error) {
      console.error("Error starting web scraping:", error);
      res.status(500).json({ error: "Failed to start web scraping" });
    }
  });

  // Get scraped content with AI analysis
  app.get("/api/ai/scraped-content", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
      const collectedData = await storage.getCollectedData();
      
      // Filter for web scraper source and apply limit
      const webScraperData = collectedData
        .filter(d => d.sourceId && d.status === "pending")
        .slice(0, limit);

      // Analyze each item
      const analyzed = webScraperData.map(item => {
        const content = typeof item.content === 'object' && item.content !== null
          ? JSON.stringify(item.content)
          : String(item.content || '');
        
        const analysis = conflictNLPService.analyzeConflict(content);
        
        return {
          ...item,
          analysis,
        };
      });

      res.json(analyzed);
    } catch (error) {
      console.error("Error fetching scraped content:", error);
      res.status(500).json({ error: "Failed to fetch scraped content" });
    }
  });

  // Auto-create incidents from high-confidence scraped content
  app.post("/api/ai/auto-create-incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    const { minConfidence = 70 } = req.body;

    try {
      const collectedData = await storage.getCollectedData();
      const webScraperData = collectedData.filter(d => d.status === "pending");

      const createdIncidents = [];

      for (const item of webScraperData) {
        const content = typeof item.content === 'object' && item.content !== null
          ? JSON.stringify(item.content)
          : String(item.content || '');
        
        const screening = conflictNLPService.screenStatement(content);

        if (screening.confidence >= minConfidence && screening.recommendation === "accept") {
          // Extract title and description
          const contentObj = typeof item.content === 'object' ? item.content as any : {};
          const title = contentObj.title || `Auto-detected conflict event`;
          const description = contentObj.content || content.substring(0, 500);

          // Create incident
          const incident = await storage.createIncident({
            title,
            description,
            location: item.location || "Nigeria",
            region: item.region || "Nigeria",
            severity: screening.analysis.riskLevel === "critical" ? "critical" :
                     screening.analysis.riskLevel === "high" ? "high" :
                     screening.analysis.riskLevel === "medium" ? "medium" : "low",
            status: "pending",
            category: "conflict",
            reportedBy: user.id,
            sourceId: item.sourceId,
            verificationStatus: "unverified",
            impactedPopulation: 0,
            coordinates: item.coordinates || {},
            mediaUrls: [],
          });

          createdIncidents.push(incident);

          // Mark collected data as processed
          await storage.updateCollectedData(item.id, { status: "processed" });
        }
      }

      res.json({
        message: `Created ${createdIncidents.length} incidents from scraped content`,
        count: createdIncidents.length,
        incidents: createdIncidents,
      });
    } catch (error) {
      console.error("Error auto-creating incidents:", error);
      res.status(500).json({ error: "Failed to auto-create incidents" });
    }
  });

  // Calculate text similarity (for duplicate detection)
  app.post("/api/ai/calculate-similarity", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { text1, text2 } = req.body;

    if (!text1 || !text2) {
      return res.status(400).json({ error: "Both text1 and text2 are required" });
    }

    try {
      const similarity = conflictNLPService.calculateSimilarity(text1, text2);
      res.json({ 
        similarity,
        isDuplicate: similarity > 0.7,
        confidence: Math.round(similarity * 100)
      });
    } catch (error) {
      console.error("Error calculating similarity:", error);
      res.status(500).json({ error: "Failed to calculate similarity" });
    }
  });

  // Pattern Detection - Detect emerging conflict patterns
  app.post("/api/ai/detect-patterns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { timeframeDays = 90 } = req.body;

    try {
      const patterns = await patternDetectionService.detectPatterns(timeframeDays);
      res.json(patterns);
    } catch (error) {
      console.error("Error detecting patterns:", error);
      res.status(500).json({ error: "Failed to detect conflict patterns" });
    }
  });

  // Peace Opportunity Indicators - Predict peace windows
  app.post("/api/ai/peace-opportunities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { timeframeDays = 90, region } = req.body;
    const days = Math.min(365, Math.max(7, Number(timeframeDays) || 90));

    try {
      const opportunities = await peaceIndicatorsService.predictPeaceOpportunities(days, region || undefined);
      res.json(opportunities);
    } catch (error) {
      console.error("Error predicting peace opportunities:", error);
      res.status(500).json({ error: "Failed to predict peace opportunities" });
    }
  });

  // Response Advisor - Generate AI recommendations
  app.post("/api/ai/response-recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { incidentId, region } = req.body;

    try {
      const recommendations = await responseAdvisorService.generateRecommendations(incidentId, region);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate response recommendations" });
    }
  });
}

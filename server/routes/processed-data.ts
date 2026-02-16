/**
 * Processed Data Routes
 * Endpoints for managing processed/analyzed data
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { insertProcessedDataSchema } from "@shared/schema";
import { z } from "zod";

export function setupProcessedDataRoutes(app: Router, storage: IStorage) {
  
  // Get all processed data
  app.get("/api/processed-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
      const method = req.query.method as string | undefined;
      
      const allData = await storage.getProcessedData();
      
      // Filter by processing method if provided
      let filteredData = method 
        ? allData.filter(d => d.processingMethod === method)
        : allData;
      
      // Apply limit
      filteredData = filteredData.slice(0, limit);
      
      res.json(filteredData);
    } catch (error) {
      console.error("Error fetching processed data:", error);
      res.status(500).json({ error: "Failed to fetch processed data" });
    }
  });

  // Get processed data by ID
  app.get("/api/processed-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const data = await storage.getProcessedDataById(id);
      
      if (!data) {
        return res.status(404).json({ error: "Processed data not found" });
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching processed data:", error);
      res.status(500).json({ error: "Failed to fetch processed data" });
    }
  });

  // Get processed data by raw data ID
  app.get("/api/processed-data/by-raw/:rawDataId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const rawDataId = parseInt(req.params.rawDataId);
      const allData = await storage.getProcessedData();
      
      const processedData = allData.filter(d => d.rawDataId === rawDataId);
      
      res.json(processedData);
    } catch (error) {
      console.error("Error fetching processed data by raw ID:", error);
      res.status(500).json({ error: "Failed to fetch processed data" });
    }
  });

  // Create processed data
  app.post("/api/processed-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertProcessedDataSchema.parse(req.body);
      const created = await storage.createProcessedData(validatedData);
      
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating processed data:", error);
      res.status(500).json({ error: "Failed to create processed data" });
    }
  });

  // Update processed data
  app.put("/api/processed-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getProcessedDataById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Processed data not found" });
      }
      
      const updated = await storage.updateProcessedData(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating processed data:", error);
      res.status(500).json({ error: "Failed to update processed data" });
    }
  });

  // Delete processed data
  app.delete("/api/processed-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    if (user.role !== "admin" && user.securityLevel < 5) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getProcessedDataById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Processed data not found" });
      }
      
      await storage.deleteProcessedData(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting processed data:", error);
      res.status(500).json({ error: "Failed to delete processed data" });
    }
  });

  // Get processed data statistics
  app.get("/api/processed-data/stats/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const allData = await storage.getProcessedData();
      
      const stats = {
        total: allData.length,
        byMethod: {} as Record<string, number>,
        avgConfidence: 0,
        avgRelevance: 0,
        highConfidence: 0, // confidence >= 80
        highRelevance: 0,  // relevance >= 80
      };
      
      let totalConfidence = 0;
      let totalRelevance = 0;
      let confidenceCount = 0;
      let relevanceCount = 0;
      
      allData.forEach(d => {
        // Count by processing method
        stats.byMethod[d.processingMethod] = (stats.byMethod[d.processingMethod] || 0) + 1;
        
        // Calculate averages
        if (d.confidence !== null && d.confidence !== undefined) {
          totalConfidence += d.confidence;
          confidenceCount++;
          if (d.confidence >= 80) stats.highConfidence++;
        }
        
        if (d.relevanceScore !== null && d.relevanceScore !== undefined) {
          totalRelevance += d.relevanceScore;
          relevanceCount++;
          if (d.relevanceScore >= 80) stats.highRelevance++;
        }
      });
      
      stats.avgConfidence = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0;
      stats.avgRelevance = relevanceCount > 0 ? Math.round(totalRelevance / relevanceCount) : 0;
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching processed data stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
}

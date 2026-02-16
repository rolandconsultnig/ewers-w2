/**
 * Collected Data Routes
 * Endpoints for managing raw data collected from various sources
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { insertCollectedDataSchema } from "@shared/schema";
import { z } from "zod";

export function setupCollectedDataRoutes(app: Router, storage: IStorage) {
  
  // Get all collected data
  app.get("/api/collected-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
      const status = req.query.status as string | undefined;
      
      const allData = await storage.getCollectedData();
      
      // Filter by status if provided
      let filteredData = status 
        ? allData.filter(d => d.status === status)
        : allData;
      
      // Apply limit
      filteredData = filteredData.slice(0, limit);
      
      res.json(filteredData);
    } catch (error) {
      console.error("Error fetching collected data:", error);
      res.status(500).json({ error: "Failed to fetch collected data" });
    }
  });

  // Get collected data by ID
  app.get("/api/collected-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const data = await storage.getCollectedDataById(id);
      
      if (!data) {
        return res.status(404).json({ error: "Collected data not found" });
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching collected data:", error);
      res.status(500).json({ error: "Failed to fetch collected data" });
    }
  });

  // Get collected data by source
  app.get("/api/collected-data/by-source/:sourceId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const sourceId = parseInt(req.params.sourceId);
      const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
      
      const allData = await storage.getCollectedData();
      const sourceData = allData
        .filter(d => d.sourceId === sourceId)
        .slice(0, limit);
      
      res.json(sourceData);
    } catch (error) {
      console.error("Error fetching collected data by source:", error);
      res.status(500).json({ error: "Failed to fetch collected data" });
    }
  });

  // Create collected data
  app.post("/api/collected-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertCollectedDataSchema.parse(req.body);
      const created = await storage.createCollectedData(validatedData);
      
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating collected data:", error);
      res.status(500).json({ error: "Failed to create collected data" });
    }
  });

  // Update collected data
  app.put("/api/collected-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getCollectedDataById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Collected data not found" });
      }
      
      const updated = await storage.updateCollectedData(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating collected data:", error);
      res.status(500).json({ error: "Failed to update collected data" });
    }
  });

  // Delete collected data
  app.delete("/api/collected-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    if (user.role !== "admin" && user.securityLevel < 5) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getCollectedDataById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Collected data not found" });
      }
      
      await storage.deleteCollectedData(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collected data:", error);
      res.status(500).json({ error: "Failed to delete collected data" });
    }
  });

  // Get collected data statistics
  app.get("/api/collected-data/stats/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const allData = await storage.getCollectedData();
      
      const stats = {
        total: allData.length,
        pending: allData.filter(d => d.status === "pending").length,
        processed: allData.filter(d => d.status === "processed").length,
        failed: allData.filter(d => d.status === "failed").length,
        bySource: {} as Record<number, number>,
      };
      
      // Count by source
      allData.forEach(d => {
        if (d.sourceId) {
          stats.bySource[d.sourceId] = (stats.bySource[d.sourceId] || 0) + 1;
        }
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching collected data stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
}

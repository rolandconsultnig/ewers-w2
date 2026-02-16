/**
 * News Sources Seeding Routes
 * Endpoints to populate Nigerian news sources into the database
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import { nigerianNewsSources } from "../seed-data/nigerian-news-sources";
import type { User as SelectUser } from "@shared/schema";

export function setupNewsSourcesRoutes(app: Router, storage: IStorage) {
  // Seed Nigerian news sources (admin only)
  app.post("/api/admin/seed-news-sources", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    if (user.role !== "admin" && user.securityLevel < 5) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const existingSources = await storage.getDataSources();
      const existingNames = new Set(existingSources.map(s => s.name));
      
      const sourcesToCreate = nigerianNewsSources.filter(
        source => !existingNames.has(source.name)
      );

      if (sourcesToCreate.length === 0) {
        return res.json({ 
          message: "All news sources already exist", 
          count: 0,
          existing: existingSources.length 
        });
      }

      const createdSources = [];
      for (const sourceData of sourcesToCreate) {
        const created = await storage.createDataSource({
          ...sourceData,
          apiKey: sourceData.apiKey || null,
          metaData: sourceData.metadata || null,
        });
        createdSources.push(created);
      }

      res.status(201).json({
        message: `Successfully seeded ${createdSources.length} news sources`,
        count: createdSources.length,
        sources: createdSources,
        total: existingSources.length + createdSources.length
      });
    } catch (error) {
      console.error("Error seeding news sources:", error);
      res.status(500).json({ 
        error: "Failed to seed news sources", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get list of available news sources to seed (preview)
  app.get("/api/admin/available-news-sources", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    if (user.role !== "admin" && user.securityLevel < 5) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const existingSources = await storage.getDataSources();
      const existingNames = new Set(existingSources.map(s => s.name));
      
      const available = nigerianNewsSources.filter(
        source => !existingNames.has(source.name)
      );

      res.json({
        available: available.length,
        existing: existingSources.length,
        total: nigerianNewsSources.length,
        sources: available.map(s => ({
          name: s.name,
          type: s.type,
          description: s.description,
          frequency: s.frequency
        }))
      });
    } catch (error) {
      console.error("Error fetching available sources:", error);
      res.status(500).json({ error: "Failed to fetch available sources" });
    }
  });

  // Refresh/update existing news sources
  app.put("/api/admin/refresh-news-sources", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user as SelectUser;
    if (user.role !== "admin" && user.securityLevel < 5) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const existingSources = await storage.getDataSources();
      const sourcesByName = new Map(existingSources.map(s => [s.name, s]));
      
      const updated = [];
      for (const seedSource of nigerianNewsSources) {
        const existing = sourcesByName.get(seedSource.name);
        if (existing) {
          const updatedSource = await storage.updateDataSource(existing.id, {
            apiEndpoint: seedSource.apiEndpoint,
            frequency: seedSource.frequency,
            dataFormat: seedSource.dataFormat,
            metaData: seedSource.metadata || null,
            status: seedSource.status,
          });
          updated.push(updatedSource);
        }
      }

      res.json({
        message: `Refreshed ${updated.length} news sources`,
        count: updated.length,
        sources: updated
      });
    } catch (error) {
      console.error("Error refreshing news sources:", error);
      res.status(500).json({ error: "Failed to refresh news sources" });
    }
  });
}

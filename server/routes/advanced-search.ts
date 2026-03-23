/**
 * Advanced Search Routes
 * Endpoints for advanced search and filtering across all entities
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import { db } from "../db";
import { incidents, alerts, dataSources, users } from "@shared/schema";
import { and, or, like, gte, lte, eq, desc } from "drizzle-orm";

/** Reduce SQL LIKE wildcard injection; returns null if too little meaningful text (avoid `%%` matching all). */
function likePattern(raw: string, minLen = 2): string | null {
  const cleaned = raw.replace(/[%_\\]/g, "").trim();
  if (cleaned.length < minLen) return null;
  return `%${cleaned}%`;
}

export function setupAdvancedSearchRoutes(app: Router, storage: IStorage) {
  
  // Advanced incident search with multiple filters
  app.post("/api/search/incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const {
        keyword,
        region,
        severity,
        status,
        category,
        startDate,
        endDate,
        verificationStatus,
        limit = 100,
      } = req.body;

      const conditions = [];

      // Keyword search (title or description)
      if (keyword) {
        const kw = likePattern(String(keyword), 1);
        if (kw) {
          conditions.push(
            or(
              like(incidents.title, kw),
              like(incidents.description, kw),
              like(incidents.location, kw),
              like(incidents.town, kw)
            )
          );
        }
      }

      // Region filter
      if (region) {
        conditions.push(eq(incidents.region, region));
      }

      // Severity filter
      if (severity) {
        conditions.push(eq(incidents.severity, severity));
      }

      // Status filter
      if (status) {
        conditions.push(eq(incidents.status, status));
      }

      // Category filter
      if (category) {
        conditions.push(eq(incidents.category, category));
      }

      // Date range filter
      if (startDate) {
        conditions.push(gte(incidents.reportedAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(incidents.reportedAt, new Date(endDate)));
      }

      // Verification status filter
      if (verificationStatus) {
        conditions.push(eq(incidents.verificationStatus, verificationStatus));
      }

      const base = db.select().from(incidents);
      const filtered =
        conditions.length > 0 ? base.where(and(...conditions)) : base;

      const results = await filtered
        .orderBy(desc(incidents.reportedAt))
        .limit(Math.min(Number(limit) || 100, 500));

      res.json({
        results,
        count: results.length,
        filters: req.body,
      });
    } catch (error) {
      console.error("Error in advanced incident search:", error);
      res.status(500).json({ error: "Failed to search incidents" });
    }
  });

  // Global search across multiple entities
  app.post("/api/search/global", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { query: searchQuery, limit = 50 } = req.body;

      if (!searchQuery || searchQuery.length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }

      const searchPattern = likePattern(searchQuery, 2);
      if (!searchPattern) {
        return res.status(400).json({ error: "Search query must include at least 2 non-wildcard characters" });
      }
      const lim = Math.min(Number(limit) || 50, 200);

      // Search incidents
      const incidentResults = await db
        .select()
        .from(incidents)
        .where(
          or(
            like(incidents.title, searchPattern),
            like(incidents.description, searchPattern),
            like(incidents.location, searchPattern),
            like(incidents.region, searchPattern),
            like(incidents.state, searchPattern),
            like(incidents.town, searchPattern)
          )
        )
        .limit(lim);

      // Search alerts
      const alertResults = await db
        .select()
        .from(alerts)
        .where(
          or(
            like(alerts.title, searchPattern),
            like(alerts.description, searchPattern)
          )
        )
        .limit(lim);

      // Search data sources
      const sourceResults = await db
        .select()
        .from(dataSources)
        .where(
          or(
            like(dataSources.name, searchPattern),
            like(dataSources.description, searchPattern)
          )
        )
        .limit(lim);

      // Search users (limited fields for privacy)
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(
          or(
            like(users.username, searchPattern),
            like(users.fullName, searchPattern)
          )
        )
        .limit(lim);

      res.json({
        query: searchQuery,
        results: {
          incidents: incidentResults.map(i => ({ ...i, type: 'incident' })),
          alerts: alertResults.map(a => ({ ...a, type: 'alert' })),
          dataSources: sourceResults.map(s => ({ ...s, type: 'dataSource' })),
          users: userResults.map(u => ({ ...u, type: 'user' })),
        },
        totalResults: 
          incidentResults.length + 
          alertResults.length + 
          sourceResults.length + 
          userResults.length,
      });
    } catch (error) {
      console.error("Error in global search:", error);
      res.status(500).json({ error: "Failed to perform global search" });
    }
  });

  // Get filter suggestions based on existing data
  app.get("/api/filter/suggestions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const allIncidents = await storage.getIncidents();
      
      // Extract unique values for filters
      const regions = Array.from(new Set(allIncidents.map(i => i.region))).filter(Boolean).sort();
      const severities = Array.from(new Set(allIncidents.map(i => i.severity))).filter(Boolean).sort();
      const statuses = Array.from(new Set(allIncidents.map(i => i.status))).filter(Boolean).sort();
      const categories = Array.from(new Set(allIncidents.map(i => i.category))).filter(Boolean).sort();
      const verificationStatuses = Array.from(new Set(allIncidents.map(i => i.verificationStatus))).filter(Boolean).sort();

      res.json({
        regions,
        severities,
        statuses,
        categories,
        verificationStatuses,
      });
    } catch (error) {
      console.error("Error fetching filter suggestions:", error);
      res.status(500).json({ error: "Failed to fetch filter suggestions" });
    }
  });

  // Advanced alert search
  app.post("/api/search/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const {
        keyword,
        severity,
        status,
        startDate,
        endDate,
        limit = 100,
      } = req.body;

      const conditions = [];

      if (keyword) {
        const kw = likePattern(String(keyword), 1);
        if (kw) {
          conditions.push(
            or(like(alerts.title, kw), like(alerts.description, kw), like(alerts.location, kw))
          );
        }
      }

      if (severity) {
        conditions.push(eq(alerts.severity, severity));
      }

      if (status) {
        conditions.push(eq(alerts.status, status));
      }

      if (startDate) {
        conditions.push(gte(alerts.generatedAt, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(alerts.generatedAt, new Date(endDate)));
      }

      const base = db.select().from(alerts);
      const filtered =
        conditions.length > 0 ? base.where(and(...conditions)) : base;

      const results = await filtered
        .orderBy(desc(alerts.generatedAt))
        .limit(Math.min(Number(limit) || 100, 500));

      res.json({
        results,
        count: results.length,
        filters: req.body,
      });
    } catch (error) {
      console.error("Error in advanced alert search:", error);
      res.status(500).json({ error: "Failed to search alerts" });
    }
  });
}

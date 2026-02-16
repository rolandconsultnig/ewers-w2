/**
 * Advanced Search Routes
 * Endpoints for advanced search and filtering across all entities
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import { db } from "../db";
import { incidents, alerts, dataSources, users } from "@shared/schema";
import { and, or, like, gte, lte, eq, desc } from "drizzle-orm";

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

      let query = db.select().from(incidents);
      const conditions = [];

      // Keyword search (title or description)
      if (keyword) {
        conditions.push(
          or(
            like(incidents.title, `%${keyword}%`),
            like(incidents.description, `%${keyword}%`)
          )
        );
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

      // Apply all conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Apply limit and order
      const results = await query
        .orderBy(desc(incidents.reportedAt))
        .limit(Math.min(limit, 500));

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

      const searchPattern = `%${searchQuery}%`;

      // Search incidents
      const incidentResults = await db
        .select()
        .from(incidents)
        .where(
          or(
            like(incidents.title, searchPattern),
            like(incidents.description, searchPattern),
            like(incidents.location, searchPattern)
          )
        )
        .limit(limit);

      // Search alerts
      const alertResults = await db
        .select()
        .from(alerts)
        .where(like(alerts.title, searchPattern))
        .limit(limit);

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
        .limit(limit);

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
        .limit(limit);

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

      let query = db.select().from(alerts);
      const conditions = [];

      if (keyword) {
        conditions.push(like(alerts.title, `%${keyword}%`));
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

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const results = await query
        .orderBy(desc(alerts.generatedAt))
        .limit(Math.min(limit, 500));

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

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import {
  insertDataSourceSchema,
  insertIncidentSchema,
  insertAlertSchema,
  insertResponseActivitySchema,
  insertResponseTeamSchema,
  insertRiskIndicatorSchema,
  insertRiskAnalysisSchema,
  insertResponsePlanSchema,
  insertApiKeySchema,
  insertWebhookSchema,
  insertFeedbackSchema,
  insertReportSchema,
  insertSettingSchema,
  insertCollectedDataSchema,
  insertProcessedDataSchema,
  riskAnalyses
} from "@shared/schema";
import { analysisService } from "./services/analysis-service";
import { nlpService } from "./services/nlp-service";
import { apiIntegrationService } from "./services/api-integration-service";
import { dataSourceService } from "./services/data-source-service";
import { registerIntegrationRoutes } from "./services/integrations/integration-routes";
import { integrationServices } from "./services/integrations";
import { setupNewsSourcesRoutes } from "./routes/news-sources";
import { setupIncidentReviewRoutes } from "./routes/incident-review";
import { setupAIAnalysisRoutes } from "./routes/ai-analysis";
import { setupCollectedDataRoutes } from "./routes/collected-data";
import { setupProcessedDataRoutes } from "./routes/processed-data";
import { setupAdvancedSearchRoutes } from "./routes/advanced-search";
import { setupResponseTeamMembersRoutes } from "./routes/response-team-members";
import { setupVoiceIncidentRoutes } from "./routes/voice-incident";
import { setupCollaborationRoutes } from "./routes/collaboration";
import { db } from "./db";
import * as notificationService from "./services/notification-service";
import { getSocialPosts, fetchFromWebAndStore } from "./services/social-posts-service";
import { getWatchWords, setWatchWords } from "./services/watch-words-service";
import { runLiveCrisisIngest } from "./services/live-crisis-ingest-service";
import * as smsLogsService from "./services/sms-logs-service";
import { getCrisisStatistics, getResponseTimeMetrics } from "./services/analytics-service";
import {
  getExecutiveKpis,
  getRegionalHeatMap,
  getTrendData,
} from "./services/enterprise-analytics";
import { getSlaStatus, checkAndEscalateBreachedAlerts } from "./services/escalation-service";
import { getSystemHealth } from "./services/health-service";
import * as auditService from "./services/audit-service";
import { singleUpload } from "./services/file-upload";
import { incidentAttachmentsUpload, getUploadSubdir } from "./services/incident-attachments-upload";
import { importFile } from "./services/file-import-service";
import { analyzeCrisisWithGPT, generateConflictForecast, getIncidentRecommendations } from "./services/ai-services";
import * as pushService from "./services/push-service";
import {
  evaluateNotificationRulesForAlert,
  evaluateNotificationRulesForIncident,
  getNotificationRules,
  setNotificationRules,
  type NotificationRule,
} from "./services/notification-rules-service";
import {
  User as SelectUser,
  alertTemplates,
  riskZones,
  escalationRules,
  accessLogs,
} from "@shared/schema";
import { desc, eq, count } from "drizzle-orm";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Health check endpoint for AWS deployment
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  });

  // API connectivity test
  app.get("/api/test", (req, res) => {
    res.status(200).json({ ok: true, message: "API is reachable" });
  });

  // Serve uploaded files
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(path.join(uploadDir)));

  // HTTP Server and Socket.io setup
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: "*" },
  });

  // Online user presence tracking
  const onlineUsers = new Map<string, { userId: number; username: string }>();

  io.on("connection", async (socket) => {
    const userId = socket.handshake.auth?.userId;
    const username = socket.handshake.auth?.username;
    if (userId && username) {
      onlineUsers.set(socket.id, { userId, username });
      io.emit("online-users", Array.from(onlineUsers.values()));
    }

    const sendAlerts = async () => {
      const activeAlerts = await storage.getActiveAlerts();
      socket.emit("alerts", activeAlerts);
    };
    await sendAlerts();
    const alertInterval = setInterval(sendAlerts, 30000);

    socket.on("join-conversation", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("leave-conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
    });
    socket.on("chat:typing-start", (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit("chat:typing", {
        conversationId,
        userId,
        username: username || "Unknown",
      });
    });
    socket.on("chat:typing-stop", (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit("chat:typing-stop", {
        conversationId,
        userId,
      });
    });
    socket.on("call:join", (callId: number) => {
      socket.join(`call:${callId}`);
    });
    socket.on("call:leave", (callId: number) => {
      socket.leave(`call:${callId}`);
    });
    socket.on("call:offer", (data: { callId: number; offer: object }) => {
      socket.to(`call:${data.callId}`).emit("call:offer", data);
    });
    socket.on("call:answer", (data: { callId: number; answer: object }) => {
      socket.to(`call:${data.callId}`).emit("call:answer", data);
    });
    socket.on("call:ice", (data: { callId: number; candidate: object }) => {
      socket.to(`call:${data.callId}`).emit("call:ice", data);
    });
    socket.on("call:request-offer", (callId: number) => {
      socket.to(`call:${callId}`).emit("call:request-offer", { callId, fromUserId: userId });
    });

    socket.on("disconnect", () => {
      clearInterval(alertInterval);
      onlineUsers.delete(socket.id);
      io.emit("online-users", Array.from(onlineUsers.values()));
    });
  });

  // Export io for use in alert creation
  (app as any).io = io;

  // Register integration routes (Twilio, Twitter, Facebook, Instagram)
  registerIntegrationRoutes(app);

  // Register news sources seeding routes
  setupNewsSourcesRoutes(app, storage);

  // Register incident review routes
  setupIncidentReviewRoutes(app, storage);

  // Register AI analysis routes
  setupAIAnalysisRoutes(app, storage);

  // Register collected data routes
  setupCollectedDataRoutes(app, storage);

  // Register processed data routes
  setupProcessedDataRoutes(app, storage);

  // Register advanced search routes
  setupAdvancedSearchRoutes(app, storage);

  // Register response team members routes
  setupResponseTeamMembersRoutes(app, storage);

  // Register voice incident routes
  setupVoiceIncidentRoutes(app);

  // Register collaboration routes (chat, email, calls)
  setupCollaborationRoutes(app, io);

  // Data Sources API
  app.get("/api/data-sources", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sources = await storage.getDataSources();
    res.json(sources);
  });

  app.post("/api/data-sources", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertDataSourceSchema.parse(req.body);
      const newSource = await storage.createDataSource(validatedData);
      res.status(201).json(newSource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create data source" });
    }
  });

  app.put("/api/data-sources/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const source = await storage.getDataSource(id);
      
      if (!source) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      const updatedSource = await storage.updateDataSource(id, req.body);
      res.json(updatedSource);
    } catch (error) {
      res.status(500).json({ error: "Failed to update data source" });
    }
  });

  // Incidents API
  app.get("/api/incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const lga = typeof req.query.lga === "string" ? req.query.lga : undefined;
    const reportingMethod = typeof req.query.reportingMethod === "string" ? req.query.reportingMethod : undefined;

    const rows = state || lga || reportingMethod
      ? await storage.getIncidentsFiltered({ state, lga, reportingMethod })
      : await storage.getIncidents();

    res.json(rows);
  });

  // Case Management API
  app.get("/api/cases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await storage.getCases();
    res.json(rows);
  });

  app.get("/api/cases/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const row = await storage.getCase(id);
      if (!row) return res.status(404).json({ error: "Case not found" });
      res.json(row);
    } catch {
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as SelectUser;
      const body = req.body ?? {};
      const created = await storage.createCase({
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        incidentId: body.incidentId,
        createdBy: user.id,
        assignedTo: body.assignedTo,
      });

      await auditService.logAudit({
        userId: user.id,
        action: "create",
        resource: "case",
        resourceId: created.id,
        details: { title: created.title },
        ...auditService.getClientInfo(req),
      });

      res.status(201).json(created);
    } catch (error) {
      console.error("Failed to create case:", error);
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  app.put("/api/cases/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getCase(id);
      if (!existing) return res.status(404).json({ error: "Case not found" });

      const updated = await storage.updateCase(id, req.body);

      const user = req.user as SelectUser;
      await auditService.logAudit({
        userId: user.id,
        action: "update",
        resource: "case",
        resourceId: id,
        details: req.body,
        ...auditService.getClientInfo(req),
      });

      res.json(updated);
    } catch (error) {
      console.error("Failed to update case:", error);
      res.status(500).json({ error: "Failed to update case" });
    }
  });

  app.delete("/api/cases/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCase(id);
      if (!deleted) return res.status(404).json({ error: "Case not found" });

      const user = req.user as SelectUser;
      await auditService.logAudit({
        userId: user.id,
        action: "delete",
        resource: "case",
        resourceId: id,
        ...auditService.getClientInfo(req),
      });

      res.sendStatus(204);
    } catch (error) {
      console.error("Failed to delete case:", error);
      res.status(500).json({ error: "Failed to delete case" });
    }
  });

  app.get("/api/cases/:id/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const caseId = parseInt(req.params.id);
      const existing = await storage.getCase(caseId);
      if (!existing) return res.status(404).json({ error: "Case not found" });
      const notes = await storage.getCaseNotes(caseId);
      res.json(notes);
    } catch {
      res.status(500).json({ error: "Failed to fetch case notes" });
    }
  });

  app.post("/api/cases/:id/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as SelectUser;
      const caseId = parseInt(req.params.id);
      const existing = await storage.getCase(caseId);
      if (!existing) return res.status(404).json({ error: "Case not found" });

      const created = await storage.createCaseNote({
        caseId,
        authorId: user.id,
        note: req.body?.note,
      });

      await auditService.logAudit({
        userId: user.id,
        action: "create",
        resource: "case_note",
        resourceId: created.id,
        details: { caseId },
        ...auditService.getClientInfo(req),
      });

      res.status(201).json(created);
    } catch (error) {
      console.error("Failed to create case note:", error);
      res.status(500).json({ error: "Failed to create case note" });
    }
  });

  app.get("/api/incidents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const incident = await storage.getIncident(id);
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as SelectUser;
      const body: any = req.body ?? {};

      if (body.reportedBy == null) body.reportedBy = user.id;

      if (body.coordinates == null && body.latitude != null && body.longitude != null) {
        const lat = Number(body.latitude);
        const lng = Number(body.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          body.coordinates = { lat, lng };
        }
      }

      if (!body.location) {
        const parts = [body.lga, body.state, body.region].filter(Boolean);
        if (parts.length > 0) body.location = parts.join(", ");
      }

      const validatedData = insertIncidentSchema.parse(body);
      const newIncident = await storage.createIncident(validatedData);
      await auditService.logAudit({
        userId: user.id,
        action: "create",
        resource: "incident",
        resourceId: newIncident.id,
        ...auditService.getClientInfo(req),
      });

      await evaluateNotificationRulesForIncident(newIncident);
      
      io.emit("new-incident", newIncident);
      pushService.sendPushToAll(`Incident: ${newIncident.title}`, newIncident.description, "/incidents");
      res.status(201).json(newIncident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create incident:", error);
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  app.post("/api/incidents/:id/attachments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid incident id" });

    const incident = await storage.getIncident(id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    incidentAttachmentsUpload(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err?.message || String(err) });

      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

      const newUrls = files.map((f) => {
        const subdir = getUploadSubdir(f.mimetype);
        return `/uploads/${subdir}/${f.filename}`;
      });

      const updated = await storage.updateIncident(id, {
        mediaUrls: [...(incident.mediaUrls || []), ...newUrls],
      });

      res.status(201).json({
        incident: updated,
        attachments: newUrls,
      });
    });
  });

  app.put("/api/incidents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const incident = await storage.getIncident(id);
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const updatedIncident = await storage.updateIncident(id, req.body);
      res.json(updatedIncident);
    } catch (error) {
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  app.patch("/api/incidents/:id/pin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const { isPinned } = req.body;
      
      const incident = await storage.getIncident(id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      const updatedIncident = await storage.updateIncident(id, { isPinned });
      
      const user = req.user as SelectUser;
      await auditService.logAudit({
        userId: user.id,
        action: "update",
        resource: "incident",
        resourceId: id,
        details: { isPinned },
        ...auditService.getClientInfo(req),
      });
      
      res.json(updatedIncident);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      res.status(500).json({ error: "Failed to toggle pin status" });
    }
  });

  // Crises API - alias for incidents (crisis management compatibility)
  app.get("/api/crises", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });
  app.post("/api/crises", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validatedData = insertIncidentSchema.parse(req.body);
      const newIncident = await storage.createIncident(validatedData);
      res.status(201).json(newIncident);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create crisis" });
    }
  });
  app.get("/api/crises/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const incident = await storage.getIncident(id);
      if (!incident) return res.status(404).json({ error: "Crisis not found" });
      res.json(incident);
    } catch {
      res.status(500).json({ error: "Failed to fetch crisis" });
    }
  });
  app.put("/api/crises/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const incident = await storage.getIncident(id);
      if (!incident) return res.status(404).json({ error: "Crisis not found" });
      const updated = await storage.updateIncident(id, req.body);
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update crisis" });
    }
  });
  app.delete("/api/crises/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteIncident(id);
      if (!deleted) return res.status(404).json({ error: "Crisis not found" });
      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: "Failed to delete crisis" });
    }
  });

  // Notifications API
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const notifications = await notificationService.getNotifications(user.id);
    res.json(notifications);
  });

  // Notification Rules API (admin only)
  app.get("/api/notification-rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const rules = await getNotificationRules();
    res.json(rules);
  });
  app.put("/api/notification-rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const rules = Array.isArray(req.body) ? (req.body as NotificationRule[]) : [];
    const updated = await setNotificationRules(rules, currentUser.id);
    res.json(updated);
  });
  app.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    const n = await notificationService.markAsRead(id, user.id);
    if (!n) return res.status(404).json({ error: "Notification not found" });
    res.json(n);
  });
  app.put("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const count = await notificationService.markAllAsRead(user.id);
    res.json({ marked: count });
  });

  // Social media posts API (aggregates from collected data and integrations)
  app.get("/api/social/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const platform = req.query.platform as string | undefined;
      const posts = await getSocialPosts(platform);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching social posts:", error);
      res.status(500).json({ error: "Failed to fetch social posts" });
    }
  });

  app.get("/api/social/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const posts = await getSocialPosts();
      const byPlatform: Record<string, { count: number; engagement: number }> = {
        twitter: { count: 0, engagement: 0 },
        facebook: { count: 0, engagement: 0 },
        instagram: { count: 0, engagement: 0 },
        tiktok: { count: 0, engagement: 0 },
      };
      for (const p of posts) {
        const key = p.platform?.toLowerCase() || "twitter";
        if (byPlatform[key]) {
          byPlatform[key].count++;
          byPlatform[key].engagement += (p.confidence || 0) * 100;
        }
      }
      res.json({
        twitter: { followers: byPlatform.twitter.count * 500, engagement: byPlatform.twitter.count ? 3.2 : 0, retweets: byPlatform.twitter.count * 10, likes: byPlatform.twitter.engagement },
        facebook: { followers: byPlatform.facebook.count * 400, engagement: byPlatform.facebook.count ? 4.1 : 0, shares: byPlatform.facebook.count * 8, likes: byPlatform.facebook.engagement },
        instagram: { followers: byPlatform.instagram.count * 350, engagement: byPlatform.instagram.count ? 5.7 : 0, likes: byPlatform.instagram.engagement, comments: byPlatform.instagram.count * 5 },
        tiktok: { followers: byPlatform.tiktok.count * 300, engagement: byPlatform.tiktok.count ? 7.2 : 0, likes: byPlatform.tiktok.engagement, views: byPlatform.tiktok.count * 1000 },
      });
    } catch (error) {
      console.error("Error fetching social analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Fetch current information from the web (X, Facebook, TikTok) and optionally save
  app.post("/api/social/fetch", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const saveToDb = (req.body && (req.body as { save?: boolean }).save) === true;
      const posts = await fetchFromWebAndStore(saveToDb);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching from web:", error);
      res.status(500).json({ error: "Failed to fetch from social platforms" });
    }
  });

  // Run full live crisis ingest (social + news, optional incident creation)
  app.post("/api/crisis-ingest/run", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const result = await runLiveCrisisIngest();
      res.json(result);
    } catch (error) {
      console.error("Error running live crisis ingest:", error);
      res.status(500).json({ error: "Failed to run live crisis ingest" });
    }
  });

  // SMS logs and templates
  app.get("/api/sms/logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await smsLogsService.getSmsLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching SMS logs:", error);
      res.status(500).json({ error: "Failed to fetch SMS logs" });
    }
  });
  app.get("/api/sms/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const templates = await smsLogsService.getSmsTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching SMS templates:", error);
      res.status(500).json({ error: "Failed to fetch SMS templates" });
    }
  });
  app.post("/api/sms/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { name, content } = req.body;
      if (!name || !content) return res.status(400).json({ error: "Name and content required" });
      const template = await smsLogsService.createSmsTemplate(name, content);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating SMS template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });
  app.put("/api/sms/templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const { name, content } = req.body;
      if (!name || !content) return res.status(400).json({ error: "Name and content required" });
      const template = await smsLogsService.updateSmsTemplate(id, name, content);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error) {
      console.error("Error updating SMS template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });
  app.delete("/api/sms/templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      await smsLogsService.deleteSmsTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting SMS template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });
  app.get("/api/sms/incoming", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await smsLogsService.getIncomingSms(limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching incoming SMS:", error);
      res.status(500).json({ error: "Failed to fetch incoming SMS" });
    }
  });
  app.put("/api/sms/incoming/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      await smsLogsService.markIncomingSmsRead(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking SMS read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });
  app.put("/api/sms/incoming/read-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await smsLogsService.markAllIncomingSmsRead();
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all SMS read:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Twilio webhook for incoming SMS (no auth - Twilio calls this)
  app.post("/api/webhooks/twilio/sms", express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const from = req.body?.From;
      const body = req.body?.Body;
      const messageSid = req.body?.MessageSid;
      if (from && body) {
        await smsLogsService.storeIncomingSms({
          sender: from,
          content: body,
          twilioSid: messageSid,
        });
      }
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (error) {
      console.error("Twilio webhook error:", error);
      res.type("text/xml").status(500).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // Watch words for content filtering (words to watch out for)
  app.get("/api/watch-words", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const words = await getWatchWords();
      res.json(words);
    } catch (error) {
      console.error("Error fetching watch words:", error);
      res.status(500).json({ error: "Failed to fetch watch words" });
    }
  });
  app.put("/api/watch-words", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    if (user.securityLevel < 5 && user.role !== "admin") return res.status(403).json({ error: "Admin required to update watch words" });
    try {
      const body = req.body as { words?: string[] };
      const words = Array.isArray(body?.words) ? body.words : [];
      const updated = await setWatchWords(words, user.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating watch words:", error);
      res.status(500).json({ error: "Failed to update watch words" });
    }
  });

  // Analytics API
  app.get("/api/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const stats = await getCrisisStatistics(startDate, endDate);
      const responseMetrics = await getResponseTimeMetrics();
      res.json({ ...stats, responseMetrics });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Enterprise: Executive KPIs, heat map, trends
  app.get("/api/enterprise/kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const kpis = await getExecutiveKpis();
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  app.get("/api/enterprise/heat-map", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = await getRegionalHeatMap();
      res.json(data);
    } catch (error) {
      console.error("Error fetching heat map:", error);
      res.status(500).json({ error: "Failed to fetch heat map" });
    }
  });

  app.get("/api/enterprise/trends", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const days = parseInt((req.query.days as string) || "30");
      const data = await getTrendData(days);
      res.json(data);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ error: "Failed to fetch trends" });
    }
  });

  // Enterprise: SLA status
  app.get("/api/enterprise/sla/:alertId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const alertId = parseInt(req.params.alertId);
      const status = await getSlaStatus(alertId);
      if (!status) return res.status(404).json({ error: "Alert not found or not active" });
      res.json(status);
    } catch (error) {
      console.error("Error fetching SLA:", error);
      res.status(500).json({ error: "Failed to fetch SLA" });
    }
  });

  // Enterprise: System health
  app.get("/api/enterprise/health", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const health = await getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("Error fetching health:", error);
      res.status(500).json({ error: "Failed to fetch health" });
    }
  });

  // Enterprise: Export report (CSV/JSON)
  app.get("/api/enterprise/export/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const format = (req.query.format as string) || "json";
    const days = Math.min(parseInt((req.query.days as string) || "30"), 365);
    try {
      const [kpis, heatMap, trends] = await Promise.all([
        getExecutiveKpis(),
        getRegionalHeatMap(),
        getTrendData(days),
      ]);
      const report = {
        generatedAt: new Date().toISOString(),
        period: `Last ${days} days`,
        kpis,
        regionalHeatMap: heatMap,
        trends,
      };
      if (format === "csv") {
        const rows: string[] = [
          "Metric,Value",
          `Total Incidents,${kpis.totalIncidents}`,
          `Active Incidents,${kpis.activeIncidents}`,
          `Critical Alerts,${kpis.criticalAlerts}`,
          `Resolution Rate (%),${kpis.resolutionRate}`,
          `Avg Response Time (hrs),${kpis.avgResponseTimeHours}`,
          `High Risk Zones,${kpis.highRiskZones}`,
          "",
          "Region,State,Incident Count,Active Count,Risk Level",
          ...heatMap.map((r) => `${r.region},${r.state ?? ""},${r.incidentCount},${r.activeCount},${r.riskLevel}`),
          "",
          "Date,Incidents,Alerts",
          ...trends.map((t) => `${t.date},${t.incidents},${t.alerts}`),
        ];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="ewer-report-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(rows.join("\n"));
      } else {
        res.json(report);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ error: "Failed to export report" });
    }
  });

  // Enterprise: Audit logs (admin)
  app.get("/api/enterprise/audit-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    if (user.securityLevel < 5 && user.role !== "admin") return res.status(403).json({ error: "Admin required" });
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
      const logs = await db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp)).limit(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Enterprise: Alert templates CRUD
  app.get("/api/enterprise/alert-templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await db.select().from(alertTemplates).orderBy(desc(alertTemplates.id));
    res.json(items);
  });
  app.post("/api/enterprise/alert-templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const [created] = await db.insert(alertTemplates).values({ ...req.body, createdBy: user.id }).returning();
    res.status(201).json(created);
  });
  app.put("/api/enterprise/alert-templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [updated] = await db.update(alertTemplates).set(req.body).where(eq(alertTemplates.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/enterprise/alert-templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await db.delete(alertTemplates).where(eq(alertTemplates.id, id));
    res.status(204).send();
  });

  // Enterprise: Risk zones CRUD
  app.get("/api/enterprise/risk-zones", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await db.select().from(riskZones).orderBy(desc(riskZones.id));
    res.json(items);
  });
  app.post("/api/enterprise/risk-zones", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [created] = await db.insert(riskZones).values(req.body).returning();
    res.status(201).json(created);
  });
  app.put("/api/enterprise/risk-zones/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [updated] = await db.update(riskZones).set({ ...req.body, updatedAt: new Date() }).where(eq(riskZones.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/enterprise/risk-zones/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await db.delete(riskZones).where(eq(riskZones.id, id));
    res.status(204).send();
  });

  // Enterprise: Escalation rules CRUD
  app.get("/api/enterprise/escalation-rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await db.select().from(escalationRules).orderBy(desc(escalationRules.id));
    res.json(items);
  });
  app.post("/api/enterprise/escalation-rules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [created] = await db.insert(escalationRules).values(req.body).returning();
    res.status(201).json(created);
  });
  app.put("/api/enterprise/escalation-rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const [updated] = await db.update(escalationRules).set(req.body).where(eq(escalationRules.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/enterprise/escalation-rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await db.delete(escalationRules).where(eq(escalationRules.id, id));
    res.status(204).send();
  });

  // Data collection file import (CSV/JSON parse and store in collected_data)
  app.post("/api/data-collection/import", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    singleUpload(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err?.message || String(err) });
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });
      try {
        const fs = await import("fs");
        const buffer = fs.readFileSync(file.path);
        const result = await importFile(buffer, file.originalname, file.mimetype);
        fs.unlinkSync(file.path); // remove temp file
        res.status(201).json({
          success: true,
          imported: result.imported,
          errors: result.errors,
          message: `Imported ${result.imported} records${result.errors > 0 ? ` (${result.errors} errors)` : ""}`,
        });
      } catch (e: any) {
        res.status(400).json({ error: e.message || "Import failed" });
      }
    });
  });

  // File upload API
  app.post("/api/upload", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    singleUpload(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err?.message || String(err) });
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });
      const subdir = file.mimetype.startsWith("image/") ? "images" : "documents";
      res.status(201).json({
        filename: file.filename,
        path: `/uploads/${subdir}/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      });
    });
  });

  // AI analysis API (OpenAI GPT)
  app.post("/api/ai/analyze-crisis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { region, location } = req.body;
      const result = await analyzeCrisisWithGPT(region || "Nigeria", location);
      if (!result.success) return res.status(400).json({ error: result.message });
      res.json(result.data);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "AI analysis failed" });
    }
  });

  app.post("/api/ai/predict", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { region, timeline, startDate } = req.body;
      const days = parseInt(timeline) || 30;
      const result = await generateConflictForecast(region || "Nigeria", days, startDate);
      if (!result.success) return res.status(400).json({ error: result.message || "Failed to generate forecast" });

      res.json({
        region: region || "Nigeria",
        timelineDays: days,
        forecast: result.data,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("AI predict error:", error);
      res.status(500).json({ error: "AI prediction failed" });
    }
  });

  app.get("/api/ai/recommendations/:incidentId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const incidentId = parseInt(req.params.incidentId);
      const result = await getIncidentRecommendations(incidentId);
      if (!result.success) return res.status(400).json({ error: result.message });
      res.json({ recommendations: result.recommendations });
    } catch (error) {
      console.error("AI recommendations error:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Weather API (Open-Meteo - no key required)
  app.get("/api/weather", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const lat = req.query.lat || "9.0820";
      const lng = req.query.lng || "8.6753";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,precipitation&timezone=Africa/Lagos`;
      const fetchRes = await fetch(url);
      const data = await fetchRes.json();
      res.json(data);
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ error: "Failed to fetch weather" });
    }
  });

  // Push notification subscription
  app.get("/api/push/vapid-public", (req, res) => {
    const key = pushService.getVapidPublic();
    if (!key) return res.status(503).json({ error: "Push not configured" });
    res.json({ publicKey: key });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const subscription = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: "Invalid subscription" });
    pushService.addPushSubscription(user.id, subscription);
    res.status(201).json({ ok: true });
  });

  // News API (NewsAPI.org - requires NEWS_API_KEY)
  app.get("/api/news", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const key = process.env.NEWS_API_KEY;
      if (!key) return res.status(503).json({ error: "News API not configured" });
      const q = encodeURIComponent((req.query.q as string) || "Nigeria conflict");
      const url = `https://newsapi.org/v2/everything?q=${q}&apiKey=${key}&pageSize=20&sortBy=publishedAt`;
      const fetchRes = await fetch(url);
      const data = await fetchRes.json();
      res.json(data);
    } catch (error) {
      console.error("News API error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Users API (admin only)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const users = await storage.getAllUsers();
    res.json(users);
  });
  app.get("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });
  app.put("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    const { password, ...rest } = req.body;
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updated = await storage.updateUser(id, rest);
    await auditService.logAudit({
      userId: currentUser.id,
      action: "update",
      resource: "user",
      resourceId: id,
      ...auditService.getClientInfo(req),
    });
    res.json(updated);
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    if (id === currentUser.id) return res.status(400).json({ error: "Cannot delete your own account" });
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await storage.deleteUser(id);
    await auditService.logAudit({
      userId: currentUser.id,
      action: "delete",
      resource: "user",
      resourceId: id,
      ...auditService.getClientInfo(req),
    });
    res.sendStatus(204);
  });

  // Public incident reporting endpoint - does not require authentication
  app.get("/api/public/incidents", async (_req, res) => {
    try {
      const incidents = await storage.getIncidents();
      res.json(incidents);
    } catch (error) {
      console.error("Failed to fetch public incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.post("/api/public/incidents", async (req, res) => {
    try {
      // Extract the necessary incident data from the request
      const { 
        title, description, location, region, actorType, actorName,
        contactName, contactEmail, contactPhone, category
      } = req.body;

      const users = await storage.getAllUsers();
      const reporterUser = users.find((u) => u.role === "admin") ?? users[0];
      if (!reporterUser) {
        return res.status(500).json({ error: "No system user exists to attribute public reports" });
      }

      const coordinates = {
        lat: 0,
        lng: 0,
        address: location,
        reporterInfo: {
          name: contactName,
          email: contactEmail || "",
          phone: contactPhone,
        },
        actors: {
          type: actorType,
          name: actorName,
        },
      };
      
      // Format the data to match the incident schema
      const incidentData = {
        title,
        description,
        location, // Use the provided location
        region,
        severity: "medium", // Default severity for public reports
        status: "pending", // Incidents from public start as pending
        category: category || "conflict", // Default category
        reportedBy: reporterUser.id,
        coordinates,
        verificationStatus: "unverified",
        // Add any other required fields with sensible defaults
        impactedPopulation: 0,
        // Store the reporter contact info and actor information in the metadata
        mediaUrls: []
      };

      // Add the incident to the database
      const incident = await storage.createIncident(incidentData);
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating public incident:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: error.errors });
      }
      res.status(400).json({ error: "Failed to create incident", details: (error as Error).message });
    }
  });

  // Alerts API
  app.get("/api/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.get("/api/alerts/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const activeAlerts = await storage.getActiveAlerts();
    res.json(activeAlerts);
  });

  app.get("/api/alerts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.getAlert(id);
      
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alert" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const newAlert = await storage.createAlert(validatedData);
      const user = req.user as SelectUser;
      await auditService.logAudit({
        userId: user.id,
        action: "create",
        resource: "alert",
        resourceId: newAlert.id,
        ...auditService.getClientInfo(req),
      });

      await evaluateNotificationRulesForAlert(newAlert);
      
      io.emit("new-alert", newAlert);
      pushService.sendPushToAll(`Alert: ${newAlert.title}`, newAlert.description, "/alerts");
      res.status(201).json(newAlert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.put("/api/alerts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.getAlert(id);
      
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      
      const updatedAlert = await storage.updateAlert(id, req.body);
      
      io.emit("updated-alert", updatedAlert);
      res.json(updatedAlert);
    } catch (error) {
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  // Response Activities API
  app.get("/api/response-activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const activities = await storage.getResponseActivities();
    res.json(activities);
  });

  app.post("/api/response-activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertResponseActivitySchema.parse(req.body);
      const newActivity = await storage.createResponseActivity(validatedData);
      res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create response activity" });
    }
  });

  app.put("/api/response-activities/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const activity = await storage.getResponseActivity(id);
      
      if (!activity) {
        return res.status(404).json({ error: "Response activity not found" });
      }
      
      const updatedActivity = await storage.updateResponseActivity(id, req.body);
      res.json(updatedActivity);
    } catch (error) {
      res.status(500).json({ error: "Failed to update response activity" });
    }
  });

  // Response Teams API
  app.get("/api/response-teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const teams = await storage.getResponseTeams();
    res.json(teams);
  });

  app.post("/api/response-teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertResponseTeamSchema.parse(req.body);
      const newTeam = await storage.createResponseTeam(validatedData);
      res.status(201).json(newTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create response team" });
    }
  });

  app.put("/api/response-teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const team = await storage.getResponseTeam(id);
      
      if (!team) {
        return res.status(404).json({ error: "Response team not found" });
      }
      
      const updatedTeam = await storage.updateResponseTeam(id, req.body);
      res.json(updatedTeam);
    } catch (error) {
      res.status(500).json({ error: "Failed to update response team" });
    }
  });
  
  // Response Plans API
  app.get("/api/response-plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const plans = await storage.getResponsePlans();
    res.json(plans);
  });

  app.get("/api/response-plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getResponsePlan(id);
      
      if (!plan) {
        return res.status(404).json({ error: "Response plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch response plan" });
    }
  });

  app.post("/api/response-plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertResponsePlanSchema.parse(req.body);
      const newPlan = await storage.createResponsePlan(validatedData);
      res.status(201).json(newPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create response plan" });
    }
  });

  app.put("/api/response-plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getResponsePlan(id);
      
      if (!plan) {
        return res.status(404).json({ error: "Response plan not found" });
      }
      
      const updatedPlan = await storage.updateResponsePlan(id, req.body);
      res.json(updatedPlan);
    } catch (error) {
      res.status(500).json({ error: "Failed to update response plan" });
    }
  });

  // Risk Indicators API
  app.get("/api/risk-indicators", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const indicators = await storage.getRiskIndicators();
    res.json(indicators);
  });

  app.get("/api/risk-indicators/time-range", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const indicators = await storage.getRiskIndicatorsByTimeRange(startDate, endDate);
      res.json(indicators);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch risk indicators" });
    }
  });

  app.post("/api/risk-indicators", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertRiskIndicatorSchema.parse(req.body);
      const newIndicator = await storage.createRiskIndicator(validatedData);
      res.status(201).json(newIndicator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create risk indicator" });
    }
  });

  // Risk Analysis API
  app.get("/api/risk-analyses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const analyses = await db.select().from(riskAnalyses).orderBy(desc(riskAnalyses.id));
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch risk analyses" });
    }
  });

  app.post("/api/risk-analyses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertRiskAnalysisSchema.parse(req.body);
      const newAnalysis = await storage.createRiskAnalysis(validatedData);
      res.status(201).json(newAnalysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create risk analysis" });
    }
  });

  // AI Analysis API
  app.post("/api/analysis/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { region, location } = req.body;
      
      if (!region) {
        return res.status(400).json({ error: "Region is required" });
      }
      
      const result = await analysisService.generateRiskAnalysis(region, location);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Save the generated analysis to database
      // Ensure data exists and convert field names if needed to match schema
      if (!result.data) {
        return res.status(500).json({ error: "Analysis data generation failed" });
      }
      
      const analysisData = {
        title: result.data.title,
        description: result.data.description,
        location: result.data.location,
        severity: result.data.severity,
        likelihood: result.data.likelihood,
        impact: result.data.impact,
        analysis: result.data.analysis,
        createdBy: result.data.createdBy,
        recommendations: result.data.recommendations,
        timeframe: result.data.timeframe,
        region: result.data.region,
      };
      
      const savedAnalysis = await storage.createRiskAnalysis(analysisData);
      
      res.status(201).json(savedAnalysis);
    } catch (error) {
      console.error("Error in generate analysis:", error);
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  });

  app.post("/api/analysis/generate-alert/:analysisId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const analysisId = parseInt(req.params.analysisId);
      
      const result = await analysisService.generateAlerts(analysisId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Save the generated alert to database
      // Ensure data exists and convert field names if needed to match schema
      if (!result.data) {
        return res.status(500).json({ error: "Alert data generation failed" });
      }
      
      const alertData = {
        title: result.data.title,
        description: result.data.description,
        location: result.data.location,
        severity: result.data.severity,
        source: "automated",
        status: result.data.status,
        region: result.data.region,
        incidentId: result.data.incidentId,
        channels: result.data.channels
      };
      
      const savedAlert = await storage.createAlert(alertData);
      
      io.emit("new-alert", savedAlert);
      res.status(201).json(savedAlert);
    } catch (error) {
      console.error("Error in generate alert:", error);
      res.status(500).json({ error: "Failed to generate alert" });
    }
  });

  app.post("/api/analysis/incident/:incidentId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const incidentId = parseInt(req.params.incidentId);
      
      const result = await analysisService.analyzeIncident(incidentId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json(result.data);
    } catch (error) {
      console.error("Error in analyze incident:", error);
      res.status(500).json({ error: "Failed to analyze incident" });
    }
  });

  // NLP API Endpoints
  app.post("/api/nlp/sentiment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }
      
      const result = nlpService.analyzeSentiment(text);
      res.json(result);
    } catch (error) {
      console.error("Error in sentiment analysis:", error);
      res.status(500).json({ error: "Failed to analyze sentiment" });
    }
  });
  
  app.post("/api/nlp/keywords", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { text, maxResults } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }
      
      const limit = maxResults && !isNaN(maxResults) ? parseInt(maxResults) : 10;
      const result = nlpService.extractKeywords(text, limit);
      res.json(result);
    } catch (error) {
      console.error("Error in keyword extraction:", error);
      res.status(500).json({ error: "Failed to extract keywords" });
    }
  });
  
  app.post("/api/nlp/classify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { text, maxResults } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }
      
      const limit = maxResults && !isNaN(maxResults) ? parseInt(maxResults) : 3;
      const result = nlpService.classifyText(text, limit);
      res.json(result);
    } catch (error) {
      console.error("Error in text classification:", error);
      res.status(500).json({ error: "Failed to classify text" });
    }
  });
  
  app.post("/api/nlp/summarize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { text, maxLength } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }
      
      const limit = maxLength && !isNaN(maxLength) ? parseInt(maxLength) : 200;
      const result = nlpService.summarizeText(text, limit);
      res.json({ summary: result });
    } catch (error) {
      console.error("Error in text summarization:", error);
      res.status(500).json({ error: "Failed to summarize text" });
    }
  });
  
  app.post("/api/nlp/entities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }
      
      const result = nlpService.extractEntities(text);
      res.json(result);
    } catch (error) {
      console.error("Error in entity extraction:", error);
      res.status(500).json({ error: "Failed to extract entities" });
    }
  });

  // API Integration - API Keys
  app.get("/api/integration/api-keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      let apiKeys;
      // Admin users can see all API keys, others only see their own
      if (req.user?.role === 'admin') {
        apiKeys = await storage.getApiKeys();
      } else {
        apiKeys = await storage.getApiKeys(req.user?.id);
      }
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.get("/api/integration/api-keys/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const apiKey = await storage.getApiKey(id);
      
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      // Only allow access to own API keys unless admin
      if (apiKey.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.sendStatus(403);
      }
      
      res.json(apiKey);
    } catch (error) {
      console.error("Error fetching API key:", error);
      res.status(500).json({ error: "Failed to fetch API key" });
    }
  });

  app.post("/api/integration/api-keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { name, permissions, expiresAt } = req.body;
      
      if (!name || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ error: "Name and permissions array are required" });
      }
      
      const newApiKey = await apiIntegrationService.createApiKey(
        req.user?.id,
        name,
        permissions,
        expiresAt ? new Date(expiresAt) : undefined
      );
      
      res.status(201).json(newApiKey);
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  app.put("/api/integration/api-keys/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const apiKey = await storage.getApiKey(id);
      
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      // Only allow access to own API keys unless admin
      if (apiKey.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.sendStatus(403);
      }
      
      const updatedApiKey = await storage.updateApiKey(id, req.body);
      res.json(updatedApiKey);
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({ error: "Failed to update API key" });
    }
  });

  app.delete("/api/integration/api-keys/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const apiKey = await storage.getApiKey(id);
      
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      // Only allow access to own API keys unless admin
      if (apiKey.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.sendStatus(403);
      }
      
      await storage.deleteApiKey(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // API Integration - Webhooks
  app.get("/api/integration/webhooks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      let webhooks;
      // Admin users can see all webhooks, others only see their own
      if (req.user?.role === 'admin') {
        webhooks = await storage.getWebhooks();
      } else {
        webhooks = await storage.getWebhooks(req.user?.id);
      }
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.get("/api/integration/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const webhook = await storage.getWebhook(id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      
      // Only allow access to own webhooks unless admin
      if (webhook.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.sendStatus(403);
      }
      
      res.json(webhook);
    } catch (error) {
      console.error("Error fetching webhook:", error);
      res.status(500).json({ error: "Failed to fetch webhook" });
    }
  });

  app.post("/api/integration/webhooks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    if (!user?.id) return res.status(401).json({ error: "User not found" });
    try {
      const { name, url, events } = req.body;
      
      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: "Name, URL, and events array are required" });
      }
      
      const webhook = await apiIntegrationService.createWebhook(
        user.id,
        name,
        url,
        events
      );
      
      res.status(201).json(webhook);
    } catch (error) {
      console.error("Error creating webhook:", error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.put("/api/integration/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const webhook = await storage.getWebhook(id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      
      // Only allow access to own webhooks unless admin
      if (webhook.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.sendStatus(403);
      }
      
      const updatedWebhook = await storage.updateWebhook(id, req.body);
      res.json(updatedWebhook);
    } catch (error) {
      console.error("Error updating webhook:", error);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  app.delete("/api/integration/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const webhook = await storage.getWebhook(id);
      
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      
      // Only allow access to own webhooks unless admin
      if (webhook.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.sendStatus(403);
      }
      
      await storage.deleteWebhook(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // External API access middleware
  const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
    // Check if request is already authenticated via session
    if (req.isAuthenticated()) {
      return next();
    }
    
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }
    
    // Determine the required permission based on the endpoint and method
    let requiredPermission = 'read';
    
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      requiredPermission = 'write';
    }
    
    // Check some endpoints that require specific permissions
    if (req.path.includes('/admin')) {
      requiredPermission = 'admin';
    }
    
    // Validate API key
    const isValid = await apiIntegrationService.validateApiKey(apiKey, requiredPermission);
    
    if (!isValid) {
      return res.status(403).json({ error: "Invalid or expired API key" });
    }
    
    next();
  };
  
  // External API routes (accessible with API key)
  app.use('/api/external', apiKeyAuth);
  
  app.get('/api/external/incidents', async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      
      // Send webhook event for this API access
      await apiIntegrationService.triggerWebhooks('api.incidents.accessed', {
        timestamp: new Date(),
        endpoint: '/api/external/incidents',
        method: 'GET'
      });
      
      res.json(incidents);
    } catch (error) {
      console.error("Error in external incidents API:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.get('/api/external/alerts', async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      
      // Send webhook event for this API access
      await apiIntegrationService.triggerWebhooks('api.alerts.accessed', {
        timestamp: new Date(),
        endpoint: '/api/external/alerts',
        method: 'GET'
      });
      
      res.json(alerts);
    } catch (error) {
      console.error("Error in external alerts API:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // Feedbacks API
  app.get("/api/feedbacks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await storage.getFeedbacks();
    res.json(items);
  });
  app.get("/api/feedbacks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getFeedback(id);
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    res.json(item);
  });
  app.post("/api/feedbacks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validated = insertFeedbackSchema.parse(req.body);
      const user = req.user as SelectUser;
      const created = await storage.createFeedback({ ...validated, submittedBy: user.id });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });
  app.put("/api/feedbacks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getFeedback(id);
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    const updated = await storage.updateFeedback(id, req.body);
    res.json(updated);
  });
  app.delete("/api/feedbacks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getFeedback(id);
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    await storage.deleteFeedback(id);
    res.sendStatus(204);
  });

  // Reports API
  app.get("/api/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await storage.getReports();
    res.json(items);
  });
  app.get("/api/reports/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getReport(id);
    if (!item) return res.status(404).json({ error: "Report not found" });
    res.json(item);
  });
  app.post("/api/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validated = insertReportSchema.parse(req.body);
      const user = req.user as SelectUser;
      const created = await storage.createReport({ ...validated, createdBy: user.id });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create report" });
    }
  });
  app.put("/api/reports/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getReport(id);
    if (!item) return res.status(404).json({ error: "Report not found" });
    const updated = await storage.updateReport(id, req.body);
    res.json(updated);
  });
  app.delete("/api/reports/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getReport(id);
    if (!item) return res.status(404).json({ error: "Report not found" });
    await storage.deleteReport(id);
    res.sendStatus(204);
  });

  // Settings API (admin only)
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const items = await storage.getSettings();
    res.json(items);
  });
  app.get("/api/settings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    const item = await storage.getSetting(id);
    if (!item) return res.status(404).json({ error: "Setting not found" });
    res.json(item);
  });
  app.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    try {
      const validated = insertSettingSchema.parse(req.body);
      const created = await storage.createSetting({ ...validated, updatedBy: currentUser.id });
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create setting" });
    }
  });
  app.put("/api/settings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    const item = await storage.getSetting(id);
    if (!item) return res.status(404).json({ error: "Setting not found" });
    const updated = await storage.updateSetting(id, req.body);
    res.json(updated);
  });
  app.delete("/api/settings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    const item = await storage.getSetting(id);
    if (!item) return res.status(404).json({ error: "Setting not found" });
    await storage.deleteSetting(id);
    res.sendStatus(204);
  });

  // Collected Data API
  app.get("/api/collected-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await storage.getCollectedData();
    res.json(items);
  });
  app.get("/api/collected-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getCollectedDataById(id);
    if (!item) return res.status(404).json({ error: "Collected data not found" });
    res.json(item);
  });
  app.post("/api/collected-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validated = insertCollectedDataSchema.parse(req.body);
      const created = await storage.createCollectedData(validated);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create collected data" });
    }
  });
  app.put("/api/collected-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getCollectedDataById(id);
    if (!item) return res.status(404).json({ error: "Collected data not found" });
    const updated = await storage.updateCollectedData(id, req.body);
    res.json(updated);
  });
  app.delete("/api/collected-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getCollectedDataById(id);
    if (!item) return res.status(404).json({ error: "Collected data not found" });
    await storage.deleteCollectedData(id);
    res.sendStatus(204);
  });

  // Processed Data API
  app.get("/api/processed-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await storage.getProcessedData();
    res.json(items);
  });
  app.get("/api/processed-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getProcessedDataById(id);
    if (!item) return res.status(404).json({ error: "Processed data not found" });
    res.json(item);
  });
  app.post("/api/processed-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validated = insertProcessedDataSchema.parse(req.body);
      const created = await storage.createProcessedData(validated);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: "Failed to create processed data" });
    }
  });
  app.put("/api/processed-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getProcessedDataById(id);
    if (!item) return res.status(404).json({ error: "Processed data not found" });
    const updated = await storage.updateProcessedData(id, req.body);
    res.json(updated);
  });
  app.delete("/api/processed-data/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const item = await storage.getProcessedDataById(id);
    if (!item) return res.status(404).json({ error: "Processed data not found" });
    await storage.deleteProcessedData(id);
    res.sendStatus(204);
  });

  // Data Collection API
  app.post("/api/data-sources/fetch-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get all active sources
      const sources = await storage.getDataSources();
      const activeSources = sources.filter(source => source.status === 'active');
      
      // Start fetching data from all active sources
      await dataSourceService.fetchFromAllSources();
      
      // Process the collected data
      await dataSourceService.processCollectedData();
      
      res.status(200).json({ 
        success: true, 
        message: "Data fetch initiated from all active sources",
        sourcesCount: activeSources.length
      });
    } catch (error) {
      console.error("Error fetching data from sources:", error);
      res.status(500).json({ success: false, error: "Failed to fetch data from sources" });
    }
  });
  

  
  app.post("/api/data-sources/:id/fetch", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const sourceId = parseInt(req.params.id);
      
      // Check if source exists
      const source = await storage.getDataSource(sourceId);
      if (!source) {
        return res.status(404).json({ success: false, error: "Data source not found" });
      }
      
      // Fetch data from the specific source
      await dataSourceService.fetchFromSource(sourceId);
      
      // Process the collected data
      await dataSourceService.processCollectedData();
      
      res.status(200).json({ success: true, message: `Data fetch initiated from source: ${source.name}` });
    } catch (error) {
      console.error(`Error fetching data from source:`, error);
      res.status(500).json({ success: false, error: "Failed to fetch data from source" });
    }
  });
  
  app.post("/api/data-sources/:id/manual-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const sourceId = parseInt(req.params.id);
      
      // Check if source exists
      const source = await storage.getDataSource(sourceId);
      if (!source) {
        return res.status(404).json({ success: false, error: "Data source not found" });
      }
      
      // Validate the manual data
      const { content, metadata } = req.body;
      if (!content) {
        return res.status(400).json({ success: false, error: "Content is required" });
      }
      
      // Add manual data
      const data = await dataSourceService.addManualData(sourceId, { content, metadata });
      
      // Process the collected data
      await dataSourceService.processCollectedData();
      
      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error("Error adding manual data:", error);
      res.status(500).json({ success: false, error: "Failed to add manual data" });
    }
  });
  
  // Check collected data processing status
  app.get("/api/collected-data/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Query the database for collected data statistics
      const { collectedData } = await import("@shared/schema");
      
      // Get total count
      const [totalResult] = await db.select({ count: count() }).from(collectedData);
      const total = totalResult?.count || 0;
      
      // Get unprocessed count
      const [unprocessedResult] = await db.select({ count: count() })
        .from(collectedData)
        .where(eq(collectedData.status, 'unprocessed'));
      const unprocessed = unprocessedResult?.count || 0;
      
      // Get processed count
      const [processedResult] = await db.select({ count: count() })
        .from(collectedData)
        .where(eq(collectedData.status, 'processed'));
      const processed = processedResult?.count || 0;
      
      // Get error count
      const [errorResult] = await db.select({ count: count() })
        .from(collectedData)
        .where(eq(collectedData.status, 'error'));
      const errors = errorResult?.count || 0;
      
      // Return statistics
      res.status(200).json({
        success: true,
        stats: {
          total,
          unprocessed,
          processed,
          errors
        }
      });
    } catch (error) {
      console.error("Error getting collected data status:", error);
      res.status(500).json({ success: false, error: "Failed to get collected data status" });
    }
  });
  
  // Manual Incident Coordinate API
  app.post("/api/incidents/manual-coordinates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { latitude, longitude, title, description, severity, region } = req.body;
      
      if (!latitude || !longitude || !title) {
        return res.status(400).json({ success: false, error: "Latitude, longitude and title are required" });
      }
      
      // Validate coordinates are within Nigeria's bounding box
      const nigeriaBox = {
        minLat: 4.0, maxLat: 14.0,
        minLng: 2.5, maxLng: 15.0
      };
      
      if (latitude < nigeriaBox.minLat || latitude > nigeriaBox.maxLat || 
          longitude < nigeriaBox.minLng || longitude > nigeriaBox.maxLng) {
        return res.status(400).json({ 
          success: false, 
          error: "Coordinates are outside Nigeria's boundaries"
        });
      }
      
      // Create location string in the format "lat,lng"
      const location = `${latitude},${longitude}`;
      
      // Create additional location metadata
      const locationMetadata = {
        coordinates: location,
        region: region || "Unknown"
      };
      
      // Create incident data
      const incidentData = {
        title,
        description: description || "",
        severity: severity || "medium",
        region: region || "Unknown",
        location,
        locationMetadata,
        status: 'active',
        reportedAt: new Date().toISOString(),
        reportedBy: req.user?.id || 1, // Default to admin if no user
        category: "conflict"
      };
      
      // Save the incident
      const newIncident = await storage.createIncident(incidentData);
      
      res.status(201).json({ success: true, incident: newIncident });
    } catch (error) {
      console.error("Error creating incident from coordinates:", error);
      res.status(500).json({ success: false, error: "Failed to create incident from coordinates" });
    }
  });

  return httpServer;
}

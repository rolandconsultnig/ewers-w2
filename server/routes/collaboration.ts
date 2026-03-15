/**
 * Collaboration Routes - Chat, Internal Email, Voice/Video Calls
 */

import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import { storage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { singleUpload } from "../services/file-upload";

export function setupCollaborationRoutes(app: Router, io?: SocketIOServer) {
  // --- CONVERSATIONS (Chat & Email) ---

  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    try {
      const convos = await storage.getConversationsForUser(user.id);
      res.json(convos);
    } catch (e) {
      console.error("Error fetching conversations:", e);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    try {
      const convo = await storage.getConversation(id);
      if (!convo) return res.status(404).json({ error: "Conversation not found" });
      res.json(convo);
    } catch (e) {
      console.error("Error fetching conversation:", e);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  /**
   * Create a conversation.
   * - type "chat": any authenticated user can create (1:1 or small group)
   * - type "group": only admins or high-clearance users can create formal groups
   */
  app.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const { type = "chat", title, incidentId, participantIds } = req.body as {
      type?: string;
      title?: string;
      incidentId?: number | null;
      participantIds?: number[];
    };

    const isGroup = type === "group";
    const isAdminOrSupervisor = user.role === "admin" || user.securityLevel >= 5;
    if (isGroup && !isAdminOrSupervisor) {
      return res.status(403).json({ error: "Only administrators can create groups" });
    }

    try {
      const convo = await storage.createConversation({
        type: isGroup ? "group" : "chat",
        title: title || null,
        incidentId: incidentId || null,
        createdBy: user.id,
      });
      await storage.addConversationParticipant({
        conversationId: convo.id,
        userId: user.id,
        role: "owner",
      });
      const ids = Array.isArray(participantIds) ? participantIds : [];
      for (const uid of ids) {
        if (uid !== user.id) {
          await storage.addConversationParticipant({
            conversationId: convo.id,
            userId: Number(uid),
            role: "member",
          });
        }
      }
      res.status(201).json(convo);
    } catch (e) {
      console.error("Error creating conversation:", e);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    try {
      const participants = await storage.getConversationParticipants(id);
      const withUsers = await Promise.all(
        participants.map(async (p) => {
          const u = await storage.getUser(p.userId);
          return { ...p, user: u ? { id: u.id, username: u.username, fullName: u.fullName, email: u.email } : null };
        })
      );
      res.json(withUsers);
    } catch (e) {
      console.error("Error fetching participants:", e);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.post("/api/conversations/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    try {
      const p = await storage.addConversationParticipant({
        conversationId: id,
        userId: Number(userId),
        role: "member",
      });
      res.status(201).json(p);
    } catch (e) {
      console.error("Error adding participant:", e);
      res.status(500).json({ error: "Failed to add participant" });
    }
  });

  app.put("/api/conversations/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    try {
      const p = await storage.markConversationRead(id, user.id);
      res.json(p);
    } catch (e) {
      console.error("Error marking read:", e);
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  // --- MESSAGES ---

  app.get("/api/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    try {
      const msgs = await storage.getMessages(id, limit);
      const withSenders = await Promise.all(
        msgs.map(async (m) => {
          const u = await storage.getUser(m.senderId);
          return { ...m, sender: u ? { id: u.id, username: u.username, fullName: u.fullName } : null };
        })
      );
      res.json(withSenders.reverse());
    } catch (e) {
      console.error("Error fetching messages:", e);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    const { body } = req.body;
    if (!body || typeof body !== "string") return res.status(400).json({ error: "body required" });
    try {
      const msg = await storage.createMessage({
        conversationId: id,
        senderId: user.id,
        body: body.trim(),
      });
      const sender = await storage.getUser(user.id);
      const payload = { ...msg, sender: sender ? { id: sender.id, username: sender.username, fullName: sender.fullName } : null };
      if (io) io.to(`conversation:${id}`).emit("new-message", payload);
      res.status(201).json(payload);
    } catch (e) {
      console.error("Error creating message:", e);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Attachments: upload a file and create a message that references it
  app.post("/api/conversations/:id/attachments", singleUpload, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: "file is required" });

    try {
      const subdir = file.mimetype.startsWith("image/") ? "images" : file.mimetype.startsWith("audio/") ? "audio" : "documents";
      const url = `/uploads/${subdir}/${file.filename}`;
      const originalName = file.originalname;
      const durationSec = typeof (req as any).body?.duration === "string" ? (req as any).body.duration : undefined;

      // Encode attachment info so the client can render it (voice note vs file)
      const body = file.mimetype.startsWith("audio/")
        ? `__VOICE__::${url}::${originalName}::${durationSec ?? ""}`
        : `__FILE__::${url}::${originalName}`;

      const msg = await storage.createMessage({
        conversationId: id,
        senderId: user.id,
        body,
      });
      const sender = await storage.getUser(user.id);
      const payload = {
        ...msg,
        sender: sender ? { id: sender.id, username: sender.username, fullName: sender.fullName } : null,
      };

      if (io) io.to(`conversation:${id}`).emit("new-message", payload);
      res.status(201).json(payload);
    } catch (e) {
      console.error("Error uploading attachment:", e);
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  // --- CALL SESSIONS ---

  app.get("/api/calls", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const calls = await storage.getActiveCallSessions();
      res.json(calls);
    } catch (e) {
      console.error("Error fetching calls:", e);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  });

  app.get("/api/calls/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid call ID" });
    try {
      const call = await storage.getCallSession(id);
      if (!call) return res.status(404).json({ error: "Call not found" });
      res.json(call);
    } catch (e) {
      console.error("Error fetching call:", e);
      res.status(500).json({ error: "Failed to fetch call" });
    }
  });

  app.post("/api/calls", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const { type = "video", conversationId, incidentId } = req.body;
    try {
      const call = await storage.createCallSession({
        type: type || "video",
        conversationId: conversationId || null,
        incidentId: incidentId || null,
        status: "active",
        createdBy: user.id,
      });
      await storage.addCallParticipant({
        callSessionId: call.id,
        userId: user.id,
      });
      res.status(201).json(call);
    } catch (e) {
      console.error("Error creating call:", e);
      res.status(500).json({ error: "Failed to start call" });
    }
  });

  app.post("/api/calls/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid call ID" });
    try {
      const existing = await storage.getCallSession(id);
      if (!existing) return res.status(404).json({ error: "Call not found" });
      const call = await storage.endCallSession(id);
      res.json(call);
    } catch (e) {
      console.error("Error ending call:", e);
      res.status(500).json({ error: "Failed to end call" });
    }
  });

  app.post("/api/calls/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid call ID" });
    try {
      const call = await storage.getCallSession(id);
      if (!call) return res.status(404).json({ error: "Call not found" });
      if (call.status !== "active") return res.status(400).json({ error: "Call has ended" });
      await storage.addCallParticipant({
        callSessionId: id,
        userId: user.id,
      });
      res.status(201).json({ id: call.id, type: call.type, status: call.status });
    } catch (e) {
      console.error("Error joining call:", e);
      res.status(500).json({ error: "Failed to join call" });
    }
  });

  app.post("/api/calls/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid call ID" });
    try {
      const p = await storage.leaveCallParticipant(id, user.id);
      res.json(p || {});
    } catch (e) {
      console.error("Error leaving call:", e);
      res.status(500).json({ error: "Failed to leave call" });
    }
  });
}

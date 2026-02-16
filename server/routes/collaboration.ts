/**
 * Collaboration Routes - Chat, Internal Email, Voice/Video Calls
 */

import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import { storage } from "../storage";
import type { User as SelectUser } from "@shared/schema";

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

  app.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const { type = "chat", title, incidentId, participantIds } = req.body;
    try {
      const convo = await storage.createConversation({
        type: type || "chat",
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

  // --- CALL SESSIONS ---

  app.get("/api/calls", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Return active calls - for now we don't have a list endpoint, so return empty
      res.json([]);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch calls" });
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
    try {
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
    try {
      const p = await storage.addCallParticipant({
        callSessionId: id,
        userId: user.id,
      });
      res.status(201).json(p);
    } catch (e) {
      console.error("Error joining call:", e);
      res.status(500).json({ error: "Failed to join call" });
    }
  });

  app.post("/api/calls/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    try {
      const p = await storage.leaveCallParticipant(id, user.id);
      res.json(p || {});
    } catch (e) {
      console.error("Error leaving call:", e);
      res.status(500).json({ error: "Failed to leave call" });
    }
  });
}

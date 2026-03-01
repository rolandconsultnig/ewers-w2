/**
 * Collaboration Routes - Chat, Internal Email, Voice/Video Calls
 */

import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import { storage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { signCallGuestToken, verifyCallGuestToken } from "../auth";
import { sendEmail } from "../services/email-service";

export function setupCollaborationRoutes(app: Router, io?: SocketIOServer) {
  // --- CONVERSATIONS (Chat & Email) ---

  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    try {
      const convos = await storage.getConversationsForUser(user.id);
      const enriched = await Promise.all(
        convos.map(async (c) => {
          const [lastMessage, unreadCount] = await Promise.all([
            storage.getLastMessageForConversation(c.id),
            storage.getUnreadCountForParticipant(c.id, user.id),
          ]);
          return {
            ...c,
            lastMessage: lastMessage
              ? { id: lastMessage.id, body: lastMessage.body, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
              : null,
            unreadCount,
          };
        })
      );
      res.json(enriched);
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

  app.post("/api/email/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { to, subject, body } = req.body || {};
    const emails = Array.isArray(to) ? to : typeof to === "string" ? [to].filter(Boolean) : [];
    const valid = emails
      .map((e: string) => String(e).trim().toLowerCase())
      .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (valid.length === 0) return res.status(400).json({ error: "At least one valid email address required" });
    if (!subject || !String(subject).trim()) return res.status(400).json({ error: "Subject required" });
    const text = body ? String(body).trim() : "";
    try {
      const ok = await sendEmail({ to: valid, subject: String(subject).trim(), text, html: text ? undefined : "<p></p>" });
      if (!ok) return res.status(500).json({ error: "Failed to send email; check server mail configuration." });
      res.json({ sent: true, to: valid });
    } catch (e) {
      console.error("Error sending external email:", e);
      res.status(500).json({ error: "Failed to send email" });
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
      const payload = { ...msg, conversationId: id, sender: sender ? { id: sender.id, username: sender.username, fullName: sender.fullName } : null };
      if (io) io.to(`conversation:${id}`).emit("new-message", payload);
      res.status(201).json(payload);
    } catch (e) {
      console.error("Error creating message:", e);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/conversations/:id/messages/:msgId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    const msgId = parseInt(req.params.msgId);
    const { body } = req.body;
    if (!body || typeof body !== "string") return res.status(400).json({ error: "body required" });
    try {
      const existing = await storage.getMessage(msgId);
      if (!existing || existing.conversationId !== id || existing.senderId !== user.id)
        return res.status(403).json({ error: "Forbidden" });
      const msg = await storage.updateMessage(msgId, { body: body.trim(), editedAt: new Date() });
      const sender = await storage.getUser(user.id);
      const payload = { ...msg, conversationId: id, sender: sender ? { id: sender.id, username: sender.username, fullName: sender.fullName } : null };
      if (io) io.to(`conversation:${id}`).emit("message-updated", payload);
      res.json(payload);
    } catch (e) {
      console.error("Error updating message:", e);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  app.delete("/api/conversations/:id/messages/:msgId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    const id = parseInt(req.params.id);
    const msgId = parseInt(req.params.msgId);
    try {
      const existing = await storage.getMessage(msgId);
      if (!existing || existing.conversationId !== id || existing.senderId !== user.id)
        return res.status(403).json({ error: "Forbidden" });
      const msg = await storage.deleteMessage(msgId);
      if (io) io.to(`conversation:${id}`).emit("message-deleted", { conversationId: id, messageId: msgId });
      res.json({ deleted: true, messageId: msgId });
    } catch (e) {
      console.error("Error deleting message:", e);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // --- CALL SESSIONS ---

  app.get("/api/calls", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const calls = await storage.getActiveCallSessions();
      res.json(calls);
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
      const call = await storage.getCallSession(id);
      if (!call || call.status !== "active") return res.status(404).json({ error: "Call not found or ended" });
      await storage.addCallParticipant({
        callSessionId: id,
        userId: user.id,
      });
      res.status(201).json({ id: call.id, type: call.type });
    } catch (e) {
      console.error("Error joining call:", e);
      res.status(500).json({ error: "Failed to join call" });
    }
  });

  app.get("/api/calls/:id/public", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid call ID" });
    try {
      const call = await storage.getCallSession(id);
      if (!call) return res.status(404).json({ error: "Call not found" });
      res.json({ id: call.id, type: call.type, status: call.status });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch call" });
    }
  });

  app.post("/api/calls/:id/join-guest", async (req, res) => {
    const id = parseInt(req.params.id);
    const { displayName } = req.body || {};
    const name = typeof displayName === "string" ? displayName.trim() : "";
    if (!name || name.length < 1) return res.status(400).json({ error: "Display name is required" });
    try {
      const call = await storage.getCallSession(id);
      if (!call || call.status !== "active") return res.status(404).json({ error: "Call not found or ended" });
      const participant = await storage.addCallParticipant({
        callSessionId: id,
        userId: null,
        guestDisplayName: name.slice(0, 100),
      });
      const guestToken = signCallGuestToken({
        callId: id,
        participantId: participant.id,
        displayName: name.slice(0, 100),
      });
      res.status(201).json({ id: call.id, type: call.type, guestToken, participantId: participant.id });
    } catch (e) {
      console.error("Error joining call as guest:", e);
      res.status(500).json({ error: "Failed to join call" });
    }
  });

  app.post("/api/calls/:id/leave-guest", async (req, res) => {
    const id = parseInt(req.params.id);
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Guest token required" });
    const guest = verifyCallGuestToken(token);
    if (!guest || guest.callId !== id) return res.status(401).json({ error: "Invalid token" });
    try {
      await storage.leaveCallParticipantByGuestId(id, guest.participantId);
      res.json({ left: true });
    } catch (e) {
      console.error("Error leaving call as guest:", e);
      res.status(500).json({ error: "Failed to leave call" });
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

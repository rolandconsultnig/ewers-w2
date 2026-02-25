/**
 * Election Monitoring - Pre-election & Post-election, parties, politicians, actors, violence/events
 */
import { Router } from "express";
import { storage } from "../storage";
import type { User as SelectUser } from "@shared/schema";

export function setupElectionMonitoringRoutes(app: Router) {
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  };

  app.get("/api/elections", requireAuth, async (_req, res) => {
    try {
      const list = await storage.getElections();
      res.json(list);
    } catch (e) {
      console.error("Error fetching elections:", e);
      res.status(500).json({ error: "Failed to fetch elections" });
    }
  });

  app.get("/api/elections/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    try {
      const election = await storage.getElection(id);
      if (!election) return res.status(404).json({ error: "Election not found" });
      res.json(election);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch election" });
    }
  });

  app.post("/api/elections", requireAuth, async (req, res) => {
    const user = req.user as SelectUser;
    const { name, type, region, state, electionDate, status, description } = req.body || {};
    if (!name || !type || !electionDate) return res.status(400).json({ error: "name, type, and electionDate required" });
    try {
      const election = await storage.createElection({
        name,
        type,
        region: region || "Nigeria",
        state: state || null,
        electionDate,
        status: status || "pre_election",
        description: description || null,
      });
      res.status(201).json(election);
    } catch (e) {
      console.error("Error creating election:", e);
      res.status(500).json({ error: "Failed to create election" });
    }
  });

  app.put("/api/elections/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { name, type, region, state, electionDate, status, description } = req.body || {};
    try {
      const election = await storage.updateElection(id, {
        ...(name != null && { name }),
        ...(type != null && { type }),
        ...(region != null && { region }),
        ...(state != null && { state }),
        ...(electionDate != null && { electionDate }),
        ...(status != null && { status }),
        ...(description != null && { description }),
      });
      res.json(election);
    } catch (e) {
      res.status(500).json({ error: "Failed to update election" });
    }
  });

  app.get("/api/political-parties", requireAuth, async (_req, res) => {
    try {
      const list = await storage.getPoliticalParties();
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch parties" });
    }
  });

  app.post("/api/political-parties", requireAuth, async (req, res) => {
    const { name, abbreviation, logoUrl, description } = req.body || {};
    if (!name) return res.status(400).json({ error: "name required" });
    try {
      const party = await storage.createPoliticalParty({ name, abbreviation: abbreviation || null, logoUrl: logoUrl || null, description: description || null });
      res.status(201).json(party);
    } catch (e) {
      res.status(500).json({ error: "Failed to create party" });
    }
  });

  app.put("/api/political-parties/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    try {
      const party = await storage.updatePoliticalParty(id, req.body || {});
      res.json(party);
    } catch (e) {
      res.status(500).json({ error: "Failed to update party" });
    }
  });

  app.get("/api/politicians", requireAuth, async (req, res) => {
    const electionId = req.query.electionId ? parseInt(String(req.query.electionId)) : undefined;
    const partyId = req.query.partyId ? parseInt(String(req.query.partyId)) : undefined;
    try {
      const list = await storage.getPoliticians({ electionId, partyId });
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch politicians" });
    }
  });

  app.get("/api/politicians/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    try {
      const p = await storage.getPolitician(id);
      if (!p) return res.status(404).json({ error: "Politician not found" });
      res.json(p);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch politician" });
    }
  });

  app.post("/api/politicians", requireAuth, async (req, res) => {
    const { fullName, partyId, electionId, position, state, lga, photoUrl, bio } = req.body || {};
    if (!fullName) return res.status(400).json({ error: "fullName required" });
    try {
      const p = await storage.createPolitician({
        fullName,
        partyId: partyId || null,
        electionId: electionId || null,
        position: position || null,
        state: state || null,
        lga: lga || null,
        photoUrl: photoUrl || null,
        bio: bio || null,
      });
      res.status(201).json(p);
    } catch (e) {
      res.status(500).json({ error: "Failed to create politician" });
    }
  });

  app.put("/api/politicians/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    try {
      const p = await storage.updatePolitician(id, req.body || {});
      res.json(p);
    } catch (e) {
      res.status(500).json({ error: "Failed to update politician" });
    }
  });

  app.get("/api/elections/:electionId/actors", requireAuth, async (req, res) => {
    const electionId = parseInt(req.params.electionId);
    if (isNaN(electionId)) return res.status(400).json({ error: "Invalid election ID" });
    try {
      const list = await storage.getElectionActors(electionId);
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch actors" });
    }
  });

  app.post("/api/elections/:electionId/actors", requireAuth, async (req, res) => {
    const electionId = parseInt(req.params.electionId);
    if (isNaN(electionId)) return res.status(400).json({ error: "Invalid election ID" });
    const { name, type, role, description } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: "name and type required" });
    try {
      const a = await storage.createElectionActor({ electionId, name, type, role: role || null, description: description || null });
      res.status(201).json(a);
    } catch (e) {
      res.status(500).json({ error: "Failed to create actor" });
    }
  });

  app.get("/api/elections/:electionId/events", requireAuth, async (req, res) => {
    const electionId = parseInt(req.params.electionId);
    if (isNaN(electionId)) return res.status(400).json({ error: "Invalid election ID" });
    const type = req.query.type as string | undefined;
    try {
      const list = await storage.getElectionEvents(electionId, type ? { type } : undefined);
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/elections/:electionId/events", requireAuth, async (req, res) => {
    const user = req.user as SelectUser;
    const electionId = parseInt(req.params.electionId);
    if (isNaN(electionId)) return res.status(400).json({ error: "Invalid election ID" });
    const { title, description, type, severity, location, state, lga, eventDate, partyId, politicianId, actorId, incidentId } = req.body || {};
    if (!title || !type) return res.status(400).json({ error: "title and type required" });
    try {
      const e = await storage.createElectionEvent({
        electionId,
        title,
        description: description || null,
        type,
        severity: severity || "medium",
        location: location || null,
        state: state || null,
        lga: lga || null,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        partyId: partyId || null,
        politicianId: politicianId || null,
        actorId: actorId || null,
        incidentId: incidentId || null,
        reportedBy: user.id,
      });
      res.status(201).json(e);
    } catch (err) {
      console.error("Error creating election event:", err);
      res.status(500).json({ error: "Failed to create event" });
    }
  });
}

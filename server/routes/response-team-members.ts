/**
 * Response Team Members Routes
 * Endpoints for managing team member assignments
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import type { User as SelectUser } from "@shared/schema";
import { db } from "../db";
import { responseTeams, users } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TeamMember {
  userId: number;
  role: string;
  assignedAt: Date;
}

export function setupResponseTeamMembersRoutes(app: Router, storage: IStorage) {
  
  // Get team members for a specific team
  app.get("/api/response-teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getResponseTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Response team not found" });
      }

      // Parse members from team metadata
      const members = (team.members as any) || [];
      
      // Fetch user details for each member
      const memberDetails = await Promise.all(
        members.map(async (member: TeamMember) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              role: user.role,
              email: user.email,
            } : null,
          };
        })
      );

      res.json(memberDetails);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Add member to team
  app.post("/api/response-teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const currentUser = req.user as SelectUser;
    if (currentUser.role !== "admin" && currentUser.role !== "coordinator") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const teamId = parseInt(req.params.id);
      const { userId, role = "member" } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const team = await storage.getResponseTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Response team not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get current members
      const currentMembers = (team.members as any) || [];
      
      // Check if user is already a member
      const existingMember = currentMembers.find((m: TeamMember) => m.userId === userId);
      if (existingMember) {
        return res.status(400).json({ error: "User is already a team member" });
      }

      // Add new member
      const newMember: TeamMember = {
        userId,
        role,
        assignedAt: new Date(),
      };

      const updatedMembers = [...currentMembers, newMember];

      // Update team
      await storage.updateResponseTeam(teamId, {
        members: updatedMembers as any,
      });

      res.status(201).json({
        ...newMember,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ error: "Failed to add team member" });
    }
  });

  // Update team member role
  app.put("/api/response-teams/:id/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const currentUser = req.user as SelectUser;
    if (currentUser.role !== "admin" && currentUser.role !== "coordinator") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const teamId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: "role is required" });
      }

      const team = await storage.getResponseTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Response team not found" });
      }

      const currentMembers = (team.members as any) || [];
      const memberIndex = currentMembers.findIndex((m: TeamMember) => m.userId === userId);

      if (memberIndex === -1) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Update member role
      currentMembers[memberIndex].role = role;

      await storage.updateResponseTeam(teamId, {
        members: currentMembers as any,
      });

      const user = await storage.getUser(userId);

      res.json({
        ...currentMembers[memberIndex],
        user: user ? {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
        } : null,
      });
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Remove member from team
  app.delete("/api/response-teams/:id/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const currentUser = req.user as SelectUser;
    if (currentUser.role !== "admin" && currentUser.role !== "coordinator") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const teamId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      const team = await storage.getResponseTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Response team not found" });
      }

      const currentMembers = (team.members as any) || [];
      const updatedMembers = currentMembers.filter((m: TeamMember) => m.userId !== userId);

      if (currentMembers.length === updatedMembers.length) {
        return res.status(404).json({ error: "Team member not found" });
      }

      await storage.updateResponseTeam(teamId, {
        members: updatedMembers as any,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Get all teams for a specific user
  app.get("/api/users/:userId/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.userId);
      const allTeams = await storage.getResponseTeams();

      const userTeams = allTeams.filter(team => {
        const members = (team.members as any) || [];
        return members.some((m: TeamMember) => m.userId === userId);
      });

      res.json(userTeams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ error: "Failed to fetch user teams" });
    }
  });
}

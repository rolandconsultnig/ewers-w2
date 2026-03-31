import { z } from "zod";
import type { Request, Response } from "express";
import { insertCmsContentSchema } from "@shared/schema";
import { storage } from "../storage";

export const cmsContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export function registerCmsRoutes(app: any) {
  // Get all CMS content
  app.get("/api/cms/content", async (req: Request, res: Response) => {
    try {
      const contents = await storage.getCmsContents();
      res.json(contents);
    } catch (error: any) {
      console.error("Error fetching CMS contents:", error);
      res.status(500).json({ error: "Failed to fetch CMS contents" });
    }
  });

  // Get specific CMS content by section
  app.get("/api/cms/content/:section", async (req: Request, res: Response) => {
    try {
      const { section } = req.params;
      const content = await storage.getCmsContentBySection(section);
      
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching CMS content:", error);
      res.status(500).json({ error: "Failed to fetch CMS content" });
    }
  });

  // Create or update CMS content
  app.put("/api/cms/content/:section", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { section } = req.params;
      const validatedData = cmsContentSchema.parse(req.body);
      
      // Check if content exists
      const existingContent = await storage.getCmsContentBySection(section);
      
      let content;
      if (existingContent) {
        // Update existing content
        content = await storage.updateCmsContent(section, {
          ...validatedData,
          lastUpdatedBy: user.id,
          lastUpdatedAt: new Date(),
        });
      } else {
        // Create new content
        const insertData = {
          section,
          ...validatedData,
          lastUpdatedBy: user.id,
        };
        content = await storage.createCmsContent(insertData);
      }

      res.json(content);
    } catch (error: any) {
      console.error("Error updating CMS content:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update CMS content" });
    }
  });

  // Delete CMS content
  app.delete("/api/cms/content/:section", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { section } = req.params;
      const success = await storage.deleteCmsContent(section);
      
      if (!success) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json({ message: "Content deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting CMS content:", error);
      res.status(500).json({ error: "Failed to delete CMS content" });
    }
  });
}

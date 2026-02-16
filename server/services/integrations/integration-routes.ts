import { Express, Request, Response } from 'express';
import { integrationServices } from './index';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';
import * as smsLogsService from '../sms-logs-service';

/**
 * Register integration-related API routes
 * @param app - Express application
 */
export function registerIntegrationRoutes(app: Express): void {
  // Authentication check middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Integration status endpoint (requires auth)
  app.get('/api/integration/status', requireAuth, (req, res) => {
    const status = integrationServices.checkStatus();
    res.json(status);
  });
  
  // Public integration status endpoint (for debugging)
  app.get('/api/integration/status/public', (req, res) => {
    const status = integrationServices.checkStatus();
    res.json(status);
  });

  // TWILIO (SMS/WHATSAPP) ROUTES
  
  // Send SMS
  app.post('/api/integration/sms/send', requireAuth, async (req, res) => {
    const smsSchema = z.object({
      to: z.string().min(1, "Recipient phone number is required"),
      body: z.string().min(1, "Message body is required"),
      mediaUrl: z.string().url().optional(),
    });
    
    try {
      const validation = smsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors.map(e => e.message).join(', ') 
        });
      }
      
      const result = await integrationServices.twilio.sendSMS(validation.data);
      try {
        const user = req.user as { id?: number } | undefined;
        await smsLogsService.logSmsSend({
          recipient: validation.data.to,
          message: validation.data.body,
          status: result.success ? 'delivered' : 'failed',
          externalId: result.messageId,
          sentBy: user?.id,
        });
      } catch (logErr) {
        console.warn("SMS log failed (table may not exist):", logErr);
      }
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send SMS' });
    }
  });
  
  // Send WhatsApp message
  app.post('/api/integration/whatsapp/send', requireAuth, async (req, res) => {
    const whatsappSchema = z.object({
      to: z.string().min(1, "Recipient phone number is required"),
      body: z.string().min(1, "Message body is required"),
      mediaUrl: z.string().url().optional(),
    });
    
    try {
      const validation = whatsappSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors.map(e => e.message).join(', ') 
        });
      }
      
      const result = await integrationServices.twilio.sendWhatsApp(validation.data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send WhatsApp message' });
    }
  });
  
  // Send bulk SMS
  app.post('/api/integration/sms/bulk', requireAuth, async (req, res) => {
    const bulkSmsSchema = z.object({
      recipients: z.array(z.string()).min(1, "At least one recipient is required"),
      body: z.string().min(1, "Message body is required"),
      mediaUrl: z.string().url().optional(),
    });
    
    try {
      const validation = bulkSmsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors.map(e => e.message).join(', ') 
        });
      }
      
      const { recipients, body, mediaUrl } = validation.data;
      const result = await integrationServices.twilio.sendBulkSMS(recipients, body, mediaUrl);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send bulk SMS' });
    }
  });
  
  // TWITTER (X) ROUTES
  
  // Post tweet
  app.post('/api/integration/twitter/tweet', requireAuth, async (req, res) => {
    const tweetSchema = z.object({
      text: z.string().min(1, "Tweet text is required").max(280, "Tweet exceeds 280 characters"),
      mediaIds: z.array(z.string()).optional(),
      inReplyToId: z.string().optional(),
      quoteTweetId: z.string().optional(),
    });
    
    try {
      const validation = tweetSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors.map(e => e.message).join(', ') 
        });
      }
      
      const result = await integrationServices.twitter.postTweet(validation.data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to post tweet' });
    }
  });
  
  // Search tweets
  app.get('/api/integration/twitter/search', requireAuth, async (req, res) => {
    const query = req.query.q as string;
    const maxResults = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    try {
      const result = await integrationServices.twitter.searchTweets({
        query,
        maxResults
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to search tweets' });
    }
  });
  
  // Get user timeline
  app.get('/api/integration/twitter/timeline/:username', requireAuth, async (req, res) => {
    const username = req.params.username;
    const maxResults = parseInt(req.query.limit as string) || 10;
    
    try {
      const result = await integrationServices.twitter.getUserTimeline(username, maxResults);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get user timeline' });
    }
  });
  
  // FACEBOOK ROUTES
  
  // Post to Facebook
  app.post('/api/integration/facebook/post', requireAuth, async (req, res) => {
    const postSchema = z.object({
      message: z.string().min(1, "Post message is required"),
      link: z.string().url().optional(),
      picture: z.string().url().optional(),
      name: z.string().optional(),
      caption: z.string().optional(),
      description: z.string().optional(),
      published: z.boolean().optional().default(true),
      targetPageId: z.string().optional()
    });
    
    try {
      const validation = postSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors.map(e => e.message).join(', ') 
        });
      }
      
      const result = await integrationServices.facebook.createPost(validation.data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to post to Facebook' });
    }
  });
  
  // Get Facebook posts
  app.get('/api/integration/facebook/posts', requireAuth, async (req, res) => {
    const targetId = req.query.target as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    try {
      const result = await integrationServices.facebook.getPosts(targetId, limit);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get Facebook posts' });
    }
  });
  
  // Search Facebook posts
  app.get('/api/integration/facebook/search', requireAuth, async (req, res) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    try {
      const result = await integrationServices.facebook.searchPosts(query, limit);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to search Facebook posts' });
    }
  });
  
  // INSTAGRAM ROUTES
  
  // Post to Instagram
  app.post('/api/integration/instagram/post', requireAuth, async (req, res) => {
    const postSchema = z.object({
      caption: z.string().min(1, "Post caption is required"),
      mediaUrl: z.string().url().min(1, "Media URL is required"),
      isStory: z.boolean().optional().default(false)
    });
    
    try {
      const validation = postSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors.map(e => e.message).join(', ') 
        });
      }
      
      const result = await integrationServices.instagram.createPost(validation.data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to post to Instagram' });
    }
  });
  
  // Search Instagram
  app.get('/api/integration/instagram/search', requireAuth, async (req, res) => {
    const query = req.query.q as string;
    const maxResults = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    try {
      const result = await integrationServices.instagram.search({
        query,
        maxResults
      });
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to search Instagram' });
    }
  });
  
  // Search Instagram locations
  app.get('/api/integration/instagram/locations', requireAuth, async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }
    
    try {
      const result = await integrationServices.instagram.searchLocations(lat, lng, limit);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to search Instagram locations' });
    }
  });
}
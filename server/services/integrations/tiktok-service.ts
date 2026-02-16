/**
 * TikTok Integration Service
 * TikTok's public API is limited; Research API and Display API require approval.
 * This service provides a stub that can be extended when credentials are available.
 */
import { z } from 'zod';

const tiktokEnvSchema = z.object({
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
});

class TikTokService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const envCheck = tiktokEnvSchema.safeParse(process.env);
      if (envCheck.success && envCheck.data.TIKTOK_CLIENT_KEY && envCheck.data.TIKTOK_CLIENT_SECRET) {
        this.isInitialized = true;
        console.log('TikTok service initialized (credentials present)');
      } else {
        console.warn('TikTok: No valid API credentials. TikTok Research/Display API requires app approval.');
      }
    } catch (error) {
      console.warn('TikTok service not configured:', error);
    }
  }

  /**
   * Get posts/videos from TikTok. Requires TikTok Research API or Display API approval.
   * Returns empty until properly configured with approved API access.
   */
  async getPosts(_limit: number = 10): Promise<{ success: boolean; posts?: any[]; error?: string }> {
    if (!this.isInitialized) {
      return {
        success: false,
        posts: [],
        error: 'TikTok API not configured. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET; TikTok Research API may require approval.',
      };
    }
    // Placeholder for future TikTok API calls (e.g. research API search)
    return { success: true, posts: [] };
  }

  verifyConfiguration(): { configured: boolean; missingVars: string[] } {
    const missingVars: string[] = [];
    if (!process.env.TIKTOK_CLIENT_KEY) missingVars.push('TIKTOK_CLIENT_KEY');
    if (!process.env.TIKTOK_CLIENT_SECRET) missingVars.push('TIKTOK_CLIENT_SECRET');
    return {
      configured: missingVars.length === 0 && this.isInitialized,
      missingVars,
    };
  }
}

export const tiktokService = new TikTokService();

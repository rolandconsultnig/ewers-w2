/**
 * Social Posts Service - Aggregates social media posts from collected data and integrations.
 * Fetches current information from the web via X (Twitter), Facebook, and TikTok.
 * Applies content filtering using configurable watch words.
 */
import { db } from "../db";
import { collectedData, dataSources } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { integrationServices } from "./integrations";
import { getWatchWords, matchWatchWords } from "./watch-words-service";

export interface SocialMediaPost {
  id: string;
  platform: string;
  author: string;
  content: string;
  timestamp: string;
  location: string;
  url?: string;
  crisisType?: string;
  confidence?: number;
  sourceId?: number;
  /** Words from the watch list that appeared in this post (content filtering). */
  flaggedWords?: string[];
}

export async function getSocialPosts(platform?: string): Promise<SocialMediaPost[]> {
  const posts: SocialMediaPost[] = [];

  // 1. Get from collected data (social sources)
  const socialSources = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.type, "social"));

  if (socialSources.length > 0) {
    const sourceIds = socialSources.map((s) => s.id);
    const collected = await db
      .select()
      .from(collectedData)
      .orderBy(desc(collectedData.collectedAt))
      .limit(100);

    const socialCollected = collected.filter((c) => sourceIds.includes(c.sourceId));

    for (const item of socialCollected) {
      const source = socialSources.find((s) => s.id === item.sourceId);
      const name = source?.name?.toLowerCase() || "social";
      const sourcePlatform = name.includes("twitter") ? "twitter"
        : name.includes("facebook") ? "facebook"
        : name.includes("instagram") ? "instagram"
        : name.includes("tiktok") ? "tiktok"
        : "social";

      if (platform && sourcePlatform !== platform) continue;

      const content = typeof item.content === "object" ? JSON.stringify(item.content) : String(item.content || "");
      const contentObj = typeof item.content === "object" && item.content !== null ? (item.content as Record<string, unknown>) : null;
      const author = (contentObj?.author as string) || (contentObj?.user as string) || "Unknown";
      const timestamp = (contentObj?.date as string) || (contentObj?.timestamp as string) || item.collectedAt?.toISOString() || new Date().toISOString();

      posts.push({
        id: `collected-${item.id}`,
        platform: sourcePlatform,
        author,
        content: typeof contentObj?.content === "string" ? contentObj.content : content,
        timestamp,
        location: item.location || item.region || "Nigeria",
        url: (contentObj?.url as string) || undefined,
        crisisType: (contentObj?.severity as string) || undefined,
        confidence: (contentObj?.confidence as number) || 0.7,
        sourceId: item.sourceId,
      });
    }
  }

  // 2. Fetch current information from the web (X/Twitter, Facebook, TikTok)
  try {
    const status = integrationServices.checkStatus();

    // X (Twitter): search for current Nigeria peace, conflict, security, crisis
    if (platform !== "facebook" && platform !== "tiktok" && status.twitter.configured) {
      const queries = [
        "Nigeria conflict OR crisis OR protest",
        "Nigeria peace OR security OR IPCR",
        "Nigeria unrest OR violence OR emergency",
      ];
      for (const q of queries) {
        const result = await integrationServices.twitter.searchTweets({
          query: q,
          maxResults: 8,
        });
        if (result.success && result.tweets) {
          const tweets = Array.isArray(result.tweets) ? result.tweets : [result.tweets];
          for (const t of tweets) {
            if (platform && platform !== "twitter") continue;
            const tweet = t as Record<string, unknown>;
            const id = `twitter-${tweet.id || `${q.length}-${Math.random()}`}`;
            if (posts.some((p) => p.id === id)) continue;
            posts.push({
              id,
              platform: "twitter",
              author: (tweet.author as string) || (tweet.username as string) || "Twitter User",
              content: (tweet.text as string) || (tweet.content as string) || "",
              timestamp: (tweet.created_at as string) || new Date().toISOString(),
              location: "Nigeria",
              confidence: 0.8,
            });
          }
        }
      }
    }

    // Facebook: get current posts from configured page/feed
    if (platform !== "twitter" && platform !== "tiktok" && status.facebook.configured) {
      const result = await integrationServices.facebook.getPosts(undefined, 15);
      if (result.success && result.posts) {
        const fbPosts = Array.isArray(result.posts) ? result.posts : [result.posts];
        for (const p of fbPosts) {
          if (platform && platform !== "facebook") continue;
          const post = p as Record<string, unknown>;
          const from = post.from as Record<string, unknown> | undefined;
          posts.push({
            id: `facebook-${post.id || Math.random()}`,
            platform: "facebook",
            author: (from?.name as string) || "Facebook User",
            content: (post.message as string) || "",
            timestamp: (post.created_time as string) || new Date().toISOString(),
            location: "Nigeria",
            confidence: 0.7,
          });
        }
      }
    }

    // TikTok: get current posts when API is configured (stub returns empty until approved)
    if (platform !== "twitter" && platform !== "facebook" && status.tiktok.configured) {
      const result = await integrationServices.tiktok.getPosts(10);
      if (result.success && result.posts && result.posts.length > 0) {
        const tiktokPosts = result.posts as Array<Record<string, unknown>>;
        for (const v of tiktokPosts) {
          if (platform && platform !== "tiktok") continue;
          posts.push({
            id: `tiktok-${v.id || Math.random()}`,
            platform: "tiktok",
            author: (v.author as string) || (v.creator as string) || "TikTok User",
            content: (v.description as string) || (v.title as string) || "",
            timestamp: (v.create_time as string) || (v.timestamp as string) || new Date().toISOString(),
            location: "Nigeria",
            confidence: 0.7,
          });
        }
      }
    }
  } catch {
    // Ignore integration errors - collected data is primary source
  }

  // Sort by timestamp descending
  posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply content filtering: flag posts that contain watch words
  const watchWords = await getWatchWords();
  if (watchWords.length > 0) {
    for (const post of posts) {
      const matched = matchWatchWords(post.content, watchWords);
      if (matched.length > 0) post.flaggedWords = matched;
    }
  }

  return posts.slice(0, 50);
}

/**
 * Fetch current information from the web (X, Facebook, TikTok) and optionally save to collected data.
 * Returns the same aggregated posts as getSocialPosts().
 */
export async function fetchFromWebAndStore(saveToDb: boolean = false): Promise<SocialMediaPost[]> {
  const posts = await getSocialPosts(undefined);

  if (saveToDb && posts.length > 0) {
    const socialSources = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.type, "social"));

    const byName = Object.fromEntries(socialSources.map((s) => [s.name.toLowerCase(), s]));
    const platforms = ["twitter", "facebook", "tiktok"] as const;

    for (const platform of platforms) {
      const existing = byName[platform] || byName[platform === "twitter" ? "x" : platform];
      let sourceId: number | null = existing?.id ?? null;
      if (!sourceId) {
        const [created] = await db
          .insert(dataSources)
          .values({
            name: platform.charAt(0).toUpperCase() + platform.slice(1),
            type: "social",
            status: "active",
            region: "Nigeria",
          })
          .returning();
        if (created) {
          sourceId = created.id;
          byName[platform] = created as (typeof socialSources)[0];
        }
      }
      if (!sourceId) continue;

      const platformPosts = posts.filter((p) => p.platform === platform);
      for (const p of platformPosts) {
        await db.insert(collectedData).values({
          sourceId,
          content: {
            author: p.author,
            content: p.content,
            timestamp: p.timestamp,
            url: p.url,
            severity: p.crisisType,
            confidence: p.confidence,
          },
          location: p.location,
          region: "Nigeria",
        });
      }
    }
  }

  return posts;
}

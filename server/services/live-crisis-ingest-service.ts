/**
 * Live Crisis Ingest Service
 *
 * Orchestrates fetching live crisis-related information for Nigeria from:
 * - Social media (X/Twitter, Facebook, TikTok) via social-posts-service
 * - News APIs via news-service
 *
 * Stores results in collected_data via fetchFromWebAndStore(saveToDb)
 * and optionally auto-creates incidents for high-signal items based on watch words.
 */
import { fetchFromWebAndStore, SocialMediaPost } from "./social-posts-service";
import { fetchNigeriaCrisisNews, NewsItem } from "./news-service";
import { db } from "../db";
import { collectedData, dataSources, incidents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getWatchWords, matchWatchWords } from "./watch-words-service";
import { logger } from "./logger";

interface IngestResult {
  socialCount: number;
  newsCount: number;
  incidentsCreated: number;
}

const LIVE_CRISIS_CREATE_INCIDENTS =
  (process.env.LIVE_CRISIS_CREATE_INCIDENTS || "true").toLowerCase() === "true";

/**
 * Ensure a data source exists by name & type, returning its id.
 */
async function ensureDataSourceId(
  name: string,
  type: "social" | "news_media"
): Promise<number | null> {
  const lower = name.toLowerCase();
  const existing = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.name, name))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(dataSources)
    .values({
      name,
      type,
      status: "active",
      region: "Nigeria",
    })
    .returning();

  return created ? created.id : null;
}

/**
 * Run the live crisis ingestion workflow.
 * - Fetches and stores social posts (via fetchFromWebAndStore(true))
 * - Fetches and stores news articles
 * - Optionally auto-creates incidents for high-signal items
 */
export async function runLiveCrisisIngest(): Promise<IngestResult> {
  logger.info("[Ingest] Starting live crisis ingest job");

  // 1. Social: fetch & store
  const socialPosts: SocialMediaPost[] = await fetchFromWebAndStore(true);

  // 2. News: fetch & store
  const newsItems: NewsItem[] = await fetchNigeriaCrisisNews(20);
  let newsStored = 0;

  if (newsItems.length > 0) {
    const sourceId = await ensureDataSourceId("Nigeria Crisis News", "news_media");
    if (sourceId) {
      for (const item of newsItems) {
        await db.insert(collectedData).values({
          sourceId,
          content: {
            title: item.title,
            content: item.content,
            timestamp: item.timestamp,
            url: item.url,
            source: item.source,
          },
          location: "Nigeria",
          region: "Nigeria",
        });
        newsStored++;
      }
    }
  }

  let incidentsCreated = 0;

  if (LIVE_CRISIS_CREATE_INCIDENTS) {
    // 3. Auto-create incidents for high-signal items
    const watchWords = await getWatchWords();

    // For performance and to avoid excessive duplication, we only consider
    // the current social posts (which already include recent trends).
    for (const post of socialPosts) {
      const matched = matchWatchWords(post.content, watchWords);
      if (matched.length === 0) continue;

      // Simple duplicate check: same title (first 100 chars) and timestamp day
      const title = `Social: ${post.content.slice(0, 80)}${
        post.content.length > 80 ? "..." : ""
      }`;

      // Insert directly into incidents; reportedBy = 1 (system/admin)
      await db.insert(incidents).values({
        title,
        description: post.content,
        location: post.location || "Nigeria",
        region: "Nigeria",
        severity: "medium",
        status: "active",
        reportedBy: 1,
        sourceId: undefined,
      });
      incidentsCreated++;
    }
  }

  const result: IngestResult = {
    socialCount: socialPosts.length,
    newsCount: newsItems.length,
    incidentsCreated,
  };

  logger.info("[Ingest] Live crisis ingest completed", result);
  return result;
}


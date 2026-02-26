/**
 * Political News Ingest Service
 * Harvests Nigeria political/election news from the internet and stores as election events.
 * Uses: 1) NEWS_API_URL + NEWS_API_KEY, 2) NewsAPI.org (NEWS_API_KEY), 3) Nigeria RSS feeds (no key).
 */
import * as cheerio from "cheerio";
import { fetchNigeriaPoliticalNews, NewsItem } from "./news-service";
import { db } from "../db";
import { elections, electionEvents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger";

/** Nigeria news RSS feeds (politics / national). No API key required. */
const NIGERIA_POLITICAL_RSS_FEEDS = [
  "https://www.premiumtimesng.com/category/news/politics/feed",
  "https://www.vanguardngr.com/category/news/politics/feed",
  "https://guardian.ng/category/news/national/feed",
  "https://www.channelstv.com/feed",
  "https://www.thecable.ng/feed",
  "https://saharareporters.com/latest/feed",
  "https://punchng.com/topics/politics/feed",
  "https://dailytrust.com/category/news/feed",
];

export interface PoliticalNewsIngestResult {
  fetched: number;
  created: number;
  skipped: number;
  electionId: number | null;
  error?: string;
}

/**
 * Fetch Nigeria political news from NewsAPI.org when NEWS_API_KEY is set (NewsAPI.org).
 * Used as fallback when generic NEWS_API_URL is not configured.
 */
async function fetchFromNewsApiOrg(limit: number): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const q = encodeURIComponent(
      "Nigeria AND (election OR INEC OR political party OR primaries OR Tinubu OR PDP OR APC OR Labour Party OR 2027 OR gubernatorial OR National Assembly)"
    );
    const url = `https://newsapi.org/v2/everything?q=${q}&apiKey=${apiKey}&pageSize=${Math.min(limit, 50)}&sortBy=publishedAt&language=en`;
    const res = await fetch(url);
    const data = (await res.json()) as { articles?: any[]; status?: string };
    if (data.status !== "ok" || !Array.isArray(data.articles)) return [];

    return data.articles.slice(0, limit).map((a: any) => ({
      title: String(a.title ?? ""),
      content: String(a.description ?? a.content ?? ""),
      timestamp: String(a.publishedAt ?? new Date().toISOString()),
      url: typeof a.url === "string" ? a.url : undefined,
      source: typeof a.source?.name === "string" ? a.source.name : "NewsAPI",
    }));
  } catch (e) {
    logger.error("NewsAPI.org political fetch failed", { error: e });
    return [];
  }
}

/**
 * Fetch Nigeria political/news from public RSS feeds. Works without any API key.
 */
async function fetchNigeriaPoliticalNewsFromRss(limit: number): Promise<NewsItem[]> {
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  for (const feedUrl of NIGERIA_POLITICAL_RSS_FEEDS) {
    if (items.length >= limit) break;
    try {
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "EwersNigeriaNews/1.0 (Election monitoring)" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      $("item, entry").each((_, el) => {
        if (items.length >= limit) return false;
        const $el = $(el);
        const title = $el.find("title").first().text().trim();
        if (!title || seen.has(title.toLowerCase().slice(0, 120))) return;
        seen.add(title.toLowerCase().slice(0, 120));
        const link =
          $el.find("link").first().attr("href") ||
          $el.find("link").first().text().trim() ||
          $el.find("link").last().attr("href");
        const desc =
          $el.find("description").first().text().trim() ||
          $el.find("content").first().text().trim() ||
          $el.find("summary").first().text().trim() ||
          "";
        const pubDate =
          $el.find("pubDate").first().text().trim() ||
          $el.find("published").first().text().trim() ||
          $el.find("updated").first().text().trim() ||
          new Date().toISOString();
        items.push({
          title,
          content: desc.replace(/<[^>]+>/g, " ").slice(0, 2000),
          timestamp: pubDate,
          url: link || undefined,
          source: new URL(feedUrl).hostname,
        });
      });
    } catch (e) {
      logger.warn("[PoliticalNewsIngest] RSS feed failed", { feedUrl, error: e });
    }
  }
  clearTimeout(timeout);

  items.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return tB - tA;
  });
  return items.slice(0, limit);
}

/**
 * Get the main election ID to attach events to. Matches dashboard "mainElection":
 * 2027 Presidential preferred, else newest election by date.
 */
async function getTargetElectionId(): Promise<number | null> {
  const list = await db.select().from(elections).orderBy(desc(elections.electionDate));
  const main =
    list.find(
      (e) =>
        e.name.toLowerCase().includes("2027") &&
        (e.type === "presidential" || e.name.toLowerCase().includes("presidential"))
    ) ?? list[0];
  return main?.id ?? null;
}

/**
 * Harvest Nigeria political news and create election events (type "other").
 */
export async function runPoliticalNewsIngest(limit: number = 25): Promise<PoliticalNewsIngestResult> {
  const result: PoliticalNewsIngestResult = { fetched: 0, created: 0, skipped: 0, electionId: null };

  try {
    let items: NewsItem[] = await fetchNigeriaPoliticalNews(limit);
    if (items.length === 0) items = await fetchFromNewsApiOrg(limit);
    if (items.length === 0) items = await fetchNigeriaPoliticalNewsFromRss(limit);
    result.fetched = items.length;

    const electionId = await getTargetElectionId();
    result.electionId = electionId;
    if (!electionId) {
      result.error = "No election found. Run: npm run db:seed:election-2026";
      logger.warn("[PoliticalNewsIngest] No election found; run db:seed:election-2026 to create 2027 elections.");
      return result;
    }

    const rows = await db
      .select({ title: electionEvents.title })
      .from(electionEvents)
      .where(eq(electionEvents.electionId, electionId));
    const existingTitles = new Set(
      rows.map((r) => (r.title || "").trim().toLowerCase().slice(0, 150))
    );

    for (const item of items) {
      const title = (item.title || "").trim();
      if (!title) continue;
      const key = title.toLowerCase().slice(0, 150);
      if (existingTitles.has(key)) {
        result.skipped++;
        continue;
      }
      existingTitles.add(key);

      await db.insert(electionEvents).values({
        electionId,
        title: title.slice(0, 300),
        description: (item.content || "").slice(0, 2000) || null,
        type: "other",
        severity: "low",
        eventDate: new Date(item.timestamp || Date.now()),
      });
      result.created++;
    }

    logger.info("[PoliticalNewsIngest] Completed", result);
  } catch (error) {
    logger.error("[PoliticalNewsIngest] Failed", { error });
    result.error = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

/**
 * News Service - Fetches Nigeria crisis/conflict news from a configurable API.
 *
 * This is implemented against a generic JSON news API:
 * - Configure NEWS_API_URL and NEWS_API_KEY in your .env
 * - Endpoint is expected to accept query parameters: q, lang, max
 *
 * If env vars are missing or the API call fails, the service returns an empty array
 * and logs a warning, so the rest of the system continues to function.
 */
import axios from "axios";
import { logger } from "./logger";

export interface NewsItem {
  title: string;
  content: string;
  timestamp: string;
  url?: string;
  source?: string;
}

export async function fetchNigeriaCrisisNews(limit: number = 20): Promise<NewsItem[]> {
  const apiUrl = process.env.NEWS_API_URL;
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiUrl || !apiKey) {
    logger.warn(
      "News API not configured. Set NEWS_API_URL and NEWS_API_KEY to enable news ingestion."
    );
    return [];
  }

  try {
    const response = await axios.get(apiUrl, {
      params: {
        q: "Nigeria crisis OR conflict OR unrest OR insecurity OR banditry OR kidnapping",
        lang: "en",
        max: limit,
      },
      headers: {
        "X-Api-Key": apiKey,
      },
      timeout: 15000,
    });

    const payload = response.data as any;
    const articles: any[] =
      Array.isArray(payload?.articles) ? payload.articles :
      Array.isArray(payload?.data) ? payload.data :
      [];

    return articles.slice(0, limit).map((a) => ({
      title: String(a.title ?? ""),
      content: String(
        a.description ??
        a.content ??
        a.summary ??
        ""
      ),
      timestamp: String(
        a.publishedAt ??
        a.published_at ??
        a.created_at ??
        new Date().toISOString()
      ),
      url: typeof a.url === "string" ? a.url : undefined,
      source: typeof a.source?.name === "string"
        ? a.source.name
        : typeof a.source === "string"
        ? a.source
        : "news",
    }));
  } catch (error) {
    logger.error("Failed to fetch Nigeria crisis news", { error });
    return [];
  }
}


/**
 * Real-time Web Scraping Service
 * Scrapes Nigerian conflict-related content from social media, news sites, and other sources
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { IStorage } from "../storage";

interface ScrapedContent {
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt: Date;
  category: string;
  sentiment?: string;
  conflictIndicators?: string[];
}

// Nigerian news sources for web scraping
const NEWS_SOURCES = [
  { url: "https://www.premiumtimesng.com/category/news/security", name: "Premium Times Security" },
  { url: "https://www.vanguardngr.com/category/news/security", name: "Vanguard Security" },
  { url: "https://punchng.com/topics/crime", name: "Punch Crime" },
  { url: "https://guardian.ng/category/news/national", name: "Guardian National" },
  { url: "https://dailytrust.com/category/news/security", name: "Daily Trust Security" },
  { url: "https://saharareporters.com/latest", name: "Sahara Reporters" },
  { url: "https://www.channelstv.com/category/news", name: "Channels TV" },
  { url: "https://humanglemedia.com", name: "HumAngle" },
];

// Conflict-related keywords for filtering
const CONFLICT_KEYWORDS = [
  "boko haram", "bandit", "kidnap", "abduct", "attack", "kill", "shoot", "bomb",
  "violence", "clash", "conflict", "crisis", "insurgent", "terrorist", "militant",
  "protest", "riot", "unrest", "tension", "ethnic", "communal", "farmer", "herder",
  "iswap", "ansaru", "ipp", "security", "military", "police", "army", "gunmen",
  "armed", "weapon", "casualty", "death", "injur", "displace", "refugee", "idp",
  "sgbv", "rape", "assault", "gender-based violence", "human rights"
];

export class WebScraperService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Check if content is conflict-related
   */
  private isConflictRelated(text: string): boolean {
    const lowerText = text.toLowerCase();
    return CONFLICT_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Extract conflict indicators from text
   */
  private extractConflictIndicators(text: string): string[] {
    const lowerText = text.toLowerCase();
    return CONFLICT_KEYWORDS.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Scrape a single news source
   */
  async scrapeNewsSource(sourceUrl: string, sourceName: string): Promise<ScrapedContent[]> {
    try {
      const response = await axios.get(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const articles: ScrapedContent[] = [];

      // Generic article selectors (adjust based on actual site structure)
      $('article, .post, .entry, .news-item').each((_, element) => {
        const $article = $(element);
        const title = $article.find('h1, h2, h3, .title, .headline').first().text().trim();
        const content = $article.find('p, .excerpt, .summary').first().text().trim();
        const link = $article.find('a').first().attr('href') || '';
        
        if (title && content && this.isConflictRelated(title + ' ' + content)) {
          articles.push({
            title,
            content,
            url: link.startsWith('http') ? link : new URL(link, sourceUrl).href,
            source: sourceName,
            publishedAt: new Date(),
            category: 'conflict',
            conflictIndicators: this.extractConflictIndicators(title + ' ' + content),
          });
        }
      });

      return articles;
    } catch (error) {
      console.error(`Error scraping ${sourceName}:`, error);
      return [];
    }
  }

  /**
   * Scrape Twitter/X for Nigerian conflict content
   */
  async scrapeTwitter(query: string = "Nigeria conflict OR violence OR attack"): Promise<ScrapedContent[]> {
    // Note: This requires Twitter API credentials
    // For now, return empty array - implement with actual Twitter API v2
    console.log("Twitter scraping requires API credentials");
    return [];
  }

  /**
   * Scrape Reddit for Nigerian conflict discussions
   */
  async scrapeReddit(): Promise<ScrapedContent[]> {
    try {
      const subreddits = ['Nigeria', 'africannews', 'worldnews'];
      const articles: ScrapedContent[] = [];

      for (const subreddit of subreddits) {
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/search.json`, {
          params: {
            q: 'Nigeria conflict OR violence OR security',
            sort: 'new',
            limit: 25,
          },
          headers: {
            'User-Agent': 'EarlyAlertNetwork/1.0',
          },
        });

        const posts = response.data?.data?.children || [];
        
        for (const post of posts) {
          const data = post.data;
          if (this.isConflictRelated(data.title + ' ' + (data.selftext || ''))) {
            articles.push({
              title: data.title,
              content: data.selftext || data.title,
              url: `https://reddit.com${data.permalink}`,
              source: `Reddit r/${subreddit}`,
              publishedAt: new Date(data.created_utc * 1000),
              category: 'social_media',
              conflictIndicators: this.extractConflictIndicators(data.title + ' ' + data.selftext),
            });
          }
        }
      }

      return articles;
    } catch (error) {
      console.error('Error scraping Reddit:', error);
      return [];
    }
  }

  /**
   * Scrape Facebook public pages (requires Facebook Graph API)
   */
  async scrapeFacebook(): Promise<ScrapedContent[]> {
    // Note: Requires Facebook Graph API token
    console.log("Facebook scraping requires Graph API credentials");
    return [];
  }

  /**
   * Scrape all sources and return conflict-related content
   */
  async scrapeAllSources(): Promise<ScrapedContent[]> {
    const allContent: ScrapedContent[] = [];

    // Scrape news sources
    for (const source of NEWS_SOURCES) {
      const articles = await this.scrapeNewsSource(source.url, source.name);
      allContent.push(...articles);
    }

    // Scrape social media
    const redditPosts = await this.scrapeReddit();
    allContent.push(...redditPosts);

    // Sort by published date (newest first)
    allContent.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return allContent;
  }

  /**
   * Store scraped content as collected data
   */
  async storeScrapedContent(content: ScrapedContent[]): Promise<void> {
    const dataSources = await this.storage.getDataSources();
    const webScraperSource = dataSources.find(s => s.name === "Web Scraper");

    if (!webScraperSource) {
      console.warn("Web Scraper data source not found");
      return;
    }

    for (const item of content) {
      await this.storage.createCollectedData({
        sourceId: webScraperSource.id,
        rawData: {
          title: item.title,
          content: item.content,
          url: item.url,
          source: item.source,
          publishedAt: item.publishedAt,
          conflictIndicators: item.conflictIndicators,
        },
        collectedAt: new Date(),
        status: "pending",
      });
    }
  }

  /**
   * Run continuous scraping at intervals
   */
  startContinuousScraping(intervalMinutes: number = 30): NodeJS.Timeout {
    const interval = setInterval(async () => {
      console.log("Starting scheduled web scraping...");
      const content = await this.scrapeAllSources();
      console.log(`Scraped ${content.length} conflict-related items`);
      
      if (content.length > 0) {
        await this.storeScrapedContent(content);
      }
    }, intervalMinutes * 60 * 1000);

    return interval;
  }
}

export const createWebScraperService = (storage: IStorage) => new WebScraperService(storage);

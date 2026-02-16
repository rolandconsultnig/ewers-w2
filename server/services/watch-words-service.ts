/**
 * Watch Words Service - Content filtering for words to watch out for.
 * Used to flag social posts and other content that contain configured watch words.
 */
import { db } from "../db";
import { settings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const CONTENT_FILTER_CATEGORY = "content_filter";
const WATCH_WORDS_KEY = "watch_words";

/** Default words to watch when none are configured (Nigeria/conflict/peace context). */
export const DEFAULT_WATCH_WORDS = [
  "violence", "attack", "bomb", "explosion", "crisis", "protest", "unrest",
  "kidnapping", "kill", "clash", "riot", "emergency", "evacuate", "curfew",
  "militant", "insurgent", "reprisal", "reprisals", "arson", "looting",
  "hostage", "ambush", "invasion", "blockade", "strike", "strikes",
];

/**
 * Get the list of watch words (from settings or default).
 */
export async function getWatchWords(): Promise<string[]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(
      and(
        eq(settings.category, CONTENT_FILTER_CATEGORY),
        eq(settings.key, WATCH_WORDS_KEY)
      )
    )
    .limit(1);

  if (!row?.value || !Array.isArray(row.value)) {
    return [...DEFAULT_WATCH_WORDS];
  }
  return (row.value as string[]).filter((w) => typeof w === "string" && w.trim().length > 0);
}

/**
 * Set the list of watch words. Creates or updates the setting.
 * @param words - Array of words to watch
 * @param updatedBy - User ID performing the update
 */
export async function setWatchWords(words: string[], updatedBy: number): Promise<string[]> {
  const normalized = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))];

  const [existing] = await db
    .select()
    .from(settings)
    .where(
      and(
        eq(settings.category, CONTENT_FILTER_CATEGORY),
        eq(settings.key, WATCH_WORDS_KEY)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({
        value: normalized,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      category: CONTENT_FILTER_CATEGORY,
      key: WATCH_WORDS_KEY,
      value: normalized,
      description: "Words to watch for in social and other content (content filtering)",
      updatedBy,
    });
  }
  return normalized;
}

/**
 * Check text for watch words. Returns the list of matched words (case-insensitive).
 */
export function matchWatchWords(text: string, watchWords: string[]): string[] {
  if (!text || watchWords.length === 0) return [];
  const lower = text.toLowerCase();
  return watchWords.filter((word) => {
    if (!word) return false;
    const w = word.toLowerCase();
    // Match whole word boundaries to avoid too many false positives (e.g. "ass" in "class")
    const re = new RegExp(`\\b${escapeRegex(w)}\\b`, "i");
    return re.test(lower);
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

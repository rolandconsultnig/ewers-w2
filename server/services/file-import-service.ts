/**
 * File Import Service - Parse CSV/JSON and import into collected_data
 */
import { db } from "../db";
import { dataSources, collectedData } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const FILE_IMPORT_SOURCE_NAME = "File Import";

async function getOrCreateFileImportSource(): Promise<number> {
  const existing = await db.select().from(dataSources).where(eq(dataSources.name, FILE_IMPORT_SOURCE_NAME)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [created] = await db.insert(dataSources).values({
    name: FILE_IMPORT_SOURCE_NAME,
    type: "field_report",
    description: "Data imported via file upload",
    status: "active",
    region: "Nigeria",
  }).returning();
  return created.id;
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, unknown> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function parseJSON(text: string): unknown[] {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object" && parsed !== null) return [parsed];
  return [];
}

export async function importFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ imported: number; errors: number }> {
  const sourceId = await getOrCreateFileImportSource();
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  let items: Record<string, unknown>[] = [];

  if (ext === "csv" || mimeType === "text/csv") {
    const text = buffer.toString("utf-8");
    items = parseCSV(text);
  } else if (ext === "json" || mimeType === "application/json") {
    const text = buffer.toString("utf-8");
    const parsed = parseJSON(text);
    items = parsed.map((p) => (typeof p === "object" && p !== null ? (p as Record<string, unknown>) : { raw: p }));
  } else {
    throw new Error("Unsupported format. Use CSV or JSON.");
  }

  let imported = 0;
  let errors = 0;

  for (const item of items) {
    try {
      await db.insert(collectedData).values({
        sourceId,
        content: item,
        region: "Nigeria",
        location: (item.location as string) || (item.LOCATION as string) || (item.region as string) || undefined,
        status: "unprocessed",
      });
      imported++;
    } catch (err) {
      logger.warn("Failed to import row", { error: err, item });
      errors++;
    }
  }

  return { imported, errors };
}

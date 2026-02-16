/**
 * Cron Jobs - Real scheduled tasks for session cleanup, crisis checks, and data collection
 */
import cron from "node-cron";
import { storage } from "../storage";
import { db } from "../db";
import { incidents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { dataSourceService } from "./data-source-service";
import { checkAndEscalateBreachedAlerts } from "./escalation-service";
import { logger } from "./logger";
import { runLiveCrisisIngest } from "./live-crisis-ingest-service";

export function initCronJobs(): void {
  // Session cleanup - run daily at 3 AM (connect-pg-simple has its own cleanup, we trigger manual prune of expired)
  cron.schedule("0 3 * * *", async () => {
    try {
      if (storage.sessionStore?.pruneSessionInterval) {
        clearInterval(storage.sessionStore.pruneSessionInterval);
        storage.sessionStore.startPruning();
      }
      logger.info("[Cron] Session cleanup completed");
    } catch (err) {
      logger.error("[Cron] Session cleanup failed", { error: err });
    }
  });

  // Crisis status check - every 30 min, mark incidents older than 7 days as resolved
  cron.schedule("*/30 * * * *", async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeList = await db.select().from(incidents).where(eq(incidents.status, "active"));
      let count = 0;
      for (const inc of activeList) {
        if (new Date(inc.reportedAt) < sevenDaysAgo) {
          await db.update(incidents).set({ status: "resolved" }).where(eq(incidents.id, inc.id));
          count++;
        }
      }
      if (count > 0) {
        logger.info("[Cron] Crisis status check - auto-resolved stale incidents", { count });
      } else {
        logger.info("[Cron] Crisis status check completed - no stale incidents");
      }
    } catch (err) {
      logger.error("[Cron] Crisis status check failed", { error: err });
    }
  });

  // SLA escalation check - every 15 min
  cron.schedule("*/15 * * * *", async () => {
    try {
      const escalated = await checkAndEscalateBreachedAlerts();
      if (escalated > 0) logger.info("[Cron] Escalated breached alerts", { count: escalated });
    } catch (err) {
      logger.error("[Cron] Escalation check failed", { error: err });
    }
  });

  // Automated data collection - every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      logger.info("[Cron] Starting automated data collection");
      await dataSourceService.fetchFromAllSources();
      await dataSourceService.processCollectedData();
      logger.info("[Cron] Automated data collection completed");
    } catch (err) {
      logger.error("[Cron] Automated data collection failed", { error: err });
    }
  });

  // Live crisis ingest - every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      logger.info("[Cron] Starting live crisis ingest");
      const result = await runLiveCrisisIngest();
      logger.info("[Cron] Live crisis ingest completed", result);
    } catch (err) {
      logger.error("[Cron] Live crisis ingest failed", { error: err });
    }
  });

  logger.info("Cron jobs initialized");
}

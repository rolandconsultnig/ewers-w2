import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initCronJobs } from "./services/cron-jobs";
import { logger } from "./services/logger";
import { seedDefaultTemplates } from "./services/sms-logs-service";
import { createWebScraperService } from "./services/web-scraper-service";
import { storage } from "./storage";

const app = express();

// Rate limiting - API abuse protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts." },
});
app.use("/api/login", authLimiter);
app.use("/api/auth/login", authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.http(`${req.method} ${path} ${res.statusCode}`, { duration, status: res.statusCode });
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // In development: use Vite middleware only when NOT using separate Vite dev server
  // (USE_VITE_DEV_SERVER=1 means Vite runs on port 5173, API on 4342)
  if (app.get("env") === "development" && !process.env.USE_VITE_DEV_SERVER) {
    await setupVite(app, server);
  } else if (app.get("env") !== "development") {
    serveStatic(app);
  } else if (process.env.USE_VITE_DEV_SERVER) {
    app.get("*", (_req, res) => {
      res.redirect(301, "http://localhost:5173");
    });
  }

  // Serves both the API and the client (frontend)
  const port = parseInt(process.env.PORT || "4342", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    ...(process.platform !== "win32" && { reusePort: true }),
  }, async () => {
    log(`serving on port ${port}`);
    initCronJobs();
    try {
      await seedDefaultTemplates();
    } catch (e) {
      logger.warn("SMS templates seed skipped (table may not exist yet)", { error: e });
    }
    
    // Initialize web scraper for continuous monitoring
    try {
      const webScraper = createWebScraperService(storage);
      // Start continuous scraping every 30 minutes
      webScraper.startContinuousScraping(30);
      logger.info("Web scraper initialized - monitoring Nigerian conflict news sources");
    } catch (e) {
      logger.warn("Web scraper initialization skipped", { error: e });
    }
  });
})();

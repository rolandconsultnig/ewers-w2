import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: false,
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = url.split("?")[0];

    // Asset/module requests: try to transform and serve via Vite if middleware passed through
    if (
      pathname.startsWith("/src/") ||
      pathname.startsWith("/@") ||
      pathname.startsWith("/node_modules/") ||
      pathname.startsWith("/@vite") ||
      pathname.startsWith("/@id/") ||
      pathname.startsWith("/@fs/")
    ) {
      try {
        const result = await vite.transformRequest(url);
        if (result && "code" in result) {
          const ext = path.extname(pathname);
          const mime =
            ext === ".ts" || ext === ".tsx"
              ? "application/javascript"
              : ext === ".js" || ext === ".jsx"
                ? "application/javascript"
                : "text/javascript";
          res.status(200).set({ "Content-Type": mime }).end(result.code);
          return;
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
      }
      return next();
    }

    try {
      const clientTemplate = path.join(__dirname, "..", "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(pathname, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.join(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

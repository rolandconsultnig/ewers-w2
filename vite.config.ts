import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname);
const clientRoot = path.join(projectRoot, "client");

export default defineConfig({
  root: clientRoot,
  base: "/",
  server: {
    port: 4342,
    strictPort: true,
    proxy: {
      "/api": { target: "http://localhost:4343", changeOrigin: true },
      "/socket.io": { target: "http://localhost:4343", ws: true },
      "/uploads": { target: "http://localhost:4343", changeOrigin: true },
    },
    fs: {
      strict: false,
      allow: [projectRoot, clientRoot, path.resolve(process.cwd())],
    },
    watch: {
      usePolling: true, // More reliable on Windows
      ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/uploads/**"],
    },
  },
  plugins: [
    react(),
    {
      name: "no-reload-on-change",
      handleHotUpdate() {
        return [];
      },
    },
    themePlugin(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.join(projectRoot, "client", "src"),
      "@shared": path.join(projectRoot, "shared"),
      "@assets": path.join(projectRoot, "attached_assets"),
    },
  },
  build: {
    outDir: path.join(projectRoot, "dist", "public"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    holdUntilCrawlEnd: false,
    entries: [path.join(clientRoot, "src", "main.tsx")],
  },
});

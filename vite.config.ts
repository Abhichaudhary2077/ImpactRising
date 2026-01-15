import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    /**
     * REQUIRED for GitHub Pages
     * Change `impactrising` to your repo name
     * Example URL: https://username.github.io/impactrising/
     */
    base: isProduction ? "/impactrising/" : "/",

    root: path.resolve(import.meta.dirname, "client"),

    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(process.env.REPL_ID !== undefined && !isProduction
        ? [
            (await import("@replit/vite-plugin-cartographer")).cartographer(),
          ]
        : []),
    ],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },

    build: {
      /**
       * IMPORTANT:
       * GitHub Pages expects static files only
       * We output directly to a clean dist folder
       */
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },

    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});

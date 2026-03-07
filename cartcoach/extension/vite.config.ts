import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        onboarding: resolve(__dirname, "src/onboarding/index.html"),
        dashboard: resolve(__dirname, "src/dashboard/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        background: resolve(__dirname, "src/background/background.ts"),
        content: resolve(__dirname, "src/content/content.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          const pages = ["popup", "onboarding", "dashboard", "options"];
          if (pages.includes(chunk.name)) {
            return `${chunk.name}/[name].js`;
          }
          return `${chunk.name}/[name].js`;
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (asset) => {
          if (asset.name?.endsWith(".css")) {
            return "content/content.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "../shared"),
      "@": resolve(__dirname, "src"),
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, readdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-manifest-and-icons",
      writeBundle() {
        copyFileSync(
          resolve(__dirname, "manifest.json"),
          resolve(__dirname, "dist/manifest.json")
        );
        const iconsDir = resolve(__dirname, "src/icons");
        const distIcons = resolve(__dirname, "dist/icons");
        mkdirSync(distIcons, { recursive: true });
        for (const file of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, file), resolve(distIcons, file));
        }
      },
    },
  ],
  base: "./",
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
      },
      output: {
        entryFileNames: (chunk) => `${chunk.name}/${chunk.name}.js`,
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

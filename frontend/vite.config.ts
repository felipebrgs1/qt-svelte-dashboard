import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
    }),
  ],
  // Use relative paths so Qt's QWebEngineView can load from disk
  base: "./",
  build: {
    outDir: "dist",
  },
});

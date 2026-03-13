import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      preprocess: vitePreprocess(),
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@middlend": path.resolve(__dirname, "../middlend"),
    },
  },
  server: {
    fs: {
      // Allow importing the shared contract from outside the frontend root
      allow: [".."],
    },
  },
  // Use relative paths so Qt's QWebEngineView can load from disk
  base: "./",
  build: {
    outDir: "dist",
  },
});

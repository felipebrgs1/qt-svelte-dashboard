import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import Components from "unplugin-svelte-components/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tailwindcss(),
    Components({
      // [INFLECTION POINT]: Auto-import Configuration
      // Context: Automates component imports for Svelte files.
      // This allows using components from these directories without manual imports.
      dirs: [
        "src/lib/components/ui",
        "src/lib/components/blocks",
        "src/lib/components",
      ],
      dts: true,
      extensions: ["svelte"],
    }),
    svelte(), // Preprocess and Runes configuration moved to svelte.config.js
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

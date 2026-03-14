import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  compilerOptions: {
    // [INFLECTION POINT]: Runes Mode Configuration
    // Context: Do NOT enforce 'runes: true' globally here.
    // Svelte 5 automatically enables runes mode when it detects runes ($state, etc.) in a file.
    // Forcing it here breaks legacy libraries like 'lucide-svelte' that still use '$$props'.
  },
};

export default config;

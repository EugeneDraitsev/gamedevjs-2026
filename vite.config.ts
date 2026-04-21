import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    watch: {
      ignored: [
        "**/.output/**",
        "**/.vercel/**",
        "**/build/**",
        "**/static/storybook/**",
        "**/storybook-static/**",
      ],
    },
  },
});

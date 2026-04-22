import type { StorybookConfig } from "@storybook/sveltekit";
import { mergeConfig } from "vite";

const ignoredWatchDirs = [
  "**/.output/**",
  "**/.vercel/**",
  "**/build/**",
  "**/static/storybook/**",
  "**/storybook-static/**",
];

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|svelte)"],
  addons: ["@storybook/addon-svelte-csf"],
  staticDirs: [
    { from: "./assets", to: "/" },
    { from: "../static", to: "/" },
  ],
  core: {
    disableWhatsNewNotifications: true,
  },
  features: {
    sidebarOnboardingChecklist: false,
  },
  framework: {
    name: "@storybook/sveltekit",
    options: {},
  },
  viteFinal: (config) =>
    mergeConfig(config, {
      server: {
        watch: {
          ignored: ignoredWatchDirs,
        },
      },
    }),
};

export default config;

import type { StorybookConfig } from "@storybook/sveltekit";

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|svelte)"],
  addons: ["@storybook/addon-svelte-csf"],
  framework: {
    name: "@storybook/sveltekit",
    options: {},
  },
};

export default config;

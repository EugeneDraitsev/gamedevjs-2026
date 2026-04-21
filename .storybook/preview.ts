import type { Preview } from "@storybook/sveltekit";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "warden",
      values: [
        { name: "warden", value: "#040816" },
        { name: "void", value: "#000000" },
        { name: "studio", value: "#1f2330" },
      ],
    },
    layout: "fullscreen",
    options: {
      storySort: {
        order: [
          "Playgrounds",
          ["Player", "Combat"],
          "Rooms",
          ["Preview"],
          "Models",
          ["Player", "Enemies", "Bosses", "Pickups"],
        ],
      },
    },
  },
};

export default preview;

import type { Preview } from "@storybook/sveltekit";
import { startEmbedBridge } from "./embed-bridge";

startEmbedBridge();

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "orb",
      values: [
        { name: "orb", value: "#040816" },
        { name: "void", value: "#000000" },
        { name: "studio", value: "#1f2330" },
      ],
    },
    layout: "fullscreen",
    options: {
      storySort: {
        method: "alphabetical",
        order: ["Playgrounds", "Models"],
      },
    },
  },
};

export default preview;

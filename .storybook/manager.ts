import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

addons.setConfig({
  theme: create({
    appBg: "#060b14",
    appBorderColor: "#203149",
    appBorderRadius: 10,
    appContentBg: "#0c1524",
    appPreviewBg: "#040816",
    barBg: "#08111f",
    barSelectedColor: "#ffb35b",
    barTextColor: "#9fb0c7",
    base: "dark",
    brandImage: "./storybook-brand.svg",
    brandTarget: "_self",
    brandTitle: "Orb Knight",
    brandUrl: "./",
    colorPrimary: "#ff7a1a",
    colorSecondary: "#5ee6ff",
    inputBg: "#0f1a2b",
    inputBorder: "#273b57",
    inputTextColor: "#f5f7fb",
    textColor: "#eaf1ff",
    textMutedColor: "#8da0bb",
  }),
});

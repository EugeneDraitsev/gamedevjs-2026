import auto from "@sveltejs/adapter-auto";
import staticAdapter from "@sveltejs/adapter-static";
import vercel from "@sveltejs/adapter-vercel";

const pathSeparatorPattern = /[/\\]/;
const itchBuild = process.env.ITCH_BUILD === "1";

const adapter = (() => {
  if (itchBuild) {
    return staticAdapter({
      assets: "build-itch",
      pages: "build-itch",
      strict: false,
    });
  }

  if (process.env.VERCEL) {
    return vercel();
  }

  return auto();
})();

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) =>
      filename.split(pathSeparatorPattern).includes("node_modules")
        ? undefined
        : true,
  },
  kit: {
    adapter,
    ...(itchBuild
      ? {
          appDir: "app",
          paths: { relative: true },
          router: { type: "hash" },
        }
      : {}),
  },
};

export default config;

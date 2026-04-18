import auto from "@sveltejs/adapter-auto";
import vercel from "@sveltejs/adapter-vercel";

const pathSeparatorPattern = /[/\\]/;

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
    adapter: process.env.VERCEL ? vercel() : auto(),
  },
};

export default config;

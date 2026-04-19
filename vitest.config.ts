import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, ".claude/**", "**/.claude/**"],
  },
});

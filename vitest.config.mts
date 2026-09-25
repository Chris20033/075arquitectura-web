import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname),
      "server-only": resolve(import.meta.dirname, "tests/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/integration/**/*.test.ts"],
    maxWorkers: 1,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30_000,
  },
});

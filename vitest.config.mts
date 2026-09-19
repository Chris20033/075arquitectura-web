import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname),
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

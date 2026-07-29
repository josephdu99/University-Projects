import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Pin the runner to UTC so a passing suite on a developer's machine also
    // passes in CI — timezone bugs are exactly what these tests exist to catch.
    env: { TZ: "UTC" },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});

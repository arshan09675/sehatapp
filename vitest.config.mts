import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure logic BUILD_PLAN.md calls out as breaking silently:
 * slot generation (src/lib/schedule.ts) and status transitions
 * (src/lib/appointments.ts). Mirrors the "@/" alias from tsconfig.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});

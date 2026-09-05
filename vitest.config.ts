import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname, "server-only": `${import.meta.dirname}/tests/server-only.ts` } },
  test: { environment: "node", include: ["tests/**/*.test.ts"], coverage: { reporter: ["text", "html"] } },
});

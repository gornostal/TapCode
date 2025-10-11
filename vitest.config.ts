import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(currentDir, "client/src"),
      "@shared": path.resolve(currentDir, "shared"),
    },
  },
});

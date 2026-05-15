import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "rankd",
      root: "artifacts/rankd",
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "node",
    },
  },
  {
    test: {
      name: "api-server",
      root: "artifacts/api-server",
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "node",
    },
  },
]);

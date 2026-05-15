import { unlinkSync } from "fs";

for (const f of ["package-lock.json", "yarn.lock"]) {
  try { unlinkSync(f); } catch {}
}

const agent = process.env.npm_config_user_agent ?? "";
if (!agent.startsWith("pnpm") && !agent.includes("pnpm")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

// PostToolUse (Edit|Write): format the edited file with the project's Prettier.
// Only files under web/ with .ts/.tsx/.css/.md; never blocks (always exits 0).
import { spawnSync } from "node:child_process";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;

let event = {};
try {
  // Tolerate a leading byte-order mark and empty input.
  event = JSON.parse(input.replace(/^﻿/, "").trim() || "{}");
} catch {
  process.exit(0);
}
const file = event.tool_response?.filePath ?? event.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const web = path.join(root, "web");

if (file) {
  const abs = path.resolve(file);
  const inWeb = abs.toLowerCase().startsWith((web + path.sep).toLowerCase());
  if (inWeb && [".ts", ".tsx", ".css", ".md"].includes(path.extname(abs))) {
    spawnSync("npx", ["--no-install", "prettier", "--write", abs], {
      cwd: web,
      stdio: "ignore",
      shell: process.platform === "win32",
    });
  }
}
process.exit(0);

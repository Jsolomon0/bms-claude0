import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const args = [
  "--experimental-strip-types",
  "--test",
  "--test-isolation=none",
  ...process.argv.slice(2)
];

const result = spawnSync(process.execPath, args, {
  cwd: repoRoot,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

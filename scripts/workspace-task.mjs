import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [action] = process.argv.slice(2);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const removeTargets = (baseDir, targets) => {
  for (const target of targets) {
    rmSync(resolve(baseDir, target), { force: true, recursive: true });
  }
};

switch (action) {
  case "noop":
    process.exit(0);
    break;
  case "clean":
    removeTargets(process.cwd(), [".turbo", ".next", "dist", "build", "coverage"]);
    break;
  case "clean-root":
    removeTargets(process.cwd(), [".turbo", ".next", "dist", "build", "coverage"]);
    removeTargets(repoRoot, [".turbo", "dist", "build", "coverage"]);
    break;
  default:
    console.error(`Unknown workspace task action: ${action ?? "<missing>"}`);
    process.exit(1);
}

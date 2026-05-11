import { spawnSync } from "node:child_process";

const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  throw new Error("npm_execpath is not available in the current environment.");
}

const result = spawnSync(process.execPath, [npmExecPath, "run", "build", "--workspace=@bms/website"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_IGNORE_INCORRECT_LOCKFILE: "1"
  }
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}

process.exit(1);

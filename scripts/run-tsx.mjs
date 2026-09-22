import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// tsx derives a temporary folder from process.geteuid() on Unix and
// os.userInfo() on Windows. Some managed Windows shells cannot resolve the
// current OS user, so provide the same stable local identity before loading
// the tsx CLI. No credentials or user data are read by this wrapper.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}

const preload = fileURLToPath(
  new URL("./process-geteuid.cjs", import.meta.url),
);
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--require=${preload}`]
  .filter(Boolean)
  .join(" ");

const [, , script, ...args] = process.argv;

if (!script) {
  throw new Error("Usage: node scripts/run-tsx.mjs <script.ts> [...args]");
}

const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [tsxCli, script, ...args], {
    env: process.env,
    stdio: "inherit",
  });
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

process.exitCode = exitCode;

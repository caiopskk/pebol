import { execFile } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ports = new Set(["3001", "5173"]);

async function windowsPidsForPorts() {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"]);
  const pids = new Set();

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] !== "TCP") continue;

    const localAddress = parts[1] ?? "";
    const state = parts[3] ?? "";
    const pid = parts[4] ?? "";
    const port = localAddress.match(/:(\d+)$/)?.[1];

    if (port && ports.has(port) && state === "LISTENING" && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  return pids;
}

async function unixPidsForPorts() {
  const args = [...ports].flatMap((port) => ["-i", `tcp:${port}`]);
  const { stdout } = await execFileAsync("lsof", ["-nP", ...args, "-sTCP:LISTEN", "-t"]);
  return new Set(stdout.split(/\s+/).filter(Boolean));
}

async function killPid(pid) {
  if (platform() === "win32") {
    await execFileAsync("taskkill", ["/PID", pid, "/T", "/F"]).catch(() => {});
    return;
  }

  try {
    process.kill(Number(pid), "SIGTERM");
  } catch {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    process.kill(Number(pid), "SIGKILL");
  } catch {
    // Already exited.
  }
}

async function main() {
  let pids = new Set();

  try {
    pids = platform() === "win32" ? await windowsPidsForPorts() : await unixPidsForPorts();
  } catch {
    pids = new Set();
  }

  await Promise.all([...pids].map(killPid));

  if (pids.size > 0) {
    console.log(`Stopped dev processes on ports ${[...ports].join(", ")}.`);
  }
}

await main();

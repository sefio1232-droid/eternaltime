import { execFile } from "node:child_process";
import { lstat, readdir, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
export const RELEASE_ROOT = "/opt/eternal-time/releases";
const CURRENT_LINK = "/opt/eternal-time/current";

export function isReleaseName(name) {
  if (!/^\d{14}$/.test(name)) return false;
  const [year, month, day, hour, minute, second] = [
    name.slice(0, 4), name.slice(4, 6), name.slice(6, 8),
    name.slice(8, 10), name.slice(10, 12), name.slice(12, 14),
  ].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return year >= 2000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute && date.getUTCSeconds() === second;
}

export function candidateProblem(entry, current, whitelist, root = RELEASE_ROOT) {
  if (!whitelist.has(entry.path)) return "NOT IN DELETION WHITELIST";
  if (entry.isSymbolicLink) return "SYMLINK CANDIDATE";
  if (!entry.isDirectory) return "NOT A DIRECTORY";
  if (entry.path !== entry.canonicalPath || path.posix.dirname(entry.canonicalPath) !== root) {
    return "PATH OUTSIDE CANONICAL RELEASE ROOT";
  }
  if (entry.canonicalPath === current) return "ACTIVE RELEASE";
  if (!isReleaseName(path.posix.basename(entry.path))) return "UNRECOGNIZED RELEASE DIRECTORY";
  return null;
}

// The active release is factual, never inferred from the newest name. Newer
// orphans are not rollback versions: leave them for manual review.
export function planRetention(entries, current) {
  const eligible = [];
  const skip = [];
  const allPaths = new Set(entries.map((entry) => entry.path));
  for (const entry of entries) {
    const reason = candidateProblem(entry, null, allPaths);
    if (reason) skip.push({ path: entry.path, reason });
    else eligible.push(entry);
  }
  if (!current && entries.length === 0) return { current, keep: [], delete: [], skip, estimatedBytes: 0 };
  if (!eligible.some((entry) => entry.path === current)) throw new Error("Current is not a recognized canonical release; retention stopped");
  const older = eligible.filter((entry) => entry.path < current).sort((a, b) => b.path.localeCompare(a.path));
  const newer = eligible.filter((entry) => entry.path > current);
  skip.push(...newer.map((entry) => ({ path: entry.path, reason: "NEWER THAN CURRENT: MANUAL REVIEW" })));
  const keep = [current, ...older.slice(0, 5).map((entry) => entry.path)];
  const deletion = older.slice(5).reverse();
  return { current, keep, delete: deletion, skip, estimatedBytes: deletion.reduce((sum, entry) => sum + entry.bytes, 0) };
}

async function inspectEntry(candidate, withSize = false) {
  const stat = await lstat(candidate);
  const isSymbolicLink = stat.isSymbolicLink();
  const canonicalPath = isSymbolicLink ? candidate : await realpath(candidate);
  let bytes = 0;
  if (withSize && stat.isDirectory() && !isSymbolicLink && isReleaseName(path.basename(candidate))) {
    const result = await exec("du", ["-s", "-B1", "--", candidate], { timeout: 30000 });
    bytes = Number(result.stdout.trim().split(/\s+/)[0]);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error("Invalid release size");
  }
  return { path: candidate, canonicalPath, isDirectory: stat.isDirectory(), isSymbolicLink, bytes, identity: `${stat.dev}:${stat.ino}` };
}

async function currentRelease() {
  const root = await lstat(RELEASE_ROOT);
  if (!root.isDirectory() || root.isSymbolicLink() || await realpath(RELEASE_ROOT) !== RELEASE_ROOT) {
    throw new Error("Release root is not the fixed canonical directory");
  }
  if (!(await lstat(CURRENT_LINK)).isSymbolicLink()) throw new Error("Current must be a symlink");
  const current = await realpath(CURRENT_LINK);
  if (path.dirname(current) !== RELEASE_ROOT || !(await lstat(current)).isDirectory()) {
    throw new Error("Current is outside the release root");
  }
  return current;
}

async function checkProductionHealth(expectedCurrent) {
  const current = await currentRelease();
  if (expectedCurrent && expectedCurrent !== current) throw new Error("Current changed or does not match deployed release");
  for (const service of ["nginx", "eternal-time"]) {
    const result = await exec("systemctl", ["is-active", service], { timeout: 10000 });
    if (result.stdout.trim() !== "active") throw new Error(`${service} is not active`);
  }
  for (const url of ["http://127.0.0.1:3000/api/health", "https://eternaltime.shop/api/health", "https://eternaltime.shop/"]) {
    const result = await exec("curl", ["--connect-timeout", "5", "--max-time", "15", "--silent", "--show-error", "--output", "/dev/null", "--write-out", "%{http_code}", url], { timeout: 20000 });
    if (result.stdout.trim() !== "200") throw new Error(`Health must return exactly 200: ${url}`);
  }
  // Repeat after the network checks so a simultaneous switch cannot go unnoticed.
  if (await currentRelease() !== current) throw new Error("Current changed during health checks");
}

const productionOps = {
  checkHealth: checkProductionHealth,
  async inspect() {
    const current = await currentRelease();
    const entries = [];
    for (const name of await readdir(RELEASE_ROOT)) entries.push(await inspectEntry(path.join(RELEASE_ROOT, name), true));
    return { current, entries };
  },
  async validate(entry, current, whitelist) {
    if (await currentRelease() !== current) throw new Error("Current changed; cleanup stopped");
    const fresh = await inspectEntry(entry.path);
    const problem = candidateProblem(fresh, current, whitelist);
    if (problem) throw new Error(problem);
    if (fresh.identity !== entry.identity) throw new Error("Candidate inode changed");
    const inside = (value) => value === entry.path || value.startsWith(`${entry.path}/`);
    const mounts = await readFile("/proc/self/mountinfo", "utf8");
    if (mounts.split("\n").some((line) => inside((line.split(" ")[4] ?? "").replace(/\\040/g, " ")))) {
      throw new Error("Mounted filesystem within candidate");
    }
    for (const pid of (await readdir("/proc")).filter((name) => /^\d+$/.test(name))) {
      try {
        if (inside(await realpath(`/proc/${pid}/cwd`))) throw new Error("Candidate is in use by a process");
      } catch (error) {
        if (!["ENOENT", "ESRCH"].includes(error.code)) throw error;
      }
    }
  },
  // fs.rm removes directory symlinks as links, without traversing their targets.
  remove: (candidate) => rm(candidate, { recursive: true, force: false }),
};

export async function runRetention({ apply = false, expectedCurrent, onPlan = () => {} } = {}, ops = productionOps) {
  await ops.checkHealth(expectedCurrent);
  const snapshot = await ops.inspect();
  if (expectedCurrent && snapshot.current !== expectedCurrent) throw new Error("Unexpected active release");
  const plan = planRetention(snapshot.entries, snapshot.current);
  const whitelist = new Set(plan.delete.map((entry) => entry.path));
  const validated = [];
  const rejected = [];
  for (const entry of plan.delete) {
    try {
      const reason = candidateProblem(entry, plan.current, whitelist);
      if (reason) throw new Error(reason);
      await ops.validate(entry, plan.current, whitelist);
      validated.push(entry);
    } catch (error) { rejected.push({ path: entry.path, reason: error.message }); }
  }
  const safePlan = { ...plan, delete: validated, skip: [...plan.skip, ...rejected], estimatedBytes: validated.reduce((sum, entry) => sum + entry.bytes, 0) };
  onPlan(safePlan);
  const deleted = [];
  if (apply) {
    await ops.checkHealth(plan.current);
    for (const entry of validated) {
      // Revalidate the canonical path, inode and current immediately before rm.
      try {
        await ops.validate(entry, plan.current, whitelist);
        await ops.remove(entry.path);
        deleted.push(entry.path);
      } catch (error) {
        rejected.push({ path: entry.path, reason: error.message });
        break; // Preserve remaining rollback releases after a runtime failure.
      }
    }
    await ops.checkHealth(plan.current);
  }
  return { plan: safePlan, deleted, rejected, apply };
}

async function main() {
  const args = process.argv.slice(2);
  let apply = false;
  let expectedCurrent;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--dry-run") apply = false;
    else if (args[i] === "--expected-current" && args[i + 1]) expectedCurrent = args[++i];
    else throw new Error("Usage: node production-release-retention.mjs [--dry-run|--apply] [--expected-current /opt/eternal-time/releases/TIMESTAMP]");
  }
  const result = await runRetention({ apply, expectedCurrent, onPlan: (plan) => {
    console.log(JSON.stringify({ CURRENT: plan.current, KEEP: plan.keep, DELETE: plan.delete.map((entry) => ({ path: entry.path, bytes: entry.bytes })), SKIP: plan.skip, DRY_RUN: !apply, SPACE_POTENTIALLY_FREED: plan.estimatedBytes }, null, 2));
  } });
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", deleted: result.deleted, errors: result.rejected }, null, 2));
  if (result.rejected.length) process.exitCode = 1;
}

// Node resolves an ESM module URL through symlinks, but argv retains the
// caller's path (including /current). Compare filesystem identities, not text.
// This does NOT derive or relax the fixed production deletion allowlist.
if (process.argv[1]) {
  try {
    if (await realpath(process.argv[1]) === await realpath(fileURLToPath(import.meta.url))) await main();
  } catch (error) {
    console.error(`RETENTION STOPPED: ${error.message}`);
    process.exitCode = 1;
  }
}

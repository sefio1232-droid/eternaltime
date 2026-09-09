// Subprocess-only virtual production FS/services. Entry-script paths and their
// symlinks use the REAL temporary filesystem. No production mutation is possible.
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { promisify } from "node:util";
import path from "node:path";

const root = "/opt/eternal-time/releases";
const current = "/opt/eternal-time/current";
const names = Array.from({ length: 7 }, (_, i) => `2026080${i + 1}120000`);
const mode = process.env.RETENTION_CLI_TEST_MODE;
// Production is Linux; virtual /opt paths retain POSIX semantics on Windows CI.
for (const method of ["join", "dirname", "basename"]) {
  const original = path[method];
  const posix = path.posix[method];
  path[method] = (...args) => typeof args[0] === "string" && args[0].startsWith("/opt/") ? posix(...args) : original(...args);
}
const originalRealpath = fs.realpath;
const originalLstat = fs.lstat;
fs.realpath = async (value) => {
  if (value === current) {
    if (mode === "broken") throw Object.assign(new Error("Broken current symlink"), { code: "ENOENT" });
    return mode === "outside" ? "/opt/eternal-time/shared" : `${root}/${names[6]}`;
  }
  if (value === root) return mode === "root-escape" ? "/other/releases" : root;
  if (typeof value === "string" && value.startsWith(`${root}/`)) return value;
  return originalRealpath(value);
};
fs.lstat = async (value) => {
  if (value === current || value === root || (typeof value === "string" && value.startsWith(`${root}/`))) {
    return { isSymbolicLink: () => value === current, isDirectory: () => value !== current, dev: 1, ino: value };
  }
  return originalLstat(value);
};
fs.readdir = async (value) => {
  if (value === root) return names;
  if (value === "/proc") return [];
  throw new Error(`Unexpected test directory: ${value}`);
};
fs.readFile = async (value) => {
  if (value === "/proc/self/mountinfo") return "";
  throw new Error(`Unexpected test read: ${value}`);
};
fs.rm = async () => { throw new Error("DELETION ATTEMPTED IN DRY RUN"); };
childProcess.execFile = (command, args, options, callback) => {
  const output = command === "systemctl" ? "active\n" : command === "curl" ? "200" : command === "du" ? "1024\trelease\n" : null;
  if (output === null) callback(new Error(`Unexpected command: ${command}`));
  else callback(null, output, "");
};
childProcess.execFile[promisify.custom] = async (command, args, options) => new Promise((resolve, reject) => {
  childProcess.execFile(command, args, options, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
});
syncBuiltinESMExports();

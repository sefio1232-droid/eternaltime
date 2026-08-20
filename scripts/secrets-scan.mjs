import { execFileSync } from "node:child_process";
import { existsSync, statSync, readFileSync } from "node:fs";

const maxFileBytes = 1024 * 1024;
const patterns = [
  { name: "supabase secret key", regex: /SUPABASE_SECRET_KEY[^\S\r\n]*=[^\S\r\n]*['"]?sb_secret_[A-Za-z0-9._-]+/i },
  { name: "legacy supabase service role", regex: /SUPABASE_SERVICE_ROLE_KEY[^\S\r\n]*=[^\S\r\n]*['"]?[A-Za-z0-9._-]{20,}/i },
  { name: "cdek client secret", regex: /CDEK_CLIENT_SECRET[^\S\r\n]*=[^\S\r\n]*['"]?[A-Za-z0-9._-]{20,}/i },
  { name: "generic api key assignment", regex: /(?:API_KEY|SECRET|TOKEN)[^\S\r\n]*=[^\S\r\n]*['"][A-Za-z0-9._-]{24,}['"]/i },
  { name: "private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
];

function gitVisibleFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const findings = [];

for (const file of gitVisibleFiles()) {
  if (!existsSync(file)) {
    continue;
  }

  const stats = statSync(file);
  if (!stats.isFile() || stats.size > maxFileBytes) {
    continue;
  }

  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      findings.push(`${file}: ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log("No potential secrets found in git-visible text files.");
}

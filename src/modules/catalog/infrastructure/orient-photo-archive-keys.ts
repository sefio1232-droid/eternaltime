import { createHash } from "node:crypto";

/** Distinct, unambiguous prefix so the dev-images route can dispatch to this resolver without
 * colliding with the existing import-pipeline dev-image-key namespace (both are otherwise
 * SHA-256-derived hex strings of the same length). */
const ORIENT_ARCHIVE_KEY_PREFIX = "orient_";

export function createOrientArchiveImageKey(zipEntry: string): string {
  const hash = createHash("sha256").update(zipEntry).digest("hex").slice(0, 32);
  return `${ORIENT_ARCHIVE_KEY_PREFIX}${hash}`;
}

export function isOrientArchiveImageKey(value: string): boolean {
  return value.startsWith(ORIENT_ARCHIVE_KEY_PREFIX) && /^[a-f0-9]{32}$/.test(value.slice(ORIENT_ARCHIVE_KEY_PREFIX.length));
}

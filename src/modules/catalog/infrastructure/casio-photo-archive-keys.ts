import { createHash } from "node:crypto";

/** Distinct, unambiguous prefix so the dev-images route can dispatch to this resolver without
 * colliding with the existing import-pipeline dev-image-key namespace or the Orient archive's own
 * `orient_` namespace (all three are otherwise SHA-256-derived hex strings of the same length). */
const CASIO_ARCHIVE_KEY_PREFIX = "casio_";

export function createCasioArchiveImageKey(zipEntry: string): string {
  const hash = createHash("sha256").update(zipEntry).digest("hex").slice(0, 32);
  return `${CASIO_ARCHIVE_KEY_PREFIX}${hash}`;
}

export function isCasioArchiveImageKey(value: string): boolean {
  return value.startsWith(CASIO_ARCHIVE_KEY_PREFIX) && /^[a-f0-9]{32}$/.test(value.slice(CASIO_ARCHIVE_KEY_PREFIX.length));
}

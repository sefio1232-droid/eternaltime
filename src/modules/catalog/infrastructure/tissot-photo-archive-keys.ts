import { createHash } from "node:crypto";

/** Distinct, unambiguous prefix so the dev-images route can dispatch to this resolver without
 * colliding with the import-pipeline dev-image-key namespace or the Orient/Casio archive
 * namespaces (all otherwise SHA-256-derived hex strings of the same length). Hashes the archive
 * file name together with the zip-internal entry — unlike Orient/Casio, a Tissot entry alone
 * doesn't uniquely identify a file since it can come from any one of several archive files. */
const TISSOT_ARCHIVE_KEY_PREFIX = "tissot_";

export function createTissotArchiveImageKey(archiveFile: string, zipEntry: string): string {
  const hash = createHash("sha256").update(`${archiveFile}::${zipEntry}`).digest("hex").slice(0, 32);
  return `${TISSOT_ARCHIVE_KEY_PREFIX}${hash}`;
}

export function isTissotArchiveImageKey(value: string): boolean {
  return value.startsWith(TISSOT_ARCHIVE_KEY_PREFIX) && /^[a-f0-9]{32}$/.test(value.slice(TISSOT_ARCHIVE_KEY_PREFIX.length));
}

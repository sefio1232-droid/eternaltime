import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { createTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { TISSOT_MANIFEST_OUTPUT_PATH, type TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";

export type TissotArchiveImageResolution =
  | {
      status: "found";
      contentType: string;
      bytes: Uint8Array;
    }
  | {
      status: "not_found" | "disabled";
    };

const imageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function contentTypeForEntry(entry: string): string | null {
  return imageContentTypes[path.extname(entry).toLowerCase()] ?? null;
}

function envFromProcess(): "development" | "test" | "production" {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    return process.env.NODE_ENV;
  }

  return "development";
}

async function readManifest(manifestPath: string): Promise<TissotPhotoArchiveManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as TissotPhotoArchiveManifest;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Serves a single image from a Tissot photo archive by its manifest-derived key. Only ever active
 * outside production, mirroring the Orient/Casio resolvers. Unlike those, each manifest entry names
 * its own archive file (several source zips, not one) — read straight from that specific file at
 * request time; nothing is pre-extracted onto disk. A `..`/absolute `archiveFile` is rejected
 * before it ever reaches the filesystem — the manifest is build-time-generated and gitignored, but
 * this keeps the resolver safe even if it were ever hand-edited or corrupted.
 */
export async function resolveTissotArchiveImage(input: {
  imageKey: string;
  rootDir?: string;
  nodeEnv?: "development" | "test" | "production";
  manifestPath?: string;
}): Promise<TissotArchiveImageResolution> {
  const rootDir = input.rootDir ?? process.cwd();
  const nodeEnv = input.nodeEnv ?? envFromProcess();

  if (nodeEnv === "production") {
    return { status: "disabled" };
  }

  const manifestPath = input.manifestPath ?? path.join(/* turbopackIgnore: true */ rootDir, TISSOT_MANIFEST_OUTPUT_PATH);
  const manifest = await readManifest(manifestPath);
  if (!manifest) {
    return { status: "not_found" };
  }

  const entry = manifest.entries.find(
    (candidate) => createTissotArchiveImageKey(candidate.archiveFile, candidate.zipEntry) === input.imageKey,
  );
  if (!entry) {
    return { status: "not_found" };
  }

  if (entry.archiveFile.includes("..") || path.isAbsolute(entry.archiveFile)) {
    return { status: "not_found" };
  }

  const contentType = contentTypeForEntry(entry.zipEntry);
  if (!contentType) {
    return { status: "not_found" };
  }

  const archivePath = path.join(/* turbopackIgnore: true */ rootDir, entry.archiveFile);
  const zipBytes = await readFile(archivePath);
  const zip = await JSZip.loadAsync(zipBytes);
  const file = zip.file(entry.zipEntry);
  if (!file) {
    return { status: "not_found" };
  }

  return {
    status: "found",
    contentType,
    bytes: await file.async("uint8array"),
  };
}

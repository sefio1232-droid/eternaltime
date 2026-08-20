import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { catalogImageNodeEnv, resolveCatalogImageAssetRoot } from "@/modules/catalog/infrastructure/catalog-image-asset-root";
import { createOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import {
  DEFAULT_ORIENT_ARCHIVE_PATH,
  ORIENT_MANIFEST_OUTPUT_PATH,
  type OrientPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/orient-photo-archive-types";

export type OrientArchiveImageResolution =
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

function contentTypeForBytes(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function envFromProcess(): "development" | "test" | "production" {
  return catalogImageNodeEnv();
}

async function readManifest(manifestPath: string): Promise<OrientPhotoArchiveManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as OrientPhotoArchiveManifest;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

const manifestCache = new Map<string, Promise<OrientPhotoArchiveManifest | null>>();
const zipCache = new Map<string, Promise<JSZip>>();

function cachedManifest(manifestPath: string): Promise<OrientPhotoArchiveManifest | null> {
  const existing = manifestCache.get(manifestPath);
  if (existing) return existing;
  const promise = readManifest(manifestPath);
  manifestCache.set(manifestPath, promise);
  return promise;
}

function cachedZip(archivePath: string): Promise<JSZip> {
  const existing = zipCache.get(archivePath);
  if (existing) return existing;
  const promise = readFile(archivePath).then((zipBytes) => JSZip.loadAsync(zipBytes));
  zipCache.set(archivePath, promise);
  return promise;
}

/**
 * Serves a single image from the Orient photo archive by its manifest-derived key. Only ever
 * active outside production (matching the existing dev-image pipeline's own gating — both read
 * straight from a local zip archive that is never part of a production deployment). Reads the
 * archive's own bytes directly at request time; the manifest is never pre-extracted onto disk.
 */
export async function resolveOrientArchiveImage(input: {
  imageKey: string;
  rootDir?: string;
  nodeEnv?: "development" | "test" | "production";
  manifestPath?: string;
  archivePath?: string;
}): Promise<OrientArchiveImageResolution> {
  const nodeEnv = input.nodeEnv ?? envFromProcess();
  const rootDir = resolveCatalogImageAssetRoot({ rootDir: input.rootDir, nodeEnv });
  if (!rootDir) {
    return { status: "disabled" };
  }

  // These paths are only ever read in non-production environments (returned above), so the
  // `turbopackIgnore` hint is safe — it stops the production build's file tracer from pulling the
  // whole project into this route's server bundle for a filesystem read that never runs there.
  const manifestPath = input.manifestPath ?? path.join(/* turbopackIgnore: true */ rootDir, ORIENT_MANIFEST_OUTPUT_PATH);
  const manifest = await cachedManifest(manifestPath);
  if (!manifest) {
    return { status: "not_found" };
  }

  const entry = manifest.entries.find((candidate) => createOrientArchiveImageKey(candidate.zipEntry) === input.imageKey);
  if (!entry) {
    return { status: "not_found" };
  }

  const archivePath = input.archivePath ?? path.join(/* turbopackIgnore: true */ rootDir, DEFAULT_ORIENT_ARCHIVE_PATH);
  const zip = await cachedZip(archivePath);
  const file = zip.file(entry.zipEntry);
  if (!file) {
    return { status: "not_found" };
  }
  const bytes = await file.async("uint8array");
  const contentType = contentTypeForBytes(bytes) ?? contentTypeForEntry(entry.zipEntry);
  if (!contentType) {
    return { status: "not_found" };
  }

  return {
    status: "found",
    contentType,
    bytes,
  };
}

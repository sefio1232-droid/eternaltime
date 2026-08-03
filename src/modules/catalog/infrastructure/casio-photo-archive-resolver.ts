import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { createCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import {
  DEFAULT_CASIO_ARCHIVE_PATH,
  CASIO_MANIFEST_OUTPUT_PATH,
  type CasioPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/casio-photo-archive-types";

export type CasioArchiveImageResolution =
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

async function readManifest(manifestPath: string): Promise<CasioPhotoArchiveManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as CasioPhotoArchiveManifest;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Serves a single image from the Casio photo archive by its manifest-derived key. Only ever
 * active outside production (matching the existing dev-image pipeline's own gating — both read
 * straight from a local zip archive that is never part of a production deployment). Reads the
 * archive's own bytes directly at request time; the manifest is never pre-extracted onto disk.
 */
export async function resolveCasioArchiveImage(input: {
  imageKey: string;
  rootDir?: string;
  nodeEnv?: "development" | "test" | "production";
  manifestPath?: string;
  archivePath?: string;
}): Promise<CasioArchiveImageResolution> {
  const rootDir = input.rootDir ?? process.cwd();
  const nodeEnv = input.nodeEnv ?? envFromProcess();

  if (nodeEnv === "production") {
    return { status: "disabled" };
  }

  // These paths are only ever read in non-production environments (returned above), so the
  // `turbopackIgnore` hint is safe — it stops the production build's file tracer from pulling the
  // whole project into this route's server bundle for a filesystem read that never runs there.
  const manifestPath = input.manifestPath ?? path.join(/* turbopackIgnore: true */ rootDir, CASIO_MANIFEST_OUTPUT_PATH);
  const manifest = await readManifest(manifestPath);
  if (!manifest) {
    return { status: "not_found" };
  }

  const entry = manifest.entries.find((candidate) => createCasioArchiveImageKey(candidate.zipEntry) === input.imageKey);
  if (!entry) {
    return { status: "not_found" };
  }

  const contentType = contentTypeForEntry(entry.zipEntry);
  if (!contentType) {
    return { status: "not_found" };
  }

  const archivePath = input.archivePath ?? path.join(/* turbopackIgnore: true */ rootDir, DEFAULT_CASIO_ARCHIVE_PATH);
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

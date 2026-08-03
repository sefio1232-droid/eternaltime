/**
 * Minimal, dependency-free width/height readers for JPEG, PNG, and WebP — used only to populate
 * the informational width/height fields in the Orient photo-archive manifest (the runtime
 * `CatalogImagePresentation` read model has no width/height field, so this never touches anything
 * served to the catalog UI). No new package dependency; parses just enough of each container
 * format's header to find the two integers.
 */

export type ImageDimensions = { width: number; height: number } | null;

function jpegDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function pngDimensions(buffer: Buffer): ImageDimensions {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length < 24 || !signature.every((byte, index) => buffer[index] === byte)) {
    return null;
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function webpDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    const width = 1 + (buffer[24]! | (buffer[25]! << 8) | (buffer[26]! << 16));
    const height = 1 + (buffer[27]! | (buffer[28]! << 8) | (buffer[29]! << 16));
    return { width, height };
  }

  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  if (chunk === "VP8 ") {
    // Lossy WebP: a 3-byte frame tag, then a 3-byte start code (0x9d 0x01 0x2a), then two
    // little-endian 14-bit-plus-2-bit-scale width/height fields.
    if (buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
  }

  return null;
}

export function readImageDimensions(buffer: Buffer): ImageDimensions {
  return jpegDimensions(buffer) ?? pngDimensions(buffer) ?? webpDimensions(buffer);
}

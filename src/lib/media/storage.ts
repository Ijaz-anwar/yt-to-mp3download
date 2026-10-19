import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { sanitizeFilename } from "../utils/format";

// Directory where temporary uploads and converted files are staged
const rawTempDir = process.env.TEMP_MEDIA_DIR?.trim() || ".temp_media";
const TEMP_DIR = path.isAbsolute(rawTempDir)
  ? rawTempDir
  : path.resolve(/* turbopackIgnore: true */ process.cwd(), rawTempDir);

// Ensure directory exists at process startup
function ensureTempDir(): string {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  } catch {
    // Handled gracefully by storage operations
  }
  return TEMP_DIR;
}

export interface StoredMediaRecord {
  id: string;
  originalName: string;
  filename: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
  isConverted?: boolean;
}

const globalForMediaRegistry = globalThis as unknown as {
  mediaRegistry?: Map<string, StoredMediaRecord>;
};

// In-memory registry for fast lookup and metadata mapping (attached to globalThis for persistence)
export const mediaRegistry: Map<string, StoredMediaRecord> =
  globalForMediaRegistry.mediaRegistry ?? new Map<string, StoredMediaRecord>();
globalForMediaRegistry.mediaRegistry = mediaRegistry;

/**
 * Save an uploaded buffer or stream into a controlled temp storage location
 */
export async function saveMediaBuffer(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<StoredMediaRecord> {
  const dir = ensureTempDir();
  const id = uuidv4();
  const safeBase = sanitizeFilename(originalFilename, "upload");
  const ext = path.extname(safeBase) || ".bin";
  const storedFilename = `${id}${ext}`;
  const filePath = path.join(/* turbopackIgnore: true */ dir, storedFilename);

  await fs.promises.writeFile(filePath, buffer);
  const stats = await fs.promises.stat(/* turbopackIgnore: true */ filePath);

  const record: StoredMediaRecord = {
    id,
    originalName: safeBase,
    filename: storedFilename,
    filePath,
    mimeType,
    size: stats.size,
    createdAt: Date.now(),
  };

  mediaRegistry.set(id, record);
  return record;
}

/**
 * Register a newly created converted file into the system
 */
export async function registerConvertedMedia(
  filePath: string,
  originalName: string,
  targetFormat: string,
  mimeType: string
): Promise<StoredMediaRecord> {
  const id = uuidv4();
  const stats = await fs.promises.stat(filePath);
  const baseNameWithoutExt = path.parse(originalName).name;
  const convertedOriginalName = `${baseNameWithoutExt}.${targetFormat}`;

  const record: StoredMediaRecord = {
    id,
    originalName: convertedOriginalName,
    filename: path.basename(filePath),
    filePath,
    mimeType,
    size: stats.size,
    createdAt: Date.now(),
    isConverted: true,
  };

  mediaRegistry.set(id, record);
  return record;
}

/**
 * Retrieve a stored media record by ID, verifying existence on disk
 */
export async function getMediaRecord(id: string): Promise<StoredMediaRecord | null> {
  // Defensive validation on ID
  if (!id || typeof id !== "string" || id.includes("..") || id.includes("/") || id.includes("\\")) {
    return null;
  }

  const record = mediaRegistry.get(id);
  if (!record) {
    // Check if file exists matching UUID prefix
    const dir = ensureTempDir();
    const files = await fs.promises.readdir(dir);
    const matched = files.find((f) => f.startsWith(id));
    if (matched) {
      const fullPath = path.join(/* turbopackIgnore: true */ dir, matched);
      const stats = await fs.promises.stat(fullPath);
      const recovered: StoredMediaRecord = {
        id,
        originalName: matched,
        filename: matched,
        filePath: fullPath,
        mimeType: "application/octet-stream",
        size: stats.size,
        createdAt: stats.ctimeMs,
      };
      mediaRegistry.set(id, recovered);
      return recovered;
    }
    return null;
  }

  // Ensure file still physically exists on disk
  if (!fs.existsSync(record.filePath)) {
    mediaRegistry.delete(id);
    return null;
  }

  return record;
}

/**
 * Delete a media file safely
 */
export async function removeMediaFile(id: string): Promise<boolean> {
  const record = await getMediaRecord(id);
  if (!record) return false;

  try {
    if (fs.existsSync(record.filePath)) {
      await fs.promises.unlink(record.filePath);
    }
    mediaRegistry.delete(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new empty temporary file path for output
 */
export function createTempOutputPath(extension: string): { id: string; filePath: string } {
  const dir = ensureTempDir();
  const id = uuidv4();
  const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;
  const filePath = path.join(dir, `output_${id}${cleanExt}`);
  return { id, filePath };
}

/**
 * Cleanup files older than maxAgeMs (default 60 minutes)
 */
export async function cleanupExpiredMedia(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  const dir = ensureTempDir();
  const now = Date.now();
  let cleanedCount = 0;

  try {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(/* turbopackIgnore: true */ dir, file);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.ctimeMs > maxAgeMs) {
          await fs.promises.unlink(fullPath);
          cleanedCount++;
        }
      } catch {
        // Ignore single file error
      }
    }

    // Clean memory registry
    for (const [id, record] of mediaRegistry.entries()) {
      if (now - record.createdAt > maxAgeMs || !fs.existsSync(record.filePath)) {
        mediaRegistry.delete(id);
      }
    }
  } catch {
    // Ignore directory read error
  }

  return cleanedCount;
}

// Initial directory creation
ensureTempDir();

export function getThumbnailPath(id: string): string {
  const dir = ensureTempDir();
  return path.join(/* turbopackIgnore: true */ dir, `thumb_${id}.jpg`);
}

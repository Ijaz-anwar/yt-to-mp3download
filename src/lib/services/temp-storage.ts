import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { MediaError } from "./error-handler";
import { sanitizeFilename } from "../utils/format";
import { getMediaRecord } from "../media/storage";

const rawTempDir = process.env.TEMP_MEDIA_DIR?.trim() || ".temp_media";
export const TEMP_MEDIA_DIR = path.isAbsolute(rawTempDir)
  ? rawTempDir
  : path.resolve(/* turbopackIgnore: true */ process.cwd(), rawTempDir);

function ensureDirectory(): string {
  if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
  }
  return TEMP_MEDIA_DIR;
}

export interface StoredFileRecord {
  id: string;
  originalName: string;
  filename: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
  expiresAt: number;
}

const globalForFiles = globalThis as unknown as {
  fileStore?: Map<string, StoredFileRecord>;
};

// In-memory record store (attached to globalThis for persistence across Next.js route bundles)
export const fileStore: Map<string, StoredFileRecord> =
  globalForFiles.fileStore ?? new Map<string, StoredFileRecord>();
globalForFiles.fileStore = fileStore;

/**
 * Validates that an ID is a safe string without path traversal attempts
 */
export function assertSafeId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new MediaError("Invalid file identifier.", 400, "INVALID_ID");
  }
  // Enforce strict UUID or safe identifier token format (no slashes, dots, nulls)
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    throw new MediaError("Malformed identifier.", 400, "SECURITY_VIOLATION");
  }
}

/**
 * Stores an uploaded buffer into staging storage
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  ttlMs = 15 * 60 * 1000 // 15 minutes ephemeral retention
): Promise<StoredFileRecord> {
  const dir = ensureDirectory();
  const id = uuidv4();
  const safeOriginal = sanitizeFilename(originalFilename, "media_file");
  const ext = path.extname(safeOriginal).toLowerCase() || ".bin";
  const filename = `${id}${ext}`;
  const filePath = path.join(/* turbopackIgnore: true */ dir, filename);

  await fs.promises.writeFile(filePath, buffer);
  const stats = await fs.promises.stat(/* turbopackIgnore: true */ filePath);
  const now = Date.now();

  const record: StoredFileRecord = {
    id,
    originalName: safeOriginal,
    filename,
    filePath,
    mimeType,
    size: stats.size,
    createdAt: now,
    expiresAt: now + ttlMs,
  };

  fileStore.set(id, record);
  return record;
}

/**
 * Allocates a safe temporary destination path for conversion output
 */
export function allocateOutputPath(
  extension: string,
  ttlMs = 15 * 60 * 1000 // 15 minutes ephemeral retention
): {
  id: string;
  filePath: string;
  expiresAt: number;
} {
  const dir = ensureDirectory();
  const id = uuidv4();
  const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;
  const filename = `out_${id}${cleanExt}`;
  const filePath = path.join(/* turbopackIgnore: true */ dir, filename);
  const expiresAt = Date.now() + ttlMs;

  return { id, filePath, expiresAt };
}

/**
 * Registers an output file once created
 */
export async function registerOutputFile(
  id: string,
  filePath: string,
  originalName: string,
  mimeType: string,
  expiresAt: number
): Promise<StoredFileRecord> {
  assertSafeId(id);
  if (!fs.existsSync(filePath)) {
    throw new MediaError("Generated file does not exist on disk.", 500, "FILE_NOT_FOUND");
  }

  const stats = await fs.promises.stat(filePath);
  const record: StoredFileRecord = {
    id,
    originalName,
    filename: path.basename(filePath),
    filePath,
    mimeType,
    size: stats.size,
    createdAt: Date.now(),
    expiresAt,
  };

  fileStore.set(id, record);
  return record;
}

/**
 * Retrieves a stored file record and confirms physical existence on disk
 */
export async function getFileRecord(id: string): Promise<StoredFileRecord | null> {
  assertSafeId(id);
  const record = fileStore.get(id);

  if (!record) {
    // Check legacy registry
    const legacy = await getMediaRecord(id);
    if (legacy && fs.existsSync(legacy.filePath)) {
      const recovered: StoredFileRecord = {
        id: legacy.id,
        originalName: legacy.originalName,
        filename: legacy.filename,
        filePath: legacy.filePath,
        mimeType: legacy.mimeType,
        size: legacy.size,
        createdAt: legacy.createdAt,
        expiresAt: legacy.createdAt + 15 * 60 * 1000,
      };
      fileStore.set(id, recovered);
      return recovered;
    }

    // Check if file exists matching UUID prefix in temp dir
    const dir = ensureDirectory();
    const files = await fs.promises.readdir(dir);
    const matched = files.find((f) => f.includes(id));
    if (matched) {
      const fullPath = path.join(/* turbopackIgnore: true */ dir, matched);
      if (fs.existsSync(fullPath)) {
        const stats = await fs.promises.stat(fullPath);
        const recovered: StoredFileRecord = {
          id,
          originalName: matched,
          filename: matched,
          filePath: fullPath,
          mimeType: "application/octet-stream",
          size: stats.size,
          createdAt: stats.ctimeMs,
          expiresAt: stats.ctimeMs + 15 * 60 * 1000,
        };
        fileStore.set(id, recovered);
        return recovered;
      }
    }
    return null;
  }

  if (!fs.existsSync(record.filePath)) {
    fileStore.delete(id);
    return null;
  }

  return record;
}

const globalForJobs = globalThis as unknown as {
  jobStore?: {
    list(): Promise<Array<{ status: string; sourceFileId: string; outputFileId?: string }>>;
  };
};

async function isFileInUseByActiveJob(fileId: string): Promise<boolean> {
  if (!globalForJobs.jobStore) return false;
  try {
    const jobs = await globalForJobs.jobStore.list();
    return jobs.some(
      (j) =>
        (j.status === "queued" || j.status === "processing") &&
        (j.sourceFileId === fileId || j.outputFileId === fileId)
    );
  } catch {
    return false;
  }
}

/**
 * Safely removes a file and its record
 */
export async function deleteStoredFile(id: string): Promise<boolean> {
  assertSafeId(id);
  const record = await getFileRecord(id);
  if (!record) return false;

  const inUse = await isFileInUseByActiveJob(id);
  if (inUse) {
    throw new MediaError(
      "Cannot delete file while a media conversion job is actively referencing it.",
      409,
      "FILE_IN_USE"
    );
  }

  try {
    if (fs.existsSync(record.filePath)) {
      await fs.promises.unlink(record.filePath);
    }
    fileStore.delete(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes files that have passed their expiration timestamp (15-minute default)
 */
export async function purgeExpiredFiles(maxAgeMs = 15 * 60 * 1000): Promise<number> {
  const dir = ensureDirectory();
  const now = Date.now();
  let purgedCount = 0;

  try {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(/* turbopackIgnore: true */ dir, file);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.ctimeMs > maxAgeMs) {
          // Check if file is associated with any active job
          const matchingRecord = Array.from(fileStore.values()).find(
            (r) => r.filePath === fullPath
          );
          if (matchingRecord) {
            const inUse = await isFileInUseByActiveJob(matchingRecord.id);
            if (inUse) continue;
          }

          await fs.promises.unlink(fullPath);
          purgedCount++;
        }
      } catch {
        // Continue cleaning other files
      }
    }

    // Clean memory store
    for (const [id, record] of fileStore.entries()) {
      if (now > record.expiresAt || !fs.existsSync(record.filePath)) {
        const inUse = await isFileInUseByActiveJob(id);
        if (!inUse) {
          fileStore.delete(id);
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return purgedCount;
}

/**
 * Checks physical health and write permissions of temporary storage
 */
export function getTempStorageStatus(): {
  dir: string;
  exists: boolean;
  writeable: boolean;
  fileCount: number;
} {
  try {
    const dir = ensureDirectory();
    const testFile = path.join(dir, `.health_${Date.now()}`);
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    const files = fs.readdirSync(dir);
    return {
      dir,
      exists: true,
      writeable: true,
      fileCount: files.length,
    };
  } catch {
    return {
      dir: TEMP_MEDIA_DIR,
      exists: false,
      writeable: false,
      fileCount: 0,
    };
  }
}

// Initial directory setup
ensureDirectory();

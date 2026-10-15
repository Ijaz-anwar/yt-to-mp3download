import { NextRequest, NextResponse } from "next/server";
import { saveMediaBuffer } from "@/lib/media/storage";
import { probeMediaFile } from "@/lib/media/ffmpeg-runner";
import { SITE_CONFIG } from "@/config/site";


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No media file provided in the request." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty (0 bytes)." },
        { status: 400 }
      );
    }

    if (file.size > SITE_CONFIG.maxUploadSizeBytes) {
      return NextResponse.json(
        {
          error: `File size (${(file.size / (1024 * 1024)).toFixed(
            1
          )} MB) exceeds maximum upload limit of ${
            SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)
          } MB.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const record = await saveMediaBuffer(
      buffer,
      file.name || "uploaded-media",
      file.type || "application/octet-stream"
    );

    // Extract genuine metadata using ffprobe
    const metadata = await probeMediaFile(
      record.filePath,
      record.id,
      record.originalName
    );

    return NextResponse.json({
      success: true,
      fileId: record.id,
      record: {
        id: record.id,
        filename: record.originalName,
        size: record.size,
        mimeType: record.mimeType,
      },
      metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload processing failed.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

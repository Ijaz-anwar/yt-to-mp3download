import { NextRequest, NextResponse } from "next/server";
import { ConvertRequestSchema } from "@/lib/validation/schemas";
import {
  getMediaRecord,
  createTempOutputPath,
  registerConvertedMedia,
  StoredMediaRecord,
} from "@/lib/media/storage";
import { convertMediaFile, probeMediaFile } from "@/lib/media/ffmpeg-runner";
import { downloadRemoteMedia } from "@/lib/media/remote-fetcher";
import { getMimeTypeForExt } from "@/lib/utils/format";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ConvertRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg =
        parsed.error.issues[0]?.message || "Invalid conversion options.";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      fileId,
      directUrl,
      targetFormat,
      audioBitrate,
      audioSampleRate,
      videoResolution,
      trimStart,
      trimEnd,
      stripAudio,
      stripVideo,
      volume,
    } = parsed.data;

    let sourceRecord: StoredMediaRecord | null = null;

    if (fileId) {
      sourceRecord = await getMediaRecord(fileId);
      if (!sourceRecord) {
        return NextResponse.json(
          { error: "The uploaded media session has expired or the file was removed." },
          { status: 404 }
        );
      }
    } else if (directUrl) {
      try {
        const remote = await downloadRemoteMedia(directUrl);
        sourceRecord = remote.record;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch remote media.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (!sourceRecord) {
      return NextResponse.json(
        { error: "No valid media source available for conversion." },
        { status: 400 }
      );
    }

    // Allocate output file
    const { filePath: outputPath } = createTempOutputPath(targetFormat);

    // Perform actual FFmpeg conversion
    const conversionResult = await convertMediaFile(
      sourceRecord.filePath,
      outputPath,
      {
        targetFormat,
        audioBitrate,
        audioSampleRate,
        videoResolution,
        trimStart,
        trimEnd,
        stripAudio,
        stripVideo,
        volume,
      }
    );

    const mimeType = getMimeTypeForExt(targetFormat);
    const convertedRecord = await registerConvertedMedia(
      outputPath,
      sourceRecord.originalName,
      targetFormat,
      mimeType
    );

    // Extract genuine metadata from output file
    const outputMetadata = await probeMediaFile(
      convertedRecord.filePath,
      convertedRecord.id,
      convertedRecord.originalName
    );

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/media/download/${convertedRecord.id}`,
      previewUrl: `/api/media/preview/${convertedRecord.id}`,
      result: {
        id: convertedRecord.id,
        filename: convertedRecord.originalName,
        size: convertedRecord.size,
        mimeType: convertedRecord.mimeType,
        timeMs: conversionResult.timeMs,
        metadata: outputMetadata,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Media conversion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

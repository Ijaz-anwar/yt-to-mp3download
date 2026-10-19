import { MediaMetadata } from "../validation/schemas";
import { MediaError } from "./error-handler";

export interface FormatOption {
  id: string;
  label: string;
  extension: string;
  category: "video" | "audio";
  description: string;
  isLossless?: boolean;
}

export const ALL_VIDEO_FORMATS: FormatOption[] = [
  { id: "mp4", label: "MP4 Video", extension: ".mp4", category: "video", description: "H.264 / AAC universal compatibility" },
  { id: "webm", label: "WebM Video", extension: ".webm", category: "video", description: "VP9 / Opus open web standard" },
  { id: "mkv", label: "MKV Matroska", extension: ".mkv", category: "video", description: "Flexible high-definition container" },
];

export const ALL_AUDIO_FORMATS: FormatOption[] = [
  { id: "mp3", label: "MP3 Audio", extension: ".mp3", category: "audio", description: "Ubiquitous MPEG audio format" },
  { id: "m4a", label: "M4A Audio", extension: ".m4a", category: "audio", description: "High-efficiency Apple AAC audio" },
  { id: "wav", label: "WAV PCM", extension: ".wav", category: "audio", description: "Uncompressed lossless master audio", isLossless: true },
  { id: "flac", label: "FLAC Audio", extension: ".flac", category: "audio", description: "Free Lossless Audio Codec", isLossless: true },
  { id: "ogg", label: "OGG Vorbis", extension: ".ogg", category: "audio", description: "Open Vorbis compressed audio" },
  { id: "aac", label: "AAC Audio", extension: ".aac", category: "audio", description: "Advanced Audio Coding stream" },
];

export interface MediaCapabilities {
  hasVideo: boolean;
  hasAudio: boolean;
  availableFormats: FormatOption[];
  availableVideoFormats: FormatOption[];
  availableAudioFormats: FormatOption[];
  availableResolutions: string[];
  availableBitrates: string[];
  recommendedFormat: string;
}

/**
 * Calculates real format capabilities for a probed media file.
 * Prevents invalid conversions such as video container output from audio-only inputs.
 */
export function getMediaCapabilities(metadata: MediaMetadata): MediaCapabilities {
  const isVideo = Boolean(metadata.hasVideo);

  // Video formats are strictly only available if input has a real video stream
  const availableVideoFormats = isVideo ? ALL_VIDEO_FORMATS : [];
  const availableAudioFormats = ALL_AUDIO_FORMATS;
  const availableFormats = [...availableVideoFormats, ...availableAudioFormats];

  // Video resolutions allowed based on source height (preventing meaningless upscaling)
  let availableResolutions = ["original"];
  if (isVideo && metadata.videoHeight) {
    if (metadata.videoHeight >= 1080) {
      availableResolutions = ["original", "1080p", "720p", "480p"];
    } else if (metadata.videoHeight >= 720) {
      availableResolutions = ["original", "720p", "480p"];
    } else {
      availableResolutions = ["original", "480p"];
    }
  } else if (isVideo) {
    availableResolutions = ["original", "1080p", "720p", "480p"];
  }

  const availableBitrates = ["128k", "192k", "256k", "320k"];
  const recommendedFormat = isVideo ? "mp4" : "mp3";

  return {
    hasVideo: isVideo,
    hasAudio: Boolean(metadata.hasAudio),
    availableFormats,
    availableVideoFormats,
    availableAudioFormats,
    availableResolutions,
    availableBitrates,
    recommendedFormat,
  };
}

/**
 * Validates that a requested conversion target is technically compatible with input media.
 */
export function validateConversionCapabilities(
  metadata: MediaMetadata,
  targetFormat: string,
  options?: {
    videoResolution?: string;
    audioBitrate?: string;
  }
): void {
  const cleanTarget = targetFormat.toLowerCase().trim();
  const isTargetVideo = ALL_VIDEO_FORMATS.some((f) => f.id === cleanTarget);
  const isTargetAudio = ALL_AUDIO_FORMATS.some((f) => f.id === cleanTarget);

  if (!isTargetVideo && !isTargetAudio) {
    throw new MediaError(
      `Unsupported target format "${targetFormat}".`,
      400,
      "UNSUPPORTED_TARGET_FORMAT"
    );
  }

  // Target requires audio, but source has no audio stream
  if (isTargetAudio && !metadata.hasAudio) {
    throw new MediaError(
      `Cannot extract audio to "${cleanTarget}": source media does not contain an audio track.`,
      400,
      "NO_AUDIO_STREAM"
    );
  }

  // Audio-only input cannot be converted into video
  if (isTargetVideo && !metadata.hasVideo) {
    throw new MediaError(
      `Cannot convert audio-only media to video format "${cleanTarget}" without a source video stream.`,
      400,
      "INCOMPATIBLE_CONVERSION"
    );
  }

  // Check resolution if specified
  if (options?.videoResolution && options.videoResolution !== "original") {
    if (!metadata.hasVideo) {
      throw new MediaError(
        "Video resolution cannot be specified for audio-only media.",
        400,
        "INVALID_OPTION"
      );
    }
  }
}

export interface ConversionStrategy {
  strategy: "remux" | "transcode";
  videoCodec: string;
  audioCodec: string;
  isLossless: boolean;
  description: string;
  fidelityNotice?: string;
}

/**
 * Determines whether conversion can be performed via stream remuxing (copy) or requires full re-encoding.
 * Accurately reports whether generation loss occurs.
 */
export function determineConversionStrategy(
  metadata: MediaMetadata,
  targetFormat: string,
  options?: {
    videoResolution?: string;
    audioBitrate?: string;
    trimStart?: number;
    trimEnd?: number;
    volume?: number;
    stripAudio?: boolean;
    stripVideo?: boolean;
  }
): ConversionStrategy {
  const cleanTarget = targetFormat.toLowerCase().trim();
  const hasTrimming = Boolean(
    (options?.trimStart !== undefined && options.trimStart > 0) ||
      (options?.trimEnd !== undefined && options.trimEnd > 0)
  );
  const hasVolumeFilter = Boolean(options?.volume !== undefined && options.volume !== 1);
  const hasRescale = Boolean(options?.videoResolution && options.videoResolution !== "original");

  const vCodec = (metadata.videoCodec || "").toLowerCase();
  const aCodec = (metadata.audioCodec || "").toLowerCase();

  let fidelityNotice: string | undefined;

  // Check audio bitrate inflation
  if (options?.audioBitrate && metadata.bitrate) {
    const targetBps = parseInt(options.audioBitrate, 10) * 1000;
    if (targetBps > metadata.bitrate) {
      fidelityNotice =
        "Selected bitrate exceeds source bitrate. Note that re-encoding cannot restore audio fidelity lost during original compression and will only increase file size.";
    }
  }

  // Check if we can remux video to MP4
  if (
    cleanTarget === "mp4" &&
    metadata.hasVideo &&
    vCodec.includes("264") &&
    (aCodec === "aac" || options?.stripAudio) &&
    !hasRescale &&
    !hasTrimming &&
    !hasVolumeFilter &&
    !options?.audioBitrate
  ) {
    return {
      strategy: "remux",
      videoCodec: "copy",
      audioCodec: options?.stripAudio ? "none" : "copy",
      isLossless: true,
      description: "Lossless stream remux: H.264 video and AAC audio copied directly into MP4 container without re-encoding.",
      fidelityNotice,
    };
  }

  // Check if we can remux video to MKV
  if (
    cleanTarget === "mkv" &&
    metadata.hasVideo &&
    !hasRescale &&
    !hasTrimming &&
    !hasVolumeFilter &&
    !options?.audioBitrate
  ) {
    return {
      strategy: "remux",
      videoCodec: "copy",
      audioCodec: options?.stripAudio ? "none" : "copy",
      isLossless: true,
      description: "Lossless stream remux: Original video and audio bitstreams encapsulated into MKV container.",
      fidelityNotice,
    };
  }

  // Check if we can extract M4A/AAC without re-encoding
  if (
    (cleanTarget === "m4a" || cleanTarget === "aac") &&
    metadata.hasAudio &&
    aCodec === "aac" &&
    !hasTrimming &&
    !hasVolumeFilter &&
    !options?.audioBitrate
  ) {
    return {
      strategy: "remux",
      videoCodec: "none",
      audioCodec: "copy",
      isLossless: true,
      description: "Lossless audio demux: AAC stream extracted directly from container without re-encoding.",
      fidelityNotice,
    };
  }

  // Full transcode required
  return {
    strategy: "transcode",
    videoCodec: cleanTarget === "webm" ? "libvpx-vp9" : "libx264",
    audioCodec:
      cleanTarget === "mp3"
        ? "libmp3lame"
        : cleanTarget === "wav"
        ? "pcm_s16le"
        : cleanTarget === "flac"
        ? "flac"
        : cleanTarget === "webm"
        ? "libopus"
        : "aac",
    isLossless: cleanTarget === "wav" || cleanTarget === "flac",
    description: `Native FFmpeg transcode pipeline to ${cleanTarget.toUpperCase()}.`,
    fidelityNotice,
  };
}

import dns from "dns";
import net from "net";
import { MediaError } from "./error-handler";

/**
 * Explicit provider allowlist for remote media sources.
 * Only authorized public domain and creative commons media repositories are permitted.
 */
export const ALLOWED_PROVIDER_PATTERNS: RegExp[] = [
  /^([a-z0-9-]+\.)*youtube\.com$/i,
  /^([a-z0-9-]+\.)*youtu\.be$/i,
  /^([a-z0-9-]+\.)*actions\.google\.com$/i,
  /^([a-z0-9-]+\.)*archive\.org$/i,
  /^([a-z0-9-]+\.)*wikimedia\.org$/i,
  /^([a-z0-9-]+\.)*librivox\.org$/i,
  /^([a-z0-9-]+\.)*freesound\.org$/i,
  /^([a-z0-9-]+\.)*openverse\.org$/i,
  /^([a-z0-9-]+\.)*commondatastorage\.googleapis\.com$/i,
  /^([a-z0-9-]+\.)*raw\.githubusercontent\.com$/i,
  /^([a-z0-9-]+\.)*pixabay\.com$/i,
  /^([a-z0-9-]+\.)*w3schools\.com$/i,
  /^([a-z0-9-]+\.)*file-examples\.com$/i,
];

/**
 * Known proprietary/copyright-restricted platforms that are explicitly rejected
 * with actionable user instructions.
 */
export const RESTRICTED_PLATFORMS: { pattern: RegExp; name: string }[] = [
  { pattern: /^(www\.)?instagram\.com$/i, name: "Instagram" },
  { pattern: /^(www\.)?tiktok\.com$/i, name: "TikTok" },
  { pattern: /^(www\.)?(twitter\.com|x\.com)$/i, name: "Twitter / X" },
  { pattern: /^(www\.)?facebook\.com$/i, name: "Facebook" },
  { pattern: /^(www\.)?(vimeo\.com)$/i, name: "Vimeo" },
  { pattern: /^(www\.)?(soundcloud\.com)$/i, name: "SoundCloud" },
  { pattern: /^(www\.)?(spotify\.com)$/i, name: "Spotify" },
];

/**
 * Parses alternative numeric IP representations (e.g. 2130706433 or 0x7f000001) into standard dotted-quad IPv4.
 */
export function parsePossibleNumericIp(host: string): string | null {
  const trimmed = host.trim().replace(/^\[|\]$/g, "");
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num <= 0xffffffff) {
      const b0 = (num >>> 24) & 0xff;
      const b1 = (num >>> 16) & 0xff;
      const b2 = (num >>> 8) & 0xff;
      const b3 = num & 0xff;
      return `${b0}.${b1}.${b2}.${b3}`;
    }
  }
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    const num = parseInt(trimmed, 16);
    if (!isNaN(num) && num >= 0 && num <= 0xffffffff) {
      const b0 = (num >>> 24) & 0xff;
      const b1 = (num >>> 16) & 0xff;
      const b2 = (num >>> 8) & 0xff;
      const b3 = num & 0xff;
      return `${b0}.${b1}.${b2}.${b3}`;
    }
  }
  // Check for octal / hex in dotted quads (e.g. 0177.0.0.1 or 0x7f.0.0.1)
  if (/^([0-9a-fx]+)\.([0-9a-fx]+)\.([0-9a-fx]+)\.([0-9a-fx]+)$/i.test(trimmed)) {
    const parts = trimmed.split(".").map((part) => {
      if (/^0x[0-9a-f]+$/i.test(part)) return parseInt(part, 16);
      if (/^0[0-7]+$/.test(part)) return parseInt(part, 8);
      return parseInt(part, 10);
    });
    if (parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      return parts.join(".");
    }
  }
  return null;
}

/**
 * Checks whether an IPv4 address is in a private, loopback, link-local, or reserved range.
 * Supports decimal integers, octal, hex, and standard dotted quad notation.
 */
export function isPrivateIPv4(ip: string): boolean {
  const numericParsed = parsePossibleNumericIp(ip);
  const targetIp = numericParsed || ip.trim();

  const parts = targetIp.split(".").map((n) => {
    if (/^0[0-7]+$/.test(n)) {
      return parseInt(n, 8);
    }
    if (/^0x[0-9a-f]+$/i.test(n)) {
      return parseInt(n, 16);
    }
    return parseInt(n, 10);
  });

  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata like 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private RFC 1918)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;

  // 198.18.0.0/15 (Network Benchmark Tests)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address is in a private, loopback, link-local, or unique local range.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim().replace(/^\[|\]$/g, "");

  // Loopback / Unspecified
  if (normalized === "::1" || normalized === "::") return true;

  // Unique local addresses (fc00::/7 -> fc00 to fdff)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-local addresses (fe80::/10 -> fe80 to febf)
  if (/^fe[89ab]/i.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (normalized.startsWith("ff")) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Checks if an IP string is private or unsafe
 */
export function isPrivateOrUnsafeIP(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, "");

  const numeric = parsePossibleNumericIp(cleaned);
  if (numeric) {
    return isPrivateIPv4(numeric);
  }

  if (/^\d+(\.\d+){3}$/.test(cleaned)) {
    return isPrivateIPv4(cleaned);
  }

  const version = net.isIP(cleaned);
  if (version === 4) {
    return isPrivateIPv4(cleaned);
  }
  if (version === 6) {
    return isPrivateIPv6(cleaned);
  }
  return true; // Not a valid standard IP -> treat as unsafe
}

export const isPrivateOrLoopbackIp = isPrivateOrUnsafeIP;

/**
 * Resolves a hostname to all IP addresses and checks for private/internal SSRF targets.
 */
export async function verifyDnsSafety(hostname: string): Promise<string[]> {
  const cleanHost = hostname.trim().replace(/^\[|\]$/g, "");

  // Check if hostname is an IP directly or encoded as numeric/hex
  const numeric = parsePossibleNumericIp(cleanHost);
  if (numeric || net.isIP(cleanHost)) {
    const ipToCheck = numeric || cleanHost;
    if (isPrivateOrUnsafeIP(ipToCheck)) {
      throw new MediaError(
        "Direct access to private, local, or link-local IP addresses is blocked for security.",
        400,
        "SSRF_BLOCKED"
      );
    }
    return [ipToCheck];
  }

  try {
    const addresses = await dns.promises.lookup(cleanHost, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new MediaError(`Unable to resolve domain: ${cleanHost}`, 400, "DNS_LOOKUP_FAILED");
    }

    for (const record of addresses) {
      if (isPrivateOrUnsafeIP(record.address)) {
        throw new MediaError(
          `Domain ${cleanHost} resolves to restricted address ${record.address}. Access denied.`,
          400,
          "SSRF_BLOCKED"
        );
      }
    }

    return addresses.map((a) => a.address);
  } catch (err) {
    if (err instanceof MediaError) throw err;
    throw new MediaError(`DNS resolution failed for host "${cleanHost}".`, 400, "DNS_RESOLUTION_ERROR");
  }
}

/**
 * Checks if a hostname matches the explicit provider allowlist or custom env list.
 */
export function isAllowedProvider(hostname: string): boolean {
  const cleanHost = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

  // Allow extra providers specified via environment variable
  const extraProviders = process.env.ALLOWED_MEDIA_PROVIDERS
    ? process.env.ALLOWED_MEDIA_PROVIDERS.split(",").map((s) => s.trim().toLowerCase())
    : [];

  for (const extra of extraProviders) {
    if (extra && (cleanHost === extra || cleanHost.endsWith(`.${extra}`))) {
      return true;
    }
  }

  return ALLOWED_PROVIDER_PATTERNS.some((pattern) => pattern.test(cleanHost));
}

export interface ValidatedUrlResult {
  url: string;
  hostname: string;
  resolvedIps: string[];
}

/**
 * Complete security validation for a remote media URL.
 * Enforces scheme, allowlist, restricted platform messaging, and DNS anti-SSRF checks.
 */
export async function validateRemoteMediaUrl(urlString: string): Promise<ValidatedUrlResult> {
  if (!urlString || typeof urlString !== "string") {
    throw new MediaError("Please provide a valid media URL.", 400, "INVALID_URL");
  }

  const trimmed = urlString.trim();
  if (trimmed.length > 2048) {
    throw new MediaError("URL exceeds the maximum length of 2048 characters.", 400, "URL_TOO_LONG");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MediaError("Invalid URL format. Please provide a full HTTP or HTTPS URL.", 400, "INVALID_URL");
  }

  // Protocol enforcement: Only HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new MediaError(
      `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS streams are permitted.`,
      400,
      "UNSUPPORTED_PROTOCOL"
    );
  }

  // Reject credentials in URL (e.g. http://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new MediaError("URLs containing user credentials are not allowed.", 400, "CREDENTIALS_DISALLOWED");
  }

  const rawHost = parsed.hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

  // Check numeric / integer IP representation
  const numericParsed = parsePossibleNumericIp(rawHost);
  if (numericParsed && isPrivateIPv4(numericParsed)) {
    throw new MediaError(
      "Access to local and loopback addresses is prohibited.",
      400,
      "SSRF_BLOCKED"
    );
  }

  // Blocked hostnames / cloud metadata
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
    "169.254.169.254",
  ];
  if (blockedHostnames.includes(rawHost)) {
    throw new MediaError(
      "Access to local and loopback addresses is prohibited.",
      400,
      "SSRF_BLOCKED"
    );
  }

  // Check if raw host is an IP literal in private range
  if (net.isIP(rawHost) !== 0 || /^\d+(\.\d+){3}$/.test(rawHost)) {
    if (isPrivateIPv4(rawHost) || isPrivateIPv6(rawHost)) {
      throw new MediaError(
        "Access to local and loopback addresses is prohibited.",
        400,
        "SSRF_BLOCKED"
      );
    }
  }

  // Strict port enforcement: Only 80 (HTTP) and 443 (HTTPS)
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  if (port !== 80 && port !== 443) {
    throw new MediaError(
      `Port ${port} is not permitted for remote media. Only standard ports (80, 443) are allowed.`,
      400,
      "PORT_DISALLOWED"
    );
  }

  // Check restricted proprietary platforms
  for (const restricted of RESTRICTED_PLATFORMS) {
    if (restricted.pattern.test(rawHost)) {
      throw new MediaError(
        `MediaNest does not support downloading from ${restricted.name} or other proprietary platforms ` +
          `in accordance with platform terms and copyright rules. ` +
          `To convert audio or video you own or have permission to process, please upload the file directly.`,
        400,
        "RESTRICTED_PROVIDER"
      );
    }
  }

  // Enforce explicit provider allowlist
  if (!isAllowedProvider(rawHost)) {
    throw new MediaError(
      `The domain "${rawHost}" is not on the authorized public media provider allowlist. ` +
        `Supported public sources include Wikimedia Commons, Internet Archive, LibriVox, and Google Actions samples. ` +
        `To process files from other sources, please upload your media file directly.`,
      400,
      "PROVIDER_NOT_ALLOWED"
    );
  }

  // Perform DNS resolution and anti-SSRF verification
  const resolvedIps = await verifyDnsSafety(rawHost);

  return {
    url: parsed.toString(),
    hostname: rawHost,
    resolvedIps,
  };
}

/**
 * Safely fetches a remote media stream with redirect anti-SSRF verification,
 * byte limit enforcement, and staging into temporary storage.
 */
export async function safeFetchAndStageRemoteMedia(
  initialUrl: string,
  maxBytes = (parseInt(process.env.MAX_REMOTE_DOWNLOAD_SIZE_MB || "200", 10)) * 1024 * 1024,
  timeoutMs = 45000
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  let currentUrl = initialUrl;
  let redirects = 0;
  const maxRedirects = 5;

  while (redirects <= maxRedirects) {
    // Validate current URL at each redirect hop
    await validateRemoteMediaUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "MediaNest/1.0 (+https://medianest.local; Public Media Transcoder)",
        },
      });

      clearTimeout(timeout);

      // Handle redirects securely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new MediaError("Redirect response missing Location header.", 502, "BAD_GATEWAY");
        }
        currentUrl = new URL(location, currentUrl).toString();
        redirects++;
        continue;
      }

      if (!response.ok) {
        throw new MediaError(
          `Remote media server returned HTTP ${response.status}: ${response.statusText}`,
          response.status >= 400 && response.status < 500 ? 400 : 502,
          "REMOTE_FETCH_FAILED"
        );
      }

      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const reportedLength = parseInt(contentLengthHeader, 10);
        if (reportedLength > maxBytes) {
          throw new MediaError(
            `Remote file (${Math.round(reportedLength / (1024 * 1024))}MB) exceeds maximum permitted limit (${
              maxBytes / (1024 * 1024)
            }MB).`,
            400,
            "FILE_TOO_LARGE"
          );
        }
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";

      // Extract filename from Content-Disposition or URL pathname
      let filename = "remote_media";
      const disposition = response.headers.get("content-disposition");
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1].trim());
        }
      } else {
        try {
          const parsed = new URL(currentUrl);
          const base = parsed.pathname.split("/").pop();
          if (base && base.includes(".")) {
            filename = decodeURIComponent(base);
          }
        } catch {
          // fallback
        }
      }

      // Read chunks with hard size cutoff
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > maxBytes) {
        throw new MediaError(
          `Remote file downloaded size exceeded limit of ${maxBytes / (1024 * 1024)}MB.`,
          400,
          "FILE_TOO_LARGE"
        );
      }

      if (buffer.length === 0) {
        throw new MediaError("Remote server returned an empty file payload.", 422, "EMPTY_REMOTE_FILE");
      }

      return {
        buffer,
        filename,
        mimeType: contentType,
      };
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === "AbortError") {
        throw new MediaError("Connection to remote media host timed out.", 504, "GATEWAY_TIMEOUT");
      }
      throw err;
    }
  }

  throw new MediaError("Too many redirects while attempting to fetch media.", 502, "TOO_MANY_REDIRECTS");
}

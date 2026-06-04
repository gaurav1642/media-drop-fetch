import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  url: z
    .string()
    .min(1)
    .max(2000)
    .transform((s) => s.trim())
    .refine(
      (s) => {
        try {
          const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
          const u = new URL(withProto);
          return !!u.hostname && u.hostname.includes(".");
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid link (e.g. https://...)" },
    )
    .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`)),
  mode: z.enum(["auto", "audio", "mute"]).default("auto"),
  quality: z.enum(["144", "240", "360", "480", "720", "1080", "1440", "2160", "max"]).default("1080"),
  audioFormat: z.enum(["mp3", "ogg", "wav", "opus", "best"]).default("mp3"),
});

type CobaltResponse =
  | { status: "tunnel" | "redirect"; url: string; filename?: string }
  | { status: "picker"; picker: Array<{ type: string; url: string; thumb?: string }>; audio?: string }
  | { status: "error"; error: { code: string; context?: unknown } };

// Free public Cobalt instances tried in order. Public Cobalt instances are
// flaky / rate-limited / region-locked, so we fall back through several.
const INSTANCES = [
  "https://dwnld.nichind.dev",
  "https://cobaltapi.kittycat.boo",
  "https://dog.kittycat.boo",
  "https://fox.kittycat.boo",
  "https://api.cobalt.liubquanti.click",
  "https://api.cobalt.blackcat.sweeux.org",
  "https://cobaltapi.cjs.nz",
];

function detectService(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("instagram")) return "Instagram";
  if (u.includes("tiktok")) return "TikTok";
  if (u.includes("facebook") || u.includes("fb.watch")) return "Facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "X/Twitter";
  if (u.includes("vimeo")) return "Vimeo";
  return "this link";
}

function friendlyError(code: string, service: string): string {
  if (code === "error.api.auth.jwt.missing" || code === "error.api.auth.key.missing") {
    return "Public download servers require auth right now. Trying another…";
  }
  if (code === "error.api.content.post.unavailable" || code === "content.post.unavailable") {
    return `The ${service} post is private, deleted, or region-locked.`;
  }
  if (code === "error.api.fetch.empty" || code === "error.api.fetch.fail") {
    return `${service} didn't return any media. The link may be private, expired, or unsupported.`;
  }
  if (code === "content.no_valid_content") {
    return `Public servers couldn't fetch this ${service} link right now. Try again in a minute.`;
  }
  if (code === "error.api.content.video.unavailable") {
    return `That ${service} video isn't available for public download.`;
  }
  if (code === "error.api.rate_exceeded") {
    return "Public servers are rate-limited. Wait a moment and try again.";
  }
  return `Could not process this ${service} link (${code}).`;
}

async function callInstance(
  apiUrl: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: CobaltResponse } | { ok: false; transient: boolean; error: string }> {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "MediaDrop/1.0 (+https://lovable.dev)",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      // 5xx / 429 / cloudflare blocks → try next instance
      return { ok: false, transient: true, error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    let json: CobaltResponse;
    try {
      json = JSON.parse(text) as CobaltResponse;
    } catch {
      return { ok: false, transient: true, error: "Non-JSON response" };
    }
    return { ok: true, data: json };
  } catch (err) {
    console.error(`Cobalt instance failed (${apiUrl}):`, err);
    return { ok: false, transient: true, error: (err as Error).message };
  }
}

export const fetchMedia = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const service = detectService(data.url);
    const body: Record<string, unknown> = {
      url: data.url,
      downloadMode: data.mode,
      videoQuality: data.quality,
      audioFormat: data.audioFormat,
      filenameStyle: "pretty",
      // Force cobalt to tunnel (proxy + mux) instead of returning a raw
      // adaptive stream URL — adaptive streams (esp. YouTube DASH) are
      // video-only and play back without sound.
      alwaysProxy: true,
      youtubeVideoContainer: "mp4",
      audioBitrate: "128",
    };

    let lastErrorCode: string | null = null;

    for (const apiUrl of INSTANCES) {
      const res = await callInstance(apiUrl, body);
      if (!res.ok) continue; // transport-level failure → try next

      const json = res.data;

      if (json.status === "tunnel" || json.status === "redirect") {
        return { ok: true as const, url: json.url, filename: json.filename };
      }

      if (json.status === "picker") {
        const first = json.picker?.[0];
        if (first) return { ok: true as const, url: first.url, filename: undefined };
        continue;
      }

      if (json.status === "error") {
        const code = json.error.code;
        lastErrorCode = code;
        // Auth / transient / empty → try the next instance
        if (
          code === "error.api.auth.jwt.missing" ||
          code === "error.api.auth.key.missing" ||
          code === "error.api.fetch.empty" ||
          code === "error.api.fetch.fail" ||
          code === "error.api.rate_exceeded" ||
          code === "content.no_valid_content"
        ) {
          continue;
        }
        // Deterministic content errors → stop and report
        return { ok: false as const, error: friendlyError(code, service) };
      }
    }

    if (lastErrorCode) {
      return { ok: false as const, error: friendlyError(lastErrorCode, service) };
    }
    return {
      ok: false as const,
      error: "All public download servers are unreachable right now. Try again in a minute.",
    };
  });

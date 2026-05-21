import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  url: z.string().url().min(1).max(2000),
  mode: z.enum(["auto", "audio", "mute"]).default("auto"),
  quality: z.enum(["144", "240", "360", "480", "720", "1080", "1440", "2160", "max"]).default("1080"),
  audioFormat: z.enum(["mp3", "ogg", "wav", "opus", "best"]).default("mp3"),
});

type CobaltResponse =
  | { status: "tunnel" | "redirect"; url: string; filename?: string }
  | { status: "picker"; picker: Array<{ type: string; url: string; thumb?: string }>; audio?: string }
  | { status: "error"; error: { code: string; context?: unknown } };

export const fetchMedia = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiUrl = process.env.COBALT_API_URL || "https://dwnld.nichind.dev";
    const apiKey = process.env.COBALT_API_KEY;

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "MediaDrop/1.0",
    };
    if (apiKey) headers["Authorization"] = `Api-Key ${apiKey}`;

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url: data.url,
          downloadMode: data.mode,
          videoQuality: data.quality,
          audioFormat: data.audioFormat,
          filenameStyle: "pretty",
        }),
      });
    } catch (err) {
      console.error("Cobalt request failed:", err);
      return { ok: false as const, error: "Could not reach the download service. Try again in a moment." };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Cobalt non-OK:", res.status, text);
      return { ok: false as const, error: `Service responded with ${res.status}. The URL may be unsupported or rate-limited.` };
    }

    const json = (await res.json()) as CobaltResponse;

    if (json.status === "error") {
      const code = json.error.code;
      const ctx = json.error.context as { service?: string } | undefined;
      if (code === "content.no_valid_content" && ctx?.service === "youtube") {
        return {
          ok: false as const,
          error: "YouTube is currently blocking public download servers. Try Instagram, TikTok, X, Facebook, or Vimeo instead.",
        };
      }
      if (code === "content.no_valid_content") {
        return { ok: false as const, error: "No public servers could fetch this link right now. Try again later." };
      }
      return { ok: false as const, error: `Could not process this link (${code}).` };
    }

    if (json.status === "picker") {
      const first = json.picker?.[0];
      if (!first) return { ok: false as const, error: "No downloadable items found." };
      return { ok: true as const, url: first.url, filename: undefined };
    }

    return { ok: true as const, url: json.url, filename: json.filename };
  });

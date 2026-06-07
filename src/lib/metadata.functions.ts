import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  url: z
    .string()
    .min(1)
    .max(2000)
    .transform((s) => s.trim())
    .refine((s) => {
      try {
        const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
        const u = new URL(withProto);
        return (
          (u.protocol === "http:" || u.protocol === "https:") &&
          !!u.hostname &&
          u.hostname.includes(".")
        );
      } catch {
        return false;
      }
    }, { message: "Please enter a valid http(s) link." })
    .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`)),
});

export type MediaMetadata = {
  source_url: string;
  provider: string | null;
  title: string | null;
  author: string | null;
  author_url: string | null;
  description: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  upload_date: string | null;
  fetched_at: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; }
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return decodeEntities(v);
  }
  return null;
}
function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

async function tryNoEmbed(url: string): Promise<Partial<MediaMetadata> | null> {
  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
      headers: { Accept: "application/json", "User-Agent": "MediaDrop/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    if (j.error) return null;
    return {
      provider: pickString(j, "provider_name"),
      title: pickString(j, "title"),
      author: pickString(j, "author_name"),
      author_url: pickString(j, "author_url"),
      thumbnail_url: pickString(j, "thumbnail_url", "thumbnail"),
      width: pickNumber(j, "thumbnail_width", "width"),
      height: pickNumber(j, "thumbnail_height", "height"),
    };
  } catch {
    return null;
  }
}

async function tryOpenGraph(url: string): Promise<Partial<MediaMetadata> | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MediaDropBot/1.0; +https://lovable.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("xml")) return null;
    const html = (await r.text()).slice(0, 200_000);

    const meta = (prop: string): string | null => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i",
      );
      const m = html.match(re);
      return m ? m[1].trim() : null;
    };
    const metaAlt = (prop: string): string | null => {
      const re = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
        "i",
      );
      const m = html.match(re);
      return m ? m[1].trim() : null;
    };
    const pick = (...names: string[]): string | null => {
      for (const n of names) {
        const v = meta(n) ?? metaAlt(n);
        if (v) return v;
      }
      return null;
    };

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;

    return {
      title: pick("og:title", "twitter:title") ?? titleTag,
      description: pick("og:description", "twitter:description", "description"),
      thumbnail_url: pick(
        "og:image",
        "og:image:url",
        "og:image:secure_url",
        "twitter:image",
        "twitter:image:src",
      ),
      author: pick("article:author", "author", "twitter:creator"),
      provider: pick("og:site_name"),
      upload_date: pick("article:published_time", "og:video:release_date"),
    };
  } catch {
    return null;
  }
}

export const fetchMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const url = data.url;
    const [noembed, og] = await Promise.all([tryNoEmbed(url), tryOpenGraph(url)]);

    if (!noembed && !og) {
      return {
        ok: false as const,
        error:
          "Couldn't read metadata for this link. The post may be private, region-locked, or require login.",
      };
    }

    const merged: MediaMetadata = {
      source_url: url,
      provider: noembed?.provider ?? og?.provider ?? null,
      title: noembed?.title ?? og?.title ?? null,
      author: noembed?.author ?? og?.author ?? null,
      author_url: noembed?.author_url ?? null,
      description: og?.description ?? null,
      thumbnail_url: noembed?.thumbnail_url ?? og?.thumbnail_url ?? null,
      width: noembed?.width ?? null,
      height: noembed?.height ?? null,
      upload_date: og?.upload_date ?? null,
      fetched_at: new Date().toISOString(),
    };

    if (!merged.thumbnail_url && !merged.title) {
      return {
        ok: false as const,
        error: "No usable metadata or thumbnail found for this link.",
      };
    }

    return { ok: true as const, metadata: merged };
  });

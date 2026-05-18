import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COBALT_BASE_URL = process.env.COBALT_BASE_URL || "https://api.cobalt.tools";

function detectPlatform(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("youtube") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("instagram")) return "Instagram";
  if (u.includes("tiktok")) return "TikTok";
  if (u.includes("facebook") || u.includes("fb.watch")) return "Facebook";
  if (u.includes("twitter") || u.includes("x.com")) return "Twitter/X";
  if (u.includes("vimeo")) return "Vimeo";
  return null;
}

export const fetchMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url(),
      format: z.enum(["auto", "audio"]).optional().default("auto"),
    })
  )
  .handler(async ({ data }) => {
    const platform = detectPlatform(data.url);
    if (!platform) {
      throw new Error("Unsupported platform.");
    }

    const body: Record<string, unknown> = {
      url: data.url,
      downloadMode: data.format === "audio" ? "audio" : "auto",
    };

    if (data.format === "audio") {
      body.audioFormat = "mp3";
    }

    const res = await fetch(`${COBALT_BASE_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      if (text.includes("auth") || text.includes("jwt") || text.includes("turnstile")) {
        throw new Error(
          "The public Cobalt instance requires authentication. Set your COBALT_BASE_URL environment variable to a self-hosted instance."
        );
      }
      throw new Error(`Cobalt returned ${res.status}: ${text}`);
    }

    const result = (await res.json()) as {
      status: string;
      url?: string;
      filename?: string;
      picker?: Array<{ url: string; type: string; thumb?: string }>;
    };

    if (result.status === "error") {
      throw new Error("Cobalt processing failed.");
    }

    return { platform, result };
  });


export const saveDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      source_url: z.string().url(),
      platform: z.string(),
      status: z.string(),
      download_url: z.string().optional(),
      title: z.string().optional(),
      format: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("downloads").insert({
      user_id: userId,
      source_url: data.source_url,
      platform: data.platform,
      status: data.status,
      download_url: data.download_url,
      title: data.title,
      format: data.format,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });


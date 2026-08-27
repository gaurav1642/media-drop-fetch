// Server-only helpers for signing media URLs that our streaming proxy will fetch.
// Public Cobalt tunnels often hand back plain `http://<ip>:9000/tunnel?...` URLs.
// Browsers block those as mixed content on an https site, so downloads silently
// fail. We re-serve them through a same-origin https route instead.

const encoder = new TextEncoder();

function secret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    "mediadrop-dev-proxy-secret"
  );
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function isSafeUpstream(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  // Block loopback / link-local / private ranges (SSRF guard)
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  if (host === "::1" || host.startsWith("fe80") || host.startsWith("fc") || host.startsWith("fd")) {
    return false;
  }
  return true;
}

/** Build a same-origin, signed, short-lived proxy path for an upstream media URL. */
export async function signMediaUrl(upstream: string, filename?: string): Promise<string> {
  const exp = Date.now() + 60 * 60 * 1000; // 1 hour
  const payload = `${upstream}|${exp}`;
  const sig = await hmac(payload);
  const params = new URLSearchParams({ u: upstream, exp: String(exp), sig });
  if (filename) params.set("f", filename);
  return `/api/public/stream?${params.toString()}`;
}

export async function verifyMediaUrl(
  upstream: string,
  exp: string,
  sig: string,
): Promise<boolean> {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  if (!isSafeUpstream(upstream)) return false;
  const expected = await hmac(`${upstream}|${expNum}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

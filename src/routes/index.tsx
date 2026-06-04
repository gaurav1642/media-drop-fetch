import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchMedia } from "@/lib/cobalt.functions";
import {
  PLAN_LIMITS,
  type Plan,
  audioAllowed,
  bumpAnonUsage,
  clampQuality,
  getCurrentPlan,
  getTodayUsage,
  qualityAllowed,
} from "@/lib/plan";
import {
  Download,
  Sparkles,
  Music,
  Video,
  VideoOff,
  Image as ImageIcon,
  ShieldCheck,
  Zap,
  Globe,
  AlertTriangle,
  Loader2,
  ClipboardPaste,
  Copy,
  Check,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "MediaDrop — Save the media you own" },
      { name: "description", content: "Paste a public video URL and grab MP4, MP3, or the thumbnail. Built for creators who respect copyright." },
      { property: "og:title", content: "MediaDrop — Save the media you own" },
      { property: "og:description", content: "Paste a public video URL and grab MP4, MP3, or the thumbnail." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

const platforms = ["YouTube", "Instagram", "TikTok", "Facebook", "Twitter/X", "Vimeo"];

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

type Mode = "auto" | "audio" | "mute";
type Quality = "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";
type AudioFormat = "mp3" | "wav" | "opus" | "best";
type Result = { url: string; filename?: string; mode: Mode };

const ALL_QUALITIES: Array<{ value: Quality; label: string }> = [
  { value: "360", label: "360p" },
  { value: "480", label: "480p" },
  { value: "720", label: "720p HD" },
  { value: "1080", label: "1080p Full HD" },
  { value: "1440", label: "1440p 2K" },
  { value: "2160", label: "2160p 4K" },
  { value: "max", label: "Max available" },
];

const ALL_AUDIO: Array<{ value: AudioFormat; label: string }> = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "opus", label: "Opus" },
  { value: "best", label: "Best" },
];

function Home() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [quality, setQuality] = useState<Quality>("720");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [usage, setUsage] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const platform = detectPlatform(url);
  const fetchMediaFn = useServerFn(fetchMedia);

  const limits = PLAN_LIMITS[plan];
  const remaining = limits.dailyFetches === Infinity ? Infinity : Math.max(0, limits.dailyFetches - usage);
  const overLimit = remaining === 0;

  const refreshUsage = async () => {
    const [p, u, sess] = await Promise.all([
      getCurrentPlan(),
      getTodayUsage(),
      supabase.auth.getSession(),
    ]);
    setPlan(p);
    setUsage(u);
    setSignedIn(!!sess.data.session);
    // Clamp current quality to plan if needed
    setQuality((q) => clampQuality(p, q) as Quality);
  };

  useEffect(() => {
    refreshUsage();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refreshUsage());
    return () => sub.subscription.unsubscribe();
  }, []);

  const buildFilename = (r: Result) => {
    if (r.filename) return r.filename;
    const ext = r.mode === "audio" ? audioFormat === "best" ? "opus" : audioFormat : "mp4";
    const plat = (platform ?? "media").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `mediadrop-${plat}-${Date.now()}.${ext}`;
  };

  const handleDownload = async (r: Result) => {
    setDownloading(true);
    const filename = buildFilename(r);
    try {
      const res = await fetch(r.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (err) {
      console.error("Direct download failed:", err);
      toast.error("Browser blocked the direct save — opening in a new tab so you can save manually.");
      window.open(r.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error("Clipboard is empty");
        return;
      }
      setUrl(text.trim());
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Couldn't read clipboard — paste manually");
    }
  };

  const handleCopyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success("Direct link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const saveHistory = async (status: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase.from("downloads").insert({
      user_id: data.session.user.id,
      source_url: url,
      platform,
      status,
    });
  };

  const onFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Paste a URL first");
      return;
    }
    if (!platform) {
      toast.error("URL not recognized. Try YouTube, Instagram, TikTok, Facebook, X, or Vimeo.");
      return;

    // Server requires authentication to fetch media (prevents abuse / bypass)
    if (!signedIn) {
      toast.error("Please sign in to download media.");
      return;
    }


    // Enforce plan limits
    if (overLimit) {
      toast.error(
        signedIn
          ? `Daily limit reached (${limits.dailyFetches}/day on ${plan}). Upgrade to Pro for unlimited fetches.`
          : `Daily limit reached. Create a free account or upgrade for more.`,
      );
      return;
    }
    if (!qualityAllowed(plan, quality)) {
      toast.error(`${quality === "max" ? "Max" : quality + "p"} is locked on ${plan}. Upgrade to unlock.`);
      return;
    }
    if (mode === "audio" && !audioAllowed(plan, audioFormat)) {
      toast.error(`${audioFormat.toUpperCase()} audio is locked on ${plan}. MP3 is free.`);
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const res = await fetchMediaFn({ data: { url, mode, quality, audioFormat } });
      if (!res.ok) {
        toast.error(res.error);
        await saveHistory("failed");
        return;
      }
      setResult({ url: res.url, filename: res.filename, mode });
      toast.success("Your file is ready");
      await saveHistory("ready");
      if (!signedIn) bumpAnonUsage();
      refreshUsage();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24 md:pt-32 md:pb-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-8">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            New · Faster fetch engine in beta
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tighter">
            Save the media
            <br />
            <span className="text-gradient">you actually own.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Paste a link, grab the file. Video, audio, thumbnails, and metadata from your favorite
            platforms — clean interface, zero clutter.
          </p>

          {/* URL input */}
          <form onSubmit={onFetch} className="mx-auto mt-10 max-w-2xl">
            <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-card">
              <div className="relative flex-1">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a YouTube, Instagram, TikTok, X, or Vimeo URL…"
                  className="bg-transparent border-0 h-12 text-base focus-visible:ring-0 px-4 pr-12 w-full"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={busy}
                  aria-label="Paste from clipboard"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ClipboardPaste className="h-4 w-4" />
                </button>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={busy || overLimit}
                className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow h-12 px-6"
              >
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {busy ? "Fetching…" : "Fetch media"}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex glass rounded-full p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("auto")}
                  className={`px-4 py-1.5 rounded-full transition-colors ${mode === "auto" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Video className="h-3 w-3 inline mr-1.5" />Video
                </button>
                <button
                  type="button"
                  onClick={() => setMode("audio")}
                  className={`px-4 py-1.5 rounded-full transition-colors ${mode === "audio" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Music className="h-3 w-3 inline mr-1.5" />Audio
                </button>
                <button
                  type="button"
                  onClick={() => setMode("mute")}
                  className={`px-4 py-1.5 rounded-full transition-colors ${mode === "mute" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <VideoOff className="h-3 w-3 inline mr-1.5" />Mute
                </button>
              </div>

              {mode !== "audio" ? (
                <Select value={quality} onValueChange={(v) => setQuality(v as Quality)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs glass border-0 rounded-full">
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_QUALITIES.map((q) => {
                      const locked = !qualityAllowed(plan, q.value);
                      return (
                        <SelectItem key={q.value} value={q.value} disabled={locked}>
                          <span className="flex items-center gap-2">
                            {q.label}
                            {locked && <Lock className="h-3 w-3 opacity-60" />}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={audioFormat} onValueChange={(v) => setAudioFormat(v as AudioFormat)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs glass border-0 rounded-full">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_AUDIO.map((a) => {
                      const locked = !audioAllowed(plan, a.value);
                      return (
                        <SelectItem key={a.value} value={a.value} disabled={locked}>
                          <span className="flex items-center gap-2">
                            {a.label}
                            {locked && <Lock className="h-3 w-3 opacity-60" />}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full glass text-muted-foreground capitalize">
                <Sparkles className="h-3 w-3 text-accent" />
                {plan} plan
                {limits.dailyFetches !== Infinity && (
                  <span className="ml-1">· {remaining}/{limits.dailyFetches} left today</span>
                )}
              </span>
            </div>

            {platform && !result && (
              <p className="mt-3 text-xs text-accent">Detected: {platform}</p>
            )}

            {overLimit && (
              <div className="mt-4 glass rounded-xl p-4 border-accent/30 text-sm text-muted-foreground flex items-center justify-center gap-3 flex-wrap">
                <Lock className="h-4 w-4 text-accent" />
                <span>You've hit today's free limit.</span>
                <Link to="/pricing" className="text-accent font-medium hover:underline">
                  Upgrade to Pro →
                </Link>
              </div>
            )}

            {result && (
              <div className="mt-6 glass rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Ready to download</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.filename ?? (result.mode === "audio" ? "audio file" : "video file")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-9"
                >
                  {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownload(result)}
                  disabled={downloading}
                  className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow"
                >
                  {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {downloading ? "Saving…" : "Download"}
                </Button>
              </div>
            )}
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {platforms.map((p) => (
              <span key={p} className="px-3 py-1 text-xs rounded-full glass text-muted-foreground">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 -mt-8">
        <div className="mx-auto max-w-3xl glass rounded-2xl p-5 flex gap-4 items-start border-accent/30">
          <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Use responsibly.</span> Only download content
            you own or have explicit permission to download. Respect each platform's Terms of Service
            and copyright law.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Everything in <span className="text-gradient">one paste</span>.
            </h2>
            <p className="mt-4 text-muted-foreground">
              No popups, no waiting rooms, no ads. Just the file you came for.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Video, title: "MP4 video", desc: "Up to 4K with smart fallback to the best available stream." },
              { icon: Music, title: "MP3 audio", desc: "Strip the audio track and download MP3, WAV, or Opus." },
              { icon: ImageIcon, title: "Thumbnail", desc: "Grab the cover image in original resolution." },
              { icon: Zap, title: "Fast queue", desc: "Background processing so you can paste the next link immediately." },
              { icon: ShieldCheck, title: "Private by default", desc: "Files are auto-deleted shortly after they're ready." },
              { icon: Globe, title: "6+ platforms", desc: "YouTube, Instagram, TikTok, Facebook, X, Vimeo — and growing." },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 hover:border-primary/40 transition-colors group">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand mb-4 group-hover:shadow-glow transition-shadow">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl glass rounded-3xl p-12 text-center shadow-card">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Ready to keep your <span className="text-gradient">archive clean</span>?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Create a free account to track your history, save favorite links, and unlock unlimited fetches.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/login" search={{ mode: "signup" }}>Get started — free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/pricing">See pricing →</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

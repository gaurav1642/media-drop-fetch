import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { fetchMedia } from "@/lib/cobalt.functions";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PLAN_LIMITS, type Plan, getCurrentPlan, getTodayUsage } from "@/lib/plan";
import {
  Download,
  Loader2,
  Trash2,
  LogOut,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Sparkles,
  Crown,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — MediaDrop" }] }),
});

type DownloadRow = {
  id: string;
  source_url: string;
  platform: string | null;
  title: string | null;
  status: string;
  created_at: string;
};

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

function Dashboard() {
  const navigate = useNavigate();
  const fetchMediaFn = useServerFn(fetchMedia);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [rows, setRows] = useState<DownloadRow[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setEmail(data.session.user.email ?? "");
      await load();
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from("downloads")
      .select("id,source_url,platform,title,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setRows(data ?? []);
  };

  const addLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const platform = detectPlatform(url);
    if (!platform) {
      toast.error("Unrecognized platform");
      return;
    }
    setBusy(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("downloads").insert({
      user_id: user.user.id,
      source_url: url,
      platform,
      status: "queued",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUrl("");
    toast.success("Saved to history");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("downloads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Removed");
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear your entire download history? This cannot be undone.")) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("downloads").delete().eq("user_id", user.user.id);
    if (error) toast.error(error.message);
    else {
      setRows([]);
      toast.success("History cleared");
    }
  };

  const redownload = async (row: DownloadRow) => {
    setRedownloadingId(row.id);
    try {
      const res = await fetchMediaFn({
        data: { url: row.source_url, mode: "auto", quality: "1080", audioFormat: "mp3" },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blobRes = await fetch(res.url);
      if (!blobRes.ok) throw new Error(`HTTP ${blobRes.status}`);
      const blob = await blobRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      const plat = (row.platform ?? "media").toLowerCase().replace(/[^a-z0-9]/g, "");
      const filename = res.filename ?? `mediadrop-${plat}-${Date.now()}.mp4`;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't fetch this link. Try again.");
    } finally {
      setRedownloadingId(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const ready = rows.filter((r) => r.status === "ready").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const queued = rows.filter((r) => r.status === "queued").length;
    const byPlatform = rows.reduce<Record<string, number>>((acc, r) => {
      const k = r.platform ?? "Unknown";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const topPlatforms = Object.entries(byPlatform)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    return { total, ready, failed, queued, topPlatforms };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.source_url.toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        (r.platform ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (!ready) {
    return (
      <SiteLayout>
        <div className="grid place-items-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight">Your dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Signed in as {email}</p>
            </div>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard icon={BarChart3} label="Total" value={stats.total} />
            <StatCard icon={CheckCircle2} label="Ready" value={stats.ready} tone="success" />
            <StatCard icon={Clock} label="Queued" value={stats.queued} tone="muted" />
            <StatCard icon={XCircle} label="Failed" value={stats.failed} tone="danger" />
          </div>

          {stats.topPlatforms.length > 0 && (
            <div className="glass rounded-2xl p-5 mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Top platforms
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.topPlatforms.map(([name, count]) => (
                  <span
                    key={name}
                    className="px-3 py-1.5 text-xs rounded-full bg-muted/40 text-foreground"
                  >
                    {name} · <span className="text-muted-foreground">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={addLink} className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 mb-4 shadow-card">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a URL to save it to your history…"
              className="flex-1 bg-transparent border-0 h-11 focus-visible:ring-0 px-4"
            />
            <Button type="submit" disabled={busy} className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow h-11">
              <Download className="h-4 w-4 mr-2" /> Add to history
            </Button>
          </form>

          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-display text-xl font-semibold">History</h2>
            <div className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[280px]">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search history…"
                  className="pl-9 h-9 glass border-0"
                />
              </div>
              {rows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground hover:text-destructive h-9">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
              {rows.length === 0 ? "Nothing here yet. Paste a link above to get started." : "No matches for that search."}
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((r) => (
                <li key={r.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand">
                    <Download className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title || r.source_url}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-muted/60">{r.platform ?? "Unknown"}</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => redownload(r)}
                    disabled={redownloadingId === r.id}
                    className="text-muted-foreground hover:text-foreground p-2 disabled:opacity-50"
                    aria-label="Re-download"
                    title="Re-download"
                  >
                    {redownloadingId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <a href={r.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground p-2" title="Open source">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive p-2" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-accent"
      : tone === "danger"
      ? "text-destructive"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className={`font-display text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: "text-accent",
    failed: "text-destructive",
    queued: "text-muted-foreground",
  };
  return <span className={map[status] ?? "text-muted-foreground"}>{status}</span>;
}

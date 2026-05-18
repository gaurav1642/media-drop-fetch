import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { fetchMedia, saveDownloadRecord } from "@/lib/downloads.functions";
import {
  Download,
  Loader2,
  Trash2,
  LogOut,
  ExternalLink,
  FileAudio,
  FileVideo,
  CheckCircle2,
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
  download_url: string | null;
  format: string | null;
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
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [rows, setRows] = useState<DownloadRow[]>([]);
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"auto" | "audio">("auto");
  const [busy, setBusy] = useState(false);

  const fetchMediaFn = useServerFn(fetchMedia);
  const saveRecordFn = useServerFn(saveDownloadRecord);

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
      .select("id,source_url,platform,title,status,download_url,format,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
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

    try {
      const res = await fetchMediaFn({ data: { url, format } });
      const downloadUrl = res.result.url || res.result.picker?.[0]?.url;
      const status =
        res.result.status === "tunnel" || res.result.status === "redirect" || res.result.status === "picker"
          ? "ready"
          : "error";

      await saveRecordFn({
        data: {
          source_url: url,
          platform,
          status,
          download_url: downloadUrl,
          title: res.result.filename || res.result.picker?.[0]?.type || undefined,
          format,
        },
      });

      setUrl("");
      toast.success(status === "ready" ? "Download ready" : "Processed with issues");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("downloads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Removed");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

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

          <form onSubmit={addLink} className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 mb-8 shadow-card">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a URL to fetch media…"
              className="flex-1 bg-transparent border-0 h-11 focus-visible:ring-0 px-4"
            />
            <div className="flex gap-2">
              <div className="inline-flex gap-1 rounded-lg border border-border/40 p-1 glass self-center">
                <button
                  type="button"
                  onClick={() => setFormat("auto")}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    format === "auto"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileVideo className="h-3.5 w-3.5 inline mr-1" /> Video
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("audio")}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    format === "audio"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileAudio className="h-3.5 w-3.5 inline mr-1" /> Audio
                </button>
              </div>
              <Button type="submit" disabled={busy} className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow h-11">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Fetch
              </Button>
            </div>
          </form>

          <h2 className="font-display text-xl font-semibold mb-4">History</h2>
          {rows.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
              Nothing here yet. Paste a link above to get started.
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand">
                    {r.status === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Download className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title || r.source_url}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-muted/60">{r.platform ?? "Unknown"}</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <span className={r.status === "ready" ? "text-emerald-400" : "text-accent"}>{r.status}</span>
                      {r.format === "audio" && <span className="px-1.5 py-0.5 rounded bg-muted/60">MP3</span>}
                    </div>
                  </div>
                  {r.download_url ? (
                    <a
                      href={r.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow px-3 py-1.5 text-xs font-medium"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  ) : (
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground p-2">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
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


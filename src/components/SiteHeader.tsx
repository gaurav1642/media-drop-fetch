import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Menu, X } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") return;
      if (mounted) setAuthed(!!s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand shadow-glow transition-transform group-hover:scale-110">
            <Download className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">MediaDrop</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeProps={{ className: "text-foreground bg-muted/40" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 min-h-10">
          {authed === null ? (
            <div className="h-10 w-40" aria-hidden />
          ) : authed ? (
            <Button asChild variant="default" className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to="/login" search={{ mode: "signup" }}>Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/40 px-6 py-4 flex flex-col gap-2 glass">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="py-2 text-sm" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <Link to={authed ? "/dashboard" : "/login"} className="py-2 text-sm font-medium text-gradient" onClick={() => setOpen(false)}>
            {authed ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      )}
    </header>
  );
}

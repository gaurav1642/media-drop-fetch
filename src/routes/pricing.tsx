import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({
    meta: [
      { title: "Pricing — MediaDrop" },
      { name: "description", content: "Free for casual saves. Premium for creators and power users." },
      { property: "og:title", content: "Pricing — MediaDrop" },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
});

const tiers = [
  {
    name: "Free",
    price: "$0",
    desc: "For casual saves.",
    features: ["10 fetches / day", "Up to 720p", "MP3 audio", "Basic history"],
    cta: "Get started",
    href: "/login",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$6",
    suffix: "/mo",
    desc: "For creators who archive a lot.",
    features: ["Unlimited fetches", "Up to 1080p", "Batch downloads", "Favorites & playlists", "Priority queue"],
    cta: "Start Pro",
    href: "/login",
    highlight: true,
  },
  {
    name: "Team",
    price: "$24",
    suffix: "/mo",
    desc: "Shared archive for small teams.",
    features: ["Everything in Pro", "5 seats", "Shared history", "Admin tools"],
    cta: "Contact sales",
    href: "/contact",
    highlight: false,
  },
];

function Pricing() {
  return (
    <SiteLayout>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
              Simple <span className="text-gradient">pricing</span>.
            </h1>
            <p className="mt-4 text-muted-foreground">Cancel any time. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`glass rounded-3xl p-8 flex flex-col ${t.highlight ? "border-primary/50 shadow-glow" : ""}`}
              >
                {t.highlight && (
                  <div className="self-start mb-4 px-3 py-1 rounded-full text-xs font-medium bg-gradient-brand text-primary-foreground">
                    Most popular
                  </div>
                )}
                <h3 className="font-display text-2xl font-bold">{t.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">{t.price}</span>
                  {t.suffix && <span className="text-muted-foreground">{t.suffix}</span>}
                </div>
                <ul className="mt-6 space-y-2 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-8 ${t.highlight ? "bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow" : ""}`}
                  variant={t.highlight ? "default" : "outline"}
                >
                  <Link to={t.href}>{t.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

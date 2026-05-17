import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms of Service — MediaDrop" },
      { name: "description", content: "MediaDrop terms of service." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
});

function Terms() {
  return (
    <SiteLayout>
      <section className="px-6 py-20">
        <article className="mx-auto max-w-3xl glass rounded-3xl p-10">
          <h1 className="font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">Acceptable use</h2>
          <p className="text-muted-foreground">You agree to only download content you own, created, or have explicit permission to download. You will respect the Terms of Service of every source platform and applicable copyright law.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">No DRM</h2>
          <p className="text-muted-foreground">MediaDrop does not support, enable, or attempt to circumvent any digital rights management (DRM) protection.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">DMCA & copyright</h2>
          <p className="text-muted-foreground">If you believe content fetched through MediaDrop infringes your copyright, contact us via the Contact page with the URL and proof of ownership. We respond within 7 days.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">Account termination</h2>
          <p className="text-muted-foreground">We may suspend or terminate accounts that violate these terms or engage in abuse.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">No warranty</h2>
          <p className="text-muted-foreground">The service is provided "as is" without warranties of any kind.</p>
        </article>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy Policy — MediaDrop" },
      { name: "description", content: "How MediaDrop handles your data." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function Privacy() {
  return (
    <SiteLayout>
      <section className="px-6 py-20">
        <article className="mx-auto max-w-3xl prose prose-invert glass rounded-3xl p-10">
          <h1 className="font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">What we collect</h2>
          <p className="text-muted-foreground">Email address, profile display name, the URLs you choose to save, and basic usage analytics needed to keep the service running.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">How we use it</h2>
          <p className="text-muted-foreground">To provide the service, sync your history across devices, and improve product quality. We do not sell your data.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">File retention</h2>
          <p className="text-muted-foreground">Generated media files are auto-deleted shortly after they are ready for download. We never retain media long-term.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">Your rights</h2>
          <p className="text-muted-foreground">Delete your account at any time from the dashboard. You can also delete individual history entries on demand.</p>

          <h2 className="font-display text-xl font-semibold mt-8 mb-2">Contact</h2>
          <p className="text-muted-foreground">Reach us via the Contact page for any privacy-related question.</p>
        </article>
      </section>
    </SiteLayout>
  );
}

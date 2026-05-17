import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  component: Faq,
  head: () => ({
    meta: [
      { title: "FAQ — MediaDrop" },
      { name: "description", content: "Answers to common questions about MediaDrop." },
      { property: "og:title", content: "FAQ — MediaDrop" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
});

const items = [
  { q: "What platforms are supported?", a: "YouTube, Instagram, TikTok, Facebook, Twitter/X, and Vimeo. More on the way." },
  { q: "Is this legal?", a: "Downloading content is your responsibility. Only save media you own, created, or have explicit permission to download. Respect each platform's Terms of Service and copyright law." },
  { q: "Do you store the files?", a: "Files are processed on demand and auto-deleted shortly after they are ready. We never keep your media long-term." },
  { q: "Do I need an account?", a: "No, you can fetch without an account. Sign up if you want history, favorites, and Pro features." },
  { q: "What formats can I download?", a: "MP4 video (up to 1080p), MP3 audio, and original thumbnails." },
  { q: "Can I cancel my subscription?", a: "Yes — cancel any time from your dashboard. You keep access until the end of the billing period." },
];

function Faq() {
  return (
    <SiteLayout>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-center">
            Frequently asked.
          </h1>
          <p className="mt-4 text-center text-muted-foreground">Quick answers, no fluff.</p>

          <div className="glass rounded-3xl p-2 mt-12">
            <Accordion type="single" collapsible className="w-full">
              {items.map((it, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="px-4">
                  <AccordionTrigger className="text-left font-medium">{it.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

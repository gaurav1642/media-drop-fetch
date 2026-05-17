import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: [
      { title: "Contact — MediaDrop" },
      { name: "description", content: "Get in touch with the MediaDrop team." },
      { property: "og:title", content: "Contact — MediaDrop" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

function Contact() {
  const [sending, setSending] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Thanks — we'll reply within 24h.");
      (e.target as HTMLFormElement).reset();
    }, 700);
  };
  return (
    <SiteLayout>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <Mail className="h-10 w-10 mx-auto text-accent mb-3" />
            <h1 className="font-display text-5xl font-bold tracking-tight">Say hello.</h1>
            <p className="mt-3 text-muted-foreground">Bug reports, feature ideas, partnership requests — all welcome.</p>
          </div>
          <form onSubmit={submit} className="glass rounded-3xl p-8 space-y-5 shadow-card">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" required maxLength={80} /></div>
              <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required maxLength={120} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="msg">Message</Label><Textarea id="msg" required rows={6} maxLength={2000} /></div>
            <Button type="submit" disabled={sending} className="w-full h-11 bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow">
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, CalendarPlus, Mail } from "lucide-react";
import { useSeo } from "../lib/seo";
import { useApp, Editable } from "../lib/data";
import { ButtonLink, Card, Container, H1, Reveal } from "../components/ui";

export function SwPage() {
  useSeo({
    title: "Soins énergétiques et accompagnement à Bailleul (Estaimpuis)",
    description: "Découvrez l'accompagnement d'Anne Kételair à Bailleul (Estaimpuis) : soins énergétiques, Reiki et méditation, au cabinet, à distance ou en visio, près de Mouscron et Lille.",
  });
  const { get } = useApp();
  return (
    <Container className="py-10 sm:py-14 space-y-10">
      <div className="space-y-4 max-w-3xl">
        <Editable settingKey="sw.title" as={H1} className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--brand)]" />
        <Editable settingKey="sw.intro" as="p" multiline className="text-lg text-neutral-700 dark:text-neutral-300" />
      </div>
      <Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { to: "/soins", icon: <Sparkles className="h-5 w-5" />, k: "sw.link1" },
            { to: "/rendez-vous", icon: <CalendarPlus className="h-5 w-5" />, k: "sw.link2" },
            { to: "/contact", icon: <Mail className="h-5 w-5" />, k: "sw.link3" },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="block active:scale-[0.99] transition-transform">
              <Card className="p-6 h-full space-y-3 hover:-translate-y-0.5 hover:shadow-xl transition-all">
                <span className="h-10 w-10 grid place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">{c.icon}</span>
                <Editable settingKey={c.k} as="p" className="font-semibold text-neutral-900 dark:text-neutral-100" />
              </Card>
            </Link>
          ))}
        </div>
      </Reveal>
      <p className="rounded-xl bg-[var(--brand-accent)]/40 text-neutral-900 dark:text-neutral-100 text-sm p-4">{get("health.warning")}</p>
      <ButtonLink to="/rendez-vous" size="lg"><Editable settingKey="sw.cta" /></ButtonLink>
    </Container>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, MapPin, Leaf, Sparkles, Heart, Sun, Flower2, Navigation, ChevronDown } from "lucide-react";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { brand } from "../lib/brand";
import { Reviews, useReviews } from "../lib/engage";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, Editable, EditableImage, EditableList, useOfferings, useSessions, useQuery, fmtDate } from "../lib/data";
import { SectionBackground, Sections, imageFrameRadius } from "../lib/content";
import { DEFAULT_POSTS } from "../lib/defaults";
import { ButtonLink, Card, Container, Reveal, Blobs, Section, Skeleton, H1, Badge } from "../components/ui";
import { OfferCard, SessionCard } from "../components/Offers";
import { phoneHref } from "../components/Layout";

const ICONS = [Leaf, Sun, Heart, Sparkles, Flower2];

export function HomeModern() {
  const app = useApp();
  const { t, lang } = useI18n() as any;
  const reviews = useReviews(supabase);
  const g = app.get;
  const faq = [1, 2, 3, 4, 5, 6].map((i) => ({ q: g(`faq.${i}.q`), a: g(`faq.${i}.a`) })).filter((f) => f.q && f.a);
  const reviewLd = (() => { try { return isConfigured ? reviews.jsonLd(brand.name) : null; } catch { return null; } })();
  useSeo({
    title: "Soins énergétiques et Reiki à Bailleul (Estaimpuis) – Anne",
    description: "Anne Kételair, thérapeute énergéticienne à Bailleul (Estaimpuis) : soins énergétiques, Reiki Usui, numérologie et méditations, au cabinet, à distance ou en visio.",
    jsonLd: [
      { "@context": "https://schema.org", "@type": "LocalBusiness", name: g("biz.name"), description: g("home.hero.subtitle"), telephone: g("biz.phone"), email: g("biz.email"),
        address: { "@type": "PostalAddress", streetAddress: g("biz.address"), postalCode: g("biz.postal"), addressLocality: g("biz.city"), addressCountry: "BE" },
        areaServed: ["Estaimpuis", "Mouscron", "Tournai", "Hainaut", "Roubaix", "Tourcoing", "Lille"], founder: { "@type": "Person", name: g("biz.practitioner"), jobTitle: g("biz.titles") } },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      ...(reviewLd ? [reviewLd] : []),
    ],
  } as any);
  const offers = useOfferings();
  const sessions = useSessions();
  const posts = useQuery<any[]>(() => supabase.from("posts").select("*").eq("is_published", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(3), DEFAULT_POSTS);
  const highlight = ["consultation-soin-energetique", "numerologie-metamorphose", "reiki-usui", "meditations-hebdomadaires", "soin-energetique", "pendule-radiesthesie"];
  const shown = [...offers.data].sort((a, b) => { const ia = highlight.indexOf(a.slug), ib = highlight.indexOf(b.slug); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }).slice(0, 6);
  // The halo around the photo takes the frame chosen for it (cercle, arrondi, droit…).
  const heroFrame = imageFrameRadius(g("home.hero.image.frame"));
  const fullAddress = `${g("biz.address")}, ${g("biz.postal")} ${g("biz.city")}, ${g("biz.country")}`;
  return (
    <>
      <Sections
        k="home.sections"
        items={[
        { id: "hero", label: "Haut de page", fixed: true, node: (
          <>
      <section className="relative overflow-hidden min-h-[calc(100dvh-4rem)] flex items-center bg-gradient-to-br from-[var(--brand)]/[0.12] via-yellow-50 to-[var(--brand-accent)]/50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
        <SectionBackground k="home.hero.bg" />
        <Blobs />
        <Container className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center py-14 sm:py-20">
          <div className="space-y-6 text-center lg:text-left anim-fade">
            <Badge tone="brand" className="!px-4 !py-1.5 !text-sm"><Sparkles className="h-4 w-4" />{g("biz.practitioner")} · {g("biz.city")}</Badge>
            <Editable settingKey="home.hero.title" as={H1} className="font-script text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-[var(--brand)] dark:text-neutral-100" />
            <Editable settingKey="home.hero.subtitle" as="p" className="text-lg sm:text-xl leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-2xl mx-auto lg:mx-0" />
            <p className="font-script text-2xl text-neutral-600 dark:text-neutral-400">« {g("biz.slogan")} »</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start pt-2">
              <ButtonLink to="/rendez-vous" size="lg">{t("nav.book")}<ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink to="/soins" size="lg" variant="outline">{t("home.offers")}</ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm sm:max-w-md anim-zoom">
            <div aria-hidden className="absolute -inset-6 rounded-full bg-gradient-to-tr from-[var(--brand)]/30 via-white/40 to-[var(--brand-accent)]/70 blur-2xl dark:opacity-40" />
            <div style={heroFrame ? { borderRadius: heroFrame } : undefined} className="relative p-3 rounded-[46%_54%_52%_48%/48%_46%_54%_52%] bg-white/60 dark:bg-neutral-900/60 shadow-[0_30px_80px_-30px_rgba(90,45,125,0.5)]">
              <EditableImage settingKey="home.hero.image" alt={`${g("biz.practitioner")}, soins énergétiques à ${g("biz.city")}`} aspect={1} eager className="w-full rounded-[46%_54%_52%_48%/48%_46%_54%_52%]" />
            </div>
          </div>
        </Container>
        <a href="#bienfaits" aria-label="Défiler" className="hidden md:grid absolute bottom-6 left-1/2 -translate-x-1/2 h-11 w-11 place-items-center rounded-full bg-white/70 dark:bg-neutral-900 text-[var(--brand)] float-soft"><ChevronDown className="h-5 w-5" /></a>
      </section>
          </>
        ) },
        { id: "benefits", label: "Bienfaits", node: (
          <>
      <Section tone="white" id="bienfaits" bg="home.benefits.bg">
        <Container className="space-y-10">
          <Reveal className="text-center space-y-3 max-w-2xl mx-auto"><Editable settingKey="home.benefits.title" as="h2" className="font-script text-4xl sm:text-5xl text-[var(--brand)] dark:text-neutral-100" /></Reveal>
          <EditableList settingKey="home.benefits" render={(items) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {items.map((b, i) => { const I = ICONS[i % ICONS.length]; return (
                <Reveal key={b + i} delay={(i % 5) * 70}>
                  <div className="h-full rounded-3xl bg-gradient-to-br from-white to-[var(--brand-accent)]/25 dark:from-neutral-900 dark:to-neutral-900 border border-white dark:border-neutral-800 p-5 text-center space-y-3 shadow-[0_8px_30px_-18px_rgba(90,45,125,0.35)] transition-transform duration-300 hover:-translate-y-1">
                    <div className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]"><I className="h-5 w-5" /></div>
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{b}</p>
                  </div>
                </Reveal>); })}
            </div>
          )} />
        </Container>
      </Section>
          </>
        ) },
        { id: "energy", label: "Les soins énergétiques", node: (
          <>
      <Section tone="tint" bg="home.energy.bg">
        <Container className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal className="space-y-5">
            <Editable settingKey="home.intro.title" as="h2" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100" />
            <Editable settingKey="home.intro.body" multiline className="text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300" />
            <Link to="/qui-suis-je" className="inline-flex items-center gap-2 font-medium text-[var(--brand)] hover:gap-3 transition-all">{t("home.aboutLink")}<ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <Reveal delay={120}>
            <Card className="relative overflow-hidden p-8 sm:p-10 bg-gradient-to-br from-[var(--brand)]/10 via-white to-[var(--brand-accent)]/40 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900">
              <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[var(--brand-accent)]/60 blur-2xl" />
              <Sparkles className="relative h-8 w-8 text-[var(--brand)]" />
              <Editable settingKey="home.distance" as="p" className="relative mt-4 font-script text-3xl leading-snug text-[var(--brand)] dark:text-neutral-100" />
              <div className="relative mt-6 flex flex-wrap gap-2">{["cabinet", "distance", "visio"].map((m) => <Badge key={m} tone="green" className="!text-sm !px-3">{t("mode." + m)}</Badge>)}</div>
            </Card>
          </Reveal>
        </Container>
      </Section>
          </>
        ) },
        { id: "offers", label: "Offres", node: (
          <>
      <Section bg="home.offers.bg">
        <Container className="space-y-10">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <Editable settingKey="home.offersTitle" as="h2" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100" />
            <div className="flex flex-wrap gap-2"><ButtonLink to="/soins" size="sm" variant="secondary">{t("nav.care")}</ButtonLink><ButtonLink to="/formations" size="sm" variant="secondary">{t("nav.trainings")}</ButtonLink><ButtonLink to="/ateliers" size="sm" variant="secondary">{t("nav.workshops")}</ButtonLink></div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.loading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-80" />) : shown.map((o, i) => <Reveal key={o.id} delay={(i % 3) * 90}><OfferCard o={o} /></Reveal>)}
          </div>
        </Container>
      </Section>
          </>
        ) },
        { id: "agenda", label: "Prochaines dates", node: (
          <>
      <Section tone="white" bg="home.agenda.bg">
        <Container className="space-y-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <Editable settingKey="home.agendaTitle" as="h2" className="font-script text-4xl sm:text-5xl text-[var(--brand)] dark:text-neutral-100" />
            <Link to="/agenda" className="inline-flex items-center gap-2 font-medium text-[var(--brand)]">{t("home.allDates")}<ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="grid gap-4">{sessions.loading ? <Skeleton className="h-32" /> : sessions.data.slice(0, 3).map((s, i) => <Reveal key={s.id} delay={i * 80}><SessionCard s={s} /></Reveal>)}</div>
        </Container>
      </Section>
          </>
        ) },
        { id: "reviews", label: "Avis", node: (isConfigured && (
        <Section tone="tint" bg="home.reviews.bg">
          <Container className="space-y-8">
            <Reveal><Editable settingKey="home.reviewsTitle" as="h2" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 text-center" /></Reveal>
            <Reveal><Reviews supabase={supabase} title="" /></Reveal>
          </Container>
        </Section>
      )) || null },
        { id: "blog", label: "Blog", node: (
          <>
      <Section bg="home.blog.bg">
        <Container className="space-y-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <Editable settingKey="home.postsTitle" as="h2" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100" />
            <Link to="/blog" className="inline-flex items-center gap-2 font-medium text-[var(--brand)]">{t("nav.blog")}<ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.data.slice(0, 3).map((p: any, i: number) => (
              <Reveal key={p.id} delay={i * 90}>
                <Link to={`/blog/${p.slug}`} className="group block h-full">
                  <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                    {p.cover_url && <img src={p.cover_url} alt={p.title} loading="lazy" width={600} height={400} className="w-full aspect-[3/2] object-cover" />}
                    <div className="p-6 space-y-2">
                      {p.published_at && <p className="text-sm text-neutral-500 dark:text-neutral-400">{fmtDate(p.published_at, lang, { day: "numeric", month: "long", year: "numeric" })}</p>}
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-[var(--brand)] transition-colors">{p.title}</h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">{p.excerpt}</p>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
          </>
        ) },
        { id: "zone", label: "Zone et accès", node: (
          <>
      <Section tone="white" bg="home.zone.bg">
        <Container className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <Reveal className="space-y-4">
            <Editable settingKey="home.zoneTitle" as="h2" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100" />
            <Editable settingKey="home.zone" as="p" className="text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300" />
          </Reveal>
          <Reveal delay={100}>
            <Card className="p-7 space-y-4">
              <p className="flex items-start gap-3 text-neutral-800 dark:text-neutral-200"><MapPin className="h-5 w-5 mt-0.5 shrink-0 text-[var(--brand)]" /><span className="min-w-0">{fullAddress}</span></p>
              <p className="flex items-center gap-3 text-neutral-800 dark:text-neutral-200"><Phone className="h-5 w-5 shrink-0 text-[var(--brand)]" /><a href={phoneHref(g("biz.phone"))} className="hover:text-[var(--brand)]">{g("biz.phone")}</a></p>
              <div className="flex flex-wrap gap-2 pt-1">
                <ButtonLink to={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer" variant="outline"><Navigation className="h-4 w-4" />{t("home.route")}</ButtonLink>
                <ButtonLink to={phoneHref(g("biz.phone"))} variant="ghost"><Phone className="h-4 w-4" />{t("nav.call")}</ButtonLink>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>
          </>
        ) },
        { id: "faq", label: "Questions fréquentes", node: (
          <>
      <Section tone="tint" bg="home.faq.bg">
        <Container className="max-w-3xl space-y-8">
          <Reveal><Editable settingKey="home.faqTitle" as="h2" className="font-script text-4xl sm:text-5xl text-center text-[var(--brand)] dark:text-neutral-100" /></Reveal>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i, n) => (
              <Reveal key={i} delay={n * 50}>
                <details className="group rounded-3xl bg-white/90 dark:bg-neutral-900 border border-white dark:border-neutral-800 shadow-[0_8px_30px_-20px_rgba(90,45,125,0.35)] px-6 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 min-h-14 font-medium text-neutral-900 dark:text-neutral-100">
                    <Editable settingKey={`faq.${i}.q`} as="h3" className="min-w-0" />
                    <ChevronDown className="h-5 w-5 shrink-0 text-[var(--brand)] transition-transform group-open:rotate-180" />
                  </summary>
                  <Editable settingKey={`faq.${i}.a`} as="p" className="pb-5 text-neutral-700 dark:text-neutral-300 leading-relaxed" />
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
          </>
        ) },
        { id: "cta", label: "Appel final", node: (
          <>
      <section className="relative py-16 sm:py-24">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[var(--brand)] to-[var(--brand)]/80 px-6 py-14 sm:px-14 text-center text-white shadow-[0_30px_80px_-30px_var(--brand)]">
              <div aria-hidden className="blob absolute -top-20 -left-10 h-64 w-64 rounded-full bg-[var(--brand-accent)]/40 blur-3xl" />
              <div aria-hidden className="blob absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-yellow-200/30 blur-3xl" style={{ animationDelay: "-8s" }} />
              <div className="relative space-y-5 max-w-2xl mx-auto">
                <Editable settingKey="home.cta.title" as="h2" className="font-script text-4xl sm:text-5xl leading-tight" />
                <Editable settingKey="home.cta.body" as="p" className="text-lg text-white/90" />
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center pt-2">
                  <ButtonLink to="/rendez-vous" size="lg" variant="outline" className="!bg-white !text-[var(--brand)] !border-white">{t("nav.book")}</ButtonLink>
                  <ButtonLink to={phoneHref(g("biz.phone"))} size="lg" variant="ghost" className="!text-white hover:!bg-white/15"><Phone className="h-4 w-4" />{t("nav.call")}</ButtonLink>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
          </>
        ) },
        ]}
      />
    </>
  );
}

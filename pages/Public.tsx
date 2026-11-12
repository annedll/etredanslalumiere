import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Sparkles, Heart, ArrowRight, CalendarPlus, Sun, Leaf, Download, BookOpen, Quote } from "lucide-react";
import { z } from "zod";
import { useSeo } from "../lib/seo";
import { brand } from "../lib/brand";
import { useI18n } from "../lib/i18n";
import { Reviews, useReviews } from "../lib/engage";
import { notify } from "../lib/notify";
import { startCheckout } from "../lib/payments";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, Editable, EditableImage, EditableList, Paragraphs, useOfferings, useSessions, useQuery, money, fmtDate, offerPath, isDemoId } from "../lib/data";
import { DEFAULT_POSTS, DEFAULT_EBOOKS } from "../lib/defaults";
import { Button, ButtonLink, Card, Badge, Container, EmptyState, Field, Input, Textarea, Checkbox, Skeleton, Tabs, cn, H1 } from "../components/ui";
import { OfferCard, SessionCard, ShareButtons, ModeBadges, PayTerms, OfferWaitlist, HealthNote } from "../components/Offers";
import { phoneHref } from "../components/Layout";

const h1 = "font-script text-4xl sm:text-5xl text-[var(--brand)] leading-tight";
const h2 = "text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100";
const lead = "text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl";

// Cache mémoire : les données déjà chargées s'affichent tout de suite, puis sont rafraîchies.
const LIST_CACHE = new Map<string, any[]>();
const INFLIGHT = new Map<string, Promise<any[] | null>>();

// Lit uniquement la base. Repli sur les valeurs par défaut seulement si Supabase n'est pas configuré ou si la requête échoue.
function useDbList(key: string, fetcher: () => PromiseLike<any>, fallback: any[]) {
  const cached = LIST_CACHE.get(key);
  const [state, setState] = useState<{ data: any[]; loading: boolean }>(() =>
    !isConfigured ? { data: fallback, loading: false } : cached ? { data: cached, loading: false } : { data: [], loading: true });
  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    let p = INFLIGHT.get(key);
    if (!p) {
      const timer = new Promise<any>((res) => setTimeout(() => res({ error: true }), 8000));
      p = Promise.race([Promise.resolve(fetcher()), timer])
        .then((r: any) => (r?.error || !r?.data ? null : r.data))
        .catch(() => null)
        .finally(() => INFLIGHT.delete(key));
      INFLIGHT.set(key, p);
    }
    p.then((data) => {
      if (data) LIST_CACHE.set(key, data);
      if (alive) setState({ data: data || LIST_CACHE.get(key) || fallback, loading: false });
    });
    return () => { alive = false; };
  }, [key]);
  return state;
}

function Header({ titleKey, introKey }: { titleKey: string; introKey: string }) {
  return <div className="py-10 sm:py-14 space-y-3"><Editable settingKey={titleKey} as={H1} className={h1} /><Editable settingKey={introKey} as="p" className={lead} /></div>;
}
function Grid({ items }: { items: any[] }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((o) => <OfferCard key={o.id} o={o} />)}</div>;
}
function Loading() { return <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>; }

export function HomePage() {
  const app = useApp();
  const { t, lang } = useI18n() as any;
  const offers = useOfferings();
  const sessions = useSessions();
  const reviews = isConfigured ? useReviews(supabase) : null;
  const faq = [1, 2, 3, 4, 5, 6].map((i) => ({ q: app.get(`faq.${i}.q`), a: app.get(`faq.${i}.a`) }));
  const lb: any = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: app.get("biz.name") || brand.name, description: app.get("home.hero.subtitle"), telephone: app.get("biz.phone"), email: app.get("biz.email"),
    address: { "@type": "PostalAddress", streetAddress: app.get("biz.address"), postalCode: app.get("biz.postal"), addressLocality: "Bailleul (Estaimpuis)", addressCountry: "BE" },
    areaServed: ["Estaimpuis", "Mouscron", "Tournai", "Hainaut", "Lille", "Roubaix", "Tourcoing"],
    makesOffer: offers.data.flatMap((o) => o.prices.map((p) => ({ "@type": "Offer", name: `${o.title} – ${p.label}`, price: (p.amount_cents / 100).toFixed(2), priceCurrency: "EUR" }))),
  };
  const ld = [lb, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }];
  const rj = reviews?.jsonLd?.(app.get("biz.name") || brand.name); if (rj) ld.push(rj);
  useSeo({ title: "Soins énergétiques, Reiki et méditation à Bailleul (Estaimpuis)", description: "Thérapeute énergéticienne à Bailleul près de Mouscron et Lille : consultation avec soin 80 €, Reiki Usui, numérologie, ateliers et méditations, au cabinet ou en visio.", jsonLd: ld } as any);
  const featured = offers.data.filter((o) => ["consultation-soin-energetique", "reiki-usui", "numerologie-metamorphose", "meditations-hebdomadaires", "soin-energetique", "pendule-radiesthesie"].includes(o.slug));
  const addr = `${app.get("biz.address")}, ${app.get("biz.postal")} ${app.get("biz.city")}`;
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,#fdf7c3_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,#c9ecdf_0%,transparent_55%),radial-gradient(ellipse_at_top_right,#e4f2c4_0%,transparent_50%)] dark:opacity-10" />
        <Container className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-12 sm:py-20">
          <div className="space-y-6 anim-fade">
            <p className="inline-flex items-center gap-2 text-sm text-[var(--brand)] font-medium"><Sun className="h-4 w-4" />{app.get("biz.slogan")}</p>
            <Editable settingKey="home.hero.title" as={H1} className="font-script text-5xl sm:text-6xl text-[var(--brand)] leading-[1.1]" />
            <Editable settingKey="home.hero.subtitle" as="p" className={lead} />
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/rendez-vous" size="lg"><CalendarPlus className="h-5 w-5" />{t("nav.book")}</ButtonLink>
              <ButtonLink to={phoneHref(app.get("biz.phone"))} size="lg" variant="outline"><Phone className="h-5 w-5" />{t("nav.call")}</ButtonLink>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{app.get("biz.practitioner")} · {app.get("biz.titles")}</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-[var(--brand-accent)]/40 blur-3xl -z-10" />
            <EditableImage settingKey="home.hero.image" alt="Moment de méditation et de soin énergétique au cabinet de Bailleul" aspect={1} eager className="rounded-[2rem] mx-auto" />
          </div>
        </Container>
      </section>

      <Container className="space-y-20">
        <section className="space-y-6">
          <Editable settingKey="home.benefits.title" as="h2" className={h2} />
          <EditableList settingKey="home.benefits" render={(items) => (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {items.map((b) => <li key={b} className="rounded-2xl bg-[var(--brand-accent)]/35 text-neutral-900 dark:text-neutral-100 px-4 py-3 text-[15px] flex items-center gap-2"><Leaf className="h-4 w-4 text-[var(--brand)] shrink-0" /><span className="min-w-0">{b}</span></li>)}
            </ul>
          )} />
          <p className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300"><Sparkles className="h-5 w-5 text-[var(--brand)] shrink-0 mt-0.5" /><Editable settingKey="home.distance" /></p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-3 space-y-4">
            <Editable settingKey="home.intro.title" as="h2" className={h2} />
            <Editable settingKey="home.intro.body" multiline className="text-neutral-700 dark:text-neutral-300 leading-relaxed" />
            <Link to="/qui-suis-je" className="inline-flex items-center gap-1 text-[var(--brand)] font-medium">{t("home.aboutLink")}<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-2"><HealthNote /></div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><Editable settingKey="home.offersTitle" as="h2" className={h2} /><Link to="/soins" className="text-[var(--brand)] font-medium inline-flex items-center gap-1">{t("home.offers")}<ArrowRight className="h-4 w-4" /></Link></div>
          {offers.loading ? <Loading /> : <Grid items={featured.length ? featured : offers.data.slice(0, 6)} />}
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><Editable settingKey="home.agendaTitle" as="h2" className={h2} /><Link to="/agenda" className="text-[var(--brand)] font-medium inline-flex items-center gap-1">{t("home.allDates")}<ArrowRight className="h-4 w-4" /></Link></div>
          {sessions.loading ? <Skeleton className="h-32" /> : <div className="grid gap-4">{sessions.data.slice(0, 3).map((s) => <SessionCard key={s.id} s={s} />)}</div>}
        </section>

        {isConfigured && <section className="space-y-6"><Editable settingKey="home.reviewsTitle" as="h2" className={h2} /><Reviews supabase={supabase} title="" /></section>}

        <section className="space-y-6">
          <Editable settingKey="home.faqTitle" as="h2" className={h2} />
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <details key={i} className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                <summary className="cursor-pointer list-none font-semibold text-neutral-900 dark:text-neutral-100 flex justify-between gap-4"><Editable settingKey={`faq.${i}.q`} as="h3" /><span className="text-[var(--brand)] group-open:rotate-45 transition-transform">+</span></summary>
                <Editable settingKey={`faq.${i}.a`} as="p" className="mt-3 text-neutral-700 dark:text-neutral-300 leading-relaxed" />
              </details>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Editable settingKey="home.zoneTitle" as="h2" className={h2} />
            <Editable settingKey="home.zone" as="p" className="text-neutral-700 dark:text-neutral-300 leading-relaxed" />
            <ButtonLink to={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr + ", Belgique")} variant="outline" target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" />{t("home.route")}</ButtonLink>
          </div>
          <Card className="p-6 space-y-2 text-neutral-800 dark:text-neutral-200">
            <p className="font-semibold">{app.get("biz.name") || brand.name}</p>
            <p>{addr}, {app.get("biz.country")}</p>
            <p><a className="text-[var(--brand)]" href={phoneHref(app.get("biz.phone"))}>{app.get("biz.phone")}</a></p>
            <p className="break-words"><a className="text-[var(--brand)]" href={"mailto:" + app.get("biz.email")}>{app.get("biz.email")}</a></p>
          </Card>
        </section>

        <section className="rounded-[2rem] bg-[var(--brand)]/10 p-8 sm:p-12 text-center space-y-4">
          <Editable settingKey="home.cta.title" as="h2" className="font-script text-4xl text-[var(--brand)]" />
          <Editable settingKey="home.cta.body" as="p" className="text-neutral-700 dark:text-neutral-300 max-w-2xl mx-auto" />
          <div className="flex flex-wrap justify-center gap-3"><ButtonLink to="/rendez-vous" size="lg">{t("nav.book")}</ButtonLink><ButtonLink to="/agenda" size="lg" variant="outline">{t("nav.agenda")}</ButtonLink></div>
        </section>
      </Container>
    </>
  );
}

export function AboutPage() {
  useSeo({ title: "Qui suis-je ? Anne Kételair, thérapeute énergéticienne", description: "Anne Kételair, thérapeute énergéticienne, coach bien-être et enseignante Reiki à Bailleul (Estaimpuis) : son approche, ses outils et les systèmes qu'elle transmet." });
  const { t } = useI18n();
  return (
    <Container className="py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
      <div className="lg:col-span-2"><EditableImage settingKey="about.image" alt="Portrait d'Anne Kételair" aspect={1} eager className="rounded-full mx-auto" /></div>
      <div className="lg:col-span-3 space-y-5">
        <Editable settingKey="about.title" as={H1} className={h1} />
        <Editable settingKey="about.body" multiline className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-[17px]" />
        <div className="flex flex-wrap gap-3"><ButtonLink to="/rendez-vous">{t("nav.book")}</ButtonLink><ButtonLink to="/formations" variant="outline">{t("nav.trainings")}</ButtonLink></div>
      </div>
    </Container>
  );
}

function OffersByKind({ kinds, titleKey, introKey, extra }: { kinds: string[]; titleKey: string; introKey: string; extra?: React.ReactNode }) {
  const q = useOfferings();
  return <Container><Header titleKey={titleKey} introKey={introKey} />{extra}{q.loading ? <Loading /> : <Grid items={q.data.filter((o) => kinds.includes(o.kind))} />}</Container>;
}
export function SoinsPage() {
  useSeo({ title: "Soins énergétiques et numérologie à Bailleul (Estaimpuis)", description: "Consultation avec soin énergétique 80 €, soin seul 60 €, accompagnement, généalogie et numérologie de la Métamorphose, au cabinet de Bailleul, à distance ou en visio." });
  return <OffersByKind kinds={["soin", "numerologie"]} titleKey="soins.title" introKey="soins.intro" extra={<div className="mb-8"><HealthNote /></div>} />;
}
export function FormationsPage() {
  useSeo({ title: "Formations Reiki Usui, Lahochi et Isis près de Mouscron", description: "Initiations au Reiki Usui en 4 degrés (dès 195 €), Lahochi / 13e Octave, Triangle Doré d'Isis et Shamballa à Bailleul, avec syllabus et certificat remis." });
  return <OffersByKind kinds={["formation"]} titleKey="formations.title" introKey="formations.intro" extra={<p className="mb-8 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)]/40 px-4 py-3 text-neutral-900 dark:text-neutral-100"><BookOpen className="h-5 w-5 text-[var(--brand)]" /><Editable settingKey="training.certificate" /></p>} />;
}
export function AteliersPage() {
  useSeo({ title: "Ateliers pendule, art-thérapie et méditation à Bailleul", description: "Ateliers de pendule et radiesthésie, journée enfant intérieur, art-thérapie et méditations guidées hebdomadaires à 11 € près d'Estaimpuis, Mouscron et Lille." });
  return <OffersByKind kinds={["atelier", "meditation"]} titleKey="ateliers.title" introKey="ateliers.intro" />;
}

export function OfferDetailPage() {
  useSeo({ title: "Soin, formation ou atelier à Bailleul (Estaimpuis)", description: "Détail, durée, tarifs, modalités et prochaines dates de ce soin énergétique, de cette initiation ou de cet atelier proposé à Bailleul, à distance ou en visio." });
  const { slug } = useParams();
  const { t, lang } = useI18n() as any;
  const app = useApp();
  const nav = useNavigate();
  const offers = useOfferings();
  const sessions = useSessions();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const o = offers.data.find((x) => x.slug === slug);
  if (offers.loading) return <Container className="py-14"><Skeleton className="h-96" /></Container>;
  if (!o) return <Container className="py-14"><EmptyState title={t("reg.notFound")} action={<ButtonLink to="/soins">{t("common.back")}</ButtonLink>} /></Container>;
  const dated = ["formation", "atelier", "meditation"].includes(o.kind);
  const next = sessions.data.filter((s) => s.offering_id === o.id || s.offering?.slug === o.slug);
  const payPack = async (p: any) => {
    setErr("");
    if (!app.session) { nav("/compte?next=" + encodeURIComponent(location.pathname)); return; }
    setBusy(p.id);
    try {
      const { data, error } = await supabase.rpc("create_order", { p_item_type: "pack", p_ebook_id: null, p_price_id: p.id, p_waiver: false });
      if (error) throw error;
      await startCheckout({ amount: data.amount_cents / 100, description: `${o.title} – ${p.label}`, reference: "ord:" + data.id, accessToken: app.session?.access_token });
    } catch (e: any) { setErr(e.message || t("common.error")); }
    setBusy("");
  };
  const ld = { "@context": "https://schema.org", "@type": dated ? "Course" : "Service", name: o.title, description: o.summary, provider: { "@type": "LocalBusiness", name: app.get("biz.name") || brand.name },
    offers: o.prices.map((p) => ({ "@type": "Offer", name: p.label, price: (p.amount_cents / 100).toFixed(2), priceCurrency: "EUR" })) };
  return (
    <Container className="py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-3 gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="lg:col-span-2 space-y-6">
        <Link to={offerPath(o).split("/").slice(0, 2).join("/")} className="text-sm text-[var(--brand)]">← {t("common.back")}</Link>
        <Badge tone="brand">{t("kind." + o.kind)}</Badge>
        <H1 className={h1}>{o.title}</H1>
        <p className={lead}>{o.summary}</p>
        {o.image_url && <img src={o.image_url} alt={o.title} width={1200} height={800} className="w-full rounded-[2rem] aspect-[3/2] object-cover" />}
        <Paragraphs text={o.body} className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-[17px]" />
        {o.kind === "formation" && <Editable settingKey="training.certificate" as="p" className="rounded-xl bg-[var(--brand-accent)]/40 px-4 py-3 text-neutral-900 dark:text-neutral-100" />}
        {(o.kind === "soin" || o.kind === "numerologie") && <><p className="text-neutral-700 dark:text-neutral-300">{app.get("home.distance")}</p><HealthNote /></>}
        {dated && (
          <section className="space-y-4">
            <h2 className={h2}>{t("offer.nextDates")}</h2>
            {next.length ? next.map((s) => <SessionCard key={s.id} s={s} />) : <Card className="p-5 space-y-3"><p className="text-neutral-700 dark:text-neutral-300">{t("offer.noDates")}</p><OfferWaitlist offeringId={o.id} /></Card>}
          </section>
        )}
        <ShareButtons title={o.title} />
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <Card className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("offer.duration")} : <strong className="text-neutral-900 dark:text-neutral-100">{o.duration_label}</strong></p>
          <ModeBadges modes={o.modes} />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{t("offer.prices")}</h2>
          {o.prices.length ? <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">{o.prices.map((p) => (
            <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-neutral-700 dark:text-neutral-300 min-w-0">{p.label}</span>
              <span className="font-semibold text-[var(--brand)]">{money(p.amount_cents, lang)}</span>
              {o.kind !== "meditation" && !dated && /séances|thème|mantra/i.test(p.label + o.kind) && p.amount_cents > 0 && !isDemoId(p.id) && <Button size="sm" variant="secondary" className="w-full" loading={busy === p.id} onClick={() => payPack(p)}>{t("offer.payOnline")}</Button>}
            </li>
          ))}</ul> : <p className="text-neutral-600 dark:text-neutral-400">{t("common.onRequest")}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {dated ? <ButtonLink to="/agenda" className="w-full">{t("nav.agenda")}</ButtonLink> : <ButtonLink to={`/rendez-vous?offre=${o.slug}`} className="w-full">{t("offer.book")}</ButtonLink>}
          <ButtonLink to={phoneHref(app.get("biz.phone"))} variant="outline" className="w-full"><Phone className="h-4 w-4" />{t("nav.call")}</ButtonLink>
          {!dated && <PayTerms />}
        </Card>
      </aside>
    </Container>
  );
}

export function AgendaPage() {
  useSeo({ title: "Agenda des formations Reiki, ateliers et méditations", description: "Prochaines dates des initiations Reiki, Lahochi, Isis, ateliers pendule et méditations guidées à Bailleul (Estaimpuis). Inscription en ligne, places limitées." });
  const s = useSessions();
  const { t } = useI18n();
  const ld = s.data.map((x) => ({ "@context": "https://schema.org", "@type": "Event", name: x.offering?.title, startDate: x.starts_at, endDate: x.ends_at, location: { "@type": "Place", name: x.location, address: x.location }, offers: x.price ? { "@type": "Offer", price: (x.price.amount_cents / 100).toFixed(2), priceCurrency: "EUR" } : undefined }));
  return (
    <Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Header titleKey="agenda.title" introKey="agenda.intro" />
      {s.loading ? <Skeleton className="h-40" /> : s.data.length ? <div className="grid gap-4">{s.data.map((x) => <SessionCard key={x.id} s={x} />)}</div> : <EmptyState title={t("offer.noDates")} action={<ButtonLink to="/formations">{t("nav.trainings")}</ButtonLink>} />}
    </Container>
  );
}

const usePosts = () => useDbList("posts", () => supabase.from("posts").select("*").eq("is_published", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }), DEFAULT_POSTS);

export function BlogPage() {
  useSeo({ title: "Blog : soins énergétiques, Reiki, numérologie, méditation", description: "Articles d'Anne Kételair sur les soins énergétiques, le Reiki Usui, la numérologie de la Métamorphose et la méditation, pour mieux comprendre et cheminer." });
  const { t, lang } = useI18n() as any;
  const q = usePosts();
  const [cat, setCat] = useState("all");
  const list = q.data.filter((p) => cat === "all" || p.category === cat);
  return (
    <Container>
      <Header titleKey="blog.title" introKey="blog.intro" />
      <div className="mb-6"><Tabs value={cat} onChange={setCat} tabs={["all", "soins", "numerologie", "reiki", "meditation"].map((c) => ({ id: c, label: t("cat." + c) }))} /></div>
      {q.loading ? <Loading /> : list.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{list.map((p) => (
          <Link key={p.id} to={`/blog/${p.slug}`} className="group"><Card className="overflow-hidden h-full transition-all group-hover:shadow-xl">
            {p.cover_url && <img src={p.cover_url} alt={p.title} loading="lazy" width={600} height={400} className="w-full aspect-[3/2] object-cover" />}
            <div className="p-5 space-y-2"><Badge tone="brand">{t("cat." + p.category)}</Badge><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{p.title}</h2><p className="text-sm text-neutral-600 dark:text-neutral-400">{p.excerpt}</p><p className="text-xs text-neutral-500">{fmtDate(p.published_at, lang, { day: "numeric", month: "long", year: "numeric" })}</p></div>
          </Card></Link>
        ))}</div>
      ) : <EmptyState title={t("blog.empty")} />}
    </Container>
  );
}

export function PostPage() {
  useSeo({ title: "Article du blog : soins énergétiques et bien-être", description: "Un article d'Anne Kételair, thérapeute énergéticienne à Bailleul (Estaimpuis), pour comprendre les soins énergétiques, le Reiki, la numérologie et la méditation." });
  const { slug } = useParams();
  const { t, lang } = useI18n() as any;
  const q = usePosts();
  const offers = useOfferings();
  const p = q.data.find((x) => x.slug === slug);
  if (q.loading) return <Container className="py-14"><Skeleton className="h-96" /></Container>;
  if (!p) return <Container className="py-14"><EmptyState title={t("blog.empty")} action={<ButtonLink to="/blog">{t("common.back")}</ButtonLink>} /></Container>;
  const rel = offers.data.find((o) => (p.category === "reiki" && o.slug === "reiki-usui") || (p.category === "meditation" && o.kind === "meditation") || (p.category === "numerologie" && o.kind === "numerologie") || (p.category === "soins" && o.slug === "consultation-soin-energetique"));
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.published_at, image: p.og_image_url || p.cover_url, author: { "@type": "Person", name: "Anne Kételair" } };
  return (
    <Container className="py-10 sm:py-14 max-w-3xl space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Link to="/blog" className="text-sm text-[var(--brand)]">← {t("nav.blog")}</Link>
      <Badge tone="brand">{t("cat." + p.category)}</Badge>
      <H1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{p.title}</H1>
      <p className="text-sm text-neutral-500">{fmtDate(p.published_at, lang, { day: "numeric", month: "long", year: "numeric" })}</p>
      {p.cover_url && <img src={p.cover_url} alt={p.title} width={1200} height={800} className="w-full rounded-[2rem]" />}
      <Paragraphs text={p.body} className="text-neutral-800 dark:text-neutral-200 leading-relaxed text-[17px]" />
      <ShareButtons title={p.title} />
      {rel && <section className="space-y-3"><h2 className={h2}>{t("blog.related")}</h2><div className="max-w-sm"><OfferCard o={rel} /></div></section>}
    </Container>
  );
}

const tSchema = z.object({ author_name: z.string().trim().min(2).max(60), content: z.string().trim().min(10).max(1500) });
export function TestimonialsPage() {
  useSeo({ title: "Témoignages sur les soins et formations d'Anne Kételair", description: "Avis et retours de personnes accompagnées en soin énergétique, numérologie, Reiki ou méditation à Bailleul (Estaimpuis), publiés avec leur consentement." });
  const { t } = useI18n();
  const q = useDbList("testimonials", () => supabase.from("testimonials").select("id,author_name,content,created_at").eq("status", "approved").order("created_at", { ascending: false }), []);
  const [f, setF] = useState({ author_name: "", content: "" });
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const p = tSchema.safeParse(f); if (!p.success || !consent) { setErr(t("val.required")); return; }
    setBusy(true); setErr("");
    const { error } = isConfigured ? await supabase.from("testimonials").insert({ ...p.data, consent_publish: true, status: "pending" }) : { error: null };
    setBusy(false); if (error) setErr(t("common.error")); else setDone(true);
  };
  return (
    <Container>
      <Header titleKey="testimonials.title" introKey="testimonials.intro" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid gap-4">
          {q.loading ? <Skeleton className="h-40" /> : q.data.length ? q.data.map((x) => (
            <Card key={x.id} className="p-6 space-y-3"><Quote className="h-6 w-6 text-[var(--brand)]" /><p className="text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-line">{x.content}</p><p className="font-medium text-[var(--brand)]">{x.author_name}</p></Card>
          )) : <EmptyState icon={<Heart />} title={t("tes.empty")} />}
        </div>
        <Card className="p-6 space-y-4 self-start">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t("tes.form")}</h2>
          {done ? <p className="text-lime-800 dark:text-lime-300">{t("tes.ok")}</p> : <>
            <Field label={t("tes.name")}><Input value={f.author_name} maxLength={60} onChange={(e) => setF({ ...f, author_name: e.target.value })} /></Field>
            <Field label={t("tes.content")}><Textarea value={f.content} maxLength={1500} onChange={(e) => setF({ ...f, content: e.target.value })} /></Field>
            <Checkbox checked={consent} onChange={setConsent}>{t("tes.consent")}</Checkbox>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button className="w-full" loading={busy} onClick={send}>{t("tes.send")}</Button>
          </>}
        </Card>
      </div>
    </Container>
  );
}

const useEbooks = () => useDbList("ebooks", () => supabase.from("ebooks").select("id,slug,title,description,cover_url,price_cents,i18n").eq("is_published", true).order("title"), DEFAULT_EBOOKS);
export function EbooksPage() {
  useSeo({ title: "E-books méditation, numérologie et bien-être à télécharger", description: "Guides numériques d'Anne Kételair sur la méditation, la numérologie et les soins énergétiques, disponibles en téléchargement immédiat après un paiement sécurisé." });
  const { t, lang } = useI18n() as any;
  const q = useEbooks();
  return (
    <Container>
      <Header titleKey="ebooks.title" introKey="ebooks.intro" />
      {q.loading ? <Loading /> : q.data.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{q.data.map((e) => (
        <Link key={e.id} to={`/e-books/${e.slug}`} className="group"><Card className="overflow-hidden h-full transition-all group-hover:shadow-xl">
          {e.cover_url && <img src={e.cover_url} alt={`Couverture de l'e-book ${e.title}`} loading="lazy" width={600} height={800} className="w-full aspect-[3/4] object-cover" />}
          <div className="p-5 space-y-2"><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{e.title}</h2><p className="text-sm text-neutral-600 dark:text-neutral-400">{e.description}</p><p className="font-semibold text-[var(--brand)]">{money(e.price_cents, lang)}</p></div>
        </Card></Link>
      ))}</div> : <EmptyState icon={<BookOpen />} title={t("eb.empty")} />}
    </Container>
  );
}

export function EbookPage() {
  useSeo({ title: "E-book à télécharger : guide bien-être et spiritualité", description: "Découvrez le contenu et le prix de cet e-book, payez en toute sécurité par carte ou Bancontact et téléchargez-le immédiatement depuis votre espace client." });
  const { slug } = useParams();
  const { t, lang } = useI18n() as any;
  const app = useApp();
  const nav = useNavigate();
  const q = useEbooks();
  const [waiver, setWaiver] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const e = q.data.find((x) => x.slug === slug);
  if (q.loading) return <Container className="py-14"><Skeleton className="h-96" /></Container>;
  if (!e) return <Container className="py-14"><EmptyState title={t("eb.empty")} action={<ButtonLink to="/e-books">{t("common.back")}</ButtonLink>} /></Container>;
  const buy = async () => {
    setErr("");
    if (!waiver) { setErr(t("eb.waiverRequired")); return; }
    if (!app.session) { nav("/compte?next=" + encodeURIComponent(location.pathname)); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_order", { p_item_type: "ebook", p_ebook_id: e.id, p_price_id: null, p_waiver: true });
      if (error) throw error;
      await startCheckout({ amount: data.amount_cents / 100, description: "E-book : " + e.title, reference: "ord:" + data.id, accessToken: app.session?.access_token });
    } catch (x: any) { setErr(x.message || t("common.error")); }
    setBusy(false);
  };
  const ld = { "@context": "https://schema.org", "@type": "Product", name: e.title, description: e.description, image: e.cover_url, offers: { "@type": "Offer", price: (e.price_cents / 100).toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock" } };
  return (
    <Container className="py-10 sm:py-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      {e.cover_url && <img src={e.cover_url} alt={`Couverture de l'e-book ${e.title}`} width={600} height={800} className="w-full max-w-sm mx-auto rounded-[2rem] shadow-xl" />}
      <div className="space-y-5">
        <Link to="/e-books" className="text-sm text-[var(--brand)]">← {t("nav.ebooks")}</Link>
        <H1 className={h1}>{e.title}</H1>
        <p className={lead}>{e.description}</p>
        <p className="text-2xl font-bold text-[var(--brand)]">{money(e.price_cents, lang)}</p>
        <Checkbox checked={waiver} onChange={setWaiver}>{t("eb.waiver")}</Checkbox>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button size="lg" className="w-full sm:w-auto" loading={busy} disabled={isDemoId(e.id)} onClick={buy}><Download className="h-5 w-5" />{t("eb.buy")}</Button>
        <PayTerms />
        <ShareButtons title={e.title} />
      </div>
    </Container>
  );
}

const cSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200), phone: z.string().trim().max(30).regex(/^[+\d\s./()-]*$/), subject: z.string().trim().max(150), message: z.string().trim().min(5).max(3000) });
export function ContactPage() {
  useSeo({ title: "Contact et accès au cabinet de Bailleul (Estaimpuis)", description: "Contactez Anne Kételair au +32 495 933 704 ou par email. Cabinet Place Abbé César Renard 31, 7730 Bailleul (Estaimpuis), près de Mouscron, Tournai et Lille." });
  const { t } = useI18n();
  const app = useApp();
  const social = useQuery<any[]>(() => supabase.from("social_links").select("*").eq("is_active", true).order("sort_order"), []);
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const p = cSchema.safeParse(f);
    if (!p.success) { const e: any = {}; p.error.issues.forEach((i) => (e[i.path[0] as string] = i.path[0] === "email" ? t("val.email") : t("val.required"))); setErrs(e); return; }
    setErrs({}); setBusy(true);
    const { error } = isConfigured ? await supabase.from("contact_messages").insert(p.data) : { error: null };
    setBusy(false);
    if (error) { setErrs({ message: t("common.error") }); return; }
    setDone(true); notify("contact.new", { name: p.data.name, email: p.data.email, phone: p.data.phone, message: p.data.message }, supabase);
  };
  const up = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Container>
      <Header titleKey="contact.title" introKey="contact.intro" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 space-y-3 text-neutral-800 dark:text-neutral-200">
            <p className="font-semibold">{app.get("biz.practitioner")}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{app.get("biz.titles")}</p>
            <p className="flex gap-2"><MapPin className="h-5 w-5 text-[var(--brand)] shrink-0" />{app.get("biz.address")}, {app.get("biz.postal")} {app.get("biz.city")}, {app.get("biz.country")}</p>
            <a className="flex gap-2 text-[var(--brand)]" href={phoneHref(app.get("biz.phone"))}><Phone className="h-5 w-5" />{app.get("biz.phone")}</a>
            <a className="flex gap-2 text-[var(--brand)] break-all" href={"mailto:" + app.get("biz.email")}><Mail className="h-5 w-5 shrink-0" />{app.get("biz.email")}</a>
            {app.get("biz.hours") && <p className="whitespace-pre-line text-sm">{t("footer.hours")} : {app.get("biz.hours")}</p>}
            <div className="flex flex-wrap gap-2 pt-2">{social.data.map((s) => <ButtonLink key={s.id} to={s.url} size="sm" variant="outline" target="_blank" rel="noopener noreferrer">{s.network}</ButtonLink>)}</div>
          </Card>
          <ButtonLink to={phoneHref(app.get("biz.phone"))} size="lg" className="w-full"><Phone className="h-5 w-5" />{t("nav.call")}</ButtonLink>
        </div>
        <Card className="lg:col-span-3 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t("contact.write")}</h2>
          {done ? <p className="text-lime-800 dark:text-lime-300">{t("contact.ok")}</p> : <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("contact.name")} error={errs.name}><Input autoComplete="name" value={f.name} onChange={up("name")} /></Field>
              <Field label={t("book.email")} error={errs.email}><Input type="email" inputMode="email" autoComplete="email" value={f.email} onChange={up("email")} /></Field>
              <Field label={t("book.phone")} error={errs.phone}><Input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={up("phone")} /></Field>
              <Field label={t("contact.subject")} error={errs.subject}><Input value={f.subject} onChange={up("subject")} /></Field>
            </div>
            <Field label={t("contact.message")} hint={t("book.messageHint")} error={errs.message}><Textarea value={f.message} maxLength={3000} onChange={up("message")} /></Field>
            <Button loading={busy} onClick={send}>{t("contact.send")}</Button>
          </>}
        </Card>
      </div>
    </Container>
  );
}

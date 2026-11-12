import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Home, Sparkles, CalendarDays, CalendarPlus, User, Pencil, ChevronDown, Link as LinkIcon, MessageSquare, Newspaper, Quote, BookOpen, Mail, Star, Shield, LayoutDashboard, Settings } from "lucide-react";
import { z } from "zod";
import { brand } from "../lib/brand";
import { useI18n, LanguageSwitcher } from "../lib/i18n";
import { LEGAL_PAGES, madeIn } from "../lib/legal";
import { NotificationBell } from "../lib/notify";
import { NewsletterSignup } from "../lib/engage";
import { TabBar, InstallPrompt } from "../lib/mobile";
import { ImageEditor, uploadImage } from "../lib/image-editor";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, Editable, getConsent, setConsent, useQuery, applyBrandColor, addressLine } from "../lib/data";
import { DEFAULT_SOCIAL } from "../lib/defaults";
import { Button, ButtonLink, Container, Dialog, Field, Input, Select, Switch, Textarea, cn } from "./ui";

export const phoneHref = (p: string) => "tel:" + String(p).replace(/[^\d+]/g, "");
export const LEGAL_KINDS = ["mentions", "confidentialite", "cgv", "cgu"] as const;

const MANAGE: Record<string, string> = { fr: "Gestion", en: "Management", nl: "Beheer" };
export const manageLabel = (lang: string) => MANAGE[lang] || MANAGE.fr;

export function Logo({ compact }: { compact?: boolean }) {
  const { get } = useApp();
  return (
    <Link to="/" className="flex items-center gap-2.5 min-w-0 shrink">
      <img src={get("logo_url") || brand.logo || (brand as any).icon} alt={get("biz.name") || brand.name} width={44} height={44} className={cn("rounded-full shrink-0 shadow-sm bg-[var(--brand)] ring-[var(--brand)]/20", compact ? "h-9 w-9 ring-2" : "h-11 w-11 ring-4")} />
      <span className={cn("font-script text-2xl sm:text-[1.7rem] leading-none text-[var(--brand)] whitespace-nowrap", compact && "hidden xl:inline")}>{get("biz.name") || brand.name}</span>
    </Link>
  );
}

const MAIN: [string, string, string][] = [["/soins", "nav.care", ""], ["/formations", "nav.trainings", ""], ["/ateliers", "nav.workshops", ""], ["/agenda", "nav.agenda", "hidden xl:block"]];
const EXTRA: [string, string, string, any, string][] = [
  ["/soins-energetiques", "nav.sw", "nav.desc.sw", Sparkles, ""],
  ["/agenda", "nav.agenda", "nav.desc.agenda", CalendarDays, "xl:hidden"],
  ["/qui-suis-je", "nav.about", "nav.desc.about", User, ""],
  ["/blog", "nav.blog", "nav.desc.blog", Newspaper, ""],
  ["/temoignages", "nav.testimonials", "nav.desc.testimonials", Quote, ""],
  ["/e-books", "nav.ebooks", "nav.desc.ebooks", BookOpen, ""],
  ["/contact", "nav.contact", "nav.desc.contact", Mail, ""],
  ["/avis", "nav.reviews", "nav.desc.reviews", Star, ""],
];

function AdminMenu({ mobile }: { mobile?: boolean }) {
  const { t, lang } = useI18n() as any;
  const app = useApp();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h); window.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); window.removeEventListener("keydown", k); };
  }, [open]);
  if (!app.realAdmin) return null;
  const row = "flex items-center gap-3 w-full min-h-11 rounded-2xl px-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left";
  const ico = "h-9 w-9 shrink-0 grid place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t("nav.admin")} title={t("nav.admin")} className={cn("size-10 shrink-0 grid place-items-center rounded-full transition-colors", open || app.editMode ? "bg-[var(--brand)] text-white" : "text-[var(--brand)] hover:bg-[var(--brand)]/10")}><Shield className="h-5 w-5" /></button>
      {open && (
        <div role="menu" className={cn("absolute top-full mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xl p-2 anim-zoom", "right-0")}>
          <NavLink to="/gestion" className={row}><span className={ico}><LayoutDashboard className="h-4 w-4" /></span>{manageLabel(lang)}</NavLink>
          <NavLink to="/admin" className={row}><span className={ico}><Settings className="h-4 w-4" /></span>{t("nav.admin")}</NavLink>
          {app.isAdmin && <button onClick={() => { app.setEditMode(!app.editMode); setOpen(false); }} className={row}><span className={ico}><Pencil className="h-4 w-4" /></span>{t("nav.edit")}</button>}
          <div className="px-1 pt-2 mt-1 border-t border-neutral-200 dark:border-neutral-800">
            <Select value={app.viewAs} onChange={(e) => app.setViewAs(e.target.value as any)} className="!h-11 text-sm" aria-label={t("nav.viewAs")}>
              <option value="admin">{t("nav.viewAs")} : {t("role.admin")}</option>
              <option value="client">{t("nav.viewAs")} : {t("role.client")}</option>
              <option value="visitor">{t("nav.viewAs")} : {t("role.visitor")}</option>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { t } = useI18n() as any;
  const app = useApp();
  const loc = useLocation();
  const [more, setMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLElement | null>>({});
  const [ind, setInd] = useState<{ left: number; width: number; on: boolean }>({ left: 0, width: 0, on: false });
  const isHome = loc.pathname === "/";
  useEffect(() => setMore(false), [loc.pathname]);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h(); window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffect(() => {
    if (!more) return;
    const h = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMore(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    document.addEventListener("mousedown", h); window.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); window.removeEventListener("keydown", k); };
  }, [more]);
  const moreActive = EXTRA.some(([to]) => loc.pathname.startsWith(to));
  const measure = () => {
    const main = MAIN.find(([to]) => loc.pathname.startsWith(to));
    let el: HTMLElement | null = main ? linkRefs.current[main[0]] || null : null;
    if (el && el.offsetWidth === 0) el = linkRefs.current["more"] || null;
    if (!el && moreActive) el = linkRefs.current["more"] || null;
    if (!el || !navRef.current) { setInd((s) => ({ ...s, on: false })); return; }
    setInd({ left: el.offsetLeft, width: el.offsetWidth, on: true });
  };
  useLayoutEffect(measure, [loc.pathname, scrolled]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); });
  const solid = !isHome || scrolled;
  const pill = cn("flex items-center rounded-full border backdrop-blur-xl transition-all duration-300", solid ? "bg-[var(--brand-bg)]/70 dark:bg-neutral-900/80 border-[var(--brand)]/15 dark:border-neutral-800 shadow-[0_10px_30px_-12px_var(--brand)]" : "bg-[var(--brand-bg)]/40 dark:bg-neutral-900/40 border-[var(--brand)]/10 dark:border-neutral-800/60 shadow-none");
  const link = (active: boolean) => cn("relative z-10 px-3 xl:px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap", active ? "text-[var(--brand)] dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300 hover:text-[var(--brand)]");
  const item = ({ isActive }: any) => cn("flex items-start gap-3 rounded-2xl p-3 transition-colors", isActive ? "bg-[var(--brand)]/10" : "hover:bg-neutral-100 dark:hover:bg-neutral-800");
  const accountLabel = app.user ? t("nav.account") : t("nav.login");
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 pt-[calc(var(--safe-top)+1rem)] pointer-events-none" style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
        <div className="mx-auto w-full max-w-7xl px-4 flex items-center justify-between gap-2 lg:gap-3">
          <div className="min-w-0 flex-1 pointer-events-auto flex">
            <div className={cn(pill, "h-11 md:h-12 min-w-0 pl-1 pr-1 xl:pr-4")}><Logo compact /></div>
          </div>
          <div className="relative hidden md:block shrink-0 pointer-events-auto" ref={moreRef}>
            <nav ref={navRef} className={cn(pill, "relative h-12 gap-0.5 p-1")}>
              <span aria-hidden className={cn("absolute top-1 bottom-1 rounded-full bg-[var(--brand)]/10 dark:bg-[var(--brand)]/30 transition-all duration-300 ease-out", ind.on ? "opacity-100" : "opacity-0")} style={{ left: ind.left, width: ind.width }} />
              {MAIN.map(([to, k, vis]) => <NavLink key={to} to={to} ref={(el) => { linkRefs.current[to] = el; }} className={({ isActive }) => cn(link(isActive), vis)}>{t(k)}</NavLink>)}
              <button ref={(el) => { linkRefs.current["more"] = el; }} onClick={() => setMore(!more)} aria-expanded={more} className={cn(link(moreActive), "flex items-center gap-1")}>{t("nav.more")}<ChevronDown className={cn("h-4 w-4 transition-transform", more && "rotate-180")} /></button>
            </nav>
            {more && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[min(34rem,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-3 anim-zoom">
                <div className="grid grid-cols-2 gap-1">
                  {EXTRA.map(([to, k, d, I, vis]) => (
                    <NavLink key={to} to={to} className={(s: any) => cn(item(s), vis)}>
                      <span className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]"><I className="h-5 w-5" /></span>
                      <span className="min-w-0"><span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t(k)}</span><span className="block text-xs text-neutral-600 dark:text-neutral-400 leading-snug">{t(d)}</span></span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex flex-1 items-center justify-end shrink-0 pointer-events-auto">
            <div className={cn(pill, "h-12 gap-1 p-1")}>
              <LanguageSwitcher />
              <AdminMenu />
              {app.user && isConfigured && <NotificationBell supabase={supabase} />}
              {!app.isAdmin && <Link to="/compte" aria-label={accountLabel} title={accountLabel} className="size-10 shrink-0 grid place-items-center rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><User className="h-5 w-5" /></Link>}
              <ButtonLink to="/rendez-vous" size="sm" className="whitespace-nowrap shrink-0 !min-h-10 h-10">{t("nav.book")}</ButtonLink>
            </div>
          </div>
          <div className={cn(pill, "flex md:hidden h-11 gap-1 p-0.5 shrink-0 pointer-events-auto")}>
            <LanguageSwitcher />
            {app.user && isConfigured && <NotificationBell supabase={supabase} />}
            <AdminMenu mobile />
          </div>
        </div>
      </header>
      {!isHome && <div aria-hidden className="h-[calc(5.5rem+var(--safe-top))]" />}
    </>
  );
}

const PALETTE = ["#7B3FA0", "#5E2D7E", "#9B5FC0", "#6B8E23", "#4F7A28"];
export function EditBar() {
  const { t } = useI18n();
  const app = useApp();
  const [logoOpen, setLogoOpen] = useState(false);
  if (!(app.isAdmin && app.editMode)) return null;
  const setColor = async (c: string | null) => { if (c) { applyBrandColor(c); await app.save("brand_color", c); } else { applyBrandColor(null); await app.remove("brand_color"); } };
  return (
    <div className="sticky top-[calc(5.5rem+var(--safe-top))] z-40 border-y border-[var(--brand)]/30 bg-[var(--brand)]/10 backdrop-blur">
      <Container className="flex flex-wrap items-center gap-2 py-2 text-sm">
        <span className="text-neutral-700 dark:text-neutral-300 min-w-0">{t("edit.mode")}</span>
        <span className="ml-auto text-neutral-700 dark:text-neutral-300">{t("edit.palette")}</span>
        {PALETTE.map((c) => <button key={c} onClick={() => setColor(c)} aria-label={c} className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ background: c }} />)}
        <Button size="sm" variant="ghost" onClick={() => setColor(null)}>{t("edit.default")}</Button>
        <Button size="sm" variant="outline" onClick={() => setLogoOpen(true)}>{t("edit.logo")}</Button>
        <Button size="sm" variant="outline" onClick={() => app.remove("logo_url")}>{t("edit.default")}</Button>
        <Button size="sm" onClick={() => app.setEditMode(false)}>{t("edit.exit")}</Button>
      </Container>
      <ImageEditor open={logoOpen} onClose={() => setLogoOpen(false)} aspect={1} onSave={async ({ blob }: any) => { const url = await uploadImage(supabase, blob); await app.save("logo_url", url); setLogoOpen(false); }} />
    </div>
  );
}

export function TopBanners() {
  const { t } = useI18n();
  const app = useApp();
  return (
    <>
      {app.demo && <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs text-center py-1.5 px-4">{t("common.demo")}</div>}
      {app.flag("home.announce.enabled") && (
        <div className="bg-[var(--brand-accent)] text-neutral-900 text-sm text-center py-2 px-4">
          <Link to="/agenda" className="font-medium"><Editable settingKey="home.announce.text" /></Link>
        </div>
      )}
    </>
  );
}

export function MobileTabs() {
  const { t, lang } = useI18n() as any;
  const { user, isAdmin } = useApp();
  return (
    <TabBar items={[
      { to: "/", label: t("nav.home"), icon: <Home />, end: true },
      { to: "/soins", label: t("nav.offers"), icon: <Sparkles /> },
      { to: "/agenda", label: t("nav.agenda"), icon: <CalendarDays /> },
      { to: "/rendez-vous", label: t("nav.bookShort"), icon: <CalendarPlus /> },
      isAdmin
        ? { to: "/gestion", label: manageLabel(lang), icon: <LayoutDashboard /> }
        : { to: "/compte", label: user ? t("nav.account") : t("nav.login"), icon: <User /> },
    ]} />
  );
}

const fbSchema = z.object({ message: z.string().trim().min(2).max(2000), note: z.number().int().min(1).max(5), email: z.string().trim().email().max(200).optional().or(z.literal("")) });
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState(5);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const p = fbSchema.safeParse({ message, note, email });
    if (!p.success) { setErr(t("val.required")); return; }
    setBusy(true);
    if (isConfigured) await supabase.from("feedback").insert({ message: p.data.message, note, email: p.data.email || null });
    setBusy(false); setDone(true);
  };
  return (
    <Dialog open={open} onClose={onClose} title={t("fb.title")} footer={!done && <Button loading={busy} onClick={send}>{t("fb.send")}</Button>}>
      {done ? <p className="text-neutral-700 dark:text-neutral-300">{t("fb.thanks")}</p> : (
        <>
          <Field label={t("fb.rating")}>
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setNote(n)} className={cn("h-11 w-11 rounded-full text-lg transition-colors", n <= note ? "bg-[var(--brand)] text-white" : "bg-neutral-100 dark:bg-neutral-800")}>{n}</button>)}</div>
          </Field>
          <Field label={t("fb.message")} error={err}><Textarea value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} /></Field>
          <Field label={t("fb.email")}><Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </>
      )}
    </Dialog>
  );
}

export function CookieBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(() => getConsent() === null);
  const [custom, setCustom] = useState(false);
  const [measure, setMeasure] = useState(false);
  useEffect(() => { const h = () => setShow(getConsent() === null); window.addEventListener("consent-change", h); return () => window.removeEventListener("consent-change", h); }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] md:bottom-4 z-[70] px-4 anim-fade">
      <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900 backdrop-blur shadow-2xl p-5 space-y-3">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{t("cookie.title")}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("cookie.text")} <Link to="/confidentialite" className="underline">{LEGAL_PAGES.confidentialite.title}</Link></p>
        {custom && (
          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950 px-3">
            <Switch checked label={t("cookie.essential")} onChange={() => {}} />
            <Switch checked={measure} onChange={setMeasure} label={t("cookie.measure")} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {custom ? <Button size="sm" onClick={() => setConsent({ measure })}>{t("cookie.save")}</Button> : <>
            <Button size="sm" onClick={() => setConsent({ measure: true })}>{t("cookie.accept")}</Button>
            <Button size="sm" variant="outline" onClick={() => setConsent({ measure: false })}>{t("cookie.refuse")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setCustom(true)}>{t("cookie.custom")}</Button>
          </>}
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const { t } = useI18n();
  const app = useApp();
  const [fb, setFb] = useState(false);
  const social = useQuery<any[]>(() => supabase.from("social_links").select("*").eq("is_active", true).order("sort_order"), DEFAULT_SOCIAL);
  const name = app.get("biz.name") || brand.name;
  const phone = app.get("biz.phone");
  const mail = app.get("biz.email");
  return (
    <footer className="relative mt-24 overflow-hidden bg-gradient-to-b from-white/60 via-[var(--brand-accent)]/25 to-[var(--brand)]/10 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900 pb-[calc(5rem+var(--safe-bottom))] md:pb-8">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/30 to-transparent" />
      <Container className="relative py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="space-y-3 min-w-0">
          <Logo />
          <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">« {app.get("biz.slogan")} »</p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{app.get("biz.practitioner")} · {app.get("biz.titles")}</p>
          <address className="not-italic text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
            <p>{addressLine(app.settings, app.get)}</p>
            {phone && <p><a href={phoneHref(phone)} className="hover:text-[var(--brand)]">{phone}</a></p>}
            {mail && <p className="break-words"><a href={"mailto:" + mail} className="hover:text-[var(--brand)]">{mail}</a></p>}
            {app.get("biz.hours") && <p className="whitespace-pre-line">{t("footer.hours")} : {app.get("biz.hours")}</p>}
            {app.get("biz.bce") && <p>{t("footer.bce")} : {app.get("biz.bce")}</p>}
          </address>
        </div>
        <div className="space-y-3">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{t("footer.follow")}</p>
          <div className="flex flex-wrap gap-2">
            {social.data.map((s: any) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 rounded-full border border-white/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900 px-4 text-sm text-neutral-800 dark:text-neutral-200 hover:border-[var(--brand)] transition-colors">
                <LinkIcon className="h-4 w-4" />{s.network}
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 pt-2 text-sm">
            {[["/soins-energetiques", "nav.sw"], ["/qui-suis-je", "nav.about"], ["/soins", "nav.care"], ["/formations", "nav.trainings"], ["/ateliers", "nav.workshops"], ["/agenda", "nav.agenda"], ["/blog", "nav.blog"], ["/temoignages", "nav.testimonials"], ["/e-books", "nav.ebooks"], ["/contact", "nav.contact"], ["/rendez-vous", "nav.book"]].map(([to, k]) => (
              <Link key={to} to={to} className="py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-[var(--brand)] transition-colors">{t(k)}</Link>
            ))}
          </div>
        </div>
        <div className="space-y-3 min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{t("footer.newsletter")}</p>
          {isConfigured && <NewsletterSignup supabase={supabase} />}
          <p className="text-xs text-neutral-500 dark:text-neutral-400"><Editable settingKey="health.warning" /></p>
        </div>
      </Container>
      <Container className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--brand)]/10 dark:border-neutral-800 pt-6 text-sm text-neutral-600 dark:text-neutral-400">
        <span>© {new Date().getFullYear()} {name}</span>
        {LEGAL_KINDS.map((k) => <Link key={k} to={LEGAL_PAGES[k].path} className="hover:text-[var(--brand)]">{LEGAL_PAGES[k].title}</Link>)}
        <button onClick={() => setConsent(null)} className="hover:text-[var(--brand)]">{t("footer.cookies")}</button>
        <button onClick={() => setFb(true)} className="inline-flex items-center gap-1 hover:text-[var(--brand)]"><MessageSquare className="h-4 w-4" />{t("footer.feedback")}</button>
        {madeIn && <span>{madeIn}</span>}
        <span className="ml-auto text-xs opacity-70">{t("footer.made")}</span>
      </Container>
      <FeedbackDialog open={fb} onClose={() => setFb(false)} />
      <InstallPrompt appName={name} />
    </footer>
  );
}

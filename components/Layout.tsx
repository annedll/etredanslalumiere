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
      <span className={cn("font-script leading-none text-[var(--brand)] whitespace-nowrap", !compact && "text-2xl sm:text-[1.7rem]", compact && "min-w-0 truncate text-[1.45rem] pt-1")}>{get("biz.name") || brand.name}</span>
    </Link>
  );
}

export const MAIN: [string, string, string][] = [["/soins", "nav.care", ""], ["/formations", "nav.trainings", ""], ["/ateliers", "nav.workshops", ""], ["/agenda", "nav.agenda", "hidden xl:block"]];
export const EXTRA: [string, string, string, any, string][] = [
  ["/soins-energetiques", "nav.sw", "nav.desc.sw", Sparkles, ""],
  ["/agenda", "nav.agenda", "nav.desc.agenda", CalendarDays, "xl:hidden"],
  ["/qui-suis-je", "nav.about", "nav.desc.about", User, ""],
  ["/blog", "nav.blog", "nav.desc.blog", Newspaper, ""],
  ["/temoignages", "nav.testimonials", "nav.desc.testimonials", Quote, ""],
  ["/e-books", "nav.ebooks", "nav.desc.ebooks", BookOpen, ""],
  ["/contact", "nav.contact", "nav.desc.contact", Mail, ""],
  ["/avis", "nav.reviews", "nav.desc.reviews", Star, ""],
];

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
        <button onClick={() => window.dispatchEvent(new Event("usin:cookies"))} className="hover:text-[var(--brand)]">{t("footer.cookies")}</button>
        <button onClick={() => setFb(true)} className="inline-flex items-center gap-1 hover:text-[var(--brand)]"><MessageSquare className="h-4 w-4" />{t("footer.feedback")}</button>
        {madeIn && <span>{madeIn}</span>}
        <span className="ml-auto text-xs opacity-70">{t("footer.made")}</span>
      </Container>
      <FeedbackDialog open={fb} onClose={() => setFb(false)} />
      <InstallPrompt appName={name} />
    </footer>
  );
}

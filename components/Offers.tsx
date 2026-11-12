import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Users, Send, Copy, Check, CalendarDays, Bell } from "lucide-react";
import { z } from "zod";
import { useI18n } from "../lib/i18n";
import { WaitlistButton } from "../lib/engage";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, money, fmtDate, offerPath, imgProps } from "../lib/data";
import type { Offering } from "../lib/defaults";
import { Badge, Button, ButtonLink, Card, Input } from "./ui";
import { FacebookIcon, WhatsAppIcon, MessengerIcon } from "./SocialIcons";

export function ModeBadges({ modes }: { modes: string[] }) {
  const { t } = useI18n();
  return <div className="flex flex-wrap gap-1.5">{(modes || []).map((m) => <Badge key={m} tone="green">{t("mode." + m)}</Badge>)}</div>;
}

export function priceFrom(o: Offering, lang: string, t: any) {
  const p = (o.prices || []).filter((x) => x.amount_cents > 0);
  if (!p.length) return t("common.onRequest");
  const min = Math.min(...p.map((x) => x.amount_cents));
  return p.length > 1 ? `${t("common.from")} ${money(min, lang)}` : money(min, lang);
}

export function OfferCard({ o }: { o: Offering }) {
  const { t, lang } = useI18n() as any;
  return (
    <Link to={offerPath(o)} className="group block h-full active:scale-[0.99] transition-transform">
      <Card className="h-full overflow-hidden flex flex-col transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
        {o.image_url && <img {...imgProps(o.image_url, "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")} alt={o.title} loading="lazy" decoding="async" width={600} height={400} className="w-full aspect-[3/2] object-cover" />}
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{t("kind." + o.kind)}</Badge><span className="text-sm text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1"><Clock className="h-4 w-4" />{o.duration_label}</span></div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{o.title}</h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-[15px] flex-1">{o.summary}</p>
          <p className="font-semibold text-[var(--brand)]">{priceFrom(o, lang, t)}</p>
        </div>
      </Card>
    </Link>
  );
}

export function SessionCard({ s }: { s: any }) {
  const { t, lang } = useI18n() as any;
  const left = Math.max(0, (s.capacity || 0) - (s.seats_taken || 0));
  const full = s.status === "full" || left <= 0;
  return (
    <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="shrink-0 w-16 h-16 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] grid place-items-center text-center leading-tight">
        <div><div className="text-xl font-bold">{new Date(s.starts_at).getDate()}</div><div className="text-xs uppercase">{fmtDate(s.starts_at, lang, { month: "short" })}</div></div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <Link to={s.offering ? offerPath(s.offering) : "/agenda"} className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-[var(--brand)]">{s.offering?.title}</Link>
        {s.price && <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.price.label} · {money(s.price.amount_cents, lang)}</p>}
        <p className="text-sm text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{fmtDate(s.starts_at, lang)}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-1 min-w-0"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{s.is_online ? t("session.online") : s.location}</span></p>
        {s.co_host && <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("session.with")} {s.co_host}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <Badge tone={full ? "red" : left <= 3 ? "amber" : "green"}><Users className="h-3.5 w-3.5" />{full ? t("common.full") : t("common.places").replace("{n}", String(left))}</Badge>
        {full ? (isConfigured ? <WaitlistButton supabase={supabase} waitlistKey={s.id} /> : <Badge>{t("common.full")}</Badge>) : <ButtonLink to={`/inscription/${s.id}`} size="sm">{t("session.register")}</ButtonLink>}
      </div>
    </Card>
  );
}

export function ShareButtons({ title }: { title: string }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const u = encodeURIComponent(url);
  const cls = "inline-flex items-center gap-2 min-h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 text-sm text-neutral-800 dark:text-neutral-200 hover:border-[var(--brand)] transition-colors";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("share.title")}</p>
      <div className="flex flex-wrap gap-2">
        <a className={cls} target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`}><FacebookIcon className="h-4 w-4" />Facebook</a>
        <a className={cls} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`}><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
        <a className={cls} target="_blank" rel="noopener noreferrer" href={`fb-messenger://share/?link=${u}`}><MessengerIcon className="h-4 w-4" />Messenger</a>
        <button className={cls} onClick={() => { navigator.clipboard?.writeText(url); setOk(true); setTimeout(() => setOk(false), 2000); }}>{ok ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{ok ? t("share.copied") : t("share.copy")}</button>
      </div>
    </div>
  );
}

export function PayTerms() {
  const { t } = useI18n();
  return <p className="text-xs text-neutral-500 dark:text-neutral-400">{t("reg.terms")} <Link to="/conditions" className="underline">{t("reg.termsLink")}</Link>.</p>;
}

const wl = z.object({ email: z.string().trim().email().max(200) });
export function OfferWaitlist({ offeringId }: { offeringId: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (done) return <p className="text-sm text-lime-800 dark:text-lime-300">{t("offer.notifyOk")}</p>;
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input type="email" inputMode="email" autoComplete="email" placeholder={t("book.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0" />
      <Button variant="secondary" loading={busy} onClick={async () => {
        const p = wl.safeParse({ email }); if (!p.success) { setErr(t("val.email")); return; }
        setBusy(true); if (isConfigured && !offeringId.startsWith("d-")) await supabase.from("waitlist").insert({ offering_id: offeringId, email: p.data.email }); setBusy(false); setDone(true);
      }}><Bell className="h-4 w-4" />{t("offer.notify")}</Button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function HealthNote() {
  const { get } = useApp();
  return <p className="rounded-xl bg-[var(--brand-accent)]/40 text-neutral-900 dark:text-neutral-100 text-sm p-4">{get("health.warning")}</p>;
}

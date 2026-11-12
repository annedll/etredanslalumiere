import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Phone, CheckCircle2, Loader2, CalendarDays } from "lucide-react";
import { z } from "zod";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { notify, scheduleReminder } from "../lib/notify";
import { scheduleReviewRequest, AddToCalendar } from "../lib/engage";
import { startCheckout, confirmPayment } from "../lib/payments";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, Editable, useOfferings, useSessions, useQuery, money, fmtDate, isDemoId } from "../lib/data";
import { DEFAULT_SLOTS } from "../lib/defaults";
import { Button, ButtonLink, Card, Container, EmptyState, Field, Input, Select, Textarea, Checkbox, Tabs, Skeleton, Badge, cn, H1 } from "../components/ui";
import { PayTerms } from "../components/Offers";
import { phoneHref } from "../components/Layout";

const schema = z.object({
  first_name: z.string().trim().min(1).max(80), last_name: z.string().trim().min(1).max(80), email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30).regex(/^[+\d\s./()-]+$/), message: z.string().trim().max(1000),
});

export function BookPage() {
  useSeo({ title: "Prendre rendez-vous pour un soin énergétique à Bailleul", description: "Réservez en ligne un créneau de soin énergétique, de consultation ou de numérologie avec Anne Kételair, ou demandez à être rappelée. Paiement sur place ou par virement." });
  const { t, lang } = useI18n() as any;
  const app = useApp();
  const [sp] = useSearchParams();
  const offers = useOfferings();
  const bookable = offers.data.filter((o) => o.is_bookable_slot || o.kind === "soin" || o.kind === "numerologie");
  const slots = useQuery<any[]>(() => supabase.from("availability_slots").select("*").eq("is_booked", false).gte("starts_at", new Date().toISOString()).order("starts_at").limit(60), DEFAULT_SLOTS);
  const [tab, setTab] = useState("slot");
  const [offerSlug, setOfferSlug] = useState(sp.get("offre") || "");
  const [priceId, setPriceId] = useState("");
  const [mode, setMode] = useState("cabinet");
  const [slot, setSlot] = useState<any>(null);
  const [f, setF] = useState({ first_name: "", last_name: "", email: app.user?.email || "", phone: "", message: "" });
  const [marketing, setMarketing] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const offer = bookable.find((o) => o.slug === offerSlug) || bookable[0];
  useEffect(() => { if (offer && !offerSlug) setOfferSlug(offer.slug); }, [offer?.slug]);
  useEffect(() => { setPriceId(offer?.prices[0]?.id || ""); if (offer && !offer.modes.includes(mode)) setMode(offer.modes[0]); }, [offer?.slug]);
  const calendly = app.get("booking.mode") === "calendly" && app.get("booking.calendly_url");
  const up = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const p = schema.safeParse(f);
    const e: any = {};
    if (!p.success) p.error.issues.forEach((i) => (e[i.path[0] as string] = i.path[0] === "email" ? t("val.email") : i.path[0] === "phone" ? t("val.phone") : t("val.required")));
    if (tab === "slot" && !slot) e.slot = t("book.pickSlot");
    setErrs(e); if (Object.keys(e).length || !p.success) return;
    setBusy(true);
    const service = `${offer?.title || ""}${mode ? " (" + t("mode." + mode) + ")" : ""}`;
    let id = "demo";
    if (isConfigured && !isDemoId(offer?.id)) {
      const args = { p_slot_id: tab === "slot" ? slot.id : null, p_offering_id: offer.id, p_price_id: isDemoId(priceId) ? null : priceId || null, p_mode: mode, p_first_name: p.data.first_name, p_last_name: p.data.last_name, p_email: p.data.email, p_phone: p.data.phone, p_message: p.data.message || null, p_marketing: marketing };
      const { data, error } = await supabase.rpc("book_appointment", args);
      if (error) { setBusy(false); setErrs({ slot: /taken|réservé/i.test(error.message) ? t("book.slotTaken") : t("common.error") }); slots.reload(); return; }
      id = data;
    }
    setBusy(false);
    setDone({ type: tab, slot, service });
    const name = `${p.data.first_name} ${p.data.last_name}`;
    const base = { name, email: p.data.email, phone: p.data.phone, service, reference: id, url: "/compte" };
    if (tab === "slot") {
      const start = new Date(slot.starts_at), end = new Date(slot.ends_at);
      notify("booking.new", { ...base, date: start.toISOString(), end: end.toISOString(), location: `${app.get("biz.address")}, ${app.get("biz.postal")} ${app.get("biz.city")}` }, supabase);
      scheduleReminder(start, base, supabase);
      scheduleReviewRequest(end, base, supabase);
    } else notify("contact.new", { name, email: p.data.email, phone: p.data.phone, message: `${service}\n${p.data.message || ""}` }, supabase);
  };

  if (done) return (
    <Container className="py-16 max-w-xl text-center space-y-5 anim-fade">
      <CheckCircle2 className="h-14 w-14 mx-auto text-[var(--brand)]" />
      <H1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{done.type === "slot" ? t("book.ok") : t("book.okCallback")}</H1>
      {done.slot && <p className="text-neutral-700 dark:text-neutral-300">{done.service} · {fmtDate(done.slot.starts_at, lang)}</p>}
      {done.slot && <div className="flex justify-center"><AddToCalendar title={done.service} start={new Date(done.slot.starts_at)} end={new Date(done.slot.ends_at)} location={`${app.get("biz.address")}, ${app.get("biz.postal")} ${app.get("biz.city")}`} /></div>}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("book.payOnsite")}</p>
      <ButtonLink to="/">{t("nav.home")}</ButtonLink>
    </Container>
  );

  return (
    <Container className="pb-28 md:pb-0">
      <div className="py-10 sm:py-14 space-y-3"><Editable settingKey="book.title" as={H1} className="font-script text-4xl sm:text-5xl text-[var(--brand)]" /><Editable settingKey="book.intro" as="p" className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-5 sm:p-6 space-y-5">
          {offers.loading ? <Skeleton className="h-11" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("book.offer")}><Select value={offer?.slug || ""} onChange={(e) => setOfferSlug(e.target.value)}>{bookable.map((o) => <option key={o.id} value={o.slug}>{o.title}</option>)}</Select></Field>
              {offer?.prices.length ? <Field label={t("offer.prices")}><Select value={priceId} onChange={(e) => setPriceId(e.target.value)}>{offer.prices.map((p) => <option key={p.id} value={p.id}>{p.label} · {money(p.amount_cents, lang)}</option>)}</Select></Field> : <div />}
              <Field label={t("book.mode")}><div className="flex flex-wrap gap-2">{(offer?.modes || []).map((m) => <button key={m} onClick={() => setMode(m)} className={cn("min-h-11 px-4 rounded-xl border text-sm transition-colors", mode === m ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300")}>{t("mode." + m)}</button>)}</div></Field>
            </div>
          )}
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "slot", label: t("book.tabSlot") }, { id: "callback", label: t("book.tabCallback") }]} />
          {tab === "slot" && (calendly ? <ButtonLink to={calendly} target="_blank" rel="noopener noreferrer" variant="secondary">{t("book.calendly")}</ButtonLink> : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t("book.pickSlot")}</p>
              {slots.loading ? <Skeleton className="h-24" /> : slots.data.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{slots.data.map((s) => (
                  <button key={s.id} onClick={() => setSlot(s)} className={cn("min-h-12 rounded-xl border px-3 py-2 text-left text-[15px] transition-colors active:scale-95", slot?.id === s.id ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200")}>
                    <CalendarDays className="inline h-4 w-4 mr-1" />{fmtDate(s.starts_at, lang)}
                  </button>
                ))}</div>
              ) : <EmptyState title={t("book.noSlots")} action={<Button variant="secondary" onClick={() => setTab("callback")}>{t("book.tabCallback")}</Button>} />}
              {errs.slot && <p className="text-sm text-red-600">{errs.slot}</p>}
            </div>
          ))}
          {!(tab === "slot" && calendly) && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("book.firstName")} error={errs.first_name}><Input autoComplete="given-name" value={f.first_name} onChange={up("first_name")} /></Field>
              <Field label={t("book.lastName")} error={errs.last_name}><Input autoComplete="family-name" value={f.last_name} onChange={up("last_name")} /></Field>
              <Field label={t("book.email")} error={errs.email}><Input type="email" inputMode="email" autoComplete="email" value={f.email} onChange={up("email")} /></Field>
              <Field label={t("book.phone")} error={errs.phone}><Input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={up("phone")} /></Field>
            </div>
            <Field label={t("book.message")} hint={t("book.messageHint")} error={errs.message}><Textarea value={f.message} maxLength={1000} onChange={up("message")} /></Field>
            <Checkbox checked={marketing} onChange={setMarketing}>{t("book.marketing")}</Checkbox>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("book.payOnsite")}</p>
            <div className="fixed md:static inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-30 px-4 md:px-0 py-2 md:py-0 bg-white/90 dark:bg-neutral-950/90 md:bg-transparent backdrop-blur md:backdrop-blur-none">
              <Button size="lg" className="w-full md:w-auto" loading={busy} onClick={submit}>{t("book.submit")}</Button>
            </div>
          </>}
        </Card>
        <aside className="space-y-4">
          <Card className="p-6 space-y-3">
            <p className="text-neutral-700 dark:text-neutral-300">{app.get("cancel.policy")}</p>
            <ButtonLink to={phoneHref(app.get("biz.phone"))} variant="outline" className="w-full"><Phone className="h-4 w-4" />{t("nav.call")}</ButtonLink>
          </Card>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{app.get("health.warning")}</p>
        </aside>
      </div>
    </Container>
  );
}

export function RegisterPage() {
  useSeo({ title: "Inscription à une session", noindex: true } as any);
  const { id } = useParams();
  const { t, lang } = useI18n() as any;
  const app = useApp();
  const nav = useNavigate();
  const sessions = useSessions();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const s = sessions.data.find((x) => x.id === id);
  if (sessions.loading) return <Container className="py-14"><Skeleton className="h-64" /></Container>;
  if (!s) return <Container className="py-14"><EmptyState title={t("reg.notFound")} action={<ButtonLink to="/agenda">{t("nav.agenda")}</ButtonLink>} /></Container>;
  const left = Math.max(0, s.capacity - s.seats_taken);
  const deposit = app.flag("deposit.enabled") && s.offering?.kind === "formation";
  const pay = async (dep: boolean) => {
    setErr("");
    if (!app.session) { nav("/compte?next=" + encodeURIComponent(location.pathname)); return; }
    setBusy(dep ? "d" : "f");
    try {
      const { data, error } = await supabase.rpc("create_registration", { p_session_id: s.id, p_deposit: dep });
      if (error) throw new Error(/full|complet/i.test(error.message) ? t("common.full") : error.message);
      await startCheckout({ amount: data.amount_cents / 100, description: `${s.offering?.title} – ${fmtDate(s.starts_at, "fr")}`, reference: "reg:" + data.id, accessToken: app.session?.access_token });
    } catch (e: any) { setErr(e.message || t("common.error")); }
    setBusy("");
  };
  return (
    <Container className="py-10 sm:py-14 max-w-xl space-y-6">
      <H1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{t("reg.title")}</H1>
      <Card className="p-6 space-y-3">
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{s.offering?.title}</p>
        <p className="text-neutral-700 dark:text-neutral-300">{fmtDate(s.starts_at, lang)}</p>
        <p className="text-neutral-700 dark:text-neutral-300">{s.is_online ? t("session.online") : s.location}</p>
        {s.price && <p className="text-xl font-bold text-[var(--brand)]">{s.price.label} · {money(s.price.amount_cents, lang)}</p>}
        <Badge tone={left ? "green" : "red"}>{left ? t("common.places").replace("{n}", String(left)) : t("common.full")}</Badge>
      </Card>
      {!app.session && <p className="rounded-xl bg-[var(--brand)]/10 p-4 text-neutral-800 dark:text-neutral-200">{t("reg.loginFirst")}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Button size="lg" loading={busy === "f"} disabled={!left || isDemoId(s.id)} onClick={() => pay(false)}>{deposit ? t("reg.full") : t("reg.pay")}</Button>
        {deposit && <Button size="lg" variant="outline" loading={busy === "d"} disabled={!left || isDemoId(s.id)} onClick={() => pay(true)}>{t("reg.deposit")} ({money(Number(app.get("deposit.amount")) * 100, lang)})</Button>}
      </div>
      <PayTerms />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{app.get("cancel.policy")}</p>
    </Container>
  );
}

export function ThanksPage() {
  useSeo({ title: "Confirmation de paiement", noindex: true } as any);
  const { t, lang } = useI18n() as any;
  const [res, setRes] = useState<any>(undefined);
  useEffect(() => { confirmPayment().then(setRes, () => setRes(null)); }, []);
  return (
    <Container className="py-16 max-w-xl text-center space-y-5">
      {res === undefined ? <><Loader2 className="h-10 w-10 mx-auto animate-spin text-[var(--brand)]" /><p>{t("pay.loading")}</p></> : res?.paid ? <>
        <CheckCircle2 className="h-14 w-14 mx-auto text-[var(--brand)]" />
        <H1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{t("pay.ok")}</H1>
        <p className="text-neutral-700 dark:text-neutral-300">{res.description} · {money(res.amount, lang)}</p>
      </> : <H1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t("pay.ko")}</H1>}
      <ButtonLink to="/compte">{t("pay.account")}</ButtonLink>
    </Container>
  );
}

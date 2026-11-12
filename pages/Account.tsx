import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Download, Trash2, Mail, CalendarDays, Ticket, BookOpen, Flower2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { googleAvailable, signInWithGoogle } from "../lib/google";
import { notify } from "../lib/notify";
import { AddToCalendar } from "../lib/engage";
import { startCheckout } from "../lib/payments";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, money, fmtDate } from "../lib/data";
import { Button, Card, Container, EmptyState, Field, Input, Tabs, Badge, Skeleton, H1, toast } from "../components/ui";
import { PayTerms } from "../components/Offers";

const email = z.string().trim().email().max(200);
const profileSchema = z.object({ first_name: z.string().trim().max(80), last_name: z.string().trim().max(80), phone: z.string().trim().max(30).regex(/^[\d+().\s-]*$/) });
function errMsg(e: any, t: any) {
  const m = String(e?.message || "");
  if (/invalid login/i.test(m)) return t("acc.errCreds");
  if (/password/i.test(m) && /6|8|short|least/i.test(m)) return t("acc.errShort");
  if (/email/i.test(m) && /invalid/i.test(m)) return t("val.email");
  return t("common.error");
}

function AuthForms() {
  const { t } = useI18n();
  const app = useApp();
  const [tab, setTab] = useState("magic");
  const [mail, setMail] = useState("");
  const [pwd, setPwd] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  const [resend, setResend] = useState(false);
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/compte";
  useEffect(() => { googleAvailable().then(setGoogle).catch(() => {}); }, []);
  const run = async (fn: () => Promise<void>) => { setErr(""); setMsg(""); if (!email.safeParse(mail).success) { setErr(t("val.email")); return; } setBusy(true); try { await fn(); } catch (e) { setErr(errMsg(e, t)); } setBusy(false); };
  const redirect = window.location.origin + next;
  return (
    <Card className="p-6 space-y-5 max-w-md mx-auto">
      {google && <><Button variant="outline" className="w-full" onClick={() => signInWithGoogle()}>{t("acc.google")}</Button><p className="text-center text-sm text-neutral-500">{t("acc.or")}</p></>}
      <Tabs value={tab} onChange={(v) => { setTab(v); setErr(""); setMsg(""); }} tabs={[{ id: "magic", label: t("acc.tabMagic") }, { id: "signin", label: t("acc.signin") }, { id: "signup", label: t("acc.signup") }]} />
      <Field label={t("book.email")}><Input type="email" inputMode="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} /></Field>
      {tab !== "magic" && <Field label={t("acc.password")}><Input type="password" autoComplete={tab === "signup" ? "new-password" : "current-password"} value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>}
      {tab === "signup" && app.flag("beta_mode") && <Field label={t("acc.betaCode")}><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-lime-800 dark:text-lime-300">{msg}</p>}
      {tab === "magic" && <Button className="w-full" loading={busy} onClick={() => run(async () => { const { error } = await supabase.auth.signInWithOtp({ email: mail.trim(), options: { emailRedirectTo: redirect } }); if (error) throw error; setMsg(t("acc.magicSent")); })}><Mail className="h-4 w-4" />{t("acc.magic")}</Button>}
      {tab === "signin" && <>
        <Button className="w-full" loading={busy} onClick={() => run(async () => { const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password: pwd }); if (error) throw error; })}>{t("acc.signin")}</Button>
        <button className="text-sm text-[var(--brand)] min-h-11" onClick={() => run(async () => { const { error } = await supabase.auth.resetPasswordForEmail(mail.trim(), { redirectTo: window.location.origin + "/reset-password" }); if (error) throw error; setMsg(t("acc.resetSent")); })}>{t("acc.forgot")}</button>
      </>}
      {tab === "signup" && <>
        <Button className="w-full" loading={busy} onClick={() => run(async () => {
          if (pwd.length < 8) { setErr(t("acc.errShort")); return; }
          if (app.flag("beta_mode")) { const { data } = await supabase.rpc("redeem_beta_invite", { p_code: code.trim() }); if (!data) { setErr(t("acc.badCode")); return; } }
          const { data, error } = await supabase.auth.signUp({ email: mail.trim(), password: pwd, options: { emailRedirectTo: redirect } });
          if (error) throw error;
          if (data.user?.identities?.length === 0) { setErr(t("acc.exists")); return; }
          setMsg(t("acc.checkEmail")); setResend(true); notify("signup.new", { email: mail.trim() }, supabase);
        })}>{t("acc.signup")}</Button>
        {resend && <Button variant="ghost" className="w-full" onClick={() => supabase.auth.resend({ type: "signup", email: mail.trim() })}>{t("acc.resend")}</Button>}
      </>}
    </Card>
  );
}

function ProfileForm({ uid, t }: { uid: string; t: any }) {
  const [p, setP] = useState({ first_name: "", last_name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (!isConfigured) return; supabase.from("profiles").select("first_name,last_name,phone").eq("id", uid).maybeSingle().then(({ data }) => data && setP({ first_name: data.first_name || "", last_name: data.last_name || "", phone: data.phone || "" })); }, [uid]);
  const save = async () => {
    setErr(""); const r = profileSchema.safeParse(p); if (!r.success) { setErr(t("val.required")); return; }
    setBusy(true);
    const { error } = isConfigured ? await supabase.from("profiles").update(r.data).eq("id", uid) : { error: null } as any;
    setBusy(false);
    if (error) toast("Enregistrement impossible, réessayez.", "error"); else toast("Informations enregistrées.");
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("book.firstName")}><Input autoComplete="given-name" value={p.first_name} onChange={(e) => setP({ ...p, first_name: e.target.value })} /></Field>
        <Field label={t("book.lastName")}><Input autoComplete="family-name" value={p.last_name} onChange={(e) => setP({ ...p, last_name: e.target.value })} /></Field>
      </div>
      <Field label={t("book.phone")} error={err}><Input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
      <Button loading={busy} onClick={save}>{t("edit.save")}</Button>
    </div>
  );
}

export function AccountPage() {
  useSeo({ title: "Mon espace client", noindex: true } as any);
  const { t, lang } = useI18n() as any;
  const app = useApp();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState("apt");
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const uid = app.user?.id;
  useEffect(() => { const n = sp.get("next"); if (uid && n && n !== "/compte") nav(n); }, [uid]);
  const load = async () => {
    if (!uid || !isConfigured) { setD({ apt: [], reg: [], ord: [], card: null }); return; }
    const [apt, reg, ord, card] = await Promise.all([
      supabase.from("appointments").select("*, offering:offerings(title), slot:availability_slots(starts_at,ends_at)").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("registrations").select("*, session:sessions(starts_at,ends_at,location,offering:offerings(title))").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("orders").select("*, ebook:ebooks(title,file_path)").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("meditation_cards").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    setD({ apt: apt.data || [], reg: reg.data || [], ord: ord.data || [], card: card.data });
  };
  useEffect(() => { load(); }, [uid]);
  const titleCls = "text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100";
  if (!app.user) return <Container className="py-10 sm:py-14 space-y-6"><H1 className={titleCls + " text-center"}>{t("acc.title")}</H1><AuthForms /></Container>;
  const st = (s: string) => <Badge tone={s === "paid" || s === "confirmed" ? "green" : s === "cancelled" ? "red" : "amber"}>{t("st." + s)}</Badge>;
  const download = async (o: any) => {
    setBusy(o.id);
    const { data, error } = await supabase.storage.from("ebooks").createSignedUrl(o.ebook.file_path, 900);
    if (!error && data) { supabase.rpc("count_download", { p_order_id: o.id }); window.open(data.signedUrl, "_blank"); } else setErr(t("common.error"));
    setBusy("");
  };
  const buyCard = async () => {
    setBusy("card"); setErr("");
    try { const { data, error } = await supabase.rpc("create_order", { p_item_type: "meditation_card", p_ebook_id: null, p_price_id: null, p_waiver: false }); if (error) throw error;
      await startCheckout({ amount: data.amount_cents / 100, description: "Carnet de 10 méditations", reference: "ord:" + data.id, accessToken: app.session?.access_token }); } catch (e: any) { setErr("Le paiement n'a pas pu démarrer, réessayez dans un instant."); }
    setBusy("");
  };
  const exportData = async () => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    const blob = new Blob([JSON.stringify({ profile: prof, ...d }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mes-donnees.json"; a.click();
  };
  const del = async () => { if (!confirm(t("acc.deleteConfirm"))) return; await supabase.rpc("delete_my_account"); await supabase.auth.signOut(); nav("/"); };
  const used = d?.card?.sessions_used || 0;
  return (
    <Container className="py-10 sm:py-14 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><H1 className={titleCls}>{t("acc.title")}</H1><p className="text-neutral-600 dark:text-neutral-400 break-words">{app.user.email}</p></div>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" />{t("acc.logout")}</Button>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "apt", label: t("acc.appointments") }, { id: "reg", label: t("acc.registrations") }, { id: "ord", label: t("acc.ebooks") }, { id: "card", label: t("acc.card") }, { id: "me", label: t("acc.profile") }]} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!d ? <Skeleton className="h-40" /> : <div className="grid gap-3 anim-fade">
        {tab === "apt" && (d.apt.length ? d.apt.map((a: any) => (
          <Card key={a.id} className="p-5 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0"><p className="font-semibold text-neutral-900 dark:text-neutral-100">{a.offering?.title}</p><p className="text-sm text-neutral-600 dark:text-neutral-400">{a.slot ? fmtDate(a.slot.starts_at, lang) : t("book.tabCallback")}</p></div>
            <div className="flex flex-wrap items-center gap-2">{st(a.status)}
              {a.slot && a.status !== "cancelled" && <AddToCalendar title={a.offering?.title || ""} start={new Date(a.slot.starts_at)} end={new Date(a.slot.ends_at)} location={`${app.get("biz.address")}, ${app.get("biz.postal")} ${app.get("biz.city")}`} />}
              {["new", "confirmed"].includes(a.status) && <Button size="sm" variant="ghost" onClick={async () => { await supabase.rpc("cancel_my_appointment", { p_id: a.id }); notify("booking.cancelled", { name: `${a.first_name} ${a.last_name}`, email: a.email, service: a.offering?.title, date: a.slot?.starts_at, reference: a.id, url: "/compte" }, supabase); load(); }}>{t("acc.cancel")}</Button>}
            </div>
          </Card>)) : <EmptyState icon={<CalendarDays />} title={t("acc.none")} />)}
        {tab === "reg" && (d.reg.length ? d.reg.map((r: any) => (
          <Card key={r.id} className="p-5 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0"><p className="font-semibold text-neutral-900 dark:text-neutral-100">{r.session?.offering?.title}</p><p className="text-sm text-neutral-600 dark:text-neutral-400">{r.session && fmtDate(r.session.starts_at, lang)} · {money(r.amount_cents, lang)}</p></div>
            <div className="flex flex-wrap gap-2 items-center">{st(r.status)}{r.status === "paid" && r.session && <AddToCalendar title={r.session.offering?.title} start={new Date(r.session.starts_at)} end={new Date(r.session.ends_at)} location={r.session.location} />}</div>
          </Card>)) : <EmptyState icon={<Ticket />} title={t("acc.none")} />)}
        {tab === "ord" && (d.ord.filter((o: any) => o.item_type === "ebook").length ? d.ord.filter((o: any) => o.item_type === "ebook").map((o: any) => (
          <Card key={o.id} className="p-5 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0"><p className="font-semibold text-neutral-900 dark:text-neutral-100">{o.ebook?.title}</p><p className="text-sm text-neutral-600 dark:text-neutral-400">{money(o.amount_cents, lang)}</p></div>
            <div className="flex gap-2 items-center">{st(o.status)}{o.status === "paid" && o.ebook?.file_path && <Button size="sm" loading={busy === o.id} onClick={() => download(o)}><Download className="h-4 w-4" />{t("eb.download")}</Button>}</div>
          </Card>)) : <EmptyState icon={<BookOpen />} title={t("acc.none")} />)}
        {tab === "card" && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3"><Flower2 className="h-8 w-8 text-[var(--brand)]" /><p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t("acc.cardText").replace("{n}", String(used % 10))}</p></div>
            <div className="grid grid-cols-11 gap-1.5">{Array.from({ length: 11 }).map((_, i) => <div key={i} className={`h-8 rounded-full ${i < used % 10 ? "bg-[var(--brand)]" : i === 10 ? "bg-[var(--brand-accent)]" : "bg-neutral-200 dark:bg-neutral-800"}`} />)}</div>
            <p className="text-neutral-700 dark:text-neutral-300">{t("acc.cardCredits").replace("{n}", String(d.card?.credits || 0))}</p>
            <p className="text-neutral-700 dark:text-neutral-300">{t("acc.cardFree").replace("{n}", String(d.card?.free_sessions_granted || 0))}</p>
            <Button loading={busy === "card"} onClick={buyCard}>{t("acc.buyCard")} · {money(Number(app.get("meditation.card_price")) * 100, lang)}</Button>
            <PayTerms />
          </Card>
        )}
        {tab === "me" && (
          <>
            <Card className="p-6 space-y-5">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t("acc.profile")}</h2>
              {uid && <ProfileForm uid={uid} t={t} />}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="outline" onClick={exportData}><Download className="h-4 w-4" />{t("acc.export")}</Button>
              </div>
            </Card>
            <Card className="p-6 space-y-3 border-red-200 dark:border-red-900/60">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300"><AlertTriangle className="h-5 w-5" /><h2 className="text-lg font-semibold">{t("acc.delete")}</h2></div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">La suppression efface définitivement votre compte, vos rendez-vous, inscriptions et carnet. Les justificatifs de paiement sont conservés pendant la durée légale. Cette action est irréversible.</p>
              <Button variant="danger" onClick={del}><Trash2 className="h-4 w-4" />{t("acc.delete")}</Button>
            </Card>
          </>
        )}
      </div>}
    </Container>
  );
}

export function ResetPasswordPage() {
  useSeo({ title: "Nouveau mot de passe", noindex: true } as any);
  const { t } = useI18n();
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  return (
    <Container className="py-14 max-w-md space-y-4">
      <H1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{t("acc.reset")}</H1>
      <Card className="p-6 space-y-4">
        <Field label={t("acc.newPassword")} error={err}><Input type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
        {msg && <p className="text-sm text-lime-800 dark:text-lime-300">{msg}</p>}
        <Button className="w-full" onClick={async () => { setErr(""); if (pwd.length < 8) { setErr(t("acc.errShort")); return; } const { error } = await supabase.auth.updateUser({ password: pwd }); if (error) setErr(errMsg(error, t)); else { setMsg(t("acc.updated")); setTimeout(() => nav("/compte"), 1200); } }}>{t("edit.save")}</Button>
      </Card>
    </Container>
  );
}

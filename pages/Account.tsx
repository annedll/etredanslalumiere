import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Download, Trash2, Mail, CalendarDays, Ticket, BookOpen, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { googleAvailable, signInWithGoogle } from "../lib/google";
import { notify } from "../lib/notify";
import { AddToCalendar } from "../lib/engage";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, money, fmtDate } from "../lib/data";
import { AccountPrivacy } from "../lib/auth";
import { Button, Card, Container, EmptyState, Field, Input, Tabs, Badge, Skeleton, H1, toast } from "../components/ui";

const email = z.string().trim().email().max(200);
const profileSchema = z.object({ first_name: z.string().trim().max(80), last_name: z.string().trim().max(80), phone: z.string().trim().max(30).regex(/^[\d+().\s-]*$/) });
function errMsg(e: any, t: any) {
  const m = String(e?.message || "");
  if (/invalid login/i.test(m)) return t("acc.errCreds");
  if (/password/i.test(m) && /6|8|short|least/i.test(m)) return t("acc.errShort");
  if (/email/i.test(m) && /invalid/i.test(m)) return t("val.email");
  return t("common.error");
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
    if (!uid || !isConfigured) { setD({ apt: [], reg: [], ord: [] }); return; }
    const [apt, reg, ord] = await Promise.all([
      supabase.from("appointments").select("*, offering:offerings(title), slot:availability_slots(starts_at,ends_at)").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("registrations").select("*, session:sessions(starts_at,ends_at,location,offering:offerings(title))").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("orders").select("*, ebook:ebooks(title,file_path)").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    setD({ apt: apt.data || [], reg: reg.data || [], ord: ord.data || [] });
  };
  useEffect(() => { load(); }, [uid]);
  const titleCls = "text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100";
  if (!app.user) return null;
  const st = (s: string) => <Badge tone={s === "paid" || s === "confirmed" ? "green" : s === "cancelled" ? "red" : "amber"}>{t("st." + s)}</Badge>;
  const download = async (o: any) => {
    setBusy(o.id);
    const { data, error } = await supabase.storage.from("ebooks").createSignedUrl(o.ebook.file_path, 900);
    if (!error && data) { supabase.rpc("count_download", { p_order_id: o.id }); window.open(data.signedUrl, "_blank"); } else setErr(t("common.error"));
    setBusy("");
  };
  return (
    <Container className="py-10 sm:py-14 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><H1 className={titleCls}>{t("acc.title")}</H1><p className="text-neutral-600 dark:text-neutral-400 break-words">{app.user.email}</p></div>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" />{t("acc.logout")}</Button>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "apt", label: t("acc.appointments") }, { id: "reg", label: t("acc.registrations") }, { id: "ord", label: t("acc.ebooks") }, { id: "me", label: t("acc.profile") }]} />
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
        {tab === "me" && (
          <>
            <Card className="p-6 space-y-5">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t("acc.profile")}</h2>
              {uid && <ProfileForm uid={uid} t={t} />}

            </Card>
            <AccountPrivacy />
          </>
        )}
      </div>}
    </Container>
  );
}

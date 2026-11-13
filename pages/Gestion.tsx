import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminConsole, VisitStats, CalendarSync } from "../lib/admin";
import { CalendarDays, PhoneCall, Mail, Quote, Euro, Settings, Phone, Users, ShoppingBag, Newspaper, Star, LayoutDashboard, Ticket, Check } from "lucide-react";
import { useSeo } from "../lib/seo";
import { ReviewsAdmin, NewsletterAdmin } from "../lib/engage";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, money, fmtDate, withTimeout } from "../lib/data";
import { Badge, Button, ButtonLink, Card, Container, EmptyState, Select, Skeleton, Tabs, cn, toast } from "../components/ui";
import { phoneHref } from "../components/Layout";

const q = async (p: any) => { try { const r: any = await withTimeout(p); return r?.data || []; } catch { return []; } };
const STATUS: [string, string][] = [["new", "Nouveau"], ["confirmed", "Confirmé"], ["done", "Terminé"], ["cancelled", "Annulé"]];
const title = "text-lg font-semibold text-neutral-900 dark:text-neutral-100";
const muted = "text-sm text-neutral-600 dark:text-neutral-400";

function Contact({ phone, email }: { phone?: string; email?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {phone && <ButtonLink to={phoneHref(phone)} size="sm" variant="secondary"><Phone className="h-4 w-4" />Appeler</ButtonLink>}
      {email && <ButtonLink to={"mailto:" + email} size="sm" variant="outline"><Mail className="h-4 w-4" />Écrire</ButtonLink>}
    </div>
  );
}

function Dashboard({ go }: { go: (t: string) => void }) {
  const [d, setD] = useState<any>(null);
  const load = async () => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [apt, msgs, tes, pay, ses, regs] = await Promise.all([
      q(supabase.from("appointments").select("*, offering:offerings(title), slot:availability_slots(starts_at)").in("status", ["new", "confirmed"]).limit(200)),
      q(supabase.from("contact_messages").select("*").eq("handled", false).order("created_at", { ascending: false }).limit(20)),
      q(supabase.from("testimonials").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(20)),
      q(supabase.from("stripe_payments").select("amount,created_at").gte("created_at", month)),
      q(supabase.from("sessions").select("*, offering:offerings(title)").gte("starts_at", now.toISOString()).neq("status", "cancelled").order("starts_at").limit(5)),
      q(supabase.from("registrations").select("id").gte("created_at", month)),
    ]);
    const today = now.toDateString();
    const withSlot = apt.filter((a: any) => a.slot?.starts_at && new Date(a.slot.starts_at) >= new Date(now.toDateString())).sort((a: any, b: any) => a.slot.starts_at.localeCompare(b.slot.starts_at));
    setD({
      today: withSlot.filter((a: any) => new Date(a.slot.starts_at).toDateString() === today),
      next: withSlot.filter((a: any) => new Date(a.slot.starts_at).toDateString() !== today).slice(0, 5),
      callbacks: apt.filter((a: any) => a.type === "callback" && a.status === "new"),
      msgs, tes, ses,
      revenue: pay.reduce((s: number, x: any) => s + (x.amount || 0), 0),
      regs: regs.length,
    });
  };
  useEffect(() => { load(); }, []);
  if (!d) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  const kpi: [string, string, any, string][] = [
    ["Rendez-vous aujourd'hui", String(d.today.length), CalendarDays, "agenda"],
    ["Demandes de rappel", String(d.callbacks.length), PhoneCall, "agenda"],
    ["Messages non traités", String(d.msgs.length), Mail, "messages"],
    ["Ventes du mois", money(d.revenue), Euro, "orders"],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpi.map(([l, v, I, tab]) => (
          <button key={l} onClick={() => go(tab)} className="text-left active:scale-95 transition-transform">
            <Card className="p-4 sm:p-5 h-full space-y-2 hover:shadow-xl transition-shadow">
              <span className="h-10 w-10 grid place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]"><I className="h-5 w-5" /></span>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{v}</p>
              <p className={muted}>{l}</p>
            </Card>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h2 className={title}>Rendez-vous du jour</h2>
          {d.today.length ? d.today.map((a: any) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 p-3">
              <div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{fmtDate(a.slot.starts_at, "fr", { hour: "2-digit", minute: "2-digit" })} · {a.first_name} {a.last_name}</p><p className={muted}>{a.offering?.title}</p></div>
              <Contact phone={a.phone} />
            </div>
          )) : <p className={muted}>Aucun rendez-vous aujourd'hui.</p>}
          {d.next.length > 0 && <><p className="pt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">À venir</p>{d.next.map((a: any) => <p key={a.id} className="text-sm text-neutral-700 dark:text-neutral-300">{fmtDate(a.slot.starts_at)} · {a.first_name} {a.last_name}</p>)}</>}
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className={title}>Demandes de rappel</h2>
          {d.callbacks.length ? d.callbacks.slice(0, 6).map((a: any) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm text-neutral-800 dark:text-neutral-200">{a.first_name} {a.last_name} · {a.offering?.title}</p>
              <Contact phone={a.phone} />
            </div>
          )) : <p className={muted}>Aucune demande en attente.</p>}
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className={title}>Nouveaux messages</h2>
          {d.msgs.length ? d.msgs.slice(0, 5).map((m: any) => <p key={m.id} className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{m.name} · {m.subject || m.message}</p>) : <p className={muted}>Aucun nouveau message.</p>}
          <Button size="sm" variant="ghost" onClick={() => go("messages")}>Voir les messages</Button>
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className={title}>Témoignages à valider ({d.tes.length})</h2>
          {d.tes.length ? d.tes.slice(0, 4).map((x: any) => <p key={x.id} className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{x.author_name} : {x.content}</p>) : <p className={muted}>Aucun témoignage en attente.</p>}
          <Button size="sm" variant="ghost" onClick={() => go("reviews")}>Modérer</Button>
        </Card>
        <Card className="p-5 space-y-3 lg:col-span-2">
          <h2 className={title}>Prochaines sessions · {d.regs} inscription(s) ce mois-ci</h2>
          {d.ses.length ? d.ses.map((s: any) => { const pct = Math.round(100 * (s.seats_taken || 0) / Math.max(1, s.capacity)); return (
            <div key={s.id} className="space-y-1"><p className="text-sm text-neutral-800 dark:text-neutral-200">{s.offering?.title} · {fmtDate(s.starts_at, "fr", { day: "numeric", month: "short" })} · {s.seats_taken}/{s.capacity} places prises</p><div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: pct + "%" }} /></div></div>
          ); }) : <p className={muted}>Aucune session programmée.</p>}
        </Card>
      </div>
    </div>
  );
}

function Agenda() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => setRows(await q(supabase.from("appointments").select("*, offering:offerings(title), slot:availability_slots(starts_at)").in("status", ["new", "confirmed"]).order("created_at", { ascending: false }).limit(100)));
  useEffect(() => { load(); }, []);
  const setStatus = async (a: any, s: string) => {
    await supabase.from("appointments").update({ status: s }).eq("id", a.id);
    if (s === "cancelled" && a.slot_id) await supabase.from("availability_slots").update({ is_booked: false }).eq("id", a.slot_id);
    load();
  };
  if (!rows) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className={title}>Rendez-vous et rappels en cours</h2><ButtonLink to="/admin?s=sessions" size="sm" variant="outline">Gérer les sessions et créneaux</ButtonLink></div>
      {rows.length ? rows.map((a) => (
        <Card key={a.id} className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2"><Badge tone={a.type === "callback" ? "amber" : "brand"}>{a.type === "callback" ? "À rappeler" : a.slot ? fmtDate(a.slot.starts_at) : "Rendez-vous"}</Badge><Badge>{STATUS.find(([k]) => k === a.status)?.[1]}</Badge></div>
          <div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{a.first_name} {a.last_name}</p><p className={muted}>{a.offering?.title}</p>{a.message && <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 break-words">{a.message}</p>}</div>
          <div className="flex flex-wrap items-center gap-2"><Contact phone={a.phone} email={a.email} /><Select value={a.status} onChange={(e) => setStatus(a, e.target.value)} className="!w-auto !h-10 text-sm" aria-label="Statut">{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></div>
        </Card>
      )) : <EmptyState icon={<CalendarDays />} title="Aucun rendez-vous en cours" text="Ajoutez des créneaux pour que vos clientes puissent réserver." action={<ButtonLink to="/admin?s=slots">Créer des créneaux</ButtonLink>} />}
    </div>
  );
}

function Clients() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [s, setS] = useState("");
  const [busy, setBusy] = useState("");
  // The admins are not clients: never listed here (nor deletable by mistake).
  const load = async () => {
    const [list, admins] = await Promise.all([
      q(supabase.from("profiles").select("id,first_name,last_name,email,phone,created_at").order("created_at", { ascending: false }).limit(500)),
      q(supabase.from("app_admins").select("email")),
    ]);
    const adminEmails = new Set(((admins as any[]) || []).map((a) => String(a.email).toLowerCase()));
    setRows(((list as any[]) || []).filter((c) => !adminEmails.has(String(c.email || "").toLowerCase())));
  };
  useEffect(() => { load(); }, []);
  // The client receives an email with a link to choose a new password (the admin never sees it).
  const reset = async (c: any) => {
    if (!confirm(`Envoyer à ${c.email} un email pour choisir un nouveau mot de passe ?`)) return;
    setBusy(c.id);
    const { error } = await supabase.auth.resetPasswordForEmail(c.email, { redirectTo: window.location.origin + "/reset-password" });
    setBusy("");
    toast(error ? "L'email n'a pas pu partir : " + error.message : "Email envoyé à " + c.email, error ? "error" : "ok");
  };
  const remove = async (c: any) => {
    if (!confirm(`Supprimer définitivement le compte de ${c.email} et ses données (rendez-vous, messages) ? Cette action est irréversible.`)) return;
    setBusy(c.id);
    const { error } = await supabase.rpc("admin_delete_person", { p_email: c.email });
    setBusy("");
    if (error) return toast("Suppression impossible : " + error.message, "error");
    toast("Compte supprimé");
    load();
  };
  if (!rows) return <Skeleton className="h-40" />;
  const list = rows.filter((r) => !s || `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(s.toLowerCase()));
  return (
    <div className="space-y-3">
      <h2 className={title}>Clients ({rows.length})</h2>
      <input value={s} onChange={(e) => setS(e.target.value)} placeholder="Rechercher un nom ou un email…" className="w-full h-11 rounded-2xl border border-neutral-300/80 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 px-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
      {list.length ? list.map((c) => (
        <Card key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{c.first_name || c.last_name ? `${c.first_name || ""} ${c.last_name || ""}` : "Sans nom"}</p><p className={cn(muted, "break-all")}>{c.email}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Contact phone={c.phone} email={c.email} />
            <Button size="sm" variant="ghost" loading={busy === c.id} onClick={() => reset(c)}>Réinitialiser le mot de passe</Button>
            <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === c.id} onClick={() => remove(c)}>Supprimer</Button>
          </div>
        </Card>
      )) : <EmptyState icon={<Users />} title="Aucun client pour le moment" text="Les personnes qui créent un compte apparaîtront ici." />}
    </div>
  );
}

function Messages() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => setRows(await q(supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100)));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-3">
      <h2 className={title}>Messages de contact</h2>
      {rows.length ? rows.map((m) => (
        <Card key={m.id} className={cn("p-4 space-y-2", m.handled && "opacity-70")}>
          <div className="flex flex-wrap items-center gap-2"><Badge tone={m.handled ? "green" : "amber"}>{m.handled ? "Traité" : "À traiter"}</Badge><span className="text-xs text-neutral-500">{fmtDate(m.created_at, "fr", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">{m.name}{m.subject ? ` · ${m.subject}` : ""}</p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line break-words">{m.message}</p>
          <div className="flex flex-wrap gap-2"><Contact phone={m.phone} email={m.email} /><Button size="sm" variant="ghost" onClick={async () => { await supabase.from("contact_messages").update({ handled: !m.handled }).eq("id", m.id); load(); }}><Check className="h-4 w-4" />{m.handled ? "Marquer non traité" : "Marquer traité"}</Button></div>
        </Card>
      )) : <EmptyState icon={<Mail />} title="Aucun message reçu" />}
    </div>
  );
}

function Orders() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { Promise.all([
    q(supabase.from("orders").select("*, ebook:ebooks(title), profile:profiles(email)").order("created_at", { ascending: false }).limit(50)),
    q(supabase.from("registrations").select("*, session:sessions(starts_at, offering:offerings(title)), profile:profiles(email)").order("created_at", { ascending: false }).limit(50)),
  ]).then(([o, r]) => setD({ o, r })); }, []);
  if (!d) return <Skeleton className="h-40" />;
  const st = (s: string) => ({ paid: "Payée", pending: "En attente", cancelled: "Annulée", refunded: "Remboursée" } as any)[s] || s;
  return (
    <div className="space-y-6">
      <section className="space-y-3"><h2 className={title}>Inscriptions aux sessions</h2>
        {d.r.length ? d.r.map((r: any) => <Card key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{r.session?.offering?.title}</p><p className={cn(muted, "break-all")}>{r.profile?.email} · {r.session?.starts_at ? fmtDate(r.session.starts_at, "fr", { day: "numeric", month: "short" }) : ""}</p></div><div className="flex gap-2"><Badge tone={r.status === "paid" ? "green" : "amber"}>{st(r.status)}</Badge><span className="font-semibold text-[var(--brand)]">{money(r.amount_cents)}</span></div></Card>) : <EmptyState icon={<Ticket />} title="Aucune inscription" />}
      </section>
      <section className="space-y-3"><h2 className={title}>Commandes (e-books, packs)</h2>
        {d.o.length ? d.o.map((o: any) => <Card key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{o.item_type === "ebook" ? "E-book " + (o.ebook?.title || "") : o.item_type === "meditation_card" ? "Carnet de méditations" : "Pack de soins"}</p><p className={cn(muted, "break-all")}>{o.profile?.email}</p></div><div className="flex gap-2"><Badge tone={o.status === "paid" ? "green" : "amber"}>{st(o.status)}</Badge><span className="font-semibold text-[var(--brand)]">{money(o.amount_cents)}</span></div></Card>) : <EmptyState icon={<ShoppingBag />} title="Aucune commande" />}
      </section>
    </div>
  );
}

function Moderation() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = async () => setRows(await q(supabase.from("testimonials").select("*").eq("status", "pending").order("created_at", { ascending: false })));
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-6">
      <section className="space-y-3"><h2 className={title}>Témoignages à valider</h2>
        {!rows ? <Skeleton className="h-24" /> : rows.length ? rows.map((x) => (
          <Card key={x.id} className="p-4 space-y-2"><p className="text-neutral-800 dark:text-neutral-200 whitespace-pre-line break-words">{x.content}</p><p className="font-medium text-[var(--brand)]">{x.author_name}</p>
            <div className="flex flex-wrap gap-2"><Button size="sm" onClick={async () => { await supabase.from("testimonials").update({ status: "approved" }).eq("id", x.id); load(); }}>Publier</Button><Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Supprimer ce témoignage ?")) return; await supabase.from("testimonials").delete().eq("id", x.id); load(); }}>Supprimer</Button></div></Card>
        )) : <EmptyState icon={<Quote />} title="Aucun témoignage en attente" />}
      </section>
      <section className="space-y-3"><h2 className={title}>Avis</h2><ReviewsAdmin supabase={supabase} /></section>
    </div>
  );
}

export function GestionPage() {
  const app = useApp();
  if (!app.isAdmin) return <Container className="py-14"><EmptyState icon={<Settings />} title="Espace réservé à l'administratrice" text="Connectez-vous avec le compte administrateur." action={<ButtonLink to="/connexion">Se connecter</ButtonLink>} /></Container>;
  if (!isConfigured) return <Container className="py-14"><EmptyState icon={<Settings />} title="Base de données non connectée" text="La gestion sera disponible dès que la base de données sera configurée." /></Container>;
  return <GestionConsole />;
}

function GestionConsole() {
  const navigate = useNavigate();
  const go = (id: string) => navigate("/gestion?s=" + id, { replace: true });
  const sections = [
    { id: "dash", label: "Tableau de bord", icon: <LayoutDashboard />, element: <div className="space-y-6"><VisitStats /><Dashboard go={go} /></div> },
    { id: "agenda", label: "Agenda", icon: <CalendarDays />, element: <div className="space-y-6"><CalendarSync /><Agenda /></div> },
    { id: "clients", label: "Clients", icon: <Users />, element: <Clients /> },
    { id: "messages", label: "Messages", icon: <Mail />, element: <Messages /> },
    { id: "orders", label: "Commandes", icon: <ShoppingBag />, element: <Orders /> },
    { id: "news", label: "Newsletter", icon: <Newspaper />, element: <NewsletterAdmin supabase={supabase} /> },
    { id: "reviews", label: "Avis", icon: <Star />, element: <Moderation /> },
  ];
  return <AdminConsole title="Gestion" seo={false} sections={sections} actions={<ButtonLink to="/admin" variant="outline"><Settings className="h-4 w-4" />Réglages du site</ButtonLink>} />;
}

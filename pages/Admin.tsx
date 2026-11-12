import React, { useEffect, useState } from "react";
import { BarChart3, FileText, Sparkles, CalendarDays, Clock, PhoneCall, BookOpen, Newspaper, Quote, MapPin, Bell, Share2, Scale, Shield, Star, Mail, Plus, Pencil, Trash2, Copy, Download, XCircle, Phone, Ticket, Image as ImageIcon, RotateCcw, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { useSeo } from "../lib/seo";
import { LEGAL_PAGES, legalDefaultText, type LegalKind } from "../lib/legal";
import { NotificationSettings, notify } from "../lib/notify";
import { ReviewsAdmin, NewsletterAdmin, releaseWaitlist } from "../lib/engage";
import { ImageEditor, uploadImage } from "../lib/image-editor";
import { supabase, isConfigured } from "../lib/supabase";
import { useApp, ListEditor, money, fmtDate, addressLine } from "../lib/data";
import { SETTING_GROUPS } from "../lib/defaults";
import { AdminConsole, AdminsManager, CrudTable, VisitStats, type Column, WeeklyPlanner } from "../lib/admin";
import { Badge, Button, ButtonLink, Card, Container, Dialog, EmptyState, Field, Input, Select, Switch, Textarea, Skeleton, cn, buttonClass, toast } from "../components/ui";
import { AddressInput } from "../lib/ui";
import { LEGAL_KINDS, phoneHref } from "../components/Layout";

type F = { k: string; label: string; type?: "text" | "textarea" | "number" | "money" | "bool" | "datetime" | "select" | "image" | "modes" | "address"; options?: [string, string][]; hint?: string };

const SAVE_ERR = "Enregistrement impossible, réessayez.";
const toLocal = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const csv = (rows: any[], name: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob(["\ufeff" + [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
};

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value ? <img src={value} alt="Aperçu" className="h-20 w-auto max-w-full rounded-xl border border-neutral-200 dark:border-neutral-800" /> : <div className="h-20 w-28 rounded-xl bg-neutral-100 dark:bg-neutral-800 grid place-items-center"><ImageIcon className="h-6 w-6 text-[var(--brand)]" /></div>}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Envoyer une image</Button>
      {value && <Button size="sm" variant="ghost" onClick={() => onChange("")}>Retirer</Button>}
      <ImageEditor open={open} onClose={() => setOpen(false)} aspect={3 / 2} onSave={async ({ blob }: any) => { const url = await uploadImage(supabase, blob); onChange(url); setOpen(false); }} />
    </div>
  );
}

function FieldInput({ f, v, set }: { f: F; v: any; set: (v: any) => void }) {
  switch (f.type) {
    case "textarea": return <Textarea value={v ?? ""} onChange={(e) => set(e.target.value)} />;
    case "number": return <Input type="number" inputMode="numeric" value={v ?? ""} onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))} />;
    case "money": return <div className="relative"><Input type="number" step="0.01" inputMode="decimal" value={v == null ? "" : v / 100} onChange={(e) => set(e.target.value === "" ? 0 : Math.round(Number(e.target.value) * 100))} className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">€</span></div>;
    case "bool": return <Switch checked={!!v} onChange={set} label={v ? "Oui" : "Non"} />;
    case "datetime": return <Input type="datetime-local" value={toLocal(v)} onChange={(e) => set(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case "select": return <Select value={v ?? ""} onChange={(e) => set(e.target.value || null)}><option value="">—</option>{f.options?.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</Select>;
    case "image": return <ImageField value={v || ""} onChange={set} />;
    case "modes": return <div className="flex flex-wrap gap-2">{[["cabinet", "Au cabinet"], ["distance", "À distance"], ["visio", "En visio"]].map(([m, l]) => { const on = (v || []).includes(m); return <button key={m} type="button" onClick={() => set(on ? v.filter((x: string) => x !== m) : [...(v || []), m])} className={cn("min-h-11 px-4 rounded-xl border text-sm", on ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300")}>{l}</button>; })}</div>;
    default: return <Input value={v ?? ""} onChange={(e) => set(e.target.value)} />;
  }
}

function show(f: F, v: any) {
  if (v == null || v === "") return "—";
  if (f.type === "money") return money(v);
  if (f.type === "bool") return v ? "Oui" : "Non";
  if (f.type === "datetime") return fmtDate(v, "fr", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  if (f.type === "select") return f.options?.find(([a]) => a === v)?.[1] || v;
  if (f.type === "image") return "Image";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

/** Tableau de gestion d'une table : celui d'Usin (recherche, fenêtre d'édition, export, actions par ligne). */
const MODES: [string, string][] = [["cabinet", "Au cabinet"], ["distance", "À distance"], ["visio", "En visio"]];
const TYPE_MAP: Record<string, Column["type"]> = { address: "address", textarea: "textarea", number: "number", money: "money", bool: "boolean", datetime: "datetime", select: "select", image: "image", modes: "multi" };
function Crud({ table, title, fields, cols, select = "*", order = "created_at", asc = false, defaults = {}, actions, label, noCreate, where }: { table: string; title: string; fields: F[]; cols?: string[]; select?: string; order?: string; asc?: boolean; defaults?: any; where?: Record<string, string | number | boolean>; actions?: (r: any, reload: () => void) => React.ReactNode; label?: (r: any) => React.ReactNode; noCreate?: boolean }) {
  const columns: Column[] = fields.map((f) => ({
    key: f.k,
    label: f.label,
    hint: f.hint,
    type: f.type ? TYPE_MAP[f.type] ?? "text" : "text",
    options: (f.type === "modes" ? MODES : f.options)?.map(([value, l]) => ({ value, label: l })),
    list: cols ? cols.includes(f.k) : undefined,
  }));
  return <CrudTable table={table} title={title} columns={columns} select={select} orderBy={order} ascending={asc} defaults={defaults} actions={actions} label={label} noCreate={noCreate} where={where} />;
}

const KINDS: [string, string][] = [["soin", "Soin"], ["numerologie", "Numérologie"], ["formation", "Formation"], ["atelier", "Atelier"], ["meditation", "Méditation"]];

function useOptions(table: string, labelFn: (r: any) => string, select = "*") {
  const [o, setO] = useState<[string, string][]>([]);
  useEffect(() => { supabase.from(table).select(select).then(({ data }) => setO((data || []).map((r: any) => [r.id, labelFn(r)]))); }, [table]);
  return o;
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Accueil", "/soins-energetiques": "Soins énergétiques (par où commencer)", "/qui-suis-je": "Qui suis-je ?", "/soins": "Soins", "/formations": "Formations", "/ateliers": "Ateliers",
  "/agenda": "Agenda", "/blog": "Blog", "/temoignages": "Témoignages", "/e-books": "E-books", "/contact": "Contact", "/rendez-vous": "Prendre rendez-vous", "/avis": "Avis",
  "/compte": "Espace client", "/paiement/merci": "Confirmation de paiement", "/mentions-legales": "Mentions légales", "/confidentialite": "Confidentialité", "/conditions": "Conditions de vente", "/conditions-utilisation": "Conditions d'utilisation",
};
const prettySlug = (s: string) => decodeURIComponent(s).replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
function pageName(p: string, titles: Record<string, string>) {
  if (PAGE_NAMES[p]) return PAGE_NAMES[p];
  const m = p.match(/^\/([^/]+)\/([^/]+)$/);
  if (m) { const base = PAGE_NAMES["/" + m[1]] || prettySlug(m[1]); if (m[1] === "inscription") return "Inscription à une session"; return `${base} › ${titles[m[2]] || prettySlug(m[2])}`; }
  return prettySlug(p.replace(/^\//, "")) || "Accueil";
}

function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [n, setN] = useState(0);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    const now = new Date(); const d7 = new Date(+now - 7 * 864e5).toISOString(); const d30 = new Date(+now - 30 * 864e5).toISOString();
    const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    Promise.all([
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", d7),
      supabase.from("page_views").select("path").gte("created_at", d30).limit(5000),
      supabase.from("stripe_payments").select("amount,created_at,description"),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("appointments").select("*, offering:offerings(title), slot:availability_slots(starts_at)").in("status", ["new", "confirmed"]).order("created_at", { ascending: false }).limit(30),
      supabase.from("registrations").select("*, session:sessions(starts_at, offering:offerings(title))").order("created_at", { ascending: false }).limit(8),
      supabase.from("sessions").select("*, offering:offerings(title)").gte("starts_at", now.toISOString()).neq("status", "cancelled").order("starts_at").limit(8),
      supabase.from("offerings").select("slug,title"),
      supabase.from("posts").select("slug,title"),
      supabase.from("ebooks").select("slug,title"),
    ]).then(([v7, v30, pay, fb, apt, reg, ses, of, po, eb]) => {
      const titles: Record<string, string> = {}; [...(of.data || []), ...(po.data || []), ...(eb.data || [])].forEach((x: any) => x?.slug && (titles[x.slug] = x.title));
      const counts: Record<string, number> = {}; (v30.data || []).forEach((r: any) => { const k = pageName(r.path, titles); counts[k] = (counts[k] || 0) + 1; });
      const p = pay.data || [];
      setD({ v7: v7.count || 0, v30: (v30.data || []).length, top: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6), total: p.reduce((s: number, x: any) => s + (x.amount || 0), 0), month: p.filter((x: any) => x.created_at >= month).reduce((s: number, x: any) => s + (x.amount || 0), 0), fb: fb.data || [], apt: apt.data || [], reg: reg.data || [], ses: ses.data || [] });
    }).catch(() => setD({ v7: 0, v30: 0, top: [], total: 0, month: 0, fb: [], apt: [], reg: [], ses: [] }));
  }, [n]);
  const resetStats = async () => {
    if (!confirm("Remettre les statistiques de visites à zéro ? Toutes les visites enregistrées seront effacées définitivement.")) return;
    setResetting(true);
    const { error } = await supabase.from("page_views").delete().gte("created_at", "1970-01-01");
    setResetting(false);
    if (error) toast("Remise à zéro impossible, réessayez.", "error"); else { toast("Statistiques remises à zéro."); setN((x) => x + 1); }
  };
  if (!d) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  const kpi = [["Visites (7 jours)", d.v7], ["Visites (30 jours)", d.v30], ["Ventes du mois", money(d.month)], ["Revenus totaux", money(d.total)]];
  const callbacks = d.apt.filter((a: any) => a.type === "callback" && a.status === "new");
  const upcoming = d.apt.filter((a: any) => a.slot).sort((a: any, b: any) => a.slot.starts_at.localeCompare(b.slot.starts_at));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{kpi.map(([l, v]) => <Card key={l} className="p-5"><p className="text-sm text-neutral-600 dark:text-neutral-400">{l}</p><p className="text-2xl font-bold text-[var(--brand)] dark:text-neutral-100 mt-1">{v}</p></Card>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Vos propres visites (aperçu, appareils où vous êtes connectée) ne sont pas comptées.</p>
        <Button size="sm" variant="outline" loading={resetting} onClick={resetStats}><RotateCcw className="h-4 w-4" />Remettre les statistiques à zéro</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3"><h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Demandes de rappel à traiter ({callbacks.length})</h3>
          {callbacks.length ? callbacks.map((a: any) => <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0 text-neutral-800 dark:text-neutral-200">{a.first_name} {a.last_name} · {a.offering?.title}</span><a href={phoneHref(a.phone)} className="text-[var(--brand)] font-medium">{a.phone}</a></div>) : <p className="text-sm text-neutral-500">Aucune demande en attente.</p>}</Card>
        <Card className="p-5 space-y-3"><h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Prochains rendez-vous</h3>
          {upcoming.length ? upcoming.slice(0, 6).map((a: any) => <p key={a.id} className="text-sm text-neutral-800 dark:text-neutral-200">{fmtDate(a.slot.starts_at)} · {a.first_name} {a.last_name} · {a.offering?.title}</p>) : <p className="text-sm text-neutral-500">Aucun rendez-vous à venir.</p>}</Card>
        <Card className="p-5 space-y-3"><h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Remplissage des sessions</h3>
          {d.ses.length ? d.ses.map((s: any) => { const pct = Math.round(100 * (s.seats_taken || 0) / Math.max(1, s.capacity)); return <div key={s.id} className="space-y-1"><p className="text-sm text-neutral-800 dark:text-neutral-200">{s.offering?.title} · {fmtDate(s.starts_at, "fr", { day: "numeric", month: "short" })} · {s.seats_taken}/{s.capacity}</p><div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: pct + "%" }} /></div></div>; }) : <p className="text-sm text-neutral-500">Aucune session programmée.</p>}</Card>
        <Card className="p-5 space-y-3"><h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Pages les plus vues (30 jours)</h3>
          {d.top.length ? d.top.map(([p, n]: any) => <div key={p} className="flex justify-between gap-3 text-sm text-neutral-800 dark:text-neutral-200"><span className="truncate min-w-0">{p}</span><span className="shrink-0 font-medium text-[var(--brand)] dark:text-neutral-100">{n}</span></div>) : <p className="text-sm text-neutral-500">Pas encore de visites mesurées.</p>}</Card>
        <Card className="p-5 space-y-3"><h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Inscriptions récentes</h3>
          {d.reg.length ? d.reg.map((r: any) => <p key={r.id} className="text-sm text-neutral-800 dark:text-neutral-200">{r.session?.offering?.title} · {money(r.amount_cents)} · {r.status === "paid" ? "Payée" : r.status}</p>) : <p className="text-sm text-neutral-500">Aucune inscription.</p>}</Card>
        <Card className="p-5 space-y-3"><h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Derniers avis sur le site</h3>
          {d.fb.length ? d.fb.map((f: any) => <p key={f.id} className="text-sm text-neutral-800 dark:text-neutral-200"><span className="text-[var(--brand)]">{"★".repeat(f.note)}</span> {f.message}</p>) : <p className="text-sm text-neutral-500">Aucun avis.</p>}</Card>
      </div>
    </div>
  );
}

const PRICE_KEYS: string[] = [];

function Content() {
  const app = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const group = SETTING_GROUPS.find((g) => g.title === open);
  const start = (title: string) => { const g = SETTING_GROUPS.find((x) => x.title === title)!; const d: any = {}; g.fields.forEach((f) => (d[f.key] = app.get(f.key))); setDraft(d); setOpen(title); };
  const save = async () => {
    setBusy(true);
    try { for (const f of group!.fields) { const v = draft[f.key]; if (v === "" || v == null) await app.remove(f.key); else await app.save(f.key, f.type === "bool" ? String(!!v === true || v === "true") : f.type === "number" ? String(v) : v); } setOpen(null); toast("Modifications enregistrées."); } catch { toast(SAVE_ERR, "error"); }
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Informations du site</h2>
      <p className="rounded-xl bg-[var(--brand)]/10 p-4 text-sm text-neutral-800 dark:text-neutral-200">Les textes, images et sections des pages se modifient directement sur le site : icône bouclier → « Modifier la page », puis touchez un texte ou une image. Ici : les informations de l'activité, utilisées partout sur le site.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{SETTING_GROUPS.map((g) => <Card key={g.title} className="p-5 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{g.title}</p><p className="text-sm text-neutral-500">{g.fields.length} éléments</p></div><Button size="sm" variant="secondary" onClick={() => start(g.title)}><Pencil className="h-4 w-4" />Modifier</Button></Card>)}</div>
      <Dialog open={!!group} onClose={() => setOpen(null)} wide title={group?.title || ""} footer={<><Button variant="ghost" onClick={() => setOpen(null)}>Annuler</Button><Button loading={busy} onClick={save}>Enregistrer</Button></>}>
        {group?.fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === "textarea" ? <Textarea value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
              : f.type === "bool" ? <Switch checked={String(draft[f.key]) === "true"} onChange={(v) => setDraft({ ...draft, [f.key]: v ? "true" : "false" })} label={String(draft[f.key]) === "true" ? "Oui" : "Non"} />
              : f.type === "list" ? <ListEditor items={Array.isArray(draft[f.key]) ? draft[f.key] : []} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
              : f.type === "image" ? <ImageField value={draft[f.key] || ""} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
              : f.type === "number" ? (PRICE_KEYS.includes(f.key)
                ? <div className="relative"><Input type="number" inputMode="decimal" value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">€</span></div>
                : <Input type="number" inputMode="decimal" value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />)
              : f.type === "address" ? <AddressInput value={draft[f.key] ?? ""} onChange={(v) => setDraft((d: any) => ({ ...d, [f.key]: v }))} onPick={(a) => setDraft((d: any) => ({ ...d, [f.key]: a.street || a.line, "biz.postal": a.postcode || d["biz.postal"], "biz.city": a.city || d["biz.city"], "biz.country": a.country || d["biz.country"] }))} />
              : f.key === "booking.mode" ? <Select value={draft[f.key] || "slots"} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}><option value="slots">Créneaux du site</option><option value="calendly">Lien Calendly externe</option></Select>
              : <Input value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />}
          </Field>
        ))}
      </Dialog>
    </div>
  );
}

/** Prices of one offer, opened from its row (an offer and its prices are edited together). */
function OfferPrices({ offer }: { offer: any }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Tarifs</Button>
      <Dialog open={open} onClose={() => setOpen(false)} wide title={`Tarifs · ${offer.title}`}>
        <Crud table="offering_prices" title="Tarifs de l'offre" where={{ offering_id: offer.id }} order="sort_order" asc cols={["label", "amount_cents"]} defaults={{ sort_order: 0 }}
          fields={[{ k: "label", label: "Libellé (ex. 1 séance, 4 séances)" }, { k: "amount_cents", label: "Prix", type: "money" }, { k: "sort_order", label: "Ordre", type: "number" }]} />
      </Dialog>
    </>
  );
}

function Offers() {
  return (
    <div className="space-y-10">
      <Crud table="offerings" title="Offres et leurs tarifs" order="sort_order" asc cols={["title", "kind", "is_published"]} actions={(r) => <OfferPrices offer={r} />} defaults={{ kind: "soin", modes: ["cabinet"], is_published: true, sort_order: 50 }}
        fields={[{ k: "title", label: "Titre" }, { k: "slug", label: "Adresse de la page (ex. soin-energetique)" }, { k: "kind", label: "Catégorie", type: "select", options: KINDS }, { k: "summary", label: "Résumé", type: "textarea" }, { k: "body", label: "Description complète", type: "textarea" }, { k: "deposit_cents", label: "Acompte de cette offre en € (vide = acompte par défaut des Informations, 0 = pas d'acompte)", type: "money" }, { k: "duration_label", label: "Durée (ex. 1h30)" }, { k: "modes", label: "Modalités", type: "modes" }, { k: "image_url", label: "Image", type: "image" }, { k: "is_bookable_slot", label: "Réservable sur créneau", type: "bool" }, { k: "is_published", label: "Publiée", type: "bool" }, { k: "sort_order", label: "Ordre d'affichage", type: "number" }]} />
    </div>
  );
}

/** Places of the agenda: the site's address first, then those added in « Lieux ». */
function usePlaces(): [string, string][] {
  const app = useApp();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("places").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setRows(data || [])); }, []);
  const home = addressLine(app.settings, app.get);
  return [[home, `Cabinet – ${home}`], ...rows.map((p): [string, string] => { const line = p.address ? `${p.name}, ${p.address}` : p.name; return [line, p.address ? `${p.name} – ${p.address}` : p.name]; })];
}

function Places() {
  return <Crud table="places" title="Lieux" order="sort_order" asc cols={["address", "is_active"]} label={(r) => r.name} defaults={{ is_active: true, sort_order: 10 }}
    fields={[{ k: "name", label: "Nom du lieu (ex. Salle Zen, En plein air)" }, { k: "address", label: "Adresse (tapez pour voir les propositions)", type: "address" }, { k: "is_active", label: "Proposé dans l'agenda", type: "bool" }, { k: "sort_order", label: "Position dans la liste (1 = en premier)", type: "number" }]} />;
}

function Sessions() {
  const app = useApp();
  const places = usePlaces();
  const offs = useOptions("offerings", (r) => r.title);
  const prices = useOptions("offering_prices", (r) => `${r.offering?.title} – ${r.label} (${money(r.amount_cents)})`, "*, offering:offerings(title)");
  const dup = async (r: any, reload: () => void) => { const { id, created_at, offering, seats_taken, ...rest } = r; const add = (s: string) => new Date(+new Date(s) + 7 * 864e5).toISOString(); const { error } = await supabase.from("sessions").insert({ ...rest, starts_at: add(r.starts_at), ends_at: add(r.ends_at), seats_taken: 0, status: "open" }); if (error) toast("Duplication impossible, réessayez.", "error"); else { toast("Session dupliquée."); releaseWaitlist(r.offering_id, { service: offering?.title, date: add(r.starts_at), url: "/agenda" }, supabase); } reload(); };
  const regs = async (r: any) => { const { data } = await supabase.from("registrations").select("status, amount_cents, created_at, profile:profiles(first_name,last_name,email,phone)").eq("session_id", r.id); csv((data || []).map((x: any) => ({ prenom: x.profile?.first_name, nom: x.profile?.last_name, email: x.profile?.email, telephone: x.profile?.phone, statut: x.status, montant: (x.amount_cents / 100).toFixed(2), date: x.created_at })), "inscrits.csv"); };
  const cancel = async (r: any, reload: () => void) => {
    if (!confirm("Annuler cette session et prévenir les inscrits ?")) return;
    await supabase.from("sessions").update({ status: "cancelled" }).eq("id", r.id);
    const { data } = await supabase.from("registrations").select("id, profile:profiles(first_name,last_name,email)").eq("session_id", r.id).in("status", ["paid", "pending"]);
    (data || []).forEach((x: any) => notify("booking.cancelled", { name: `${x.profile?.first_name || ""} ${x.profile?.last_name || ""}`, email: x.profile?.email, service: r.offering?.title, date: r.starts_at, reference: x.id, url: "/compte" }, supabase));
    reload();
  };
  return <Crud table="sessions" title="Agenda / Sessions" order="starts_at" select="*, offering:offerings(title)" label={(r) => `${r.offering?.title || "Session"} · ${show({ k: "", label: "", type: "datetime" }, r.starts_at)}`} cols={["seats_taken", "capacity", "status"]}
    defaults={{ capacity: 10, seats_taken: 0, status: "open", is_online: false, location: addressLine(app.settings, app.get) }}
    actions={(r, reload) => <><Button size="sm" variant="ghost" onClick={() => dup(r, reload)}><Copy className="h-4 w-4" />+7 jours</Button><Button size="sm" variant="ghost" onClick={() => regs(r)}><Download className="h-4 w-4" />Inscrits</Button>{r.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => cancel(r, reload)}><XCircle className="h-4 w-4" />Annuler</Button>}</>}
    fields={[{ k: "offering_id", label: "Offre", type: "select", options: offs }, { k: "price_id", label: "Tarif", type: "select", options: prices }, { k: "starts_at", label: "Début", type: "datetime" }, { k: "ends_at", label: "Fin", type: "datetime" }, { k: "location", label: "Lieu (liste modifiable dans « Lieux »)", type: "select", options: places }, { k: "is_online", label: "En ligne", type: "bool" }, { k: "capacity", label: "Nombre de places", type: "number" }, { k: "seats_taken", label: "Places prises", type: "number" }, { k: "co_host", label: "Co-animatrice" }, { k: "status", label: "Statut", type: "select", options: [["open", "Ouverte"], ["full", "Complète"], ["cancelled", "Annulée"]] }, { k: "is_featured", label: "Mise en avant", type: "bool" }]} />;
}

function Slots() {
  const places = usePlaces();
  const [loc, setLoc] = useState("");
  const [mode, setMode] = useState("cabinet");
  const [n, setN] = useState(0);
  return (
    <div className="space-y-6">
      <WeeklyPlanner
        onCreate={async (slots) => {
          const { error } = await supabase.from("availability_slots").insert(slots.map((x) => ({ starts_at: x.start, ends_at: x.end, mode, is_booked: false, location: loc || null })));
          if (error) throw new Error(error.message);
          setN((v) => v + 1);
        }}
        extra={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Lieu"><Select value={loc} onChange={(e) => setLoc(e.target.value)}><option value="">Cabinet (adresse du site)</option>{places.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Mode"><Select value={mode} onChange={(e) => setMode(e.target.value)}><option value="cabinet">Au cabinet</option><option value="distance">À distance</option><option value="visio">En visio</option></Select></Field>
          </div>
        }
      />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">Pour bloquer des congés, supprimez les créneaux concernés ou cochez « Réservé ».</p>
      <Crud key={n} table="availability_slots" title="Créneaux de disponibilité" order="starts_at" asc label={(r) => show({ k: "", label: "", type: "datetime" }, r.starts_at)} cols={["mode", "is_booked"]} defaults={{ mode: "cabinet", is_booked: false }}
        fields={[{ k: "starts_at", label: "Début", type: "datetime" }, { k: "ends_at", label: "Fin", type: "datetime" }, { k: "mode", label: "Mode", type: "select", options: [["cabinet", "Au cabinet"], ["distance", "À distance"], ["visio", "En visio"]] }, { k: "location", label: "Lieu (vide = cabinet ; liste dans « Lieux »)", type: "select", options: places }, { k: "is_booked", label: "Réservé / bloqué", type: "bool" }]} />
    </div>
  );
}

function Appointments() {
  const setStatus = async (r: any, s: string, reload: () => void) => { await supabase.from("appointments").update({ status: s }).eq("id", r.id); if (s === "cancelled" && r.slot_id) await supabase.from("availability_slots").update({ is_booked: false }).eq("id", r.slot_id); if (s === "cancelled") notify("booking.cancelled", { name: `${r.first_name} ${r.last_name}`, email: r.email, service: r.offering?.title, date: r.slot?.starts_at, reference: r.id, url: "/compte" }, supabase); reload(); };
  return <Crud table="appointments" title="Rendez-vous et demandes de rappel" noCreate select="*, offering:offerings(title), slot:availability_slots(starts_at)"
    label={(r) => `${r.first_name} ${r.last_name} · ${r.offering?.title || ""} · ${r.type === "callback" ? "À rappeler" : r.slot ? fmtDate(r.slot.starts_at) : ""}`} cols={["status", "phone", "email"]}
    actions={(r, reload) => <><ButtonLink to={phoneHref(r.phone)} variant="ghost" size="sm"><Phone className="h-4 w-4" />Appeler</ButtonLink><ButtonLink to={`mailto:${r.email}?subject=${encodeURIComponent("Votre rendez-vous")}`} variant="ghost" size="sm"><Mail className="h-4 w-4" />Email</ButtonLink>
      <Select value={r.status} onChange={(e) => setStatus(r, e.target.value, reload)} className="!w-auto !h-10 text-sm"><option value="new">Nouveau</option><option value="confirmed">Confirmé</option><option value="done">Terminé</option><option value="cancelled">Annulé</option></Select></>}
    fields={[{ k: "first_name", label: "Prénom" }, { k: "last_name", label: "Nom" }, { k: "email", label: "Email" }, { k: "phone", label: "Téléphone" }, { k: "status", label: "Statut", type: "select", options: [["new", "Nouveau"], ["confirmed", "Confirmé"], ["done", "Terminé"], ["cancelled", "Annulé"]] }, { k: "message", label: "Message", type: "textarea" }]} />;
}

function Ebooks() {
  const [n, setN] = useState(0);
  const upload = async (r: any, file: File) => { const path = `${r.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`; const { error } = await supabase.storage.from("ebooks").upload(path, file, { contentType: "application/pdf" }); if (error) { toast("Envoi du PDF impossible, réessayez.", "error"); return; } await supabase.from("ebooks").update({ file_path: path }).eq("id", r.id); toast("Fichier PDF enregistré."); setN(n + 1); };
  return <Crud key={n} table="ebooks" title="E-books" cols={["price_cents", "is_published"]} label={(r) => `${r.title}${r.file_path ? "" : " (PDF manquant)"}`} defaults={{ price_cents: 1200, is_published: false }}
    actions={(r) => <label className={buttonClass("ghost", "sm", "cursor-pointer")}><Download className="h-4 w-4 rotate-180" />Envoyer le PDF<input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(r, e.target.files[0])} /></label>}
    fields={[{ k: "title", label: "Titre" }, { k: "slug", label: "Adresse de la page" }, { k: "description", label: "Description", type: "textarea" }, { k: "cover_url", label: "Couverture", type: "image" }, { k: "price_cents", label: "Prix", type: "money" }, { k: "is_published", label: "Publié", type: "bool" }]} />;
}

function Waitlist() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("waitlist").select("*, offering:offerings(title)").order("created_at", { ascending: false }).then(({ data }) => setRows(data || [])); }, []);
  const groups = rows.reduce((m: any, r: any) => { (m[r.offering?.title || "—"] ||= []).push(r.email); return m; }, {});
  return (
    <div className="space-y-4"><h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Liste d'attente</h2>
      {!rows.length ? <EmptyState title="Personne n'attend de date pour le moment" /> : Object.entries(groups).map(([t, emails]: any) => (
        <Card key={t} className="p-5 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{t}</p><p className="text-sm text-neutral-600 dark:text-neutral-400">{emails.length} personne(s)</p></div>
          <ButtonLink variant="primary" size="sm" to={`mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent("Nouvelle date : " + t)}`}><Mail className="h-4 w-4" />Prévenir tout le monde</ButtonLink></Card>
      ))}
    </div>
  );
}

type LegalSection = { title: string; body: string };
const toSections = (text: string): LegalSection[] => String(text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
  const [first, ...rest] = b.split("\n");
  return rest.length && first.length < 90 ? { title: first.replace(/^#+\s*/, ""), body: rest.join("\n") } : { title: "", body: b };
});
const fromSections = (s: LegalSection[]) => s.filter((x) => x.title.trim() || x.body.trim()).map((x) => (x.title.trim() ? x.title.trim() + "\n" : "") + x.body.trim()).join("\n\n");

function Legal() {
  const app = useApp();
  const [kind, setKind] = useState<LegalKind | null>(null);
  const [secs, setSecs] = useState<LegalSection[]>([]);
  const [busy, setBusy] = useState(false);
  const move = (i: number, d: number) => { const n = [...secs]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setSecs(n); };
  const upd = (i: number, p: Partial<LegalSection>) => setSecs(secs.map((s, j) => (j === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-4"><h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Pages légales</h2>
      {LEGAL_KINDS.map((k) => <Card key={k} className="p-5 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium text-neutral-900 dark:text-neutral-100">{LEGAL_PAGES[k].title}</p><p className="text-sm text-neutral-500">{app.settings["legal_" + k] ? "Texte personnalisé" : "Texte par défaut"}</p></div><Button size="sm" variant="secondary" onClick={() => { setKind(k); setSecs(toSections(app.settings["legal_" + k] || legalDefaultText(k))); }}><Pencil className="h-4 w-4" />Modifier</Button></Card>)}
      <Dialog open={!!kind} onClose={() => setKind(null)} wide title={kind ? LEGAL_PAGES[kind].title : ""} footer={<>
        <Button variant="ghost" onClick={async () => { try { await app.remove("legal_" + kind); toast("Texte par défaut rétabli."); } catch { toast(SAVE_ERR, "error"); } setKind(null); }}>Revenir au texte par défaut</Button>
        <Button loading={busy} onClick={async () => { setBusy(true); try { await app.save("legal_" + kind, fromSections(secs)); setKind(null); toast("Page enregistrée."); } catch { toast(SAVE_ERR, "error"); } setBusy(false); }}>Enregistrer</Button></>}>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Chaque bloc correspond à une partie de la page. Modifiez le titre et le texte, ajoutez ou réorganisez les parties.</p>
        {secs.map((s, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--brand)] dark:text-neutral-300">Partie {i + 1}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label="Monter" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Descendre" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => setSecs(secs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" />Supprimer</Button>
              </div>
            </div>
            <Field label="Titre de la partie (facultatif)"><Input value={s.title} onChange={(e) => upd(i, { title: e.target.value })} /></Field>
            <Field label="Texte"><Textarea value={s.body} onChange={(e) => upd(i, { body: e.target.value })} /></Field>
          </Card>
        ))}
        <Button variant="outline" onClick={() => setSecs([...secs, { title: "", body: "" }])}><Plus className="h-4 w-4" />Ajouter une partie</Button>
      </Dialog>
    </div>
  );
}

function Rgpd() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const ok = /^\S+@\S+\.\S+$/.test(email.trim());
  const exp = async () => { setBusy(true); const e = email.trim().toLowerCase(); const { data: prof } = await supabase.from("profiles").select("*").ilike("email", e); const uid = prof?.[0]?.id;
    const [apt, msgs, wl, reg, ord] = await Promise.all([supabase.from("appointments").select("*").ilike("email", e), supabase.from("contact_messages").select("*").ilike("email", e), supabase.from("waitlist").select("*").ilike("email", e), uid ? supabase.from("registrations").select("*").eq("user_id", uid) : { data: [] }, uid ? supabase.from("orders").select("*").eq("user_id", uid) : { data: [] }] as any);
    const blob = new Blob([JSON.stringify({ profile: prof, appointments: apt.data, contact_messages: msgs.data, waitlist: wl.data, registrations: reg.data, orders: ord.data }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "export-rgpd.json"; a.click(); setBusy(false); };
  const del = async () => { if (!confirm("Supprimer toutes les données de cette personne ? Les données comptables (paiements) sont conservées pendant la durée légale.")) return; setBusy(true); const { error } = await supabase.rpc("admin_delete_person", { p_email: email.trim() }); setBusy(false); setMsg(error ? "Suppression impossible, réessayez." : "Données supprimées."); };
  const purge = async () => { const { error } = await supabase.rpc("purge_old_contacts"); setMsg(error ? "Opération impossible, réessayez." : "Demandes de contact de plus de 12 mois supprimées."); };
  return (
    <Card className="p-5 space-y-4"><h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Données personnelles (RGPD)</h2>
      <Field label="Email de la personne"><Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!ok} loading={busy} onClick={exp}><Download className="h-4 w-4" />Exporter ses données</Button><Button variant="danger" disabled={!ok} loading={busy} onClick={del}><Trash2 className="h-4 w-4" />Supprimer ses données</Button><Button variant="ghost" onClick={purge}>Effacer les contacts de plus de 12 mois</Button></div>
      {msg && <p className="text-sm text-neutral-700 dark:text-neutral-300">{msg}</p>}
    </Card>
  );
}

const SECTIONS = [
  ["dash", "Tableau de bord", BarChart3, "Activité"], ["content", "Informations", FileText, "Activité"], ["offers", "Offres & tarifs", Sparkles, "Activité"], ["places", "Lieux", MapPin, "Activité"], ["slots", "Disponibilités", Clock, "Activité"], ["sessions", "Agenda", CalendarDays, "Activité"],
  ["apts", "Rendez-vous", PhoneCall, "Clients"], ["regs", "Inscriptions & ventes", Ticket, "Clients"], ["wait", "Liste d'attente", Bell, "Clients"], ["msgs", "Messages", Mail, "Clients"],
  ["posts", "Blog", Newspaper, "Contenus"], ["ebooks", "E-books", BookOpen, "Contenus"], ["tes", "Témoignages", Quote, "Contenus"], ["reviews", "Avis", Star, "Contenus"],
  ["news", "Newsletter", Mail, "Communication"], ["social", "Réseaux sociaux", Share2, "Communication"], ["notif", "Notifications", Bell, "Communication"],
  ["legal", "Pages légales", Scale, "Site et sécurité"], ["rgpd", "RGPD & bêta", Shield, "Site et sécurité"],
] as const;

export function AdminPage() {
  const app = useApp();
  if (!app.isAdmin) return <Container className="py-14"><EmptyState icon={<Shield />} title="Accès réservé à l'administratrice" text="Connectez-vous avec le compte administrateur." /></Container>;
  if (!isConfigured) return <Container className="py-14"><EmptyState icon={<Shield />} title="Base de données non connectée" text="L'administration sera disponible dès que la base de données sera configurée." /></Container>;
  const elements: Record<string, React.ReactNode> = {
    dash: <Dashboard />,
    content: <Content />,
    offers: <Offers />,
    sessions: <Sessions />,
    slots: <Slots />,
    apts: <Appointments />,
    regs: <div className="space-y-10">
          <Crud table="registrations" title="Inscriptions" noCreate select="*, session:sessions(starts_at, offering:offerings(title)), profile:profiles(email)" label={(r) => `${r.session?.offering?.title || ""} · ${r.profile?.email || ""}`} cols={["status", "amount_cents"]} fields={[{ k: "status", label: "Statut", type: "select", options: [["pending", "En attente"], ["paid", "Payée"], ["cancelled", "Annulée"], ["refunded", "Remboursée"]] }, { k: "amount_cents", label: "Montant", type: "money" }]} />
          <Crud table="orders" title="Commandes" noCreate select="*, ebook:ebooks(title), profile:profiles(email)" label={(r) => `${r.item_type === "ebook" ? "E-book " + (r.ebook?.title || "") : r.item_type === "meditation_card" ? "Carnet de méditations" : "Pack"} · ${r.profile?.email || ""}`} cols={["status", "amount_cents"]} fields={[{ k: "status", label: "Statut", type: "select", options: [["pending", "En attente"], ["paid", "Payée"], ["refunded", "Remboursée"]] }, { k: "amount_cents", label: "Montant", type: "money" }]} />
        </div>,
    ebooks: <Ebooks />,
    posts: <Crud table="posts" title="Articles du blog" order="published_at" cols={["category", "published_at", "is_published"]} defaults={{ category: "soins", is_published: false, published_at: new Date().toISOString() }}
          fields={[{ k: "title", label: "Titre" }, { k: "slug", label: "Adresse de la page" }, { k: "category", label: "Catégorie", type: "select", options: [["soins", "Soins énergétiques"], ["numerologie", "Numérologie"], ["reiki", "Reiki"], ["meditation", "Méditation"]] }, { k: "excerpt", label: "Résumé", type: "textarea" }, { k: "body", label: "Texte de l'article (laissez une ligne vide entre deux paragraphes)", type: "textarea" }, { k: "cover_url", label: "Image de couverture", type: "image" }, { k: "og_image_url", label: "Image de partage (1200×630)", type: "image" }, { k: "published_at", label: "Date de publication (planification possible)", type: "datetime" }, { k: "is_published", label: "Publié", type: "bool" }]} />,
    tes: <Crud table="testimonials" title="Témoignages" cols={["status", "consent_publish"]} label={(r) => `${r.author_name} : ${String(r.content).slice(0, 60)}…`} defaults={{ status: "approved", consent_publish: true }}
          actions={(r, reload) => r.status !== "approved" ? <Button size="sm" onClick={async () => { await supabase.from("testimonials").update({ status: "approved" }).eq("id", r.id); reload(); }}>Publier</Button> : null}
          fields={[{ k: "author_name", label: "Auteur" }, { k: "content", label: "Témoignage", type: "textarea" }, { k: "consent_publish", label: "Consentement de publication", type: "bool" }, { k: "status", label: "Statut", type: "select", options: [["pending", "En attente"], ["approved", "Publié"]] }]} />,
    reviews: <ReviewsAdmin supabase={supabase} />,
    places: <Places />,
    wait: <Waitlist />,
    msgs: <Crud table="contact_messages" title="Messages de contact" noCreate cols={["email", "handled"]} label={(r) => `${r.name} · ${r.subject || String(r.message).slice(0, 50)}`}
          actions={(r, reload) => <Button size="sm" variant="secondary" onClick={async () => { await supabase.from("contact_messages").update({ handled: !r.handled }).eq("id", r.id); reload(); }}>{r.handled ? "Marquer non traité" : "Marquer traité"}</Button>}
          fields={[{ k: "name", label: "Nom" }, { k: "email", label: "Email" }, { k: "handled", label: "Traité", type: "bool" }]} />,
    social: <Crud table="social_links" title="Réseaux sociaux" order="sort_order" asc cols={["network", "url", "is_active"]} defaults={{ is_active: true, sort_order: 1 }} fields={[{ k: "network", label: "Réseau (ex. Facebook)" }, { k: "url", label: "Adresse du profil" }, { k: "sort_order", label: "Ordre", type: "number" }, { k: "is_active", label: "Affiché", type: "bool" }]} />,
    news: <NewsletterAdmin supabase={supabase} />,
    notif: <NotificationSettings supabase={supabase} />,
    legal: <Legal />,
    rgpd: <div className="space-y-8"><Rgpd />
          <Card className="p-5"><Switch checked={app.flag("beta_mode")} onChange={(v) => app.save("beta_mode", v ? "true" : "false")} label="Bêta privée : l'inscription exige un code d'invitation" /></Card>
          <Crud table="beta_invites" title="Codes d'invitation" order="created_at" label={(r) => r.code} cols={["email"]} fields={[{ k: "code", label: "Code" }, { k: "email", label: "Email (facultatif)" }]} /></div>,
    admins: <AdminsManager />,
  };
  const sections = [...SECTIONS, ["admins", "Administrateurs", Shield, "Site et sécurité"] as const].map(([id, label, Icon, group]) => ({ id, label, icon: <Icon />, element: elements[id], group }));
  return <AdminConsole title="Réglages du site" sections={sections} actions={<ButtonLink to="/gestion" variant="outline">Gestion</ButtonLink>} />;
}

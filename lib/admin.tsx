// Injected by Usin (management console: layout, dashboard, data tables, texts, legal pages, administrators). Do not edit.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useContent, useData, invalidate } from "./content";
import { AddressInput, Badge, Button, Card, Container, Dialog, EmptyState, Field, Input, Select, Skeleton, Stat, Switch, Tabs, Textarea, cn, confirmAction, toast } from "./ui";
import { ImageEditor, uploadImage } from "./image-editor";
import { LEGAL_PAGES, legalDefaultText, type LegalKind } from "./legal";
import { useSeo } from "./seo";
import { env } from "./env";

const T: Record<string, Record<string, string>> = {
  fr: {
    seo: "Référencement Google", seoIntro: "Le titre et la description que Google affiche pour chaque page. Écrivez ce que vos clients tapent dans Google : votre activité et votre ville (ex. « Soins énergétiques à Bailleul »). Chaque page doit avoir les siens.",
    seoTitle: "Titre dans Google", seoDesc: "Description dans Google", seoReset: "Reprendre le texte d'origine", seoNone: "La liste des pages apparaît sur le site publié (après une publication).",
    seoTitleTip: "Idéal : 30 à 60 caractères", seoDescTip: "Idéal : 120 à 160 caractères", seoLive: "Appliqué tout de suite sur le site ; pris en compte par Google à son prochain passage.",
    add: "Ajouter", edit: "Modifier", del: "Supprimer", save: "Enregistrer", cancel: "Annuler", search: "Rechercher…", export: "Exporter",
    saved: "Enregistré ✓", deleted: "Supprimé ✓", delAsk: "Supprimer cet élément ?", empty: "Aucun élément pour le moment", emptyHint: "Ajoutez le premier avec le bouton « Ajouter ».",
    required: "Champ obligatoire", yes: "Oui", no: "Non", image: "Choisir une image", visits7: "Visites (7 jours)", visits30: "Visites (30 jours)",
    resetStats: "Remettre les statistiques à zéro", resetAsk: "Effacer toutes les visites enregistrées ?", ownVisits: "Vos propres visites (aperçu, appareils où vous êtes connecté) ne sont pas comptées.",
    admins: "Administrateurs", adminAdd: "Ajouter un administrateur", adminEmail: "Email de la personne (elle crée son compte avec ce même email)", you: "vous",
    viewAs: "Voir en tant que", asAdmin: "Admin", asClient: "Client", asVisitor: "Visiteur", content: "Textes du site", reset: "Revenir au texte par défaut",
    legal: "Pages légales", menu: "Menu",
  },
  en: {
    seo: "Google search", seoIntro: "The title and description Google shows for each page. Write what your customers type into Google: your activity and your town. Each page needs its own.",
    seoTitle: "Title in Google", seoDesc: "Description in Google", seoReset: "Back to the original text", seoNone: "The list of pages appears on the published site (after a publication).",
    seoTitleTip: "Best: 30 to 60 characters", seoDescTip: "Best: 120 to 160 characters", seoLive: "Applied on the site right away; taken into account by Google on its next visit.",
    add: "Add", edit: "Edit", del: "Delete", save: "Save", cancel: "Cancel", search: "Search…", export: "Export",
    saved: "Saved ✓", deleted: "Deleted ✓", delAsk: "Delete this item?", empty: "Nothing here yet", emptyHint: "Add the first one with the « Add » button.",
    required: "Required", yes: "Yes", no: "No", image: "Choose an image", visits7: "Visits (7 days)", visits30: "Visits (30 days)",
    resetStats: "Reset statistics", resetAsk: "Erase all recorded visits?", ownVisits: "Your own visits (preview, devices where you are signed in) are not counted.",
    admins: "Administrators", adminAdd: "Add an administrator", adminEmail: "Their email (they sign up with this same email)", you: "you",
    viewAs: "View as", asAdmin: "Admin", asClient: "Customer", asVisitor: "Visitor", content: "Site texts", reset: "Back to the default text",
    legal: "Legal pages", menu: "Menu",
  },
  nl: {
    add: "Toevoegen", edit: "Bewerken", del: "Verwijderen", save: "Opslaan", cancel: "Annuleren", search: "Zoeken…", export: "Exporteren",
    saved: "Opgeslagen ✓", deleted: "Verwijderd ✓", delAsk: "Dit element verwijderen?", empty: "Nog niets", emptyHint: "Voeg het eerste toe met de knop « Toevoegen ».",
    required: "Verplicht", yes: "Ja", no: "Nee", image: "Afbeelding kiezen", visits7: "Bezoeken (7 dagen)", visits30: "Bezoeken (30 dagen)",
    resetStats: "Statistieken op nul zetten", resetAsk: "Alle geregistreerde bezoeken wissen?", ownVisits: "Je eigen bezoeken (voorbeeld, toestellen waarop je bent ingelogd) tellen niet mee.",
    admins: "Beheerders", adminAdd: "Beheerder toevoegen", adminEmail: "Hun e-mailadres (ze maken een account met hetzelfde adres)", you: "jij",
    viewAs: "Bekijken als", asAdmin: "Beheerder", asClient: "Klant", asVisitor: "Bezoeker", content: "Teksten van de site", reset: "Terug naar de standaardtekst",
    legal: "Juridische pagina's", menu: "Menu",
  },
};
function useT() {
  const { lang } = useContent();
  return (k: string) => (T[lang] ?? T.en)[k] ?? T.fr[k] ?? k;
}

// ------------------------------------------------------------------ layout

export type AdminSection = { id: string; label: string; icon?: ReactNode; element: ReactNode; badge?: number; /** Heading the section is listed under (« Activité », « Clients »…): a long menu stays easy to scan. */ group?: string };

/**
 * A management space: menu of sections (column on computers, scrollable pills on phones) and the chosen section.
 * The chosen section is kept in the address (?s=…) so a reload or a shared link opens the same place.
 * <AdminConsole title="Gestion" sections={[{ id: "dashboard", label: "Tableau de bord", icon: <Gauge />, element: <… /> }, …]} actions={…} />
 */
export function AdminConsole({ title, sections: own, actions, seo = true }: { title: string; sections: AdminSection[]; actions?: ReactNode; /** false on a second console (daily management): Google titles stay in one place. */ seo?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tr = useT();
  // Every management space can write the Google titles of the pages (once, even if the app adds its own).
  const sections: AdminSection[] = !seo || own.some((s) => s.id === "seo") ? own : [...own, { id: "seo", label: tr("seo"), icon: <SearchIcon />, element: <SeoEditor />, group: own[own.length - 1]?.group }];
  useSeo({ title, noindex: true });
  const current = new URLSearchParams(location.search).get("s");
  const active = sections.find((s) => s.id === current) ?? sections[0];
  const go = (id: string) => {
    const params = new URLSearchParams(location.search);
    params.set("s", id);
    navigate(location.pathname + "?" + params.toString(), { replace: true });
    window.scrollTo({ top: 0 });
  };
  return (
    <Container className="py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-100">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="grid gap-6 md:grid-cols-[15rem_1fr]">
        <nav aria-label={title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:sticky md:top-24 md:mx-0 md:flex-col md:self-start md:overflow-visible md:px-0">
          {sections.map((s, i) => (
            <Fragment key={s.id}>
            {s.group && s.group !== sections[i - 1]?.group && (
              <p className="hidden px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 first:pt-0 md:block dark:text-neutral-400">{s.group}</p>
            )}
            <button
              type="button"
              onClick={() => go(s.id)}
              aria-current={s.id === active?.id ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-3 rounded-full px-4 text-sm font-medium transition md:min-h-10 md:rounded-2xl [&_svg]:size-5",
                s.id === active?.id
                  ? "bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-white/10 dark:text-neutral-100"
                  : "text-neutral-600 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/5",
              )}
            >
              {s.icon}
              <span className="whitespace-nowrap">{s.label}</span>
              {Boolean(s.badge) && <span className="ml-auto rounded-full bg-[var(--brand)] px-2 text-xs leading-5 text-white">{s.badge}</span>}
            </button>
            </Fragment>
          ))}
        </nav>
        <div className="min-w-0">{active?.element}</div>
      </div>
    </Container>
  );
}

/** Title of a section, with its actions on the right. */
export function SectionTitle({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {hint && <p className="text-sm text-neutral-600 dark:text-neutral-400">{hint}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ data tables

export type ColumnType = "text" | "textarea" | "number" | "money" | "date" | "datetime" | "boolean" | "select" | "multi" | "image" | "slug" | "email" | "url" | "tags" | "address";
export type Column = {
  key: string;
  label: string;
  type?: ColumnType;
  /** select / multi (several choices, stored as a list): the choices. */
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Shown in the list (default: the first three columns). */
  list?: boolean;
  /** Hidden in the form (computed column, id…). */
  readOnly?: boolean;
  hint?: string;
  /** slug: the column it is made from (default "title"). */
  from?: string;
};

type Row = Record<string, any>;

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

function display(col: Column, value: any, lang: string, tr: (k: string) => string): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-neutral-400">—</span>;
  switch (col.type) {
    case "money":
      return new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(Number(value) / 100);
    case "date":
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(value));
    case "datetime":
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    case "boolean":
      return value ? <Badge tone="success">{tr("yes")}</Badge> : <Badge tone="neutral">{tr("no")}</Badge>;
    case "select":
      return col.options?.find((o) => o.value === value)?.label ?? String(value);
    case "image":
      return <img src={String(value)} alt="" loading="lazy" className="size-12 rounded-xl object-cover" />;
    case "tags":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "multi":
      return (Array.isArray(value) ? value : [value]).map((v) => col.options?.find((o) => o.value === v)?.label ?? String(v)).join(", ");
    default:
      return <span className="line-clamp-2">{String(value)}</span>;
  }
}

const toInput = (col: Column, v: any) => {
  if (v === null || v === undefined) return col.type === "boolean" ? false : "";
  if (col.type === "money") return String(Number(v) / 100);
  if (col.type === "datetime") return new Date(v).toISOString().slice(0, 16);
  if (col.type === "date") return String(v).slice(0, 10);
  if (col.type === "tags") return Array.isArray(v) ? v.join(", ") : String(v);
  return v;
};
const isEmptyValue = (v: any) => v === "" || v === null || v === undefined || (Array.isArray(v) && !v.length);
const fromInput = (col: Column, v: any) => {
  if (col.type === "boolean") return Boolean(v);
  if (col.type === "multi") return Array.isArray(v) ? v : [];
  if (v === "" || v === undefined) return null;
  if (col.type === "money") return Math.round(Number(String(v).replace(",", ".")) * 100);
  if (col.type === "number") return Number(String(v).replace(",", "."));
  if (col.type === "datetime") return new Date(v).toISOString();
  if (col.type === "tags")
    return String(v)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  return v;
};

function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const tr = useT();
  const { supabase } = useContent();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value && <img src={value} alt="" className="size-16 rounded-2xl object-cover" />}
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!supabase}>
        {tr("image")}
      </Button>
      {supabase && (
        <ImageEditor
          open={open}
          onClose={() => setOpen(false)}
          aspect={4 / 3}
          onSave={async ({ blob }) => {
            onChange(await uploadImage(supabase, blob));
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RowForm({ columns, row, onChange }: { columns: Column[]; row: Row; onChange: (r: Row) => void }) {
  const tr = useT();
  return (
    <div className="space-y-4">
      {columns
        .filter((c) => !c.readOnly)
        .map((c) => {
          const v = row[c.key];
          const set = (val: any) => {
            const next = { ...row, [c.key]: val };
            const slugCol = columns.find((x) => x.type === "slug" && (x.from ?? "title") === c.key);
            if (slugCol && (!row[slugCol.key] || row[slugCol.key] === slugify(String(row[c.key] ?? "")))) next[slugCol.key] = slugify(String(val));
            onChange(next);
          };
          if (c.type === "boolean") return <Switch key={c.key} label={c.label} checked={Boolean(v)} onChange={set} />;
          return (
            <Field key={c.key} label={c.label + (c.required ? " *" : "")} hint={c.hint}>
              {c.type === "textarea" ? (
                <Textarea value={v ?? ""} onChange={(e) => set(e.target.value)} />
              ) : c.type === "address" ? (
                <AddressInput value={v ?? ""} onChange={(x) => set(x)} />
              ) : c.type === "select" ? (
                <Select value={v ?? ""} onChange={(e) => set(e.target.value)}>
                  <option value="">—</option>
                  {/* A value no longer in the list (renamed place, old choice…) stays shown and kept. */}
                  {v && !c.options?.some((o) => o.value === v) && <option value={String(v)}>{String(v)}</option>}
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : c.type === "multi" ? (
                <div className="flex flex-wrap gap-2">
                  {c.options?.map((o) => {
                    const list: string[] = Array.isArray(v) ? v : [];
                    const on = list.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set(on ? list.filter((x) => x !== o.value) : [...list, o.value])}
                        className={cn("min-h-10 rounded-full border px-4 text-sm font-medium transition", on ? "border-transparent bg-[var(--brand)] text-white" : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300")}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              ) : c.type === "image" ? (
                <ImageField value={v ?? ""} onChange={set} />
              ) : (
                <Input
                  value={v ?? ""}
                  onChange={(e) => set(e.target.value)}
                  inputMode={c.type === "money" || c.type === "number" ? "decimal" : undefined}
                  type={c.type === "date" ? "date" : c.type === "datetime" ? "datetime-local" : c.type === "email" ? "email" : c.type === "url" ? "url" : "text"}
                  placeholder={c.type === "tags" ? "a, b, c" : undefined}
                />
              )}
            </Field>
          );
        })}
      {columns.some((c) => c.required) && <p className="text-xs text-neutral-500">* {tr("required")}</p>}
    </div>
  );
}

/**
 * Complete management of a database table: list (cards on phones), search, add / edit in a window, delete with
 * confirmation, CSV export. The public pages reading it with useData(table, …) refresh automatically.
 * <CrudTable table="posts" title="Articles du blog" columns={[{ key: "title", label: "Titre", required: true }, { key: "slug", label: "Adresse", type: "slug" }, …]} orderBy="published_at" />
 */
export function CrudTable({
  table,
  title,
  hint,
  columns,
  orderBy = "created_at",
  ascending = false,
  select = "*",
  defaults = {},
  filter,
  where,
  label,
  actions,
  noCreate,
  limit = 500,
}: {
  table: string;
  title: string;
  hint?: string;
  columns: Column[];
  orderBy?: string;
  ascending?: boolean;
  select?: string;
  defaults?: Row;
  /** Narrows the rows, e.g. (q) => q.eq("kind", "atelier"). */
  filter?: (q: any) => any;
  /** Rows of one parent only, e.g. where={{ offering_id: offer.id }} (new rows get these values too). */
  where?: Record<string, string | number | boolean>;
  /** Main line of each row (default: the first column), e.g. (r) => r.offering?.title + " · " + r.email. */
  label?: (row: Row) => ReactNode;
  /** Buttons of each row (business actions): (row, reload) => <Button …/>. */
  actions?: (row: Row, reload: () => void) => ReactNode;
  /** Rows created elsewhere (bookings, messages…): no « Add » button, the window only edits. */
  noCreate?: boolean;
  limit?: number;
}) {
  const tr = useT();
  const { supabase, lang } = useContent();
  const key = "admin:" + table + ":" + (filter ? filter.toString() : "") + (where ? JSON.stringify(where) : "");
  const { data, loading, error } = useData<Row[]>(key, () => {
    let q: any = supabase!.from(table).select(select);
    for (const [k, v] of Object.entries(where ?? {})) q = q.eq(k, v);
    if (filter) q = filter(q);
    return q.order(orderBy, { ascending }).limit(limit);
  });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const listCols = columns.filter((c) => c.list).length ? columns.filter((c) => c.list) : columns.filter((c) => !c.readOnly).slice(0, 3);
  const rows = useMemo(() => {
    const all = data ?? [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((r) => columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))) : all;
  }, [data, query, columns]);

  const refresh = () => {
    invalidate("admin:" + table);
    invalidate(table);
  };
  const save = async () => {
    if (!supabase || !editing) return;
    const missing = columns.find((c) => c.required && !c.readOnly && isEmptyValue(editing[c.key]));
    if (missing) return toast(missing.label + " : " + tr("required"), "error");
    const payload: Row = {};
    for (const c of columns) if (!c.readOnly) payload[c.key] = fromInput(c, editing[c.key]);
    setBusy(true);
    const res = editing.id ? await supabase.from(table).update(payload).eq("id", editing.id) : await supabase.from(table).insert({ ...defaults, ...where, ...payload });
    setBusy(false);
    if (res.error) return toast(res.error.message, "error");
    toast(tr("saved"));
    setEditing(null);
    refresh();
    translateRows(supabase, table);
  };
  const remove = async (row: Row) => {
    if (!supabase || !(await confirmAction(tr("delAsk")))) return;
    const { error: err } = await supabase.from(table).delete().eq("id", row.id);
    if (err) return toast(err.message, "error");
    toast(tr("deleted"));
    refresh();
  };
  const exportCsv = () => {
    const cols = columns.map((c) => c.key);
    const esc = (v: any) => '"' + String(Array.isArray(v) ? v.join(", ") : (v ?? "")).replace(/"/g, '""') + '"';
    const csv = [columns.map((c) => esc(c.label)).join(";"), ...rows.map((r) => cols.map((k) => esc(r[k])).join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = table + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const open = (row?: Row) => {
    const base: Row = row ? { ...row } : { ...defaults };
    for (const c of columns) base[c.key] = toInput(c, base[c.key]);
    setEditing(base);
  };

  return (
    <div>
      <SectionTitle title={title} hint={hint}>
        {!noCreate && <Button onClick={() => open()}>+ {tr("add")}</Button>}
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          {tr("export")}
        </Button>
      </SectionTitle>
      {(data?.length ?? 0) > 5 && <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("search")} className="mb-4" />}
      {error && <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState title={tr("empty")} text={noCreate ? undefined : tr("emptyHint")} action={noCreate ? undefined : <Button onClick={() => open()}>+ {tr("add")}</Button>} />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4" onClick={() => open(r)}>
              {label && <div className="min-w-0 flex-1 basis-full font-medium text-neutral-900 sm:basis-auto dark:text-neutral-100">{label(r)}</div>}
              {listCols.map((c, i) => (
                <div key={c.key} className={cn("min-w-0", i === 0 && !label ? "flex-1 basis-full font-medium text-neutral-900 sm:basis-auto dark:text-neutral-100" : "text-sm text-neutral-600 dark:text-neutral-400")}>
                  {(i > 0 || label) && <span className="mr-1 text-xs text-neutral-400">{c.label} :</span>}
                  {display(c, r[c.key], lang, tr)}
                </div>
              ))}
              {actions && (
                <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {actions(r, refresh)}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  void remove(r);
                }}
              >
                {tr("del")}
              </Button>
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? tr("edit") : tr("add")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {tr("cancel")}
            </Button>
            <Button onClick={() => void save()} loading={busy}>
              {tr("save")}
            </Button>
          </>
        }
      >
        {editing && <RowForm columns={columns} row={editing} onChange={setEditing} />}
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------ dashboard

/** Visits of the site (without the tests) + reset button. Put your own <Stat /> cards next to it. */
export function VisitStats() {
  const tr = useT();
  const { supabase } = useContent();
  const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const week = useData<number>("admin:visits:7", () =>
    supabase!
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since(7))
      .then((r: any) => ({ data: r.count ?? 0, error: r.error })),
  );
  const month = useData<number>("admin:visits:30", () =>
    supabase!
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since(30))
      .then((r: any) => ({ data: r.count ?? 0, error: r.error })),
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label={tr("visits7")} value={week.data ?? "…"} />
        <Stat label={tr("visits30")} value={month.data ?? "…"} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{tr("ownVisits")}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!supabase || !(await confirmAction(tr("resetAsk")))) return;
            const { error } = await supabase.from("page_views").delete().gte("created_at", "1970-01-01");
            if (error) return toast(error.message, "error");
            invalidate("admin:visits");
            toast(tr("saved"));
          }}
        >
          {tr("resetStats")}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ site texts, legal pages, administrators, view as

/**
 * The texts of the site in plain language (no technical keys): labels = { "home.hero.title": "Accueil · Grand titre", … }.
 * Edits the language shown (the switcher of the site changes the language edited).
 */
export function ContentEditor({ labels, defaults = {} }: { labels: Record<string, string>; defaults?: Record<string, string> }) {
  const tr = useT();
  const { text, save, remove } = useContent();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const groups = useMemo(() => {
    const out: Record<string, [string, string][]> = {};
    for (const [k, label] of Object.entries(labels)) {
      const [group, ...rest] = label.split(" · ");
      (out[rest.length ? group : ""] ??= []).push([k, rest.join(" · ") || label]);
    }
    return out;
  }, [labels]);
  return (
    <div className="space-y-6">
      <SectionTitle title={tr("content")} />
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="space-y-2">
          {group && <p className="text-sm font-semibold text-neutral-500">{group}</p>}
          {items.map(([k, label]) => (
            <Card
              key={k}
              className="p-4"
              onClick={() => {
                setDraft(text(k));
                setEditing(k);
              }}
            >
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
              <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{text(k) || "—"}</p>
            </Card>
          ))}
        </div>
      ))}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? labels[editing] : ""}
        footer={
          <>
            {editing && defaults[editing] !== undefined && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await remove(editing);
                  setEditing(null);
                  toast(tr("saved"));
                }}
              >
                {tr("reset")}
              </Button>
            )}
            <Button
              onClick={async () => {
                if (!editing) return;
                try {
                  await save(editing, draft.trim());
                  toast(tr("saved"));
                  setEditing(null);
                } catch (e) {
                  toast((e as Error).message, "error");
                }
              }}
            >
              {tr("save")}
            </Button>
          </>
        }
      >
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      </Dialog>
    </div>
  );
}

/** Edits the text of each legal page of the app (empty = the platform's complete default text). */
export function LegalPagesEditor({ kinds }: { kinds: LegalKind[] }) {
  const tr = useT();
  const { text, save, remove } = useContent();
  const [kind, setKind] = useState<LegalKind | null>(null);
  const [draft, setDraft] = useState("");
  return (
    <div>
      <SectionTitle title={tr("legal")} />
      <div className="space-y-2">
        {kinds.map((k) => (
          <Card
            key={k}
            className="flex items-center justify-between gap-3 p-4"
            onClick={() => {
              setDraft(text("legal_" + k) || legalDefaultText(k));
              setKind(k);
            }}
          >
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{LEGAL_PAGES[k].title}</span>
            <span className="text-sm text-[var(--brand)]">{tr("edit")}</span>
          </Card>
        ))}
      </div>
      <Dialog
        open={Boolean(kind)}
        onClose={() => setKind(null)}
        title={kind ? LEGAL_PAGES[kind].title : ""}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={async () => {
                if (!kind) return;
                await remove("legal_" + kind);
                setKind(null);
                toast(tr("saved"));
              }}
            >
              {tr("reset")}
            </Button>
            <Button
              onClick={async () => {
                if (!kind) return;
                await save("legal_" + kind, draft, { translated: false });
                setKind(null);
                toast(tr("saved"));
              }}
            >
              {tr("save")}
            </Button>
          </>
        }
      >
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-80" />
      </Dialog>
    </div>
  );
}

/** The administrators of the app (table app_admins): add by email, remove (never oneself). */
export function AdminsManager() {
  const tr = useT();
  const { supabase, session } = useContent();
  const { data } = useData<{ email: string }[]>("admin:app_admins", () => supabase!.from("app_admins").select("email").order("email"));
  const [email, setEmail] = useState("");
  const me = session?.user?.email?.toLowerCase();
  return (
    <div>
      <SectionTitle title={tr("admins")} />
      <div className="space-y-2">
        {(data ?? []).map((a) => (
          <Card key={a.email} className="flex items-center justify-between gap-3 p-4">
            <span className="min-w-0 break-all text-sm text-neutral-900 dark:text-neutral-100">
              {a.email} {a.email.toLowerCase() === me && <Badge tone="neutral">{tr("you")}</Badge>}
            </span>
            {a.email.toLowerCase() !== me && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={async () => {
                  if (!supabase || !(await confirmAction(tr("delAsk")))) return;
                  const { error } = await supabase.from("app_admins").delete().eq("email", a.email);
                  if (error) return toast(error.message, "error");
                  invalidate("admin:app_admins");
                }}
              >
                {tr("del")}
              </Button>
            )}
          </Card>
        ))}
      </div>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const mail = email.trim().toLowerCase();
          if (!supabase || !mail) return;
          const { error } = await supabase.from("app_admins").insert({ email: mail });
          if (error) return toast(error.message, "error");
          setEmail("");
          invalidate("admin:app_admins");
          toast(tr("saved"));
        }}
      >
        <Field label={tr("adminAdd")} hint={tr("adminEmail")} className="flex-1">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit">{tr("add")}</Button>
      </form>
    </div>
  );
}

/** « Voir en tant que : Admin / Client / Visiteur » (only for administrators). */
export function ViewAsSwitch({ className }: { className?: string }) {
  const tr = useT();
  const { realAdmin, viewAs, setViewAs } = useContent();
  if (!realAdmin) return null;
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-neutral-500">{tr("viewAs")}</p>
      <Tabs
        value={viewAs}
        onChange={setViewAs}
        items={[
          { value: "admin", label: tr("asAdmin") },
          { value: "client", label: tr("asClient") },
          { value: "visitor", label: tr("asVisitor") },
        ]}
      />
    </div>
  );
}

/** Small helper: number of rows of a table (dashboard figures), e.g. useCount("bookings", (q) => q.gte("starts_at", today)). */
export function useCount(table: string, filter?: (q: any) => any) {
  const { supabase } = useContent();
  const key = "admin:count:" + table + ":" + (filter ? filter.toString() : "");
  return useData<number>(key, () => {
    let q: any = supabase!.from(table).select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    return q.then((r: any) => ({ data: r.count ?? 0, error: r.error }));
  }).data;
}

/** Keeps the browser tab title in sync with the section (useful when several sections are open in tabs). */
export function useSectionTitle(title: string) {
  useEffect(() => {
    const before = document.title;
    document.title = title + " · " + before.split(" · ").slice(-1)[0];
    return () => {
      document.title = before;
    };
  }, [title]);
}

// ------------------------------------------------------------------ Google search

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

type SeoPage = { path: string; title: string; description: string };

/**
 * Title and description of each public page in Google, written by the admin (settings seo:<path>:title / :description),
 * with a Google preview and length hints. Applied right away on the site and written into the pages at publication.
 */
export function SeoEditor() {
  const tr = useT();
  const { get, save, remove } = useContent();
  const [pages, setPages] = useState<SeoPage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    fetch("/seo-pages.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: SeoPage[]) => setPages(Array.isArray(list) ? list : []))
      .catch(() => setFailed(true));
  }, []);
  const value = (p: SeoPage, field: "title" | "description") => {
    const k = "seo:" + p.path + ":" + field;
    if (draft[k] !== undefined) return draft[k];
    const own = get(k);
    return typeof own === "string" && own ? own : p[field];
  };
  const host = typeof window !== "undefined" ? window.location.host : "";
  if (failed) return <EmptyState title={tr("seo")} text={tr("seoNone")} />;
  if (!pages) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{tr("seo")}</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{tr("seoIntro")}</p>
      </div>
      {pages.map((p) => {
        const t = value(p, "title");
        const d = value(p, "description");
        const kt = "seo:" + p.path + ":title";
        const kd = "seo:" + p.path + ":description";
        const changed = draft[kt] !== undefined || draft[kd] !== undefined;
        const custom = Boolean(get(kt) || get(kd));
        return (
          <Card key={p.path} className="space-y-4 p-5">
            {/* What Google shows */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
              <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{host + (p.path === "/" ? "" : p.path)}</p>
              <p className="line-clamp-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{t}</p>
              <p className="line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{d}</p>
            </div>
            <Field label={tr("seoTitle")} hint={`${t.length} · ${tr("seoTitleTip")}`}>
              <Input value={t} maxLength={90} onChange={(e) => setDraft({ ...draft, [kt]: e.target.value })} />
            </Field>
            <Field label={tr("seoDesc")} hint={`${d.length} · ${tr("seoDescTip")}`}>
              <Textarea value={d} maxLength={220} onChange={(e) => setDraft({ ...draft, [kd]: e.target.value })} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {custom ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === p.path}
                  onClick={async () => {
                    setBusy(p.path);
                    await remove(kt);
                    await remove(kd);
                    const next = { ...draft };
                    delete next[kt];
                    delete next[kd];
                    setDraft(next);
                    setBusy(null);
                  }}
                >
                  {tr("seoReset")}
                </Button>
              ) : (
                <span />
              )}
              <Button
                size="sm"
                disabled={!changed || busy === p.path}
                onClick={async () => {
                  setBusy(p.path);
                  try {
                    if (draft[kt] !== undefined) await save(kt, draft[kt].trim(), { translated: false });
                    if (draft[kd] !== undefined) await save(kd, draft[kd].trim(), { translated: false });
                    const next = { ...draft };
                    delete next[kt];
                    delete next[kd];
                    setDraft(next);
                    toast(tr("saved") + " " + tr("seoLive"));
                  } catch (e) {
                    toast((e as Error).message, "error");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {tr("save")}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/** A row saved in a table with an « i18n » column is translated by Usin into the app's other languages (background). */
function translateRows(supabase: { auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> } } | null, table: string) {
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  if (!base || !supabase) return;
  supabase.auth
    .getSession()
    .then(({ data }) => data.session && fetch(base + "/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: data.session.access_token, tables: [table] }), keepalive: true }))
    .catch(() => undefined);
}

// ------------------------------------------------------------------ calendar sync

/**
 * Bookings in the admin's own calendar (iPhone, Mac, Google, Outlook): a private subscription link, refreshed by the
 * calendar itself (new bookings appear, cancelled ones disappear). Place it at the top of the bookings section.
 */
export function CalendarSync() {
  const { supabase } = useContent();
  const [links, setLinks] = useState<{ https: string; webcal: string; google: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  useEffect(() => {
    if (!base || !supabase) return setFailed(true);
    supabase.auth
      .getSession()
      .then(({ data }) => fetch(base + "/calendar/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: data.session?.access_token ?? "" }) }))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLinks)
      .catch(() => setFailed(true));
  }, [base, supabase]);
  if (failed) return null;
  return (
    <Card className="space-y-3 p-5">
      <div className="space-y-1">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">📅 Mes rendez-vous dans mon agenda</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Abonnez votre agenda une seule fois : chaque nouvelle réservation y apparaît toute seule, une annulation l'enlève. Le lien est privé, ne le partagez pas.</p>
      </div>
      {links ? (
        <div className="flex flex-wrap gap-2">
          <a href={links.webcal} className="inline-flex min-h-11 items-center rounded-full bg-[var(--brand)] px-4 text-sm font-medium text-white">iPhone / Mac</a>
          <a href={links.google} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-4 text-sm font-medium dark:border-white/15">Google Agenda</a>
          <Button
            variant="ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(links.https).catch(() => undefined);
              toast("Lien copié : collez-le dans Outlook ou un autre agenda (ajouter un calendrier par URL).");
            }}
          >
            Copier le lien
          </Button>
        </div>
      ) : (
        <Skeleton className="h-11" />
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ weekly planner

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Creates many time slots at once: days of the week, start times, duration, number of weeks. Shows how many slots will
 * be created before doing it. <WeeklyPlanner onCreate={(slots) => insert(slots.map((s) => ({ starts_at: s.start, ends_at: s.end })))} />
 */
export function WeeklyPlanner({ onCreate, extra }: { onCreate: (slots: { start: string; end: string }[]) => Promise<void>; extra?: ReactNode }) {
  const today = new Date().toISOString().slice(0, 10);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4]);
  const [times, setTimes] = useState<string[]>(["09:30", "14:00"]);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(90);
  const [from, setFrom] = useState(today);
  const [weeks, setWeeks] = useState(4);
  const [busy, setBusy] = useState(false);
  const slots = useMemo(() => {
    const out: { start: string; end: string }[] = [];
    const first = new Date(from + "T00:00");
    for (let d = 0; d < weeks * 7; d++) {
      const day = new Date(first);
      day.setDate(first.getDate() + d);
      if (!days.includes((day.getDay() + 6) % 7)) continue;
      for (const t of times) {
        const [h, m] = t.split(":").map(Number);
        const start = new Date(day);
        start.setHours(h, m, 0, 0);
        if (+start < Date.now()) continue;
        out.push({ start: start.toISOString(), end: new Date(+start + duration * 60e3).toISOString() });
      }
    }
    return out;
  }, [days, times, duration, from, weeks]);
  const chip = (on: boolean) => "min-h-10 rounded-full border px-3 text-sm font-medium transition " + (on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-black/10 dark:border-white/15");
  return (
    <Card className="space-y-4 p-5">
      <p className="font-semibold text-neutral-900 dark:text-neutral-100">Créer plusieurs créneaux d'un coup</p>
      <div className="space-y-2">
        <p className="text-sm font-medium">Jours</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button key={d} type="button" className={chip(days.includes(i))} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Heures de début</p>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t) => (
            <button key={t} type="button" className={chip(true)} title="Retirer" onClick={() => setTimes(times.filter((x) => x !== t))}>
              {t} ✕
            </button>
          ))}
          <Input type="time" className="h-10 w-32" value={time} onChange={(e) => setTime(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={!time || times.includes(time)} onClick={() => { setTimes([...times, time].sort()); setTime(""); }}>
            + Ajouter
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Durée (minutes)">
          <Input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(Math.max(10, Number(e.target.value) || 60))} />
        </Field>
        <Field label="À partir du">
          <Input type="date" value={from} min={today} onChange={(e) => setFrom(e.target.value || today)} />
        </Field>
        <Field label="Pendant (semaines)">
          <Input type="number" min={1} max={26} value={weeks} onChange={(e) => setWeeks(Math.min(26, Math.max(1, Number(e.target.value) || 1)))} />
        </Field>
      </div>
      {extra}
      <Button
        disabled={!slots.length || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onCreate(slots);
            toast(slots.length + " créneaux créés ✓");
          } catch (e) {
            toast((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "…" : `Créer ${slots.length} créneau${slots.length > 1 ? "x" : ""}`}
      </Button>
    </Card>
  );
}

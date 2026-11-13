// Injected by Usin (management console: layout, dashboard, data tables, texts, legal pages, administrators). Do not edit.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useContent, useData, invalidate } from "./content";
import { languages } from "./i18n";
import { AddressInput, Badge, Button, Card, Container, Dialog, EmptyState, Field, Input, Select, Skeleton, Stat, Switch, Tabs, Textarea, cn, confirmAction, setBadge, toast, useBadge } from "./ui";
import { ImageEditor, uploadImage } from "./image-editor";
import { LEGAL_PAGES, legalDefaultText, type LegalKind } from "./legal";
import { useSeo } from "./seo";
import { env } from "./env";

const T: Record<string, Record<string, string>> = {
  fr: {
    seo: "Référencement Google",
    seoIntro:
      "Le titre et la description que Google affiche pour chaque page. Écrivez ce que vos clients tapent dans Google : votre activité et votre ville (ex. « Soins énergétiques à Bailleul »). Chaque page doit avoir les siens.",
    seoTitle: "Titre dans Google",
    seoDesc: "Description dans Google",
    seoReset: "Reprendre le texte d'origine",
    seoNone: "La liste des pages apparaît sur le site publié (après une publication).",
    seoTitleTip: "Idéal : 30 à 60 caractères",
    seoDescTip: "Idéal : 120 à 160 caractères",
    seoLive: "Appliqué tout de suite sur le site ; pris en compte par Google à son prochain passage.",
    add: "Ajouter",
    edit: "Modifier",
    del: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    search: "Rechercher…",
    export: "Exporter",
    saved: "Enregistré ✓",
    deleted: "Supprimé ✓",
    delAsk: "Supprimer cet élément ?",
    empty: "Aucun élément pour le moment",
    emptyHint: "Ajoutez le premier avec le bouton « Ajouter ».",
    required: "Champ obligatoire",
    yes: "Oui",
    no: "Non",
    image: "Choisir une image",
    visits7: "Visites (7 jours)",
    visits30: "Visites (30 jours)",
    resetStats: "Remettre les statistiques à zéro",
    resetAsk: "Effacer toutes les visites enregistrées ?",
    ownVisits: "Vos propres visites (aperçu, appareils où vous êtes connecté) ne sont pas comptées.",
    admins: "Administrateurs",
    adminAdd: "Ajouter un administrateur",
    adminEmail: "Email de la personne (elle crée son compte avec ce même email)",
    you: "vous",
    viewAs: "Voir en tant que",
    asAdmin: "Admin",
    asClient: "Client",
    asVisitor: "Visiteur",
    content: "Textes du site",
    reset: "Revenir au texte par défaut",
    legal: "Pages légales",
    menu: "Menu",
  },
  en: {
    seo: "Google search",
    seoIntro: "The title and description Google shows for each page. Write what your customers type into Google: your activity and your town. Each page needs its own.",
    seoTitle: "Title in Google",
    seoDesc: "Description in Google",
    seoReset: "Back to the original text",
    seoNone: "The list of pages appears on the published site (after a publication).",
    seoTitleTip: "Best: 30 to 60 characters",
    seoDescTip: "Best: 120 to 160 characters",
    seoLive: "Applied on the site right away; taken into account by Google on its next visit.",
    add: "Add",
    edit: "Edit",
    del: "Delete",
    save: "Save",
    cancel: "Cancel",
    search: "Search…",
    export: "Export",
    saved: "Saved ✓",
    deleted: "Deleted ✓",
    delAsk: "Delete this item?",
    empty: "Nothing here yet",
    emptyHint: "Add the first one with the « Add » button.",
    required: "Required",
    yes: "Yes",
    no: "No",
    image: "Choose an image",
    visits7: "Visits (7 days)",
    visits30: "Visits (30 days)",
    resetStats: "Reset statistics",
    resetAsk: "Erase all recorded visits?",
    ownVisits: "Your own visits (preview, devices where you are signed in) are not counted.",
    admins: "Administrators",
    adminAdd: "Add an administrator",
    adminEmail: "Their email (they sign up with this same email)",
    you: "you",
    viewAs: "View as",
    asAdmin: "Admin",
    asClient: "Customer",
    asVisitor: "Visitor",
    content: "Site texts",
    reset: "Back to the default text",
    legal: "Legal pages",
    menu: "Menu",
  },
  nl: {
    add: "Toevoegen",
    edit: "Bewerken",
    del: "Verwijderen",
    save: "Opslaan",
    cancel: "Annuleren",
    search: "Zoeken…",
    export: "Exporteren",
    saved: "Opgeslagen ✓",
    deleted: "Verwijderd ✓",
    delAsk: "Dit element verwijderen?",
    empty: "Nog niets",
    emptyHint: "Voeg het eerste toe met de knop « Toevoegen ».",
    required: "Verplicht",
    yes: "Ja",
    no: "Nee",
    image: "Afbeelding kiezen",
    visits7: "Bezoeken (7 dagen)",
    visits30: "Bezoeken (30 dagen)",
    resetStats: "Statistieken op nul zetten",
    resetAsk: "Alle geregistreerde bezoeken wissen?",
    ownVisits: "Je eigen bezoeken (voorbeeld, toestellen waarop je bent ingelogd) tellen niet mee.",
    admins: "Beheerders",
    adminAdd: "Beheerder toevoegen",
    adminEmail: "Hun e-mailadres (ze maken een account met hetzelfde adres)",
    you: "jij",
    viewAs: "Bekijken als",
    asAdmin: "Beheerder",
    asClient: "Klant",
    asVisitor: "Bezoeker",
    content: "Teksten van de site",
    reset: "Terug naar de standaardtekst",
    legal: "Juridische pagina's",
    menu: "Menu",
  },
};
function useT() {
  const { lang } = useContent();
  return (k: string) => (T[lang] ?? T.en)[k] ?? T.fr[k] ?? k;
}

// ------------------------------------------------------------------ layout

export type AdminSection = {
  id: string;
  label: string;
  icon?: ReactNode;
  element: ReactNode;
  badge?: number;
  /** Kept for older apps: the layout is the same for every section. */ wide?: boolean;
  /** Heading the section is listed under (« Activité », « Clients »…): a long menu stays easy to scan. */ group?: string;
};

const MENU_KEY = "usin:admin-menu";

/**
 * A management space: the same menu for every section (column on computers, which can be reduced to icons to give
 * the section more room — remembered on the device; scrollable pills on phones) and the chosen section.
 * The chosen section is kept in the address (?s=…) so a reload or a shared link opens the same place.
 * <AdminConsole title="Gestion" sections={[{ id: "dashboard", label: "Tableau de bord", icon: <Gauge />, element: <… /> }, …]} actions={…} />
 */
export function AdminConsole({
  title,
  sections: own,
  actions,
  seo = true,
}: {
  title: string;
  sections: AdminSection[];
  actions?: ReactNode;
  /** false on a second console (daily management): Google titles stay in one place. */ seo?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const tr = useT();
  // Every management space can write the Google titles of the pages (once, even if the app adds its own).
  const sections: AdminSection[] =
    !seo || own.some((s) => s.id === "seo")
      ? own
      : [
          ...own,
          {
            id: "seo",
            label: tr("seo"),
            icon: <SearchIcon />,
            element: <SeoEditor />,
            group: own[own.length - 1]?.group,
          },
        ];
  useSeo({ title, noindex: true });
  useAdminTranslation();
  const current = new URLSearchParams(location.search).get("s");
  const active = sections.find((s) => s.id === current) ?? sections[0];
  const [small, setSmall] = useState(() => {
    try {
      return localStorage.getItem(MENU_KEY) === "small";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setSmall(!small);
    try {
      localStorage.setItem(MENU_KEY, small ? "full" : "small");
    } catch {
      /* private mode */
    }
  };
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
      <div className={cn("grid gap-6 md:transition-[grid-template-columns] md:duration-200", small ? "md:grid-cols-[3rem_minmax(0,1fr)]" : "md:grid-cols-[15rem_minmax(0,1fr)]")}>
        <nav
          aria-label={title}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:sticky md:top-24 md:mx-0 md:max-h-[calc(100dvh-7rem)] md:flex-col md:gap-1 md:self-start md:overflow-y-auto md:overflow-x-visible md:px-0 md:pb-4"
        >
          {sections.map((s, i) => (
            <Fragment key={s.id}>
              {s.group && s.group !== sections[i - 1]?.group && (
                <p className={cn("hidden px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 first:pt-0 dark:text-neutral-400", small ? "md:hidden" : "md:block")}>
                  {s.group}
                </p>
              )}
              <button
                type="button"
                onClick={() => go(s.id)}
                title={small ? s.label : undefined}
                aria-label={s.badge ? `${s.label} (${s.badge})` : s.label}
                aria-current={s.id === active?.id ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 shrink-0 items-center gap-3 rounded-full px-4 text-sm font-medium transition md:min-h-10 md:rounded-2xl [&_svg]:size-5 [&_svg]:shrink-0",
                  small && "md:size-12 md:justify-center md:px-0",
                  s.id === active?.id
                    ? "bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-white/10 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/5",
                )}
              >
                {s.icon}
                <span className={cn("whitespace-nowrap", small && "md:sr-only")}>{s.label}</span>
                {Boolean(s.badge) && (
                  <span
                    className={cn(
                      "ml-auto min-w-5 rounded-full bg-[var(--brand)] px-1.5 text-center text-xs leading-5 text-white",
                      small && "md:absolute md:right-0.5 md:top-0.5 md:ml-0 md:min-w-4 md:px-1 md:text-[10px] md:leading-4",
                    )}
                  >
                    {s.badge}
                  </span>
                )}
              </button>
            </Fragment>
          ))}
          <button
            type="button"
            onClick={toggle}
            title={small ? "Agrandir le menu" : "Réduire le menu"}
            aria-label={small ? "Agrandir le menu" : "Réduire le menu"}
            className={cn(
              "mt-3 hidden min-h-10 items-center gap-3 rounded-2xl px-4 text-sm text-neutral-500 transition hover:bg-black/5 md:flex dark:hover:bg-white/5",
              small && "md:size-12 md:justify-center md:px-0",
            )}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("size-5 shrink-0 transition-transform", small && "rotate-180")}
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="m16 15-3-3 3-3" />
            </svg>
            {!small && <span>Réduire le menu</span>}
          </button>
        </nav>
        <div className="min-w-0">{active?.element}</div>
      </div>
    </Container>
  );
}

// ------------------------------------------------------------------ management spaces in every language

/*
 * The texts of the management spaces are written once, in the main language, right in the code. At each publication
 * Usin translates them (table usin_admin_i18n); here they are shown in the language chosen with the globe. Only texts
 * that are exactly a text of the code are replaced: customers' names, messages and emails are never touched (and
 * anything inside translate="no" is skipped).
 */
type AdminDict = {
  exact: Map<string, string>;
  patterns: { re: RegExp; to: string }[];
};
const adminDicts = new Map<string, Promise<AdminDict | null>>();
const ATTRS = ["placeholder", "title", "aria-label"] as const;

function loadAdminDict(supabase: NonNullable<ReturnType<typeof useContent>["supabase"]>, lang: string) {
  let p = adminDicts.get(lang);
  if (!p) {
    p = Promise.resolve(supabase.from("usin_admin_i18n").select("dict").eq("lang", lang).maybeSingle())
      .then(({ data }) => {
        const dict = ((data as { dict?: Record<string, string> } | null)?.dict ?? {}) as Record<string, string>;
        const exact = new Map<string, string>();
        const patterns: AdminDict["patterns"] = [];
        for (const [src, to] of Object.entries(dict)) {
          if (typeof to !== "string" || !to.trim() || to === src) continue;
          if (/\{\d\}/.test(src)) {
            const re = new RegExp("^" + src.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{(\d)\\?\}/g, "(?<v$1>.+?)") + "$");
            patterns.push({ re, to });
          } else exact.set(src, to);
        }
        return { exact, patterns };
      })
      .catch(() => null);
    adminDicts.set(lang, p);
  }
  return p;
}

function translateText(d: AdminDict, text: string): string | null {
  const core = text.trim();
  if (!core || !/\p{L}/u.test(core)) return null;
  const norm = core.replace(/\s+/g, " ");
  let to = d.exact.get(norm);
  if (!to)
    for (const p of d.patterns) {
      const m = norm.match(p.re);
      if (m) {
        to = p.to.replace(/\{(\d)\}/g, (_, i) => m.groups?.["v" + i] ?? "");
        break;
      }
    }
  if (!to) return null;
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const tail = text.match(/\s*$/)?.[0] ?? "";
  return lead + to + tail;
}

/** Shows the management space in the visitor's language while it is open (texts, placeholders, tooltips, dialogs). */
function useAdminTranslation() {
  const { supabase, lang } = useContent();
  useEffect(() => {
    const main = languages[0] ?? "";
    const originals = new WeakMap<Node, string>();
    const shown = new Set<Text>();
    const attrOriginals = new WeakMap<Element, Record<string, string>>();
    const touched = new Set<Element>();
    let dict: AdminDict | null = null;
    let busy = false;
    const skip = (el: Element | null) => Boolean(el?.closest('script,style,textarea,code,[translate="no"],[contenteditable="true"],iframe'));
    const doText = (n: Text) => {
      if (!dict || skip(n.parentElement)) return;
      const value = n.nodeValue ?? "";
      const known = originals.get(n);
      // React wrote a new text since: it becomes the original.
      const source = known !== undefined && value === translateText(dict, known) ? known : value;
      const to = translateText(dict, source);
      if (to && to !== value) {
        originals.set(n, source);
        shown.add(n);
        n.nodeValue = to;
      }
    };
    // « Demandes à traiter ({n}) » is several text nodes for React: the sentence is translated as a whole.
    const groupOriginal = new WeakMap<Text, string>();
    const groupSet = new WeakMap<Text, string>();
    const doGroup = (el: Element | null) => {
      if (!dict || !el || skip(el)) return;
      const nodes = Array.from(el.childNodes);
      if (nodes.length < 2 || nodes.length > 7 || !nodes.every((n) => n.nodeType === Node.TEXT_NODE)) return;
      const texts = nodes as Text[];
      const shownValues = texts.map((n) => n.nodeValue ?? "");
      // A node still showing what was put there keeps its original; a node React changed since brings its new text.
      const sources = texts.map((n, i) => (groupSet.has(n) && groupSet.get(n) === shownValues[i] ? (groupOriginal.get(n) ?? shownValues[i]) : shownValues[i]));
      const to = translateText(dict, sources.join(""));
      if (!to || to === shownValues.join("")) return;
      texts.forEach((n, i) => {
        groupOriginal.set(n, sources[i]);
        shown.add(n);
        originals.set(n, sources[i]);
        n.nodeValue = i === 0 ? to : "";
        groupSet.set(n, n.nodeValue);
      });
    };
    const doEl = (el: Element) => {
      if (!dict || skip(el)) return;
      doGroup(el);
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const saved = attrOriginals.get(el) ?? {};
        const source = saved[a] !== undefined && translateText(dict, saved[a]) === v ? saved[a] : v;
        const to = translateText(dict, source);
        if (to && to !== v) {
          attrOriginals.set(el, { ...saved, [a]: source });
          touched.add(el);
          el.setAttribute(a, to);
        }
      }
    };
    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      doEl(root as Element);
      const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === Node.TEXT_NODE ? doText(n as Text) : doEl(n as Element);
    };
    const observer = new MutationObserver((list) => {
      if (busy) return;
      busy = true;
      for (const m of list) {
        if (m.type === "characterData") {
          doText(m.target as Text);
          doGroup((m.target as Text).parentElement);
        } else if (m.type === "attributes") doEl(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
      observer.takeRecords();
      busy = false;
    });
    let alive = true;
    if (supabase && lang && main && lang !== main)
      void loadAdminDict(supabase, lang).then((d) => {
        if (!alive || !d) return;
        dict = d;
        walk(document.body);
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: [...ATTRS],
        });
      });
    return () => {
      alive = false;
      observer.disconnect();
      // Back to the original texts (other language chosen, or the management space closed).
      for (const n of shown) {
        const o = originals.get(n);
        if (o === undefined || !dict) continue;
        if (groupOriginal.has(n) || n.nodeValue === translateText(dict, o)) n.nodeValue = o;
      }
      for (const el of touched) {
        const saved = attrOriginals.get(el);
        if (saved) for (const [a, v] of Object.entries(saved)) el.setAttribute(a, v);
      }
    };
  }, [supabase, lang]);
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
      return new Intl.NumberFormat(lang, {
        style: "currency",
        currency: "EUR",
      }).format(Number(value) / 100);
    case "date":
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(value));
    case "datetime":
      return new Intl.DateTimeFormat(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
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
                        className={cn(
                          "min-h-10 rounded-full border px-4 text-sm font-medium transition",
                          on ? "border-transparent bg-[var(--brand)] text-white" : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
                        )}
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
    return q
      ? all.filter((r) =>
          columns.some((c) =>
            String(r[c.key] ?? "")
              .toLowerCase()
              .includes(q),
          ),
        )
      : all;
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
                <div
                  key={c.key}
                  className={cn("min-w-0", i === 0 && !label ? "flex-1 basis-full font-medium text-neutral-900 sm:basis-auto dark:text-neutral-100" : "text-sm text-neutral-600 dark:text-neutral-400")}
                >
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
function translateRows(
  supabase: {
    auth: {
      getSession: () => Promise<{
        data: { session: { access_token: string } | null };
      }>;
    };
  } | null,
  table: string,
) {
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  if (!base || !supabase) return;
  supabase.auth
    .getSession()
    .then(
      ({ data }) =>
        data.session &&
        fetch(base + "/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            tables: [table],
          }),
          keepalive: true,
        }),
    )
    .catch(() => undefined);
}

// ------------------------------------------------------------------ calendar sync

/**
 * Bookings in the admin's own calendar (iPhone, Mac, Google, Outlook): a private subscription link, refreshed by the
 * calendar itself (new bookings appear, cancelled ones disappear). Place it at the top of the bookings section.
 */
export function CalendarSync() {
  const { supabase } = useContent();
  const [links, setLinks] = useState<{
    https: string;
    webcal: string;
    google: string;
  } | null>(null);
  const [failed, setFailed] = useState<string | false>(false);
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  useEffect(() => {
    if (!base || !supabase) return setFailed("app non publiée");
    supabase.auth
      .getSession()
      .then(({ data }) =>
        fetch(base + "/calendar/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: data.session?.access_token ?? "",
          }),
        }),
      )
      .then(async (r) =>
        r.ok
          ? r.json()
          : Promise.reject(
              new Error(
                (
                  (await r.json().catch(() => ({}))) as {
                    message?: string;
                    error?: string;
                  }
                ).error || "erreur " + r.status,
              ),
            ),
      )
      .then(setLinks)
      .catch((e: Error) => setFailed(e.message || "erreur"));
  }, [base, supabase]);
  if (failed) return <Card className="p-5 text-sm text-neutral-600 dark:text-neutral-400">📅 La synchronisation avec votre agenda n'est pas disponible pour le moment ({failed}).</Card>;
  return (
    <Card className="space-y-3 p-5">
      <div className="space-y-1">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">📅 Mes rendez-vous dans mon agenda</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Abonnez votre agenda une seule fois : chaque nouvelle réservation y apparaît toute seule, une annulation l'enlève. Le lien est privé, ne le partagez pas.
        </p>
      </div>
      {links ? (
        <div className="flex flex-wrap gap-2">
          <a href={links.webcal} className="inline-flex min-h-11 items-center rounded-full bg-[var(--brand)] px-4 text-sm font-medium text-white">
            iPhone / Mac
          </a>
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-4 text-sm font-medium dark:border-white/15"
          >
            Google Agenda
          </a>
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
        out.push({
          start: start.toISOString(),
          end: new Date(+start + duration * 60e3).toISOString(),
        });
      }
    }
    return out;
  }, [days, times, duration, from, weeks]);
  const chip = (on: boolean) =>
    "min-h-10 rounded-full border px-3 text-sm font-medium transition " + (on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-black/10 dark:border-white/15");
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
          <Button
            size="sm"
            variant="secondary"
            disabled={!time || times.includes(time)}
            onClick={() => {
              setTimes([...times, time].sort());
              setTime("");
            }}
          >
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

// ------------------------------------------------------------------ reply to a customer

/**
 * « Répondre » to a customer from the app: a message written here leaves by email in the business's name, and the
 * customer's answer reaches the business's pro address. <ReplyButton to={m.email} subject={"Re : " + m.subject} onSent={…} />
 */
export function ReplyButton({ to, subject, quote, onSent }: { to: string; subject: string; quote?: string; onSent?: () => void }) {
  const { supabase } = useContent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(subject);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  if (!base || !to) return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Répondre
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={"Répondre à " + to}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={busy || !body.trim()}
              onClick={async () => {
                if (!supabase) return;
                setBusy(true);
                try {
                  const { data } = await supabase.auth.getSession();
                  const res = await fetch(base + "/reply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      accessToken: data.session?.access_token ?? "",
                      to,
                      subject: title,
                      body: body + (quote ? "\n\n> " + quote.split("\n").join("\n> ") : ""),
                    }),
                  });
                  if (!res.ok)
                    throw new Error(
                      (
                        (await res.json().catch(() => ({}))) as {
                          error?: string;
                        }
                      ).error || "Envoi impossible",
                    );
                  toast("Réponse envoyée ✓");
                  setOpen(false);
                  setBody("");
                  onSent?.();
                } catch (e) {
                  toast((e as Error).message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "…" : "Envoyer"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Objet">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Message">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} autoFocus />
          </Field>
          {quote && <p className="line-clamp-4 border-l-2 border-black/10 pl-3 text-sm opacity-70 dark:border-white/15">{quote}</p>}
        </div>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------------ mailbox

type MailServer = { host: string; port: number; secure: boolean };
type MailFolder = {
  path: string;
  name: string;
  role: "inbox" | "sent" | "drafts" | "junk" | "trash" | "archive" | "other";
  total: number;
  unseen: number;
};
type MailItem = {
  uid: number;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  seen: boolean;
  flagged: boolean;
  attachments: boolean;
};
type MailFull = {
  uid: number;
  from: string;
  fromEmail: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  text: string;
  html: string;
  messageId: string;
  references: string;
  attachments: { index: number; name: string; size: number; type: string }[];
};
type MailDraft = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  draftUid?: number;
  attachments: { name: string; type: string; data: string; size: number }[];
  showCc: boolean;
};

type MailAccount = {
  id: number;
  email: string;
  watch: boolean;
  every: number;
  signature: { on: boolean; name?: string; role?: string };
  oauth: string | null;
  shared: boolean;
  mine: boolean;
  unclaimed: boolean;
};
type MailStatus = {
  connected: boolean;
  accounts: MailAccount[];
  oauth: string[];
};
const blankDraft = (): MailDraft => ({
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  body: "",
  attachments: [],
  showCc: false,
});

// Line icons in the app's colours (they take the colour of the text around them, like the rest of the design).
const MAIL_ICONS = {
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  sent: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  drafts: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  junk: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  other: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  reply: '<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  replyAll: '<path d="m7 17-5-5 5-5"/><path d="m12 17-5-5 5-5"/><path d="M22 18v-2a4 4 0 0 0-4-4H7"/>',
  forward: '<path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  unread: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  read: '<path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  write: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  settings: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  move: '<path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/><path d="M2 13h10"/><path d="m9 16 3-3-3-3"/>',
  remove: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m10 11 4 4"/><path d="m14 11-4 4"/>',
  open: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
} as const;
type MailIconName = keyof typeof MAIL_ICONS;
function MailIcon({ name, filled, className }: { name: MailIconName; filled?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-[1.15rem] shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: MAIL_ICONS[name] }}
    />
  );
}

/** One email in the list: right-click (computer) or long press (phone) opens its menu; swipe right = archive, left = bin. */
function MailRow({
  m,
  active,
  outgoing,
  date,
  canArchive,
  onOpen,
  onStar,
  onSwipe,
  onMenu,
  checked,
  selecting,
  onSelect,
}: {
  checked: boolean;
  /** Selection under way: a tap selects instead of opening. */
  selecting: boolean;
  onSelect: (range: boolean) => void;
  m: MailItem;
  active: boolean;
  outgoing: boolean;
  date: string;
  canArchive: boolean;
  onOpen: () => void;
  onStar: () => void;
  onSwipe: (to: "archive" | "trash") => void;
  onMenu: (x: number, y: number) => void;
}) {
  const [dx, setDx] = useState(0);
  const g = useRef<{
    x: number;
    y: number;
    dir: "h" | "v" | null;
    press: ReturnType<typeof setTimeout> | null;
    menu: boolean;
  } | null>(null);
  const LIMIT = 90;
  const who = outgoing ? m.to || "—" : m.from || m.fromEmail;
  const initial = (who.replace(/^[^\p{L}\p{N}]+/u, "")[0] ?? "?").toUpperCase();
  return (
    <div className="relative overflow-hidden rounded-2xl" translate="no">
      {dx !== 0 && (
        <div className={cn("absolute inset-0 flex items-center px-5 text-sm font-medium text-white", dx > 0 ? "justify-start bg-[var(--brand)]" : "justify-end bg-red-600")}>
          {dx > 0 ? (
            <span className="flex items-center gap-2">
              <MailIcon name="archive" /> Archiver
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Corbeille <MailIcon name="trash" />
            </span>
          )}
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (g.current?.menu) return;
          // Ctrl / ⌘ + click: add to the selection; Shift + click: select up to here.
          if (selecting || e.metaKey || e.ctrlKey || e.shiftKey) onSelect(e.shiftKey);
          else onOpen();
        }}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          const press = setTimeout(() => {
            if (!g.current || g.current.dir) return;
            g.current.menu = true;
            navigator.vibrate?.(10);
            onMenu(t.clientX, t.clientY);
          }, 500);
          g.current = {
            x: t.clientX,
            y: t.clientY,
            dir: null,
            press,
            menu: false,
          };
        }}
        onTouchMove={(e) => {
          const s = g.current;
          if (!s) return;
          const t = e.touches[0];
          const mx = t.clientX - s.x;
          const my = t.clientY - s.y;
          if (!s.dir && Math.abs(mx) + Math.abs(my) > 8) {
            s.dir = Math.abs(mx) > Math.abs(my) * 1.3 ? "h" : "v";
            if (s.press) clearTimeout(s.press);
          }
          if (s.dir === "h") setDx(Math.max(-160, Math.min(canArchive ? 160 : 0, mx)));
        }}
        onTouchEnd={() => {
          const s = g.current;
          if (s?.press) clearTimeout(s.press);
          if (s?.dir === "h" && Math.abs(dx) > LIMIT) onSwipe(dx > 0 ? "archive" : "trash");
          setDx(0);
          // The click that follows a long press must not open the email.
          setTimeout(() => {
            if (g.current === s) g.current = null;
          }, 50);
        }}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        className={cn(
          "group relative flex cursor-pointer select-none items-start gap-3 bg-white px-3 py-3 outline-none transition-colors [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40 dark:bg-neutral-900",
          dx === 0 && "transition-transform",
          active ? "bg-[color-mix(in_srgb,var(--brand)_10%,white)] dark:bg-[color-mix(in_srgb,var(--brand)_18%,#171717)]" : "hover:bg-neutral-50 dark:hover:bg-white/5",
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label="Sélectionner"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e.shiftKey);
          }}
          className={cn(
            "group/check mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition",
            checked ? "bg-[var(--brand)] text-white" : m.seen ? "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400" : "bg-[var(--brand)]/15 text-[var(--brand)]",
          )}
        >
          {checked ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <>
              <span className={cn(selecting ? "hidden" : "[@media(pointer:fine)]:group-hover/check:hidden")}>{initial}</span>
              <span className={cn("size-4 rounded-full border-2 border-current", selecting ? "block" : "hidden [@media(pointer:fine)]:group-hover/check:block")} />
            </>
          )}
        </button>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("min-w-0 truncate text-sm", m.seen ? "text-neutral-700 dark:text-neutral-300" : "font-semibold text-neutral-900 dark:text-neutral-100")}>
              {outgoing ? "À : " : ""}
              {who}
            </span>
            <span className={cn("shrink-0 text-xs", m.seen ? "text-neutral-500" : "font-semibold text-[var(--brand)]")}>{date}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className={cn("min-w-0 flex-1 truncate text-sm", m.seen ? "text-neutral-500 dark:text-neutral-400" : "font-medium text-neutral-800 dark:text-neutral-200")}>{m.subject}</span>
            {m.attachments && <MailIcon name="clip" className="size-3.5 text-neutral-400" />}
            <button
              type="button"
              aria-label={m.flagged ? "Ne plus suivre" : "Suivre"}
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
              className={cn(
                "-m-1.5 grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10",
                m.flagged ? "text-amber-500" : "text-neutral-400 opacity-0 group-hover:opacity-100 max-lg:opacity-60",
              )}
            >
              <MailIcon name="star" filled={m.flagged} className="size-4" />
            </button>
          </span>
        </span>
        {!m.seen && <span className="absolute left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[var(--brand)]" />}
      </div>
    </div>
  );
}

type MenuItem = { label: string; icon: MailIconName; run: () => void; danger?: boolean } | "-";

/** Menu at the place of the click (or at the finger), kept inside the screen. Escape / click elsewhere closes it. */
function MailMenu({ at, items, onClose }: { at: { x: number; y: number }; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: at.x, top: at.y });
  useEffect(() => {
    const el = ref.current;
    if (el) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setPos({
        left: Math.max(8, Math.min(at.x, window.innerWidth - w - 8)),
        top: Math.max(8, Math.min(at.y, window.innerHeight - h - 8)),
      });
      el.querySelector<HTMLButtonElement>("button")?.focus();
    }
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
    };
  }, [at.x, at.y, onClose]);
  return (
    <div
      className="fixed inset-0 z-[90]"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={ref}
        role="menu"
        style={pos}
        onClick={(e) => e.stopPropagation()}
        className="absolute max-h-[80vh] min-w-56 overflow-y-auto rounded-2xl border border-black/5 bg-white p-1.5 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-neutral-900"
      >
        {items.map((it, i) =>
          it === "-" ? (
            <div key={i} className="my-1 h-px bg-black/5 dark:bg-white/10" />
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                it.run();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition focus-visible:bg-black/5 dark:focus-visible:bg-white/10",
                it.danger ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" : "text-neutral-800 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10",
              )}
            >
              <MailIcon name={it.icon} className={it.danger ? "" : "text-neutral-500 dark:text-neutral-400"} />
              {it.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

async function mailCall<T>(supabase: NonNullable<ReturnType<typeof useContent>["supabase"]>, action: string, body: Record<string, unknown> = {}): Promise<T> {
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  const { data } = await supabase.auth.getSession();
  const res = await fetch(base + "/mailbox/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      accessToken: data.session?.access_token ?? "",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || "Erreur " + res.status);
  return json as T;
}

/**
 * Unread emails of the connected mailbox, refreshed every 2 minutes: the counter next to « Boîte mail » in the menu
 * and on the icon of the installed app. 0 when no mailbox is connected.
 * { id: "mailbox", label: "Boîte mail", icon: <Inbox />, element: <Mailbox />, wide: true, badge: useMailUnread() }
 */
export function useMailUnread() {
  const { supabase } = useContent();
  const n = useBadge("mail");
  useEffect(() => {
    if (!supabase || !env.paymentsUrl) return;
    let stop = false;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      mailCall<{ unseen: number }>(supabase, "unseen")
        .then((r) => !stop && setBadge("mail", r.unseen))
        .catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, 120_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [supabase]);
  return n;
}

/** Settings of one mailbox: alerts for new emails, signature (built from the app's brand and contact details), removal. */
function MailAccountSettings({
  acc,
  single,
  back,
  onChange,
  onRemoved,
}: {
  acc: MailAccount;
  single: boolean;
  back: string;
  onChange: (s: MailStatus | null, patch?: Partial<MailAccount>) => void;
  onRemoved: () => void;
}) {
  const { supabase } = useContent();
  const call = <T,>(action: string, body: Record<string, unknown> = {}) => mailCall<T>(supabase!, action, { account: acc.id, ...body });
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState(acc.signature);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    void call<{ html: string }>("signature")
      .then((r) => setPreview(r.html))
      .catch(() => setPreview(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acc.id]);
  const watch = async (on: boolean, every: number) => {
    setBusy(true);
    try {
      const r = await call<{ watch: boolean; every: number }>("watch", {
        on,
        every,
        url: back,
      });
      onChange(null, { watch: r.watch, every: r.every });
      toast(r.watch ? "Vous serez prévenu des nouveaux emails ✓" : "Alertes des nouveaux emails coupées ✓");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const share = async (input: { shared?: boolean; claim?: boolean }) => {
    setBusy(true);
    try {
      onChange(await call<MailStatus>("share", input));
      toast("Enregistré ✓");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveSig = async (next: MailAccount["signature"]) => {
    setSig(next);
    setBusy(true);
    try {
      const r = await call<{ html: string }>("signature-set", next);
      setPreview(r.html);
      onChange(null, { signature: next });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-5 p-4 sm:p-5">
      <p className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
        <MailIcon name="inbox" className="text-[var(--brand)]" />
        <span className="min-w-0 truncate">{acc.email}</span>
        {acc.oauth && <Badge tone="neutral">{acc.oauth === "microsoft" ? "Microsoft" : "Google"}</Badge>}
      </p>
      {acc.unclaimed && (
        <div className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm">
          <p>Cette boîte a été connectée avant le choix « privée / partagée ». Si c'est la vôtre, elle redevient visible par vous seul(e).</p>
          <Button size="sm" disabled={busy} onClick={() => void share({ claim: true, shared: false })}>
            C'est ma boîte
          </Button>
        </div>
      )}
      {(acc.mine || acc.unclaimed) && (
        <div className="space-y-1">
          <Switch label="Boîte partagée avec les autres administrateurs" checked={acc.shared} disabled={busy} onChange={(shared) => void share({ shared })} />
          <p className="text-xs leading-relaxed text-neutral-500">Pour une adresse commune (info@, contact@…). Sinon, vous seul(e) voyez cette boîte et recevez ses alertes.</p>
        </div>
      )}
      {!acc.mine && !acc.unclaimed && <p className="text-xs text-neutral-500">Boîte partagée par un autre administrateur.</p>}
      <div className="space-y-2">
        <Switch label="Me prévenir des nouveaux emails dans l'appli" checked={acc.watch} disabled={busy} onChange={(on) => void watch(on, acc.every)} />
        {acc.watch && (
          <Field label="Vérifier la boîte">
            <Select value={String(acc.every)} disabled={busy} onChange={(e) => void watch(true, Number(e.target.value))}>
              <option value="1">Toutes les minutes</option>
              <option value="2">Toutes les 2 minutes</option>
              <option value="5">Toutes les 5 minutes</option>
            </Select>
          </Field>
        )}
        <p className="text-xs leading-relaxed text-neutral-500">
          Une notification dans l'appli et sur votre téléphone pour chaque nouvel email. Dès qu'une boîte vous prévient, les alertes de l'appli (réservations, messages, avis…) ne vous sont plus
          envoyées par email : vous les voyez dans l'appli et sur votre téléphone. Vos clients reçoivent toujours leurs emails.
        </p>
      </div>
      <div className="space-y-3 border-t border-black/5 pt-4 dark:border-white/10">
        <Switch label="Signature automatique" checked={sig.on} disabled={busy} onChange={(on) => void saveSig({ ...sig, on })} />
        <p className="text-xs leading-relaxed text-neutral-500">Faite avec le logo, le nom, les couleurs et les coordonnées de votre site : elle suit toute seule vos changements.</p>
        {sig.on && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Votre nom (facultatif)">
                <Input value={sig.name ?? ""} onChange={(e) => setSig({ ...sig, name: e.target.value })} onBlur={() => void saveSig(sig)} placeholder="ex. Anne Kételair" />
              </Field>
              <Field label="Votre fonction (facultatif)">
                <Input value={sig.role ?? ""} onChange={(e) => setSig({ ...sig, role: e.target.value })} onBlur={() => void saveSig(sig)} placeholder="ex. Thérapeute énergéticienne" />
              </Field>
            </div>
            {preview === null ? (
              <Skeleton className="h-24" />
            ) : preview ? (
              <iframe
                title="Signature"
                sandbox=""
                srcDoc={'<body style="margin:12px;background:#fff">' + preview + "</body>"}
                className="h-36 w-full rounded-xl border border-black/5 bg-white dark:border-white/10"
              />
            ) : null}
          </>
        )}
      </div>
      <div className="border-t border-black/5 pt-4 dark:border-white/10">
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (!(await confirmAction(`Retirer ${acc.email} de l'appli ? (vos emails ne sont pas supprimés)`))) return;
            const s = await call<MailStatus>("disconnect");
            onChange(s);
            onRemoved();
          }}
        >
          {single ? "Déconnecter la boîte mail" : "Retirer cette boîte"}
        </Button>
      </div>
    </Card>
  );
}

/**
 * The business's own mailbox in the console, like a modern mail app: folders (réception, envoyés, brouillons, spam,
 * corbeille, archives…), search, star, unread, archive, spam, bin, move, attachments (read and send), reply / reply
 * all / forward, drafts. Any IMAP / SMTP provider; the settings are found from the address; the password stays on
 * Usin's server, encrypted. Emails stay in the mailbox (phone and computer unchanged). <Mailbox />
 */
export function Mailbox() {
  const { supabase } = useContent();
  const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
  // Several mailboxes (contact@, anne@…): every call is for the one shown.
  const accountRef = useRef<number | null>(null);
  const [account, setAccount] = useState<number | null>(null);
  const call = <T,>(action: string, body: Record<string, unknown> = {}) =>
    mailCall<T>(supabase!, action, {
      ...(accountRef.current ? { account: accountRef.current } : {}),
      ...body,
    });
  const location = useLocation();
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [adding, setAdding] = useState(false);
  const [signature, setSignature] = useState<{
    html: string;
    on: boolean;
  } | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    uid: number;
    reader?: boolean;
  } | null>(null);
  const [moving, setMoving] = useState<number[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Several emails at once: the avatar (or Ctrl / ⌘ + click, Shift + click for a range, « x » on the keyboard).
  const [selected, setSelected] = useState<number[]>([]);
  const [selecting, setSelecting] = useState(false);
  const anchor = useRef<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const keyHandler = useRef<((e: KeyboardEvent) => void) | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current?.(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // List and email side by side only when the section is wide enough (menu reduced, big screen); otherwise one at a time.
  const box = useRef<HTMLDivElement>(null);
  const [two, setTwo] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTwo(el.clientWidth >= 880));
    ro.observe(el);
    setTwo(el.clientWidth >= 880);
    return () => ro.disconnect();
  }, [status?.connected]);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [folder, setFolder] = useState("INBOX");
  const [list, setList] = useState<MailItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openUid, setOpenUid] = useState<number | null>(null);
  const [full, setFull] = useState<MailFull | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<MailDraft | null>(null);
  const cache = useMemo(() => new Map<string, MailFull>(), []);
  const openRef = useRef<number | null>(null);
  // Connection form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [imapS, setImapS] = useState<MailServer>({
    host: "",
    port: 993,
    secure: true,
  });
  const [smtpS, setSmtpS] = useState<MailServer>({
    host: "",
    port: 465,
    secure: true,
  });
  const [user, setUser] = useState("");

  const role = folders.find((f) => f.path === folder)?.role ?? "inbox";
  const current_ = status?.accounts.find((a) => a.id === account) ?? status?.accounts[0];
  const loadFolders = () =>
    call<MailFolder[]>("folders")
      .then((fs) => {
        setFolders(fs);
        // The counter of the menu: every mailbox together.
        if ((status?.accounts.length ?? 1) > 1)
          void mailCall<{ unseen: number }>(supabase!, "unseen")
            .then((r) => setBadge("mail", r.unseen))
            .catch(() => undefined);
        else setBadge("mail", fs.find((f) => f.role === "inbox")?.unseen ?? 0);
      })
      .catch(() => undefined);
  const switchTo = (id: number | null, s: MailStatus | null = status) => {
    accountRef.current = id;
    setAccount(id);
    setFolder("INBOX");
    setFolders([]);
    setOpenUid(null);
    setFull(null);
    setQuery("");
    setSearch("");
    cache.clear();
    setSignature(null);
    if (id && s?.connected) {
      void loadFolders();
      void load({ folder: "INBOX", search: "" });
      void call<{ html: string }>("signature")
        .then((r) =>
          setSignature({
            html: r.html,
            on: s.accounts.find((a) => a.id === id)?.signature.on ?? true,
          }),
        )
        .catch(() => undefined);
    }
  };
  const load = async (opts: { folder?: string; page?: number; search?: string } = {}) => {
    const f = opts.folder ?? folder;
    const p = opts.page ?? 1;
    const q = opts.search ?? query;
    setError(null);
    if (p === 1) {
      setList(null);
      setSelected([]);
    }
    try {
      const r = await call<{ items: MailItem[]; hasMore: boolean }>("list", {
        folder: f,
        page: p,
        search: q || undefined,
      });
      setList((old) => (p === 1 ? r.items : [...(old ?? []), ...r.items]));
      setHasMore(r.hasMore);
      setPage(p);
      // The first emails are fetched in the background: they open at once.
      void (async () => {
        for (const m of r.items.slice(0, 6)) {
          const k = accountRef.current + ":" + f + ":" + m.uid;
          if (cache.has(k)) continue;
          const one = await call<MailFull>("read", {
            uid: m.uid,
            folder: f,
            peek: true,
          }).catch(() => null);
          if (one) cache.set(k, one);
        }
      })();
    } catch (e) {
      setError((e as Error).message);
      setList([]);
    }
  };

  useEffect(() => {
    if (!base || !supabase) return;
    // Back from Microsoft's / Google's page: ?box=<new mailbox> or ?mailerr=<reason>.
    const params = new URLSearchParams(window.location.search);
    const wanted = Number(params.get("box")) || null;
    const failed = params.get("mailerr");
    if (wanted || failed) {
      params.delete("box");
      params.delete("mailerr");
      window.history.replaceState(null, "", window.location.pathname + (params.size ? "?" + params : ""));
      if (failed) toast(failed, "error");
    }
    call<MailStatus>("status")
      .then((s) => {
        setStatus(s);
        if (s.connected) switchTo(s.accounts.find((a) => a.id === wanted)?.id ?? s.accounts[0].id, s);
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, supabase]);

  // New emails appear on their own (every minute while the page is open).
  useEffect(() => {
    if (!status?.connected) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible" || query || page > 1) return;
      void loadFolders();
      call<{ items: MailItem[]; hasMore: boolean }>("list", { folder, page: 1 })
        .then((r) => setList((old) => (old && r.items.length && old[0]?.uid === r.items[0]?.uid ? old : r.items)))
        .catch(() => undefined);
    }, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, folder, query, page]);

  const openMail = async (m: MailItem) => {
    openRef.current = m.uid;
    setOpenUid(m.uid);
    const k = accountRef.current + ":" + folder + ":" + m.uid;
    const hit = cache.get(k);
    setFull(hit ?? null);
    if (!m.seen) {
      setList((l) => l?.map((x) => (x.uid === m.uid ? { ...x, seen: true } : x)) ?? l);
      setFolders((fs) => fs.map((f) => (f.path === folder ? { ...f, unseen: Math.max(0, f.unseen - 1) } : f)));
      if (role === "inbox") setBadge("mail", Math.max(0, (folders.find((f) => f.path === folder)?.unseen ?? 1) - 1));
    }
    if (role === "drafts") {
      const d = hit ?? (await call<MailFull>("read", { uid: m.uid, folder, peek: true }).catch(() => null));
      if (d)
        setDraft({
          ...blankDraft(),
          to: d.to,
          cc: d.cc,
          subject: d.subject === "(sans objet)" ? "" : d.subject,
          body: d.text,
          draftUid: m.uid,
          showCc: Boolean(d.cc),
        });
      return;
    }
    if (hit) {
      if (!m.seen) void call("act", { uids: [m.uid], folder, action: "read" }).catch(() => undefined);
      return;
    }
    try {
      const one = await call<MailFull>("read", { uid: m.uid, folder });
      cache.set(k, one);
      if (openRef.current === m.uid) setFull(one);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const act = async (action: string, uids: number[], to?: string) => {
    const moving = !["read", "unread", "star", "unstar"].includes(action);
    setList((l) =>
      moving
        ? (l?.filter((x) => !uids.includes(x.uid)) ?? l)
        : (l?.map((x) =>
            uids.includes(x.uid)
              ? {
                  ...x,
                  seen: action === "read" ? true : action === "unread" ? false : x.seen,
                  flagged: action === "star" ? true : action === "unstar" ? false : x.flagged,
                }
              : x,
          ) ?? l),
    );
    if (moving && openUid && uids.includes(openUid)) {
      setOpenUid(null);
      setFull(null);
    }
    try {
      await call("act", { uids, folder, action, to });
      if (moving || action === "read" || action === "unread") void loadFolders();
    } catch (e) {
      toast((e as Error).message, "error");
      void load({ page: 1 });
    }
  };

  const download = async (a: { index: number; name: string }) => {
    if (!full) return;
    try {
      const f = await call<{ name: string; type: string; data: string }>("attachment", { uid: full.uid, index: a.index, folder });
      const bytes = Uint8Array.from(atob(f.data), (ch) => ch.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: f.type || "application/octet-stream" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = f.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  if (!base) return <EmptyState title="Boîte mail" text="Disponible sur le site publié." />;
  if (!status) return error ? <p className="text-sm text-red-600">{error}</p> : <Skeleton className="h-40" />;

  if (!status.connected || adding)
    return (
      <Card className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{status.connected ? "Ajouter une boîte mail" : "Connecter ma boîte mail pro"}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Lisez, répondez et écrivez vos emails ici, depuis votre adresse habituelle (OVH, Zimbra, Infomaniak, Gandi, Orange, Yahoo, iCloud, Gmail, Outlook…). Vos emails restent dans votre boîte :
            rien ne change sur votre téléphone ou votre ordinateur. Le mot de passe est chiffré et n'est jamais affiché.
          </p>
        </div>
        {status.oauth.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {status.oauth.map((provider) => (
              <Button
                key={provider}
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await call<{ url: string }>("oauth-start", {
                      provider,
                      back: window.location.href,
                    });
                    window.location.href = r.url;
                  } catch (e) {
                    setError((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                {provider === "microsoft" ? "Se connecter avec Microsoft (Outlook, Hotmail, 365)" : "Se connecter avec Google (Gmail)"}
              </Button>
            ))}
          </div>
        )}
        <Field label="Adresse email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Mot de passe de la boîte mail">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {/@(gmail|googlemail)\.com$/i.test(email.trim()) && (
          <p className="rounded-xl bg-[var(--brand)]/5 p-3 text-sm text-neutral-700 dark:text-neutral-300">
            Gmail : utilisez un <strong>mot de passe d'application</strong> (pas votre mot de passe habituel). Créez-le sur{" "}
            <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
              myaccount.google.com/apppasswords
            </a>{" "}
            (la validation en deux étapes doit être activée), puis collez-le ici.
          </p>
        )}
        {/@(outlook|hotmail|live|msn)\.[a-z.]+$/i.test(email.trim()) && !status.oauth.includes("microsoft") && (
          <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-neutral-700 dark:text-neutral-300">
            Outlook / Hotmail : Microsoft n'accepte plus les mots de passe pour les autres applis. La connexion « Se connecter avec Microsoft » arrive bientôt dans votre appli.
          </p>
        )}
        <button type="button" className="text-sm underline opacity-70" onClick={() => setAdvanced(!advanced)}>
          {advanced ? "Masquer les réglages avancés" : "Réglages avancés (si la connexion automatique échoue)"}
        </button>
        {advanced && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Serveur de réception (IMAP)">
              <Input value={imapS.host} placeholder="ex. ssl0.ovh.net" onChange={(e) => setImapS({ ...imapS, host: e.target.value.trim() })} />
            </Field>
            <Field label="Port IMAP">
              <Input
                type="number"
                value={imapS.port}
                onChange={(e) =>
                  setImapS({
                    ...imapS,
                    port: Number(e.target.value) || 993,
                    secure: Number(e.target.value) !== 143,
                  })
                }
              />
            </Field>
            <Field label="Serveur d'envoi (SMTP)">
              <Input value={smtpS.host} placeholder="ex. ssl0.ovh.net" onChange={(e) => setSmtpS({ ...smtpS, host: e.target.value.trim() })} />
            </Field>
            <Field label="Port SMTP">
              <Input
                type="number"
                value={smtpS.port}
                onChange={(e) =>
                  setSmtpS({
                    ...smtpS,
                    port: Number(e.target.value) || 465,
                    secure: Number(e.target.value) === 465,
                  })
                }
              />
            </Field>
            <Field label="Identifiant (si différent de l'adresse)">
              <Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy || !email || !password}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const s = await mailCall<MailStatus & { account: number }>(supabase!, "connect", {
                  email,
                  password,
                  ...(user ? { user } : {}),
                  ...(advanced && imapS.host && smtpS.host ? { imap: imapS, smtp: smtpS } : {}),
                });
                setStatus(s);
                setPassword("");
                setEmail("");
                setAdding(false);
                switchTo(s.account, s);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Connexion…" : "Connecter"}
          </Button>
          {adding && (
            <Button
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Annuler
            </Button>
          )}
        </div>
      </Card>
    );

  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };
  const current = list?.find((m) => m.uid === openUid);
  const outgoing = role === "sent" || role === "drafts";
  const fullOf = async (m: MailItem) =>
    cache.get(accountRef.current + ":" + folder + ":" + m.uid) ?? (full?.uid === m.uid ? full : await call<MailFull>("read", { uid: m.uid, folder, peek: true }).catch(() => null));
  const reply = (f: MailFull | null, all: boolean) => {
    if (!f) return;
    const others = all
      ? [f.to, f.cc]
          .join(",")
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x && !x.toLowerCase().includes((current_?.email ?? "").toLowerCase()) && !x.includes(f.fromEmail))
      : [];
    setDraft({
      ...blankDraft(),
      to: f.fromEmail,
      cc: others.join(", "),
      showCc: others.length > 0,
      subject: /^re\s*:/i.test(f.subject) ? f.subject : "Re : " + f.subject,
      body:
        "\n\n" +
        `Le ${new Date(f.date).toLocaleString()}, ${f.from} a écrit :\n` +
        f.text
          .split("\n")
          .slice(0, 60)
          .map((l) => "> " + l)
          .join("\n"),
      inReplyTo: f.messageId,
      references: f.references,
    });
  };
  const forward = (f: MailFull | null) =>
    f &&
    setDraft({
      ...blankDraft(),
      subject: "Tr : " + f.subject,
      body: "\n\n---------- Message transféré ----------\n" + `De : ${f.from} <${f.fromEmail}>\nDate : ${new Date(f.date).toLocaleString()}\nObjet : ${f.subject}\n\n` + f.text,
    });
  const close = () => {
    setOpenUid(null);
    setFull(null);
  };
  const choose = (path: string) => {
    setFolder(path);
    close();
    void load({ folder: path, page: 1 });
  };
  const toggleSelect = (uid: number, range: boolean) => {
    if (!list) return;
    if (range && anchor.current !== null) {
      const a = list.findIndex((x) => x.uid === anchor.current);
      const b = list.findIndex((x) => x.uid === uid);
      const ids = list.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.uid);
      setSelected((sel) => Array.from(new Set([...sel, ...ids])));
    } else setSelected((sel) => (sel.includes(uid) ? sel.filter((x) => x !== uid) : [...sel, uid]));
    anchor.current = uid;
  };
  const clearSelection = () => {
    setSelected([]);
    setSelecting(false);
  };
  /** An action on the selected emails, or on the open one. */
  const onTargets = async (action: string) => {
    const uids = selected.length ? selected : openUid ? [openUid] : [];
    if (!uids.length) return;
    if (action === "trash" && role === "trash") {
      if (!(await confirmAction(uids.length > 1 ? `Supprimer définitivement ${uids.length} emails ?` : "Supprimer définitivement cet email ?"))) return;
      action = "delete";
    }
    void act(action, uids);
    if (selected.length) clearSelection();
  };
  const remove = async (m: MailItem) => {
    if (role === "trash") {
      if (await confirmAction("Supprimer définitivement cet email ?")) void act("delete", [m.uid]);
    } else void act("trash", [m.uid]);
  };
  // Same actions everywhere: right-click / long press in the list, « ⋯ » in the email.
  const actions = (m: MailItem, inReader: boolean): MenuItem[] => [
    ...(inReader
      ? []
      : [
          {
            label: "Ouvrir",
            icon: "open" as const,
            run: () => void openMail(m),
          },
        ]),
    ...(role === "drafts"
      ? []
      : [
          {
            label: "Répondre",
            icon: "reply" as const,
            run: async () => reply(await fullOf(m), false),
          },
          {
            label: "Répondre à tous",
            icon: "replyAll" as const,
            run: async () => reply(await fullOf(m), true),
          },
          {
            label: "Transférer",
            icon: "forward" as const,
            run: async () => forward(await fullOf(m)),
          },
          "-" as const,
        ]),
    m.seen
      ? {
          label: "Marquer comme non lu",
          icon: "unread",
          run: () => (void act("unread", [m.uid]), inReader && close()),
        }
      : {
          label: "Marquer comme lu",
          icon: "read",
          run: () => void act("read", [m.uid]),
        },
    {
      label: m.flagged ? "Ne plus suivre" : "Suivre (étoile)",
      icon: "star",
      run: () => void act(m.flagged ? "unstar" : "star", [m.uid]),
    },
    ...(role !== "archive"
      ? [
          {
            label: "Archiver",
            icon: "archive" as const,
            run: () => void act("archive", [m.uid]),
          },
        ]
      : []),
    role === "junk"
      ? {
          label: "Ce n'est pas du spam",
          icon: "inbox",
          run: () => void act("inbox", [m.uid]),
        }
      : {
          label: "Signaler comme spam",
          icon: "junk",
          run: () => void act("junk", [m.uid]),
        },
    { label: "Déplacer vers…", icon: "move", run: () => setMoving([m.uid]) },
    ...(inReader
      ? []
      : [
          {
            label: "Sélectionner",
            icon: "read" as const,
            run: () => (setSelecting(true), toggleSelect(m.uid, false)),
          },
        ]),
    "-",
    {
      label: role === "trash" ? "Supprimer définitivement" : "Supprimer",
      icon: role === "trash" ? "remove" : "trash",
      danger: true,
      run: () => void remove(m),
    },
  ];
  const inbox = folders.find((f) => f.role === "inbox");
  const back = location.pathname + "?s=" + (new URLSearchParams(location.search).get("s") ?? "mailbox");
  // Keyboard, like a mail app (« ? » shows the list). The listener is set once, above; it calls this.
  keyHandler.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest("input,textarea,select,[contenteditable='true']") || draft || settingsOpen || moving || menu || helpOpen || !list) return;
    const idx = list.findIndex((m) => m.uid === openUid);
    const cur = idx >= 0 ? list[idx] : null;
    const go = (i: number) => {
      const m = list[Math.max(0, Math.min(list.length - 1, i))];
      if (m) void openMail(m);
    };
    const k = e.key;
    if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "a") {
      e.preventDefault();
      setSelected(list.map((m) => m.uid));
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const keys: Record<string, () => void> = {
      j: () => go(idx + 1),
      ArrowDown: () => go(idx + 1),
      k: () => go(idx < 0 ? 0 : idx - 1),
      ArrowUp: () => go(idx < 0 ? 0 : idx - 1),
      x: () => cur && toggleSelect(cur.uid, false),
      e: () => void onTargets("archive"),
      "#": () => void onTargets("trash"),
      Delete: () => void onTargets("trash"),
      Backspace: () => void onTargets("trash"),
      r: () => cur && fullOf(cur).then((f) => reply(f, false)),
      a: () => cur && fullOf(cur).then((f) => reply(f, true)),
      f: () => cur && fullOf(cur).then((f) => forward(f)),
      u: () => void onTargets("unread"),
      i: () => void onTargets("read"),
      s: () => cur && void act(cur.flagged ? "unstar" : "star", [cur.uid]),
      c: () => setDraft(blankDraft()),
      "/": () => searchRef.current?.focus(),
      "?": () => setHelpOpen(true),
      Escape: () => (selected.length || selecting ? clearSelection() : close()),
    };
    const run = keys[k];
    if (!run) return;
    e.preventDefault();
    run();
  };
  const tool =
    "inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-neutral-700 transition hover:bg-black/5 active:scale-[0.97] dark:text-neutral-200 dark:hover:bg-white/10";

  return (
    <div ref={box} className="space-y-4">
      {/* Top: write, search, refresh, settings */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setDraft(blankDraft())} className="shrink-0">
          <MailIcon name="write" />
          <span className="max-sm:hidden">Écrire</span>
        </Button>
        {status.accounts.length > 1 && (
          <Select aria-label="Boîte mail" className="w-auto max-w-[40%] shrink-0 rounded-full" value={String(account ?? "")} onChange={(e) => switchTo(Number(e.target.value))}>
            {status.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
                {a.shared ? " · partagée" : ""}
              </option>
            ))}
          </Select>
        )}
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
            close();
            void load({ page: 1, search });
          }}
        >
          <MailIcon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input ref={searchRef} type="search" className="rounded-full pl-11 pr-10" value={search} placeholder="Rechercher dans les emails" onChange={(e) => setSearch(e.target.value)} />
          {query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => {
                setSearch("");
                setQuery("");
                void load({ page: 1, search: "" });
              }}
            >
              <MailIcon name="close" className="size-4" />
            </button>
          )}
        </form>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Actualiser"
          title="Actualiser"
          onClick={() => {
            void loadFolders();
            void load({ page: 1 });
          }}
        >
          <MailIcon name="refresh" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Réglages de la boîte mail" title="Réglages" onClick={() => setSettingsOpen(true)}>
          <MailIcon name="settings" />
        </Button>
      </div>

      {/* Folders */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {folders.map((f) => (
          <button
            key={f.path}
            type="button"
            onClick={() => choose(f.path)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
              folder === f.path
                ? "bg-[var(--brand)] text-white shadow-sm shadow-[var(--brand)]/20"
                : "bg-black/[0.04] text-neutral-700 hover:bg-black/[0.07] dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10",
            )}
          >
            <MailIcon name={f.role} className="size-4" />
            {f.name}
            {f.unseen > 0 && f.role !== "sent" && f.role !== "trash" && (
              <span className={cn("rounded-full px-1.5 text-xs leading-5", folder === f.path ? "bg-white/25" : "bg-[var(--brand)] text-white")}>{f.unseen}</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {query && <p className="text-sm text-neutral-500">Résultats pour « {query} »</p>}

      <div className={cn("grid gap-4", two && "grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]")}>
        {/* List */}
        <Card className={cn("overflow-hidden p-1.5", two && "h-[calc(100dvh-16rem)] min-h-[30rem] overflow-y-auto", openUid && !two && "hidden")}>
          {list && list.length > 0 && (
            <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 flex min-h-12 items-center gap-1 border-b border-black/5 bg-white/95 px-2 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
              {selected.length || selecting ? (
                <>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected.length === list.length}
                    aria-label="Tout sélectionner"
                    title="Tout sélectionner (Ctrl/⌘ + A)"
                    onClick={() => setSelected(selected.length === list.length ? [] : list.map((m) => m.uid))}
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border-2 transition",
                      selected.length === list.length ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-neutral-300 dark:border-neutral-600",
                    )}
                  >
                    {selected.length === list.length && (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
                    {selected.length} sélectionné
                    {selected.length > 1 ? "s" : ""}
                  </span>
                  {selected.length > 0 && (
                    <>
                      <button type="button" className={tool + " px-2"} title="Marquer comme lu" aria-label="Marquer comme lu" onClick={() => void onTargets("read")}>
                        <MailIcon name="read" />
                      </button>
                      <button type="button" className={tool + " px-2"} title="Marquer comme non lu" aria-label="Marquer comme non lu" onClick={() => void onTargets("unread")}>
                        <MailIcon name="unread" />
                      </button>
                      {role !== "archive" && (
                        <button type="button" className={tool + " px-2"} title="Archiver (e)" aria-label="Archiver" onClick={() => void onTargets("archive")}>
                          <MailIcon name="archive" />
                        </button>
                      )}
                      <button type="button" className={tool + " px-2"} title="Déplacer" aria-label="Déplacer" onClick={() => setMoving(selected)}>
                        <MailIcon name="move" />
                      </button>
                      <button type="button" className={tool + " px-2 hover:text-red-600"} title="Supprimer (#)" aria-label="Supprimer" onClick={() => void onTargets("trash")}>
                        <MailIcon name={role === "trash" ? "remove" : "trash"} />
                      </button>
                    </>
                  )}
                  <button type="button" className={tool + " px-2"} title="Annuler la sélection (Échap)" aria-label="Annuler la sélection" onClick={clearSelection}>
                    <MailIcon name="close" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={tool} onClick={() => setSelecting(true)}>
                    <span className="size-4 rounded-full border-2 border-current" />
                    Sélectionner
                  </button>
                  <span className="flex-1" />
                  <button type="button" className={cn(tool, "hidden text-neutral-500 [@media(pointer:fine)]:inline-flex")} onClick={() => setHelpOpen(true)} title="Raccourcis clavier (?)">
                    ⌨ Raccourcis
                  </button>
                </>
              )}
            </div>
          )}
          {!list ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : list.length ? (
            <div className="space-y-0.5">
              {list.map((m) => (
                <MailRow
                  key={m.uid}
                  m={m}
                  active={openUid === m.uid}
                  outgoing={outgoing}
                  date={fmt(m.date)}
                  canArchive={role !== "archive"}
                  onOpen={() => void openMail(m)}
                  onStar={() => void act(m.flagged ? "unstar" : "star", [m.uid])}
                  onSwipe={(to) => (to === "trash" ? void remove(m) : void act("archive", [m.uid]))}
                  onMenu={(x, y) => setMenu({ x, y, uid: m.uid })}
                  checked={selected.includes(m.uid)}
                  selecting={selecting || selected.length > 0}
                  onSelect={(range) => toggleSelect(m.uid, range)}
                />
              ))}
              {hasMore && (
                <button type="button" className="w-full rounded-xl p-3 text-sm font-medium text-[var(--brand)] hover:bg-black/5 dark:hover:bg-white/5" onClick={() => void load({ page: page + 1 })}>
                  Afficher plus
                </button>
              )}
            </div>
          ) : (
            <div className="grid place-items-center gap-2 px-4 py-16 text-center text-sm text-neutral-500">
              <MailIcon name={query ? "search" : role} className="size-8 text-neutral-300 dark:text-neutral-600" />
              {query ? "Aucun email trouvé." : "Aucun email ici."}
            </div>
          )}
          <p className="hidden px-3 pb-2 pt-3 text-center text-xs text-neutral-400 [@media(pointer:fine)]:block">Clic droit sur un email pour plus d'actions</p>
          <p className="px-3 pb-2 pt-3 text-center text-xs text-neutral-400 [@media(pointer:fine)]:hidden">Glissez → archiver · ← corbeille · appui long : plus d'actions</p>
        </Card>

        {/* Reading */}
        <Card className={cn("@container flex min-w-0 flex-col p-0", two && "h-[calc(100dvh-16rem)] min-h-[30rem]", !openUid && !two && "hidden")}>
          {!openUid || !current ? (
            <div className="grid flex-1 place-items-center gap-2 p-10 text-center text-sm text-neutral-500">
              <div className="grid justify-items-center gap-3">
                <MailIcon name="read" className="size-10 text-neutral-300 dark:text-neutral-600" />
                {inbox && inbox.unseen > 0 ? `${inbox.unseen} email${inbox.unseen > 1 ? "s" : ""} non lu${inbox.unseen > 1 ? "s" : ""}` : "Choisissez un email"}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 overflow-hidden border-b border-black/5 px-2 py-2 dark:border-white/10">
                {!two && (
                  <button type="button" className={tool} aria-label="Retour à la liste" onClick={close}>
                    <MailIcon name="back" />
                    <span className="max-sm:hidden">Retour</span>
                  </button>
                )}
                {role !== "drafts" && (
                  <>
                    <button type="button" className={tool} onClick={() => reply(full, false)} disabled={!full}>
                      <MailIcon name="reply" />
                      <span className="@max-sm:hidden">Répondre</span>
                    </button>
                    <button type="button" className={cn(tool, "@max-lg:hidden")} onClick={() => reply(full, true)} disabled={!full}>
                      <MailIcon name="replyAll" />
                      Répondre à tous
                    </button>
                    <button type="button" className={tool} onClick={() => forward(full)} disabled={!full}>
                      <MailIcon name="forward" />
                      <span className="@max-sm:hidden">Transférer</span>
                    </button>
                  </>
                )}
                <span className="flex-1" />
                {role !== "archive" && (
                  <button type="button" className={tool} title="Archiver" onClick={() => void act("archive", [current.uid])}>
                    <MailIcon name="archive" />
                    <span className="@max-3xl:hidden">Archiver</span>
                  </button>
                )}
                <button type="button" className={cn(tool, "hover:text-red-600")} title={role === "trash" ? "Supprimer définitivement" : "Supprimer"} onClick={() => void remove(current)}>
                  <MailIcon name={role === "trash" ? "remove" : "trash"} />
                  <span className="@max-3xl:hidden">Supprimer</span>
                </button>
                <button
                  type="button"
                  className={tool}
                  aria-label="Plus d'actions"
                  title="Plus d'actions"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenu({
                      x: r.right - 224,
                      y: r.bottom + 6,
                      uid: current.uid,
                      reader: true,
                    });
                  }}
                >
                  <MailIcon name="more" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <h3 translate="no" className="min-w-0 flex-1 text-xl font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                    {full?.subject ?? current.subject}
                  </h3>
                  <button
                    type="button"
                    aria-label={current.flagged ? "Ne plus suivre" : "Suivre"}
                    onClick={() => void act(current.flagged ? "unstar" : "star", [current.uid])}
                    className={cn("grid size-9 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10", current.flagged ? "text-amber-500" : "text-neutral-400")}
                  >
                    <MailIcon name="star" filled={current.flagged} />
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)]/15 font-semibold text-[var(--brand)]">
                    {((full?.from || current.from || "?").replace(/^[^\p{L}\p{N}]+/u, "")[0] ?? "?").toUpperCase()}
                  </span>
                  <div translate="no" className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{full?.from || current.from}</span>
                      {full && <span className="truncate text-neutral-500">{full.fromEmail}</span>}
                    </p>
                    {full && (
                      <p className="text-xs text-neutral-500">
                        {new Date(full.date).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {full.to ? " · À : " + full.to : ""}
                        {full.cc ? " · Cc : " + full.cc : ""}
                      </p>
                    )}
                  </div>
                </div>
                {!full ? (
                  <Skeleton className="h-64" />
                ) : (
                  <>
                    {full.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {full.attachments.map((a) => (
                          <button
                            key={a.index}
                            type="button"
                            onClick={() => void download(a)}
                            className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-left text-xs transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                          >
                            <MailIcon name="clip" className="size-4 text-neutral-500" />
                            <span className="max-w-[14rem] truncate font-medium">{a.name}</span>
                            <span className="text-neutral-500">{Math.max(1, Math.round(a.size / 1024))} Ko</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {full.html ? (
                      <iframe
                        title="email"
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={'<base target="_blank"><style>body{font-family:system-ui,sans-serif;margin:16px;word-wrap:break-word}img{max-width:100%;height:auto}</style>' + full.html}
                        className={cn("w-full rounded-xl border border-black/5 bg-white dark:border-white/10", two ? "h-full min-h-[24rem]" : "h-[65vh]")}
                      />
                    ) : (
                      <pre translate="no" className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                        {full.text}
                      </pre>
                    )}
                    {role !== "drafts" && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="secondary" onClick={() => reply(full, false)}>
                          <MailIcon name="reply" /> Répondre
                        </Button>
                        <Button variant="outline" onClick={() => forward(full)}>
                          <MailIcon name="forward" /> Transférer
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {menu &&
        (() => {
          const m = list?.find((x) => x.uid === menu.uid);
          return m ? <MailMenu at={menu} items={actions(m, Boolean(menu.reader))} onClose={() => setMenu(null)} /> : null;
        })()}

      {/* Move to a folder */}
      <Dialog open={moving !== null} onClose={() => setMoving(null)} title="Déplacer vers">
        <div className="grid gap-1">
          {folders
            .filter((f) => f.path !== folder)
            .map((f) => (
              <button
                key={f.path}
                type="button"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  if (moving) void act("move", moving, f.path);
                  setMoving(null);
                  setSelected([]);
                }}
              >
                <MailIcon name={f.role} className="text-neutral-500" />
                {f.name}
              </button>
            ))}
        </div>
      </Dialog>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Raccourcis clavier">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {[
            ["j / ↓", "Email suivant"],
            ["k / ↑", "Email précédent"],
            ["x", "Sélectionner l'email ouvert"],
            ["Ctrl/⌘ + A", "Tout sélectionner"],
            ["Maj + clic", "Sélectionner jusqu'ici"],
            ["e", "Archiver"],
            ["# / Suppr", "Supprimer"],
            ["r", "Répondre"],
            ["a", "Répondre à tous"],
            ["f", "Transférer"],
            ["u / i", "Non lu / Lu"],
            ["s", "Suivre (étoile)"],
            ["c", "Écrire"],
            ["/", "Rechercher"],
            ["Échap", "Fermer / annuler la sélection"],
          ].map(([key, what]) => (
            <Fragment key={key}>
              <dt>
                <kbd className="rounded-md border border-black/10 bg-black/[0.03] px-1.5 py-0.5 font-mono text-xs dark:border-white/15 dark:bg-white/5">{key}</kbd>
              </dt>
              <dd className="text-neutral-600 dark:text-neutral-300">{what}</dd>
            </Fragment>
          ))}
        </dl>
      </Dialog>

      {/* Settings: every mailbox of the app, each with its alerts and its signature */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title={status.accounts.length > 1 ? "Mes boîtes mail" : "Réglages de la boîte mail"}>
        <div className="space-y-4">
          {status.accounts.map((acc) => (
            <MailAccountSettings
              key={acc.id}
              acc={acc}
              single={status.accounts.length === 1}
              back={back}
              onChange={(s, patch) => {
                if (s) setStatus(s);
                else if (patch)
                  setStatus((old) =>
                    old
                      ? {
                          ...old,
                          accounts: old.accounts.map((a) => (a.id === acc.id ? { ...a, ...patch } : a)),
                        }
                      : old,
                  );
                if (patch?.signature && acc.id === account) setSignature((x) => (x ? { ...x, on: patch.signature!.on } : x));
              }}
              onRemoved={() => {
                setSettingsOpen(false);
                const left = status.accounts.filter((a) => a.id !== acc.id);
                if (!left.length) setBadge("mail", 0);
                switchTo(acc.id === account ? (left[0]?.id ?? null) : account, {
                  ...status,
                  accounts: left,
                  connected: left.length > 0,
                });
              }}
            />
          ))}
          <Button
            variant="secondary"
            onClick={() => {
              setSettingsOpen(false);
              setAdding(true);
            }}
          >
            + Ajouter une boîte mail
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.inReplyTo ? "Répondre" : draft?.draftUid ? "Brouillon" : "Nouveau message"}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                if (!draft) return;
                setBusy(true);
                try {
                  const { attachments, showCc: _showCc, ...rest } = draft;
                  void _showCc;
                  const r = await call<{ draftUid?: number }>("draft", {
                    ...rest,
                    attachments: attachments.map(({ size: _s, ...a }) => (void _s, a)),
                  });
                  setDraft({ ...draft, draftUid: r.draftUid });
                  toast("Brouillon enregistré ✓");
                  void loadFolders();
                } catch (e) {
                  toast((e as Error).message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Enregistrer le brouillon
            </Button>
            <Button
              disabled={busy || !draft?.to || !draft?.subject || !draft?.body.trim()}
              onClick={async () => {
                if (!draft) return;
                setBusy(true);
                try {
                  const { attachments, showCc: _showCc, ...rest } = draft;
                  void _showCc;
                  await call("send", {
                    ...rest,
                    attachments: attachments.map(({ size: _s, ...a }) => (void _s, a)),
                  });
                  toast("Email envoyé ✓");
                  setDraft(null);
                  void loadFolders();
                  if (role === "drafts" || role === "sent") void load({ page: 1 });
                } catch (e) {
                  toast((e as Error).message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "…" : "Envoyer"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <Field label="À">
              <Input value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="adresse@exemple.be (plusieurs : séparées par des virgules)" />
            </Field>
            {draft.showCc ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cc">
                  <Input value={draft.cc} onChange={(e) => setDraft({ ...draft, cc: e.target.value })} />
                </Field>
                <Field label="Cci">
                  <Input value={draft.bcc} onChange={(e) => setDraft({ ...draft, bcc: e.target.value })} />
                </Field>
              </div>
            ) : (
              <button type="button" className="text-xs underline opacity-70" onClick={() => setDraft({ ...draft, showCc: true })}>
                Ajouter Cc / Cci
              </button>
            )}
            <Field label="Objet">
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </Field>
            {status.accounts.length > 1 && (
              <p className="text-xs text-neutral-500">
                Envoyé depuis <strong>{current_?.email}</strong>
              </p>
            )}
            <Field label="Message">
              <Textarea rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} autoFocus />
            </Field>
            {signature?.on && signature.html && (
              <div className="space-y-1">
                <p className="text-xs text-neutral-500">Signature ajoutée à l'envoi</p>
                <iframe
                  title="Signature"
                  sandbox=""
                  srcDoc={'<body style="margin:8px;background:#fff">' + signature.html + "</body>"}
                  className="h-32 w-full rounded-xl border border-black/5 bg-white dark:border-white/10"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-full border border-black/10 px-3 py-1.5 text-sm dark:border-white/15">
                <MailIcon name="clip" className="mr-1.5 inline size-4 align-[-3px]" />
                Joindre un fichier
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    const total = draft.attachments.reduce((n, a) => n + a.size, 0) + files.reduce((n, f) => n + f.size, 0);
                    if (total > 3_000_000) return toast("Pièces jointes trop lourdes (3 Mo au total depuis l'appli).", "error");
                    const added = await Promise.all(
                      files.map(
                        (f) =>
                          new Promise<MailDraft["attachments"][number]>((resolve) => {
                            const r = new FileReader();
                            r.onload = () =>
                              resolve({
                                name: f.name,
                                type: f.type || "application/octet-stream",
                                size: f.size,
                                data: String(r.result).split(",")[1] ?? "",
                              });
                            r.readAsDataURL(f);
                          }),
                      ),
                    );
                    setDraft((d) => (d ? { ...d, attachments: [...d.attachments, ...added] } : d));
                  }}
                />
              </label>
              {draft.attachments.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  className="rounded-full bg-black/5 px-3 py-1.5 text-xs dark:bg-white/10"
                  title="Retirer"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      attachments: draft.attachments.filter((_, j) => j !== i),
                    })
                  }
                >
                  {a.name} ✕
                </button>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

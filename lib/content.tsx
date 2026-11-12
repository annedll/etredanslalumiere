// Injected by Usin (content engine: texts, images and lists editable with the pencil, data cache, visits). Do not edit.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { brand } from "./brand";
import { useI18n, t as translate, languages } from "./i18n";
import { ImageEditor, uploadImage, imageSizeClass, imageFrameRadius } from "./image-editor";
export { imageFrameRadius } from "./image-editor";
import { Sheet } from "./mobile";
import { env } from "./env";

type Settings = Record<string, unknown>;
export type ViewAs = "admin" | "client" | "visitor";

const SETTINGS_CACHE = "usin:settings";
const NO_TRACK = "usin:no-track";
const CONSENT = "cookie-consent";
const VIEW_AS = "usin:view-as";
const TIMEOUT = 8000;

const UI: Record<string, Record<string, string>> = {
  fr: { save: "Enregistrer", cancel: "Annuler", image: "Changer l'image", list: "Modifier la liste", add: "Ajouter", remove: "Retirer", up: "Monter", down: "Descendre", empty: "Texte à écrire", bg: "Fond de la section", bgPick: "Choisir une image", bgStrength: "Intensité", bgNone: "Retirer le fond", bgHint: "Plus l'intensité est basse, plus l'image est pâle et le texte reste lisible." },
  en: { save: "Save", cancel: "Cancel", image: "Change image", list: "Edit list", add: "Add", remove: "Remove", up: "Move up", down: "Move down", empty: "Text to write", bg: "Section background", bgPick: "Choose an image", bgStrength: "Intensity", bgNone: "Remove the background", bgHint: "The lower the intensity, the paler the image and the easier the text is to read." },
  nl: { save: "Opslaan", cancel: "Annuleren", image: "Afbeelding wijzigen", list: "Lijst bewerken", add: "Toevoegen", remove: "Verwijderen", up: "Omhoog", down: "Omlaag", empty: "Tekst te schrijven", bg: "Achtergrond van de sectie", bgPick: "Kies een afbeelding", bgStrength: "Intensiteit", bgNone: "Achtergrond verwijderen", bgHint: "Hoe lager de intensiteit, hoe bleker de afbeelding en hoe leesbaarder de tekst." },
  de: { save: "Speichern", cancel: "Abbrechen", image: "Bild ändern", list: "Liste bearbeiten", add: "Hinzufügen", remove: "Entfernen", up: "Nach oben", down: "Nach unten", empty: "Text schreiben", bg: "Hintergrund des Abschnitts", bgPick: "Bild wählen", bgStrength: "Intensität", bgNone: "Hintergrund entfernen", bgHint: "Je geringer die Intensität, desto blasser das Bild und desto besser lesbar der Text." },
  es: { save: "Guardar", cancel: "Cancelar", image: "Cambiar imagen", list: "Editar lista", add: "Añadir", remove: "Quitar", up: "Subir", down: "Bajar", empty: "Texto por escribir", bg: "Fondo de la sección", bgPick: "Elegir una imagen", bgStrength: "Intensidad", bgNone: "Quitar el fondo", bgHint: "Cuanto más baja la intensidad, más pálida la imagen y más legible el texto." },
};
const ui = (lang: string, key: string) => (UI[lang] ?? UI.en)[key] ?? UI.en[key];

/** Never waits forever: past the delay, the page keeps what it already shows. */
export function withTimeout<T>(p: PromiseLike<T>, ms = TIMEOUT): Promise<T> {
  return Promise.race([Promise.resolve(p), new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "";

function initialSettings(): Settings {
  try {
    const published = (window as unknown as { __USIN_SETTINGS__?: Settings }).__USIN_SETTINGS__;
    if (published && typeof published === "object" && Object.keys(published).length) return { ...published };
  } catch {
    // No snapshot: local copy.
  }
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_CACHE) || "null");
    if (saved && typeof saved === "object") return saved as Settings;
  } catch {
    // Storage unavailable.
  }
  return {};
}
const persist = (s: Settings) => {
  try {
    localStorage.setItem(SETTINGS_CACHE, JSON.stringify(s));
  } catch {
    // Not kept for the next visit: still applied.
  }
};

/** Cookie consent (measurement): read by the visits counter. */
export type Consent = { measure: boolean } | null;
export function getConsent(): Consent {
  try {
    return JSON.parse(localStorage.getItem(CONSENT) || "null") as Consent;
  } catch {
    return null;
  }
}
export function setConsent(c: Consent) {
  try {
    if (c) localStorage.setItem(CONSENT, JSON.stringify(c));
    else localStorage.removeItem(CONSENT);
  } catch {
    // Not remembered.
  }
  window.dispatchEvent(new Event("consent-change"));
}

type ContentCtx = {
  supabase: SupabaseClient | null;
  settings: Settings;
  /** Text / value of a key in the current language (key.<lang>, then the app's translation, then the main language, then the default). */
  get: (key: string) => any;
  /** Same, as text. */
  text: (key: string) => string;
  flag: (key: string) => boolean;
  /** Saves a value (texts in another language than the main one go to key.<lang>). */
  save: (key: string, value: unknown, opts?: { translated?: boolean }) => Promise<void>;
  remove: (key: string) => Promise<void>;
  ready: boolean;
  session: Session | null;
  user: Session["user"] | null;
  realAdmin: boolean;
  isAdmin: boolean;
  viewAs: ViewAs;
  setViewAs: (v: ViewAs) => void;
  editMode: boolean;
  setEditMode: (b: boolean) => void;
  lang: string;
};
const Ctx = createContext<ContentCtx | null>(null);

/** The content engine of the app (place it inside <BrowserRouter>, around the whole app). */
export function ContentProvider({ supabase, defaults = {}, children }: { supabase: SupabaseClient | null; defaults?: Settings; children: ReactNode }) {
  const { lang } = useI18n();
  const main = languages[0] ?? lang;
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [realAdmin, setRealAdmin] = useState(false);
  const [viewAs, setViewAsState] = useState<ViewAs>(() => {
    try {
      return (localStorage.getItem(VIEW_AS) as ViewAs) || "admin";
    } catch {
      return "admin";
    }
  });
  const [editMode, setEditModeState] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    withTimeout(supabase.from("app_settings").select("key,value"))
      .then(({ data, error }) => {
        if (!alive || error || !Array.isArray(data)) return;
        const next: Settings = {};
        for (const row of data as { key: string; value: unknown }[]) next[row.key] = row.value;
        setSettings(next);
        persist(next);
      })
      .catch(() => undefined)
      .finally(() => alive && setReady(true));
    withTimeout(supabase.auth.getSession())
      .then(({ data }) => alive && setSession(data.session))
      .catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      setRealAdmin(false);
      return;
    }
    withTimeout(supabase.rpc("is_admin"))
      .then(({ data }) => setRealAdmin(Boolean(data)))
      .catch(() => setRealAdmin(false));
  }, [supabase, session?.user?.id]);

  // An administrator's device never counts in the visits.
  useEffect(() => {
    if (!realAdmin) return;
    try {
      localStorage.setItem(NO_TRACK, "1");
    } catch {
      // Not remembered: their visits are still skipped while signed in.
    }
  }, [realAdmin]);

  const raw = (key: string): unknown => {
    if (lang !== main) {
      const own = settings[`${key}.${lang}`];
      if (!isEmpty(own)) return own;
      const translated = translate(key);
      if (translated !== key) return translated;
    }
    const value = settings[key];
    return isEmpty(value) ? (defaults[key] ?? "") : value;
  };
  const save = async (key: string, value: unknown, opts: { translated?: boolean } = {}) => {
    const target = opts.translated !== false && typeof value === "string" && lang !== main ? `${key}.${lang}` : key;
    setSettings((s) => {
      const next = { ...s, [target]: value };
      persist(next);
      return next;
    });
    if (!supabase) return;
    const { error } = await supabase.from("app_settings").upsert({ key: target, value });
    if (error) throw new Error(error.message);
    if (target === key) autoTranslate(key);
  };
  // A text written in the main language is translated by Usin into the other languages of the app, on its own, a moment after saving.
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTranslate = (key: string) => {
    const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";
    if (!base || languages.length < 2 || !supabase) return;
    pending.current.add(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const keys = [...pending.current];
      pending.current.clear();
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;
        await fetch(`${base}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, keys }),
          keepalive: true,
        });
      } catch {
        // Translated next time.
      }
    }, 2000);
  };
  const remove = async (key: string) => {
    setSettings((s) => {
      const next = { ...s };
      delete next[key];
      persist(next);
      return next;
    });
    if (!supabase) return;
    const { error } = await supabase.from("app_settings").delete().eq("key", key);
    if (error) throw new Error(error.message);
  };
  const setViewAs = (v: ViewAs) => {
    try {
      localStorage.setItem(VIEW_AS, v);
    } catch {
      // Not remembered.
    }
    setViewAsState(v);
    if (v !== "admin") setEditModeState(false);
  };
  const isAdmin = realAdmin && viewAs === "admin";
  const value: ContentCtx = {
    supabase,
    settings,
    get: raw,
    text: (key) => String(raw(key) ?? ""),
    flag: (key) => String(raw(key)) === "true",
    save,
    remove,
    ready,
    session,
    user: realAdmin && viewAs === "visitor" ? null : (session?.user ?? null),
    realAdmin,
    isAdmin,
    viewAs,
    setViewAs,
    editMode: isAdmin && editMode,
    setEditMode: (b) => setEditModeState(b && isAdmin),
    lang,
  };
  return (
    <Ctx.Provider value={value}>
      <PageViews supabase={supabase} skip={realAdmin} />
      {children}
    </Ctx.Provider>
  );
}

export function useContent(): ContentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useContent doit être utilisé à l'intérieur de <ContentProvider>.");
  return ctx;
}

// ------------------------------------------------------------------ visits (never the tests)

function testVisit() {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) return true;
  try {
    return Boolean(localStorage.getItem(NO_TRACK));
  } catch {
    return false;
  }
}

function PageViews({ supabase, skip }: { supabase: SupabaseClient | null; skip: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!supabase || skip || !getConsent()?.measure || testVisit()) return;
    const timer = setTimeout(() => {
      if (testVisit()) return;
      void Promise.resolve(supabase.from("page_views").insert({ path: pathname.slice(0, 200), referrer: document.referrer ? document.referrer.slice(0, 300) : null })).catch(
        () => undefined,
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [supabase, skip, pathname]);
  return null;
}

// ------------------------------------------------------------------ data with memory (instant navigation)

type Entry = { data: unknown; at: number };
const cache = new Map<string, Entry>();
const versions = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
const emit = (key: string) => listeners.get(key)?.forEach((l) => l());

/** Forgets cached data (after an add / edit / delete): every key starting with the prefix is reloaded. */
export function invalidate(prefix = "") {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      versions.set(key, (versions.get(key) ?? 0) + 1);
      emit(key);
    }
  }
}

/**
 * Data read from the database, kept in memory: a page already visited shows at once, then refreshes quietly.
 * key: a unique name (e.g. "posts" or "post:" + slug). fallback: shown only when the database is not set up or does not
 * answer (never when a table is simply empty: an empty list is shown as empty).
 */
export function useData<T>(
  key: string | null,
  fetcher: () => PromiseLike<{ data: unknown; error: unknown }>,
  opts: { fallback?: T } = {},
): { data: T | undefined; loading: boolean; error: string | null; reload: () => void } {
  const { supabase } = useContent();
  const hit = key ? cache.get(key) : undefined;
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!hit);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key) return;
    const l = () => setTick((n) => n + 1);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(l);
    return () => {
      listeners.get(key)?.delete(l);
    };
  }, [key]);

  const load = () => {
    if (!key) return;
    if (!supabase) {
      setLoading(false);
      return;
    }
    let req: PromiseLike<{ data: unknown; error: unknown }>;
    try {
      req = fetcherRef.current();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
      return;
    }
    withTimeout(req)
      .then(({ data, error: err }) => {
        if (err) throw err;
        cache.set(key, { data, at: Date.now() });
        setError(null);
        emit(key);
      })
      .catch((e: { message?: string }) => setError(e?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  const version = key ? (versions.get(key) ?? 0) : 0;
  useEffect(() => {
    load();
    // Loaded on the first display (a cached copy is shown meanwhile), when the key changes and after invalidate().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, supabase, version]);

  const current = key ? cache.get(key) : undefined;
  const data = (current ? current.data : !supabase || error ? opts.fallback : undefined) as T | undefined;
  return { data, loading: !current && loading, error, reload: () => key && invalidate(key) };
}

/**
 * Loads every page of the app in the background right after the first display (and on a link hover / touch), so a
 * tap never waits: preloadPages([() => import("./pages/Blog"), …]).
 */
export function usePreloadPages(loaders: (() => Promise<unknown>)[]) {
  useEffect(() => {
    let done = false;
    const all = () => {
      if (done) return;
      done = true;
      loaders.forEach((l) => void l().catch(() => undefined));
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(all, { timeout: 1500 }) : window.setTimeout(all, 1000);
    const intent = (e: Event) => (e.target as HTMLElement | null)?.closest?.("a") && all();
    document.addEventListener("pointerover", intent, { passive: true });
    document.addEventListener("touchstart", intent, { passive: true });
    return () => {
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(id);
      else clearTimeout(id);
      document.removeEventListener("pointerover", intent);
      document.removeEventListener("touchstart", intent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ------------------------------------------------------------------ editable texts, images and lists

const field =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-base text-neutral-900 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/30 dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition active:scale-95 disabled:opacity-60";
const primary = btn + " bg-[var(--brand,#111)] text-white";
const ghost = btn + " text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10";
const outline = "outline-dashed outline-2 outline-offset-4 outline-[var(--brand)]/60 hover:outline-[var(--brand)]";

/** Paragraphs separated by a blank line. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={"space-y-4 " + (className ?? "")}>
      {String(text || "")
        .split(/\n\s*\n/)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

/**
 * A text of the site, in the visitor's language, editable in place by an admin in edit mode:
 * <Editable k="home.hero.title" as="h1" className="…" />. multiline: paragraphs.
 */
export function Editable({ k, as = "span", className, multiline }: { k: string; as?: any; className?: string; multiline?: boolean }) {
  const { text, save, editMode, lang } = useContent();
  const value = text(k);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Tag = as;
  const content = multiline ? <Paragraphs text={value} /> : value;
  if (!editMode) return <Tag className={className}>{content}</Tag>;
  if (editing)
    return (
      <div className="space-y-2 rounded-2xl border-2 border-dashed border-[var(--brand)] bg-white p-2 text-left text-base font-normal tracking-normal text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        {multiline ? (
          <textarea className={field + " min-h-32"} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
        ) : (
          <input className={field} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await save(k, draft.trim());
                setEditing(false);
              } catch (e) {
                setError((e as Error).message);
              }
              setBusy(false);
            }}
          >
            {ui(lang, "save")}
          </button>
          <button type="button" className={ghost} onClick={() => setEditing(false)}>
            {ui(lang, "cancel")}
          </button>
        </div>
      </div>
    );
  return (
    <Tag
      className={(className ?? "") + " cursor-text rounded " + outline}
      onClick={(e: { preventDefault: () => void }) => {
        e.preventDefault();
        setDraft(value);
        setEditing(true);
      }}
    >
      {content || ui(lang, "empty")}
    </Tag>
  );
}

/** Unsplash photo in a modern format with the right width for each screen. */
export function imgProps(src: string, sizes = "(min-width: 1024px) 40vw, 90vw"): { src: string; srcSet?: string; sizes?: string } {
  if (!src || !/images\.unsplash\.com/.test(src)) return { src };
  const at = (w: number) => {
    try {
      const u = new URL(src);
      u.searchParams.set("w", String(w));
      u.searchParams.set("q", "70");
      u.searchParams.set("auto", "format");
      return u.toString();
    } catch {
      return src;
    }
  };
  return { src: at(1200), srcSet: [480, 800, 1200, 1600].map((w) => `${at(w)} ${w}w`).join(", "), sizes };
}

/**
 * An image of the site, changed in one tap by an admin in edit mode (import, crop, size):
 * <EditableImage k="home.hero.image" alt="…" aspect={4 / 3} priority /> (priority: the first image of the page).
 */
export function EditableImage({ k, alt, aspect = 4 / 3, className, priority, sizes }: { k: string; alt: string; aspect?: number; className?: string; priority?: boolean; sizes?: string }) {
  const { text, save, editMode, supabase, lang } = useContent();
  const [open, setOpen] = useState(false);
  const src = text(k);
  const size = text(k + ".size") || undefined;
  // Frame chosen by the admin (cercle, arrondi, droit, organique): wins over the design's own corners.
  const frame = text(k + ".frame") || undefined;
  const radius = imageFrameRadius(frame);
  const ip = imgProps(src, sizes ?? (priority ? "(min-width: 1024px) 50vw, 100vw" : undefined));
  return (
    <div className={"relative " + (editMode ? "cursor-pointer rounded-[1.5rem] " + outline : "")} onClick={() => editMode && setOpen(true)}>
      {src && (
        <img
          {...ip}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "auto" : "async"}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          width={1200}
          height={Math.round(1200 / aspect)}
          className={"h-auto max-w-full " + imageSizeClass(size) + " " + (className ?? "")}
          style={radius ? { borderRadius: radius } : undefined}
        />
      )}
      {editMode && (
        <span className="absolute left-3 top-3 rounded-full bg-[var(--brand,#111)] px-3 py-1.5 text-xs font-medium text-white">✎ {ui(lang, "image")}</span>
      )}
      {editMode && supabase && (
        <ImageEditor
          open={open}
          onClose={() => setOpen(false)}
          aspect={aspect}
          size={size as never}
          frame={frame as never}
          src={src || undefined}
          onSave={async ({ blob, size: chosen, frame: shape }) => {
            const url = await uploadImage(supabase, blob);
            await save(k, url, { translated: false });
            await save(k + ".size", chosen, { translated: false });
            await save(k + ".frame", shape, { translated: false });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Background image of a section, chosen by an admin with the pencil (image + intensity, pale by default so the text
 * stays readable). Nothing is shown until an image is chosen: the design never changes on its own.
 * First child of the section: <section className="relative overflow-hidden"><SectionBackground k="home.hero.bg" />…</section>
 */
export function SectionBackground({ k }: { k: string }) {
  const { text, save, remove, editMode, supabase, lang } = useContent();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const src = text(k);
  const strength = Math.min(100, Math.max(5, Number(text(k + ".strength")) || 25));
  const [draft, setDraft] = useState(strength);
  useEffect(() => setDraft(strength), [strength]);
  // The image stays under the content of the section, whatever its layout.
  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (parent && (src || editMode)) {
      parent.style.isolation = "isolate";
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    }
  }, [src, editMode]);
  if (!src && !editMode) return null;
  const ip = src ? imgProps(src, "100vw") : null;
  return (
    <>
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {ip && <img {...ip} alt="" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = "none")} className="h-full w-full object-cover" style={{ opacity: draft / 100 }} />}
      </div>
      {editMode && (
        <button type="button" className="absolute bottom-3 right-3 z-20 rounded-full bg-[var(--brand,#111)] px-3 py-1.5 text-xs font-medium text-white shadow" onClick={() => setOpen(true)}>
          ✎ {ui(lang, "bg")}
        </button>
      )}
      {editMode && (
        <Sheet open={open} onClose={() => setOpen(false)} title={ui(lang, "bg")}>
          <div className="space-y-4 pb-2">
            <button type="button" className="w-full rounded-xl bg-[var(--brand,#111)] px-4 py-3 text-sm font-medium text-white" onClick={() => setPicking(true)}>
              {ui(lang, "bgPick")}
            </button>
            {src && (
              <>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">
                    {ui(lang, "bgStrength")} : {draft} %
                  </span>
                  <input type="range" min={5} max={100} step={5} value={draft} onChange={(e) => setDraft(Number(e.target.value))} className="w-full" />
                </label>
                <p className="text-xs opacity-70">{ui(lang, "bgHint")}</p>
                <div className="flex flex-wrap justify-between gap-2">
                  <button type="button" className="rounded-xl border px-4 py-2 text-sm text-red-600" onClick={async () => { await remove(k); await remove(k + ".strength"); setOpen(false); }}>
                    {ui(lang, "bgNone")}
                  </button>
                  <button type="button" className="rounded-xl bg-[var(--brand,#111)] px-4 py-2 text-sm font-medium text-white" onClick={async () => { await save(k + ".strength", String(draft), { translated: false }); setOpen(false); }}>
                    {ui(lang, "save")}
                  </button>
                </div>
              </>
            )}
          </div>
        </Sheet>
      )}
      {editMode && supabase && createPortal(
        <ImageEditor
          open={picking}
          onClose={() => setPicking(false)}
          aspect={16 / 9}
          title={ui(lang, "bg")}
          onSave={async ({ blob }) => {
            const url = await uploadImage(supabase, blob);
            await save(k, url, { translated: false });
            if (!text(k + ".strength")) await save(k + ".strength", "25", { translated: false });
            setPicking(false);
          }}
        />,
        document.body,
      )}
    </>
  );
}

/** A list of short texts (bullet points, tags…), edited in a sheet by an admin: <EditableList k="home.benefits" render={(items) => …} />. */
export function EditableList({ k, render }: { k: string; render: (items: string[]) => ReactNode }) {
  const { get, save, editMode, lang } = useContent();
  const raw = get(k);
  const items: string[] = Array.isArray(raw) ? (raw as string[]) : [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [busy, setBusy] = useState(false);
  if (!editMode) return <>{render(items)}</>;
  const move = (i: number, d: number) => {
    const next = [...draft];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };
  return (
    <div className={"rounded-2xl " + outline}>
      <button
        type="button"
        className={ghost + " mb-2"}
        onClick={() => {
          setDraft(items);
          setOpen(true);
        }}
      >
        ✎ {ui(lang, "list")}
      </button>
      {render(items)}
      <Sheet open={open} onClose={() => setOpen(false)} title={ui(lang, "list")}>
        <div className="space-y-2 pb-2">
          {draft.map((it, i) => (
            <div key={i} className="flex items-center gap-1">
              <input className={field + " min-w-0"} value={it} onChange={(e) => setDraft(draft.map((v, j) => (j === i ? e.target.value : v)))} />
              <button type="button" className={ghost + " px-2"} aria-label={ui(lang, "up")} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" className={ghost + " px-2"} aria-label={ui(lang, "down")} onClick={() => move(i, 1)}>
                ↓
              </button>
              <button type="button" className={ghost + " px-2 text-red-600"} aria-label={ui(lang, "remove")} onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={ghost} onClick={() => setDraft([...draft, ""])}>
            + {ui(lang, "add")}
          </button>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghost} onClick={() => setOpen(false)}>
              {ui(lang, "cancel")}
            </button>
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await save(
                    k,
                    draft.map((s) => s.trim()).filter(Boolean),
                    { translated: false },
                  );
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {ui(lang, "save")}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// ------------------------------------------------------------------ appearing sections (never hidden content)

/**
 * Soft appearance of a section when it scrolls into view (≤ 250 ms). A section already on screen at load is shown at
 * once, without animation: content is never hidden while the visitor waits.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"shown" | "hidden" | "in">("shown");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("hidden");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={state === "shown" ? undefined : { opacity: state === "in" ? 1 : 0, transform: state === "in" ? "none" : "translateY(8px)", transition: "opacity .25s ease-out, transform .25s ease-out" }}
    >
      {children}
    </div>
  );
}

/** Contact details of the business (Marque → Informations légales): one source for the whole site. */
export function useContact() {
  const legal = ((brand as unknown as { legal?: Record<string, string> }).legal ?? {}) as Record<string, string>;
  return {
    name: legal.company || brand.name,
    address: legal.address || "",
    email: legal.email || "",
    phone: legal.phone || "",
    phoneHref: legal.phone ? "tel:" + legal.phone.replace(/[^+\d]/g, "") : "",
    emailHref: legal.email ? "mailto:" + legal.email : "",
  };
}

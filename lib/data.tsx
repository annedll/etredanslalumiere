import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase, isConfigured } from "./supabase";
import { brand } from "./brand";
import { DEFAULT_SETTINGS, DEFAULT_OFFERINGS, DEFAULT_SESSIONS, type Offering } from "./defaults";
import { ImageEditor, uploadImage, imageSizeClass } from "./image-editor";
import { useI18n } from "./i18n";
import { Button, Input, Textarea, Dialog, cn } from "../components/ui";

const HEX = /^#[0-9a-fA-F]{6}$/;
export function applyBrandColor(c?: any) {
  const r = document.documentElement;
  if (typeof c === "string" && HEX.test(c)) r.style.setProperty("--brand", c);
  else r.style.removeProperty("--brand");
}

/** Images rapides : pour une photo Unsplash, renvoie src + srcSet (480/800/1200/1600) et sizes. */
export function imgProps(src: string, sizes = "(min-width: 1024px) 40vw, 90vw"): { src: string; srcSet?: string; sizes?: string } {
  if (!src || !/images\.unsplash\.com/.test(src)) return { src };
  const at = (w: number) => {
    try {
      const u = new URL(src);
      u.searchParams.set("w", String(w)); u.searchParams.set("q", "70"); u.searchParams.set("auto", "format");
      return u.toString();
    } catch { return src; }
  };
  return { src: at(1200), srcSet: [480, 800, 1200, 1600].map((w) => `${at(w)} ${w}w`).join(", "), sizes };
}

/** Délai maximal des requêtes de démarrage : au-delà, on garde les valeurs par défaut. */
export function withTimeout<T>(p: PromiseLike<T>, ms = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

/** Coordonnées issues du kit de marque (informations légales) : elles priment toujours. */
const LEGAL: any = (brand as any).legal || {};
const LEGAL_KEYS: Record<string, string> = { "biz.name": LEGAL.company || "", "biz.email": LEGAL.email || "", "biz.phone": LEGAL.phone || "" };

/** Adresse complète : kit de marque > réglage admin > valeur de secours. */
export function addressLine(settings: Record<string, any>, get: (k: string) => any) {
  if (LEGAL.address) return String(LEGAL.address);
  if (settings["biz.address"]) return `${get("biz.address")}, ${get("biz.postal")} ${get("biz.city")}, ${get("biz.country")}`;
  return `${DEFAULT_SETTINGS["biz.address"]}, ${DEFAULT_SETTINGS["biz.postal"]} ${DEFAULT_SETTINGS["biz.city"]}, ${DEFAULT_SETTINGS["biz.country"]}`;
}

const NO_TRACK = "usin:no-track";
const SETTINGS_CACHE = "usin:settings";

/** Réglages initiaux : publication > copie locale > (défauts via get). */
function initialSettings(): Record<string, any> {
  try {
    const w: any = typeof window !== "undefined" ? (window as any).__USIN_SETTINGS__ : null;
    if (w && typeof w === "object" && Object.keys(w).length) return { ...w };
  } catch {}
  try {
    const c = JSON.parse(localStorage.getItem(SETTINGS_CACHE) || "null");
    if (c && typeof c === "object") return c;
  } catch {}
  return {};
}
const persistSettings = (s: Record<string, any>) => { try { localStorage.setItem(SETTINGS_CACHE, JSON.stringify(s)); } catch {} };

type ViewAs = "admin" | "client" | "visitor";
type AppCtx = {
  settings: Record<string, any>; get: (k: string) => any; flag: (k: string) => boolean; save: (k: string, v: any) => Promise<void>; remove: (k: string) => Promise<void>;
  demo: boolean; setDemo: (b: boolean) => void; session: any; user: any; realAdmin: boolean; isAdmin: boolean; viewAs: ViewAs; setViewAs: (v: ViewAs) => void;
  editMode: boolean; setEditMode: (b: boolean) => void; ready: boolean;
};
const Ctx = createContext<AppCtx>(null as any);
export const useApp = () => useContext(Ctx);

const DEMO = !isConfigured;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [session, setSession] = useState<any>(null);
  const [realAdmin, setRealAdmin] = useState(false);
  const [viewAs, setViewAsS] = useState<ViewAs>(() => { try { return (localStorage.getItem("view-as") as ViewAs) || "admin"; } catch { return "admin"; } });
  const [editMode, setEditMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    let sub: any = null;
    try {
      withTimeout(supabase.from("app_settings").select("key,value")).then(({ data, error }: any) => {
        if (!error && Array.isArray(data)) { const m: any = {}; data.forEach((r: any) => (m[r.key] = r.value)); setSettings(m); persistSettings(m); }
        setReady(true);
      }).catch(() => setReady(true));
      withTimeout(supabase.auth.getSession()).then(({ data }: any) => setSession(data?.session ?? null)).catch(() => {});
      const r = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      sub = r?.data?.subscription;
    } catch { setReady(true); }
    return () => { try { sub?.unsubscribe(); } catch {} };
  }, []);
  useEffect(() => {
    if (!session) { setRealAdmin(false); return; }
    withTimeout(supabase.rpc("is_admin")).then(({ data }: any) => setRealAdmin(!!data)).catch(() => setRealAdmin(false));
  }, [session?.user?.id]);
  useEffect(() => { if (realAdmin) { try { localStorage.setItem(NO_TRACK, "1"); } catch {} } }, [realAdmin]);
  useEffect(() => applyBrandColor(settings.brand_color), [settings.brand_color]);

  const get = (k: string) => {
    if (k === "biz.email" || k === "biz.phone") return LEGAL_KEYS[k] || "";
    const v = settings[k];
    if (v === undefined || v === null || v === "") return LEGAL_KEYS[k] || DEFAULT_SETTINGS[k] || "";
    return v;
  };
  const flag = (k: string) => String(get(k)) === "true";
  const save = async (k: string, v: any) => {
    setSettings((s) => { const n = { ...s, [k]: v }; persistSettings(n); return n; });
    if (!isConfigured) return;
    const { error } = await supabase.from("app_settings").upsert({ key: k, value: v });
    if (error) throw error;
  };
  const remove = async (k: string) => {
    setSettings((s) => { const n = { ...s }; delete n[k]; persistSettings(n); return n; });
    if (!isConfigured) return;
    const { error } = await supabase.from("app_settings").delete().eq("key", k);
    if (error) throw error;
  };
  const isAdmin = realAdmin && viewAs === "admin";
  const user = realAdmin && viewAs === "visitor" ? null : session?.user ?? null;
  const setViewAs = (v: ViewAs) => { try { localStorage.setItem("view-as", v); } catch {} setViewAsS(v); if (v !== "admin") setEditMode(false); };
  const setDemo = (_b: boolean) => {};
  return <Ctx.Provider value={{ settings, get, flag, save, remove, demo: DEMO, setDemo, session, user, realAdmin, isAdmin, viewAs, setViewAs, editMode, setEditMode, ready }}>{children}</Ctx.Provider>;
}

export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return <div className={cn("space-y-4", className)}>{String(text || "").split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>;
}

export function Editable({ settingKey, as = "span", className, multiline }: { settingKey: string; as?: any; className?: string; multiline?: boolean }) {
  const { get, save, isAdmin, editMode } = useApp();
  const { t } = useI18n();
  const val = String(get(settingKey) ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(val);
  const [busy, setBusy] = useState(false);
  const Tag: any = as;
  const content = multiline ? <Paragraphs text={val} /> : val;
  if (!(isAdmin && editMode)) return <Tag className={className}>{content}</Tag>;
  if (editing)
    return (
      <div className="space-y-2 rounded-xl border-2 border-dashed border-[var(--brand)] bg-white dark:bg-neutral-900 p-2 text-left">
        {multiline ? <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus /> : <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={busy} onClick={async () => { setBusy(true); try { await save(settingKey, draft.trim()); setEditing(false); } catch (e: any) { alert(e.message); } setBusy(false); }}>{t("edit.save")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("edit.cancel")}</Button>
        </div>
      </div>
    );
  return (
    <Tag className={cn(className, "outline-dashed outline-2 outline-offset-4 outline-[var(--brand)]/60 rounded cursor-text hover:outline-[var(--brand)]")} onClick={(e: any) => { e.preventDefault(); setDraft(val); setEditing(true); }}>
      {content || "…"}
    </Tag>
  );
}

export function EditableImage({ settingKey, alt, aspect = 4 / 3, className, eager }: { settingKey: string; alt: string; aspect?: number; className?: string; eager?: boolean }) {
  const { get, save, isAdmin, editMode } = useApp();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const src = get(settingKey);
  const size = get(settingKey + ".size") || undefined;
  const editable = isAdmin && editMode;
  const ip = imgProps(src, eager ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 40vw, 90vw");
  return (
    <div className={cn("relative", editable && "outline-dashed outline-2 outline-offset-4 outline-[var(--brand)]/60 rounded-[2rem] cursor-pointer")} onClick={() => editable && setOpen(true)}>
      {src && <img {...ip} alt={alt} loading={eager ? "eager" : "lazy"} {...(eager ? { fetchPriority: "high" } : { decoding: "async" })} width={1200} height={Math.round(1200 / aspect)} className={cn("max-w-full h-auto", imageSizeClass(size), className)} />}
      {editable && <span className="absolute top-3 left-3 rounded-full bg-[var(--brand)] text-white text-xs px-3 py-1.5 flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />{t("edit.image")}</span>}
      {editable && (
        <ImageEditor open={open} onClose={() => setOpen(false)} aspect={aspect} size={size}
          onSave={async ({ blob, size }: any) => { const url = await uploadImage(supabase, blob); await save(settingKey, url); await save(settingKey + ".size", size); setOpen(false); }} />
      )}
    </div>
  );
}

export function ListEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  const move = (i: number, d: number) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input value={it} onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n); }} className="min-w-0" />
          <Button size="sm" variant="ghost" aria-label="↑" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label="↓" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label={t("common.delete")} onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, ""])}><Plus className="h-4 w-4" />{t("edit.add")}</Button>
    </div>
  );
}

export function EditableList({ settingKey, render }: { settingKey: string; render: (items: string[]) => React.ReactNode }) {
  const { get, save, isAdmin, editMode } = useApp();
  const { t } = useI18n();
  const raw = get(settingKey);
  const items: string[] = Array.isArray(raw) ? raw : [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [busy, setBusy] = useState(false);
  if (!(isAdmin && editMode)) return <>{render(items)}</>;
  return (
    <div className="outline-dashed outline-2 outline-offset-4 outline-[var(--brand)]/60 rounded-2xl">
      <div className="mb-3"><Button size="sm" variant="secondary" onClick={() => { setDraft(items); setOpen(true); }}><Pencil className="h-4 w-4" />{t("edit.editList")}</Button></div>
      {render(items)}
      <Dialog open={open} onClose={() => setOpen(false)} title={t("edit.editList")} footer={<>
        <Button variant="ghost" onClick={() => setOpen(false)}>{t("edit.cancel")}</Button>
        <Button loading={busy} onClick={async () => { setBusy(true); try { await save(settingKey, draft.map((s) => s.trim()).filter(Boolean)); setOpen(false); } catch (e: any) { alert(e.message); } setBusy(false); }}>{t("edit.save")}</Button>
      </>}>
        <ListEditor items={draft} onChange={setDraft} />
      </Dialog>
    </div>
  );
}

export function useQuery<T>(fn: () => PromiseLike<{ data: any; error: any }>, fallback: T, deps: any[] = []) {
  const [state, set] = useState<{ data: T; loading: boolean; demo: boolean }>({ data: fallback, loading: true, demo: DEMO });
  const [n, setN] = useState(0);
  useEffect(() => {
    let on = true;
    const fb = () => { if (on) set({ data: fallback, loading: false, demo: DEMO }); };
    if (!isConfigured) { fb(); return; }
    let req: PromiseLike<{ data: any; error: any }>;
    try { req = fn(); } catch { fb(); return; }
    withTimeout(req).then(({ data, error }) => {
      if (!on) return;
      if (error || data == null || (Array.isArray(data) && data.length === 0)) fb();
      else set({ data, loading: false, demo: false });
    }).catch(fb);
    return () => { on = false; };
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

const sortPrices = (o: any) => ({ ...o, prices: [...(o.prices || [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) });
export function useOfferings() {
  const q = useQuery<Offering[]>(() => supabase.from("offerings").select("*, prices:offering_prices(*)").eq("is_published", true).order("sort_order"), DEFAULT_OFFERINGS);
  return { ...q, data: q.data.map(sortPrices) as Offering[] };
}
export function useSessions() {
  return useQuery<any[]>(() => supabase.from("sessions").select("*, offering:offerings(id,title,slug,kind), price:offering_prices(id,label,amount_cents)").gte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at"), DEFAULT_SESSIONS);
}

export const KIND_BASE: Record<string, string> = { soin: "/soins", numerologie: "/soins", formation: "/formations", atelier: "/ateliers", meditation: "/ateliers" };
export const offerPath = (o: { kind: string; slug: string }) => `${KIND_BASE[o.kind] || "/soins"}/${o.slug}`;

export const money = (cents: number, lang = "fr") => new Intl.NumberFormat(lang || "fr", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
export const fmtDate = (iso: string, lang = "fr", opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) =>
  new Intl.DateTimeFormat(lang || "fr", opts).format(new Date(iso));

export type Consent = { measure: boolean } | null;
export const getConsent = (): Consent => { try { return JSON.parse(localStorage.getItem("cookie-consent") || "null"); } catch { return null; } };
export const setConsent = (c: Consent) => {
  try { if (c) localStorage.setItem("cookie-consent", JSON.stringify(c)); else localStorage.removeItem("cookie-consent"); } catch {}
  window.dispatchEvent(new Event("consent-change"));
};

/** Vrai si cette visite ne doit pas être comptée (aperçu, localhost, appareil d'admin). */
function isTestVisit() {
  try {
    if (window.self !== window.top) return true;
  } catch { return true; }
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local")) return true;
  try { if (localStorage.getItem(NO_TRACK)) return true; } catch {}
  return false;
}

export function usePageViews() {
  const loc = useLocation();
  const app = useContext(Ctx);
  const realAdmin = !!app?.realAdmin;
  useEffect(() => {
    if (!isConfigured || !getConsent()?.measure || realAdmin || isTestVisit()) return;
    const t = setTimeout(() => {
      if (isTestVisit()) return;
      try {
        Promise.resolve(supabase.from("page_views").insert({ path: loc.pathname.slice(0, 200), referrer: document.referrer ? document.referrer.slice(0, 300) : null })).catch(() => {});
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [loc.pathname, realAdmin]);
}

export const isDemoId = (id?: string) => !id || id.startsWith("d-");

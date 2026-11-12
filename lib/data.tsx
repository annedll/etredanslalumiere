import React from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { supabase, isConfigured } from "./supabase";
import { brand } from "./brand";
import { DEFAULT_SETTINGS, DEFAULT_OFFERINGS, DEFAULT_SESSIONS, type Offering } from "./defaults";
import { useI18n } from "./i18n";
import { useContent, useData, Paragraphs, Editable as CEditable, EditableImage as CEditableImage, EditableList as CEditableList } from "./content";
import { Button, Input } from "../components/ui";

const HEX = /^#[0-9a-fA-F]{6}$/;
export function applyBrandColor(c?: any) {
  const r = document.documentElement;
  if (typeof c === "string" && HEX.test(c)) r.style.setProperty("--brand", c);
  else r.style.removeProperty("--brand");
}

export { imgProps, withTimeout, getConsent, setConsent, type Consent } from "./content";

/** Coordonnées issues du kit de marque (informations légales) : elles priment toujours. */
const LEGAL: any = (brand as any).legal || {};
const LEGAL_KEYS: Record<string, string> = { "biz.name": LEGAL.company || "", "biz.email": LEGAL.email || "", "biz.phone": LEGAL.phone || "" };

/** Adresse complète : kit de marque > réglage admin > valeur de secours. */
export function addressLine(settings: Record<string, any>, get: (k: string) => any) {
  if (LEGAL.address) return String(LEGAL.address);
  if (settings["biz.address"]) return `${get("biz.address")}, ${get("biz.postal")} ${get("biz.city")}, ${get("biz.country")}`;
  return `${DEFAULT_SETTINGS["biz.address"]}, ${DEFAULT_SETTINGS["biz.postal"]} ${DEFAULT_SETTINGS["biz.city"]}, ${DEFAULT_SETTINGS["biz.country"]}`;
}

/**
 * Accès à l'app (réglages, session, rôle, mode édition) : fourni par le moteur de contenu d'Usin (./content), qui suit la
 * langue du visiteur et garde les données en mémoire. Les coordonnées viennent de Marque → Informations légales.
 */
export function useApp() {
  const c = useContent();
  const get = (k: string) => (k in LEGAL_KEYS && LEGAL_KEYS[k] ? LEGAL_KEYS[k] : c.get(k));
  return { ...c, settings: c.settings as Record<string, any>, get, flag: (k: string) => String(get(k)) === "true", demo: !c.supabase, setDemo: (_b: boolean) => {} };
}

export { Paragraphs };

/** Texte du site modifiable au crayon (moteur Usin). */
export function Editable({ settingKey, as, className, multiline }: { settingKey: string; as?: any; className?: string; multiline?: boolean }) {
  return <CEditable k={settingKey} as={as} className={className} multiline={multiline} />;
}

/** Image du site modifiable au crayon (moteur Usin). */
export function EditableImage({ settingKey, alt, aspect = 4 / 3, className, eager }: { settingKey: string; alt: string; aspect?: number; className?: string; eager?: boolean }) {
  return <CEditableImage k={settingKey} alt={alt} aspect={aspect} className={className} priority={eager} />;
}

/** Liste de textes modifiable au crayon (moteur Usin). */
export function EditableList({ settingKey, render }: { settingKey: string; render: (items: string[]) => React.ReactNode }) {
  return <CEditableList k={settingKey} render={render} />;
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


/**
 * Données lues dans la base et gardées en mémoire (une page déjà vue s'affiche aussitôt). Le repli ne sert que sans base ou
 * en cas d'erreur : une table vide reste vide.
 */
export function useQuery<T>(fn: () => PromiseLike<{ data: any; error: any }>, fallback: T, deps: any[] = []) {
  const key = "q:" + fn.toString() + JSON.stringify(deps);
  const q = useData<T>(key, fn, { fallback });
  const empty = (Array.isArray(fallback) ? [] : fallback) as T;
  return { data: (q.data ?? (q.loading ? empty : fallback)) as T, loading: q.loading, demo: !isConfigured, reload: q.reload };
}

const sortPrices = (o: any) => ({ ...o, prices: [...(o.prices || [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) });
export function useOfferings() {
  const q = useQuery<Offering[]>(() => supabase.from("offerings").select("*, prices:offering_prices(*)").eq("is_published", true).order("sort_order"), DEFAULT_OFFERINGS);
  return { ...q, data: q.data.map(sortPrices) as Offering[] };
}
export function useSessions() {
  return useQuery<any[]>(() => supabase.from("sessions").select("*, offering:offerings(id,title,slug,kind,deposit_cents,i18n), price:offering_prices(id,label,amount_cents,i18n)").gte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at"), DEFAULT_SESSIONS);
}

export const KIND_BASE: Record<string, string> = { soin: "/soins", numerologie: "/soins", formation: "/formations", atelier: "/ateliers", meditation: "/ateliers" };
export const offerPath = (o: { kind: string; slug: string }) => `${KIND_BASE[o.kind] || "/soins"}/${o.slug}`;

export const money = (cents: number, lang = "fr") => new Intl.NumberFormat(lang || "fr", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
export const fmtDate = (iso: string, lang = "fr", opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) =>
  new Intl.DateTimeFormat(lang || "fr", opts).format(new Date(iso));

export const isDemoId = (id?: string) => !id || id.startsWith("d-");

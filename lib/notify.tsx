// Injected by Usin (emails, in-app notifications and phone / computer push). Do not edit.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { Sheet } from "./mobile";
import { setBadge } from "./ui";
import { useI18n } from "./i18n";

// Visitor texts in the site's languages (the admin settings stay in the owner's language).
const W: Record<string, Record<string, string>> = {
  fr: { title: "Notifications", unread: "non lues", device: "Notifications sur cet appareil", none: "Aucune notification pour le moment.", install: "📲 Installez l'app sur votre écran d'accueil (Partager → Sur l'écran d'accueil) pour recevoir les notifications sur ce téléphone.", denied: "Les notifications sont bloquées pour cette app dans les réglages de votre appareil.", now: "à l'instant", min: "il y a {n} min", h: "il y a {n} h" },
  en: { title: "Notifications", unread: "unread", device: "Notifications on this device", none: "No notifications yet.", install: "📲 Add the app to your home screen (Share → Add to Home Screen) to get notifications on this phone.", denied: "Notifications are blocked for this app in your device settings.", now: "just now", min: "{n} min ago", h: "{n} h ago" },
  nl: { title: "Meldingen", unread: "ongelezen", device: "Meldingen op dit toestel", none: "Nog geen meldingen.", install: "📲 Zet de app op je beginscherm (Delen → Zet op beginscherm) om meldingen op deze telefoon te krijgen.", denied: "Meldingen zijn geblokkeerd voor deze app in de instellingen van je toestel.", now: "zojuist", min: "{n} min geleden", h: "{n} u geleden" },
};
function useW() {
  const { lang } = useI18n();
  return (k: string, n?: number) => ((W[lang] ?? W.en)[k] ?? W.fr[k] ?? k).replace("{n}", String(n ?? ""));
}

export type NotifyEvent = "contact.new" | "booking.new" | "booking.cancelled" | "order.new" | "signup.new" | "message.new";
export type NotifyData = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  service?: string;
  /** ISO date of the appointment / order. */
  date?: string;
  /** Ready-made date label, e.g. "mardi 14 novembre à 10 h". */
  when?: string;
  amount?: string;
  description?: string;
  /** Your own id of the booking / order (cancels its reminder when the booking is cancelled). */
  reference?: string;
  /** Page of the app opened from the notification, e.g. "/reservations". */
  url?: string;
  /** Marketplace: the professional concerned (their user id). */
  sellerUserId?: string;
  /** Messaging: the user the message is for. */
  recipientUserId?: string;
};

export const BASE = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/app-notify/") : "";

export async function token(supabase?: SupabaseClient | null) {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message ?? "Erreur " + res.status);
  return data as T;
}

let ready: Promise<unknown> | null = null;
/** Creates the notification tables of the app once (called automatically). */
export function notifyReady() {
  if (!BASE) return Promise.resolve();
  ready ??= post("/ensure", {}).catch(() => undefined);
  return ready;
}

/**
 * Tells the right people (by email, in the app and on their phone / computer), following the settings of the admin.
 * Never throws: a notification must never block the action (booking saved, message sent…).
 * Payments are notified automatically by the platform: do not call notify for them.
 */
export async function notify(event: NotifyEvent, data: NotifyData = {}, supabase?: SupabaseClient | null): Promise<boolean> {
  if (!BASE) return false;
  try {
    await post("/send", { event, data, accessToken: await token(supabase) });
    return true;
  } catch {
    return false;
  }
}

/** Reminder sent the day before an appointment (at = start of the appointment). */
export async function scheduleReminder(startsAt: Date | string, data: NotifyData, supabase?: SupabaseClient | null): Promise<boolean> {
  if (!BASE) return false;
  const start = new Date(startsAt);
  const at = new Date(Math.max(start.getTime() - 24 * 3600_000, Date.now() + 60_000));
  if (start.getTime() - Date.now() < 3 * 3600_000) return false;
  try {
    await post("/schedule", { event: "booking.reminder", at: at.toISOString(), data, accessToken: await token(supabase) });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ push (phone / computer)

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const installed = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export type PushState = "unsupported" | "install-first" | "denied" | "off" | "on";

export async function pushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return isIos() && !installed() ? "install-first" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

function keyBytes(base64: string) {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** Asks permission and links this device to the signed-in user. */
export async function enablePush(supabase: SupabaseClient): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "install-first" || state === "denied") return state;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "off";
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await (await fetch(BASE + "/push-key")).json();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await notifyReady();
  await supabase.from("usin_push_subscriptions").upsert({ endpoint: json.endpoint, user_id: data.user.id, p256dh: json.keys.p256dh, auth: json.keys.auth });
  return "on";
}

export async function disablePush(supabase: SupabaseClient): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("usin_push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return pushState();
}

function PushToggle({ supabase }: { supabase: SupabaseClient }) {
  const w = useW();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void pushState().then(setState);
  }, []);
  if (!state || state === "unsupported") return null;
  if (state === "install-first")
    return <p className="rounded-xl bg-black/5 p-3 text-sm dark:bg-white/10">{w("install")}</p>;
  if (state === "denied") return <p className="rounded-xl bg-black/5 p-3 text-sm dark:bg-white/10">{w("denied")}</p>;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          setState(state === "on" ? await disablePush(supabase) : await enablePush(supabase));
        } finally {
          setBusy(false);
        }
      }}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-black/5 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98] dark:bg-white/10"
    >
      <span>🔔 {w("device")}</span>
      <span className={"relative h-6 w-11 shrink-0 rounded-full transition " + (state === "on" ? "bg-[var(--brand,#111)]" : "bg-black/20 dark:bg-white/20")}>
        <span className={"absolute top-0.5 size-5 rounded-full bg-white shadow transition-all " + (state === "on" ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

// ------------------------------------------------------------------ in-app notifications

type Item = { id: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string };

function ago(iso: string, w: (k: string, n?: number) => string = (k, n) => W.fr[k].replace("{n}", String(n ?? ""))) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return w("now");
  if (s < 3600) return w("min", Math.floor(s / 60));
  if (s < 86400) return w("h", Math.floor(s / 3600));
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * This device's push subscription is written again for the signed-in user at each visit: the browser can keep a
 * subscription that the app no longer knows (account recreated, data cleaned), and then nothing would arrive.
 */
const synced = new Set<string>();
async function syncPush(supabase: SupabaseClient, userId: string) {
  if (synced.has(userId) || !("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return;
  synced.add(userId);
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await notifyReady();
    await supabase.from("usin_push_subscriptions").upsert({ endpoint: json.endpoint, user_id: userId, p256dh: json.keys.p256dh, auth: json.keys.auth });
  } catch {
    synced.delete(userId);
  }
}

/** The signed-in user's notifications, refreshed regularly and when the app comes back to the foreground. */
export function useNotifications(supabase: SupabaseClient) {
  const [items, setItems] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
    if (!data.user) return setItems([]);
    await notifyReady();
    void syncPush(supabase, data.user.id);
    const res = await supabase.from("usin_notifications").select("id, title, body, url, read_at, created_at").order("created_at", { ascending: false }).limit(30);
    if (!res.error) setItems((res.data ?? []) as Item[]);
  }, [supabase]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 45_000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    const { data } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      data.subscription.unsubscribe();
    };
  }, [load, supabase]);
  const markAllRead = async () => {
    const unread = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!unread.length) return;
    setItems((list) => list.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    await supabase.from("usin_notifications").update({ read_at: new Date().toISOString() }).in("id", unread);
    // Seen here = the same notifications disappear from this device's notification center.
    navigator.serviceWorker?.ready
      .then((reg) => reg.getNotifications())
      .then((shown) => shown.forEach((n) => unread.includes(n.tag) && n.close()))
      .catch(() => undefined);
  };
  const unread = items.filter((i) => !i.read_at).length;
  useEffect(() => setBadge("notifications", unread), [unread]);
  return { items, unread, markAllRead, reload: load, signedIn: Boolean(userId) };
}

/** Bell for the header (signed-in users): unread count, list in a sheet, device notifications switch. */
export function NotificationBell({ supabase, className = "" }: { supabase: SupabaseClient; className?: string }) {
  const w = useW();
  const { items, unread, markAllRead, signedIn } = useNotifications(supabase);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!signedIn) return null;
  return (
    <>
      <button
        type="button"
        aria-label={unread ? `${w("title")} (${unread} ${w("unread")})` : w("title")}
        onClick={() => setOpen(true)}
        className={"relative grid size-11 place-items-center rounded-full transition hover:bg-black/5 active:scale-95 dark:hover:bg-white/10 " + className}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold leading-5 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          void markAllRead();
        }}
        title={w("title")}
      >
        <div className="space-y-3 pb-2">
          <PushToggle supabase={supabase} />
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm opacity-60">{w("none")}</p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void markAllRead();
                      if (n.url) navigate(n.url);
                    }}
                    className="flex w-full gap-3 py-3 text-left transition active:scale-[0.99]"
                  >
                    <span className={"mt-1.5 size-2.5 shrink-0 rounded-full " + (n.read_at ? "bg-transparent" : "bg-[var(--brand,#111)]")} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{n.title}</span>
                      {n.body && <span className="line-clamp-2 block text-sm opacity-70">{n.body}</span>}
                      <span className="mt-0.5 block text-xs opacity-50">{ago(n.created_at, w)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  );
}

// ------------------------------------------------------------------ admin settings

type Channel = "email" | "inapp" | "push";
type Settings = Record<string, Record<Channel, boolean>>;
type SettingsPayload = {
  available: boolean;
  events: { id: string; label: string; hint: string }[];
  channels: { id: Channel; label: string }[];
  settings: Settings;
  invoice?: { enabled: boolean; vatRate: number };
  /** Minutes the team's email waits to be seen in the app or on the phone (0 = right away). */
  emailDelay?: number;
  /** « Me prévenir des nouveaux emails » is on in the mailbox: the team's alerts no longer go by email. */
  mailWatch?: boolean;
  log: { event: string; channel: string; recipient: string; status: string; at: string }[];
};

/** Admin section « Notifications »: which notifications are sent, on which channel, a test, and the latest sends. */
export function NotificationSettings({ supabase }: { supabase: SupabaseClient }) {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await post<SettingsPayload>("/settings/get", { accessToken: await token(supabase) }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [supabase]);
  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(event: string, channel: Channel) {
    if (!data) return;
    const settings = { ...data.settings, [event]: { ...data.settings[event], [channel]: !data.settings[event][channel] } };
    setData({ ...data, settings });
    try {
      await post("/settings/set", { accessToken: await token(supabase), settings });
    } catch (e) {
      setError((e as Error).message);
      void load();
    }
  }

  if (error) return <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600">{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-black/5 dark:bg-white/10" />;
  if (!data.available) return <p className="rounded-xl bg-black/5 p-4 text-sm dark:bg-white/10">Les notifications seront disponibles dès que la base de données de l'app sera créée.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm opacity-70">Choisissez ce qui est envoyé, et comment : par email, dans l'app, ou directement sur le téléphone ou l'ordinateur.</p>
      </div>
      <PushToggle supabase={supabase} />
      {data.mailWatch && (
        <div className="rounded-2xl border border-[var(--brand,#111)]/25 bg-[var(--brand,#111)]/5 p-4 text-sm">
          <p className="font-medium">Vos alertes ne vous arrivent plus par email</p>
          <p className="mt-1 opacity-75">
            L'option « Me prévenir des nouveaux emails » est activée dans la Boîte mail : vous êtes prévenu dans l'appli et sur votre téléphone. Ci-dessous, « Email » ne concerne plus que les emails envoyés à vos clients (confirmations, rappels…). Pour recevoir à nouveau vos alertes par email, coupez l'option dans les réglages de la Boîte mail.
          </p>
        </div>
      )}
      <ul className="space-y-3">
        {data.events.map((e) => (
          <li key={e.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <p className="font-medium">{e.label}</p>
            <p className="text-sm opacity-60">{e.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.channels.map((c) => {
                const on = data.settings[e.id]?.[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => void toggle(e.id, c.id)}
                    className={
                      "min-h-11 rounded-full border px-4 text-sm font-medium transition active:scale-95 " +
                      (on ? "border-transparent bg-[var(--brand,#111)] text-white" : "border-black/15 opacity-70 dark:border-white/20")
                    }
                  >
                    {on ? "✓ " : ""}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      {!data.mailWatch && (
      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-medium">Éviter les emails en double</p>
        <p className="mt-1 text-sm opacity-70">Vos emails d'alerte attendent quelques minutes : si vous avez déjà vu la notification dans l'appli ou sur votre téléphone, l'email n'est pas envoyé.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 2, 5, 10].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={(data.emailDelay ?? 5) === m}
              onClick={async () => {
                setData({ ...data, emailDelay: m });
                await post("/settings/set", { accessToken: await token(supabase), emailDelay: m }).catch((e: Error) => setError(e.message));
              }}
              className={"min-h-11 rounded-full border px-4 text-sm font-medium transition active:scale-95 " + ((data.emailDelay ?? 5) === m ? "border-transparent bg-[var(--brand,#111)] text-white" : "border-black/15 opacity-70 dark:border-white/20")}
            >
              {m === 0 ? "Toujours tout de suite" : `Attendre ${m} min`}
            </button>
          ))}
        </div>
      </div>
      )}
      {data.invoice && (
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="font-medium">Factures PDF</p>
          <p className="text-sm opacity-60">Jointe automatiquement à la confirmation de chaque paiement, au nom de votre entreprise (informations légales de la marque), numérotée.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={data.invoice.enabled}
              onClick={async () => {
                const invoice = { ...data.invoice!, enabled: !data.invoice!.enabled };
                setData({ ...data, invoice });
                await post("/settings/set", { accessToken: await token(supabase), invoice }).catch((e: Error) => setError(e.message));
              }}
              className={"min-h-11 rounded-full border px-4 text-sm font-medium transition active:scale-95 " + (data.invoice.enabled ? "border-transparent bg-[var(--brand,#111)] text-white" : "border-black/15 opacity-70 dark:border-white/20")}
            >
              {data.invoice.enabled ? "✓ Activées" : "Désactivées"}
            </button>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              TVA
              <select
                value={data.invoice.vatRate}
                onChange={async (e) => {
                  const invoice = { ...data.invoice!, vatRate: Number(e.target.value) };
                  setData({ ...data, invoice });
                  await post("/settings/set", { accessToken: await token(supabase), invoice }).catch((err: Error) => setError(err.message));
                }}
                className="min-h-11 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20"
              >
                {[0, 5.5, 6, 10, 12, 20, 21].map((v) => (
                  <option key={v} value={v}>
                    {v === 0 ? "Sans TVA (franchise)" : `${String(v).replace(".", ",")} %`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={testing === "…"}
        onClick={async () => {
          setTesting("…");
          try {
            await post("/test", { accessToken: await token(supabase) });
            setTesting("Test envoyé : regardez vos emails, la cloche et votre téléphone.");
            void load();
          } catch (e) {
            setTesting((e as Error).message);
          }
        }}
        className="min-h-11 w-full rounded-full bg-[var(--brand,#111)] px-5 font-semibold text-white transition active:scale-95 sm:w-auto"
      >
        M'envoyer un test
      </button>
      {testing && testing !== "…" && <p className="text-sm opacity-70">{testing}</p>}
      {data.log.length > 0 && (
        <details className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <summary className="cursor-pointer font-medium">Derniers envois</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {data.log.map((l, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-3 opacity-80">
                <span className="min-w-0 break-words">
                  {data.events.find((e) => e.id === l.event)?.label ?? l.event} · {data.channels.find((c) => c.id === l.channel)?.label ?? l.channel} · {l.recipient}
                </span>
                <span className="opacity-60">
                  {l.status} · {ago(l.at)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

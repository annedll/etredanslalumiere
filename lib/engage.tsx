// Injected by Usin (reviews, waiting list, newsletter, add to calendar). Do not edit.
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BASE, notifyReady, post, token, type NotifyData } from "./notify";
import { Sheet } from "./mobile";
import { Editable } from "./content";

const input =
  "min-h-11 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-base outline-none transition focus:border-[var(--brand,#111)] dark:border-white/20";
const primary = "min-h-11 rounded-full bg-[var(--brand,#111)] px-5 font-semibold text-white transition active:scale-95 disabled:opacity-60";

// ------------------------------------------------------------------ reviews

/** Asks the client for a review a few hours after the appointment (endsAt = end of the appointment). */
export async function scheduleReviewRequest(endsAt: Date | string, data: NotifyData, supabase?: SupabaseClient | null): Promise<boolean> {
  if (!BASE) return false;
  const at = new Date(Math.max(new Date(endsAt).getTime() + 3 * 3600_000, Date.now() + 60_000));
  try {
    await post("/schedule", { event: "review.request", at: at.toISOString(), data: { url: "/avis" + (data.reference ? "?ref=" + encodeURIComponent(data.reference) : ""), ...data }, accessToken: await token(supabase) });
    return true;
  } catch {
    return false;
  }
}

export type Review = { id: string; rating: number; comment: string | null; name: string | null; created_at: string };

/** Published reviews: list, average, count, and schema.org data for Google (jsonLd of useSeo). */
export function useReviews(supabase: SupabaseClient, limit = 50) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void notifyReady().then(async () => {
      const res = await supabase.from("usin_reviews").select("id, rating, comment, name, created_at").order("created_at", { ascending: false }).limit(limit);
      if (!res.error) setItems((res.data ?? []) as Review[]);
      setLoading(false);
    });
  }, [supabase, limit]);
  const count = items.length;
  const average = count ? Math.round((items.reduce((t, r) => t + r.rating, 0) / count) * 10) / 10 : 0;
  const jsonLd = (name: string) =>
    count
      ? {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name,
          aggregateRating: { "@type": "AggregateRating", ratingValue: average, reviewCount: count, bestRating: 5 },
          review: items.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.name || "Client" },
            ...(r.comment ? { reviewBody: r.comment } : {}),
            datePublished: r.created_at.slice(0, 10),
          })),
        }
      : null;
  return { items, average, count, loading, jsonLd };
}

export function Stars({ value, size = "size-5" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={size + (i <= Math.round(value) ? " fill-amber-400 text-amber-400" : " fill-black/10 text-black/10 dark:fill-white/15 dark:text-white/15")} aria-hidden="true">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

/** Customer reviews section: average, count and the latest reviews (cards). */
/** title: default text of the title, editable with the pencil (key reviews.title); "" = no title (the section has its own). */
export function Reviews({ supabase, title = "Ils nous font confiance", limit = 6 }: { supabase: SupabaseClient; title?: string; limit?: number }) {
  const { items, average, count, loading } = useReviews(supabase);
  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-black/5 dark:bg-white/10" />;
  if (!count) return null;
  return (
    <section className="space-y-6">
      <div className={"flex flex-wrap items-end gap-3 " + (title ? "justify-between" : "justify-end")}>
        {title && <Editable k="reviews.title" fallback={title} as="h2" className="text-2xl font-bold tracking-tight sm:text-3xl" />}
        <p className="flex items-center gap-2 text-sm">
          <Stars value={average} /> <span className="font-semibold">{String(average).replace(".", ",")}/5</span>
          <span className="opacity-60">· {count} avis</span>
        </p>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {items.slice(0, limit).map((r) => (
          <figure key={r.id} className="w-[85%] shrink-0 snap-start rounded-2xl border border-black/10 p-5 sm:w-auto dark:border-white/10">
            <Stars value={r.rating} size="size-4" />
            {r.comment && <blockquote className="mt-3 leading-relaxed">« {r.comment} »</blockquote>}
            <figcaption className="mt-3 text-sm opacity-60">
              {r.name || "Client"} · {new Date(r.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Review form (page /avis): stars, comment, first name. `reference` comes from the email link (?ref=…). */
export function ReviewForm({ supabase, reference, onDone }: { supabase?: SupabaseClient | null; reference?: string; onDone?: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  // Signed in: the name is the account's (never someone else's name on a review).
  const [fromAccount, setFromAccount] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      let first = String(meta.first_name ?? meta.given_name ?? meta.full_name ?? meta.name ?? "").trim();
      if (!first) {
        const { data: prof } = await supabase.from("profiles").select("first_name").eq("id", u.id).maybeSingle();
        first = String((prof as { first_name?: string } | null)?.first_name ?? "").trim();
      }
      if (first) {
        setName(first.split(" ")[0]);
        setFromAccount(true);
      }
    }).catch(() => undefined);
  }, [supabase]);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const ref = reference ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") ?? undefined : undefined);
  if (state === "done")
    return (
      <div className="rounded-2xl border border-black/10 p-6 text-center dark:border-white/10">
        <p className="text-4xl">🙏</p>
        <p className="mt-2 text-lg font-semibold">Merci pour votre avis !</p>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setError("Choisissez une note de 1 à 5 étoiles.");
        setState("sending");
        setError(null);
        try {
          await post("/reviews/submit", { rating, comment, name, reference: ref, accessToken: await token(supabase) });
          setState("done");
          onDone?.();
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      <div className="flex justify-center gap-2" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} étoile${i > 1 ? "s" : ""}`} onClick={() => setRating(i)} className="grid size-12 place-items-center transition active:scale-90">
            <svg viewBox="0 0 24 24" className={"size-10 " + (i <= rating ? "fill-amber-400 text-amber-400" : "fill-black/10 dark:fill-white/15")} aria-hidden="true">
              <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
            </svg>
          </button>
        ))}
      </div>
      <textarea className={input + " min-h-28"} placeholder="Votre expérience en quelques mots (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
      <input className={input + (fromAccount ? " opacity-70" : "")} placeholder="Votre prénom (affiché avec l'avis)" value={name} readOnly={fromAccount} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className={primary + " w-full"} disabled={state === "sending"}>
        {state === "sending" ? "Envoi…" : "Publier mon avis"}
      </button>
    </form>
  );
}

/** Admin section « Avis »: every review, show / hide / delete. */
export function ReviewsAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<(Review & { approved: boolean; at: string })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (id?: string, action?: "show" | "hide" | "delete") => {
      try {
        const res = await post<{ reviews: (Review & { approved: boolean; at: string })[] }>("/reviews/admin", { accessToken: await token(supabase), id, action });
        setRows(res.reviews);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [supabase],
  );
  useEffect(() => {
    void run();
  }, [run]);
  if (error) return <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600">{error}</p>;
  if (!rows) return <div className="h-32 animate-pulse rounded-2xl bg-black/5 dark:bg-white/10" />;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Avis clients</h2>
        <p className="text-sm opacity-70">Les avis sont publiés tout de suite ; masquez ceux qui ne conviennent pas.</p>
      </div>
      {rows.length === 0 && <p className="rounded-xl bg-black/5 p-4 text-sm dark:bg-white/10">Aucun avis pour le moment : la demande est envoyée automatiquement après chaque rendez-vous.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className={"rounded-2xl border border-black/10 p-4 dark:border-white/10 " + (r.approved ? "" : "opacity-60")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars value={r.rating} size="size-4" />
              <span className="text-xs opacity-60">
                {r.name || "Client"} · {new Date(r.at).toLocaleDateString()}
                {r.approved ? "" : " · masqué"}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-sm">« {r.comment} »</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void run(r.id, r.approved ? "hide" : "show")} className="min-h-11 rounded-full border border-black/15 px-4 text-sm font-medium active:scale-95 dark:border-white/20">
                {r.approved ? "Masquer" : "Publier"}
              </button>
              <button
                type="button"
                onClick={() => confirm("Supprimer définitivement cet avis ?") && void run(r.id, "delete")}
                className="min-h-11 rounded-full px-4 text-sm font-medium text-red-600 active:scale-95"
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ waiting list

/** Registers someone on the waiting list of a slot / class / product (`key` = its id). */
export async function joinWaitlist(key: string, person: { name?: string; email?: string }, supabase?: SupabaseClient | null) {
  await post("/waitlist/join", { key, ...person, accessToken: await token(supabase) });
}

/** A spot opened (booking cancelled…): everyone waiting for `key` is told at once. Never throws. */
export async function releaseWaitlist(key: string, data: NotifyData, supabase: SupabaseClient) {
  try {
    await post("/waitlist/release", { key, data, accessToken: await token(supabase) });
  } catch {
    /* never blocks the cancellation */
  }
}

/** « Me prévenir si une place se libère » button for a full slot: name + email in a sheet (pre-filled if signed in). */
export function WaitlistButton({ supabase, waitlistKey, label = "Me prévenir si une place se libère", className = "" }: { supabase?: SupabaseClient | null; waitlistKey: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open && supabase) void supabase.auth.getUser().then(({ data }) => data.user?.email && setEmail((e) => e || data.user!.email!));
  }, [open, supabase]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={"min-h-11 rounded-full border border-black/15 px-4 text-sm font-medium transition active:scale-95 dark:border-white/20 " + className}>
        🔔 {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Liste d'attente">
        {state === "done" ? (
          <p className="py-6 text-center">✓ C'est noté : vous serez prévenu dès qu'une place se libère.</p>
        ) : (
          <form
            className="space-y-3 pb-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setState("sending");
              setError(null);
              try {
                await joinWaitlist(waitlistKey, { name, email }, supabase);
                setState("done");
              } catch (err) {
                setError((err as Error).message);
                setState("idle");
              }
            }}
          >
            <input className={input} placeholder="Prénom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            <input className={input} type="email" inputMode="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className={primary + " w-full"} disabled={state === "sending"}>
              {state === "sending" ? "Inscription…" : "Me prévenir"}
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}

// ------------------------------------------------------------------ newsletter

/** Newsletter sign-up (footer, home page…): email + clear consent; one-click unsubscribe in every email. */
export function NewsletterSignup({ supabase, title = "Recevoir nos nouvelles", text = "Nouveautés, offres et conseils, une à deux fois par mois. Désabonnement en un clic." }: { supabase?: SupabaseClient | null; title?: string; text?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done") return <p className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">✓ Merci ! Vous êtes inscrit(e).</p>;
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError(null);
        try {
          await post("/newsletter/subscribe", { email, accessToken: await token(supabase) });
          setState("done");
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm opacity-70">{text}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={input} type="email" inputMode="email" autoComplete="email" required placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className={primary + " shrink-0"} disabled={state === "sending"}>
          {state === "sending" ? "…" : "S'inscrire"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

/** Admin section « Newsletter »: subscribers, write and send a message to all of them. */
export function NewsletterAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [stats, setStats] = useState<{ subscribed: number; total: number; sends: { subject: string; recipients: number; at: string }[] } | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const load = useCallback(async () => {
    try {
      setStats(await post("/newsletter/admin", { accessToken: await token(supabase) }));
    } catch (e) {
      setNote((e as Error).message);
    }
  }, [supabase]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Newsletter</h2>
        <p className="text-sm opacity-70">{stats ? `${stats.subscribed} abonné${stats.subscribed > 1 ? "s" : ""}` : "…"} · chaque email contient un lien de désabonnement.</p>
      </div>
      <input className={input} placeholder="Objet (ex. Nouveaux créneaux en décembre)" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
      <textarea className={input + " min-h-40"} placeholder="Votre message…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={8000} />
      <button
        type="button"
        className={primary + " w-full sm:w-auto"}
        disabled={sending || !subject.trim() || !message.trim() || !stats?.subscribed}
        onClick={async () => {
          if (!confirm(`Envoyer « ${subject} » à ${stats?.subscribed} abonné(s) ?`)) return;
          setSending(true);
          setNote(null);
          try {
            const res = await post<{ sent: number; subscribed: number; total: number; sends: { subject: string; recipients: number; at: string }[] }>("/newsletter/admin", { accessToken: await token(supabase), subject, message });
            setStats(res);
            setNote(`✓ Envoyé à ${res.sent} abonné(s).`);
            setSubject("");
            setMessage("");
          } catch (e) {
            setNote((e as Error).message);
          } finally {
            setSending(false);
          }
        }}
      >
        {sending ? "Envoi…" : "Envoyer à tous les abonnés"}
      </button>
      {note && <p className="text-sm opacity-80">{note}</p>}
      {!!stats?.sends.length && (
        <ul className="space-y-1 text-sm opacity-70">
          {stats.sends.map((s, i) => (
            <li key={i}>
              {new Date(s.at).toLocaleDateString()} · {s.subject} · {s.recipients} envoi(s)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ add to calendar

export type CalendarEventInput = { title: string; start: Date | string; end?: Date | string; location?: string; description?: string };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Google, Outlook and .ics (Apple Calendar) links for an appointment (one hour long by default). */
export function calendarLinks(e: CalendarEventInput) {
  const start = new Date(e.start);
  const end = e.end ? new Date(e.end) : new Date(start.getTime() + 3600_000);
  const google = "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(start)}/${stamp(end)}`, details: e.description ?? "", location: e.location ?? "" });
  const outlook = "https://outlook.live.com/calendar/0/deeplink/compose?" + new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: e.title, startdt: start.toISOString(), enddt: end.toISOString(), body: e.description ?? "", location: e.location ?? "" });
  const txt = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => "\\" + c);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Usin//FR",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}-${Math.random().toString(36).slice(2)}@usin`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${txt(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${txt(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${txt(e.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return { google, outlook, ics: "data:text/calendar;charset=utf-8," + encodeURIComponent(ics) };
}

/** « Ajouter à mon agenda » button (booking confirmation): Google, Apple / iPhone, Outlook. */
export function AddToCalendar({ className = "", ...event }: CalendarEventInput & { className?: string }) {
  const [open, setOpen] = useState(false);
  const links = calendarLinks(event);
  const item = "flex min-h-12 items-center gap-3 rounded-xl bg-black/5 px-4 font-medium transition active:scale-[0.98] dark:bg-white/10";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={"min-h-11 rounded-full border border-black/15 px-4 text-sm font-medium transition active:scale-95 dark:border-white/20 " + className}>
        📅 Ajouter à mon agenda
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ajouter à mon agenda">
        <div className="grid gap-2 pb-2">
          <a className={item} href={links.google} target="_blank" rel="noreferrer">
            Google Agenda
          </a>
          <a className={item} href={links.ics} download="rendez-vous.ics">
            Apple Calendrier (iPhone, Mac)
          </a>
          <a className={item} href={links.outlook} target="_blank" rel="noreferrer">
            Outlook
          </a>
        </div>
      </Sheet>
    </>
  );
}

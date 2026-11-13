import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal as CReveal, SectionBackground } from "../../lib/content";
import { toast as kitToast } from "../../lib/ui";
import { X, Loader2 } from "lucide-react";

export const cn = (...c: any[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  const v = {
    primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90 shadow-[0_8px_24px_-10px_var(--brand)]",
    secondary: "bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/15 dark:text-neutral-100",
    outline: "border border-neutral-300/80 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:border-[var(--brand)] hover:text-[var(--brand)] dark:hover:text-neutral-100",
    ghost: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  const s = { sm: "min-h-10 px-4 text-sm", md: "min-h-11 px-5 text-[15px]", lg: "min-h-12 px-7 text-base" }[size];
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2",
    v, s, className
  );
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = "primary", size = "md", className, children, ...p }: { to: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode } & any) {
  if (/^(https?:|tel:|mailto:)/.test(to)) return <a href={to} className={buttonClass(variant, size, className)} {...p}>{children}</a>;
  return <Link to={to} className={buttonClass(variant, size, className)} {...p}>{children}</Link>;
}

/** Petit message temporaire en bas de l'écran (remplace alert()) : celui d'Usin. */
export function toast(message: string, tone: "ok" | "error" = "ok") {
  kitToast(message, tone === "ok" ? "success" : "error");
}

const field = "w-full rounded-2xl border border-neutral-300/80 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 px-4 text-base placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-11", className)} {...p} />
));

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const grow = () => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } };
  useEffect(grow, [p.value]);
  return <textarea ref={ref} rows={3} onInput={grow} className={cn(field, "py-2.5 min-h-24 resize-none", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "h-11", className)} {...p}>{children}</select>;
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-white/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900 shadow-[0_10px_40px_-18px_rgba(90,45,125,0.28)]", className)} {...p}>{children}</div>;
}

export function Badge({ tone = "neutral", className, children }: { tone?: "neutral" | "brand" | "green" | "red" | "amber"; className?: string; children: React.ReactNode }) {
  const t = {
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    brand: "bg-[var(--brand)]/10 text-[var(--brand)] dark:text-neutral-100",
    green: "bg-lime-100 text-lime-900 dark:bg-lime-900/40 dark:text-lime-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", t, className)}>{children}</span>;
}

export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={cn("w-full max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xl anim-zoom", wide ? "max-w-3xl" : "max-w-lg")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 min-w-0 truncate">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="h-10 w-10 grid place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"><X className="h-5 w-5" /></button>
        </div>
        <div className={cn("overflow-y-auto px-6 py-4 space-y-4", !footer && "pb-[calc(1rem+var(--safe-bottom))]")}>{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 px-6 pt-3 pb-[calc(0.75rem+var(--safe-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-neutral-100/80 dark:bg-neutral-800 p-1 snap-x">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={cn("snap-start whitespace-nowrap flex-1 min-h-10 rounded-full px-4 text-sm font-medium transition-all duration-200", value === t.id ? "bg-white dark:bg-neutral-900 text-[var(--brand)] shadow-sm" : "text-neutral-600 dark:text-neutral-400")}>{t.label}</button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-3xl bg-neutral-200/70 dark:bg-neutral-800", className)} />;
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 p-8">
      {icon && <div className="h-12 w-12 grid place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">{icon}</div>}
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      {text && <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm">{text}</p>}
      {action}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 min-h-11 cursor-pointer">
      <span className="text-sm text-neutral-800 dark:text-neutral-200 min-w-0">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-[var(--brand)]" : "bg-neutral-300 dark:bg-neutral-700")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </button>
    </label>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-sm text-neutral-700 dark:text-neutral-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  // Same edges as the header on every screen: 80rem of content + the 1rem margins of the bars.
  return <div className={cn("mx-auto w-full max-w-[82rem] px-4", className)}>{children}</div>;
}

/** Titre principal unique d'une page (un seul rendu par page). */
export function H1(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 {...props} />;
}

export function PageTitle({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="py-10 sm:py-14 space-y-3">
      {title}
      {subtitle}
      {children}
    </div>
  );
}

/** Apparition douce au défilement. */
/** Apparition douce d'une section (moteur Usin : rapide, jamais de contenu caché au chargement). */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <CReveal className={className}>{children}</CReveal>;
}

export function Blobs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="blob absolute -top-24 -left-20 h-80 w-80 rounded-full bg-[var(--brand)]/25 blur-3xl" />
      <div className="blob absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-[var(--brand-accent)]/60 blur-3xl" style={{ animationDelay: "-6s" }} />
      <div className="blob absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-yellow-200/50 blur-3xl dark:bg-yellow-200/10" style={{ animationDelay: "-12s" }} />
      <div className="blob absolute top-10 left-1/2 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-300/10" style={{ animationDelay: "-3s" }} />
    </div>
  );
}

/** Section au fond alterné. */
/** bg: settings key of an optional background image, chosen with the pencil (nothing until one is chosen). */
export function Section({ tone = "plain", className, children, id, bg: bgKey }: { tone?: "plain" | "tint" | "white"; className?: string; children: React.ReactNode; id?: string; bg?: string }) {
  const bg = { plain: "", tint: "bg-gradient-to-b from-[var(--brand)]/[0.05] via-[var(--brand-accent)]/20 to-transparent dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950", white: "bg-white/70 dark:bg-neutral-900/60" }[tone];
  return <section id={id} className={cn("relative py-16 sm:py-24", bg, className)}>{bgKey && <SectionBackground k={bgKey} />}{children}</section>;
}

// Injected by Usin (base components, in the colors and font of the brand). Do not edit.
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Sheet } from "./mobile";

/** Merges Tailwind classes (the last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ------------------------------------------------------------------ buttons

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-white shadow-sm shadow-[var(--brand)]/20 hover:brightness-110",
  secondary: "bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/15 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/15",
  outline: "border border-neutral-300 bg-white/60 text-neutral-900 hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:hover:bg-neutral-900",
  ghost: "text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-sm gap-1.5",
  md: "min-h-11 px-5 text-sm gap-2",
  lg: "min-h-12 px-7 text-base gap-2",
  icon: "size-11 p-0",
};

/** Classes of a button (for a link styled as a button). */
export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-full font-medium transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40 [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

function Spinner({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }>(
  function Button({ variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...rest }, ref) {
    return (
      <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);

/** A link (internal page or external address) that looks like a button. */
export function ButtonLink({ to, variant = "primary", size = "md", className, children, ...rest }: { to: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; target?: string; rel?: string; onClick?: () => void }) {
  const cls = buttonClass(variant, size, className);
  if (/^(https?:|mailto:|tel:)/.test(to)) {
    return (
      <a href={to} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} {...rest}>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------ layout

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  // Same edges as the header on every screen: 80rem of content + the 1rem margins of the bars.
  return <div className={cn("mx-auto w-full max-w-[82rem] px-4", className)}>{children}</div>;
}

/** A page section with a comfortable vertical rhythm. */
export function Section({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("py-12 sm:py-20", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl border border-black/5 bg-white/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80",
        onClick && "cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ className, children, tone = "brand" }: { className?: string; children: ReactNode; tone?: "brand" | "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    brand: "bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-white/10 dark:text-neutral-100",
    neutral: "bg-black/5 text-neutral-700 dark:bg-white/10 dark:text-neutral-300",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    danger: "bg-red-500/10 text-red-700 dark:text-red-300",
  };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium [&_svg]:size-3.5", tones[tone], className)}>{children}</span>;
}

/** Placeholder of the right size while the first data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-2xl bg-black/5 dark:bg-white/10", className)} />;
}

/** Empty list: a calm message (and an action), never a blank space. */
export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-black/10 px-6 py-12 text-center dark:border-white/15">
      {icon && <span className="grid size-12 place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] [&_svg]:size-6">{icon}</span>}
      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
      {text && <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">{text}</p>}
      {action}
    </div>
  );
}

/** Key figure (dashboard). */
export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <span>{label}</span>
        {icon && <span className="text-[var(--brand)] [&_svg]:size-5">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ forms

const fieldClass =
  "w-full min-h-11 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/25 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(fieldClass, className)} {...rest} />;
});

export type AddressParts = { line: string; street: string; postcode: string; city: string; country: string };

/**
 * Address field with suggestions while typing (OpenStreetMap, free): <AddressInput value={v} onChange={setV}
 * onPick={(a) => …a.street, a.postcode, a.city, a.country} />. Free text stays possible.
 */
export function AddressInput({ value, onChange, onPick, className, placeholder, lang = "fr" }: { value: string; onChange: (v: string) => void; onPick?: (a: AddressParts) => void; className?: string; placeholder?: string; lang?: string }) {
  const [items, setItems] = useState<AddressParts[]>([]);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  useEffect(() => {
    const q = value.trim();
    if (!typed || q.length < 4) return setItems([]);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch("https://photon.komoot.io/api/?limit=5&lang=" + (["fr", "en", "de"].includes(lang) ? lang : "fr") + "&q=" + encodeURIComponent(q), { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { features?: { properties: Record<string, string> }[] }) => {
          const seen = new Set<string>();
          const list = (d.features ?? [])
            .map(({ properties: p }) => {
              const street = [p.street ?? (p.type === "house" || p.type === "street" ? p.name : ""), p.housenumber].filter(Boolean).join(" ") || p.name || "";
              const city = p.city ?? p.town ?? p.village ?? p.locality ?? p.county ?? "";
              const line = [street, [p.postcode, city].filter(Boolean).join(" "), p.country].filter(Boolean).join(", ");
              return { line, street, postcode: p.postcode ?? "", city, country: p.country ?? "" };
            })
            .filter((a) => a.line && !seen.has(a.line) && seen.add(a.line));
          setItems(list);
          setOpen(list.length > 0);
        })
        .catch(() => undefined);
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, typed, lang]);
  return (
    <div className="relative">
      <input
        className={cn(fieldClass, className)}
        value={value}
        placeholder={placeholder}
        // Our own suggestions: the browser's autofill list would cover them.
        autoComplete="off"
        name="usin-address-search"
        data-lpignore="true"
        data-1p-ignore="true"
        onChange={(e) => {
          setTyped(true);
          onChange(e.target.value);
        }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-black/10 bg-[var(--brand-bg,#fff)] shadow-xl dark:border-white/10 dark:bg-neutral-900">
          {items.map((a) => (
            <li key={a.line}>
              <button
                type="button"
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(onPick ? a.street || a.line : a.line);
                  onPick?.(a);
                  setTyped(false);
                  setOpen(false);
                }}
              >
                {a.line}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Text area that grows with its content. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(fieldClass, "min-h-28 [field-sizing:content]", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(fieldClass, "appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10", className)} {...rest}>
      {children}
    </select>
  );
});

/** A form field: label, control, hint and error message. */
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string | null; children: ReactNode; className?: string }) {
  return (
    // Side by side in a grid, the controls stay aligned even when a label wraps (the label sits at the bottom of its space).
    <label className={cn("flex h-full flex-col gap-1.5", className)}>
      <span className="flex flex-1 items-end text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-600">{error}</span> : hint ? <span className="block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

/** On / off switch. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium text-neutral-900 disabled:opacity-60 dark:text-neutral-100"
    >
      <span>{label}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-[var(--brand)]" : "bg-black/20 dark:bg-white/20")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/** Segmented control (tabs inside a page). */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-full bg-black/5 p-1 [scrollbar-width:none] dark:bg-white/10", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition",
            value === it.value ? "bg-white text-[var(--brand)] shadow-sm dark:bg-neutral-800 dark:text-neutral-100" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ windows and messages

/** A window: bottom sheet on phones, centered dialog on computers (footer: action buttons). */
export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </Sheet>
  );
}

/** Asks before a destructive action: const ok = await confirmAction("Supprimer cet article ?"). */
let confirmImpl: ((text: string, danger: boolean) => Promise<boolean>) | null = null;
export function confirmAction(text: string, danger = true): Promise<boolean> {
  return confirmImpl ? confirmImpl(text, danger) : Promise.resolve(window.confirm(text));
}

type Toast = { id: number; text: string; tone: "success" | "error" };
let pushToast: ((t: Omit<Toast, "id">) => void) | null = null;
/** Short confirmation at the bottom of the screen: toast("Enregistré ✓") or toast("…", "error"). */
export function toast(text: string, tone: Toast["tone"] = "success") {
  pushToast?.({ text, tone });
}

/** Place once in the app (in /App.tsx): shows the toasts and the confirmations. */
// ------------------------------------------------------------------ counters (menu badges + icon of the installed app)

const badges = new Map<string, number>();
const BADGES = "usin:badges";
type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/**
 * A counter of things waiting (unread emails, new messages…): useBadge(key) shows it in a menu, and the icon of the
 * installed app (phone, computer) shows the largest one, so the same email is never counted twice.
 * setBadge("mail", 3); const n = useBadge("mail");
 */
export function setBadge(key: string, n: number) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if ((badges.get(key) ?? -1) === v) return;
  badges.set(key, v);
  const top = Math.max(0, ...badges.values());
  const nav = navigator as BadgeNavigator;
  try {
    void (top ? nav.setAppBadge?.(top) : nav.clearAppBadge?.())?.catch(() => undefined);
  } catch {
    /* not supported */
  }
  window.dispatchEvent(new CustomEvent(BADGES));
}

export function useBadge(key: string) {
  const [n, setN] = useState(() => badges.get(key) ?? 0);
  useEffect(() => {
    const on = () => setN(badges.get(key) ?? 0);
    on();
    window.addEventListener(BADGES, on);
    return () => window.removeEventListener(BADGES, on);
  }, [key]);
  return n;
}

export function UiRoot() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ask, setAsk] = useState<{ text: string; danger: boolean; resolve: (v: boolean) => void } | null>(null);
  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { ...t, id }]);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3200);
    };
    confirmImpl = (text, danger) => new Promise((resolve) => setAsk({ text, danger, resolve }));
    return () => {
      pushToast = null;
      confirmImpl = null;
    };
  }, []);
  const close = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };
  const lang = (typeof document !== "undefined" ? document.documentElement.lang : "fr").slice(0, 2);
  const L = lang === "en" ? ["Cancel", "Confirm"] : lang === "nl" ? ["Annuleren", "Bevestigen"] : lang === "de" ? ["Abbrechen", "Bestätigen"] : lang === "es" ? ["Cancelar", "Confirmar"] : ["Annuler", "Confirmer"];
  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-[110] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg", t.tone === "error" ? "bg-red-600" : "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900")}>
            {t.text}
          </div>
        ))}
      </div>
      <Dialog
        open={Boolean(ask)}
        onClose={() => close(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {L[0]}
            </Button>
            <Button variant={ask?.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {L[1]}
            </Button>
          </>
        }
      >
        <p className="text-base text-neutral-900 dark:text-neutral-100">{ask?.text}</p>
      </Dialog>
    </>
  );
}

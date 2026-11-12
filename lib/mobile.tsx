// Injected by Usin (native-feeling mobile building blocks). Do not edit.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";

/** True below 768 px (phones): switch to the mobile layout (tab bar, sheets, cards). */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(q.matches);
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return mobile;
}

/** True when opened from the home screen (installed app). */
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Bottom sheet on phones (slides up, drag the handle down to close), centered dialog on computers. Use it instead of
 * dropdowns, popovers and modals: <Sheet open={open} onClose={() => setOpen(false)} title="Filtrer">…</Sheet>
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    // Counted lock: with several sheets open, the page scrolls again only when the last one closes (never stays stuck).
    const w = window as unknown as { __usinScrollLocks?: number };
    w.__usinScrollLocks = (w.__usinScrollLocks ?? 0) + 1;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      w.__usinScrollLocks = Math.max(0, (w.__usinScrollLocks ?? 1) - 1);
      if (!w.__usinScrollLocks) document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] [animation:usin-fade_200ms_ease-out]" onClick={onClose} />
      <div
        ref={panel}
        style={{ transform: drag ? "translateY(" + drag + "px)" : undefined, transition: start.current === null ? "transform 200ms ease" : "none" }}
        className="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-[var(--brand-bg,#fff)] text-neutral-900 dark:text-neutral-100 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl [animation:usin-up_280ms_cubic-bezier(0.2,0.8,0.2,1)] md:max-w-lg md:rounded-3xl md:pb-4 md:[animation:usin-pop_180ms_ease-out]"
      >
        <div
          className="sticky top-0 z-10 touch-none bg-inherit px-5 pt-3 pb-2 md:pt-5"
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDrag(Math.max(0, e.clientY - start.current))}
          onPointerUp={() => {
            const close = drag > 100;
            start.current = null;
            setDrag(0);
            if (close) onClose();
          }}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300 md:hidden dark:bg-neutral-700" />
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
        </div>
        <div className="px-5">{children}</div>
      </div>
      <style>{"@keyframes usin-up{from{transform:translateY(100%)}to{transform:none}}@keyframes usin-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}@keyframes usin-fade{from{opacity:0}to{opacity:1}}"}</style>
    </div>,
    document.body,
  );
}

export type TabItem = { to: string; label: string; icon: ReactNode; end?: boolean };

/**
 * Floating phone navigation bar (pill above the home bar) (3 to 5 entries, hidden on computers). Add pb-24 md:pb-0 to the page
 * content so nothing hides behind it: <TabBar items={[{ to: "/", label: "Accueil", icon: <Home />, end: true }, …]} />
 */
export function TabBar({ items }: { items: TabItem[] }) {
  // Instant feedback: the tapped tab lights up at once, even while its page is still loading.
  const location = useLocation();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [location.pathname]);
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 grid rounded-full border border-black/10 bg-[var(--brand-bg,#fff)]/80 p-1 shadow-lg shadow-black/10 backdrop-blur-xl md:hidden dark:border-white/10"
      style={{ gridTemplateColumns: "repeat(" + items.length + ", minmax(0, 1fr))" }}
      aria-label="Navigation"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onPointerDown={() => setPending(item.to)}
          onClick={() => setPending(item.to)}
          className={({ isActive: routeActive }) =>
            "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition active:scale-95 [&_svg]:size-5 " +
            ((pending ? pending === item.to : routeActive) ? "bg-[var(--brand,#111)]/10 text-[var(--brand,#111)]" : "text-neutral-500 dark:text-neutral-400")
          }
        >
          {item.icon}
          <span className="max-w-full truncate px-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    window.dispatchEvent(new Event("usin-installable"));
  });
}

/**
 * Invitation to install the app on the home screen (phones only, from the 2nd visit, never once installed or
 * dismissed): one tap on Android, a two-step guide on iPhone. Place it once, in the layout.
 */
export function InstallPrompt({ appName, iconUrl = "/icon-192.png" }: { appName: string; iconUrl?: string }) {
  const [show, setShow] = useState(false);
  const [guide, setGuide] = useState(false);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    try {
      if (isStandalone() || localStorage.getItem("install:dismissed") || !window.matchMedia("(max-width: 767px)").matches) return;
      const visits = Number(localStorage.getItem("install:visits") || 0) + 1;
      localStorage.setItem("install:visits", String(visits));
      if (visits < 2) return;
      const update = () => setShow(ios || deferred !== null);
      update();
      window.addEventListener("usin-installable", update);
      return () => window.removeEventListener("usin-installable", update);
    } catch {
      /* storage blocked: no invitation */
    }
  }, [ios]);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem("install:dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (ios) return setGuide(true);
    if (!deferred) return;
    await deferred.prompt();
    deferred = null;
    dismiss();
  }

  if (!show) return null;
  return (
    <>
      <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--brand-bg,#fff)] p-3 shadow-xl [animation:usin-up_300ms_ease-out] md:hidden dark:border-white/10">
        <img src={iconUrl} alt="" className="size-11 shrink-0 rounded-[22%]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Installer {appName}</p>
          <p className="text-xs text-neutral-500">Sur votre écran d'accueil, comme une app.</p>
        </div>
        <button type="button" onClick={() => void install()} className="min-h-11 shrink-0 rounded-full bg-[var(--brand,#111)] px-4 text-sm font-semibold text-white active:scale-95">
          Installer
        </button>
        <button type="button" onClick={dismiss} aria-label="Plus tard" className="grid size-11 shrink-0 place-items-center text-xl text-neutral-400">
          ×
        </button>
        <style>{"@keyframes usin-up{from{transform:translateY(120%)}to{transform:none}}"}</style>
      </div>
      <Sheet open={guide} onClose={() => setGuide(false)} title={"Installer " + appName}>
        <ol className="space-y-4 py-2 text-base">
          <li>1. Touchez <b>Partager</b> (le carré avec une flèche) en bas de Safari</li>
          <li>2. Choisissez <b>Sur l'écran d'accueil</b></li>
        </ol>
        <button type="button" onClick={() => { setGuide(false); dismiss(); }} className="mt-4 min-h-12 w-full rounded-full bg-[var(--brand,#111)] font-semibold text-white">
          J'ai compris
        </button>
      </Sheet>
    </>
  );
}

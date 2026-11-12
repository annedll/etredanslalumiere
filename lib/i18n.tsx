// Injected by the platform. Do not edit.
import { useEffect, useRef, useState } from "react";
import { brand } from "./brand";

type Dictionary = Record<string, Record<string, string>>;
const NAMES: Record<string, string> = {"fr":"Français","en":"English","nl":"Nederlands","de":"Deutsch","es":"Español","it":"Italiano","pt":"Português","pl":"Polski","ro":"Română","cs":"Čeština","hu":"Magyar","uk":"Українська","ru":"Русский","zh":"中文","ja":"日本語"};

/** Languages of this app (the first one is the main language). */
export const languages: readonly string[] = brand.languages;
let messages: Dictionary = {};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function initial(): string {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && languages.includes(saved)) return saved;
  } catch {
    // Storage unavailable: phone language.
  }
  const wanted = (typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []).map((l) => l.slice(0, 2).toLowerCase());
  return wanted.find((l) => languages.includes(l)) ?? languages[0];
}
let current = initial();
if (typeof document !== "undefined") document.documentElement.lang = current;

/** Registers the app's translations: { fr: { "home.title": "…" }, en: { … } }. */
export function registerMessages(dictionary: Dictionary) {
  messages = dictionary;
  notify();
}

export function setLanguage(lang: string) {
  if (!languages.includes(lang) || lang === current) return;
  current = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch {
    // Not remembered: still applied.
  }
  document.documentElement.lang = lang;
  notify();
}

export const getLanguage = () => current;

/** Translation of a key in the current language (main language, then the key itself, as fallbacks). {name} placeholders. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const text = messages[current]?.[key] ?? messages[languages[0]]?.[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : text;
}

/** In components: re-renders when the language changes. */
export function useI18n() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { t, lang: current, setLanguage, languages };
}

/**
 * Compact language switcher (globe + code, e.g. « FR »): a small menu, never a bulky native list.
 * Closes on an outside tap or Escape; fits headers on computers and phones.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  if (languages.length < 2) return null;
  return (
    <div ref={box} className={"relative " + className}>
      <button
        type="button"
        aria-label={"Language: " + (NAMES[lang] ?? lang)}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium opacity-80 transition hover:bg-black/5 hover:opacity-100 active:scale-95 dark:hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {lang.toUpperCase()}
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-2xl border border-black/10 bg-[var(--brand-bg,#fff)] p-1 shadow-xl dark:border-white/10">
          {languages.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l === lang}
                onClick={() => {
                  setLanguage(l);
                  setOpen(false);
                }}
                className={"flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10 " + (l === lang ? "font-semibold" : "")}
              >
                {NAMES[l] ?? l}
                <span className="text-xs opacity-50">{l.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Preview of the platform: language forced from the IDE.
if (typeof window !== "undefined") {
  window.addEventListener("message", (e) => {
    const lang = (e.data as { msfLang?: string } | null)?.msfLang;
    if (lang) setLanguage(lang);
  });
}

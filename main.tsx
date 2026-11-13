import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import "./index.css";
import App from "./App";

// Android hardware back button: navigate back, exit at the root.
if (Capacitor.isNativePlatform()) {
  void NativeApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void NativeApp.exitApp();
  });
}

// Errors met by visitors reach the app's creator in Usin (message and page only, no personal data).
const REPORT_URL = "https://usin.app/api/app-errors/cc06c13b-c24b-406e-9659-f4fbacd32547";
if (REPORT_URL && import.meta.env.PROD) {
  const sent = new Set<string>();
  const report = (message: string, source?: string) => {
    if (!message || sent.size >= 10 || sent.has(message) || /ResizeObserver|^Script error.?$/.test(message)) return;
    sent.add(message);
    try {
      navigator.sendBeacon(REPORT_URL, new Blob([JSON.stringify({ message, source, page: location.pathname })], { type: "text/plain" }));
    } catch {}
  };
  window.addEventListener("error", (e) => report(e.message, e.filename ? e.filename + ":" + e.lineno : undefined));
  window.addEventListener("unhandledrejection", (e) => report(String((e.reason && e.reason.message) || e.reason)));
}

// Scroll safety net: a menu, banner or window closed without unlocking the page scroll would leave the site stuck.
// When the visitor tries to scroll and no window is open, the lock is removed.
const unlockScroll = () => {
  if ((window as unknown as { __usinScrollLocks?: number }).__usinScrollLocks) return;
  if (document.querySelector('[aria-modal="true"]')) return;
  for (const el of [document.documentElement, document.body]) {
    if (getComputedStyle(el).overflowY === "hidden") {
      el.style.overflow = "";
      el.style.overflowY = "";
      el.classList.remove("overflow-hidden", "overflow-y-hidden");
      if (getComputedStyle(el).overflowY === "hidden") el.style.overflowY = "auto";
    }
  }
  if (document.body.style.position === "fixed") {
    const top = -parseInt(document.body.style.top || "0", 10);
    document.body.style.position = "";
    document.body.style.top = "";
    window.scrollTo(0, top);
  }
};
for (const type of ["wheel", "touchmove", "keydown"]) window.addEventListener(type, unlockScroll, { passive: true });
window.addEventListener("popstate", () => setTimeout(unlockScroll, 300));

// PWA: offline shell (web only; native builds ship assets locally).
if ("serviceWorker" in navigator && !Capacitor.isNativePlatform() && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The loading screen fades out once the app has drawn its first image.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    const splash = document.getElementById("usin-splash");
    if (!splash) return;
    splash.classList.add("out");
    setTimeout(() => splash.remove(), 400);
  }),
);

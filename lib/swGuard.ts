/** Empêche une erreur d'enregistrement du service worker (ex. certificat SSL du domaine) de polluer l'application. */
export function installSwGuard() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const sw: any = navigator.serviceWorker;
    const original = sw.register?.bind(sw);
    if (original && !(sw as any).__guarded) {
      sw.register = (...args: any[]) => {
        try {
          return Promise.resolve(original(...args)).catch(() => undefined);
        } catch {
          return Promise.resolve(undefined);
        }
      };
      (sw as any).__guarded = true;
    }
  } catch {}
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const m = String((e as any)?.reason?.message || (e as any)?.reason || "");
    if (/ServiceWorker|sw\.js/i.test(m)) e.preventDefault();
  });
}

// Injected by Usin. Do not edit.
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

const base = env.paymentsUrl ? env.paymentsUrl.replace("/api/pay/", "/api/google/") : "";
const KEY = "usin_google_nonce";

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True when Google sign-in is switched on for this app (button shown only then). */
export async function googleAvailable(): Promise<boolean> {
  if (!base || !env.supabaseUrl) return false;
  try {
    const res = await fetch(env.supabaseUrl + "/auth/v1/settings", { headers: { apikey: env.supabaseAnonKey } });
    const data = await res.json();
    return Boolean(data?.external?.google);
  } catch {
    return false;
  }
}

/** Sends the visitor to Google, then back to returnPath (default: the current page). */
export async function signInWithGoogle(returnPath?: string) {
  if (window.top !== window.self) {
    throw new Error("La connexion Google se teste sur l'application publiée (pas dans l'aperçu).");
  }
  const raw = crypto.randomUUID() + crypto.randomUUID();
  sessionStorage.setItem(KEY, raw);
  const target = window.location.origin + (returnPath ?? window.location.pathname + window.location.search);
  window.location.href = base + "/start?nonce=" + (await sha256(raw)) + "&return=" + encodeURIComponent(target);
}

/** Call once when the app starts: finishes a Google sign-in after the return from Google. */
export async function completeGoogleSignIn(supabase: SupabaseClient) {
  const match = window.location.hash.match(/google_id_token=([^&]+)/);
  const failed = window.location.hash.match(/google_error=([^&]+)/);
  if (!match && !failed) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (failed) throw new Error("Connexion Google annulée.");
  const nonce = sessionStorage.getItem(KEY) ?? undefined;
  sessionStorage.removeItem(KEY);
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: decodeURIComponent(match![1]), nonce });
  if (error) throw new Error("Connexion Google impossible : " + error.message);
  return data.user;
}

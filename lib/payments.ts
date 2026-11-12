// Injected by Usin. Do not edit.
import { env } from "./env";

export type CheckoutOptions = {
  /** Amount in euros (or in the currency's main unit), e.g. 49.9 */
  amount: number;
  /** Shown on the Stripe payment page, e.g. "Séance de coaching 1h" */
  description: string;
  /** Your own identifier (e.g. a reservation id), stored with the payment */
  reference?: string;
  currency?: string;
  /** Pre-fills the payer email when no user is logged in */
  email?: string;
  /** Supabase session access token of the logged-in user (links the payment to auth.uid()) */
  accessToken?: string;
  /** Subscription billed every month or year instead of a one-time payment */
  interval?: "month" | "year";
  /** Marketplace: auth user id of the seller who receives the money (default: the app creator) */
  seller?: string;
  /** Route shown after payment (default "/paiement/merci") */
  successPath?: string;
  /** Route shown when the payer cancels (default: current page) */
  cancelPath?: string;
};

export type PaymentResult = {
  paid: boolean;
  amount: number | null;
  currency: string | null;
  reference: string | null;
  description: string | null;
  subscription: boolean;
};

export type SellerStatus = "none" | "pending" | "active";

export const paymentsEnabled = Boolean(env.paymentsUrl);

/** Works with both routers: HashRouter (#/page) and BrowserRouter (/page). */
const hashRouting = () => window.location.hash.startsWith("#/");

function pageUrl(path: string, query: string) {
  const route = path.startsWith("/") ? path : "/" + path;
  if (hashRouting()) return window.location.origin + window.location.pathname + query + "#" + route;
  return window.location.origin + route + query;
}

function currentPath() {
  return hashRouting() ? window.location.hash.replace(/^#/, "") || "/" : window.location.pathname || "/";
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  if (!env.paymentsUrl) throw new Error("Paiements indisponibles dans cette version de l'application.");
  const res = await fetch(env.paymentsUrl + path, body === undefined ? undefined : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Le service de paiement ne répond pas.");
  return data;
}

/** Stripe pages cannot be displayed inside a frame (IDE preview): open them in a new tab there. */
function go(url: string) {
  if (window.self !== window.top) window.open(url, "_blank");
  else window.location.assign(url);
}

/** Opens the Stripe payment page (one-time payment or subscription). Throws an Error with a readable message. */
export async function startCheckout(options: CheckoutOptions): Promise<void> {
  const query = "?msf_session={CHECKOUT_SESSION_ID}" + (options.seller ? "&msf_seller=" + encodeURIComponent(options.seller) : "");
  const data = await call<{ url: string }>("/checkout", {
    amount: Math.round(options.amount * 100),
    currency: (options.currency ?? "eur").toLowerCase(),
    description: options.description,
    reference: options.reference,
    email: options.email,
    accessToken: options.accessToken,
    interval: options.interval,
    seller: options.seller,
    successUrl: pageUrl(options.successPath ?? "/paiement/merci", query),
    cancelUrl: pageUrl(options.cancelPath ?? currentPath(), ""),
  });
  go(data.url);
}

/** On the thank-you page: confirms the payment that just happened (also records it in the database). */
export async function confirmPayment(): Promise<PaymentResult | null> {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("msf_session");
  if (!sessionId || !env.paymentsUrl) return null;
  const seller = params.get("msf_seller");
  try {
    return await call<PaymentResult>("/session/" + encodeURIComponent(sessionId) + (seller ? "?seller=" + encodeURIComponent(seller) : ""));
  } catch {
    return null;
  }
}

/** Subscribers: opens the Stripe page to change card, see invoices or cancel (stripe_subscriptions.stripe_subscription_id). */
export async function manageSubscription(options: { subscriptionId: string; accessToken: string }): Promise<void> {
  const data = await call<{ url: string }>("/portal", { ...options, returnUrl: pageUrl(currentPath(), "") });
  go(data.url);
}

/** Marketplace sellers (e.g. coaches): link their own Stripe account to receive their clients' payments. */
export async function connectSeller(options: { accessToken: string; country?: string }): Promise<void> {
  const data = await call<{ url: string }>("/sellers/onboard", {
    accessToken: options.accessToken,
    country: options.country ?? "BE",
    returnUrl: pageUrl(currentPath(), ""),
  });
  go(data.url);
}

/** Marketplace sellers: "none" (not started), "pending" (Stripe needs more info) or "active" (can receive payments). */
export async function sellerStatus(accessToken: string): Promise<SellerStatus> {
  try {
    return (await call<{ status: SellerStatus }>("/sellers/status", { accessToken })).status;
  } catch {
    return "none";
  }
}

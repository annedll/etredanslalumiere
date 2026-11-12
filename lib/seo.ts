// Injected by Usin. Do not edit.
import { useEffect, useState } from "react";
import { brand } from "./brand";

export type SeoOptions = {
  /** Page title (the brand name is appended automatically). */
  title?: string;
  /** 140 to 160 characters describing the page. */
  description?: string;
  /** Absolute URL of a specific share image (default: the brand share image). */
  image?: string;
  /** true for private pages (account, admin, payment) so Google does not index them. */
  noindex?: boolean;
  /** schema.org structured data (LocalBusiness, Product, FAQPage, Service…). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

function meta(attr: "name" | "property", key: string, value: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>("meta[" + attr + '="' + key + '"]');
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

/** Title / description written by the admin for this address (Réglages → Référencement Google), if any. */
function override(path: string, field: "title" | "description"): string | undefined {
  const key = "seo:" + (path.replace(/\/+$/, "") || "/") + ":" + field;
  const pick = (s: unknown) => {
    const v = s && typeof s === "object" ? (s as Record<string, unknown>)[key] : undefined;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  try {
    const cached = pick(JSON.parse(localStorage.getItem("usin:settings") || "null"));
    if (cached) return cached;
  } catch {
    // No saved settings: the published ones.
  }
  return pick((window as unknown as { __USIN_SETTINGS__?: unknown }).__USIN_SETTINGS__);
}

/** Call once at the top of every page component. */
export function useSeo(options: SeoOptions = {}) {
  const { title, description, image, noindex, jsonLd } = options;
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  // Settings loaded or changed by the admin: the tags follow right away.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("usin:settings", on);
    return () => window.removeEventListener("usin:settings", on);
  }, []);
  useEffect(() => {
    const path = window.location.pathname;
    const ownTitle = noindex ? undefined : override(path, "title");
    const fullTitle = ownTitle || (title ? title + " · " + brand.name : brand.tagline ? brand.name + " · " + brand.tagline : brand.name);
    const desc = (noindex ? undefined : override(path, "description")) || description || brand.description || brand.tagline;
    document.title = fullTitle;
    meta("name", "description", desc);
    meta("property", "og:title", fullTitle);
    meta("property", "og:description", desc);
    meta("property", "og:url", window.location.origin + window.location.pathname);
    if (image) meta("property", "og:image", image);
    meta("name", "robots", noindex ? "noindex, nofollow" : undefined);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;
    document.getElementById("msf-jsonld")?.remove();
    if (ld) {
      const script = document.createElement("script");
      script.id = "msf-jsonld";
      script.type = "application/ld+json";
      script.text = ld;
      document.head.appendChild(script);
    }
  }, [title, description, image, noindex, ld, tick]);
}

// Injected by Usin: per-page SEO tags written into the built HTML. Do not edit.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

try {
  const { base, routes } = JSON.parse(readFileSync("seo-routes.json", "utf8"));
  const html = readFileSync("dist/index.html", "utf8");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const put = (h, re, tag) => (re.test(h) ? h.replace(re, tag) : h.replace("</head>", "  " + tag + "\n  </head>"));
  const shell = html.replace(/\s*<link rel="canonical"[^>]*>/, "").replace(/\s*<meta property="og:url"[^>]*>/, "");
  writeFileSync("dist/app-shell.html", shell);
  for (const r of routes) {
    const url = base ? base + (r.path === "/" ? "/" : r.path) : "";
    let h = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(r.title) + "</title>");
    h = put(h, /<meta name="description"[^>]*>/, '<meta name="description" content="' + esc(r.description) + '" />');
    h = put(h, /<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + esc(r.title) + '" />');
    h = put(h, /<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + esc(r.description) + '" />');
    if (url) {
      h = put(h, /<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + esc(url) + '" />');
      h = put(h, /<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + esc(url) + '" />');
    }
    const file = r.path === "/" ? "dist/index.html" : "dist" + r.path.replace(/\/$/, "") + ".html";
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, h);
  }
  console.log("SEO: " + routes.length + " page(s) prêtes pour Google");
} catch (e) {
  console.warn("SEO prerender skipped:", e && e.message);
  try {
    if (!existsSync("dist/app-shell.html")) writeFileSync("dist/app-shell.html", readFileSync("dist/index.html", "utf8"));
  } catch {}
}

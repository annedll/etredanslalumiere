// Injected by Usin (site frame: floating header on computers and phones, "More" and admin menus, footer, cookies,
// errors, 404). Every app keeps its own look: brand colors, font, logo and the pages it puts inside. Do not edit.
import { Component, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutGrid, LogOut, Menu, Pencil, Settings, Shield, User, X } from "lucide-react";
import { brand } from "./brand";
import { LanguageSwitcher, useI18n } from "./i18n";
import { StylePanel, useContent, useContact, getConsent, setConsent, usePreloadPages } from "./content";
import { Button, ButtonLink, Container, Skeleton, UiRoot, cn, toast } from "./ui";
import { ViewAsSwitch } from "./admin";
import { TabBar, Sheet, type TabItem } from "./mobile";
import { NotificationBell } from "./notify";
import { NewsletterSignup } from "./engage";
import { LEGAL_PAGES, madeIn, type LegalKind } from "./legal";
import { completeGoogleSignIn } from "./google";
import { useSeo } from "./seo";

const T: Record<string, Record<string, string>> = {
  fr: {
    signout: "Se déconnecter",
    more: "Plus", menu: "Menu", account: "Mon compte", signin: "Connexion", admin: "Administration", manage: "Gestion", settings: "Réglages du site",
    edit: "Modifier la page", stopEdit: "Quitter l'édition", editing: "Mode édition : touchez un texte ou une image pour le modifier.", cookies: "Gérer les cookies",
    cookieText: "Nous utilisons des cookies de mesure d'audience anonymes pour améliorer le site.", accept: "Accepter", refuse: "Refuser", privacy: "En savoir plus",
    notFound: "Page introuvable", notFoundText: "Cette page n'existe pas ou a été déplacée.", home: "Retour à l'accueil", errTitle: "Cette page n'a pas pu s'afficher",
    errText: "Un problème passager est survenu. Rechargez la page pour réessayer.", reload: "Recharger", rights: "Tous droits réservés", follow: "Suivre",
  },
  en: {
    signout: "Sign out",
    more: "More", menu: "Menu", account: "My account", signin: "Sign in", admin: "Administration", manage: "Management", settings: "Site settings",
    edit: "Edit the page", stopEdit: "Stop editing", editing: "Edit mode: tap a text or an image to change it.", cookies: "Manage cookies",
    cookieText: "We use anonymous audience measurement cookies to improve the site.", accept: "Accept", refuse: "Decline", privacy: "Learn more",
    notFound: "Page not found", notFoundText: "This page does not exist or has moved.", home: "Back to home", errTitle: "This page couldn't be displayed",
    errText: "A temporary problem occurred. Reload the page to try again.", reload: "Reload", rights: "All rights reserved", follow: "Follow",
  },
  nl: {
    signout: "Afmelden",
    more: "Meer", menu: "Menu", account: "Mijn account", signin: "Inloggen", admin: "Beheer", manage: "Beheer", settings: "Instellingen van de site",
    edit: "Pagina bewerken", stopEdit: "Bewerken stoppen", editing: "Bewerkingsmodus: tik op een tekst of afbeelding om ze te wijzigen.", cookies: "Cookies beheren",
    cookieText: "We gebruiken anonieme cookies voor bezoekersstatistieken om de site te verbeteren.", accept: "Aanvaarden", refuse: "Weigeren", privacy: "Meer weten",
    notFound: "Pagina niet gevonden", notFoundText: "Deze pagina bestaat niet of is verplaatst.", home: "Terug naar home", errTitle: "Deze pagina kon niet worden weergegeven",
    errText: "Er trad een tijdelijk probleem op. Herlaad de pagina om opnieuw te proberen.", reload: "Herladen", rights: "Alle rechten voorbehouden", follow: "Volgen",
  },
};
function useT() {
  const { lang } = useI18n();
  return (k: string) => (T[lang] ?? T.en)[k] ?? T.fr[k] ?? k;
}

export type NavItem = { to: string; label: string; icon?: ReactNode; description?: string };
export type SocialLink = { network: "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok" | "whatsapp" | "x" | "pinterest"; url: string };
export type FooterColumn = { title: string; links: NavItem[] };

// Same height, radius, background, border and shadow for every floating piece of the header (harmony).
const PILL = "h-12 rounded-full border border-black/5 bg-[var(--brand-bg,#fff)]/75 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/75";
const ICON_BTN = "grid size-10 shrink-0 place-items-center rounded-full text-neutral-700 transition hover:bg-black/5 active:scale-95 dark:text-neutral-200 dark:hover:bg-white/10 [&_svg]:size-5";

const isActive = (pathname: string, to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"));

function Logo({ showName = true, custom }: { showName?: boolean; custom?: ReactNode }) {
  if (custom) return <>{custom}</>;
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={brand.name}>
      <img src={brand.logo} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full" />
      {showName && <span className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">{brand.name}</span>}
    </Link>
  );
}

function AdminMenu({ adminLinks }: { adminLinks: NavItem[] }) {
  const tr = useT();
  const { realAdmin, isAdmin, editMode, setEditMode, supabase } = useContent();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!realAdmin) return null;
  const row = "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-neutral-800 hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/10 [&_svg]:size-5";
  return (
    <>
      <button type="button" className={cn(ICON_BTN, open && "bg-[var(--brand)]/10 text-[var(--brand)]")} aria-label={tr("admin")} title={tr("admin")} onClick={() => setOpen(true)}>
        <Shield />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={tr("admin")}>
        <div className="space-y-1 pb-2">
          {adminLinks.map((l) => (
            <button
              key={l.to}
              type="button"
              className={row}
              onClick={() => {
                setOpen(false);
                navigate(l.to);
              }}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">{l.icon}</span>
              {l.label}
            </button>
          ))}
          {isAdmin && (
            <button
              type="button"
              className={row}
              onClick={() => {
                setEditMode(!editMode);
                setOpen(false);
              }}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <Pencil />
              </span>
              {editMode ? tr("stopEdit") : tr("edit")}
            </button>
          )}
          <ViewAsSwitch className="pt-3" />
          <button
            type="button"
            className={row + " mt-2 border-t border-black/5 pt-3 dark:border-white/10"}
            onClick={async () => {
              setOpen(false);
              setEditMode(false);
              await supabase?.auth.signOut();
              navigate("/");
            }}
          >
            <span className="grid size-9 place-items-center rounded-full bg-black/5 dark:bg-white/10">
              <LogOut />
            </span>
            {tr("signout")}
          </button>
        </div>
      </Sheet>
    </>
  );
}

function MoreMenu({ items }: { items: NavItem[] }) {
  const tr = useT();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  if (!items.length) return null;
  const current = items.some((i) => isActive(pathname, i.to));
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn("flex h-10 items-center gap-1 rounded-full px-4 text-sm font-medium transition", current || open ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white")}
      >
        {tr("more")} <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 grid w-[min(36rem,90vw)] -translate-x-1/2 gap-1 rounded-3xl border border-black/5 bg-[var(--brand-bg,#fff)] p-3 shadow-2xl sm:grid-cols-2 dark:border-white/10 dark:bg-neutral-900">
            {items.map((i) => (
              <Link key={i.to} to={i.to} className={cn("flex items-start gap-3 rounded-2xl p-3 transition hover:bg-black/5 dark:hover:bg-white/5", isActive(pathname, i.to) && "bg-[var(--brand)]/10")}>
                {i.icon && <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] [&_svg]:size-5">{i.icon}</span>}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">{i.label}</span>
                  {i.description && <span className="block text-xs text-neutral-600 dark:text-neutral-400">{i.description}</span>}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AccountButton({ accountPath, signInPath }: { accountPath: string; signInPath: string }) {
  const tr = useT();
  const { user, realAdmin } = useContent();
  if (realAdmin) return null;
  const label = user ? tr("account") : tr("signin");
  return (
    <Link to={user ? accountPath : signInPath} className={ICON_BTN} aria-label={label} title={label}>
      <User />
    </Link>
  );
}

function Header({
  nav,
  primary,
  maxInBar,
  adminLinks,
  accountPath,
  signInPath,
  logo,
  logoCompact,
  offset = 0,
}: {
  nav: NavItem[];
  primary?: NavItem;
  maxInBar: number;
  adminLinks: NavItem[];
  accountPath: string;
  signInPath: string;
  logo?: ReactNode;
  logoCompact?: ReactNode;
  /** Height of the banner above the page: the floating bars sit under it until it scrolls away. */
  offset?: number;
}) {
  const tr = useT();
  const { pathname } = useLocation();
  const { supabase, user } = useContent();
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const below = Math.max(0, offset - scrollY);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 12);
      setScrollY(window.scrollY);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setMenu(false), [pathname]);
  // The bar keeps only the entries that fit on one line (the rest goes to « Plus »): never a button on two lines.
  const row = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(maxInBar);
  const [, setWidth] = useState(0);
  useEffect(() => {
    const on = () => {
      setFit(maxInBar);
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", on);
    // Web fonts make the labels wider once loaded: measured again then.
    document.fonts?.ready.then(() => setWidth(window.innerWidth + 0.1)).catch(() => undefined);
    return () => window.removeEventListener("resize", on);
  }, [maxInBar]);
  // After every render: one entry less in the bar while the line overflows (the rest goes to « Plus »).
  useLayoutEffect(() => {
    const el = row.current;
    if (el && el.getClientRects().length && fit > 1 && el.scrollWidth > el.clientWidth + 1) setFit(fit - 1);
  });
  const inBar = nav.slice(0, fit);
  const more = nav.slice(fit);
  const pill = cn(PILL, "transition-all duration-200", scrolled ? "bg-[var(--brand-bg,#fff)]/90 dark:bg-neutral-900/90" : "");
  return (
    <>
      {/* Computers: logo, navigation and actions float on the same line, same height, same style. */}
      <header className="fixed inset-x-0 top-4 z-40 hidden px-4 md:block" style={below ? { transform: `translateY(${below}px)` } : undefined}>
        <div ref={row} className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className={cn(pill, "flex shrink-0 items-center pl-1.5 pr-4")}>
            <Logo showName custom={logo} />
          </div>
          <nav aria-label={tr("menu")} className={cn(pill, "flex shrink-0 items-center gap-1 px-1.5")}>
            {inBar.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === "/"}
                className={cn("flex h-10 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition", isActive(pathname, i.to) ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white")}
              >
                {i.label}
              </NavLink>
            ))}
            <MoreMenu items={more} />
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className={cn(pill, "flex items-center gap-1 px-1.5")}>
              <LanguageSwitcher />
              {supabase && user && <NotificationBell supabase={supabase} />}
              <AdminMenu adminLinks={adminLinks} />
              <AccountButton accountPath={accountPath} signInPath={signInPath} />
            </div>
            {primary && (
              <ButtonLink to={primary.to} className="h-12 shrink-0 whitespace-nowrap px-6 shadow-lg shadow-[var(--brand)]/25">
                {primary.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </header>
      {/* Phones: one compact floating bar (logo, language, account, menu). */}
      <header className="fixed inset-x-3 top-[calc(var(--safe-top,env(safe-area-inset-top))+0.5rem)] z-40 md:hidden" style={below ? { transform: `translateY(${below}px)` } : undefined}>
        <div className={cn(pill, "flex items-center justify-between gap-1 pl-1.5 pr-1.5")}>
          <div className="min-w-0 flex-1">
            <Logo showName custom={logoCompact ?? logo} />
          </div>
          <LanguageSwitcher />
          {supabase && user && <NotificationBell supabase={supabase} />}
          <AdminMenu adminLinks={adminLinks} />
          <AccountButton accountPath={accountPath} signInPath={signInPath} />
          <button type="button" className={ICON_BTN} aria-label={tr("menu")} onClick={() => setMenu(true)}>
            <Menu />
          </button>
        </div>
      </header>
      <Sheet open={menu} onClose={() => setMenu(false)} title={tr("menu")}>
        <nav className="grid gap-1 pb-2">
          {nav.map((i) => (
            <Link key={i.to} to={i.to} className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base font-medium", isActive(pathname, i.to) ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "text-neutral-800 dark:text-neutral-100")}>
              {i.icon && <span className="text-[var(--brand)] [&_svg]:size-5">{i.icon}</span>}
              {i.label}
            </Link>
          ))}
          {primary && (
            <ButtonLink to={primary.to} size="lg" className="mt-3 w-full">
              {primary.label}
            </ButtonLink>
          )}
        </nav>
      </Sheet>
    </>
  );
}

function EditBar() {
  const tr = useT();
  const { editMode, setEditMode, lang } = useContent();
  const [style, setStyle] = useState(false);
  if (!editMode) return null;
  return (
    <div className="fixed inset-x-3 top-[calc(var(--safe-top,env(safe-area-inset-top))+4.25rem)] z-30 mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm text-white shadow-lg md:top-[5.25rem]">
      <span className="min-w-0 truncate">✎ {tr("editing")}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={() => setStyle(true)} className="rounded-full bg-white/20 px-3 py-1.5 font-medium">
          🎨 {lang === "fr" ? "Style" : lang === "nl" ? "Stijl" : "Style"}
        </button>
        <button type="button" onClick={() => setEditMode(false)} className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 font-medium">
          <X className="size-4" /> {tr("stopEdit")}
        </button>
      </div>
      <StylePanel open={style} onClose={() => setStyle(false)} />
    </div>
  );
}

// ------------------------------------------------------------------ footer

const SOCIAL_PATHS: Record<SocialLink["network"], string> = {
  facebook: "M14 8h3V4h-3c-2.8 0-4 1.8-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5Z",
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  linkedin: "M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h4v1.7c.6-1 1.9-2 3.8-2 3.4 0 4.2 2.2 4.2 5.2V21h-4v-6.2c0-1.5-.3-2.8-1.9-2.8s-2.1 1.2-2.1 2.8V21h-4z",
  youtube: "M22 8.2c-.2-1.6-1-2.7-2.6-2.9C16.8 5 12 5 12 5s-4.8 0-7.4.3C3 5.5 2.2 6.6 2 8.2 1.8 9.8 1.8 12 1.8 12s0 2.2.2 3.8c.2 1.6 1 2.7 2.6 2.9 2.6.3 7.4.3 7.4.3s4.8 0 7.4-.3c1.6-.2 2.4-1.3 2.6-2.9.2-1.6.2-3.8.2-3.8s0-2.2-.2-3.8ZM10 15V9l5 3Z",
  tiktok: "M16 3c.4 2.3 1.9 3.8 4 4v3.2c-1.5 0-2.9-.4-4-1.2V15a6 6 0 1 1-6-6v3.3a2.7 2.7 0 1 0 2.7 2.7V3Z",
  whatsapp: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.4-.9-2.8-1.2-4.6-4.1-4.7-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z",
  x: "M4 3h4.5l4 5.6L17.3 3H20l-6.2 7.4L21 21h-4.5l-4.4-6.1L7 21H4.3l6.6-7.8Z",
  pinterest: "M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.1-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.5-1.8-4.3-4.4-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4.1 0-3.3 2.4-6.4 7-6.4 3.7 0 6.5 2.6 6.5 6.1 0 3.6-2.3 6.6-5.5 6.6-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2Z",
};

function Social({ links }: { links: SocialLink[] }) {
  const tr = useT();
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label={tr("follow")}>
      {links.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noreferrer" aria-label={s.network} className="grid size-11 place-items-center rounded-full bg-black/5 text-neutral-700 transition hover:bg-[var(--brand)] hover:text-white dark:bg-white/10 dark:text-neutral-200">
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <path d={SOCIAL_PATHS[s.network]} />
          </svg>
        </a>
      ))}
    </div>
  );
}

function Footer({ columns, social, legalPages, newsletter, credit, extra }: { columns: FooterColumn[]; social: SocialLink[]; legalPages: LegalKind[]; newsletter: boolean; credit?: string; extra?: ReactNode }) {
  const tr = useT();
  const { supabase } = useContent();
  const contact = useContact();
  return (
    <footer className="mt-16 border-t border-black/5 bg-black/[0.02] pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-12 md:pb-10 dark:border-white/10 dark:bg-white/[0.02]">
      <Container className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
        <div className="space-y-4">
          <Logo />
          {brand.tagline && <p className="text-sm text-neutral-600 dark:text-neutral-400">{brand.tagline}</p>}
          <div className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {contact.address && <p>{contact.address}</p>}
            {contact.phone && (
              <p>
                <a href={contact.phoneHref} className="hover:text-[var(--brand)]">
                  {contact.phone}
                </a>
              </p>
            )}
            {contact.email && (
              <p>
                <a href={contact.emailHref} className="break-all hover:text-[var(--brand)]">
                  {contact.email}
                </a>
              </p>
            )}
          </div>
          <Social links={social} />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((c) => (
            <div key={c.title} className="space-y-3">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.title}</p>
              <ul className="space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-neutral-600 hover:text-[var(--brand)] dark:text-neutral-400">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {newsletter && supabase && (
            <div className="sm:col-span-2 lg:col-span-1">
              <NewsletterSignup supabase={supabase} />
            </div>
          )}
        </div>
      </Container>
      {extra && <Container className="mt-8">{extra}</Container>}
      <Container className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-black/5 pt-6 text-xs text-neutral-500 dark:border-white/10">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span>
            © {new Date().getFullYear()} {contact.name}
          </span>
          {legalPages.map((k) => (
            <Link key={k} to={LEGAL_PAGES[k].path} className="hover:text-[var(--brand)]">
              {LEGAL_PAGES[k].title}
            </Link>
          ))}
          <button type="button" className="hover:text-[var(--brand)]" onClick={() => window.dispatchEvent(new Event("usin:cookies"))}>
            {tr("cookies")}
          </button>
          {madeIn && <span>{madeIn}</span>}
        </div>
        {credit && <span>{credit}</span>}
      </Container>
    </footer>
  );
}

function CookieBanner({ privacyPath }: { privacyPath: string }) {
  const tr = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(getConsent() === null);
    const reopen = () => setShow(true);
    window.addEventListener("usin:cookies", reopen);
    return () => window.removeEventListener("usin:cookies", reopen);
  }, []);
  if (!show) return null;
  const choose = (measure: boolean) => {
    setConsent({ measure });
    setShow(false);
  };
  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto max-w-xl rounded-3xl border border-black/5 bg-[var(--brand-bg,#fff)] p-4 shadow-2xl md:bottom-6 dark:border-white/10 dark:bg-neutral-900">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        {tr("cookieText")}{" "}
        <Link to={privacyPath} className="underline">
          {tr("privacy")}
        </Link>
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => choose(false)}>
          {tr("refuse")}
        </Button>
        <Button size="sm" onClick={() => choose(true)}>
          {tr("accept")}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pages: loading, errors, 404

function PageSkeleton() {
  return (
    <Container className="space-y-6 py-10">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-6 w-full max-w-xl" />
      <div className="grid gap-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </Container>
  );
}

function ErrorView() {
  const tr = useT();
  return (
    <Container className="space-y-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{tr("errTitle")}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{tr("errText")}</p>
      <Button onClick={() => window.location.reload()}>{tr("reload")}</Button>
    </Container>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ErrorView /> : this.props.children;
  }
}

/** Page for an unknown address: <Route path="*" element={<NotFound />} />. */
export function NotFound() {
  const tr = useT();
  useSeo({ title: tr("notFound"), noindex: true });
  return (
    <Container className="space-y-4 py-20 text-center">
      <p className="text-6xl font-semibold text-[var(--brand)]">404</p>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{tr("notFound")}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{tr("notFoundText")}</p>
      <ButtonLink to="/">{tr("home")}</ButtonLink>
    </Container>
  );
}

// ------------------------------------------------------------------ the frame

/**
 * The whole frame of the site around the routes (inside <BrowserRouter><ContentProvider>):
 * <SiteShell nav={[{ to: "/soins", label: "Soins", icon: <Sparkles />, description: "…" }, …]} primary={{ to: "/rendez-vous", label: "Prendre rendez-vous" }}
 *   tabs={[…3 to 5 phone tabs…]} footerColumns={[…]} social={[…]} legalPages={["mentions", "confidentialite", "cgv", "cgu"]} newsletter credit="Créé avec Usin"
 *   preload={[() => import("./pages/Blog"), …]}>
 *   <Routes>…</Routes>
 * </SiteShell>
 * overlayHero: the home page's first section goes under the floating header (its background only: the shell keeps its content below the bars).
 */
export function SiteShell({
  nav,
  primary,
  tabs = [],
  maxInBar = 4,
  footerColumns = [],
  social = [],
  legalPages = ["mentions", "confidentialite"],
  newsletter = false,
  credit,
  footerExtra,
  adminLinks,
  accountPath = "/compte",
  signInPath = "/connexion",
  overlayHero = false,
  preload = [],
  logo,
  logoCompact,
  footer,
  banner,
  children,
}: {
  nav: NavItem[];
  primary?: NavItem;
  tabs?: TabItem[];
  maxInBar?: number;
  footerColumns?: FooterColumn[];
  social?: SocialLink[];
  legalPages?: LegalKind[];
  newsletter?: boolean;
  credit?: string;
  footerExtra?: ReactNode;
  adminLinks?: NavItem[];
  accountPath?: string;
  signInPath?: string;
  overlayHero?: boolean;
  preload?: (() => Promise<unknown>)[];
  /** The app's own logo (e.g. name in a script font) in the header; logoCompact for phones. */
  logo?: ReactNode;
  logoCompact?: ReactNode;
  /** The app's own footer, replacing the default one (keep the legal links and « Gérer les cookies »: window.dispatchEvent(new Event("usin:cookies"))). */
  footer?: ReactNode;
  /** A strip shown under the header (announcement…). */
  banner?: ReactNode;
  children: ReactNode;
}) {
  const tr = useT();
  const { pathname } = useLocation();
  const { supabase } = useContent();
  usePreloadPages(preload);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (!supabase) return;
    completeGoogleSignIn(supabase).catch((e: Error) => toast(e.message, "error"));
  }, [supabase]);
  const admin = adminLinks ?? [
    { to: "/gestion", label: tr("manage"), icon: <LayoutGrid /> },
    { to: "/admin", label: tr("settings"), icon: <Settings /> },
  ];
  const underHeader = overlayHero && pathname === "/";
  // The banner (announcement, demo notice) opens the page above the floating bars, never hidden under them.
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bannerH, setBannerH] = useState(0);
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return setBannerH(0);
    // Height of the banner itself (the safe-area padding above it is already in the bars' own top).
    const measure = () => setBannerH(el.offsetHeight - (parseFloat(getComputedStyle(el).paddingTop) || 0));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [banner]);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      {banner && (
        <div ref={bannerRef} className="relative z-30 pt-[var(--safe-top,env(safe-area-inset-top))] md:pt-0">
          {banner}
        </div>
      )}
      <Header offset={bannerH} nav={nav} primary={primary} maxInBar={maxInBar} adminLinks={admin} accountPath={accountPath} signInPath={signInPath} logo={logo} logoCompact={logoCompact} />
      <EditBar />
      <main
        className={cn(
          "flex-1",
          underHeader
            ? // The first section keeps its background under the bars, its content always starts below them.
              "[&>:first-child]:pt-[calc(var(--safe-top,env(safe-area-inset-top))+4.5rem)] md:[&>:first-child]:pt-24"
            : "pt-[calc(var(--safe-top,env(safe-area-inset-top))+4.5rem)] md:pt-24",
        )}
      >
        <Boundary key={pathname}>
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </Boundary>
      </main>
      {footer ?? <Footer columns={footerColumns} social={social} legalPages={legalPages} newsletter={newsletter} credit={credit} extra={footerExtra} />}
      <CookieBanner privacyPath={LEGAL_PAGES.confidentialite.path} />
      {tabs.length >= 3 && <TabBar items={tabs.slice(0, 5)} />}
      <UiRoot />
    </div>
  );
}

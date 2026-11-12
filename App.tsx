import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { registerMessages, useI18n } from "./lib/i18n";
import { messages } from "./lib/messages";
import { swMessages, mergeMessages } from "./lib/messagesSw";
import { completeGoogleSignIn } from "./lib/google";
import { LegalPage, LEGAL_PAGES } from "./lib/legal";
import { brand } from "./lib/brand";
import { useSeo } from "./lib/seo";
import { supabase, isConfigured } from "./lib/supabase";
import { AppProvider, useApp, usePageViews } from "./lib/data";
import { installSwGuard } from "./lib/swGuard";
import { Header, EditBar, TopBanners, MobileTabs, CookieBanner, Footer } from "./components/Layout";
import { HomeModern } from "./pages/Home";
import { ReviewForm } from "./lib/engage";
import { Button, Container, Skeleton } from "./components/ui";

registerMessages(mergeMessages(messages as any, swMessages) as any);
installSwGuard();

const chunks = {
  pub: () => import("./pages/Public"),
  book: () => import("./pages/Book"),
  account: () => import("./pages/Account"),
  admin: () => import("./pages/Admin"),
  gestion: () => import("./pages/Gestion"),
  sw: () => import("./pages/SwPage"),
};
const L = (f: () => Promise<any>, name: string) => lazy(() => f().then((m: any) => ({ default: m[name] })));
const AboutPage = L(chunks.pub, "AboutPage");
const SoinsPage = L(chunks.pub, "SoinsPage");
const FormationsPage = L(chunks.pub, "FormationsPage");
const AteliersPage = L(chunks.pub, "AteliersPage");
const OfferDetailPage = L(chunks.pub, "OfferDetailPage");
const AgendaPage = L(chunks.pub, "AgendaPage");
const BlogPage = L(chunks.pub, "BlogPage");
const PostPage = L(chunks.pub, "PostPage");
const TestimonialsPage = L(chunks.pub, "TestimonialsPage");
const EbooksPage = L(chunks.pub, "EbooksPage");
const EbookPage = L(chunks.pub, "EbookPage");
const ContactPage = L(chunks.pub, "ContactPage");
const BookPage = L(chunks.book, "BookPage");
const RegisterPage = L(chunks.book, "RegisterPage");
const ThanksPage = L(chunks.book, "ThanksPage");
const AccountPage = L(chunks.account, "AccountPage");
const ResetPasswordPage = L(chunks.account, "ResetPasswordPage");
const AdminPage = L(chunks.admin, "AdminPage");
const GestionPage = L(chunks.gestion, "GestionPage");
const SwPage = L(chunks.sw, "SwPage");

let preloaded = false;
function preloadAll() {
  if (preloaded) return;
  preloaded = true;
  Object.values(chunks).forEach((f) => { f().catch(() => { preloaded = false; }); });
}

const CSS = `
html,body{overflow-x:hidden;background:var(--brand-bg,#fffdf6);-webkit-tap-highlight-color:transparent}
.dark body,.dark{background:#0a0a0a}
.aquarelle{background:
 radial-gradient(60rem 40rem at 0% 0%, color-mix(in srgb, var(--brand) 9%, transparent), transparent 60%),
 radial-gradient(50rem 36rem at 100% 20%, color-mix(in srgb, var(--brand-accent) 35%, transparent), transparent 60%),
 radial-gradient(50rem 40rem at 30% 100%, rgba(253,240,180,.45), transparent 60%),
 radial-gradient(40rem 30rem at 85% 85%, rgba(160,220,215,.22), transparent 60%),
 var(--brand-bg,#fffdf6)}
.dark .aquarelle{background:#0a0a0a}
.font-script{font-family:'Great Vibes',cursive;font-weight:400;letter-spacing:0}
button,nav,a{-webkit-user-select:none;user-select:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes zoomIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-14px) scale(1.06)}}
@keyframes floatSoft{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,6px)}}
.anim-fade{animation:fadeUp .22s ease-out}.anim-zoom{animation:zoomIn .18s ease-out}
.blob{animation:drift 18s ease-in-out infinite}
.float-soft{animation:floatSoft 3s ease-in-out infinite}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .8s ease,transform .8s ease}
.reveal.in{opacity:1;transform:none}
details summary::-webkit-details-marker{display:none}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
`;

const ERR_TXT: Record<string, { title: string; text: string; reload: string }> = {
  fr: { title: "Cette page n'a pas pu s'afficher", text: "Un problème passager est survenu. Rechargez la page pour réessayer.", reload: "Recharger" },
  en: { title: "This page couldn't be displayed", text: "A temporary problem occurred. Reload the page to try again.", reload: "Reload" },
  nl: { title: "Deze pagina kon niet worden weergegeven", text: "Er trad een tijdelijk probleem op. Herlaad de pagina om opnieuw te proberen.", reload: "Herladen" },
};
function ErrorFallback() {
  const { lang } = useI18n() as any;
  const m = ERR_TXT[lang] || ERR_TXT.fr;
  return (
    <Container className="py-16 text-center space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{m.title}</h2>
      <p className="text-neutral-600 dark:text-neutral-400">{m.text}</p>
      <Button onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />{m.reload}</Button>
    </Container>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.err) return <ErrorFallback />;
    return this.props.children;
  }
}

function PageSkeleton() {
  return (
    <Container className="py-10 sm:py-14 space-y-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-6 w-full max-w-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>
    </Container>
  );
}

function ReviewsPage() {
  useSeo({ title: "Laisser une note et un avis à Anne Kételair, Estaimpuis", description: "Notez votre séance avec Anne Kételair : consultation énergétique, initiation Reiki, atelier ou méditation au cabinet d'Estaimpuis. Votre retour aide d'autres personnes." });
  return (
    <Container className="py-10 sm:py-14 max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <img src={brand.logo || (brand as any).icon} alt={brand.name} width={40} height={40} className="h-10 w-10 rounded-full shrink-0" />
        <h1 className="text-3xl font-bold tracking-tight text-[var(--brand)]">Votre avis</h1>
      </div>
      {isConfigured && <ReviewForm supabase={supabase} />}
    </Container>
  );
}
function Legal({ kind }: { kind: "mentions" | "confidentialite" | "cgv" | "cgu" }) {
  const { settings } = useApp();
  return <LegalPage kind={kind} custom={settings["legal_" + kind] || null} />;
}

function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const app = useApp();
  const [gErr, setGErr] = useState("");
  usePageViews();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { if (app.isAdmin && loc.pathname === "/compte") nav("/gestion", { replace: true }); }, [app.isAdmin, loc.pathname]);
  useEffect(() => {
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(preloadAll, { timeout: 1500 }) : setTimeout(preloadAll, 1000);
    const onIntent = (e: Event) => { if ((e.target as HTMLElement)?.closest?.("a")) preloadAll(); };
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(id); else clearTimeout(id);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, []);
  useEffect(() => {
    if (document.getElementById("gf-script")) return;
    const l = document.createElement("link");
    l.id = "gf-script"; l.rel = "stylesheet"; l.media = "print";
    l.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
    l.onload = () => { l.media = "all"; };
    document.head.appendChild(l);
  }, []);
  useEffect(() => { try { Promise.resolve(completeGoogleSignIn(supabase)).catch((e: any) => setGErr(e?.message || "Connexion Google impossible.")); } catch (e: any) { setGErr(e?.message || "Connexion Google impossible."); } }, []);
  return (
    <div className="aquarelle min-h-[100dvh] flex flex-col text-neutral-900 dark:text-neutral-100">
      <style>{CSS}</style>
      <Header />
      <EditBar />
      <TopBanners />
      {gErr && <div className="bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-sm text-center py-2 px-4 border-b border-[var(--brand)]/30">{gErr}</div>}
      <main key={loc.pathname} className="flex-1 anim-fade">
        <Boundary key={loc.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<HomeModern />} />
              <Route path="/soins-energetiques" element={<SwPage />} />
              <Route path="/sw" element={<Navigate to="/soins-energetiques" replace />} />
              <Route path="/qui-suis-je" element={<AboutPage />} />
              <Route path="/soins" element={<SoinsPage />} />
              <Route path="/soins/:slug" element={<OfferDetailPage />} />
              <Route path="/formations" element={<FormationsPage />} />
              <Route path="/formations/:slug" element={<OfferDetailPage />} />
              <Route path="/ateliers" element={<AteliersPage />} />
              <Route path="/ateliers/:slug" element={<OfferDetailPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<PostPage />} />
              <Route path="/temoignages" element={<TestimonialsPage />} />
              <Route path="/e-books" element={<EbooksPage />} />
              <Route path="/e-books/:slug" element={<EbookPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/rendez-vous" element={<BookPage />} />
              <Route path="/inscription/:id" element={<RegisterPage />} />
              <Route path="/paiement/merci" element={<ThanksPage />} />
              <Route path="/compte" element={<AccountPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/avis" element={<ReviewsPage />} />
              <Route path="/gestion" element={<GestionPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path={LEGAL_PAGES.mentions.path} element={<Legal kind="mentions" />} />
              <Route path={LEGAL_PAGES.confidentialite.path} element={<Legal kind="confidentialite" />} />
              <Route path={LEGAL_PAGES.cgv.path} element={<Legal kind="cgv" />} />
              <Route path={LEGAL_PAGES.cgu.path} element={<Legal kind="cgu" />} />
              <Route path="*" element={<HomeModern />} />
            </Routes>
          </Suspense>
        </Boundary>
      </main>
      <Footer />
      <CookieBanner />
      <MobileTabs />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Shell />
      </AppProvider>
    </BrowserRouter>
  );
}

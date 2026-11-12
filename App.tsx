import React, { lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home, Sparkles, CalendarDays, CalendarPlus, User, LayoutDashboard } from "lucide-react";
import { registerMessages, useI18n } from "./lib/i18n";
import { messages } from "./lib/messages";
import { LegalPage, LEGAL_PAGES } from "./lib/legal";
import { brand } from "./lib/brand";
import { useSeo } from "./lib/seo";
import { supabase, isConfigured } from "./lib/supabase";
import { ContentProvider } from "./lib/content";
import { SiteShell, NotFound } from "./lib/shell";
import { AuthPage, ResetPasswordPage, RequireAuth } from "./lib/auth";
import { ReviewForm } from "./lib/engage";
import { useApp, applyBrandColor } from "./lib/data";
import { DEFAULT_SETTINGS } from "./lib/defaults";
import { Footer, Logo, TopBanners, MAIN, EXTRA, manageLabel } from "./components/Layout";
import { HomeModern } from "./pages/Home";
import { Container } from "./components/ui";

registerMessages(messages as any);

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
const AdminPage = L(chunks.admin, "AdminPage");
const GestionPage = L(chunks.gestion, "GestionPage");
const SwPage = L(chunks.sw, "SwPage");

// Styles propres à l'ambiance de l'app (aquarelle, police script). Le défilement et les apparitions sont gérés par Usin.
const CSS = `
body{overflow-x:clip;background:var(--brand-bg,#fffdf6);-webkit-tap-highlight-color:transparent}
.dark body{background:#0a0a0a}
.aquarelle{background:
 radial-gradient(60rem 40rem at 0% 0%, color-mix(in srgb, var(--brand) 9%, transparent), transparent 60%),
 radial-gradient(50rem 36rem at 100% 20%, color-mix(in srgb, var(--brand-accent) 35%, transparent), transparent 60%),
 radial-gradient(50rem 40rem at 30% 100%, rgba(253,240,180,.45), transparent 60%),
 radial-gradient(40rem 30rem at 85% 85%, rgba(160,220,215,.22), transparent 60%),
 var(--brand-bg,#fffdf6)}
.dark .aquarelle{background:#0a0a0a}
.font-script{font-family:'Great Vibes',cursive;font-weight:400;letter-spacing:0}
button,nav,a{-webkit-user-select:none;user-select:none}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-14px) scale(1.06)}}
@keyframes floatSoft{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,6px)}}
.blob{animation:drift 18s ease-in-out infinite}
.float-soft{animation:floatSoft 3s ease-in-out infinite}
details summary::-webkit-details-marker{display:none}
@media (prefers-reduced-motion:reduce){.blob,.float-soft{animation:none}}
`;

function ReviewsPage() {
  useSeo({ title: "Votre avis sur les séances d'Anne Kételair à Estaimpuis", description: "Partagez votre expérience après une consultation énergétique, une initiation Reiki, un atelier ou une méditation au cabinet de Bailleul (Estaimpuis) : votre note aide d'autres personnes." });
  return (
    <Container className="py-10 sm:py-14 max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <img src={brand.logo} alt={brand.name} width={40} height={40} className="h-10 w-10 rounded-full shrink-0" />
        <h1 className="text-3xl font-bold tracking-tight text-[var(--brand)]">Votre avis</h1>
      </div>
      {isConfigured && <ReviewForm supabase={supabase} />}
    </Container>
  );
}
function Legal({ kind }: { kind: "mentions" | "confidentialite" | "cgv" | "cgu" }) {
  const { settings } = useApp();
  return <LegalPage kind={kind} custom={(settings["legal_" + kind] as string) || null} />;
}

function Site() {
  const { t, lang } = useI18n() as any;
  const app = useApp();
  useEffect(() => applyBrandColor(app.settings.brand_color), [app.settings.brand_color]);
  useEffect(() => {
    if (document.getElementById("gf-script")) return;
    const l = document.createElement("link");
    l.id = "gf-script";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
    document.head.appendChild(l);
  }, []);
  const nav = [
    ...MAIN.map(([to, k]) => ({ to, label: t(k) })),
    ...EXTRA.filter(([to]) => !MAIN.some(([m]) => m === to)).map(([to, k, d, Icon]) => ({ to, label: t(k), description: t(d), icon: <Icon /> })),
  ];
  const tabs = [
    { to: "/", label: t("nav.home"), icon: <Home />, end: true },
    { to: "/soins", label: t("nav.offers"), icon: <Sparkles /> },
    { to: "/agenda", label: t("nav.agenda"), icon: <CalendarDays /> },
    { to: "/rendez-vous", label: t("nav.bookShort"), icon: <CalendarPlus /> },
    app.isAdmin ? { to: "/gestion", label: manageLabel(lang), icon: <LayoutDashboard /> } : { to: "/compte", label: app.user ? t("nav.account") : t("nav.login"), icon: <User /> },
  ];
  return (
    <div className="aquarelle text-neutral-900 dark:text-neutral-100">
      <style>{CSS}</style>
      <SiteShell
        nav={nav}
        maxInBar={6}
        primary={{ to: "/rendez-vous", label: t("nav.book") }}
        tabs={tabs}
        logo={<Logo />}
        logoCompact={<Logo compact />}
        footer={<Footer />}
        banner={<TopBanners />}
        overlayHero
        preload={Object.values(chunks)}
      >
        <Routes>
          <Route path="/" element={<HomeModern />} />
          <Route path="/soins-energetiques" element={<SwPage />} />
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
          <Route path="/connexion" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/compte" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="/avis" element={<ReviewsPage />} />
          <Route path="/gestion" element={<RequireAuth admin><GestionPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
          <Route path={LEGAL_PAGES.mentions.path} element={<Legal kind="mentions" />} />
          <Route path={LEGAL_PAGES.confidentialite.path} element={<Legal kind="confidentialite" />} />
          <Route path={LEGAL_PAGES.cgv.path} element={<Legal kind="cgv" />} />
          <Route path={LEGAL_PAGES.cgu.path} element={<Legal kind="cgu" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SiteShell>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ContentProvider supabase={isConfigured ? supabase : null} defaults={DEFAULT_SETTINGS}>
        <Site />
      </ContentProvider>
    </BrowserRouter>
  );
}

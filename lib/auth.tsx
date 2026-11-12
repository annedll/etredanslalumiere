// Injected by Usin (accounts: sign-in, sign-up, Google, forgotten password, protected pages, privacy). Do not edit.
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useContent } from "./content";
import { Button, Card, Container, Field, Input, Skeleton, Tabs, confirmAction, toast } from "./ui";
import { googleAvailable, signInWithGoogle } from "./google";
import { notify } from "./notify";
import { LEGAL_PAGES } from "./legal";
import { useSeo } from "./seo";
import { brand } from "./brand";

const T: Record<string, Record<string, string>> = {
  fr: {
    signin: "Connexion", signup: "Créer un compte", email: "Email", password: "Mot de passe", show: "Afficher", hide: "Masquer",
    go: "Se connecter", create: "Créer mon compte", forgot: "Mot de passe oublié ?", google: "Continuer avec Google", or: "ou",
    terms: "J'accepte les conditions d'utilisation et la politique de confidentialité.", termsNeeded: "Acceptez les conditions pour créer votre compte.",
    checkMail: "Compte créé ✓ Ouvrez l'email de confirmation pour l'activer, puis connectez-vous.", welcome: "Bienvenue 👋",
    bad: "Email ou mot de passe incorrect.", exists: "Un compte existe déjà avec cet email : connectez-vous.", unconfirmed: "Confirmez d'abord votre email (lien reçu par email).",
    short: "8 caractères minimum.", error: "Une erreur est survenue, réessayez.", resetTitle: "Nouveau mot de passe", resetAsk: "Recevoir un lien par email",
    resetSent: "Si un compte existe, un lien vient d'être envoyé par email.", newPwd: "Nouveau mot de passe", savePwd: "Enregistrer le mot de passe", pwdSaved: "Mot de passe modifié ✓",
    account: "Mon compte", privacy: "Mes données", export: "Télécharger mes données", del: "Supprimer mon compte", delAsk: "Supprimer définitivement votre compte et vos données ?",
    deleted: "Compte supprimé.", nodb: "La connexion sera disponible dès que la base de données de l'app sera créée.", signout: "Se déconnecter", changePwd: "Changer de mot de passe", back: "Retour à la connexion",
  },
  en: {
    signin: "Sign in", signup: "Create an account", email: "Email", password: "Password", show: "Show", hide: "Hide",
    go: "Sign in", create: "Create my account", forgot: "Forgot your password?", google: "Continue with Google", or: "or",
    terms: "I accept the terms of use and the privacy policy.", termsNeeded: "Accept the terms to create your account.",
    checkMail: "Account created ✓ Open the confirmation email to activate it, then sign in.", welcome: "Welcome 👋",
    bad: "Wrong email or password.", exists: "An account already exists with this email: sign in.", unconfirmed: "Please confirm your email first (link sent by email).",
    short: "At least 8 characters.", error: "Something went wrong, please try again.", resetTitle: "New password", resetAsk: "Get a link by email",
    resetSent: "If an account exists, a link has just been sent by email.", newPwd: "New password", savePwd: "Save password", pwdSaved: "Password changed ✓",
    account: "My account", privacy: "My data", export: "Download my data", del: "Delete my account", delAsk: "Permanently delete your account and data?",
    deleted: "Account deleted.", nodb: "Sign-in will be available once the app's database is created.", signout: "Sign out", changePwd: "Change password", back: "Back to sign in",
  },
  nl: {
    signin: "Inloggen", signup: "Account aanmaken", email: "E-mail", password: "Wachtwoord", show: "Tonen", hide: "Verbergen",
    go: "Inloggen", create: "Mijn account aanmaken", forgot: "Wachtwoord vergeten?", google: "Doorgaan met Google", or: "of",
    terms: "Ik aanvaard de gebruiksvoorwaarden en het privacybeleid.", termsNeeded: "Aanvaard de voorwaarden om je account aan te maken.",
    checkMail: "Account aangemaakt ✓ Open de bevestigingsmail om het te activeren en log daarna in.", welcome: "Welkom 👋",
    bad: "Verkeerd e-mailadres of wachtwoord.", exists: "Er bestaat al een account met dit e-mailadres: log in.", unconfirmed: "Bevestig eerst je e-mailadres (link per e-mail).",
    short: "Minstens 8 tekens.", error: "Er ging iets mis, probeer opnieuw.", resetTitle: "Nieuw wachtwoord", resetAsk: "Link per e-mail ontvangen",
    resetSent: "Als er een account bestaat, is er zonet een link verstuurd.", newPwd: "Nieuw wachtwoord", savePwd: "Wachtwoord opslaan", pwdSaved: "Wachtwoord gewijzigd ✓",
    account: "Mijn account", privacy: "Mijn gegevens", export: "Mijn gegevens downloaden", del: "Mijn account verwijderen", delAsk: "Je account en gegevens definitief verwijderen?",
    deleted: "Account verwijderd.", nodb: "Inloggen is beschikbaar zodra de database van de app is aangemaakt.", signout: "Uitloggen", changePwd: "Wachtwoord wijzigen", back: "Terug naar inloggen",
  },
};
function useT() {
  const { lang } = useContent();
  return (k: string) => (T[lang] ?? T.en)[k] ?? T.fr[k] ?? k;
}

function friendly(message: string, tr: (k: string) => string) {
  if (/invalid login|invalid credentials/i.test(message)) return tr("bad");
  if (/already registered|already exists/i.test(message)) return tr("exists");
  if (/not confirmed/i.test(message)) return tr("unconfirmed");
  if (/at least|password should/i.test(message)) return tr("short");
  return message || tr("error");
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const tr = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={8} className="pr-24" />
      <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-2 my-auto h-9 rounded-full px-3 text-sm text-[var(--brand)]">
        {show ? tr("hide") : tr("show")}
      </button>
    </div>
  );
}

/** Where to go after signing in: ?next=…, else the admin's management space or the customer's account. */
async function destination(supabase: NonNullable<ReturnType<typeof useContent>["supabase"]>, next: string | null, home: { admin: string; user: string }) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  const { data } = await supabase.rpc("is_admin").then((r) => r, () => ({ data: false }));
  return data ? home.admin : home.user;
}

/**
 * Sign-in / sign-up form (email + password, Google when switched on, forgotten password, terms to accept).
 * home: where each kind of user lands after signing in.
 */
export function AuthForm({ initial = "signin", home = { admin: "/gestion", user: "/compte" } }: { initial?: "signin" | "signup"; home?: { admin: string; user: string } }) {
  const tr = useT();
  const { supabase } = useContent();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    void googleAvailable().then(setGoogle);
  }, []);

  if (!supabase) return <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">{tr("nodb")}</p>;

  const submit = async () => {
    setError(null);
    setInfo(null);
    const mail = email.trim().toLowerCase();
    setBusy(true);
    try {
      if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin + "/reset-password" });
        setInfo(tr("resetSent"));
        return;
      }
      if (password.length < 8) throw new Error(tr("short"));
      if (mode === "signup") {
        if (!terms) throw new Error(tr("termsNeeded"));
        const { data, error: err } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: window.location.origin + "/compte" } });
        if (err) throw err;
        // An email already used: Supabase answers with an empty identity list (no email is sent).
        if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error("already registered");
        void notify("signup.new", { email: mail }, supabase);
        if (!data.session) {
          setInfo(tr("checkMail"));
          setMode("signin");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (err) throw err;
      }
      toast(tr("welcome"));
      navigate(await destination(supabase, next, home), { replace: true });
    } catch (e) {
      setError(friendly((e as Error).message, tr));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {mode !== "forgot" && (
        <Tabs
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError(null);
            setInfo(null);
          }}
          items={[
            { value: "signin", label: tr("signin") },
            { value: "signup", label: tr("signup") },
          ]}
          className="w-full [&>button]:flex-1"
        />
      )}
      {google && mode !== "forgot" && (
        <>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signInWithGoogle(next ?? home.user).catch((e: Error) => setError(e.message))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1S8.7 5.9 12 5.9c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            {tr("google")}
          </Button>
          <p className="text-center text-xs uppercase tracking-wide text-neutral-500">{tr("or")}</p>
        </>
      )}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label={tr("email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        {mode !== "forgot" && (
          <Field label={tr("password")} hint={mode === "signup" ? tr("short") : undefined}>
            <PasswordInput value={password} onChange={setPassword} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </Field>
        )}
        {mode === "signup" && (
          <label className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 size-5 accent-[var(--brand)]" />
            <span>
              {tr("terms")}{" "}
              <a href={LEGAL_PAGES.cgu.path} target="_blank" rel="noreferrer" className="underline">
                {LEGAL_PAGES.cgu.title}
              </a>
              {" · "}
              <a href={LEGAL_PAGES.confidentialite.path} target="_blank" rel="noreferrer" className="underline">
                {LEGAL_PAGES.confidentialite.title}
              </a>
            </span>
          </label>
        )}
        {error && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {info && <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">{info}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {mode === "signup" ? tr("create") : mode === "forgot" ? tr("resetAsk") : tr("go")}
        </Button>
      </form>
      <div className="text-center">
        {mode === "forgot" ? (
          <button type="button" className="min-h-11 text-sm text-[var(--brand)]" onClick={() => setMode("signin")}>
            {tr("back")}
          </button>
        ) : (
          mode === "signin" && (
            <button type="button" className="min-h-11 text-sm text-[var(--brand)]" onClick={() => setMode("forgot")}>
              {tr("forgot")}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/** Ready-made sign-in page (route /connexion): <Route path="/connexion" element={<AuthPage />} />. */
export function AuthPage({ title, home }: { title?: string; home?: { admin: string; user: string } }) {
  const tr = useT();
  const { user } = useContent();
  useSeo({ title: tr("signin"), noindex: true });
  if (user) return <Navigate to={home?.user ?? "/compte"} replace />;
  return (
    <Container className="max-w-md py-10 sm:py-16">
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2 text-center">
          {brand.logo && <img src={brand.logo} alt="" width={56} height={56} className="mx-auto size-14 rounded-2xl" />}
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title ?? brand.name}</h1>
        </div>
        <AuthForm home={home} />
      </Card>
    </Container>
  );
}

/** Page opened from the "forgotten password" email (route /reset-password). */
export function ResetPasswordPage() {
  const tr = useT();
  const { supabase, session } = useContent();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useSeo({ title: tr("resetTitle"), noindex: true });
  return (
    <Container className="max-w-md py-10 sm:py-16">
      <Card className="space-y-5 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{tr("resetTitle")}</h1>
        {!session ? (
          <AuthForm initial="signin" />
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) return;
              if (password.length < 8) return setError(tr("short"));
              setBusy(true);
              const { error: err } = await supabase.auth.updateUser({ password });
              setBusy(false);
              if (err) return setError(friendly(err.message, tr));
              toast(tr("pwdSaved"));
              navigate("/compte", { replace: true });
            }}
          >
            <Field label={tr("newPwd")} hint={tr("short")} error={error}>
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {tr("savePwd")}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
}

/**
 * Protects a page: visitors are sent to the sign-in page (and come back after). admin: reserved to the administrators.
 * <Route path="/compte" element={<RequireAuth><Account /></RequireAuth>} />
 */
export function RequireAuth({ children, admin, signInPath = "/connexion" }: { children: ReactNode; admin?: boolean; signInPath?: string }) {
  const { ready, session, user, realAdmin, supabase } = useContent();
  const location = useLocation();
  const [checked, setChecked] = useState(!admin);
  useEffect(() => {
    if (!admin || !supabase || !session) return;
    const timer = setTimeout(() => setChecked(true), 1500);
    if (realAdmin) setChecked(true);
    return () => clearTimeout(timer);
  }, [admin, supabase, session, realAdmin]);
  if (supabase && (!ready || (session && !checked))) {
    return (
      <Container className="space-y-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
      </Container>
    );
  }
  if (!user) return <Navigate to={signInPath + "?next=" + encodeURIComponent(location.pathname + location.search)} replace />;
  if (admin && !realAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export async function signOut(supabase: ReturnType<typeof useContent>["supabase"]) {
  await supabase?.auth.signOut();
}

/**
 * "Mon compte" essentials: email, change password, download my data, delete my account, sign out (RGPD).
 * The SQL provides public.export_my_data() returns jsonb and public.delete_my_account() (security definer).
 */
export function AccountPrivacy() {
  const tr = useT();
  const { supabase, user } = useContent();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  if (!supabase || !user) return null;
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{user.email}</p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password.length < 8) return toast(tr("short"), "error");
            setBusy("pwd");
            const { error } = await supabase.auth.updateUser({ password });
            setBusy(null);
            if (error) return toast(friendly(error.message, tr), "error");
            setPassword("");
            toast(tr("pwdSaved"));
          }}
        >
          <Field label={tr("changePwd")} className="flex-1">
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <Button type="submit" variant="secondary" loading={busy === "pwd"}>
            {tr("savePwd")}
          </Button>
        </form>
      </Card>
      <Card className="space-y-3 p-5">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">{tr("privacy")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={busy === "export"}
            onClick={async () => {
              setBusy("export");
              const { data, error } = await supabase.rpc("export_my_data");
              setBusy(null);
              const payload = error ? { email: user.email, created_at: user.created_at } : data;
              const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "mes-donnees.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {tr("export")}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut(supabase);
              navigate("/", { replace: true });
            }}
          >
            {tr("signout")}
          </Button>
          <Button
            variant="danger"
            loading={busy === "delete"}
            onClick={async () => {
              if (!(await confirmAction(tr("delAsk")))) return;
              setBusy("delete");
              const { error } = await supabase.rpc("delete_my_account");
              setBusy(null);
              if (error) return toast(friendly(error.message, tr), "error");
              await signOut(supabase);
              toast(tr("deleted"));
              navigate("/", { replace: true });
            }}
          >
            {tr("del")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

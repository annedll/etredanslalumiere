// Injected by Usin (accounts: sign-in, sign-up, Google, forgotten password, protected pages, privacy). Do not edit.
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useContent } from "./content";
import { Button, Card, Container, Field, Input, Skeleton, Tabs, cn, confirmAction, toast } from "./ui";
import { Sheet } from "./mobile";
import { notifyReady } from "./notify";
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
    resetSent: "Si un compte existe, un lien vient d'être envoyé par email.", magic: "Recevoir un lien de connexion par email", magicGo: "Envoyer le lien", magicSent: "Lien envoyé ✓ Ouvrez l'email reçu pour vous connecter (pensez aux indésirables).", newPwd: "Nouveau mot de passe", savePwd: "Enregistrer le mot de passe", pwdSaved: "Mot de passe modifié ✓",
    account: "Mon compte", privacy: "Mes données", export: "Télécharger mes données", del: "Supprimer mon compte", delAsk: "Supprimer définitivement votre compte et vos données ?",
    deleted: "Compte supprimé.", nodb: "La connexion sera disponible dès que la base de données de l'app sera créée.", signout: "Se déconnecter", changePwd: "Changer de mot de passe", back: "Retour à la connexion",
    profile: "Mon profil", photo: "Changer la photo", googlePhoto: "Photo de mon compte Google", noPhoto: "Retirer la photo", first: "Prénom", last: "Nom", phone: "Téléphone",
    save: "Enregistrer", saved: "Enregistré ✓", newEmail: "Nouvelle adresse email", changeEmail: "Changer d'email", emailSent: "Ouvrez l'email de confirmation envoyé à la nouvelle adresse.",
    signedAs: "Connecté(e) en tant que", mySpace: "Mon espace", photoErr: "Cette image ne peut pas être utilisée.",
  },
  en: {
    signin: "Sign in", signup: "Create an account", email: "Email", password: "Password", show: "Show", hide: "Hide",
    go: "Sign in", create: "Create my account", forgot: "Forgot your password?", google: "Continue with Google", or: "or",
    terms: "I accept the terms of use and the privacy policy.", termsNeeded: "Accept the terms to create your account.",
    checkMail: "Account created ✓ Open the confirmation email to activate it, then sign in.", welcome: "Welcome 👋",
    bad: "Wrong email or password.", exists: "An account already exists with this email: sign in.", unconfirmed: "Please confirm your email first (link sent by email).",
    short: "At least 8 characters.", error: "Something went wrong, please try again.", resetTitle: "New password", resetAsk: "Get a link by email",
    resetSent: "If an account exists, a link has just been sent by email.", magic: "Get a sign-in link by email", magicGo: "Send the link", magicSent: "Link sent ✓ Open the email to sign in (check your spam folder).", newPwd: "New password", savePwd: "Save password", pwdSaved: "Password changed ✓",
    account: "My account", privacy: "My data", export: "Download my data", del: "Delete my account", delAsk: "Permanently delete your account and data?",
    deleted: "Account deleted.", nodb: "Sign-in will be available once the app's database is created.", signout: "Sign out", changePwd: "Change password", back: "Back to sign in",
    profile: "My profile", photo: "Change photo", googlePhoto: "My Google account photo", noPhoto: "Remove photo", first: "First name", last: "Last name", phone: "Phone",
    save: "Save", saved: "Saved ✓", newEmail: "New email address", changeEmail: "Change email", emailSent: "Open the confirmation email sent to the new address.",
    signedAs: "Signed in as", mySpace: "My space", photoErr: "This image can't be used.",
  },
  nl: {
    signin: "Inloggen", signup: "Account aanmaken", email: "E-mail", password: "Wachtwoord", show: "Tonen", hide: "Verbergen",
    go: "Inloggen", create: "Mijn account aanmaken", forgot: "Wachtwoord vergeten?", google: "Doorgaan met Google", or: "of",
    terms: "Ik aanvaard de gebruiksvoorwaarden en het privacybeleid.", termsNeeded: "Aanvaard de voorwaarden om je account aan te maken.",
    checkMail: "Account aangemaakt ✓ Open de bevestigingsmail om het te activeren en log daarna in.", welcome: "Welkom 👋",
    bad: "Verkeerd e-mailadres of wachtwoord.", exists: "Er bestaat al een account met dit e-mailadres: log in.", unconfirmed: "Bevestig eerst je e-mailadres (link per e-mail).",
    short: "Minstens 8 tekens.", error: "Er ging iets mis, probeer opnieuw.", resetTitle: "Nieuw wachtwoord", resetAsk: "Link per e-mail ontvangen",
    resetSent: "Als er een account bestaat, is er zonet een link verstuurd.", magic: "Inloglink per e-mail ontvangen", magicGo: "Link versturen", magicSent: "Link verstuurd ✓ Open de e-mail om in te loggen (kijk ook bij spam).", newPwd: "Nieuw wachtwoord", savePwd: "Wachtwoord opslaan", pwdSaved: "Wachtwoord gewijzigd ✓",
    account: "Mijn account", privacy: "Mijn gegevens", export: "Mijn gegevens downloaden", del: "Mijn account verwijderen", delAsk: "Je account en gegevens definitief verwijderen?",
    deleted: "Account verwijderd.", nodb: "Inloggen is beschikbaar zodra de database van de app is aangemaakt.", signout: "Uitloggen", changePwd: "Wachtwoord wijzigen", back: "Terug naar inloggen",
    profile: "Mijn profiel", photo: "Foto wijzigen", googlePhoto: "Foto van mijn Google-account", noPhoto: "Foto verwijderen", first: "Voornaam", last: "Achternaam", phone: "Telefoon",
    save: "Opslaan", saved: "Opgeslagen ✓", newEmail: "Nieuw e-mailadres", changeEmail: "E-mailadres wijzigen", emailSent: "Open de bevestigingsmail die naar het nieuwe adres is verstuurd.",
    signedAs: "Ingelogd als", mySpace: "Mijn ruimte", photoErr: "Deze afbeelding kan niet gebruikt worden.",
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
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  // A page asked for (booking, checkout…) wins; the customer's account (the « account » icon) is not for the admin.
  if (safe && safe.split("?")[0] !== home.user) return safe;
  const { data } = await supabase.rpc("is_admin").then((r) => r, () => ({ data: false }));
  return data ? home.admin : safe ?? home.user;
}

/** Signed in: the admin goes to their management space, a customer to their account (?next=… wins). */
function SignedInRedirect({ home }: { home: { admin: string; user: string } }) {
  const { supabase } = useContent();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next");
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    destination(supabase, next, home).then((to) => alive && navigate(to, { replace: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);
  return <div className="mx-auto my-24 size-8 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" aria-label="…" />;
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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "magic">(initial);
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
      if (mode === "magic") {
        const { error: err } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + (next ?? window.location.pathname) } });
        if (err && !/signups not allowed|not found/i.test(err.message)) throw err;
        setInfo(tr("magicSent"));
        return;
      }
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
      {(mode === "signin" || mode === "signup") && (
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
      {google && (mode === "signin" || mode === "signup") && (
        <>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signInWithGoogle(next ?? window.location.pathname).catch((e: Error) => setError(e.message))}
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
        {(mode === "signin" || mode === "signup") && (
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
          {mode === "signup" ? tr("create") : mode === "forgot" ? tr("resetAsk") : mode === "magic" ? tr("magicGo") : tr("go")}
        </Button>
      </form>
      <div className="text-center">
        {mode === "forgot" || mode === "magic" ? (
          <button type="button" className="min-h-11 text-sm text-[var(--brand)]" onClick={() => setMode("signin")}>
            {tr("back")}
          </button>
        ) : (
          mode === "signin" && (
            <div className="flex flex-col items-center">
              <button type="button" className="min-h-11 text-sm text-[var(--brand)]" onClick={() => setMode("magic")}>
                {tr("magic")}
              </button>
              <button type="button" className="min-h-11 text-sm text-neutral-600 dark:text-neutral-400" onClick={() => setMode("forgot")}>
                {tr("forgot")}
              </button>
            </div>
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
  if (user) return <SignedInRedirect home={home ?? { admin: "/gestion", user: "/compte" }} />;
  return (
    <Container className="max-w-md py-10 sm:py-16">
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2 text-center">
          {brand.logo && <img src={brand.logo} alt="" width={56} height={56} className="mx-auto size-14 rounded-2xl" style={logoShape() ? { borderRadius: logoCorner() } : undefined} />}
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
              if (supabase) navigate(await destination(supabase, null, { admin: "/gestion", user: "/compte" }), { replace: true });
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

// ------------------------------------------------------------------ profile (photo, name, contact, password)

/** Shape of the logo chosen in the brand kit (null: none chosen). */
export const logoShape = () => (brand as unknown as { shape?: string | null }).shape ?? null;
/** Corner of the logo (round when none was chosen, as before): header logo, profile photos. */
export const logoCorner = () => ({ square: "0", rounded: "22%", circle: "50%" })[logoShape() ?? "circle"] ?? "50%";

type Meta = { first_name?: string; last_name?: string; full_name?: string; name?: string; phone?: string; avatar_url?: string; picture?: string };
const photos = new Map<string, string | null>();
const PHOTO_EVENT = "usin:avatar";

/** The signed-in person: name, initials, photo (the one chosen in « Mon profil », else the Google one). */
export function useProfile() {
  const { user, supabase } = useContent();
  const meta = (user?.user_metadata ?? {}) as Meta;
  const [photo, setPhoto] = useState<string | null | undefined>(user ? photos.get(user.id) : null);
  useEffect(() => {
    if (!user || !supabase) return setPhoto(null);
    const on = () => setPhoto(photos.get(user.id));
    window.addEventListener(PHOTO_EVENT, on);
    if (!photos.has(user.id))
      void notifyReady()
        .then(() => supabase.from("usin_profiles").select("avatar").eq("user_id", user.id).maybeSingle())
        .then(({ data }) => {
          photos.set(user.id, (data as { avatar?: string | null } | null)?.avatar ?? null);
          window.dispatchEvent(new Event(PHOTO_EVENT));
        }, () => undefined);
    else on();
    return () => window.removeEventListener(PHOTO_EVENT, on);
  }, [user?.id, supabase]);
  const first = meta.first_name?.trim() || (meta.full_name || meta.name || "").trim().split(" ")[0] || "";
  const last = meta.last_name?.trim() || (meta.full_name || meta.name || "").trim().split(" ").slice(1).join(" ");
  const name = [first, last].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "";
  const initials = ((first[0] ?? "") + (last[0] ?? "") || (user?.email?.[0] ?? "?")).toUpperCase();
  return { user, first, last, name, initials, phone: meta.phone ?? "", email: user?.email ?? "", photo: photo || meta.avatar_url || meta.picture || null, googlePhoto: meta.avatar_url || meta.picture || null, ownPhoto: Boolean(photo) };
}

/** Photo of the signed-in person, in the shape of the app's logo (initials in the brand colour when there is none). */
export function Avatar({ size = 32, className }: { size?: number; className?: string }) {
  const { photo, initials, name } = useProfile();
  // Same shape as the app's logo (brand kit), and like the logo: initials on the brand colour.
  const borderRadius = logoCorner();
  return photo ? (
    <img src={photo} alt={name} width={size} height={size} referrerPolicy="no-referrer" className={cn("shrink-0 object-cover", className)} style={{ width: size, height: size, borderRadius }} />
  ) : (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center bg-[var(--brand)] font-semibold text-white", className)} style={{ width: size, height: size, fontSize: size * 0.4, borderRadius }}>
      {initials}
    </span>
  );
}

/** A picture made small and square (photo of the profile), as a light image kept with the profile. */
function squarePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 192;
      canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 192, 192);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/webp", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * « Mon profil », opened from the photo in the header: photo (from the device, the camera on phones, or the
 * Google account), name, phone, email, password, sign out. Same look as the rest of the app.
 */
export function ProfileSheet({ open, onClose, accountPath }: { open: boolean; onClose: () => void; accountPath?: string }) {
  const tr = useT();
  const { supabase, realAdmin } = useContent();
  const navigate = useNavigate();
  const me = useProfile();
  const [first, setFirst] = useState(me.first);
  const [last, setLast] = useState(me.last);
  const [phone, setPhone] = useState(me.phone);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setFirst(me.first);
    setLast(me.last);
    setPhone(me.phone);
    setEmail("");
    setPassword("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!me.user || !supabase) return null;
  const savePhoto = async (avatar: string | null) => {
    setBusy(true);
    try {
      await notifyReady();
      const { error } = await supabase.from("usin_profiles").upsert({ user_id: me.user!.id, avatar, updated_at: new Date().toISOString() });
      if (error) throw error;
      photos.set(me.user!.id, avatar);
      window.dispatchEvent(new Event(PHOTO_EVENT));
      toast(tr("saved"));
    } catch {
      toast(tr("photoErr"), "error");
    } finally {
      setBusy(false);
    }
  };
  const run = async (work: () => Promise<{ error: { message: string } | null }>, done: string) => {
    setBusy(true);
    try {
      const { error } = await work();
      if (error) throw new Error(friendly(error.message, tr));
      toast(done);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const section = "space-y-3 border-t border-black/5 pt-4 dark:border-white/10";
  return (
    <Sheet open={open} onClose={onClose} title={tr("profile")}>
      <div className="space-y-5 pb-2">
        <div className="flex items-center gap-4">
          <Avatar size={72} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-100">{me.name}</p>
            <p className="truncate text-sm text-neutral-500">{me.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={cn("inline-flex min-h-10 cursor-pointer items-center rounded-full bg-[var(--brand)]/10 px-4 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand)]/15", busy && "pointer-events-none opacity-60")}>
            {tr("photo")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) await squarePhoto(file).then(savePhoto, () => toast(tr("photoErr"), "error"));
              }}
            />
          </label>
          {me.googlePhoto && me.ownPhoto && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void savePhoto(null)}>
              {tr("googlePhoto")}
            </Button>
          )}
          {me.ownPhoto && !me.googlePhoto && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void savePhoto(null)}>
              {tr("noPhoto")}
            </Button>
          )}
        </div>
        <div className={section}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr("first")}>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
            </Field>
            <Field label={tr("last")}>
              <Input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
            </Field>
          </div>
          <Field label={tr("phone")}>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </Field>
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const data = { first_name: first.trim(), last_name: last.trim(), full_name: [first.trim(), last.trim()].filter(Boolean).join(" "), phone: phone.trim() };
                const r = await supabase.auth.updateUser({ data });
                // The app's own profile table, when it has one, follows.
                if (!r.error) await Promise.resolve(supabase.from("profiles").update({ first_name: data.first_name, last_name: data.last_name, phone: data.phone }).eq("id", me.user!.id)).catch(() => undefined);
                return r;
              }, tr("saved"))
            }
          >
            {tr("save")}
          </Button>
        </div>
        <div className={section}>
          <Field label={tr("newEmail")}>
            <Input type="email" value={email} placeholder={me.email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Button variant="secondary" disabled={busy || !email.includes("@")} onClick={() => void run(() => supabase.auth.updateUser({ email: email.trim() }), tr("emailSent"))}>
            {tr("changeEmail")}
          </Button>
        </div>
        <div className={section}>
          <Field label={tr("newPwd")}>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <Button variant="secondary" disabled={busy || password.length < 8} onClick={() => void run(() => supabase.auth.updateUser({ password }), tr("pwdSaved"))}>
            {tr("savePwd")}
          </Button>
        </div>
        <div className={cn(section, "flex flex-wrap gap-2")}>
          {!realAdmin && accountPath && (
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                navigate(accountPath);
              }}
            >
              {tr("mySpace")}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              onClose();
              await supabase.auth.signOut();
              navigate("/");
            }}
          >
            {tr("signout")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

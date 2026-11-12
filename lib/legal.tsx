// Injected by Usin (legal pages, filled from Marque → Infos légales). Do not edit.
import { brand } from "./brand";

export type LegalKind = "mentions" | "confidentialite" | "cgv" | "cgu";

type Legal = { company: string; address: string; companyId: string; vat: string; email: string; phone: string };
const L: Legal = Object.assign({ company: "", address: "", companyId: "", vat: "", email: "", phone: "" }, (brand as { legal?: Partial<Legal> }).legal ?? {});

/** Seller's country, read from the address: Belgian (4-digit postcode) or French (5-digit) rules. */
export const legalCountry: "BE" | "FR" | "OTHER" = (() => {
  const a = L.address.toLowerCase();
  if (/belgi|belgique|belgium|belgië/.test(a)) return "BE";
  if (/france/.test(a)) return "FR";
  if (/(^|\D)\d{5}(\D|$)/.test(a)) return "FR";
  if (/(^|\D)[1-9]\d{3}(\D|$)/.test(a)) return "BE";
  return "OTHER";
})();

/** "Fait en Belgique" / "Fait en France" for the footer (empty when unknown). */
export const madeIn = legalCountry === "BE" ? "Fait en Belgique" : legalCountry === "FR" ? "Fait en France" : "";

export const LEGAL_PAGES: Record<LegalKind, { path: string; title: string }> = {
  mentions: { path: "/mentions-legales", title: "Mentions légales" },
  confidentialite: { path: "/confidentialite", title: "Politique de confidentialité" },
  cgu: { path: "/conditions-utilisation", title: "Conditions générales d'utilisation" },
  cgv: { path: "/conditions", title: "Conditions générales de vente" },
};

const NAME = brand.name;
const SELLER = L.company || NAME;
const CONTACT = L.email ? "par email à " + L.email : "via la page de contact";
const IDS = [L.companyId && (legalCountry === "FR" ? "SIREN/SIRET : " : "Numéro d'entreprise (BCE) : ") + L.companyId, L.vat && "TVA : " + L.vat].filter(Boolean).join(" · ");
const LAW =
  legalCountry === "BE"
    ? { law: "le droit belge, notamment le Code de droit économique (Livre VI)", courts: "les tribunaux de l'arrondissement du siège du vendeur, sans préjudice des règles protectrices du consommateur", mediator: "le Service de Médiation pour le Consommateur (mediationconsommateur.be)", authority: "l'Autorité de protection des données (autoriteprotectiondonnees.be)" }
    : legalCountry === "FR"
      ? { law: "le droit français, notamment le Code de la consommation", courts: "les tribunaux français compétents, sans préjudice des règles protectrices du consommateur", mediator: "un médiateur de la consommation, gratuitement", authority: "la CNIL (cnil.fr)" }
      : { law: "le droit du pays du vendeur", courts: "les tribunaux compétents du pays du vendeur, sans préjudice des règles protectrices du consommateur", mediator: "l'organisme de médiation des consommateurs compétent", authority: "l'autorité de protection des données compétente" };

/** Default text of each page (also shown in the admin, where it can be replaced). "## " starts a section. */
export function legalDefaultText(kind: LegalKind): string {
  const s: Record<LegalKind, string[]> = {
    mentions: [
      "## Éditeur",
      [NAME + " est édité par " + SELLER + ".", L.address && "Adresse : " + L.address + ".", IDS, L.email && "Email : " + L.email, L.phone && "Téléphone : " + L.phone].filter(Boolean).join("\n"),
      "## Hébergement",
      "Site hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Données stockées par Supabase Inc. dans un centre de données situé dans l'Union européenne.",
      "## Propriété intellectuelle",
      "Les textes, images, logos et éléments de " + NAME + " sont protégés. Toute reproduction sans autorisation écrite de " + SELLER + " est interdite.",
      "## Contact",
      "Pour toute question, contactez-nous " + CONTACT + ".",
    ],
    confidentialite: [
      "## Responsable du traitement",
      SELLER + (L.address ? ", " + L.address : "") + ", est responsable des données personnelles traitées par " + NAME + ". Contact : " + (L.email || "via la page de contact") + ".",
      "## Données collectées",
      "Données de compte (nom, email), données nécessaires au service (réservations, commandes, messages), données de paiement traitées directement par Stripe (nous ne voyons jamais vos numéros de carte) et, si vous l'acceptez, des mesures d'audience anonymes.",
      "## Finalités et bases légales",
      "Fournir le service et gérer votre compte (exécution du contrat), encaisser les paiements et tenir la comptabilité (obligation légale), améliorer le service (intérêt légitime ou consentement pour la mesure d'audience), vous envoyer des informations si vous l'avez demandé (consentement).",
      "## Durée de conservation",
      "Les données de compte sont conservées tant que le compte est actif, puis supprimées dans un délai de 12 mois ; les pièces comptables sont conservées pendant la durée légale.",
      "## Sous-traitants",
      "Supabase (base de données, Union européenne), Vercel (hébergement), Stripe (paiements), Resend (emails). Lorsque des données sont transférées hors de l'Union européenne, ces prestataires sont liés par les clauses contractuelles types de la Commission européenne.",
      "## Vos droits",
      "Vous pouvez accéder à vos données, les corriger, les supprimer, en demander la portabilité, vous opposer à un traitement ou retirer votre consentement en nous contactant " + CONTACT + ". Vous pouvez aussi introduire une réclamation auprès de " + LAW.authority + ".",
      "## Cookies",
      "Seuls les cookies nécessaires au fonctionnement sont déposés sans votre accord. Les autres (mesure d'audience) ne le sont qu'après votre consentement, modifiable à tout moment depuis le pied de page.",
    ],
    cgv: [
      "## Objet",
      "Les présentes conditions régissent les ventes conclues sur " + NAME + " entre " + SELLER + (IDS ? " (" + IDS + ")" : "") + " et ses clients.",
      "## Prix",
      "Les prix sont indiqués en euros, toutes taxes comprises. Le prix applicable est celui affiché au moment de la commande.",
      "## Commande et paiement",
      "Le paiement s'effectue en ligne par carte bancaire via Stripe, prestataire de paiement sécurisé. La commande est confirmée à la réception du paiement.",
      "## Exécution",
      "Le service est fourni ou le produit livré selon les modalités indiquées lors de la commande. En cas de retard ou d'impossibilité, le client est informé dans les meilleurs délais.",
      "## Droit de rétractation",
      "Le client consommateur dispose de 14 jours à compter de la commande (ou de la livraison d'un produit) pour se rétracter sans motif, en nous contactant " + CONTACT + ". Ce droit ne s'applique pas à un service pleinement exécuté avant la fin de ce délai avec l'accord préalable du client, ni à un contenu numérique fourni immédiatement avec son accord. Le remboursement intervient dans les 14 jours, par le même moyen de paiement.",
      "## Annulation et remboursement",
      "Une prestation peut être annulée selon les conditions indiquées lors de la réservation. Les remboursements acceptés sont effectués sur le moyen de paiement utilisé.",
      "## Abonnements",
      "Les abonnements sont renouvelés automatiquement à chaque période. Ils peuvent être résiliés à tout moment depuis l'espace client ; la résiliation prend effet à la fin de la période en cours.",
      "## Garanties",
      "Le client bénéficie de la garantie légale de conformité (2 ans pour les biens) et des garanties prévues par la loi.",
      "## Réclamations et médiation",
      "Toute réclamation peut être adressée " + CONTACT + ". À défaut de solution amiable, le client consommateur peut recourir à " + LAW.mediator + " ou à la plateforme européenne de règlement en ligne des litiges : ec.europa.eu/consumers/odr.",
      "## Droit applicable",
      "Les présentes conditions sont soumises à " + LAW.law + ". Tout litige relève de " + LAW.courts + ".",
    ],
    cgu: [
      "## Objet",
      "Les présentes conditions encadrent l'utilisation de " + NAME + ", édité par " + SELLER + ". En créant un compte, l'utilisateur les accepte.",
      "## Compte",
      "L'utilisateur fournit des informations exactes et garde ses identifiants confidentiels. Il est responsable de l'activité réalisée depuis son compte.",
      "## Utilisation du service",
      "L'utilisateur s'engage à utiliser " + NAME + " de manière loyale et conforme à la loi, sans porter atteinte aux droits d'autrui ni au fonctionnement du service.",
      "## Contenus",
      "L'utilisateur reste propriétaire des contenus qu'il publie et garantit en détenir les droits. " + SELLER + " peut retirer tout contenu manifestement illicite.",
      "## Disponibilité et responsabilité",
      "Le service est fourni avec soin mais peut être interrompu pour maintenance ou en cas de force majeure. La responsabilité de " + SELLER + " est limitée aux dommages directs et prévisibles, dans les limites prévues par la loi.",
      "## Suspension et résiliation",
      "L'utilisateur peut supprimer son compte à tout moment. " + SELLER + " peut suspendre un compte en cas de manquement grave aux présentes conditions, après en avoir informé l'utilisateur.",
      "## Données personnelles",
      "Le traitement des données est décrit dans la politique de confidentialité.",
      "## Modifications et droit applicable",
      "Les conditions peuvent évoluer ; l'utilisateur en est informé. Elles sont soumises à " + LAW.law + ".",
    ],
  };
  return s[kind].filter(Boolean).join("\n\n");
}

/**
 * A complete legal page. Pass `custom` (text saved by the admin, same format: "## " starts a section)
 * to replace the default text.
 */
export function LegalPage({ kind, custom }: { kind: LegalKind; custom?: string | null }) {
  const text = custom && custom.trim() ? custom : legalDefaultText(kind);
  const blocks = text.split(/\n\s*\n/);
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">{LEGAL_PAGES[kind].title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-neutral-700 dark:text-neutral-300">
        {blocks.map((b, i) =>
          b.startsWith("## ") ? (
            <h2 key={i} className="pt-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {b.slice(3)}
            </h2>
          ) : (
            <p key={i} className="whitespace-pre-line">
              {b}
            </p>
          ),
        )}
      </div>
    </article>
  );
}

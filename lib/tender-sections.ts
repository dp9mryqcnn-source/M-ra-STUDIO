import type { TenderSection } from "./tender-types";

export function createDefaultSections(): TenderSection[] {
  return [
    {
      id: crypto.randomUUID(),
      title: "Présentation de l'entreprise",
      requirement:
        "Décrivez votre entreprise : activité principale, historique, organisation et positionnement sur le marché des produits de la mer surgelés.",
      content: "",
      required: true,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Capacités techniques et professionnelles",
      requirement:
        "Décrivez vos capacités techniques : équipements frigorifiques, certifications qualité (HACCP, ISO 22000), procédures de contrôle et traçabilité des produits de la réception à la livraison.",
      content: "",
      required: true,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Références similaires",
      requirement:
        "Listez vos principales références de marchés similaires réalisés au cours des 3 dernières années (client, objet du marché, montant, date de réalisation, contact référent).",
      content: "",
      required: true,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Moyens humains et matériels",
      requirement:
        "Détaillez les moyens humains (effectif, qualifications, formations) et matériels (véhicules réfrigérés, entrepôts frigorifiques, équipements de conditionnement) affectés à l'exécution du marché.",
      content: "",
      required: true,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Mémoire technique — Méthodologie",
      requirement:
        "Décrivez votre méthodologie d'exécution : organisation des commandes et livraisons, gestion des délais, procédures de contrôle qualité à réception, gestion des non-conformités, plan de continuité de service.",
      content: "",
      required: true,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Normes sanitaires et réglementaires",
      requirement:
        "Détaillez vos certifications et conformités : HACCP, ISO 22000, agrément sanitaire CE, réglementation import/export (pays d'origine, traçabilité douanière), normes de conditionnement et d'étiquetage réglementaire.",
      content: "",
      required: true,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Démarche qualité et environnementale",
      requirement:
        "Décrivez votre politique qualité, vos engagements environnementaux (emballages, bilan carbone des transports, gestion des déchets) et votre démarche de développement durable et de pêche responsable.",
      content: "",
      required: false,
      status: "empty",
    },
    {
      id: crypto.randomUUID(),
      title: "Conditions tarifaires et commerciales",
      requirement:
        "Détaillez votre politique tarifaire, conditions de paiement, délais de livraison minimaux garantis, politique de gestion des ruptures et conditions générales de vente applicables au marché public.",
      content: "",
      required: true,
      status: "empty",
    },
  ];
}

export const CERTIFICATIONS_FISH = [
  "HACCP",
  "ISO 22000",
  "IFS Food",
  "BRC Global Standard",
  "MSC (Marine Stewardship Council)",
  "ASC (Aquaculture Stewardship Council)",
  "ISO 9001",
  "ISO 14001",
  "Agrément sanitaire CE",
  "Label Rouge",
  "AB (Agriculture Biologique)",
  "GlobalG.A.P.",
];

export const AO_CATEGORIES = [
  "Poissons et produits de la mer surgelés",
  "Fournitures alimentaires",
  "Denrées alimentaires surgelées",
  "Restauration collective — poissons",
  "Approvisionnement cantines scolaires",
  "Fournitures EHPAD / hôpitaux",
  "Autre",
];

import Anthropic from "@anthropic-ai/sdk";
import type { CompanyProfile, TenderSection } from "@/lib/tender-types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { profile, section, dossierTitle, dossierClient, context } =
    (await request.json()) as {
      profile: CompanyProfile | null;
      section: TenderSection;
      dossierTitle: string;
      dossierClient: string;
      context?: string;
    };

  const profileBlock = profile
    ? `
Entreprise : ${profile.name}
Forme juridique : ${profile.legalForm}
SIRET : ${profile.siret || "Non renseigné"}
Adresse : ${[profile.address, profile.postalCode, profile.city, profile.country].filter(Boolean).join(", ")}
Téléphone : ${profile.phone || "N/A"}
Email : ${profile.email || "N/A"}
Capital : ${profile.capital || "N/A"}
Effectif : ${profile.effectif || 0} personne(s)
Fondée en : ${profile.yearFounded || "N/A"}
Certifications : ${profile.certifications.length ? profile.certifications.join(", ") : "Non précisées"}
Description : ${profile.description || "Non renseignée"}
Références clients :
${
  profile.references.length
    ? profile.references
        .map(
          (r) =>
            `  - ${r.client} (${r.year}) : ${r.description}${r.value ? ` — ${r.value.toLocaleString("fr-FR")} €` : ""}${r.contact ? ` (contact : ${r.contact})` : ""}`
        )
        .join("\n")
    : "  Aucune référence enregistrée"
}
`
    : "Profil entreprise non renseigné.";

  const system = `Tu es un expert en marchés publics français spécialisé dans le secteur alimentaire (import/export de poissons et produits de la mer surgelés).

Tu aides à rédiger des réponses professionnelles, précises et convaincantes pour des dossiers de candidature à des marchés publics français.

PROFIL DE L'ENTREPRISE CANDIDATE :
${profileBlock}

RÈGLES DE RÉDACTION :
- Rédige en français professionnel, style soutenu et factuel
- Utilise les informations du profil quand elles sont pertinentes et disponibles
- Structure le texte en paragraphes distincts, sans titres ni puces sauf si le contexte le justifie
- Adapte le vocabulaire au secteur : poissons surgelés, chaîne du froid, import/export, traçabilité
- Respecte les conventions des marchés publics (neutralité, objectivité, précision)
- Ne pas dépasser 350 mots sauf instruction contraire
- Utilise "la société [nom]" ou "notre entreprise" — jamais "je"
- Si une information du profil manque, rédige de manière générique sans l'inventer`;

  const user = `APPEL D'OFFRES : "${dossierTitle}"
ACHETEUR PUBLIC : ${dossierClient}

SECTION À RÉDIGER : "${section.title}"
EXIGENCE DU MARCHÉ : ${section.requirement}
${context ? `\nINSTRUCTION SUPPLÉMENTAIRE : ${context}` : ""}

Rédige la réponse complète et professionnelle pour cette section.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          system,
          messages: [{ role: "user", content: user }],
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        controller.enqueue(encoder.encode(`\n\n⚠️ Erreur : ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

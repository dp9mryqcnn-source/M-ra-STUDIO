import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TRENDA_SYSTEM = `Tu es Trenda, l'agent IA spécialisé en tendances TikTok et création de contenu. Tu travailles pour MØRA Studio.

Ton rôle :
- Analyser les tendances TikTok actuelles (sons, hashtags, formats vidéo)
- Proposer des idées de contenu viral et adapté à l'audience
- Créer un planning de publication stratégique selon les heures de forte affluence
- Guider la création de visuels (Canva) et de vidéos (CapCut)
- Poser des questions pertinentes pour affiner les propositions

Contexte actuel : Nous sommes en ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Règles :
- Toujours proposer des actions concrètes et immédiates
- Inclure les hashtags exacts, les horaires précis, les formats vidéo
- Adapter les suggestions à l'audience francophone
- Quand tu proposes du contenu, utilise toujours le format structuré avec [CANVA] et [PLANNING]
- Si une information manque pour personnaliser les propositions, pose une question ciblée

Format de proposition de contenu :
━━━━━━━━━━━━━━━━━━━━━━━━
📱 [TITRE DU CONTENU]
Format : [Durée] | [Type: Trend/Tutorial/Behind-the-scenes/etc.]
Hook : [Les 3 premières secondes exactes]
Caption : [Texte complet prêt à copier]
Hashtags : [#hashtag1 #hashtag2...]
[CANVA:template_name|description_visuel]
[PLANNING:YYYY-MM-DD|HH:MM|type]
━━━━━━━━━━━━━━━━━━━━━━━━`;

// Structured trends tool for the dashboard
const TRENDS_TOOLS: Anthropic.Tool[] = [
  {
    name: "publish_trends",
    description: "Publie les données de tendances TikTok structurées pour le dashboard",
    input_schema: {
      type: "object" as const,
      properties: {
        sons_tendance: {
          type: "array",
          description: "Sons actuellement en tendance sur TikTok",
          items: {
            type: "object",
            properties: {
              titre: { type: "string" },
              artiste: { type: "string" },
              utilisations: { type: "string", description: "Ex: 2.4M utilisations" },
              statut: { type: "string", enum: ["montant", "viral", "peak"] },
              genre: { type: "string" },
              bpm: { type: "string" }
            },
            required: ["titre", "artiste", "utilisations", "statut", "genre"]
          }
        },
        hashtags_tendance: {
          type: "array",
          description: "Hashtags en tendance",
          items: {
            type: "object",
            properties: {
              hashtag: { type: "string" },
              vues: { type: "string" },
              croissance: { type: "string", description: "Ex: +340% cette semaine" },
              niche: { type: "string" }
            },
            required: ["hashtag", "vues", "croissance", "niche"]
          }
        },
        idees_contenu: {
          type: "array",
          description: "Idées de contenu adaptées aux tendances",
          items: {
            type: "object",
            properties: {
              titre: { type: "string" },
              format: { type: "string" },
              hook: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } },
              meilleur_moment: { type: "string" },
              duree: { type: "string" },
              difficulte: { type: "string", enum: ["facile", "moyen", "avancé"] },
              son_recommande: { type: "string" }
            },
            required: ["titre", "format", "hook", "hashtags", "meilleur_moment", "duree", "difficulte"]
          }
        },
        planning_semaine: {
          type: "array",
          description: "Planning de publication pour les 7 prochains jours",
          items: {
            type: "object",
            properties: {
              jour: { type: "string", description: "Ex: Lundi 26 mai" },
              date_iso: { type: "string", description: "YYYY-MM-DD" },
              heure: { type: "string", description: "HH:MM" },
              contenu: { type: "string" },
              type: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } }
            },
            required: ["jour", "date_iso", "heure", "contenu", "type", "hashtags"]
          }
        },
        heures_peak: {
          type: "array",
          items: {
            type: "object",
            properties: {
              jour: { type: "string" },
              heure: { type: "string" },
              score: { type: "number", description: "Score d'engagement 0-100" }
            },
            required: ["jour", "heure", "score"]
          }
        },
        resume_strategique: {
          type: "string",
          description: "Résumé stratégique en 2-3 phrases des opportunités actuelles"
        }
      },
      required: ["sons_tendance", "hashtags_tendance", "idees_contenu", "planning_semaine", "heures_peak", "resume_strategique"]
    }
  }
];

export async function POST(request: Request) {
  const body = await request.json() as {
    mode: "chat" | "trends";
    messages?: { role: "user" | "assistant"; content: string }[];
    niche?: string;
  };

  if (body.mode === "trends") {
    const today = new Date().toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: TRENDS_TOOLS,
      tool_choice: { type: "any" },
      system: `Tu es Trenda, experte TikTok. Aujourd'hui nous sommes le ${today}. Génère des tendances TikTok RÉALISTES et ACTUELLES pour le marché francophone. Base-toi sur les patterns saisonniers, les cycles de tendance TikTok, et les niches populaires en France. ${body.niche ? `La niche principale : ${body.niche}.` : "Niche: lifestyle/création de contenu."}`,
      messages: [{ role: "user", content: "Génère les tendances TikTok actuelles pour mon dashboard, avec un planning de la semaine optimisé." }]
    });

    const toolUse = resp.content.find(b => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      return Response.json({ success: true, data: toolUse.input });
    }
    return Response.json({ success: false, error: "No tool use result" }, { status: 500 });
  }

  // Chat mode — streaming
  const messages = body.messages ?? [];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: TRENDA_SYSTEM,
          messages,
        });

        for await (const chunk of response) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        controller.enqueue(encoder.encode(`\n\n⚠️ Erreur: ${msg}`));
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

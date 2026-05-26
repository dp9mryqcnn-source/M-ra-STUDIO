import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const today = () =>
  new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

const SYSTEM = `Tu es Trenda, l'agent IA experte en TikTok. Aujourd'hui nous sommes le ${today()}.

Tu analyses les tendances TikTok francophones, proposes des idées de contenu viral et crées des plannings de publication stratégiques.

Tes spécialités :
- Sons et hashtags actuellement en tendance
- Formats vidéo qui performent (durée, hook, structure)
- Heures de forte affluence (peak times)
- Création de contenu avec Canva et CapCut
- Planning éditorial hebdomadaire

Quand tu proposes du contenu concret, utilise TOUJOURS ce format pour que les boutons s'affichent :

━━━━━━━━━━━━━━━━━━━━━━━━
📱 [TITRE DU CONTENU]
Format : [durée] · [type]
Hook : [les 3 premières secondes exactes à filmer/dire]
Caption : [texte complet prêt à copier avec emojis]
Hashtags : [#tag1 #tag2 #tag3...]
[CANVA:type_template|description_du_visuel]
[PLANNING:YYYY-MM-DD|HH:MM|type_contenu]
━━━━━━━━━━━━━━━━━━━━━━━━

Règles absolues :
- Réponds toujours en français
- Sois concrète et immédiatement actionnable
- Si tu manques d'info sur la niche, pose une question précise
- Les horaires recommandés sont adaptés au public francophone (France, Belgique, Suisse)`;

const TRENDS_TOOL: Anthropic.Tool = {
  name: "afficher_tendances",
  description: "Affiche les tendances TikTok structurées dans le dashboard",
  input_schema: {
    type: "object" as const,
    properties: {
      sons: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titre: { type: "string" },
            artiste: { type: "string" },
            utilisations: { type: "string" },
            statut: { type: "string", enum: ["montant", "viral", "peak"] },
            genre: { type: "string" },
          },
          required: ["titre", "artiste", "utilisations", "statut", "genre"],
        },
      },
      hashtags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tag: { type: "string" },
            vues: { type: "string" },
            croissance: { type: "string" },
            niche: { type: "string" },
          },
          required: ["tag", "vues", "croissance", "niche"],
        },
      },
      idees: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titre: { type: "string" },
            format: { type: "string" },
            hook: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            heure: { type: "string" },
            duree: { type: "string" },
            niveau: { type: "string", enum: ["facile", "moyen", "avancé"] },
          },
          required: ["titre", "format", "hook", "hashtags", "heure", "duree", "niveau"],
        },
      },
      planning: {
        type: "array",
        items: {
          type: "object",
          properties: {
            jour: { type: "string" },
            date: { type: "string" },
            heure: { type: "string" },
            contenu: { type: "string" },
            type: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
          },
          required: ["jour", "date", "heure", "contenu", "type", "hashtags"],
        },
      },
      peak_times: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            score: { type: "number" },
          },
          required: ["label", "score"],
        },
      },
      resume: { type: "string" },
    },
    required: ["sons", "hashtags", "idees", "planning", "peak_times", "resume"],
  },
};

export async function POST(req: Request) {
  const body = await req.json() as {
    mode: "trends" | "chat";
    messages?: { role: "user" | "assistant"; content: string }[];
    niche?: string;
  };

  if (body.mode === "trends") {
    const niche = body.niche ? `Niche : ${body.niche}.` : "Niche : lifestyle / création de contenu francophone.";
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [TRENDS_TOOL],
      tool_choice: { type: "any" },
      system: `Tu es Trenda, experte TikTok. ${today()}. ${niche} Génère des tendances TikTok réalistes et actuelles pour le marché francophone.`,
      messages: [{ role: "user", content: "Génère les tendances TikTok actuelles avec un planning de 7 jours optimisé." }],
    });

    const tool = res.content.find((b) => b.type === "tool_use");
    if (tool?.type === "tool_use") {
      return Response.json({ ok: true, data: tool.input });
    }
    return Response.json({ ok: false }, { status: 500 });
  }

  // Chat — streaming
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        const s = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: SYSTEM,
          messages: body.messages ?? [],
        });
        for await (const chunk of s) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            ctrl.enqueue(enc.encode(chunk.delta.text));
          }
        }
        ctrl.close();
      } catch (e) {
        ctrl.enqueue(enc.encode(`\n\n⚠️ ${e instanceof Error ? e.message : "Erreur"}`));
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

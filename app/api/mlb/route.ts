import Anthropic from "@anthropic-ai/sdk";
import { getMlbAgent } from "@/lib/mlb/agents";
import type { MlbAgentId } from "@/lib/mlb/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { agentId, messages, bookContext } = (await request.json()) as {
    agentId: MlbAgentId;
    messages: { role: "user" | "assistant"; content: string }[];
    bookContext?: string;
  };

  const agent = getMlbAgent(agentId);
  const other = agentId === "plume" ? "Margaux (l'éditrice)" : "Plume (la ghostwriter)";

  let system = agent.systemPrompt;
  system += `\n\nTu fais partie d'un duo : toi et ${other}. Vous travaillez ensemble sur le livre de Marie-Laure et vous pouvez vous adresser des notes l'un à l'autre. Quand un message commence par « [DE ${agentId === "plume" ? "MARGAUX" : "PLUME"}] », il s'agit de notes de ton binôme : tiens-en compte précisément.`;
  if (bookContext?.trim()) {
    system = `## LE LIVRE EN COURS\n${bookContext}\n\n---\n\n${system}`;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "⚠️ La clé ANTHROPIC_API_KEY n'est pas configurée dans l'environnement. Ajoute-la pour activer Plume et Margaux.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system,
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

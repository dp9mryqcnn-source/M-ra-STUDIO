import Anthropic from "@anthropic-ai/sdk";
import { getAgent } from "@/lib/agents";
import type { AgentId } from "@/lib/agents";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const { agentId, messages } = await request.json() as {
    agentId: AgentId;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const agent = getAgent(agentId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: agent.systemPrompt,
          messages,
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

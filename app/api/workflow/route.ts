import Anthropic from "@anthropic-ai/sdk";
import type { AgentId } from "@/lib/agents";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AGENT_TASK_PROMPT = (episodeName: string, script: string) =>
  `Tu es Réa, réalisatrice de la série Møra. Le script de l'épisode "${episodeName}" vient d'être approuvé par Marie-Laure.

Script approuvé :
"""
${script.slice(0, 3000)}${script.length > 3000 ? "\n[...suite du script...]" : ""}
"""

Génère maintenant les instructions spécifiques pour chaque agent. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après, avec exactement ce format :

{
  "artia": "Instructions pour Artia : ...",
  "monty": "Instructions pour Monty : ...",
  "tikia": "Instructions pour Tikia : ...",
  "compta": "Instructions pour Compta : ...",
  "lex": "Instructions pour Lex : ...",
  "sono": "Instructions pour Sono : ..."
}

Chaque instruction doit être spécifique à cet épisode, mentionner des éléments concrets du script, et être formulée comme une vraie demande de travail à l'agent.`;

export async function POST(request: Request) {
  const { episodeName, scriptContent } = await request.json() as {
    episodeName: string;
    scriptContent: string;
  };

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: AGENT_TASK_PROMPT(episodeName, scriptContent) }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 && jsonEnd >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "{}";
    const tasks = JSON.parse(jsonStr) as Partial<Record<AgentId, string>>;

    return Response.json({ tasks });
  } catch {
    return Response.json({ tasks: {} }, { status: 500 });
  }
}

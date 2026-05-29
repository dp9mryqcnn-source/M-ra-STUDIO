const LEONARDO_API = "https://cloud.leonardo.ai/api/rest/v1";

// Leonardo Phoenix — modèle cinématique flagship
const MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3";

async function pollGeneration(generationId: string, apiKey: string): Promise<string[]> {
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!res.ok) continue;
    const data = await res.json() as {
      generations_by_pk?: {
        status: string;
        generated_images?: { url: string; id: string }[];
      };
    };
    const gen = data.generations_by_pk;
    if (gen?.status === "COMPLETE" && gen.generated_images?.length) {
      return gen.generated_images.map((img) => img.url);
    }
    if (gen?.status === "FAILED") throw new Error("Génération échouée");
  }
  throw new Error("Timeout — réessaie dans quelques secondes");
}

export async function POST(request: Request) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Clé API Leonardo manquante dans Vercel" }, { status: 500 });
  }

  const { prompt, negativePrompt, width = 1360, height = 768 } = await request.json() as {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
  };

  // Démarrer la génération
  const startRes = await fetch(`${LEONARDO_API}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt ?? "blurry, bad quality, watermark, text, ugly, deformed",
      modelId: MODEL_ID,
      width,
      height,
      num_images: 2,
      public: false,
      alchemy: true,
      photoReal: false,
      highContrast: true,
    }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    return Response.json({ error: `Leonardo API: ${err}` }, { status: 500 });
  }

  const startData = await startRes.json() as {
    sdGenerationJob?: { generationId: string };
  };
  const generationId = startData.sdGenerationJob?.generationId;
  if (!generationId) {
    return Response.json({ error: "Pas d'ID de génération" }, { status: 500 });
  }

  try {
    const images = await pollGeneration(generationId, apiKey);
    return Response.json({ images });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

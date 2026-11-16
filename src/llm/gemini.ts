import { z } from "zod";
import { requestJson } from "../lib/http";
import type { LlmClient, LlmRequest } from "./types";

const GeminiResponse = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) }))
    .min(1),
});

export function createGeminiClient(apiKey: string, model: string, fetchImpl?: typeof fetch): LlmClient {
  const call = async ({ system, prompt }: LlmRequest, json: boolean) => {
    const res = await requestJson({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      method: "POST",
      headers: { "x-goog-api-key": apiKey },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: json ? { responseMimeType: "application/json", temperature: 0 } : { temperature: 0.2 },
      },
      schema: GeminiResponse,
      fetchImpl,
    });
    return res.candidates[0]?.content.parts.map((p) => p.text ?? "").join("") ?? "";
  };
  return {
    provider: "gemini",
    model,
    generateJson: (req) => call(req, true),
    generateText: (req) => call(req, false),
  };
}
